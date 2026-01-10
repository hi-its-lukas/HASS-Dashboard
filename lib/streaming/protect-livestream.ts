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
  initSegmentSent: Set<(data: Buffer) => void>
  pendingBuffer: Buffer[]
  foundInit: boolean
  dataCount: number
}

// fMP4 box type signatures
const BOX_FTYP = 0x66747970  // 'ftyp'
const BOX_MOOV = 0x6d6f6f76  // 'moov'
const BOX_MOOF = 0x6d6f6f66  // 'moof'
const BOX_MDAT = 0x6d646174  // 'mdat'

function findBox(buffer: Buffer, boxType: number): { offset: number, size: number } | null {
  let offset = 0
  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset)
    const type = buffer.readUInt32BE(offset + 4)
    
    if (size < 8) break // Invalid box
    
    if (type === boxType) {
      return { offset, size }
    }
    
    offset += size
  }
  return null
}

function extractInitSegment(buffer: Buffer): { init: Buffer, remaining: Buffer } | null {
  // Look for ftyp box at the start
  const ftyp = findBox(buffer, BOX_FTYP)
  if (!ftyp) {
    console.log('[ProtectLivestream] No ftyp found in buffer of', buffer.length, 'bytes')
    return null
  }
  
  if (ftyp.offset !== 0) {
    console.log('[ProtectLivestream] ftyp found but not at start (offset:', ftyp.offset, ')')
    return null
  }
  
  // Check if ftyp is complete
  if (ftyp.offset + ftyp.size > buffer.length) {
    console.log('[ProtectLivestream] ftyp incomplete - need more data (have', buffer.length, 'need', ftyp.size, ')')
    return null
  }
  
  // Scan for moov after ftyp, skipping any boxes in between
  let offset = ftyp.size
  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset)
    const type = buffer.readUInt32BE(offset + 4)
    const typeStr = String.fromCharCode((type >> 24) & 0xff, (type >> 16) & 0xff, (type >> 8) & 0xff, type & 0xff)
    
    if (size < 8) {
      console.log('[ProtectLivestream] Invalid box size at offset', offset)
      break
    }
    
    console.log('[ProtectLivestream] Found box:', typeStr, 'size:', size, 'at offset:', offset)
    
    if (type === BOX_MOOV) {
      // Check if moov is complete
      const initSize = offset + size
      if (initSize <= buffer.length) {
        console.log('[ProtectLivestream] Found complete init segment: ftyp(' + ftyp.size + ') + ... + moov(' + size + ') = ' + initSize + ' bytes')
        return {
          init: buffer.subarray(0, initSize),
          remaining: buffer.subarray(initSize)
        }
      } else {
        console.log('[ProtectLivestream] moov incomplete - need more data (have', buffer.length, 'need', initSize, ')')
        return null
      }
    }
    
    // Skip to next box
    if (offset + size > buffer.length) {
      console.log('[ProtectLivestream] Box', typeStr, 'incomplete - need more data')
      return null
    }
    
    offset += size
  }
  
  console.log('[ProtectLivestream] moov not found yet - buffering more data')
  return null
}

function hasFtypBox(buffer: Buffer): boolean {
  return findBox(buffer, BOX_FTYP) !== null
}

function hasMoofBox(buffer: Buffer): boolean {
  return findBox(buffer, BOX_MOOF) !== null
}

function extractCodecFromInit(initSegment: Buffer): string | null {
  // Search for avcC box inside moov/trak/mdia/minf/stbl/stsd/avc1/avcC
  // The avcC box contains the actual codec parameters
  // For simplicity, search for 'avcC' marker and extract profile/level
  const avcCMarker = Buffer.from([0x61, 0x76, 0x63, 0x43]) // 'avcC'
  const idx = initSegment.indexOf(avcCMarker)
  
  if (idx === -1 || idx + 8 > initSegment.length) {
    console.log('[ProtectLivestream] avcC box not found in init segment')
    return null
  }
  
  // avcC structure: configurationVersion(1) + AVCProfileIndication(1) + profile_compatibility(1) + AVCLevelIndication(1)
  const configOffset = idx + 4 // Skip 'avcC' marker
  if (configOffset + 4 > initSegment.length) {
    return null
  }
  
  const profileIndication = initSegment[configOffset + 1]
  const profileCompatibility = initSegment[configOffset + 2]
  const levelIndication = initSegment[configOffset + 3]
  
  // Format: avc1.XXYYZZ where XX=profile, YY=compatibility, ZZ=level
  const codec = `avc1.${profileIndication.toString(16).padStart(2, '0')}${profileCompatibility.toString(16).padStart(2, '0')}${levelIndication.toString(16).padStart(2, '0')}`
  console.log('[ProtectLivestream] Extracted codec from init segment:', codec, 
    '(profile:', profileIndication, 'compat:', profileCompatibility, 'level:', levelIndication, ')')
  
  return codec
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
        initSegmentSent: new Set(),
        pendingBuffer: [],
        foundInit: false,
        dataCount: 0
      }
      this.sessions.set(cameraId, session)
      
      livestream.on('close', () => {
        console.log('[ProtectLivestream] Stream closed for:', camera.name)
        this.sessions.delete(cameraId)
      })

      // Derive codec from camera channel config - send BEFORE starting stream
      const channelConfig = camera.channels?.find(ch => ch.id === this.channel)
      const width = channelConfig?.width || 1920
      const height = channelConfig?.height || 1080
      
      // Map to MSE-compatible H.264 codec string based on resolution
      // Most UniFi cameras use Main profile
      let codecString = 'avc1.4d401f' // H.264 Main profile, Level 3.1 (720p default)
      if (height > 1080) {
        codecString = 'avc1.640028' // High profile, Level 4.0 for 4K
      } else if (height > 720) {
        codecString = 'avc1.4d4028' // Main profile, Level 4.0 for 1080p
      }
      
      // Send codec IMMEDIATELY before stream starts
      console.log('[ProtectLivestream] Sending derived codec for', camera.name, ':', codecString, '(', width, 'x', height, ')')
      session.lastCodec = codecString
      for (const callback of session.codecCallbacks) {
        try {
          callback(codecString)
        } catch (e) {
          console.error('[ProtectLivestream] Error sending codec to client:', e)
        }
      }

      // Start stream with useStream: true - REQUIRED for data to flow in unifi-protect 4.27+
      const started = await livestream.start(cameraId, this.channel, { 
        useStream: true,
        segmentLength: 100
      })
      
      if (!started) {
        console.error('[ProtectLivestream] Failed to start stream for:', camera.name)
        this.sessions.delete(cameraId)
        return false
      }
      
      const stream = livestream.stream
      if (!stream) {
        console.error('[ProtectLivestream] Stream interface not available for:', camera.name)
        this.sessions.delete(cameraId)
        return false
      }
      
      console.log('[ProtectLivestream] Stream started for:', camera.name, '- streaming fMP4 chunks')
      
      // Consume fMP4 chunks from the Readable stream
      stream.on('data', (data: Buffer) => {
        session.dataCount++
        
        // Debug logging
        if (session.dataCount <= 10 || session.dataCount % 100 === 0) {
          const boxType = data.length >= 8 ? data.readUInt32BE(4).toString(16) : 'unknown'
          console.log('[ProtectLivestream] Chunk #' + session.dataCount + ' for', camera.name, '- size:', data.length, '- first box:', boxType)
        }
        
        // If we haven't found init segment yet, try to extract it
        if (!session.foundInit) {
          // Buffer incoming data
          session.pendingBuffer.push(data)
          
          // Concatenate all pending buffers
          const combined = Buffer.concat(session.pendingBuffer)
          
          // Try to extract init segment
          const result = extractInitSegment(combined)
          if (result) {
            session.initSegment = result.init
            session.foundInit = true
            console.log('[ProtectLivestream] Init segment cached for', camera.name, '- size:', result.init.length)
            
            // Extract and update codec from init segment
            const extractedCodec = extractCodecFromInit(result.init)
            if (extractedCodec && extractedCodec !== session.lastCodec) {
              console.log('[ProtectLivestream] Updating codec for', camera.name, 'from', session.lastCodec, 'to', extractedCodec)
              session.lastCodec = extractedCodec
              // Send updated codec to all clients
              for (const callback of session.codecCallbacks) {
                try {
                  callback(extractedCodec)
                } catch (e) {
                  console.error('[ProtectLivestream] Error sending updated codec:', e)
                }
              }
            }
            
            // Send init segment to all clients first
            for (const client of session.clients) {
              try {
                if (!session.initSegmentSent.has(client)) {
                  client(result.init)
                  session.initSegmentSent.add(client)
                }
              } catch (e) {
                console.error('[ProtectLivestream] Error sending init segment:', e)
              }
            }
            
            // Send remaining data after init segment
            if (result.remaining.length > 0) {
              for (const client of session.clients) {
                try {
                  client(result.remaining)
                } catch (e) {
                  console.error('[ProtectLivestream] Error sending remaining data:', e)
                }
              }
            }
            
            // Clear pending buffer
            session.pendingBuffer = []
          } else if (!hasFtypBox(combined) && hasMoofBox(combined)) {
            // If we see moof without ftyp/moov, the init was not at the start
            console.log('[ProtectLivestream] WARNING: moof found without init segment for', camera.name, '- stream may not play')
            session.foundInit = true // Give up looking
            
            // Send what we have anyway
            for (const client of session.clients) {
              try {
                client(combined)
              } catch (e) {
                console.error('[ProtectLivestream] Error sending data:', e)
              }
            }
            session.pendingBuffer = []
          } else if (session.pendingBuffer.length > 20) {
            // Timeout - too many chunks without init
            console.log('[ProtectLivestream] WARNING: No init segment found after 20 chunks for', camera.name)
            session.foundInit = true
            for (const client of session.clients) {
              try {
                client(combined)
              } catch (e) {
                console.error('[ProtectLivestream] Error sending data:', e)
              }
            }
            session.pendingBuffer = []
          }
          return
        }
        
        // Normal flow: init segment already found, just forward data
        for (const client of session.clients) {
          try {
            // Make sure client got init segment first
            if (session.initSegment && !session.initSegmentSent.has(client)) {
              client(session.initSegment)
              session.initSegmentSent.add(client)
            }
            client(data)
          } catch (e) {
            console.error('[ProtectLivestream] Error sending chunk:', e)
          }
        }
      })
      
      stream.on('error', (err) => {
        console.error('[ProtectLivestream] Stream error for', camera.name, ':', err.message)
      })
      
      stream.on('end', () => {
        console.log('[ProtectLivestream] Stream ended for:', camera.name)
        this.sessions.delete(cameraId)
      })
      
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
