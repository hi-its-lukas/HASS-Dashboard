import { ProtectApi, ProtectLivestream, ProtectCameraConfig } from 'unifi-protect'
import { EventEmitter } from 'events'

interface LivestreamSession {
  cameraId: string
  channel: number
  livestream: ProtectLivestream
  clients: Set<(data: Buffer) => void>
  codecCallbacks: Set<(codec: string) => void>
  lastCodec: string | null
  initSegment: Buffer | null
  dataCount: number
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
      console.log('[ProtectLivestream] Already connected, reusing session')
      return true
    }
    
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
      console.error('[ProtectLivestream] Not connected - call connect() first')
      return false
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
        lastCodec: null,
        initSegment: null,
        dataCount: 0
      }
      this.sessions.set(cameraId, session)
      
      // Listen for codec info
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

      // Listen for initialization segment (ftyp + moov boxes)
      livestream.on('initsegment', (data: Buffer) => {
        console.log('[ProtectLivestream] Init segment received for', camera.name, '- size:', data.length)
        session.initSegment = data
        // Send init segment to all clients
        for (const client of session.clients) {
          try {
            client(data)
          } catch (e) {
            console.error('[ProtectLivestream] Error sending init segment:', e)
          }
        }
      })

      // Listen for regular fMP4 segments (moof + mdat)
      livestream.on('segment', (data: Buffer) => {
        session.dataCount++
        if (session.dataCount <= 3 || session.dataCount % 100 === 0) {
          console.log('[ProtectLivestream] Segment #' + session.dataCount + ' for', camera.name, '- size:', data.length)
        }
        for (const client of session.clients) {
          try {
            client(data)
          } catch (e) {
            console.error('[ProtectLivestream] Error sending segment:', e)
          }
        }
      })

      // Also listen for 'message' as fallback (complete segments)
      livestream.on('message', (data: Buffer) => {
        session.dataCount++
        if (session.dataCount <= 3 || session.dataCount % 100 === 0) {
          console.log('[ProtectLivestream] Message #' + session.dataCount + ' for', camera.name, '- size:', data.length)
        }
        for (const client of session.clients) {
          try {
            client(data)
          } catch (e) {
            console.error('[ProtectLivestream] Error sending message:', e)
          }
        }
      })

      livestream.on('close', () => {
        console.log('[ProtectLivestream] Stream closed for:', camera.name)
        this.sessions.delete(cameraId)
      })

      // Start the stream with cameraId and channel
      const started = await livestream.start(cameraId, this.channel)
      
      if (!started) {
        console.error('[ProtectLivestream] Failed to start stream for:', camera.name)
        this.sessions.delete(cameraId)
        return false
      }
      
      console.log('[ProtectLivestream] Stream started for:', camera.name)
      return true
    } catch (error) {
      console.error('[ProtectLivestream] Failed to start stream:', error)
      this.sessions.delete(cameraId)
      return false
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
      }
    } else {
      console.log('[ProtectLivestream] Force stopping stream:', cameraId)
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
let managerInitPromise: Promise<ProtectLivestreamManager> | null = null

export function getProtectLivestreamManager(): ProtectLivestreamManager | null {
  return manager
}

export async function initProtectLivestreamManager(
  host: string, 
  username: string, 
  password: string,
  channel: number = 1
): Promise<ProtectLivestreamManager> {
  if (manager?.isConnected()) {
    manager.setChannel(channel)
    return manager
  }
  
  if (managerInitPromise) {
    console.log('[ProtectLivestream] Waiting for existing init...')
    return managerInitPromise
  }
  
  managerInitPromise = (async () => {
    try {
      if (manager) {
        await manager.disconnect()
      }
      
      manager = new ProtectLivestreamManager(host, username, password, channel)
      const connected = await manager.connect()
      
      if (!connected) {
        throw new Error('Failed to connect to UniFi Protect')
      }
      
      return manager
    } finally {
      managerInitPromise = null
    }
  })()
  
  return managerInitPromise
}

export async function shutdownProtectLivestreamManager(): Promise<void> {
  if (manager) {
    await manager.disconnect()
    manager = null
  }
}
