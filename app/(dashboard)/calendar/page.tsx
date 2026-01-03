'use client'

import { motion } from 'framer-motion'
import { CalendarWeek } from '@/components/cards/calendar-week'
import { useHAStore } from '@/lib/ha'
import { useConfig } from '@/lib/config/store'

export default function CalendarPage() {
  const config = useConfig()
  const states = useHAStore((s) => s.states)
  
  const calendarEntityIds = Object.keys(states).filter((id) => id.startsWith('calendar.'))

  return (
    <div className="px-4 py-6 safe-top max-w-7xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-white">Kalender</h1>
        <p className="text-sm text-text-secondary">
          {calendarEntityIds.length > 0 
            ? `${calendarEntityIds.length} Kalender verbunden`
            : 'Keine Kalender gefunden'}
        </p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <CalendarWeek
          calendarEntityIds={calendarEntityIds}
          weatherEntityId={config.weatherEntityId}
        />
      </motion.div>
    </div>
  )
}
