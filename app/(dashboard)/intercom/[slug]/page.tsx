'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Video, Mic, DoorOpen, Loader2, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useHAStore } from '@/lib/ha'
import { useConfig } from '@/lib/config/store'

export default function IntercomPage() {
  const params = useParams()
  const slug = params.slug as string
  const config = useConfig()
  const states = useHAStore((s) => s.states)
  const callService = useHAStore((s) => s.callService)
  
  const [unlocking, setUnlocking] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  
  const intercom = config.intercoms?.find((i) => i.slug === slug)
  
  useEffect(() => {
    const interval = setInterval(() => setRefreshKey((k) => k + 1), 5000)
    return () => clearInterval(interval)
  }, [])
  
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
  
  const lockState = intercom.lockEntityId ? states[intercom.lockEntityId] : null

  return (
    <div className="px-4 py-6 safe-top max-w-4xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
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
          onClick={() => setRefreshKey((k) => k + 1)}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
        >
          <RefreshCw className="w-5 h-5 text-white" />
        </button>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="overflow-hidden mb-6">
          <div className="aspect-video bg-bg-secondary relative">
            <img
              key={refreshKey}
              src={`/api/ha/camera/${encodeURIComponent(intercom.cameraEntityId)}?t=${refreshKey}`}
              alt={intercom.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
              LIVE
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-4"
      >
        {intercom.speakUrl && (
          <button
            onClick={handleSpeak}
            className="flex flex-col items-center justify-center p-6 bg-accent-cyan/20 hover:bg-accent-cyan/30 rounded-2xl transition-colors"
          >
            <Mic className="w-8 h-8 text-accent-cyan mb-2" />
            <span className="text-white font-medium">Sprechen</span>
          </button>
        )}
        
        {intercom.lockEntityId && (
          <button
            onClick={handleUnlock}
            disabled={unlocking}
            className="flex flex-col items-center justify-center p-6 bg-accent-green/20 hover:bg-accent-green/30 rounded-2xl transition-colors disabled:opacity-50"
          >
            {unlocking ? (
              <Loader2 className="w-8 h-8 text-accent-green mb-2 animate-spin" />
            ) : (
              <DoorOpen className="w-8 h-8 text-accent-green mb-2" />
            )}
            <span className="text-white font-medium">Tür öffnen</span>
            {lockState && (
              <span className="text-xs text-text-muted mt-1">
                {lockState.state === 'locked' ? 'Verriegelt' : 'Entriegelt'}
              </span>
            )}
          </button>
        )}
      </motion.div>
    </div>
  )
}
