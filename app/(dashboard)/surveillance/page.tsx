'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Video, User, Car } from 'lucide-react'
import { FilterChip } from '@/components/ui/filter-chip'
import { SurveillanceEventCard } from '@/components/cards/surveillance-event-card'
import { useSurveillanceEvents, useSurveillanceStats } from '@/lib/ha'
import { formatRelativeTime } from '@/lib/utils'

type TimeFilter = '1h' | '6h' | '24h'
type TypeFilter = 'person' | 'vehicle' | null

export default function SurveillancePage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('6h')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(null)
  
  const events = useSurveillanceEvents()
  const stats = useSurveillanceStats()

  const filteredEvents = events.filter((event) => {
    if (typeFilter && event.type !== typeFilter) return false
    
    const eventTime = new Date(event.timestamp).getTime()
    const now = Date.now()
    const hourMs = 60 * 60 * 1000
    
    switch (timeFilter) {
      case '1h': return now - eventTime < hourMs
      case '6h': return now - eventTime < 6 * hourMs
      case '24h': return now - eventTime < 24 * hourMs
      default: return true
    }
  })

  const lastUpdate = events.length > 0 ? formatRelativeTime(events[0].timestamp) : 'Unknown'

  return (
    <div className="px-4 py-6 safe-top max-w-7xl mx-auto">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-2"
      >
        <div className="w-10 h-10 rounded-full bg-accent-cyan/20 flex items-center justify-center">
          <Video className="w-5 h-5 text-accent-cyan" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">AI Surveillance</h1>
          <p className="text-xs text-accent-orange">LAST UPDATE {lastUpdate.toUpperCase()}</p>
        </div>
      </motion.header>

      {/* Desktop: Two column layout */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Left column - Stats and filters */}
        <div className="lg:col-span-1">
          {/* Stats */}
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

          {/* Filters */}
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

        {/* Right column - Event list */}
        <div className="lg:col-span-2">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            {filteredEvents.map((event) => (
              <SurveillanceEventCard key={event.id} event={event} />
            ))}
            {filteredEvents.length === 0 && (
              <div className="text-center py-12 text-text-muted">
                No events found for the selected filters
              </div>
            )}
          </motion.section>
        </div>
      </div>
    </div>
  )
}
