'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  User, 
  Car, 
  Package, 
  Dog,
  AlertTriangle,
  RefreshCw,
  Play,
  Clock,
  Camera,
  ChevronRight
} from 'lucide-react'

interface DetectionEvent {
  id: string
  type: 'person' | 'vehicle' | 'package' | 'animal' | 'motion'
  cameraName: string
  cameraId: string
  timestamp: string
  thumbnailUrl?: string
  confidence?: number
  description?: string
}

const eventTypeIcons: Record<string, typeof User> = {
  person: User,
  vehicle: Car,
  package: Package,
  animal: Dog,
  motion: AlertTriangle
}

const eventTypeColors: Record<string, string> = {
  person: 'text-blue-400 bg-blue-500/20',
  vehicle: 'text-green-400 bg-green-500/20',
  package: 'text-amber-400 bg-amber-500/20',
  animal: 'text-purple-400 bg-purple-500/20',
  motion: 'text-red-400 bg-red-500/20'
}

const eventTypeLabels: Record<string, string> = {
  person: 'Person erkannt',
  vehicle: 'Fahrzeug erkannt',
  package: 'Paket erkannt',
  animal: 'Tier erkannt',
  motion: 'Bewegung erkannt'
}

export default function SurveillancePage() {
  const [events, setEvents] = useState<DetectionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<DetectionEvent | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/unifi/events')
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Laden der Ereignisse')
      }
      const data = await res.json()
      setEvents(data.events || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
    const interval = setInterval(fetchEvents, 30000)
    return () => clearInterval(interval)
  }, [fetchEvents])

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(e => e.type === filter)

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return 'Gerade eben'
    if (diffMins < 60) return `vor ${diffMins} Min.`
    if (diffHours < 24) return `vor ${diffHours} Std.`
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20">
            <Sparkles className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Surveillance</h1>
            <p className="text-sm text-text-muted">UniFi Protect Smart Detections</p>
          </div>
        </div>
        <button
          onClick={fetchEvents}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Aktualisieren</span>
        </button>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['all', 'person', 'vehicle', 'package', 'animal', 'motion'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              filter === type
                ? 'bg-white/20 text-white'
                : 'glass-card text-text-secondary hover:text-white'
            }`}
          >
            {type === 'all' ? 'Alle' : eventTypeLabels[type]?.replace(' erkannt', '')}
          </button>
        ))}
      </div>

      {error && (
        <div className="glass-card p-4 mb-6 border border-red-500/30 text-red-400">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {loading && events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-text-muted animate-spin mb-4" />
          <p className="text-text-muted">Lade Ereignisse...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Camera className="w-12 h-12 text-text-muted mb-4" />
          <p className="text-text-muted">Keine Ereignisse gefunden</p>
          <p className="text-sm text-text-muted/60 mt-1">
            {filter !== 'all' ? 'Versuche einen anderen Filter' : 'Warte auf neue Erkennungen'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredEvents.map((event) => {
            const Icon = eventTypeIcons[event.type] || AlertTriangle
            const colorClass = eventTypeColors[event.type] || 'text-gray-400 bg-gray-500/20'
            
            return (
              <motion.button
                key={event.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => setSelectedEvent(event)}
                className="w-full glass-card p-4 hover:bg-white/10 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  {event.thumbnailUrl ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-black/20">
                      <img 
                        src={event.thumbnailUrl} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${colorClass}`}>
                      <Icon className="w-8 h-8" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium ${colorClass.split(' ')[0]}`}>
                        {eventTypeLabels[event.type] || 'Erkennung'}
                      </span>
                      {event.confidence && (
                        <span className="text-xs text-text-muted">
                          {Math.round(event.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    <p className="text-white font-medium truncate">{event.cameraName}</p>
                    <div className="flex items-center gap-1 text-xs text-text-muted mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(event.timestamp)}</span>
                    </div>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-text-muted flex-shrink-0" />
                </div>
              </motion.button>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card max-w-2xl w-full max-h-[90vh] overflow-auto"
            >
              {selectedEvent.thumbnailUrl && (
                <div className="aspect-video bg-black/50 relative">
                  <img 
                    src={selectedEvent.thumbnailUrl} 
                    alt="" 
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={() => window.open(`/cameras?highlight=${selectedEvent.cameraId}`, '_self')}
                    className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>Live ansehen</span>
                  </button>
                </div>
              )}
              
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${eventTypeColors[selectedEvent.type]}`}>
                    {(() => {
                      const Icon = eventTypeIcons[selectedEvent.type] || AlertTriangle
                      return <Icon className="w-5 h-5" />
                    })()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {eventTypeLabels[selectedEvent.type]}
                    </h2>
                    <p className="text-sm text-text-muted">{selectedEvent.cameraName}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-text-muted">Zeitpunkt</span>
                    <span className="text-white">
                      {new Date(selectedEvent.timestamp).toLocaleString('de-DE')}
                    </span>
                  </div>
                  
                  {selectedEvent.confidence && (
                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                      <span className="text-text-muted">Konfidenz</span>
                      <span className="text-white">{Math.round(selectedEvent.confidence * 100)}%</span>
                    </div>
                  )}
                  
                  {selectedEvent.description && (
                    <div className="py-2">
                      <span className="text-text-muted block mb-2">Beschreibung</span>
                      <p className="text-white">{selectedEvent.description}</p>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="w-full mt-6 py-3 rounded-xl glass-card hover:bg-white/10 transition-colors text-white font-medium"
                >
                  Schließen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
