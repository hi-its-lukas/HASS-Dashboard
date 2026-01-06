'use client'

import { useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Video, Mic, DoorOpen, Loader2, RefreshCw, MessageCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useHAStore } from '@/lib/ha'
import { useConfig } from '@/lib/config/store'

const QUICK_REPLIES = [
  { label: 'Bin gleich da', message: 'Ich bin gleich da, einen Moment bitte.' },
  { label: 'Paket ablegen', message: 'Bitte legen Sie das Paket vor der Tür ab. Vielen Dank!' },
  { label: 'Kein Interesse', message: 'Nein danke, ich habe kein Interesse.' },
  { label: 'Klingel defekt', message: 'Die Klingel ist defekt. Bitte rufen Sie an.' },
]

export default function IntercomPage() {
  const params = useParams()
  const slug = params.slug as string
  const config = useConfig()
  const states = useHAStore((s) => s.states)
  const callService = useHAStore((s) => s.callService)
  const imgRef = useRef<HTMLImageElement>(null)
  
  const [unlocking, setUnlocking] = useState(false)
  const [streamKey, setStreamKey] = useState(Date.now())
  const [sendingReply, setSendingReply] = useState<string | null>(null)
  
  const intercom = config.intercoms?.find((i) => i.slug === slug)
  
  const refreshStream = () => {
    setStreamKey(Date.now())
  }
  
  if (!intercom) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Video className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-text-secondary">Intercom nicht gefunden</p>
          <a href="/" className="text-accent-cyan hover:underline text-sm mt-2 inline-block">
            Zurück zum Dashboard
          </a>
        </div>
      </div>
    )
  }
  
  const handleSpeak = () => {
    if (intercom.speakUrl) {
      window.open(intercom.speakUrl, '_blank')
    }
  }
  
  const handleUnlock = async () => {
    if (!intercom.lockEntityId) return
    
    setUnlocking(true)
    try {
      await callService('lock', 'unlock', intercom.lockEntityId)
    } catch (error) {
      console.error('Failed to unlock:', error)
    } finally {
      setUnlocking(false)
    }
  }
  
  const handleQuickReply = async (message: string, label: string) => {
    if (!intercom.ttsEntityId) return
    
    setSendingReply(label)
    try {
      await callService('tts', 'speak', undefined, {
        entity_id: intercom.ttsEntityId,
        message,
        cache: false,
      })
    } catch (error) {
      console.error('Failed to send TTS message:', error)
    } finally {
      setSendingReply(null)
    }
  }
  
  const lockState = intercom.lockEntityId ? states[intercom.lockEntityId] : null

  const hasButtons = intercom.speakUrl || intercom.lockEntityId

  return (
    <div className="px-4 py-6 safe-top">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6 max-w-6xl mx-auto"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-cyan/20 flex items-center justify-center">
            <Video className="w-5 h-5 text-accent-cyan" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{intercom.name}</h1>
            <p className="text-xs text-text-secondary">Intercom</p>
          </div>
        </div>
        
        <button
          onClick={refreshStream}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <RefreshCw className="w-5 h-5 text-white" />
        </button>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col lg:flex-row lg:items-start gap-4 max-w-4xl mx-auto"
      >
        <Card className="overflow-hidden lg:flex-1">
          <div className="bg-bg-secondary relative">
            <img
              ref={imgRef}
              key={streamKey}
              src={`/api/ha/stream/${encodeURIComponent(intercom.cameraEntityId)}?t=${streamKey}`}
              alt={intercom.name}
              className="w-full h-auto max-h-[60vh] object-contain"
              onError={() => {
                if (imgRef.current) {
                  imgRef.current.src = `/api/ha/camera/${encodeURIComponent(intercom.cameraEntityId)}?t=${Date.now()}`
                }
              }}
            />
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-red-600 rounded text-xs text-white font-medium animate-pulse">
              LIVE
            </div>
          </div>
        </Card>

        {hasButtons && (
          <div className="flex flex-row lg:flex-col gap-3 lg:w-40 shrink-0">
            {intercom.speakUrl && (
              <button
                onClick={handleSpeak}
                className="flex-1 flex flex-col items-center justify-center p-4 bg-accent-cyan/20 hover:bg-accent-cyan/30 rounded-2xl transition-colors"
              >
                <Mic className="w-6 h-6 text-accent-cyan mb-1" />
                <span className="text-white font-medium text-sm">Sprechen</span>
              </button>
            )}
            
            {intercom.lockEntityId && (
              <button
                onClick={handleUnlock}
                disabled={unlocking}
                className="flex-1 flex flex-col items-center justify-center p-4 bg-accent-green/20 hover:bg-accent-green/30 rounded-2xl transition-colors disabled:opacity-50"
              >
                {unlocking ? (
                  <Loader2 className="w-6 h-6 text-accent-green mb-1 animate-spin" />
                ) : (
                  <DoorOpen className="w-6 h-6 text-accent-green mb-1" />
                )}
                <span className="text-white font-medium text-sm">Tür öffnen</span>
                {lockState && (
                  <span className="text-xs text-text-muted">
                    {lockState.state === 'locked' ? 'Verriegelt' : 'Entriegelt'}
                  </span>
                )}
              </button>
            )}
          </div>
        )}
      </motion.div>

      {intercom.ttsEntityId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 max-w-4xl mx-auto"
        >
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-4 h-4 text-accent-cyan" />
            <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider">Schnellantworten</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply.label}
                onClick={() => handleQuickReply(reply.message, reply.label)}
                disabled={sendingReply !== null}
                className="p-3 bg-white/5 hover:bg-accent-cyan/20 border border-white/10 hover:border-accent-cyan/30 rounded-xl transition-all text-left disabled:opacity-50"
              >
                {sendingReply === reply.label ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-accent-cyan animate-spin" />
                    <span className="text-white text-sm">Senden...</span>
                  </div>
                ) : (
                  <span className="text-white text-sm font-medium">{reply.label}</span>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
