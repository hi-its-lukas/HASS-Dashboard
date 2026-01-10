import { WebSocket } from 'ws'
import { prisma, decryptToken } from './config'

export interface HAWebSocketMessage {
  id?: number
  type: string
  [key: string]: unknown
}

export interface HAConfig {
  url: string
  token: string
}

export async function getHAConfig(): Promise<HAConfig | null> {
  try {
    const [urlConfig, tokenConfig] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'ha_instance_url' } }),
      prisma.systemConfig.findUnique({ where: { key: 'ha_long_lived_token' } })
    ])
    
    if (!urlConfig || !tokenConfig) {
      console.log('[HA-Bridge] HA not configured')
      return null
    }
    
    const token = tokenConfig.encrypted 
      ? decryptToken(tokenConfig.value)
      : tokenConfig.value
    
    return { url: urlConfig.value, token }
  } catch (error) {
    console.error('[HA-Bridge] Error loading HA config:', error)
    return null
  }
}

export async function createHAConnection(config: HAConfig): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const wsUrl = config.url.replace(/^http/, 'ws') + '/api/websocket'
    console.log('[HA-Bridge] Connecting to:', wsUrl.substring(0, 50) + '...')
    
    const haWs = new WebSocket(wsUrl)
    
    const timeout = setTimeout(() => {
      haWs.close()
      reject(new Error('HA connection timeout'))
    }, 10000)
    
    haWs.on('open', () => {
      console.log('[HA-Bridge] WebSocket opened')
    })
    
    haWs.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as HAWebSocketMessage
        
        if (msg.type === 'auth_required') {
          console.log('[HA-Bridge] Sending authentication...')
          haWs.send(JSON.stringify({
            type: 'auth',
            access_token: config.token
          }))
        } else if (msg.type === 'auth_ok') {
          console.log('[HA-Bridge] Authentication successful')
          clearTimeout(timeout)
          resolve(haWs)
        } else if (msg.type === 'auth_invalid') {
          console.error('[HA-Bridge] Authentication failed')
          clearTimeout(timeout)
          haWs.close()
          reject(new Error('HA authentication failed'))
        }
      } catch {
        // Ignore parse errors during auth
      }
    })
    
    haWs.on('error', (err) => {
      console.error('[HA-Bridge] Connection error:', err.message)
      clearTimeout(timeout)
      reject(err)
    })
    
    haWs.on('close', (code, reason) => {
      console.log('[HA-Bridge] Connection closed:', code, reason.toString())
      clearTimeout(timeout)
    })
  })
}
