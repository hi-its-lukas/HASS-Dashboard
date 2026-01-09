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
  const [streamReady, setStreamReady] = useState(false)

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
          console.error('[MSEPlayer] appendBuffer error:', e)
        }
      }
    }
    
    if (!sb.updating) {
      processQueue()
    }
    
    sb.onupdateend = processQueue
  }, [])

  const startStreaming = useCallback(async () => {
    if (!videoRef.current) return

    cleanup()
    setStatus('connecting')
    setError(null)

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/streaming/mse?src=${encodeURIComponent(cameraId)}`
      
      console.log('[MSEPlayer] Connecting to:', wsUrl)
      
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      ws.binaryType = 'arraybuffer'
      
      const mediaSource = new MediaSource()
      mediaSourceRef.current = mediaSource
      videoRef.current.src = URL.createObjectURL(mediaSource)
      
      ws.onopen = () => {
        console.log('[MSEPlayer] WebSocket connected')
      }
      
      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === 'mse') {
              const mimeCodec = msg.value
              console.log('[MSEPlayer] Received codec:', mimeCodec)
              
              if (mediaSourceRef.current?.readyState === 'open') {
                if (MediaSource.isTypeSupported(mimeCodec)) {
                  const sb = mediaSourceRef.current.addSourceBuffer(mimeCodec)
                  sourceBufferRef.current = sb
                  setStatus('connected')
                } else {
                  console.error('[MSEPlayer] Codec not supported:', mimeCodec)
                  setError('Video codec not supported')
                  setStatus('error')
                }
              } else {
                mediaSourceRef.current?.addEventListener('sourceopen', () => {
                  if (MediaSource.isTypeSupported(mimeCodec) && mediaSourceRef.current) {
                    const sb = mediaSourceRef.current.addSourceBuffer(mimeCodec)
                    sourceBufferRef.current = sb
                    setStatus('connected')
                  }
                })
              }
            }
          } catch (e) {
            console.error('[MSEPlayer] JSON parse error:', e)
          }
        } else if (event.data instanceof ArrayBuffer) {
          appendBuffer(event.data)
        }
      }
      
      ws.onerror = (e) => {
        console.error('[MSEPlayer] WebSocket error:', e)
        setError('Connection error')
        setStatus('error')
      }
      
      ws.onclose = (e) => {
        console.log('[MSEPlayer] WebSocket closed:', e.code, e.reason)
        if (status !== 'error') {
          setError('Stream disconnected')
          setStatus('error')
        }
      }

    } catch (err) {
      console.error('[MSEPlayer] Error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect'
      setError(errorMessage)
      setStatus('error')
      onError?.(errorMessage)
    }
  }, [cameraId, onError, cleanup, appendBuffer, status])

  useEffect(() => {
    const initStreaming = async () => {
      console.log('[MSEPlayer] Initializing for camera:', cameraId)
      try {
        const statusRes = await fetch('/api/streaming/status')
        const statusData = await statusRes.json()
        console.log('[MSEPlayer] Status:', statusData)

        if (!statusData.liveStreamEnabled) {
          console.log('[MSEPlayer] Live streaming not enabled')
          setError('Live streaming is not enabled')
          setStatus('error')
          return
        }

        if (!statusData.running) {
          console.log('[MSEPlayer] go2rtc not running, starting...')
          const startRes = await fetch('/api/streaming/start', { method: 'POST' })
          const startData = await startRes.json()
          console.log('[MSEPlayer] Start response:', startData)
          
          if (!startRes.ok || !startData.success) {
            console.error('[MSEPlayer] Failed to start go2rtc:', startData.error)
            setError(startData.error || 'Failed to start go2rtc')
            setStatus('error')
            return
          }
        }
        
        console.log('[MSEPlayer] Stream ready, setting flag')
        setStreamReady(true)
      } catch (err) {
        console.error('[MSEPlayer] Failed to initialize streaming:', err)
        setError('Failed to initialize streaming')
        setStatus('error')
      }
    }

    initStreaming()

    return cleanup
  }, [cleanup, cameraId])

  useEffect(() => {
    console.log('[MSEPlayer] Effect check - streamReady:', streamReady, 'autoPlay:', autoPlay)
    if (streamReady && autoPlay) {
      console.log('[MSEPlayer] Starting streaming...')
      startStreaming()
    }
  }, [streamReady, autoPlay, startStreaming])

  if (status === 'error') {
    return (
      <div className={`flex flex-col items-center justify-center bg-black/50 ${className}`}>
        <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
        <p className="text-red-400 text-sm text-center px-4">{error}</p>
        <button
          onClick={startStreaming}
          className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (status === 'idle' || status === 'connecting') {
    return (
      <div className={`flex flex-col items-center justify-center bg-black/50 ${className}`}>
        <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
        <p className="text-white/70 text-sm">
          {status === 'idle' ? 'Initializing...' : 'Connecting...'}
        </p>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-green-500/80 rounded text-white text-xs">
        <Video className="w-3 h-3" />
        LIVE
      </div>
    </div>
  )
}
