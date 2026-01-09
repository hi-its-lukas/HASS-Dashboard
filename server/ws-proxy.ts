import { WebSocketServer, WebSocket } from 'ws'
import { createServer, IncomingMessage } from 'http'
import { parse } from 'url'
import { parse as parseCookie } from 'cookie'
import { PrismaClient } from '@prisma/client'
import { createDecipheriv } from 'crypto'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { ProtectLivestreamManager, initProtectLivestreamManager, getProtectLivestreamManager } from '../lib/streaming/protect-livestream'

const WS_PORT = parseInt(process.env.WS_PROXY_PORT || '6000', 10)
const SQLITE_URL = process.env.SQLITE_URL || 'file:./data/ha-dashboard.db'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

const prisma = new PrismaClient({ datasources: { db: { url: SQLITE_URL } } })

let cachedEncryptionKey: Buffer | null = null

function loadEncryptionKey(): Buffer {
  if (cachedEncryptionKey) {
    return cachedEncryptionKey
  }

  const envKey = process.env.ENCRYPTION_KEY
  if (envKey) {
    const keyBuffer = Buffer.from(envKey, 'hex')
    if (keyBuffer.length === 32) {
      cachedEncryptionKey = keyBuffer
      return cachedEncryptionKey
    }
  }

  const keyPaths = [
    '/data/.encryption_key',
    join(process.cwd(), 'data', '.encryption_key')
  ]

  for (const keyPath of keyPaths) {
    if (existsSync(keyPath)) {
      const keyHex = readFileSync(keyPath, 'utf-8').trim()
      const keyBuffer = Buffer.from(keyHex, 'hex')
      if (keyBuffer.length === 32) {
        cachedEncryptionKey = keyBuffer
        return cachedEncryptionKey
      }
    }
  }

  throw new Error('Encryption key not found. Set ENCRYPTION_KEY environment variable or create data/.encryption_key file.')
}

cachedEncryptionKey = loadEncryptionKey()
console.log('[WS-Proxy] Encryption key loaded successfully')

interface HAWebSocketMessage {
  id?: number
  type: string
  [key: string]: unknown
}

interface ClientConnection {
  clientWs: WebSocket
  haWs: WebSocket | null
  authenticated: boolean
  userId: string
  messageId: number
  pendingAuth: boolean
}

const connections = new Map<WebSocket, ClientConnection>()

function decryptToken(value: string): string {
  const key = cachedEncryptionKey!
  
  const parsed = JSON.parse(value)
  const ciphertext = Buffer.from(parsed.ciphertext, 'base64')
  const nonce = Buffer.from(parsed.nonce, 'base64')
  
  const AUTH_TAG_LENGTH = 16
  const authTag = ciphertext.slice(-AUTH_TAG_LENGTH)
  const encryptedData = ciphertext.slice(0, -AUTH_TAG_LENGTH)
  
  const decipher = createDecipheriv('aes-256-gcm', key, nonce)
  decipher.setAuthTag(authTag)
  
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final()
  ])
  
  return decrypted.toString('utf-8')
}

async function getHAConfig(): Promise<{ url: string; token: string } | null> {
  const [urlConfig, tokenConfig] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: 'ha_instance_url' } }),
    prisma.systemConfig.findUnique({ where: { key: 'ha_long_lived_token' } })
  ])
  
  if (!urlConfig || !tokenConfig) return null
  
  const token = tokenConfig.encrypted 
    ? decryptToken(tokenConfig.value)
    : tokenConfig.value
  
  return { url: urlConfig.value, token }
}

async function validateSession(sessionToken: string): Promise<string | null> {
  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    include: { user: true }
  })
  
  if (!session || new Date() > session.expiresAt) {
    return null
  }
  
  return session.userId
}

function extractSessionToken(req: IncomingMessage): string | null {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return null
  
  const cookies = parseCookie(cookieHeader)
  return cookies['ha_session'] || null
}

function validateOrigin(req: IncomingMessage): boolean {
  if (!IS_PRODUCTION) {
    return true
  }

  const origin = req.headers.origin
  if (!origin) {
    return true
  }

  const allowedHosts = process.env.ALLOWED_HOSTS?.split(',').map(h => h.trim()) || []
  const appBaseUrl = process.env.APP_BASE_URL

  if (appBaseUrl) {
    try {
      const baseHost = new URL(appBaseUrl).host
      allowedHosts.push(baseHost)
    } catch {
      // Invalid APP_BASE_URL
    }
  }

  try {
    const originHost = new URL(origin).host
    return allowedHosts.some(allowed => originHost === allowed || originHost.endsWith('.' + allowed))
  } catch {
    return false
  }
}

async function createHAConnection(config: { url: string; token: string }): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const wsUrl = config.url.replace(/^http/, 'ws') + '/api/websocket'
    const haWs = new WebSocket(wsUrl)
    
    const timeout = setTimeout(() => {
      haWs.close()
      reject(new Error('HA connection timeout'))
    }, 10000)
    
    haWs.on('open', () => {
      clearTimeout(timeout)
    })
    
    haWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as HAWebSocketMessage
        
        if (msg.type === 'auth_required') {
          haWs.send(JSON.stringify({
            type: 'auth',
            access_token: config.token
          }))
        } else if (msg.type === 'auth_ok') {
          resolve(haWs)
        } else if (msg.type === 'auth_invalid') {
          clearTimeout(timeout)
          haWs.close()
          reject(new Error('HA authentication failed'))
        }
      } catch {
        // Ignore parse errors during auth
      }
    })
    
    haWs.on('error', (err) => {
      clearTimeout(timeout)
      reject(err)
    })
    
    haWs.on('close', () => {
      clearTimeout(timeout)
    })
  })
}

const wss = new WebSocketServer({ noServer: true })
const livestreamWss = new WebSocketServer({ noServer: true })

let livestreamManager: ProtectLivestreamManager | null = null

async function getUnifiProtectConfig(): Promise<{ host: string; username: string; password: string } | null> {
  const [hostConfig, usernameConfig, passwordConfig] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: 'unifi_protect_host' } }),
    prisma.systemConfig.findUnique({ where: { key: 'unifi_protect_username' } }),
    prisma.systemConfig.findUnique({ where: { key: 'unifi_protect_password' } })
  ])
  
  if (!hostConfig || !usernameConfig || !passwordConfig) return null
  
  const password = passwordConfig.encrypted 
    ? decryptToken(passwordConfig.value)
    : passwordConfig.value
  
  return { 
    host: hostConfig.value, 
    username: usernameConfig.value, 
    password 
  }
}

async function ensureLivestreamManager(): Promise<ProtectLivestreamManager | null> {
  if (livestreamManager?.isConnected()) {
    return livestreamManager
  }
  
  const config = await getUnifiProtectConfig()
  if (!config) {
    console.log('[WS-Proxy] UniFi Protect not configured')
    return null
  }
  
  try {
    livestreamManager = await initProtectLivestreamManager(config.host, config.username, config.password)
    console.log('[WS-Proxy] Livestream manager initialized')
    return livestreamManager
  } catch (err) {
    console.error('[WS-Proxy] Failed to initialize livestream manager:', err)
    return null
  }
}

livestreamWss.on('connection', async (clientWs: WebSocket, { userId, cameraId }: { userId: string; cameraId: string }) => {
  console.log(`[WS-Proxy] Livestream client connected: ${userId} for camera ${cameraId}`)
  
  const manager = await ensureLivestreamManager()
  if (!manager) {
    clientWs.send(JSON.stringify({ type: 'error', message: 'UniFi Protect nicht konfiguriert' }))
    clientWs.close(4503, 'UniFi Protect not configured')
    return
  }
  
  let initSegmentSent = false
  
  const onData = (data: Buffer) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data)
    }
  }
  
  const onCodec = (codec: string) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ type: 'codec', codec }))
    }
  }
  
  try {
    const started = await manager.startStream(cameraId, onData, onCodec)
    
    if (!started) {
      clientWs.send(JSON.stringify({ type: 'error', message: 'Stream konnte nicht gestartet werden' }))
      clientWs.close(4500, 'Stream start failed')
      return
    }
    
    clientWs.send(JSON.stringify({ type: 'stream_started', cameraId }))
    
  } catch (err) {
    console.error(`[WS-Proxy] Failed to start stream for ${cameraId}:`, err)
    clientWs.send(JSON.stringify({ type: 'error', message: 'Stream-Fehler' }))
    clientWs.close(4500, 'Stream error')
    return
  }
  
  clientWs.on('close', () => {
    console.log(`[WS-Proxy] Livestream client disconnected: ${userId} for camera ${cameraId}`)
    manager.stopStream(cameraId, onData)
  })
  
  clientWs.on('error', (err) => {
    console.error(`[WS-Proxy] Livestream client error for ${userId}:`, err.message)
    manager.stopStream(cameraId, onData)
  })
})

wss.on('connection', async (clientWs: WebSocket, userId: string) => {
  console.log(`[WS-Proxy] Client connected: ${userId}`)
  
  const conn: ClientConnection = {
    clientWs,
    haWs: null,
    authenticated: true,
    userId,
    messageId: 1,
    pendingAuth: false
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
    
    clientWs.send(JSON.stringify({ type: 'auth_ok', ha_version: 'proxy' }))
    
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

const server = createServer((req, res) => {
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
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
    return
  }
  
  const userId = await validateSession(sessionToken)
  
  if (!userId) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
    socket.destroy()
    return
  }
  
  // Route: /ws/ha - Home Assistant WebSocket proxy
  if (pathname === '/ws/ha') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, userId)
    })
    return
  }
  
  // Route: /ws/livestream/:cameraId - UniFi Protect Livestream
  const livestreamMatch = pathname?.match(/^\/ws\/livestream\/(.+)$/)
  if (livestreamMatch) {
    const cameraId = decodeURIComponent(livestreamMatch[1])
    console.log(`[WS-Proxy] Livestream upgrade for camera: ${cameraId}`)
    
    livestreamWss.handleUpgrade(request, socket, head, (ws) => {
      livestreamWss.emit('connection', ws, { userId, cameraId })
    })
    return
  }
  
  // Unknown path
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
