import { ProtectApi, ProtectLivestream, ProtectCameraConfig } from 'unifi-protect'
import { EventEmitter } from 'events'

interface LivestreamSession {
  cameraId: string
  livestream: ProtectLivestream
  clients: Set<(data: Buffer) => void>
}

export class ProtectLivestreamManager extends EventEmitter {
  private api: ProtectApi
  private host: string
  private username: string
  private password: string
  private isLoggedIn: boolean = false
  private sessions: Map<string, LivestreamSession> = new Map()
  private cameras: ProtectCameraConfig[] = []

  constructor(host: string, username: string, password: string) {
    super()
    this.host = host
    this.username = username
    this.password = password
    this.api = new ProtectApi()
  }

  async connect(): Promise<boolean> {
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

    console.log('[ProtectLivestream] Starting stream for:', camera.name, '(', cameraId, ')')

    try {
      const livestream = this.api.createLivestream()
      
      livestream.on('codec', (codecInfo: string) => {
        console.log('[ProtectLivestream] Codec info for', camera.name, ':', codecInfo)
        if (onCodec) {
          onCodec(codecInfo)
        }
      })

      livestream.on('message', (data: Buffer) => {
        const session = this.sessions.get(cameraId)
        if (session) {
          for (const client of session.clients) {
            try {
              client(data)
            } catch (e) {
              console.error('[ProtectLivestream] Error sending data to client:', e)
            }
          }
        }
      })

      livestream.on('close', () => {
        console.log('[ProtectLivestream] Stream closed for:', camera.name)
        this.sessions.delete(cameraId)
      })

      livestream.on('error', (err: Error) => {
        console.error('[ProtectLivestream] Stream error for', camera.name, ':', err.message)
      })

      const session: LivestreamSession = {
        cameraId,
        livestream,
        clients: new Set([onData])
      }
      this.sessions.set(cameraId, session)

      const channel = 1
      const started = await livestream.start(cameraId, channel)
      
      if (!started) {
        console.error('[ProtectLivestream] Failed to start stream for:', camera.name)
        this.sessions.delete(cameraId)
        return false
      }
      
      console.log('[ProtectLivestream] Stream started for:', camera.name)
      return true
    } catch (error) {
      console.error('[ProtectLivestream] Failed to start stream:', error)
      return false
    }
  }

  stopStream(cameraId: string, onData?: (data: Buffer) => void): void {
    const session = this.sessions.get(cameraId)
    if (!session) return

    if (onData) {
      session.clients.delete(onData)
      
      if (session.clients.size === 0) {
        console.log('[ProtectLivestream] No more clients, stopping stream:', cameraId)
        try {
          session.livestream.stop()
        } catch (e) {
          console.error('[ProtectLivestream] Error stopping stream:', e)
        }
        this.sessions.delete(cameraId)
      }
    } else {
      try {
        session.livestream.stop()
      } catch (e) {
        console.error('[ProtectLivestream] Error stopping stream:', e)
      }
      this.sessions.delete(cameraId)
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
  password: string
): Promise<ProtectLivestreamManager> {
  if (manager) {
    if (manager.isConnected()) {
      return manager
    }
    await manager.disconnect()
  }
  
  manager = new ProtectLivestreamManager(host, username, password)
  await manager.connect()
  return manager
}

export async function shutdownProtectLivestreamManager(): Promise<void> {
  if (manager) {
    await manager.disconnect()
    manager = null
  }
}
