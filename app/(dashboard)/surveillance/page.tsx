'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { Video, User, Car, RefreshCw, PawPrint, Activity, Settings } from 'lucide-react'
import { FilterChip } from '@/components/ui/filter-chip'
import { Card } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/utils'
import { useHAStore } from '@/lib/ha'
import { useConfig } from '@/lib/config/store'

type TimeFilter = '1h' | '6h' | '24h'
type TypeFilter = 'person' | 'vehicle' | 'animal' | 'motion' | null

interface SurveillanceEventData {
  id: string
  cameraEntityId: string
  cameraName: string
  eventType: string
  detectedAt: string
  snapshotPath?: string
}

interface Stats {
  events: number
  people: number
  vehicles: number
  animals: number
  motion: number
}

export default function SurveillancePage() {
  const config = useConfig()
  const states = useHAStore((s) => s.states)
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('6h')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(null)
  const [events, setEvents] = useState<SurveillanceEventData[]>([])
  const [stats, setStats] = useState<Stats>({ events: 0, people: 0, vehicles: 0, animals: 0, motion: 0 })
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const lastSensorStates = useRef<Record<string, string>>({})

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const hours = timeFilter === '1h' ? 1 : timeFilter === '6h' ? 6 : 24
      const typeParam = typeFilter ? `&type=${typeFilter}` : ''
      const res = await fetch(`/api/ha/surveillance/events?hours=${hours}${typeParam}`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])
        setStats(data.stats || { events: 0, people: 0, vehicles: 0, animals: 0, motion: 0 })
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch surveillance events:', error)
    } finally {
      setLoading(false)
    }
  }, [timeFilter, typeFilter])

  useEffect(() => {
    fetchEvents()
    const interval = setInterval(fetchEvents, 30000)
    return () => clearInterval(interval)
  }, [fetchEvents])

  useEffect(() => {
    const surveillanceCameras = config.surveillanceCameras || []
    if (surveillanceCameras.length === 0) return

    surveillanceCameras.forEach(camConfig => {
      const sensorChecks = [
        { type: 'person' as const, sensorId: camConfig.personSensorId },
        { type: 'vehicle' as const, sensorId: camConfig.vehicleSensorId },
        { type: 'animal' as const, sensorId: camConfig.animalSensorId },
        { type: 'motion' as const, sensorId: camConfig.motionSensorId }
      ]

      sensorChecks.forEach(({ type, sensorId }) => {
        if (!sensorId || !camConfig.detectionTypes.includes(type)) return

        const currentState = states[sensorId]?.state
        const previousState = lastSensorStates.current[sensorId]

        if (previousState === 'off' && currentState === 'on') {
          trackEvent(camConfig.cameraEntityId, camConfig.cameraName, type)
        }

        if (currentState) {
          lastSensorStates.current[sensorId] = currentState
        }
      })
    })
  }, [states, config.surveillanceCameras])

  const trackEvent = async (cameraEntityId: string, cameraName: string, eventType: string) => {
    try {
      let snapshotPath: string | undefined

      try {
        const snapshotRes = await fetch(`/api/ha/camera/${encodeURIComponent(cameraEntityId)}?t=${Date.now()}`)
        if (snapshotRes.ok) {
          const blob = await snapshotRes.blob()
          const formData = new FormData()
          formData.append('file', blob, `snapshot_${Date.now()}.jpg`)
          formData.append('cameraEntityId', cameraEntityId)
          formData.append('eventType', eventType)

          const uploadRes = await fetch('/api/ha/surveillance/snapshot', {
            method: 'POST',
            body: formData
          })

          if (uploadRes.ok) {
            const data = await uploadRes.json()
            snapshotPath = data.path
          }
        }
      } catch (e) {
        console.warn('Failed to capture snapshot:', e)
      }

      await fetch('/api/ha/surveillance/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cameraEntityId,
          cameraName,
          eventType,
          snapshotPath
        })
      })

      fetchEvents()
    } catch (error) {
      console.error('Failed to track event:', error)
    }
  }

  const hasConfig = (config.surveillanceCameras?.length || 0) > 0

  return (
    <div className="px-4 py-6 safe-top max-w-7xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-2"
      >
        <div className="w-10 h-10 rounded-full bg-accent-cyan/20 flex items-center justify-center">
          <Video className="w-5 h-5 text-accent-cyan" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">AI Surveillance</h1>
          <p className="text-xs text-accent-orange">
            {lastUpdate ? `LAST UPDATE ${formatRelativeTime(lastUpdate.toISOString()).toUpperCase()}` : 'LOADING...'}
          </p>
        </div>
        <button
          onClick={fetchEvents}
          disabled={loading}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-white ${loading ? 'animate-spin' : ''}`} />
        </button>
      </motion.header>

      {!hasConfig ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <Video className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-text-secondary mb-2">Keine Kameras für Surveillance konfiguriert</p>
          <a 
            href="/settings" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan rounded-xl transition-colors"
          >
            <Settings className="w-4 h-4" />
            Kameras konfigurieren
          </a>
        </motion.div>
      ) : (
        <div className="lg:grid lg:grid-cols-3 lg:gap-6">
          <div className="lg:col-span-1">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-4 lg:grid-cols-2 gap-4 py-6"
            >
              <div className="text-center">
                <span className="text-3xl font-bold text-accent-orange">{stats.events}</span>
                <p className="text-xs text-text-muted uppercase">Events</p>
              </div>
              <div className="text-center">
                <span className="text-3xl font-bold text-accent-cyan">{stats.people}</span>
                <p className="text-xs text-text-muted uppercase">People</p>
              </div>
              <div className="text-center">
                <span className="text-3xl font-bold text-white">{stats.vehicles}</span>
                <p className="text-xs text-text-muted uppercase">Vehicles</p>
              </div>
              <div className="text-center">
                <span className="text-3xl font-bold text-text-secondary">{stats.animals}</span>
                <p className="text-xs text-text-muted uppercase">Animals</p>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap gap-2 mb-6"
            >
              <FilterChip
                label="1 Hour"
                active={timeFilter === '1h'}
                onClick={() => setTimeFilter('1h')}
              />
              <FilterChip
                label="6 Hours"
                active={timeFilter === '6h'}
                onClick={() => setTimeFilter('6h')}
              />
              <FilterChip
                label="24 Hours"
                active={timeFilter === '24h'}
                onClick={() => setTimeFilter('24h')}
              />
              <div className="w-px bg-gray-700 hidden sm:block" />
              <FilterChip
                label="Person"
                icon={User}
                active={typeFilter === 'person'}
                onClick={() => setTypeFilter(typeFilter === 'person' ? null : 'person')}
              />
              <FilterChip
                label="Vehicle"
                icon={Car}
                active={typeFilter === 'vehicle'}
                onClick={() => setTypeFilter(typeFilter === 'vehicle' ? null : 'vehicle')}
              />
              <FilterChip
                label="Animal"
                icon={PawPrint}
                active={typeFilter === 'animal'}
                onClick={() => setTypeFilter(typeFilter === 'animal' ? null : 'animal')}
              />
              <FilterChip
                label="Motion"
                icon={Activity}
                active={typeFilter === 'motion'}
                onClick={() => setTypeFilter(typeFilter === 'motion' ? null : 'motion')}
              />
            </motion.section>
          </div>

          <div className="lg:col-span-2">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-3"
            >
              {loading && events.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                  Loading events...
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                  No events found for the selected filters
                </div>
              ) : (
                events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))
              )}
            </motion.section>
          </div>
        </div>
      )}
    </div>
  )
}

function EventCard({ event }: { event: SurveillanceEventData }) {
  const getTypeIcon = () => {
    switch (event.eventType) {
      case 'person': return <User className="w-4 h-4" />
      case 'vehicle': return <Car className="w-4 h-4" />
      case 'animal': return <PawPrint className="w-4 h-4" />
      case 'motion': return <Activity className="w-4 h-4" />
      default: return <Video className="w-4 h-4" />
    }
  }

  const getTypeColor = () => {
    switch (event.eventType) {
      case 'person': return 'text-accent-cyan bg-accent-cyan/20'
      case 'vehicle': return 'text-accent-orange bg-accent-orange/20'
      case 'animal': return 'text-accent-green bg-accent-green/20'
      case 'motion': return 'text-accent-purple bg-accent-purple/20'
      default: return 'text-gray-400 bg-gray-400/20'
    }
  }

  const getTypeLabel = () => {
    switch (event.eventType) {
      case 'person': return 'Person'
      case 'vehicle': return 'Fahrzeug'
      case 'animal': return 'Tier'
      case 'motion': return 'Bewegung'
      default: return event.eventType
    }
  }

  return (
    <Card className="p-4 flex gap-4">
      {event.snapshotPath && (
        <div className="w-24 h-16 rounded-lg overflow-hidden bg-bg-secondary flex-shrink-0">
          <img
            src={event.snapshotPath}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getTypeColor()}`}>
            {getTypeIcon()}
            {getTypeLabel()}
          </span>
        </div>
        <p className="text-sm text-white font-medium truncate">{event.cameraName}</p>
        <p className="text-xs text-text-muted">
          {formatRelativeTime(event.detectedAt)}
        </p>
      </div>
    </Card>
  )
}
