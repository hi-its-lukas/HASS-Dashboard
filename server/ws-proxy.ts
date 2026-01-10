import { WebSocketServer, WebSocket } from 'ws'
import { createServer } from 'http'
import { parse } from 'url'

import { WS_PORT, prisma, loadEncryptionKey } from './lib/config'
import { validateSession, extractSessionToken, validateOrigin } from './lib/auth'
import { getHAConfig, createHAConnection } from './lib/ha-bridge'
import { getUnifiProtectConfig } from './lib/unifi-config'
import { ProtectLivestreamManager, initProtectLivestreamManager } from '../lib/streaming/protect-livestream'

loadEncryptionKey()
console.log('[WS-Proxy] Encryption key loaded successfully')

interface ClientConnection {
  clientWs: WebSocket
  haWs: WebSocket | null
  authenticated: boolean
  userId: string
  messageId: number
}

const connections = new Map<WebSocket, ClientConnection>()

const wss = new WebSocketServer({ noServer: true })
const livestreamWss = new WebSocketServer({ noServer: true })

let livestreamManager: ProtectLivestreamManager | null = null
let livestreamManagerInitializing: Promise<ProtectLivestreamManager | null> | null = null
let lastInitAttempt = 0
const INIT_COOLDOWN_MS = 10000

async function ensureLivestreamManager(): Promise<ProtectLivestreamManager | null> {
  if (livestreamManager?.isConnected()) {
    return livestreamManager
  }
  
  if (livestreamManagerInitializing) {
    console.log('[WS-Proxy] Waiting for existing initialization...')
    return livestreamManagerInitializing
  }
  
  const now = Date.now()
  if (now - lastInitAttempt < INIT_COOLDOWN_MS) {
    console.log('[WS-Proxy] Init cooldown active, skipping')
    return null
  }
  
  lastInitAttempt = now
  
  livestreamManagerInitializing = (async () => {
    try {
      const config = await getUnifiProtectConfig()
      if (!config) {
        console.log('[WS-Proxy] No UniFi config, skipping manager init')
        return null
      }
      
      console.log('[WS-Proxy] Initializing ProtectLivestreamManager...')
      
      const manager = await initProtectLivestreamManager(
        config.host,
        config.username,
        config.password,
        config.channel
      )
      
      if (manager) {
        livestreamManager = manager
        console.log('[WS-Proxy] ProtectLivestreamManager initialized successfully')
      }
      
      return manager
    } catch (error) {
      console.error('[WS-Proxy] Failed to init ProtectLivestreamManager:', error)
      return null
    } finally {
      livestreamManagerInitializing = null
    }
  })()
  
  return livestreamManagerInitializing
}

livestreamWss.on('connection', async (ws: WebSocket, params: { userId: string; cameraId: string }) => {
  const { userId, cameraId } = params
  console.log(`[WS-Proxy] Livestream client connected: ${userId} for camera ${cameraId}`)
  
  const manager = await ensureLivestreamManager()
  
  if (!manager) {
    console.error('[WS-Proxy] No livestream manager available')
    ws.close(4503, 'Livestream manager not available')
    return
  }
  
  let codecSent = false
  
  const onData = (data: Buffer) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data)
    }
  }
  
  const onCodec = (codec: string) => {
    if (ws.readyState === WebSocket.OPEN && !codecSent) {
      codecSent = true
      ws.send(JSON.stringify({ type: 'codec', codec }))
    }
  }
  
  try {
    await manager.startStream(cameraId, onData, onCodec)
  } catch (error) {
    console.error(`[WS-Proxy] Failed to start stream for ${cameraId}:`, error)
    ws.close(4500, 'Failed to start stream')
    return
  }
  
  ws.on('close', () => {
    console.log(`[WS-Proxy] Livestream client disconnected: ${userId} for camera ${cameraId}`)
    manager.stopStream(cameraId, onData, onCodec)
  })
  
  ws.on('error', (err) => {
    console.error(`[WS-Proxy] Livestream error for ${userId}:`, err.message)
    manager.stopStream(cameraId, onData, onCodec)
  })
})

wss.on('connection', async (clientWs: WebSocket, userId: string) => {
  console.log(`[WS-Proxy] Client connected: ${userId}`)
  
  const conn: ClientConnection = {
    clientWs,
    haWs: null,
    authenticated: true,
    userId,
    messageId: 1
  }
  
  connections.set(clientWs, conn)
  
  try {
    const haConfig = await getHAConfig()
    
    if (!haConfig) {
      clientWs.send(JSON.stringify({ type: 'error', message: 'Home Assistant nicht konfiguriert' }))
      clientWs.close(4503, 'HA not configured')
      return
    }
    
    const haWs = await createHAConnection(haConfig)
    conn.haWs = haWs
    
    clientWs.send(JSON.stringify({ type: 'auth_required', ha_version: '2024.1.0' }))
    
    let clientAuthReceived = false
    
    haWs.on('message', (data) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data.toString())
      }
    })
    
    haWs.on('close', () => {
      console.log(`[WS-Proxy] HA connection closed for user: ${userId}`)
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(1000, 'HA connection closed')
      }
    })
    
    haWs.on('error', (err) => {
      console.error(`[WS-Proxy] HA error for user ${userId}:`, err.message)
    })
    
    clientWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.type === 'auth') {
          if (!clientAuthReceived) {
            clientAuthReceived = true
            console.log(`[WS-Proxy] Client auth received for ${userId}, sending auth_ok`)
            clientWs.send(JSON.stringify({ type: 'auth_ok', ha_version: 'proxy' }))
          }
          return
        }
      } catch {
        // Not JSON, forward as-is
      }
      if (haWs.readyState === WebSocket.OPEN) {
        haWs.send(data.toString())
      }
    })
    
  } catch (err) {
    console.error(`[WS-Proxy] Failed to connect to HA for user ${userId}:`, err)
    clientWs.send(JSON.stringify({ type: 'error', message: 'HA Verbindung fehlgeschlagen' }))
    clientWs.close(4502, 'HA connection failed')
  }
  
  clientWs.on('close', () => {
    console.log(`[WS-Proxy] Client disconnected: ${userId}`)
    const c = connections.get(clientWs)
    if (c?.haWs) {
      c.haWs.close()
    }
    connections.delete(clientWs)
  })
  
  clientWs.on('error', (err) => {
    console.error(`[WS-Proxy] Client error for ${userId}:`, err.message)
  })
})

const server = createServer(async (req, res) => {
  const { pathname } = parse(req.url || '')
  
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', port: WS_PORT }))
    return
  }
  
  if (pathname === '/debug/protect-test') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' })
    
    try {
      const config = await getUnifiProtectConfig()
      if (!config) {
        res.end(JSON.stringify({ error: 'No UniFi Protect config found', configured: false }))
        return
      }
      
      const manager = await ensureLivestreamManager()
      res.end(JSON.stringify({
        configured: true,
        host: config.host.substring(0, 15) + '...',
        hasUsername: !!config.username,
        hasPassword: !!config.password,
        channel: config.channel,
        managerConnected: manager?.isConnected() ?? false,
        cameraCount: manager?.getCameras()?.length ?? 0,
        cameras: manager?.getCameras()?.map(c => ({ id: c.id, name: c.name, state: c.state })) ?? []
      }))
    } catch (err) {
      res.end(JSON.stringify({ error: String(err) }))
    }
    return
  }
  
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('HA Dashboard WebSocket Proxy\n')
})

server.on('upgrade', async (request, socket, head) => {
  const { pathname } = parse(request.url || '')
  
  if (!validateOrigin(request)) {
    console.warn('[WS-Proxy] Origin check failed:', request.headers.origin)
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n')
    socket.destroy()
    return
  }
  
  const sessionToken = extractSessionToken(request)
  
  if (!sessionToken) {
    console.warn('[WS-Proxy] No session token in request')
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
    return
  }
  
  const userId = await validateSession(sessionToken)
  
  if (!userId) {
    console.warn('[WS-Proxy] Invalid session token')
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
    return
  }
  
  if (pathname === '/ws/ha') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, userId)
    })
    return
  }
  
  const livestreamMatch = pathname?.match(/^\/ws\/livestream\/(.+)$/)
  if (livestreamMatch) {
    const cameraId = decodeURIComponent(livestreamMatch[1])
    console.log(`[WS-Proxy] Livestream upgrade for camera: ${cameraId}`)
    
    livestreamWss.handleUpgrade(request, socket, head, (ws) => {
      livestreamWss.emit('connection', ws, { userId, cameraId })
    })
    return
  }
  
  console.warn('[WS-Proxy] Unknown path:', pathname)
  socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
  socket.destroy()
})

server.listen(WS_PORT, '0.0.0.0', () => {
  console.log(`[WS-Proxy] WebSocket proxy running on port ${WS_PORT}`)
})

async function shutdown() {
  console.log('[WS-Proxy] Shutting down...')
  
  wss.close()
  livestreamWss.close()
  server.close()
  
  if (livestreamManager) {
    await livestreamManager.disconnect()
  }
  
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
