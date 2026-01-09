import { ProtectApi, ProtectLivestream, ProtectCameraConfig } from 'unifi-protect'
import { EventEmitter } from 'events'

interface LivestreamSession {
  cameraId: string
  channel: number
  livestream: ProtectLivestream
  clients: Set<(data: Buffer) => void>
  codecCallbacks: Set<(codec: string) => void>
  lastCodec: string | null
}

export class ProtectLivestreamManager extends EventEmitter {
  private api: ProtectApi
  private host: string
  private username: string
  private password: string
  private isLoggedIn: boolean = false
  private sessions: Map<string, LivestreamSession> = new Map()
  private cameras: ProtectCameraConfig[] = []
  private channel: number = 1
  private reconnectAttempts: Map<string, number> = new Map()
  private maxReconnectAttempts: number = 3
  private connectPromise: Promise<boolean> | null = null
  private lastConnectAttempt: number = 0
  private readonly connectCooldownMs: number = 5000

  constructor(host: string, username: string, password: string, channel: number = 1) {
    super()
    this.host = host
    this.username = username
    this.password = password
    this.channel = channel
    this.api = new ProtectApi()
  }
  
  setChannel(channel: number): void {
    this.channel = channel
  }

  async connect(): Promise<boolean> {
    if (this.isLoggedIn) {
      return true
    }
    
    if (this.connectPromise) {
      console.log('[ProtectLivestream] Waiting for existing connection attempt...')
      return this.connectPromise
    }
    
    const now = Date.now()
    if (now - this.lastConnectAttempt < this.connectCooldownMs) {
      console.log('[ProtectLivestream] Connection cooldown active, skipping')
      return false
    }
    
    this.lastConnectAttempt = now
    
    this.connectPromise = this.doConnect()
    
    try {
      return await this.connectPromise
    } finally {
      this.connectPromise = null
    }
  }
  
  private async doConnect(): Promise<boolean> {
    try {
      console.log('[ProtectLivestream] Connecting to:', this.host)
      
      const loginSuccess = await this.api.login(this.host, this.username, this.password)
      if (!loginSuccess) {
        console.error('[ProtectLivestream] Login failed')
        return false
      }
      
      console.log('[ProtectLivestream] Login successful')
      
      const bootstrapSuccess = await this.api.getBootstrap()
      if (!bootstrapSuccess) {
        console.error('[ProtectLivestream] Bootstrap failed')
        return false
      }
      
      this.cameras = this.api.bootstrap?.cameras ?? []
      console.log('[ProtectLivestream] Found', this.cameras.length, 'cameras')
      
      this.isLoggedIn = true
      return true
    } catch (error) {
      console.error('[ProtectLivestream] Connection error:', error)
      return false
    }
  }

  async disconnect(): Promise<void> {
    for (const [cameraId, session] of this.sessions) {
      try {
        session.livestream.stop()
      } catch (e) {
        console.error('[ProtectLivestream] Error stopping stream:', cameraId, e)
      }
    }
    this.sessions.clear()
    
    try {
      await this.api.logout()
    } catch (e) {
      console.error('[ProtectLivestream] Logout error:', e)
    }
    
    this.isLoggedIn = false
  }

  getCameras(): ProtectCameraConfig[] {
    return this.cameras
  }

  getCameraById(cameraId: string): ProtectCameraConfig | undefined {
    return this.cameras.find(c => c.id === cameraId)
  }

  async startStream(
    cameraId: string, 
    onData: (data: Buffer) => void,
    onCodec?: (codec: string) => void
  ): Promise<boolean> {
    if (!this.isLoggedIn) {
      const connected = await this.connect()
      if (!connected) {
        console.error('[ProtectLivestream] Cannot start stream - not connected')
        return false
      }
    }

    const camera = this.getCameraById(cameraId)
    if (!camera) {
      console.error('[ProtectLivestream] Camera not found:', cameraId)
      return false
    }

    const existingSession = this.sessions.get(cameraId)
    if (existingSession) {
      console.log('[ProtectLivestream] Reusing existing stream for:', camera.name, '- adding client')
      existingSession.clients.add(onData)
      if (onCodec) {
        existingSession.codecCallbacks.add(onCodec)
        if (existingSession.lastCodec) {
          onCodec(existingSession.lastCodec)
        }
      }
      return true
    }

    console.log('[ProtectLivestream] Starting new stream for:', camera.name, '(', cameraId, ') channel:', this.channel)

    try {
      const livestream = this.api.createLivestream()
      
      const session: LivestreamSession = {
        cameraId,
        channel: this.channel,
        livestream,
        clients: new Set([onData]),
        codecCallbacks: onCodec ? new Set([onCodec]) : new Set(),
        lastCodec: null
      }
      this.sessions.set(cameraId, session)
      
      livestream.on('codec', (codecInfo: string) => {
        console.log('[ProtectLivestream] Codec info for', camera.name, ':', codecInfo)
        session.lastCodec = codecInfo
        for (const callback of session.codecCallbacks) {
          try {
            callback(codecInfo)
          } catch (e) {
            console.error('[ProtectLivestream] Error sending codec to client:', e)
          }
        }
      })

      livestream.on('message', (data: Buffer) => {
        for (const client of session.clients) {
          try {
            client(data)
          } catch (e) {
            console.error('[ProtectLivestream] Error sending data to client:', e)
          }
        }
      })

      livestream.on('close', () => {
        console.log('[ProtectLivestream] Stream closed for:', camera.name)
        this.sessions.delete(cameraId)
        this.tryReconnect(cameraId, session)
      })

      livestream.on('error', (err: Error) => {
        console.error('[ProtectLivestream] Stream error for', camera.name, ':', err.message)
        this.tryReconnect(cameraId, session)
      })

      const started = await livestream.start(cameraId, this.channel)
      
      if (!started) {
        console.error('[ProtectLivestream] Failed to start stream for:', camera.name)
        this.sessions.delete(cameraId)
        return false
      }
      
      this.reconnectAttempts.delete(cameraId)
      console.log('[ProtectLivestream] Stream started for:', camera.name)
      return true
    } catch (error) {
      console.error('[ProtectLivestream] Failed to start stream:', error)
      return false
    }
  }
  
  private async tryReconnect(cameraId: string, oldSession: LivestreamSession): Promise<void> {
    if (oldSession.clients.size === 0) {
      console.log('[ProtectLivestream] No clients for', cameraId, '- not reconnecting')
      return
    }
    
    const attempts = this.reconnectAttempts.get(cameraId) || 0
    if (attempts >= this.maxReconnectAttempts) {
      console.log('[ProtectLivestream] Max reconnect attempts reached for:', cameraId)
      this.reconnectAttempts.delete(cameraId)
      return
    }
    
    this.reconnectAttempts.set(cameraId, attempts + 1)
    console.log('[ProtectLivestream] Reconnecting stream for:', cameraId, 'attempt:', attempts + 1)
    
    await new Promise(resolve => setTimeout(resolve, 2000 * (attempts + 1)))
    
    try {
      this.isLoggedIn = false
      const connected = await this.connect()
      if (!connected) {
        console.error('[ProtectLivestream] Reconnect login failed for:', cameraId)
        return
      }
    } catch (err) {
      console.error('[ProtectLivestream] Reconnect login error:', err)
      return
    }
    
    const clients = Array.from(oldSession.clients)
    const codecCallbacks = Array.from(oldSession.codecCallbacks)
    
    for (let i = 0; i < clients.length; i++) {
      const client = clients[i]
      const codecCallback = codecCallbacks[i] || codecCallbacks[0]
      await this.startStream(cameraId, client, codecCallback)
    }
  }

  stopStream(cameraId: string, onData?: (data: Buffer) => void, onCodec?: (codec: string) => void): void {
    const session = this.sessions.get(cameraId)
    if (!session) return

    if (onData) {
      session.clients.delete(onData)
      if (onCodec) {
        session.codecCallbacks.delete(onCodec)
      }
      
      console.log('[ProtectLivestream] Client removed from', cameraId, '- remaining clients:', session.clients.size)
      
      if (session.clients.size === 0) {
        console.log('[ProtectLivestream] No more clients, stopping stream:', cameraId)
        try {
          session.livestream.stop()
        } catch (e) {
          console.error('[ProtectLivestream] Error stopping stream:', e)
        }
        this.sessions.delete(cameraId)
        this.reconnectAttempts.delete(cameraId)
      }
    } else {
      console.log('[ProtectLivestream] Force stopping stream:', cameraId)
      try {
        session.livestream.stop()
      } catch (e) {
        console.error('[ProtectLivestream] Error stopping stream:', e)
      }
      this.sessions.delete(cameraId)
      this.reconnectAttempts.delete(cameraId)
    }
  }

  isConnected(): boolean {
    return this.isLoggedIn
  }

  getActiveStreams(): string[] {
    return Array.from(this.sessions.keys())
  }
}

let manager: ProtectLivestreamManager | null = null

export function getProtectLivestreamManager(): ProtectLivestreamManager | null {
  return manager
}

export async function initProtectLivestreamManager(
  host: string, 
  username: string, 
  password: string,
  channel: number = 1
): Promise<ProtectLivestreamManager> {
  if (manager) {
    if (manager.isConnected()) {
      manager.setChannel(channel)
      return manager
    }
    await manager.disconnect()
  }
  
  manager = new ProtectLivestreamManager(host, username, password, channel)
  await manager.connect()
  return manager
}

export async function shutdownProtectLivestreamManager(): Promise<void> {
  if (manager) {
    await manager.disconnect()
    manager = null
  }
}
