'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { DoorOpen, Unlock, ArrowLeft, RefreshCw, AlertCircle, Video } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useConfigStore } from '@/lib/config/store'

export default function UnifiIntercomPage() {
  const params = useParams()
  const router = useRouter()
  const deviceId = params.id as string
  
  const accessDevices = useConfigStore((s) => s.unifi?.accessDevices) || []
  const unifiCameras = useConfigStore((s) => s.unifi?.cameras) || []
  
  const [unlocking, setUnlocking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  
  const device = accessDevices.find((d) => d.id === deviceId)
  
  if (!device) {
    return (
      <div className="px-4 py-6 safe-top max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <DoorOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-text-secondary mb-4">Gerät nicht gefunden</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </button>
        </motion.div>
      </div>
    )
  }
  
  const handleUnlock = async () => {
    setUnlocking(true)
    setError(null)
    setSuccess(null)
    
    try {
      const response = await fetch('/api/unifi/access/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doorId: device.doorId || device.id })
      })
      
      if (response.ok) {
        setSuccess(`${device.name} wurde entriegelt`)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Entriegeln fehlgeschlagen')
      }
    } catch (err) {
      setError('Verbindungsfehler')
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <div className="px-4 py-6 safe-top max-w-4xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{device.name}</h1>
            <p className="text-xs text-text-secondary">UniFi Access</p>
          </div>
        </div>
        
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </motion.header>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400"
        >
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </motion.div>
      )}
      
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center gap-2 text-green-400"
        >
          <Unlock className="w-4 h-4" />
          <span className="text-sm">{success}</span>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <Card className="overflow-hidden">
          <div className="aspect-video bg-bg-secondary relative flex items-center justify-center">
            <div className="text-center">
              <Video className="w-12 h-12 text-gray-600 mx-auto mb-2" />
              <p className="text-text-muted text-sm">Kamera-Feed wird später hinzugefügt</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <DoorOpen className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-white">{device.name}</p>
                <p className="text-xs text-text-muted">
                  {device.type || 'UniFi Access'}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleUnlock}
              disabled={unlocking}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl transition-colors disabled:opacity-50"
            >
              {unlocking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Öffne...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Öffnen</span>
                </>
              )}
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
