'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Loader2, Play, AlertCircle, Video } from 'lucide-react'

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
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [go2rtcUrl, setGo2rtcUrl] = useState<string | null>(null)

  const startStreaming = useCallback(async () => {
    if (!go2rtcUrl || !videoRef.current) return

    setStatus('connecting')
    setError(null)

    try {
      if (pcRef.current) {
        pcRef.current.close()
      }

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })
      pcRef.current = pc

      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0]
        }
      }

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected') {
          setStatus('connected')
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          setStatus('error')
          setError('Connection lost')
        }
      }

      pc.addTransceiver('video', { direction: 'recvonly' })
      pc.addTransceiver('audio', { direction: 'recvonly' })

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const response = await fetch(`${go2rtcUrl}/api/webrtc?src=${encodeURIComponent(cameraId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp
      })

      if (!response.ok) {
        throw new Error(`WebRTC handshake failed: ${response.status}`)
      }

      const answerSdp = await response.text()
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp
      })

    } catch (err) {
      console.error('WebRTC error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect'
      setError(errorMessage)
      setStatus('error')
      onError?.(errorMessage)
    }
  }, [go2rtcUrl, cameraId, onError])

  useEffect(() => {
    const initStreaming = async () => {
      try {
        const statusRes = await fetch('/api/streaming/status')
        const statusData = await statusRes.json()

        if (!statusData.liveStreamEnabled) {
          setError('Live streaming is not enabled')
          setStatus('error')
          return
        }

        if (!statusData.running) {
          const startRes = await fetch('/api/streaming/start', { method: 'POST' })
          const startData = await startRes.json()
          
          if (!startRes.ok || !startData.success) {
            console.error('[WebRTCPlayer] Failed to start go2rtc:', startData.error)
            setError(startData.error || 'Failed to start go2rtc')
            setStatus('error')
            return
          }
          
          setGo2rtcUrl(startData.apiUrl)
        } else {
          setGo2rtcUrl(statusData.apiUrl)
        }
      } catch (err) {
        console.error('Failed to initialize streaming:', err)
        setError('Failed to initialize streaming')
        setStatus('error')
      }
    }

    initStreaming()

    return () => {
      if (pcRef.current) {
        pcRef.current.close()
        pcRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (go2rtcUrl && autoPlay) {
      startStreaming()
    }
  }, [go2rtcUrl, autoPlay, startStreaming])

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
