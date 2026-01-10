import { ProtectApi, ProtectLivestream, ProtectCameraConfig } from 'unifi-protect'
import { EventEmitter } from 'events'

interface LivestreamSession {
  cameraId: string
  channel: number
  livestream: ProtectLivestream
  clients: Set<(data: Buffer) => void>
  waitingClients: Set<(data: Buffer) => void>
  codecCallbacks: Set<(codec: string) => void>
  lastCodec: string | null
  initSegment: Buffer | null
  initSegmentSent: Set<(data: Buffer) => void>
  pendingBuffer: Buffer[]
  foundInit: boolean
  dataCount: number
  lastKeyframeChunk: Buffer | null
}

// fMP4 box type signatures
const BOX_FTYP = 0x66747970  // 'ftyp'
const BOX_MOOV = 0x6d6f6f76  // 'moov'
const BOX_MOOF = 0x6d6f6f66  // 'moof'
const BOX_MDAT = 0x6d646174  // 'mdat'
const BOX_TRAF = 0x74726166  // 'traf'
const BOX_TRUN = 0x7472756e  // 'trun'

function hasKeyframe(buffer: Buffer): boolean {
  let offset = 0
  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset)
    const type = buffer.readUInt32BE(offset + 4)
    
    if (size < 8 || offset + size > buffer.length) break
    
    if (type === BOX_MOOF) {
      let moofOffset = offset + 8
      const moofEnd = offset + size
      
      while (moofOffset + 8 <= moofEnd) {
        const boxSize = buffer.readUInt32BE(moofOffset)
        const boxType = buffer.readUInt32BE(moofOffset + 4)
        
        if (boxSize < 8) break
        
        if (boxType === BOX_TRAF) {
          let trafOffset = moofOffset + 8
          const trafEnd = moofOffset + boxSize
          
          while (trafOffset + 8 <= trafEnd) {
            const subBoxSize = buffer.readUInt32BE(trafOffset)
            const subBoxType = buffer.readUInt32BE(trafOffset + 4)
            
            if (subBoxSize < 8) break
            
            if (subBoxType === BOX_TRUN) {
              const flags = buffer.readUInt32BE(trafOffset + 8) & 0xFFFFFF
              const firstSampleFlagsPresent = (flags & 0x000004) !== 0
              
              let cursor = trafOffset + 16
              const dataOffsetPresent = (flags & 0x000001) !== 0
              if (dataOffsetPresent) cursor += 4
              
              if (firstSampleFlagsPresent && cursor + 4 <= trafEnd) {
                const firstSampleFlags = buffer.readUInt32BE(cursor)
                const isSync = (firstSampleFlags & 0x00010000) === 0
                if (isSync) return true
              }
            }
            trafOffset += subBoxSize
          }
        }
        moofOffset += boxSize
      }
    }
    offset += size
  }
  return false
}

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

function hexDump(buffer: Buffer, maxBytes: number = 256): string {
  const lines: string[] = []
  const len = Math.min(buffer.length, maxBytes)
  
  for (let i = 0; i < len; i += 16) {
    const hex = []
    const ascii = []
    for (let j = 0; j < 16; j++) {
      if (i + j < len) {
        hex.push(buffer[i + j].toString(16).padStart(2, '0'))
        const c = buffer[i + j]
        ascii.push(c >= 32 && c < 127 ? String.fromCharCode(c) : '.')
      } else {
        hex.push('  ')
        ascii.push(' ')
      }
    }
    lines.push(
      i.toString(16).padStart(8, '0') + '  ' +
      hex.slice(0, 8).join(' ') + '  ' + hex.slice(8).join(' ') + '  |' +
      ascii.join('') + '|'
    )
  }
  
  if (buffer.length > maxBytes) {
    lines.push(`... (${buffer.length - maxBytes} more bytes)`)
  }
  
  return lines.join('\n')
}

function dumpBoxStructure(buffer: Buffer, prefix: string = '', maxDepth: number = 3): void {
  if (maxDepth <= 0) return
  
  let offset = 0
  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset)
    const type = buffer.readUInt32BE(offset + 4)
    const typeStr = String.fromCharCode((type >> 24) & 0xff, (type >> 16) & 0xff, (type >> 8) & 0xff, type & 0xff)
    
    if (size < 8 || offset + size > buffer.length) break
    
    console.log(prefix + typeStr + ' [' + size + ' bytes]')
    
    // Recursively dump container boxes
    const containerBoxes = ['moov', 'trak', 'mdia', 'minf', 'stbl', 'mvex', 'edts', 'stsd']
    if (containerBoxes.includes(typeStr) && size > 8) {
      dumpBoxStructure(buffer.subarray(offset + 8, offset + size), prefix + '  ', maxDepth - 1)
    }
    
    // For ftyp, log the brands
    if (typeStr === 'ftyp' && size >= 16) {
      const majorBrand = buffer.subarray(offset + 8, offset + 12).toString('ascii')
      const minorVersion = buffer.readUInt32BE(offset + 12)
      const compatBrands: string[] = []
      for (let i = offset + 16; i + 4 <= offset + size; i += 4) {
        compatBrands.push(buffer.subarray(i, i + 4).toString('ascii'))
      }
      console.log(prefix + '  major_brand: ' + majorBrand + ', minor: ' + minorVersion)
      console.log(prefix + '  compatible_brands: ' + compatBrands.join(', '))
    }
    
    // For stsd, check for avc1 or hvc1
    if (typeStr === 'stsd' && size > 16) {
      const entryCount = buffer.readUInt32BE(offset + 12)
      console.log(prefix + '  entry_count: ' + entryCount)
      if (size > 24) {
        const sampleEntryType = buffer.subarray(offset + 20, offset + 24).toString('ascii')
        console.log(prefix + '  sample_entry_type: ' + sampleEntryType + ' (avc1=H.264, hvc1/hev1=HEVC)')
      }
    }
    
    offset += size
  }
}

function dumpFullBoxStructure(buffer: Buffer, prefix: string = ''): void {
  let offset = 0
  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset)
    const type = buffer.readUInt32BE(offset + 4)
    const typeStr = String.fromCharCode((type >> 24) & 0xff, (type >> 16) & 0xff, (type >> 8) & 0xff, type & 0xff)
    
    if (size < 8 || offset + size > buffer.length) break
    
    console.log(prefix + typeStr + ' [' + size + ' bytes @ offset ' + offset + ']')
    
    // Recursively dump ALL container boxes
    const containerBoxes = ['moov', 'trak', 'mdia', 'minf', 'stbl', 'mvex', 'edts', 'udta', 'meta', 'dinf']
    if (containerBoxes.includes(typeStr) && size > 8) {
      dumpFullBoxStructure(buffer.subarray(offset + 8, offset + size), prefix + '  ')
    }
    
    // For ftyp, log the brands
    if (typeStr === 'ftyp' && size >= 16) {
      const majorBrand = buffer.subarray(offset + 8, offset + 12).toString('ascii')
      const minorVersion = buffer.readUInt32BE(offset + 12)
      const compatBrands: string[] = []
      for (let i = offset + 16; i + 4 <= offset + size; i += 4) {
        compatBrands.push(buffer.subarray(i, i + 4).toString('ascii'))
      }
      console.log(prefix + '  major_brand: ' + majorBrand + ', minor: ' + minorVersion)
      console.log(prefix + '  compatible_brands: ' + compatBrands.join(', '))
    }
    
    // For stsd (Sample Description), show codec type
    if (typeStr === 'stsd' && size > 16) {
      // stsd is a full box with version(1) + flags(3) + entry_count(4)
      const entryCount = buffer.readUInt32BE(offset + 12)
      console.log(prefix + '  entry_count: ' + entryCount)
      // First sample entry starts at offset + 16
      if (size > 24) {
        const entrySize = buffer.readUInt32BE(offset + 16)
        const entryType = buffer.subarray(offset + 20, offset + 24).toString('ascii')
        console.log(prefix + '  sample_entry: ' + entryType + ' [' + entrySize + ' bytes]')
        console.log(prefix + '    >> ' + entryType + ' = ' + 
          (entryType === 'avc1' ? 'H.264/AVC' : 
           entryType === 'hvc1' || entryType === 'hev1' ? 'H.265/HEVC' : 
           'Unknown codec'))
      }
    }
    
    offset += size
  }
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
        
        // Dump the init segment structure for debugging
        console.log('[ProtectLivestream] Init segment structure (FULL):')
        dumpFullBoxStructure(buffer.subarray(0, initSize), '  ')
        
        // Hex dump first 512 bytes
        console.log('[ProtectLivestream] Init segment HEX DUMP (first 512 bytes):')
        console.log(hexDump(buffer.subarray(0, initSize), 512))
        
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

function fixFtypForMSE(initSegment: Buffer): Buffer {
  if (initSegment.length < 12) return initSegment

  const boxType = initSegment.readUInt32BE(4)
  if (boxType !== 0x66747970) return initSegment

  const fixed = Buffer.from(initSegment)
  const ftypSize = fixed.readUInt32BE(0)

  const majorBrand = fixed.subarray(8, 12).toString('ascii')
  if (majorBrand === 'dash') {
    console.log('[ProtectLivestream] Fixing ftyp major_brand from "dash" to "isom"')
    fixed.write('isom', 8, 4, 'ascii')
  }

  for (let i = 16; i + 4 <= ftypSize && i + 4 <= fixed.length; i += 4) {
    const brand = fixed.subarray(i, i + 4).toString('ascii')
    if (brand === 'hvc1' || brand === 'hev1') {
      console.log('[ProtectLivestream] Replacing incompatible brand "' + brand + '" with "avc1"')
      fixed.write('avc1', i, 4, 'ascii')
    }
  }

  return fixed
}

function extractCodecFromInit(initSegment: Buffer): string | null {
  const codecs: string[] = []
  
  // Extract video codec from avcC box
  const avcCMarker = Buffer.from([0x61, 0x76, 0x63, 0x43]) // 'avcC'
  const avcIdx = initSegment.indexOf(avcCMarker)
  
  if (avcIdx !== -1 && avcIdx + 8 <= initSegment.length) {
    const configOffset = avcIdx + 4
    if (configOffset + 4 <= initSegment.length) {
      const profileIndication = initSegment[configOffset + 1]
      const profileCompatibility = initSegment[configOffset + 2]
      const levelIndication = initSegment[configOffset + 3]
      
      const videoCodec = `avc1.${profileIndication.toString(16).padStart(2, '0')}${profileCompatibility.toString(16).padStart(2, '0')}${levelIndication.toString(16).padStart(2, '0')}`
      codecs.push(videoCodec)
      console.log('[ProtectLivestream] Extracted video codec:', videoCodec,
        '(profile:', profileIndication, 'compat:', profileCompatibility, 'level:', levelIndication, ')')
    }
  }
  
  // Check for mp4a audio track
  const mp4aMarker = Buffer.from([0x6d, 0x70, 0x34, 0x61]) // 'mp4a'
  const mp4aIdx = initSegment.indexOf(mp4aMarker)
  
  if (mp4aIdx !== -1) {
    // AAC-LC is typically mp4a.40.2
    codecs.push('mp4a.40.2')
    console.log('[ProtectLivestream] Detected audio track: mp4a.40.2')
  }
  
  if (codecs.length === 0) {
    console.log('[ProtectLivestream] No codecs found in init segment')
    return null
  }
  
  const codecString = codecs.join(', ')
  console.log('[ProtectLivestream] Combined codec string:', codecString)
  return codecString
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
      
      // Cancel any pending cleanup
      const pendingCleanup = this.sessionCleanupTimeouts.get(cameraId)
      if (pendingCleanup) {
        console.log('[ProtectLivestream] Cancelling pending cleanup for:', camera.name)
        clearTimeout(pendingCleanup)
        this.sessionCleanupTimeouts.delete(cameraId)
      }
      
      // DON'T add to clients yet - wait until init segment is sent
      if (onCodec) {
        existingSession.codecCallbacks.add(onCodec)
        // Send cached codec immediately
        if (existingSession.lastCodec) {
          console.log('[ProtectLivestream] Sending cached codec to new client:', existingSession.lastCodec)
          onCodec(existingSession.lastCodec)
        }
      }
      
      // Send cached init segment with a small delay, then add to waitingClients queue
      if (existingSession.initSegment && existingSession.foundInit) {
        const initSegmentCopy = Buffer.from(existingSession.initSegment)
        const lastKeyframeCopy = existingSession.lastKeyframeChunk ? Buffer.from(existingSession.lastKeyframeChunk) : null
        console.log('[ProtectLivestream] Scheduling cached init segment for new client - size:', initSegmentCopy.length, 
          'lastKeyframe:', lastKeyframeCopy ? lastKeyframeCopy.length : 'none')
        
        setTimeout(() => {
          try {
            onData(initSegmentCopy)
            existingSession.initSegmentSent.add(onData)
            
            if (lastKeyframeCopy) {
              console.log('[ProtectLivestream] Sending cached keyframe to new client - size:', lastKeyframeCopy.length)
              onData(lastKeyframeCopy)
              existingSession.clients.add(onData)
              console.log('[ProtectLivestream] Client added directly with cached keyframe')
            } else {
              existingSession.waitingClients.add(onData)
              console.log('[ProtectLivestream] Client added to waiting queue for next keyframe')
            }
          } catch (e) {
            console.error('[ProtectLivestream] Error sending cached init segment:', e)
          }
        }, 100)
      } else {
        existingSession.clients.add(onData)
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
        waitingClients: new Set(),
        codecCallbacks: onCodec ? new Set([onCodec]) : new Set(),
        lastCodec: null,
        initSegment: null,
        initSegmentSent: new Set(),
        pendingBuffer: [],
        foundInit: false,
        dataCount: 0,
        lastKeyframeChunk: null
      }
      this.sessions.set(cameraId, session)
      
      livestream.on('close', () => {
        console.log('[ProtectLivestream] Stream closed for:', camera.name)
        this.sessions.delete(cameraId)
      })

      // Derive codec from camera channel config as FALLBACK only
      // We will wait for the init segment to extract the real codec
      const channelConfig = camera.channels?.find(ch => ch.id === this.channel)
      const width = channelConfig?.width || 1920
      const height = channelConfig?.height || 1080
      
      // Map to MSE-compatible H.264 codec string based on resolution
      // Most UniFi cameras use Main profile
      let fallbackCodec = 'avc1.4d401f' // H.264 Main profile, Level 3.1 (720p default)
      if (height > 1080) {
        fallbackCodec = 'avc1.640028' // High profile, Level 4.0 for 4K
      } else if (height > 720) {
        fallbackCodec = 'avc1.4d4028' // Main profile, Level 4.0 for 1080p
      }
      
      // DON'T send codec yet - wait for init segment extraction
      console.log('[ProtectLivestream] Derived fallback codec for', camera.name, ':', fallbackCodec, '(', width, 'x', height, ') - waiting for init segment')
      session.lastCodec = fallbackCodec

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
            // Fix ftyp major_brand for MSE compatibility (dash -> isom)
            session.initSegment = fixFtypForMSE(result.init)
            session.foundInit = true
            console.log('[ProtectLivestream] Init segment cached for', camera.name, '- size:', session.initSegment.length)
            
            // Extract codec from init segment - this is the FIRST time we send codec to client
            const extractedCodec = extractCodecFromInit(session.initSegment)
            const codecToSend = extractedCodec || session.lastCodec || 'avc1.4d401f'
            console.log('[ProtectLivestream] Sending codec for', camera.name, ':', codecToSend, extractedCodec ? '(from init segment)' : '(fallback)')
            session.lastCodec = codecToSend
            
            // Send codec to all clients BEFORE sending init segment
            for (const callback of session.codecCallbacks) {
              try {
                callback(codecToSend)
              } catch (e) {
                console.error('[ProtectLivestream] Error sending codec:', e)
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
        const isKeyframe = hasKeyframe(data)
        
        if (isKeyframe) {
          session.lastKeyframeChunk = Buffer.from(data)
          
          if (session.waitingClients.size > 0) {
            console.log('[ProtectLivestream] Keyframe detected! Activating', session.waitingClients.size, 'waiting clients for', camera.name)
            for (const waitingClient of session.waitingClients) {
              try {
                waitingClient(data)
                session.clients.add(waitingClient)
              } catch (e) {
                console.error('[ProtectLivestream] Error sending keyframe to waiting client:', e)
              }
            }
            session.waitingClients.clear()
          }
        }
        
        for (const client of session.clients) {
          try {
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

  private sessionCleanupTimeouts = new Map<string, NodeJS.Timeout>()
  
  stopStream(cameraId: string, onData?: (data: Buffer) => void, onCodec?: (codec: string) => void): void {
    const session = this.sessions.get(cameraId)
    if (!session) return

    if (onData) {
      session.clients.delete(onData)
      session.waitingClients.delete(onData)
      session.initSegmentSent.delete(onData)
      if (onCodec) {
        session.codecCallbacks.delete(onCodec)
      }
      
      const totalClients = session.clients.size + session.waitingClients.size
      console.log('[ProtectLivestream] Client removed from', cameraId, '- remaining:', totalClients, '(active:', session.clients.size, 'waiting:', session.waitingClients.size, ')')
      
      if (totalClients === 0) {
        // Clear any existing cleanup timeout for this camera
        const existingTimeout = this.sessionCleanupTimeouts.get(cameraId)
        if (existingTimeout) {
          clearTimeout(existingTimeout)
        }
        
        // Delay cleanup by 3 seconds to allow modal to connect
        console.log('[ProtectLivestream] No clients, delaying cleanup for 3s:', cameraId)
        const timeout = setTimeout(() => {
          const currentSession = this.sessions.get(cameraId)
          const currentTotal = currentSession ? currentSession.clients.size + currentSession.waitingClients.size : 0
          if (currentSession && currentTotal === 0) {
            console.log('[ProtectLivestream] Cleanup timeout reached, stopping stream:', cameraId)
            try {
              currentSession.livestream.stop()
            } catch (e) {
              console.error('[ProtectLivestream] Error stopping stream:', e)
            }
            this.sessions.delete(cameraId)
          } else if (currentSession) {
            console.log('[ProtectLivestream] New client connected before cleanup:', cameraId)
          }
          this.sessionCleanupTimeouts.delete(cameraId)
        }, 3000)
        
        this.sessionCleanupTimeouts.set(cameraId, timeout)
      }
    } else {
      console.log('[ProtectLivestream] Force stopping stream:', cameraId)
      const existingTimeout = this.sessionCleanupTimeouts.get(cameraId)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
        this.sessionCleanupTimeouts.delete(cameraId)
      }
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
