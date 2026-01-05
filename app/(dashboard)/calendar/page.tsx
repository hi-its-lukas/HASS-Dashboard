'use client'

import { motion } from 'framer-motion'
import { CalendarWeek } from '@/components/cards/calendar-week'
import { useHAStore } from '@/lib/ha'
import { useConfig, useConfigStore } from '@/lib/config/store'
import Link from 'next/link'

export default function CalendarPage() {
  const config = useConfig()
  const { calendars } = useConfigStore()
  const states = useHAStore((s) => s.states)
  
  const allCalendarIds = Object.keys(states).filter((id) => id.startsWith('calendar.'))
  const calendarEntityIds = calendars && calendars.length > 0 ? calendars : allCalendarIds

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
            ? `${calendarEntityIds.length} Kalender angezeigt`
            : 'Keine Kalender konfiguriert'}
        </p>
        {calendars.length === 0 && allCalendarIds.length > 0 && (
          <Link href="/settings" className="text-accent-cyan text-xs hover:underline">
            Kalender in Einstellungen auswählen
          </Link>
        )}
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
