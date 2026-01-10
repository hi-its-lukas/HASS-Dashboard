# UniFi Protect fMP4 Livestream → Browser MSE: SourceBuffer Error beim ersten appendBuffer

## Kontext

Ich entwickle ein Home Assistant Dashboard mit Live-Kamera-Streaming von UniFi Protect. Die Architektur:

- **Server**: Node.js mit `unifi-protect` npm-Bibliothek (Livestream API)
- **Client**: React/Next.js mit MediaSource Extensions (MSE)
- **Transport**: WebSocket (Binary Frames)
- **Browser**: Safari (iPhone), Edge (Mac), Fully Kiosk Browser (Android)
- **Kameras**: 9x UniFi Protect Kameras (G4 Doorbell, G4 Bullet, etc.)

## Das Problem

Der SourceBuffer wirft **sofort beim ersten appendBuffer des Init-Segments** einen Fehler. Das Video bleibt schwarz. Dies passiert auf **allen drei Browsern** (Safari, Edge, Fully Kiosk).

## Browser-Konsolen-Logs

```
[LivestreamPlayer] Connecting to: wss://hoas-dashboard.familie-hengl.de/ws/livestream/68330e970123c803e4000703
[LivestreamPlayer] MediaSource opened, readyState: open
[LivestreamPlayer] tryInitializeSourceBuffer - codec: null sourceOpenReady: true readyState: open
[LivestreamPlayer] WebSocket connected
[LivestreamPlayer] Received message: stream_started 
[LivestreamPlayer] Stream started for camera: 68330e970123c803e4000703
[LivestreamPlayer] Received message: codec avc1.640020
[LivestreamPlayer] Received codec info: avc1.640020
[LivestreamPlayer] tryInitializeSourceBuffer - codec: avc1.640020 sourceOpenReady: true readyState: open
[LivestreamPlayer] Checking codec support: video/mp4; codecs="avc1.640020"
[LivestreamPlayer] Creating SourceBuffer with: video/mp4; codecs="avc1.640020"
[LivestreamPlayer] SourceBuffer created successfully!
[LivestreamPlayer] Binary chunk #1 - size: 1181 - box: ftyp - sourceBuffer ready: true - queue length: 0
[LivestreamPlayer] INIT SEGMENT received! Size: 1181
[LivestreamPlayer] appendBuffer #1 - size: 1181 - box: ftyp - buffered ranges: none
[LivestreamPlayer] SourceBuffer error: Event {isTrusted: true, type: 'error', target: SourceBuffer, currentTarget: SourceBuffer, eventPhase: 2, …}
[LivestreamPlayer] MediaSource ended
[LivestreamPlayer] MediaSource closed
```

## Server-Logs (Init-Segment-Analyse)

```
[ProtectLivestream] Found complete init segment: ftyp(32) + ... + moov(1149) = 1181 bytes
[ProtectLivestream] Init segment structure:
  ftyp [32 bytes]
    major_brand: dash, minor: 0
    compatible_brands: iso6, hvc1, avc1, mp41
  moov [1149 bytes]
    mvex [72 bytes]
[ProtectLivestream] Fixing ftyp major_brand from "dash" to "isom" for MSE compatibility
[ProtectLivestream] Init segment cached for Hautüre - size: 1181
[ProtectLivestream] Extracted codec from init segment: avc1.640020 (profile: 100 compat: 0 level: 32)
[ProtectLivestream] Sending codec for Hautüre : avc1.640020 (from init segment)
```

**Hinweis**: Ursprünglich war `major_brand: dash`, ich habe es serverseitig zu `isom` geändert – gleiches Ergebnis.

## Codec-String an Browser gesendet

```
video/mp4; codecs="avc1.640020"
```

`MediaSource.isTypeSupported('video/mp4; codecs="avc1.640020"')` gibt `true` zurück.

## Relevanter Server-Code

### lib/streaming/protect-livestream.ts

```typescript
import { ProtectApi, ProtectLivestream, ProtectCameraConfig } from 'unifi-protect'

// fMP4 box type signatures
const BOX_FTYP = 0x66747970  // 'ftyp'
const BOX_MOOV = 0x6d6f6f76  // 'moov'
const BOX_MOOF = 0x6d6f6f66  // 'moof'

function findBox(buffer: Buffer, boxType: number): { offset: number, size: number } | null {
  let offset = 0
  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset)
    const type = buffer.readUInt32BE(offset + 4)
    if (size < 8) break
    if (type === boxType) {
      return { offset, size }
    }
    offset += size
  }
  return null
}

// Init-Segment-Extraktion (ftyp + moov)
function extractInitSegment(buffer: Buffer): { init: Buffer, remaining: Buffer } | null {
  const ftyp = findBox(buffer, BOX_FTYP)
  if (!ftyp || ftyp.offset !== 0) return null
  
  let offset = ftyp.size
  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset)
    const type = buffer.readUInt32BE(offset + 4)
    
    if (type === BOX_MOOV) {
      const initSize = offset + size
      if (initSize <= buffer.length) {
        return {
          init: buffer.subarray(0, initSize),
          remaining: buffer.subarray(initSize)
        }
      }
    }
    offset += size
  }
  return null
}

// Codec-Extraktion aus avcC Box
function extractCodecFromInit(initSegment: Buffer): string | null {
  const avcCMarker = Buffer.from([0x61, 0x76, 0x63, 0x43]) // 'avcC'
  const idx = initSegment.indexOf(avcCMarker)
  if (idx === -1 || idx + 8 > initSegment.length) {
    console.log('[ProtectLivestream] avcC box not found in init segment')
    return null
  }
  
  // avcC structure: configurationVersion(1) + AVCProfileIndication(1) + profile_compatibility(1) + AVCLevelIndication(1)
  const configOffset = idx + 4
  const profileIndication = initSegment[configOffset + 1]
  const profileCompatibility = initSegment[configOffset + 2]
  const levelIndication = initSegment[configOffset + 3]
  
  // Format: avc1.XXYYZZ where XX=profile, YY=compatibility, ZZ=level
  return `avc1.${profileIndication.toString(16).padStart(2, '0')}${profileCompatibility.toString(16).padStart(2, '0')}${levelIndication.toString(16).padStart(2, '0')}`
}

// ftyp major_brand Fix (dash → isom)
function fixFtypForMSE(initSegment: Buffer): Buffer {
  if (initSegment.length < 12) return initSegment
  
  const boxType = initSegment.readUInt32BE(4)
  if (boxType !== 0x66747970) return initSegment // Not ftyp
  
  const majorBrand = initSegment.subarray(8, 12).toString('ascii')
  
  if (majorBrand === 'dash') {
    console.log('[ProtectLivestream] Fixing ftyp major_brand from "dash" to "isom" for MSE compatibility')
    const fixed = Buffer.from(initSegment)
    fixed.write('isom', 8, 4, 'ascii')
    return fixed
  }
  
  return initSegment
}

// Stream-Handler
livestream.on('message', (data: Buffer) => {
  session.dataCount++
  
  if (!session.foundInit) {
    session.pendingBuffer.push(data)
    const combined = Buffer.concat(session.pendingBuffer)
    
    const result = extractInitSegment(combined)
    if (result) {
      // Fix ftyp and cache
      session.initSegment = fixFtypForMSE(result.init)
      session.foundInit = true
      
      // Extract codec from fixed init segment
      const extractedCodec = extractCodecFromInit(session.initSegment)
      const codecToSend = extractedCodec || 'avc1.4d401f'
      
      // Send codec to all clients
      session.codecCallbacks.forEach(cb => cb(codecToSend))
      session.lastCodec = codecToSend
      
      // Send init segment to all clients
      session.clients.forEach(cb => {
        cb(session.initSegment!)
        session.initSegmentSent.add(cb)
      })
      
      // Send remaining data
      if (result.remaining.length > 0) {
        session.clients.forEach(cb => cb(result.remaining))
      }
      
      session.pendingBuffer = []
    }
  } else {
    // Normal streaming - send to all clients
    session.clients.forEach(cb => cb(data))
  }
})
```

### server/ws-proxy.ts (WebSocket Handler)

```typescript
livestreamWss.on('connection', async (clientWs: WebSocket, { userId, cameraId }) => {
  const manager = await ensureLivestreamManager()
  
  let codecSent = false
  
  const onCodec = (codec: string) => {
    if (clientWs.readyState === WebSocket.OPEN && !codecSent) {
      console.log(`[WS-Proxy] Sending codec to client for ${cameraId}:`, codec)
      clientWs.send(JSON.stringify({ type: 'codec', codec }))
      codecSent = true
    }
  }
  
  const onData = (data: Buffer) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data)  // Sends as binary frame
    }
  }
  
  const started = await manager.startStream(cameraId, onData, onCodec)
  if (started) {
    clientWs.send(JSON.stringify({ type: 'stream_started', cameraId }))
  }
})
```

## Relevanter Client-Code

### components/streaming/WebRTCPlayer.tsx

```typescript
'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

export default function WebRTCPlayer({ cameraId, autoPlay = true }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const mediaSourceRef = useRef<MediaSource | null>(null)
  const sourceBufferRef = useRef<SourceBuffer | null>(null)
  const bufferQueue = useRef<ArrayBuffer[]>([])
  const pendingCodec = useRef<string | null>(null)
  const sourceOpenReady = useRef(false)

  const processQueue = useCallback(() => {
    const sb = sourceBufferRef.current
    if (!sb || sb.updating || bufferQueue.current.length === 0) return
    
    const chunk = bufferQueue.current.shift()
    if (chunk) {
      try {
        sb.appendBuffer(chunk)  // <-- FEHLER TRITT HIER AUF
      } catch (e) {
        console.error('[LivestreamPlayer] appendBuffer error:', e)
      }
    }
  }, [])

  const tryInitializeSourceBuffer = useCallback(() => {
    const ms = mediaSourceRef.current
    const codec = pendingCodec.current
    
    if (!ms || !codec || !sourceOpenReady.current) return false
    if (ms.readyState !== 'open') return false
    if (sourceBufferRef.current) return true
    
    const mimeCodec = `video/mp4; codecs="${codec}"`
    
    if (!MediaSource.isTypeSupported(mimeCodec)) {
      console.error('Codec not supported:', mimeCodec)
      return false
    }
    
    try {
      const sb = ms.addSourceBuffer(mimeCodec)
      sourceBufferRef.current = sb
      sb.mode = 'segments'
      
      sb.addEventListener('updateend', processQueue)
      sb.addEventListener('error', (e) => {
        console.error('[LivestreamPlayer] SourceBuffer error:', e)
      })
      
      console.log('[LivestreamPlayer] SourceBuffer created successfully!')
      
      // Flush queued chunks
      if (bufferQueue.current.length > 0) {
        processQueue()
      }
      
      return true
    } catch (e) {
      console.error('Failed to add source buffer:', e)
      return false
    }
  }, [processQueue])

  const startStreaming = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws/livestream/${encodeURIComponent(cameraId)}`
    
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws
    ws.binaryType = 'arraybuffer'
    
    const mediaSource = new MediaSource()
    mediaSourceRef.current = mediaSource
    videoRef.current.src = URL.createObjectURL(mediaSource)
    
    mediaSource.addEventListener('sourceopen', () => {
      sourceOpenReady.current = true
      tryInitializeSourceBuffer()
    })
    
    mediaSource.addEventListener('sourceended', () => {
      console.log('[LivestreamPlayer] MediaSource ended')
    })
    
    mediaSource.addEventListener('sourceclose', () => {
      console.log('[LivestreamPlayer] MediaSource closed')
    })
    
    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const msg = JSON.parse(event.data)
        
        if (msg.type === 'codec') {
          pendingCodec.current = msg.codec
          tryInitializeSourceBuffer()
        }
      } else if (event.data instanceof ArrayBuffer) {
        bufferQueue.current.push(event.data)
        
        if (sourceBufferRef.current && !sourceBufferRef.current.updating) {
          processQueue()
        }
      }
    }
  }

  useEffect(() => {
    if (autoPlay) startStreaming()
    return cleanup
  }, [autoPlay, cameraId])

  return (
    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full" />
  )
}
```

## Meine Hypothesen

### 1. HEVC statt H.264?

Die `compatible_brands` enthalten `hvc1` (HEVC):
```
compatible_brands: iso6, hvc1, avc1, mp41
```

Aber ich finde eine `avcC` Box im Init-Segment, was auf H.264 hindeutet. 

**Frage**: Kann das Init-Segment gemischte Signalisierung haben? Oder ist die `avcC` Box falsch interpretiert?

### 2. moov-Struktur unvollständig?

In meinen Logs sehe ich nur:
```
moov [1149 bytes]
  mvex [72 bytes]
```

Aber nicht die erwarteten Boxen wie `trak/mdia/minf/stbl/stsd`. Diese sollten den tatsächlichen Codec definieren.

**Frage**: Fehlen wichtige Boxen? Oder ist mein Logging unvollständig?

### 3. Codec-String-Format falsch?

Ich sende `avc1.640020`:
- `64` = Profile 100 (High Profile)
- `00` = Compatibility 0
- `20` = Level 32 (Level 3.2)

**Frage**: Sollte der Compatibility-Byte anders sein? z.B. `avc1.64001f`?

### 4. Init-Segment-Struktur für MSE ungültig?

Das UniFi Protect fMP4 könnte nicht MSE-kompatibel sein. Mögliche Probleme:
- Fehlende oder falsche `mvhd` Box
- `trex` Box in `mvex` nicht korrekt
- Sample Entry Type nicht `avc1`

### 5. Binary-Übertragung Problem?

Server sendet Node.js `Buffer`, Client empfängt `ArrayBuffer`. 

**Frage**: Könnte hier etwas verloren gehen oder transformiert werden?

## Was ich bereits versucht habe

- ✅ `major_brand` von `dash` zu `isom` geändert → gleiches Ergebnis
- ✅ Codec erst nach Init-Segment-Extraktion senden (nicht vorher raten)
- ✅ `MediaSource.isTypeSupported()` prüfen → gibt `true`
- ✅ `sb.mode = 'segments'` gesetzt
- ✅ `appendBuffer` nur wenn `!sb.updating`
- ✅ `mvex` Box ist vorhanden (erforderlich für fMP4)
- ✅ Verschiedene Browser getestet (Safari, Edge, Android WebView) → alle gleich

## Init-Segment Hex-Dump

**Bitte führe folgenden Befehl aus und füge die Ausgabe hier ein:**

```bash
docker compose logs -f app 2>&1 | grep -A 50 "HEX DUMP"
```

*Platzhalter für Hex-Dump - wird nach Ausführung eingefügt*

## Vollständige Box-Struktur

**Bitte führe folgenden Befehl aus und füge die Ausgabe hier ein:**

```bash
docker compose logs -f app 2>&1 | grep -E "Init segment structure|^\s+(ftyp|moov|trak|mdia|minf|stbl|stsd|mvex|mvhd|tkhd|mdhd|hdlr|sample_entry)"
```

*Platzhalter für vollständige Struktur - wird nach Ausführung eingefügt*

## Fragen

1. **Ist das Init-Segment valide für MSE?** Was genau prüft der Browser beim ersten `appendBuffer`?

2. **Wie kann ich definitiv feststellen, ob der Stream HEVC oder H.264 ist?** Welche Box ist ausschlaggebend: `avc1` vs `hvc1` in `stsd`?

3. **Muss ich das Init-Segment transformieren?** z.B. mit `mp4box.js`, `mux.js`, oder ähnlichem?

4. **Gibt es bekannte Inkompatibilitäten mit UniFi Protect fMP4 und Browser MSE?**

5. **Welche Tools kann ich verwenden, um das Init-Segment offline zu analysieren?**
   - Bento4 `mp4info` / `mp4dump`
   - https://nicholasalin.github.io/boxinspect/
   - https://nicholasalin.github.io/ffprobe-wasm/
   - https://nicholasalin.github.io/mse-player/

6. **Sollte ich den UniFi Protect Stream in einen anderen Kanal (Channel 0 statt 1) umschalten?** Vielleicht ist Kanal 0 (High Quality) ein anderer Codec?

## Gewünschte Hilfe

1. **Root-Cause-Analyse** des SourceBuffer-Fehlers
2. **Konkrete Diagnose-Schritte** oder Tools
3. **Falls nötig**: Code zur Transformation des Init-Segments für MSE-Kompatibilität
4. **Alternative Ansätze** falls MSE nicht funktioniert (z.B. HLS, WebRTC, transcoding)

## Zusätzliche Informationen

- UniFi Protect Version: Aktuell (Januar 2025)
- unifi-protect npm Version: Latest
- Next.js Version: 14.2.3
- Node.js Version: 20.x
- Docker auf Mac Mini M4

## Referenzen

- [unifi-protect npm](https://www.npmjs.com/package/unifi-protect)
- [MDN MediaSource API](https://developer.mozilla.org/en-US/docs/Web/API/MediaSource)
- [MDN SourceBuffer](https://developer.mozilla.org/en-US/docs/Web/API/SourceBuffer)
- [ISO BMFF / MP4 Box Struktur](https://www.cimarronsystems.com/wp-content/uploads/2017/04/Elements-of-the-H.264-VideoAAC-Audio-MP4-Movie-v2_0.pdf)
