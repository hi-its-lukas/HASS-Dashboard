import { createServer, IncomingMessage, ServerResponse, request as httpRequest } from 'http'
import { Socket, connect as netConnect } from 'net'
import { spawn, ChildProcess } from 'child_process'

const PUBLIC_PORT = parseInt(process.env.PORT || '8080', 10)
const NEXT_PORT = 3000
const WS_PROXY_PORT = 6000
const GO2RTC_PORT = 1984
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0'

let nextProcess: ChildProcess | null = null
let wsProxyProcess: ChildProcess | null = null
let shuttingDown = false

function log(msg: string) {
  console.log(`[Gateway] ${msg}`)
}

function startNextJs(): Promise<void> {
  return new Promise((resolve, reject) => {
    log(`Starting Next.js on internal port ${NEXT_PORT}`)
    
    nextProcess = spawn('node', ['server.js'], {
      env: { 
        ...process.env, 
        PORT: String(NEXT_PORT), 
        HOSTNAME: '127.0.0.1'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    
    let resolved = false
    
    nextProcess.stdout?.on('data', (data) => {
      const output = data.toString()
      process.stdout.write(`[Next] ${output}`)
      if (!resolved && output.includes('Ready')) {
        resolved = true
        resolve()
      }
    })
    
    nextProcess.stderr?.on('data', (data) => {
      process.stderr.write(`[Next] ${data.toString()}`)
    })
    
    nextProcess.on('error', (err) => {
      if (!resolved) {
        reject(err)
      }
    })
    
    nextProcess.on('exit', (code) => {
      if (!shuttingDown) {
        log(`Next.js exited with code ${code}, shutting down`)
        shutdown()
      }
    })
    
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve()
      }
    }, 10000)
  })
}

function startWsProxy(): Promise<void> {
  return new Promise((resolve, reject) => {
    log(`Starting WS Proxy on internal port ${WS_PROXY_PORT}`)
    
    wsProxyProcess = spawn('node', ['server/ws-proxy.js'], {
      env: { 
        ...process.env, 
        WS_PROXY_PORT: String(WS_PROXY_PORT)
      },
      stdio: ['ignore', 'pipe', 'pipe']
    })
    
    let resolved = false
    
    wsProxyProcess.stdout?.on('data', (data) => {
      const output = data.toString()
      process.stdout.write(output)
      if (!resolved && output.includes('running')) {
        resolved = true
        resolve()
      }
    })
    
    wsProxyProcess.stderr?.on('data', (data) => {
      process.stderr.write(data.toString())
    })
    
    wsProxyProcess.on('error', (err) => {
      if (!resolved) {
        reject(err)
      }
    })
    
    wsProxyProcess.on('exit', (code) => {
      if (!shuttingDown) {
        log(`WS Proxy exited with code ${code}, shutting down`)
        shutdown()
      }
    })
    
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve()
      }
    }, 5000)
  })
}

function proxyHttpRequest(req: IncomingMessage, res: ServerResponse) {
  const clientIp = req.socket.remoteAddress || '127.0.0.1'
  const originalHost = req.headers.host || 'localhost'
  const proto = req.headers['x-forwarded-proto'] || 'http'
  
  const proxyHeaders: Record<string, string | string[] | undefined> = {
    ...req.headers,
    'x-forwarded-for': req.headers['x-forwarded-for'] 
      ? `${req.headers['x-forwarded-for']}, ${clientIp}` 
      : clientIp,
    'x-forwarded-host': originalHost,
    'x-forwarded-proto': String(proto),
    'x-real-ip': clientIp
  }
  
  const options = {
    hostname: '127.0.0.1',
    port: NEXT_PORT,
    path: req.url,
    method: req.method,
    headers: proxyHeaders
  }
  
  const proxyReq = httpRequest(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers)
    proxyRes.pipe(res)
  })
  
  proxyReq.on('error', (err) => {
    console.error('[Gateway] HTTP proxy error:', err.message)
    if (!res.headersSent) {
      res.writeHead(502)
      res.end('Bad Gateway')
    }
  })
  
  req.pipe(proxyReq)
}

function proxyWebSocketUpgrade(req: IncomingMessage, clientSocket: Socket, head: Buffer, targetPort: number) {
  log(`Connecting to target port ${targetPort} for ${req.url}`)
  
  const targetSocket = netConnect(targetPort, '127.0.0.1', () => {
    log(`Connected to target port ${targetPort}`)
    const headers = Object.entries(req.headers)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('\r\n')
    
    const upgradeRequest = `${req.method} ${req.url} HTTP/1.1\r\n${headers}\r\n\r\n`
    
    targetSocket.write(upgradeRequest)
    if (head.length > 0) {
      targetSocket.write(head)
    }
    
    targetSocket.pipe(clientSocket)
    clientSocket.pipe(targetSocket)
  })
  
  targetSocket.on('error', (err) => {
    log(`WS proxy error to port ${targetPort}: ${err.message}`)
    clientSocket.destroy()
  })
  
  clientSocket.on('error', (err) => {
    log(`Client socket error: ${err.message}`)
    targetSocket.destroy()
  })
  
  clientSocket.on('close', () => {
    targetSocket.destroy()
  })
  
  targetSocket.on('close', () => {
    clientSocket.destroy()
  })
}

async function shutdown() {
  if (shuttingDown) return
  shuttingDown = true
  
  log('Shutting down...')
  
  if (nextProcess) {
    nextProcess.kill('SIGTERM')
  }
  if (wsProxyProcess) {
    wsProxyProcess.kill('SIGTERM')
  }
  
  setTimeout(() => {
    process.exit(0)
  }, 2000)
}

async function main() {
  try {
    await Promise.all([
      startWsProxy(),
      startNextJs()
    ])
    
    log('Child processes ready')
    
    const server = createServer(proxyHttpRequest)
    
    server.on('upgrade', (req, socket, head) => {
      const url = req.url || ''
      log(`WebSocket upgrade request: ${url}`)
      
      if (url.startsWith('/ws/ha')) {
        log(`Routing to WS Proxy (port ${WS_PROXY_PORT})`)
        proxyWebSocketUpgrade(req, socket as Socket, head, WS_PROXY_PORT)
      } else if (url.startsWith('/api/streaming/mse')) {
        const srcMatch = url.match(/[?&]src=([^&]+)/)
        const cameraId = srcMatch ? decodeURIComponent(srcMatch[1]) : ''
        if (cameraId) {
          const go2rtcUrl = `/api/ws?src=${encodeURIComponent(cameraId)}`
          log(`Routing MSE stream ${cameraId} to go2rtc (port ${GO2RTC_PORT}), path: ${go2rtcUrl}`)
          // Create a proxy request with modified URL but same headers
          const proxyReq = Object.create(req)
          proxyReq.url = go2rtcUrl
          proxyWebSocketUpgrade(proxyReq, socket as Socket, head, GO2RTC_PORT)
        } else {
          log(`MSE request missing camera ID: ${url}`)
          ;(socket as Socket).destroy()
        }
      } else {
        log(`Unknown WebSocket path, destroying: ${url}`)
        ;(socket as Socket).destroy()
      }
    })
    
    server.listen(PUBLIC_PORT, HOSTNAME, () => {
      log(`Gateway ready on http://${HOSTNAME}:${PUBLIC_PORT}`)
      log(`HTTP requests → Next.js (port ${NEXT_PORT})`)
      log(`WebSocket /ws/ha → WS Proxy (port ${WS_PROXY_PORT})`)
      log(`WebSocket /api/streaming/mse → go2rtc (port ${GO2RTC_PORT})`)
    })
    
    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
    
  } catch (err) {
    console.error('[Gateway] Failed to start:', err)
    process.exit(1)
  }
}

main()
