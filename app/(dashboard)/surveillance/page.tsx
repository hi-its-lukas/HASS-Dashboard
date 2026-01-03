'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Video, User, Car, RefreshCw } from 'lucide-react'
import { FilterChip } from '@/components/ui/filter-chip'
import { SurveillanceEventCard } from '@/components/cards/surveillance-event-card'
import { formatRelativeTime } from '@/lib/utils'
import { SurveillanceEvent } from '@/lib/ha/types'

type TimeFilter = '1h' | '6h' | '24h'
type TypeFilter = 'person' | 'vehicle' | null

export default function SurveillancePage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('6h')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(null)
  const [events, setEvents] = useState<SurveillanceEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const hours = timeFilter === '1h' ? 1 : timeFilter === '6h' ? 6 : 24
      const res = await fetch(`/api/ha/frigate/events?hours=${hours}&limit=50`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch surveillance events:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [timeFilter])

  const filteredEvents = events.filter((event) => {
    if (typeFilter && event.type !== typeFilter) return false
    return true
  })

  const stats = {
    events: events.length,
    people: events.filter((e) => e.type === 'person').length,
    vehicles: events.filter((e) => e.type === 'vehicle').length,
    ai: events.filter((e) => e.confidence > 80).length,
  }

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
              <span className="text-3xl font-bold text-text-secondary">{stats.ai}</span>
              <p className="text-xs text-text-muted uppercase">AI</p>
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
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                No events found for the selected filters
              </div>
            ) : (
              filteredEvents.map((event) => (
                <SurveillanceEventCard key={event.id} event={event} />
              ))
            )}
          </motion.section>
        </div>
      </div>
    </div>
  )
}
