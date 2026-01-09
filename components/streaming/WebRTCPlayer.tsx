'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, AlertCircle, Video } from 'lucide-react'

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
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const initSegmentReceived = useRef(false)

  const cleanup = useCallback(() => {
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
    initSegmentReceived.current = false
  }, [])

  const appendBuffer = useCallback((data: ArrayBuffer) => {
    const sb = sourceBufferRef.current
    if (!sb) return
    
    bufferQueue.current.push(data)
    
    const processQueue = () => {
      if (!sb || sb.updating || bufferQueue.current.length === 0) return
      const chunk = bufferQueue.current.shift()
      if (chunk) {
        try {
          sb.appendBuffer(chunk)
        } catch (e) {
          console.error('[LivestreamPlayer] appendBuffer error:', e)
        }
      }
    }
    
    if (!sb.updating) {
      processQueue()
    }
    
    sb.onupdateend = processQueue
  }, [])

  const initializeMediaSource = useCallback((codec: string) => {
    if (!videoRef.current || !mediaSourceRef.current) return false
    
    const mimeCodec = codec || 'video/mp4; codecs="avc1.640028"'
    console.log('[LivestreamPlayer] Initializing with codec:', mimeCodec)
    
    if (!MediaSource.isTypeSupported(mimeCodec)) {
      console.error('[LivestreamPlayer] Codec not supported:', mimeCodec)
      setError('Video codec not supported by browser')
      setStatus('error')
      return false
    }
    
    try {
      const sb = mediaSourceRef.current.addSourceBuffer(mimeCodec)
      sourceBufferRef.current = sb
      sb.mode = 'segments'
      return true
    } catch (e) {
      console.error('[LivestreamPlayer] Failed to add source buffer:', e)
      setError('Failed to initialize video player')
      setStatus('error')
      return false
    }
  }, [])

  const startStreaming = useCallback(async () => {
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
      
      let sourceBufferReady = false
      
      mediaSource.addEventListener('sourceopen', () => {
        console.log('[LivestreamPlayer] MediaSource opened')
      })
      
      ws.onopen = () => {
        console.log('[LivestreamPlayer] WebSocket connected')
      }
      
      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data)
            console.log('[LivestreamPlayer] Received message:', msg.type)
            
            if (msg.type === 'stream_started') {
              console.log('[LivestreamPlayer] Stream started for camera:', msg.cameraId)
            } else if (msg.type === 'codec') {
              console.log('[LivestreamPlayer] Received codec info:', msg.codec)
              if (mediaSourceRef.current?.readyState === 'open' && !sourceBufferReady) {
                sourceBufferReady = initializeMediaSource(msg.codec)
                if (sourceBufferReady) {
                  setStatus('connected')
                }
              }
            } else if (msg.type === 'error') {
              console.error('[LivestreamPlayer] Server error:', msg.message)
              setError(msg.message)
              setStatus('error')
            }
          } catch (e) {
            console.error('[LivestreamPlayer] JSON parse error:', e)
          }
        } else if (event.data instanceof ArrayBuffer) {
          if (!sourceBufferReady && mediaSourceRef.current?.readyState === 'open') {
            sourceBufferReady = initializeMediaSource('video/mp4; codecs="avc1.640028"')
            if (sourceBufferReady) {
              setStatus('connected')
            }
          }
          
          if (sourceBufferReady) {
            appendBuffer(event.data)
          }
        }
      }
      
      ws.onerror = (e) => {
        console.error('[LivestreamPlayer] WebSocket error:', e)
        setError('Connection error')
        setStatus('error')
      }
      
      ws.onclose = (e) => {
        console.log('[LivestreamPlayer] WebSocket closed:', e.code, e.reason)
        if (status !== 'error') {
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
  }, [cameraId, onError, cleanup, appendBuffer, initializeMediaSource, status])

  useEffect(() => {
    if (autoPlay) {
      console.log('[LivestreamPlayer] Starting streaming for camera:', cameraId)
      startStreaming()
    }

    return cleanup
  }, [autoPlay, cameraId, cleanup, startStreaming])

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ display: status === 'connected' ? 'block' : 'none' }}
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
      
      {status === 'connected' && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-green-500/80 rounded text-white text-xs">
          <Video className="w-3 h-3" />
          LIVE
        </div>
      )}
    </div>
  )
}
