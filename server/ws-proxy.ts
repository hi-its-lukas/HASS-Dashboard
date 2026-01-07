import { WebSocketServer, WebSocket } from 'ws'
import { createServer, IncomingMessage } from 'http'
import { parse } from 'url'
import { parse as parseCookie } from 'cookie'

const WS_PORT = parseInt(process.env.WS_PROXY_PORT || '6000', 10)
const SQLITE_URL = process.env.SQLITE_URL || 'file:./data/ha-dashboard.db'

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

async function getEncryptionKey(): Promise<Buffer> {
  const fs = await import('fs')
  const path = await import('path')
  const keyPath = path.join(process.cwd(), 'data', '.encryption_key')
  
  if (fs.existsSync(keyPath)) {
    const keyHex = fs.readFileSync(keyPath, 'utf-8').trim()
    return Buffer.from(keyHex, 'hex')
  }
  
  throw new Error('Encryption key not found')
}

async function decryptToken(value: string): Promise<string> {
  const crypto = await import('crypto')
  const key = await getEncryptionKey()
  
  const parsed = JSON.parse(value)
  const ciphertext = Buffer.from(parsed.ciphertext, 'base64')
  const nonce = Buffer.from(parsed.nonce, 'base64')
  
  const AUTH_TAG_LENGTH = 16
  const authTag = ciphertext.slice(-AUTH_TAG_LENGTH)
  const encryptedData = ciphertext.slice(0, -AUTH_TAG_LENGTH)
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce)
  decipher.setAuthTag(authTag)
  
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final()
  ])
  
  return decrypted.toString('utf-8')
}

async function getHAConfig(): Promise<{ url: string; token: string } | null> {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient({ datasources: { db: { url: SQLITE_URL } } })
  
  try {
    const [urlConfig, tokenConfig] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'ha_instance_url' } }),
      prisma.systemConfig.findUnique({ where: { key: 'ha_long_lived_token' } })
    ])
    
    if (!urlConfig || !tokenConfig) return null
    
    const token = tokenConfig.encrypted 
      ? await decryptToken(tokenConfig.value)
      : tokenConfig.value
    
    return { url: urlConfig.value, token }
  } finally {
    await prisma.$disconnect()
  }
}

async function validateSession(sessionToken: string): Promise<string | null> {
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient({ datasources: { db: { url: SQLITE_URL } } })
  
  try {
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true }
    })
    
    if (!session || new Date() > session.expiresAt) {
      return null
    }
    
    return session.userId
  } finally {
    await prisma.$disconnect()
  }
}

function extractSessionToken(req: IncomingMessage): string | null {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return null
  
  const cookies = parseCookie(cookieHeader)
  return cookies['session'] || null
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
  
  if (pathname !== '/ws/ha') {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n')
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
  
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, userId)
  })
})

server.listen(WS_PORT, '0.0.0.0', () => {
  console.log(`[WS-Proxy] WebSocket proxy running on port ${WS_PORT}`)
})

process.on('SIGTERM', () => {
  console.log('[WS-Proxy] Shutting down...')
  wss.close()
  server.close()
  process.exit(0)
})
