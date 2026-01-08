'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { DoorOpen, Lock, Unlock, Settings, RefreshCw, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useConfigStore } from '@/lib/config/store'

export default function LocksPage() {
  const unifiAccessDevices = useConfigStore((s) => s.unifi?.accessDevices) || []
  const [unlocking, setUnlocking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const hasAccessDevices = unifiAccessDevices.length > 0
  
  const handleUnlock = async (device: { id: string; name: string }) => {
    setUnlocking(device.id)
    setError(null)
    setSuccess(null)
    
    try {
      const response = await fetch('/api/unifi/access/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doorId: device.id })
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
      setUnlocking(null)
    }
  }

  return (
    <div className="px-4 py-6 safe-top max-w-7xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <DoorOpen className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Türschlösser</h1>
            <p className="text-xs text-text-secondary">
              {unifiAccessDevices.length} UniFi Access Geräte
            </p>
          </div>
        </div>
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

      {!hasAccessDevices ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <DoorOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-text-secondary mb-2">Keine Türschlösser konfiguriert</p>
          <p className="text-sm text-text-muted mb-4">
            Füge UniFi Access Geräte in den Einstellungen hinzu
          </p>
          <a 
            href="/settings/unifi" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition-colors"
          >
            <Settings className="w-4 h-4" />
            UniFi Einstellungen
          </a>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {unifiAccessDevices.map((device, index) => (
            <motion.div
              key={device.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <Lock className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{device.name}</p>
                      <p className="text-xs text-text-muted">
                        UniFi Access
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleUnlock(device)}
                    disabled={unlocking === device.id}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {unlocking === device.id ? (
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
          ))}
        </div>
      )}
    </div>
  )
}
