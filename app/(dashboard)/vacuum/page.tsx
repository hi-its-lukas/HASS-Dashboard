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
  Loader2
} from 'lucide-react'

export default function VacuumPage() {
  const states = useHAStore((s) => s.states)
  const callService = useHAStore((s) => s.callService)
  const config = useConfig()
  const [loading, setLoading] = useState<string | null>(null)

  const vacuumEntityId = config.vacuumEntityId || 'vacuum.niels'
  const vacuumState = states[vacuumEntityId]
  
  const battery = states['sensor.niels_batterie']?.state
  const status = states['sensor.niels_status']?.state
  const currentRoom = states['sensor.niels_aktueller_raum']?.state
  const cleaningProgress = states['sensor.niels_reinigungsfortschritt']?.state
  const cleaningArea = states['sensor.niels_reinigungsbereich']?.state
  const cleaningTime = states['sensor.niels_reinigungszeit']?.state
  const isCharging = states['binary_sensor.niels_ladestatus']?.state === 'on'
  const isCleaning = states['binary_sensor.niels_reinigen']?.state === 'on'
  const hasMop = states['binary_sensor.niels_mopp_angebracht']?.state === 'on'
  const error = states['sensor.niels_staubsauger_fehler']?.state
  const mopMode = states['select.niels_mopp_modus']?.state
  const waterIntensity = states['select.niels_wisch_intensitat']?.state

  const filterRemaining = states['sensor.niels_verbleibende_filterzeit']?.state
  const mainBrushRemaining = states['sensor.niels_verbleibende_zeit_der_hauptburste']?.state
  const sideBrushRemaining = states['sensor.niels_verbleibende_zeit_der_seitenburste']?.state
  const sensorRemaining = states['sensor.niels_verbleibende_sensorzeit']?.state

  const totalCleanings = states['sensor.niels_gesamtzahl_reinigungen']?.state
  const totalArea = states['sensor.niels_gesamter_reinigungsbereich']?.state
  const totalTime = states['sensor.niels_gesamtreinigungszeit']?.state

  const handleAction = async (action: string) => {
    setLoading(action)
    try {
      if (action === 'full_clean') {
        await callService('button', 'press', { entity_id: 'button.niels_vollreinigung' })
      } else {
        await callService('vacuum', action, { entity_id: vacuumEntityId })
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

  return (
    <div className="px-4 py-6 safe-top max-w-4xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-white">Saugroboter</h1>
        <p className="text-sm text-text-secondary">
          {vacuumState?.attributes?.friendly_name || 'Niels'}
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
                <div className="flex items-center gap-2 text-text-secondary">
                  <MapPin className="w-4 h-4" />
                  <span>{currentRoom || 'Unbekannt'}</span>
                </div>
                {hasMop && (
                  <div className="flex items-center gap-1 text-cyan-400 text-sm mt-1">
                    <Droplets className="w-3 h-3" />
                    <span>Mopp angebracht</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className={`flex items-center gap-1 ${getBatteryColor(batteryNum)}`}>
                <Battery className="w-5 h-5" />
                <span className="text-2xl font-bold">{battery || '?'}%</span>
              </div>
              {isCharging && (
                <span className="text-xs text-cyan-400">Lädt...</span>
              )}
            </div>
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
          </div>
        </Card>
      </motion.div>

      {hasMop && (
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
              <div>
                <span className="text-xs text-text-muted">Mopp-Modus</span>
                <p className="text-white font-medium">{mopMode || '-'}</p>
              </div>
              <div>
                <span className="text-xs text-text-muted">Wisch-Intensität</span>
                <p className="text-white font-medium">{waterIntensity || '-'}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

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
            <MaintenanceItem label="Filter" hours={filterRemaining} />
            <MaintenanceItem label="Hauptbürste" hours={mainBrushRemaining} />
            <MaintenanceItem label="Seitenbürste" hours={sideBrushRemaining} />
            <MaintenanceItem label="Sensoren" hours={sensorRemaining} />
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
          Statistik
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <Gauge className="w-6 h-6 text-accent-cyan mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{totalCleanings || '0'}</p>
            <p className="text-xs text-text-muted">Reinigungen</p>
          </Card>
          <Card className="p-4 text-center">
            <MapPin className="w-6 h-6 text-accent-green mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{totalArea || '0'}</p>
            <p className="text-xs text-text-muted">m² gesamt</p>
          </Card>
          <Card className="p-4 text-center">
            <Clock className="w-6 h-6 text-accent-orange mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{totalTime || '0'}</p>
            <p className="text-xs text-text-muted">Stunden</p>
          </Card>
        </div>
      </motion.div>
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
