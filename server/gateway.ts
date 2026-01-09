import { createServer, IncomingMessage, ServerResponse, request as httpRequest } from 'http'
import { Socket, connect as netConnect } from 'net'
import { spawn, ChildProcess, execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const PUBLIC_PORT = parseInt(process.env.PORT || '8080', 10)
const NEXT_PORT = 3000
const WS_PROXY_PORT = 6000
const GO2RTC_PORT = 1984
const GO2RTC_RTSP_PORT = 8554
const GO2RTC_WEBRTC_PORT = 8555
const HOSTNAME = process.env.HOSTNAME || '0.0.0.0'

let nextProcess: ChildProcess | null = null
let wsProxyProcess: ChildProcess | null = null
let go2rtcProcess: ChildProcess | null = null
let shuttingDown = false

// go2rtc configuration stored by Next.js API
const GO2RTC_CONFIG_PATH = '/tmp/go2rtc.json'
const GO2RTC_BINARY_PATH = '/usr/local/bin/go2rtc'

function startGo2rtc(): void {
  if (go2rtcProcess) {
    log('go2rtc already running')
    return
  }
  
  if (!fs.existsSync(GO2RTC_BINARY_PATH)) {
    log(`go2rtc binary not found at ${GO2RTC_BINARY_PATH}`)
    return
  }
  
  if (!fs.existsSync(GO2RTC_CONFIG_PATH)) {
    log(`go2rtc config not found at ${GO2RTC_CONFIG_PATH}, will start when config is created`)
    return
  }
  
  log(`Starting go2rtc with config ${GO2RTC_CONFIG_PATH}`)
  
  go2rtcProcess = spawn(GO2RTC_BINARY_PATH, ['-config', GO2RTC_CONFIG_PATH], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false
  })
  
  go2rtcProcess.stdout?.on('data', (data) => {
    const output = data.toString().trim()
    if (output) {
      console.log(`[go2rtc] ${output}`)
    }
  })
  
  go2rtcProcess.stderr?.on('data', (data) => {
    const output = data.toString().trim()
    if (output) {
      console.error(`[go2rtc ERROR] ${output}`)
    }
  })
  
  go2rtcProcess.on('exit', (code, signal) => {
    log(`go2rtc exited with code ${code}, signal ${signal}`)
    go2rtcProcess = null
    
    // Write crash log
    const timestamp = new Date().toISOString()
    const crashMsg = `[${timestamp}] go2rtc exited - code: ${code}, signal: ${signal}\n`
    try {
      fs.appendFileSync('/data/go2rtc_crash.log', crashMsg)
    } catch (e) {
      // Ignore
    }
    
    // Auto-restart after 5 seconds if not shutting down
    if (!shuttingDown && code !== 0) {
      log('go2rtc crashed, restarting in 5 seconds...')
      setTimeout(() => {
        if (!shuttingDown) startGo2rtc()
      }, 5000)
    }
  })
  
  go2rtcProcess.on('error', (err) => {
    log(`go2rtc spawn error: ${err.message}`)
    go2rtcProcess = null
  })
}

function stopGo2rtc(): void {
  if (go2rtcProcess) {
    log('Stopping go2rtc...')
    go2rtcProcess.kill('SIGTERM')
    go2rtcProcess = null
  }
}

function isGo2rtcRunning(): boolean {
  return go2rtcProcess !== null && !go2rtcProcess.killed
}

// Watch for config file changes to auto-start go2rtc
function watchGo2rtcConfig(): void {
  const configDir = path.dirname(GO2RTC_CONFIG_PATH)
  
  // Check periodically for config file
  setInterval(() => {
    if (!go2rtcProcess && fs.existsSync(GO2RTC_CONFIG_PATH)) {
      log('go2rtc config detected, starting go2rtc...')
      startGo2rtc()
    }
  }, 2000)
}

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
  
  targetSocket.on('error', (err: NodeJS.ErrnoException) => {
    log(`WS proxy error to port ${targetPort}: ${err.message}`)
    // Send HTTP 502 if connection refused (target not running)
    if (err.code === 'ECONNREFUSED') {
      log(`Target port ${targetPort} not reachable - service may have crashed`)
      try {
        clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n')
      } catch (e) {
        // Ignore write errors
      }
    }
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
  
  stopGo2rtc()
  
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
    
    // Start watching for go2rtc config and auto-start when ready
    watchGo2rtcConfig()
    log('go2rtc watcher started, will auto-start when config is available')
    
    const server = createServer(proxyHttpRequest)
    
    server.on('upgrade', (req, socket, head) => {
      const url = req.url || ''
      log(`WebSocket upgrade request: ${url}`)
      
      if (url.startsWith('/ws/ha')) {
        log(`Routing to WS Proxy (port ${WS_PROXY_PORT})`)
        proxyWebSocketUpgrade(req, socket as Socket, head, WS_PROXY_PORT)
      } else if (url.startsWith('/ws/mse/') || url.startsWith('/api/streaming/mse')) {
        // Support both /ws/mse/:cameraId and /api/streaming/mse?src=cameraId
        let cameraId = ''
        if (url.startsWith('/ws/mse/')) {
          // Extract camera ID from path: /ws/mse/:cameraId
          const pathMatch = url.match(/^\/ws\/mse\/([^?]+)/)
          cameraId = pathMatch ? decodeURIComponent(pathMatch[1]) : ''
        } else {
          // Extract from query string: /api/streaming/mse?src=cameraId
          const srcMatch = url.match(/[?&]src=([^&]+)/)
          cameraId = srcMatch ? decodeURIComponent(srcMatch[1]) : ''
        }
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
      log(`WebSocket /ws/mse/:cameraId → go2rtc (port ${GO2RTC_PORT})`)
    })
    
    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
    
  } catch (err) {
    console.error('[Gateway] Failed to start:', err)
    process.exit(1)
  }
}

main()
