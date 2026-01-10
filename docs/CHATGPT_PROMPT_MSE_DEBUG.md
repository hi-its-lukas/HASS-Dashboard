# MSE Livestream Debug - Modal Black Screen Issue

## Problem Summary
UniFi Protect camera livestreaming works for **thumbnail views** (first client to connect) but shows **black screen in modal** (second client joining existing session).

## Architecture

### Server-Side (Node.js)
- **ws-proxy.ts**: WebSocket server on port 6000, proxies livestream data
- **protect-livestream.ts**: Uses `unifi-protect` library for native fMP4 streaming
- Sessions are shared between multiple clients viewing the same camera

### Client-Side (React/Next.js)
- **WebRTCPlayer.tsx**: MSE (Media Source Extensions) player
- Uses `MediaSource` API with `SourceBuffer` for fMP4 playback

## Data Flow

### First Client (Thumbnail) - WORKS
1. Client connects WebSocket to `/ws/livestream/{cameraId}`
2. Server starts new `ProtectLivestream` for camera
3. Server extracts codec from init segment, sends to client
4. Server sends init segment (ftyp+moov) to client
5. Server sends moof+mdat chunks continuously
6. Client creates SourceBuffer, appends data, video plays

### Second Client (Modal) - FAILS
1. Client connects WebSocket to `/ws/livestream/{cameraId}`
2. Server finds existing session, reuses it
3. Server sends cached codec immediately
4. Server waits 100ms (for client to create SourceBuffer)
5. Server sends cached init segment
6. Server adds client to receive moof chunks
7. **Client video stays black**

## Current Code

### protect-livestream.ts (Session Reuse)
```typescript
const existingSession = this.sessions.get(cameraId)
if (existingSession) {
  // DON'T add to clients yet - wait until init segment is sent
  if (onCodec) {
    existingSession.codecCallbacks.add(onCodec)
    if (existingSession.lastCodec) {
      onCodec(existingSession.lastCodec) // Send codec immediately
    }
  }
  
  if (existingSession.initSegment && existingSession.foundInit) {
    const initSegmentCopy = Buffer.from(existingSession.initSegment)
    setTimeout(() => {
      onData(initSegmentCopy) // Send init segment
      existingSession.initSegmentSent.add(onData)
      existingSession.clients.add(onData) // THEN add to receive moof
    }, 100)
  }
  return true
}
```

### WebRTCPlayer.tsx (Client)
```typescript
// When codec message received
if (msg.type === 'codec') {
  pendingCodec.current = msg.codec
  tryInitializeSourceBuffer()
}

// MediaSource sourceopen handler
mediaSource.addEventListener('sourceopen', () => {
  sourceOpenReady.current = true
  tryInitializeSourceBuffer()
})

// Initialize SourceBuffer
const tryInitializeSourceBuffer = () => {
  if (!ms || !codec || !sourceOpenReady.current) return false
  if (ms.readyState !== 'open') return false
  if (sourceBufferRef.current) return true // Already exists
  
  const sb = ms.addSourceBuffer(`video/mp4; codecs="${codec}"`)
  // ... setup event handlers
  
  // Flush queued chunks
  if (bufferQueue.current.length > 0) {
    processQueue()
  }
}

// Binary data handler
if (event.data instanceof ArrayBuffer) {
  appendBuffer(event.data) // Queues data if SourceBuffer not ready
}
```

## What We've Tried
1. Sending init segment immediately - fails (SourceBuffer not ready)
2. 100ms delay before sending init segment - still fails
3. Sending codec before init segment - still fails
4. Adding client to moof list AFTER init segment - still fails

## Debug Observations

### Thumbnail (works)
- WebSocket connects
- MediaSource opens
- Codec received, SourceBuffer created
- Init segment received, appended
- moof chunks received, appended
- Video plays with `buffered ranges: 0.00-X.XXs`

### Modal (fails)
- WebSocket connects
- MediaSource opens
- Codec received, SourceBuffer created
- Init segment received, appended
- moof chunks received, appended
- **Video stays black, `buffered ranges: none` or very small**

## Questions

1. Why does the same init segment work for thumbnail but not modal?
2. Is there a timing issue with MSE when reusing the same codec/init?
3. Could the cached init segment be corrupted or incompatible?
4. Is there something special about joining a live fMP4 stream mid-session?

## fMP4 Structure
- **ftyp**: File type box (part of init)
- **moov**: Movie box with track info (part of init)
- **moof**: Movie fragment header (each fragment)
- **mdat**: Media data (each fragment)

The init segment (ftyp+moov) must be sent before any moof+mdat.

## Environment
- Next.js 14 with TypeScript
- `unifi-protect` library for camera streaming
- Safari (iPhone), Edge (Mac), Fully Kiosk (Android)
- Cloudflare Tunnel for HTTPS

## Key Insight Needed
Why does appending the same init segment + moof chunks work for the first client but produce a black screen for the second client joining the same stream?

---

## Full Code Files

### WebRTCPlayer.tsx (Client-Side MSE Player)
```tsx
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'

interface WebRTCPlayerProps {
  cameraId: string
  className?: string
  autoPlay?: boolean
  onError?: (error: string) => void
}

export default function WebRTCPlayer({ 
  cameraId, 
  className = '',
  autoPlay = true,
  onError 
}: WebRTCPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const mediaSourceRef = useRef<MediaSource | null>(null)
  const sourceBufferRef = useRef<SourceBuffer | null>(null)
  const bufferQueue = useRef<ArrayBuffer[]>([])
  const pendingCodec = useRef<string | null>(null)
  const sourceOpenReady = useRef(false)
  const isConnectedRef = useRef(false)
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const cleanup = useCallback(() => {
    isConnectedRef.current = false
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (mediaSourceRef.current && mediaSourceRef.current.readyState === 'open') {
      try {
        mediaSourceRef.current.endOfStream()
      } catch (e) {}
    }
    mediaSourceRef.current = null
    sourceBufferRef.current = null
    bufferQueue.current = []
    pendingCodec.current = null
    sourceOpenReady.current = false
    appendedCount.current = 0
  }, [])

  const appendedCount = useRef(0)
  
  const processQueue = useCallback(() => {
    const sb = sourceBufferRef.current
    if (!sb || sb.updating || bufferQueue.current.length === 0) return
    
    const chunk = bufferQueue.current.shift()
    if (chunk) {
      try {
        sb.appendBuffer(chunk)
        appendedCount.current++
      } catch (e) {
        console.error('[LivestreamPlayer] appendBuffer error:', e)
      }
    }
  }, [])

  const appendBuffer = useCallback((data: ArrayBuffer) => {
    bufferQueue.current.push(data)
    const sb = sourceBufferRef.current
    if (sb && !sb.updating) {
      processQueue()
    }
  }, [processQueue])

  const tryInitializeSourceBuffer = useCallback(() => {
    const ms = mediaSourceRef.current
    const codec = pendingCodec.current
    
    if (!ms || !codec || !sourceOpenReady.current) return false
    if (ms.readyState !== 'open') return false
    if (sourceBufferRef.current) return true
    
    let mimeCodec = `video/mp4; codecs="${codec}"`
    
    if (!MediaSource.isTypeSupported(mimeCodec)) {
      const videoCodec = codec.split(',')[0].trim()
      mimeCodec = `video/mp4; codecs="${videoCodec}"`
    }
    
    try {
      const sb = ms.addSourceBuffer(mimeCodec)
      sourceBufferRef.current = sb
      sb.mode = 'segments'
      
      sb.addEventListener('updateend', () => {
        processQueue()
        
        if (videoRef.current && sb.buffered.length > 0 && videoRef.current.paused) {
          const bufferedEnd = sb.buffered.end(0)
          if (bufferedEnd > 0.1) {
            videoRef.current.play().catch(e => {})
          }
        }
      })
      
      isConnectedRef.current = true
      setStatus('connected')
      
      if (bufferQueue.current.length > 0) {
        processQueue()
      }
      
      return true
    } catch (e) {
      setError('Failed to initialize video player')
      setStatus('error')
      return false
    }
  }, [processQueue])

  startStreamingRef.current = () => {
    if (!videoRef.current) return

    cleanup()
    setStatus('connecting')

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
    
    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const msg = JSON.parse(event.data)
        if (msg.type === 'codec') {
          pendingCodec.current = msg.codec
          tryInitializeSourceBuffer()
        }
      } else if (event.data instanceof ArrayBuffer) {
        appendBuffer(event.data)
      }
    }
  }

  useEffect(() => {
    if (autoPlay) startStreaming()
    return cleanup
  }, [autoPlay, cameraId, cleanup, startStreaming])

  return (
    <div className={`relative bg-black ${className}`}>
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
    </div>
  )
}
```

### protect-livestream.ts (Server-Side Session Management - Key Section)
```typescript
async startStream(
  cameraId: string, 
  onData: (data: Buffer) => void,
  onCodec?: (codec: string) => void
): Promise<boolean> {
  const existingSession = this.sessions.get(cameraId)
  if (existingSession) {
    console.log('[ProtectLivestream] Reusing existing stream - adding client')
    
    // DON'T add to clients yet - wait until init segment is sent
    if (onCodec) {
      existingSession.codecCallbacks.add(onCodec)
      if (existingSession.lastCodec) {
        console.log('[ProtectLivestream] Sending cached codec:', existingSession.lastCodec)
        onCodec(existingSession.lastCodec)
      }
    }
    
    // Send cached init segment with delay, then add to clients for moof data
    if (existingSession.initSegment && existingSession.foundInit) {
      const initSegmentCopy = Buffer.from(existingSession.initSegment)
      setTimeout(() => {
        try {
          // First send init segment
          onData(initSegmentCopy)
          existingSession.initSegmentSent.add(onData)
          // THEN add to clients to receive moof data
          existingSession.clients.add(onData)
        } catch (e) {
          console.error('[ProtectLivestream] Error sending init segment:', e)
        }
      }, 100) // 100ms delay for client to initialize SourceBuffer
    } else {
      existingSession.clients.add(onData)
    }
    
    return true
  }
  
  // ... start new stream for first client
}
```

### ws-proxy.ts (WebSocket Proxy - Key Section)
```typescript
const onCodec = (codec: string) => {
  if (clientWs.readyState === WebSocket.OPEN && !codecSent) {
    clientWs.send(JSON.stringify({ type: 'codec', codec }))
    codecSent = true
  }
}

const onData = (data: Buffer) => {
  if (clientWs.readyState === WebSocket.OPEN) {
    clientWs.send(data)
  }
}

const started = await manager.startStream(cameraId, onData, onCodec)
```

---

## Specific Question for ChatGPT/Gemini

The modal (second client) receives:
1. Codec message (immediately)
2. Init segment ftyp+moov (after 100ms delay)
3. moof+mdat chunks (after init segment sent)

But the video stays black. The thumbnail (first client) works perfectly with the same data flow.

**What could cause the second client to fail even though:**
- The SourceBuffer is created with the same codec
- The same init segment (ftyp+moov) is appended
- moof chunks are appended after the init segment

## Hypothesis: Keyframe Problem

In fMP4/fragmented MP4:
- Video is encoded with I-frames (keyframes) and P/B-frames (dependent frames)
- P/B-frames depend on previous frames to decode
- First client gets stream from start: init → keyframe → P-frames → keyframe → ...
- Second client joins mid-stream: init → P-frames (no keyframe!) → ...

**If the second client starts receiving data between keyframes, the decoder cannot render any frames until the next keyframe arrives.**

### Questions:
1. How can we detect keyframes in moof chunks to start new clients at a keyframe boundary?
2. Should we cache the last keyframe moof+mdat and replay it to new clients?
3. Is there a way to tell MSE/SourceBuffer to wait for a keyframe?
4. Does `unifi-protect` library provide keyframe detection or segment boundaries?
