'use client'

import { useState } from 'react'
import { Lock, Unlock, RefreshCw, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useHAStore } from '@/lib/ha'
import { useConfigStore } from '@/lib/config/store'
import EmptyState from './EmptyState'
import { cn } from '@/lib/utils'

export default function LocksTab() {
  const unifiAccessDevices = useConfigStore((s) => s.unifi?.accessDevices) || []
  const configuredLocks = useConfigStore((s) => s.locks) || []
  const states = useHAStore((s) => s.states)
  const [unlocking, setUnlocking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
    
  const hasUnifiAccess = unifiAccessDevices.length > 0
  const haLockEntities = hasUnifiAccess ? [] : configuredLocks.filter((id) => id.startsWith('lock.') && states[id])
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
    } catch { setError('Verbindungsfehler') }
    finally { setUnlocking(null) }
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
    } catch { setError('Verbindungsfehler') }
    finally { setUnlocking(null) }
  }

  if (totalLocks === 0) return <EmptyState icon={Lock} label="Keine Türschlösser konfiguriert" />

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2 text-white/70">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-white/10 border border-white/20 rounded-xl flex items-center gap-2 text-white">
          <Unlock className="w-4 h-4" />
          <span className="text-sm">{success}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hasUnifiAccess ? (
          unifiAccessDevices.map((device) => (
            <Card key={device.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{device.name}</p>
                    <p className="text-xs text-white/50">UniFi Access</p>
                  </div>
                </div>
                <button onClick={() => handleUnifiUnlock(device)} disabled={unlocking === device.id} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl disabled:opacity-50 transition-colors">
                  {unlocking === device.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                  <span>{unlocking === device.id ? 'Öffne...' : 'Öffnen'}</span>
                </button>
              </div>
            </Card>
          ))
        ) : (
          haLockEntities.map((entityId) => {
            const state = states[entityId]
            const friendlyName = (state?.attributes?.friendly_name as string) || entityId.split('.')[1].replace(/_/g, ' ')
            const isLocked = state?.state === 'locked'
            
            return (
              <Card key={entityId} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', isLocked ? 'bg-white/10' : 'bg-white/20')}>
                      {isLocked ? <Lock className="w-6 h-6 text-white" /> : <Unlock className="w-6 h-6 text-white" />}
                    </div>
                    <div>
                      <p className="font-medium text-white capitalize">{friendlyName}</p>
                      <p className="text-xs text-white/50">{isLocked ? 'Verriegelt' : 'Entriegelt'}</p>
                    </div>
                  </div>
                  <button onClick={() => handleHALock(entityId, isLocked ? 'unlock' : 'lock')} disabled={unlocking === entityId} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl disabled:opacity-50 transition-colors">
                    {unlocking === entityId ? <RefreshCw className="w-4 h-4 animate-spin" /> : isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    <span>{isLocked ? 'Öffnen' : 'Schließen'}</span>
                  </button>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
