'use client'

import { useEffect, useState } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { useConfigStore } from '@/lib/config/store'

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
  const { calendars } = useConfigStore()

  useEffect(() => {
    const fetchEvents = async () => {
      if (!calendars || calendars.length === 0) {
        setLoading(false)
        return
      }

      try {
        const now = new Date()
        const endOfTomorrow = new Date(now)
        endOfTomorrow.setDate(endOfTomorrow.getDate() + 2)
        endOfTomorrow.setHours(0, 0, 0, 0)

        const res = await fetch(
          `/api/ha/calendar?` +
          `start=${now.toISOString()}&end=${endOfTomorrow.toISOString()}&entities=${calendars.join(',')}`
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

  const formatEventTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const isToday = date.toDateString() === now.toDateString()
    const isTomorrow = date.toDateString() === tomorrow.toDateString()
    
    const timeStr = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    
    if (isToday) {
      return `Heute, ${timeStr}`
    } else if (isTomorrow) {
      return `Morgen, ${timeStr}`
    }
    return date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' }) + `, ${timeStr}`
  }

  const isAllDay = (start: string, end: string) => {
    return start.length === 10 || !start.includes('T')
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
        <p className="text-text-secondary text-sm">Keine Termine heute/morgen</p>
      </div>
    )
  }

  return (
    <div className="glass-tile p-4">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-accent-cyan" />
        <span className="text-white font-medium">Termine</span>
      </div>
      <div className="space-y-2">
        {events.map((event, i) => (
          <div 
            key={i} 
            className="flex items-start gap-3 p-2 rounded-lg bg-white/5"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent-cyan/20 flex items-center justify-center mt-0.5">
              <Clock className="w-4 h-4 text-accent-cyan" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{event.summary}</p>
              <p className="text-text-secondary text-xs">
                {isAllDay(event.start, event.end) 
                  ? 'Ganztägig' 
                  : formatEventTime(event.start)
                }
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
