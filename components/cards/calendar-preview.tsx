'use client'

import { useEffect, useState } from 'react'
import { Calendar, ChevronRight } from 'lucide-react'
import { useConfigStore } from '@/lib/config/store'
import Link from 'next/link'

interface CalendarEvent {
  summary: string
  start: string
  end: string
  location?: string
  description?: string
}

export function CalendarPreview() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const { calendars } = useConfigStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchEvents = async () => {
      if (!calendars || calendars.length === 0) {
        setLoading(false)
        return
      }

      try {
        const now = new Date()
        const endDate = new Date(now)
        endDate.setDate(endDate.getDate() + 7)

        const res = await fetch(
          `/api/ha/calendar?` +
          `start=${now.toISOString()}&end=${endDate.toISOString()}&entities=${calendars.join(',')}`
        )
        
        if (res.ok) {
          const data = await res.json()
          const allEvents: CalendarEvent[] = []
          
          for (const calendarId of calendars) {
            const calEvents = data.events?.[calendarId] || []
            allEvents.push(...calEvents)
          }

          allEvents.sort((a, b) => 
            new Date(a.start).getTime() - new Date(b.start).getTime()
          )

          setEvents(allEvents.slice(0, 5))
        }
      } catch (error) {
        console.error('Error fetching calendar events:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [calendars])

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (date.toDateString() === now.toDateString()) return 'Heute'
    if (date.toDateString() === tomorrow.toDateString()) return 'Morgen'
    
    return date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const isAllDay = (start: string) => {
    return start.length === 10 || !start.includes('T')
  }

  const formatTime = (dateStr: string) => {
    if (isAllDay(dateStr)) return 'Ganztägig'
    const date = new Date(dateStr)
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return (
      <div className="glass-tile p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-accent-cyan" />
          <span className="text-white font-medium">Termine</span>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-10 bg-white/10 rounded-lg" />
          <div className="h-10 bg-white/10 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!calendars || calendars.length === 0) {
    return (
      <div className="glass-tile p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-accent-cyan" />
          <span className="text-white font-medium">Termine</span>
        </div>
        <p className="text-text-secondary text-sm">Keine Kalender konfiguriert</p>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="glass-tile p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-accent-cyan" />
          <span className="text-white font-medium">Termine</span>
        </div>
        <p className="text-text-secondary text-sm">Keine Termine in den nächsten 7 Tagen</p>
      </div>
    )
  }

  return (
    <div className="glass-tile p-4">
      <Link href="/calendar" className="flex items-center justify-between mb-3 group">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-accent-cyan" />
          <span className="text-white font-medium">Termine</span>
        </div>
        <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-white transition-colors" />
      </Link>
      <div className="space-y-2">
        {events.map((event, i) => (
          <div 
            key={i} 
            className="flex items-center gap-3 p-2 rounded-lg bg-white/5"
          >
            <div className="flex-shrink-0 w-3 h-3 rounded-full bg-accent-cyan" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{event.summary}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-text-secondary text-xs" suppressHydrationWarning>
                {mounted ? formatDate(event.start) : ''}
              </p>
              <p className="text-text-secondary text-[10px]" suppressHydrationWarning>
                {mounted ? formatTime(event.start) : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
