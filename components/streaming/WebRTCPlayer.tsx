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
    console.log('[LivestreamPlayer] Cleanup called')
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
        
        // Log first 10 appends and every 50th after
        if (appendedCount.current <= 10 || appendedCount.current % 50 === 0) {
          const bytes = new Uint8Array(chunk)
          const boxType = bytes.length >= 8 ? 
            String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]) : 'unknown'
          console.log('[LivestreamPlayer] appendBuffer #' + appendedCount.current + 
            ' - size:', chunk.byteLength, 
            '- box:', boxType,
            '- buffered ranges:', sb.buffered.length > 0 ? 
              `${sb.buffered.start(0).toFixed(2)}-${sb.buffered.end(0).toFixed(2)}s` : 'none')
        }
      } catch (e) {
        console.error('[LivestreamPlayer] appendBuffer error:', e, '- chunk size:', chunk.byteLength)
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
    
    console.log('[LivestreamPlayer] tryInitializeSourceBuffer - codec:', codec, 'sourceOpenReady:', sourceOpenReady.current, 'readyState:', ms?.readyState)
    
    if (!ms || !codec || !sourceOpenReady.current) {
      return false
    }
    
    if (ms.readyState !== 'open') {
      console.log('[LivestreamPlayer] MediaSource not open yet, waiting...')
      return false
    }
    
    if (sourceBufferRef.current) {
      console.log('[LivestreamPlayer] SourceBuffer already exists')
      return true
    }
    
    // Format codec for MSE
    let mimeCodec = `video/mp4; codecs="${codec}"`
    
    console.log('[LivestreamPlayer] Checking codec support:', mimeCodec)
    
    if (!MediaSource.isTypeSupported(mimeCodec)) {
      console.warn('[LivestreamPlayer] Full codec not supported, trying video-only')
      // Try video-only (remove audio codec)
      const videoCodec = codec.split(',')[0].trim()
      mimeCodec = `video/mp4; codecs="${videoCodec}"`
      
      if (!MediaSource.isTypeSupported(mimeCodec)) {
        console.error('[LivestreamPlayer] Video codec not supported:', mimeCodec)
        setError('Video codec not supported by browser')
        setStatus('error')
        return false
      }
    }
    
    try {
      console.log('[LivestreamPlayer] Creating SourceBuffer with:', mimeCodec)
      const sb = ms.addSourceBuffer(mimeCodec)
      sourceBufferRef.current = sb
      sb.mode = 'segments'
      
      sb.addEventListener('updateend', () => {
        processQueue()
      })
      
      sb.addEventListener('error', (e) => {
        console.error('[LivestreamPlayer] SourceBuffer error:', e)
      })
      
      console.log('[LivestreamPlayer] SourceBuffer created successfully!')
      isConnectedRef.current = true
      setStatus('connected')
      
      // Flush any queued chunks
      if (bufferQueue.current.length > 0) {
        console.log('[LivestreamPlayer] Flushing', bufferQueue.current.length, 'queued chunks')
        processQueue()
      }
      
      return true
    } catch (e) {
      console.error('[LivestreamPlayer] Failed to add source buffer:', e)
      setError('Failed to initialize video player')
      setStatus('error')
      return false
    }
  }, [processQueue])

  // Use a ref for startStreaming to avoid dependency issues
  const startStreamingRef = useRef<() => void>()
  
  startStreamingRef.current = () => {
    if (!videoRef.current) return

    cleanup()
    setStatus('connecting')
    setError(null)

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/ws/livestream/${encodeURIComponent(cameraId)}`
      
      console.log('[LivestreamPlayer] Connecting to:', wsUrl)
      
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      ws.binaryType = 'arraybuffer'
      
      const mediaSource = new MediaSource()
      mediaSourceRef.current = mediaSource
      videoRef.current.src = URL.createObjectURL(mediaSource)
      
      mediaSource.addEventListener('sourceopen', () => {
        console.log('[LivestreamPlayer] MediaSource opened, readyState:', mediaSource.readyState)
        sourceOpenReady.current = true
        tryInitializeSourceBuffer()
      })
      
      mediaSource.addEventListener('sourceclose', () => {
        console.log('[LivestreamPlayer] MediaSource closed')
      })
      
      mediaSource.addEventListener('sourceended', () => {
        console.log('[LivestreamPlayer] MediaSource ended')
      })
      
      ws.onopen = () => {
        console.log('[LivestreamPlayer] WebSocket connected')
      }
      
      let binaryChunkCount = 0
      
      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data)
            console.log('[LivestreamPlayer] Received message:', msg.type, msg.codec || '')
            
            if (msg.type === 'stream_started') {
              console.log('[LivestreamPlayer] Stream started for camera:', msg.cameraId)
            } else if (msg.type === 'codec') {
              console.log('[LivestreamPlayer] Received codec info:', msg.codec)
              pendingCodec.current = msg.codec
              tryInitializeSourceBuffer()
            } else if (msg.type === 'error') {
              console.error('[LivestreamPlayer] Server error:', msg.message)
              setError(msg.message)
              setStatus('error')
            }
          } catch (e) {
            console.error('[LivestreamPlayer] JSON parse error:', e)
          }
        } else if (event.data instanceof ArrayBuffer) {
          binaryChunkCount++
          const bytes = new Uint8Array(event.data)
          
          // Log first 10 chunks and every 100th after
          if (binaryChunkCount <= 10 || binaryChunkCount % 100 === 0) {
            const boxType = bytes.length >= 8 ? 
              String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]) : 'unknown'
            console.log('[LivestreamPlayer] Binary chunk #' + binaryChunkCount + 
              ' - size:', bytes.length, 
              '- box:', boxType,
              '- sourceBuffer ready:', !!sourceBufferRef.current,
              '- queue length:', bufferQueue.current.length)
          }
          
          // Check if this is an init segment (starts with ftyp)
          if (bytes.length >= 8 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
            console.log('[LivestreamPlayer] INIT SEGMENT received! Size:', bytes.length)
          }
          
          appendBuffer(event.data)
        }
      }
      
      ws.onerror = (e) => {
        console.error('[LivestreamPlayer] WebSocket error:', e)
        if (!isConnectedRef.current) {
          setError('Connection error')
          setStatus('error')
        }
      }
      
      ws.onclose = (e) => {
        console.log('[LivestreamPlayer] WebSocket closed:', e.code, e.reason)
        if (!isConnectedRef.current) {
          setError('Stream disconnected')
          setStatus('error')
        }
      }

    } catch (err) {
      console.error('[LivestreamPlayer] Error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect'
      setError(errorMessage)
      setStatus('error')
      onError?.(errorMessage)
    }
  }

  const startStreaming = useCallback(() => {
    startStreamingRef.current?.()
  }, [])

  useEffect(() => {
    if (autoPlay) {
      console.log('[LivestreamPlayer] Starting streaming for camera:', cameraId)
      startStreaming()
    }

    return cleanup
  }, [autoPlay, cameraId, cleanup, startStreaming])

  return (
    <div className={`relative bg-black ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover bg-black"
      />
      
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
          <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
          <p className="text-red-400 text-sm text-center px-4">{error}</p>
          <button
            onClick={startStreaming}
            className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}
      
      {(status === 'idle' || status === 'connecting') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
          <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
          <p className="text-white/70 text-sm">
            {status === 'idle' ? 'Initializing...' : 'Connecting...'}
          </p>
        </div>
      )}
    </div>
  )
}
