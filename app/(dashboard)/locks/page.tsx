'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { DoorOpen, Lock, Unlock, Settings, RefreshCw, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useConfigStore } from '@/lib/config/store'
import { useHAStore } from '@/lib/ha/store'

export default function LocksPage() {
  const unifiAccessDevices = useConfigStore((s) => s.unifi?.accessDevices) || []
  const configuredLocks = useConfigStore((s) => s.locks) || []
  const states = useHAStore((s) => s.states)
  
  const [unlocking, setUnlocking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
    
  const hasUnifiAccess = unifiAccessDevices.length > 0
  
  const haLockEntities = hasUnifiAccess 
    ? [] 
    : configuredLocks.filter((id) => id.startsWith('lock.') && states[id])
  
  const totalLocks = hasUnifiAccess ? unifiAccessDevices.length : haLockEntities.length
  
  const handleUnifiUnlock = async (device: { id: string; name: string }) => {
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
  
  const handleHALock = async (entityId: string, action: 'lock' | 'unlock') => {
    setUnlocking(entityId)
    setError(null)
    setSuccess(null)
    
    const state = states[entityId]
    const name = (state?.attributes?.friendly_name as string) || entityId
    
    try {
      const response = await fetch('/api/ha/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId, action })
      })
      
      if (response.ok) {
        setSuccess(`${name} wurde ${action === 'unlock' ? 'entriegelt' : 'verriegelt'}`)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Aktion fehlgeschlagen')
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
              {totalLocks} {hasUnifiAccess ? 'UniFi Access Geräte' : 'Schlösser'}
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

      {totalLocks === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <DoorOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-text-secondary mb-2">Keine Türschlösser konfiguriert</p>
          <p className="text-sm text-text-muted mb-4">
            {hasUnifiAccess 
              ? 'Prüfe deine UniFi Access Konfiguration'
              : 'Füge Schlösser in den Einstellungen hinzu'}
          </p>
          <a 
            href={hasUnifiAccess ? '/settings/unifi' : '/settings'} 
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition-colors"
          >
            <Settings className="w-4 h-4" />
            {hasUnifiAccess ? 'UniFi Einstellungen' : 'Zu den Einstellungen'}
          </a>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hasUnifiAccess ? (
            unifiAccessDevices.map((device, index) => (
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
                        onClick={() => handleUnifiUnlock(device)}
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
            ))
          ) : (
            haLockEntities.map((entityId, index) => {
              const state = states[entityId]
              const friendlyName = (state?.attributes?.friendly_name as string) || entityId.split('.')[1].replace(/_/g, ' ')
              const isLocked = state?.state === 'locked'
              
              return (
                <motion.div
                  key={entityId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isLocked ? 'bg-purple-500/20' : 'bg-green-500/20'
                        }`}>
                          {isLocked ? (
                            <Lock className="w-6 h-6 text-purple-400" />
                          ) : (
                            <Unlock className="w-6 h-6 text-green-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white capitalize">{friendlyName}</p>
                          <p className="text-xs text-text-muted">
                            {isLocked ? 'Verriegelt' : 'Entriegelt'}
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleHALock(entityId, isLocked ? 'unlock' : 'lock')}
                        disabled={unlocking === entityId}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 ${
                          isLocked
                            ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                            : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400'
                        }`}
                      >
                        {unlocking === entityId ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>...</span>
                          </>
                        ) : isLocked ? (
                          <>
                            <Unlock className="w-4 h-4" />
                            <span>Öffnen</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>Schließen</span>
                          </>
                        )}
                      </button>
                    </div>
                  </Card>
                </motion.div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
