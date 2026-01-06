'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { useHAStore } from '@/lib/ha'
import { useConfig } from '@/lib/config/store'
import { 
  Battery, 
  Play, 
  Pause, 
  Home, 
  MapPin, 
  Clock, 
  Gauge,
  Droplets,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Loader2,
  Settings
} from 'lucide-react'
import Link from 'next/link'

export default function VacuumPage() {
  const states = useHAStore((s) => s.states)
  const callService = useHAStore((s) => s.callService)
  const config = useConfig()
  const [loading, setLoading] = useState<string | null>(null)

  const vacuumConfig = config.vacuum
  const vacuumEntityId = vacuumConfig?.entityId || config.vacuumEntityId

  if (!vacuumEntityId) {
    return (
      <div className="px-4 py-6 safe-top max-w-4xl mx-auto">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-white">Saugroboter</h1>
        </motion.header>
        
        <Card className="p-8 text-center">
          <Sparkles className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-white mb-2">Kein Saugroboter konfiguriert</h2>
          <p className="text-text-secondary mb-4">
            Bitte konfiguriere deinen Saugroboter in den Einstellungen.
          </p>
          <Link 
            href="/settings"
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            Einstellungen öffnen
          </Link>
        </Card>
      </div>
    )
  }

  const vacuumState = states[vacuumEntityId]
  
  const battery = vacuumConfig?.batteryEntityId 
    ? states[vacuumConfig.batteryEntityId]?.state 
    : undefined
  const status = vacuumConfig?.statusEntityId 
    ? states[vacuumConfig.statusEntityId]?.state 
    : vacuumState?.state
  const currentRoom = vacuumConfig?.currentRoomEntityId 
    ? states[vacuumConfig.currentRoomEntityId]?.state 
    : undefined
  const cleaningProgress = vacuumConfig?.cleaningProgressEntityId 
    ? states[vacuumConfig.cleaningProgressEntityId]?.state 
    : undefined
  const cleaningArea = vacuumConfig?.cleaningAreaEntityId 
    ? states[vacuumConfig.cleaningAreaEntityId]?.state 
    : undefined
  const cleaningTime = vacuumConfig?.cleaningTimeEntityId 
    ? states[vacuumConfig.cleaningTimeEntityId]?.state 
    : undefined
  const isCharging = vacuumConfig?.chargingEntityId 
    ? states[vacuumConfig.chargingEntityId]?.state === 'on' 
    : false
  const isCleaning = vacuumConfig?.cleaningEntityId 
    ? states[vacuumConfig.cleaningEntityId]?.state === 'on' 
    : vacuumState?.state === 'cleaning'
  const hasMop = vacuumConfig?.mopAttachedEntityId 
    ? states[vacuumConfig.mopAttachedEntityId]?.state === 'on' 
    : false
  const error = vacuumConfig?.errorEntityId 
    ? states[vacuumConfig.errorEntityId]?.state 
    : undefined
  const mopMode = vacuumConfig?.mopModeEntityId 
    ? states[vacuumConfig.mopModeEntityId]?.state 
    : undefined
  const waterIntensity = vacuumConfig?.waterIntensityEntityId 
    ? states[vacuumConfig.waterIntensityEntityId]?.state 
    : undefined

  const filterRemaining = vacuumConfig?.filterRemainingEntityId 
    ? states[vacuumConfig.filterRemainingEntityId]?.state 
    : undefined
  const mainBrushRemaining = vacuumConfig?.mainBrushRemainingEntityId 
    ? states[vacuumConfig.mainBrushRemainingEntityId]?.state 
    : undefined
  const sideBrushRemaining = vacuumConfig?.sideBrushRemainingEntityId 
    ? states[vacuumConfig.sideBrushRemainingEntityId]?.state 
    : undefined
  const sensorRemaining = vacuumConfig?.sensorRemainingEntityId 
    ? states[vacuumConfig.sensorRemainingEntityId]?.state 
    : undefined

  const totalCleanings = vacuumConfig?.totalCleaningsEntityId 
    ? states[vacuumConfig.totalCleaningsEntityId]?.state 
    : undefined
  const totalArea = vacuumConfig?.totalAreaEntityId 
    ? states[vacuumConfig.totalAreaEntityId]?.state 
    : undefined
  const totalTime = vacuumConfig?.totalTimeEntityId 
    ? states[vacuumConfig.totalTimeEntityId]?.state 
    : undefined

  const handleAction = async (action: string) => {
    setLoading(action)
    try {
      if (action === 'full_clean' && vacuumConfig?.fullCleanButtonEntityId) {
        await callService('button', 'press', vacuumConfig.fullCleanButtonEntityId)
      } else {
        await callService('vacuum', action, vacuumEntityId)
      }
    } catch (err) {
      console.error('Vacuum action failed:', err)
    }
    setTimeout(() => setLoading(null), 2000)
  }

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-400'
    if (level > 20) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getStatusColor = () => {
    if (isCleaning) return 'bg-green-500'
    if (isCharging) return 'bg-cyan-500'
    if (error && error !== 'none' && error !== 'Keine') return 'bg-red-500'
    return 'bg-gray-500'
  }

  const batteryNum = battery ? parseInt(battery) : 0
  const hasMaintenanceData = filterRemaining || mainBrushRemaining || sideBrushRemaining || sensorRemaining
  const hasStatisticsData = totalCleanings || totalArea || totalTime

  return (
    <div className="px-4 py-6 safe-top max-w-4xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-white">Saugroboter</h1>
        <p className="text-sm text-text-secondary">
          {vacuumState?.attributes?.friendly_name || vacuumEntityId.split('.')[1]}
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-bg-secondary flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-accent-cyan" />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${getStatusColor()} border-2 border-bg-primary`} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{status || 'Unbekannt'}</h2>
                {currentRoom && (
                  <div className="flex items-center gap-2 text-text-secondary">
                    <MapPin className="w-4 h-4" />
                    <span>{currentRoom}</span>
                  </div>
                )}
                {hasMop && (
                  <div className="flex items-center gap-1 text-cyan-400 text-sm mt-1">
                    <Droplets className="w-3 h-3" />
                    <span>Mopp angebracht</span>
                  </div>
                )}
              </div>
            </div>
            {battery && (
              <div className="text-right">
                <div className={`flex items-center gap-1 ${getBatteryColor(batteryNum)}`}>
                  <Battery className="w-5 h-5" />
                  <span className="text-2xl font-bold">{battery}%</span>
                </div>
                {isCharging && (
                  <span className="text-xs text-cyan-400">Lädt...</span>
                )}
              </div>
            )}
          </div>

          {isCleaning && cleaningProgress && (
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-text-secondary">Fortschritt</span>
                <span className="text-white font-medium">{cleaningProgress}%</span>
              </div>
              <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent-cyan transition-all duration-500"
                  style={{ width: `${cleaningProgress}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-text-muted">
                <span>{cleaningArea || '0'} m²</span>
                <span>{cleaningTime || '0'} Min</span>
              </div>
            </div>
          )}

          {error && error !== 'none' && error !== 'Keine' && (
            <div className="mb-6 p-3 bg-red-500/20 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-400">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-4 gap-3">
            <button
              onClick={() => handleAction('start')}
              disabled={loading !== null}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-green-500/20 hover:bg-green-500/30 transition-colors disabled:opacity-50"
            >
              {loading === 'start' ? (
                <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
              ) : (
                <Play className="w-6 h-6 text-green-400" />
              )}
              <span className="text-xs text-white">Start</span>
            </button>
            <button
              onClick={() => handleAction('pause')}
              disabled={loading !== null}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-yellow-500/20 hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
            >
              {loading === 'pause' ? (
                <Loader2 className="w-6 h-6 text-yellow-400 animate-spin" />
              ) : (
                <Pause className="w-6 h-6 text-yellow-400" />
              )}
              <span className="text-xs text-white">Pause</span>
            </button>
            <button
              onClick={() => handleAction('return_to_base')}
              disabled={loading !== null}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
            >
              {loading === 'return_to_base' ? (
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              ) : (
                <Home className="w-6 h-6 text-cyan-400" />
              )}
              <span className="text-xs text-white">Basis</span>
            </button>
            {vacuumConfig?.fullCleanButtonEntityId && (
              <button
                onClick={() => handleAction('full_clean')}
                disabled={loading !== null}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
              >
                {loading === 'full_clean' ? (
                  <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                ) : (
                  <Sparkles className="w-6 h-6 text-purple-400" />
                )}
                <span className="text-xs text-white">Voll</span>
              </button>
            )}
          </div>
        </Card>
      </motion.div>

      {hasMop && (mopMode || waterIntensity) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
            Wischen
          </h2>
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {mopMode && (
                <div>
                  <span className="text-xs text-text-muted">Mopp-Modus</span>
                  <p className="text-white font-medium">{mopMode}</p>
                </div>
              )}
              {waterIntensity && (
                <div>
                  <span className="text-xs text-text-muted">Wisch-Intensität</span>
                  <p className="text-white font-medium">{waterIntensity}</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {hasMaintenanceData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
            Wartung
          </h2>
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {filterRemaining && <MaintenanceItem label="Filter" hours={filterRemaining} />}
              {mainBrushRemaining && <MaintenanceItem label="Hauptbürste" hours={mainBrushRemaining} />}
              {sideBrushRemaining && <MaintenanceItem label="Seitenbürste" hours={sideBrushRemaining} />}
              {sensorRemaining && <MaintenanceItem label="Sensoren" hours={sensorRemaining} />}
            </div>
          </Card>
        </motion.div>
      )}

      {hasStatisticsData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
            Statistik
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {totalCleanings && (
              <Card className="p-4 text-center">
                <Gauge className="w-6 h-6 text-accent-cyan mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{totalCleanings}</p>
                <p className="text-xs text-text-muted">Reinigungen</p>
              </Card>
            )}
            {totalArea && (
              <Card className="p-4 text-center">
                <MapPin className="w-6 h-6 text-accent-green mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{totalArea}</p>
                <p className="text-xs text-text-muted">m² gesamt</p>
              </Card>
            )}
            {totalTime && (
              <Card className="p-4 text-center">
                <Clock className="w-6 h-6 text-accent-orange mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{totalTime}</p>
                <p className="text-xs text-text-muted">Stunden</p>
              </Card>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

function MaintenanceItem({ label, hours }: { label: string; hours?: string }) {
  const hoursNum = hours ? parseInt(hours) : 0
  const isLow = hoursNum < 10
  
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <div className="flex items-center gap-1">
        {isLow ? (
          <AlertCircle className="w-4 h-4 text-orange-400" />
        ) : (
          <CheckCircle className="w-4 h-4 text-green-400" />
        )}
        <span className={`text-sm font-medium ${isLow ? 'text-orange-400' : 'text-white'}`}>
          {hours || '?'}h
        </span>
      </div>
    </div>
  )
}
