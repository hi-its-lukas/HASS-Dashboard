'use client'

import { useState } from 'react'
import { Bot, Battery, Sparkles, RefreshCw, Play, Pause, Home } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useHAStore } from '@/lib/ha'
import { useConfig } from '@/lib/config/store'
import EmptyState from './EmptyState'
import { cn } from '@/lib/utils'

export default function VacuumTab() {
  const states = useHAStore((s) => s.states)
  const callService = useHAStore((s) => s.callService)
  const config = useConfig()
  const [loading, setLoading] = useState<string | null>(null)

  const vacuumConfig = config.vacuum
  const vacuumEntityId = vacuumConfig?.entityId || config.vacuumEntityId

  if (!vacuumEntityId) return <EmptyState icon={Bot} label="Kein Saugroboter konfiguriert" />

  const vacuumState = states[vacuumEntityId]
  const battery = vacuumConfig?.batteryEntityId ? states[vacuumConfig.batteryEntityId]?.state : undefined
  const status = vacuumConfig?.statusEntityId ? states[vacuumConfig.statusEntityId]?.state : vacuumState?.state
  const isCleaning = vacuumConfig?.cleaningEntityId ? states[vacuumConfig.cleaningEntityId]?.state === 'on' : vacuumState?.state === 'cleaning'
  const isCharging = vacuumConfig?.chargingEntityId ? states[vacuumConfig.chargingEntityId]?.state === 'on' : false

  const handleAction = async (action: string) => {
    setLoading(action)
    try {
      if (action === 'full_clean' && vacuumConfig?.fullCleanButtonEntityId) {
        await callService('button', 'press', vacuumConfig.fullCleanButtonEntityId)
      } else {
        await callService('vacuum', action, vacuumEntityId)
      }
    } catch (err) { console.error('Vacuum action failed:', err) }
    setTimeout(() => setLoading(null), 2000)
  }

  const batteryNum = battery ? parseInt(battery) : 0
  const getBatteryColor = (level: number) => level > 50 ? 'text-white' : level > 20 ? 'text-white/70' : 'text-white/50'
  const getStatusIndicator = () => isCleaning ? 'bg-white' : isCharging ? 'bg-white/60' : 'bg-white/30'

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <div className={cn('absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#141b2d]', getStatusIndicator())} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{status || 'Unbekannt'}</h2>
            <p className="text-sm text-white/50">{vacuumState?.attributes?.friendly_name || vacuumEntityId.split('.')[1]}</p>
          </div>
        </div>
        {battery && (
          <div className={cn('flex items-center gap-1', getBatteryColor(batteryNum))}>
            <Battery className="w-5 h-5" />
            <span className="text-2xl font-bold">{battery}%</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => handleAction('start')} disabled={loading !== null} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors">
          {loading === 'start' ? <RefreshCw className="w-6 h-6 text-white animate-spin" /> : <Play className="w-6 h-6 text-white" />}
          <span className="text-xs text-white">Start</span>
        </button>
        <button onClick={() => handleAction('pause')} disabled={loading !== null} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors">
          {loading === 'pause' ? <RefreshCw className="w-6 h-6 text-white animate-spin" /> : <Pause className="w-6 h-6 text-white" />}
          <span className="text-xs text-white">Pause</span>
        </button>
        <button onClick={() => handleAction('return_to_base')} disabled={loading !== null} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-50 transition-colors">
          {loading === 'return_to_base' ? <RefreshCw className="w-6 h-6 text-white animate-spin" /> : <Home className="w-6 h-6 text-white" />}
          <span className="text-xs text-white">Basis</span>
        </button>
      </div>
    </Card>
  )
}
