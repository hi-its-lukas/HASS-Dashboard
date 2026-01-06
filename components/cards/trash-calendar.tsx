'use client'

import { useEffect, useState, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { useNotificationsStore } from '@/lib/ui/notifications-store'

interface TrashEvent {
  summary: string
  start: string
  end: string
}

interface TrashCalendarProps {
  entityId?: string
  enableReminders?: boolean
}

const trashColors: Record<string, string> = {
  'restmüll': 'bg-gray-500',
  'restmuell': 'bg-gray-500',
  'rest': 'bg-gray-500',
  'bio': 'bg-green-600',
  'biomüll': 'bg-green-600',
  'biomuell': 'bg-green-600',
  'grün': 'bg-green-600',
  'gruen': 'bg-green-600',
  'papier': 'bg-blue-500',
  'altpapier': 'bg-blue-500',
  'blau': 'bg-blue-500',
  'gelb': 'bg-yellow-500',
  'gelber': 'bg-yellow-500',
  'wertstoff': 'bg-yellow-500',
  'plastik': 'bg-yellow-500',
  'glas': 'bg-emerald-500',
  'sperrmüll': 'bg-orange-500',
  'sperrmuell': 'bg-orange-500',
}

function getTrashColor(summary: string): string {
  const lower = summary.toLowerCase()
  for (const [key, color] of Object.entries(trashColors)) {
    if (lower.includes(key)) {
      return color
    }
  }
  return 'bg-purple-500'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const isToday = date.toDateString() === now.toDateString()
  const isTomorrow = date.toDateString() === tomorrow.toDateString()
  
  if (isToday) return 'Heute'
  if (isTomorrow) return 'Morgen'
  
  return date.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })
}

function getDaysUntil(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  date.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function TrashCalendar({ entityId, enableReminders = true }: TrashCalendarProps) {
  const [events, setEvents] = useState<TrashEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const notifiedEvents = useRef<Set<string>>(new Set())
  const showNotification = useNotificationsStore((s) => s.show)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchEvents = async () => {
      if (!entityId) {
        setLoading(false)
        return
      }

      try {
        const now = new Date()
        const endDate = new Date(now)
        endDate.setDate(endDate.getDate() + 14)

        const res = await fetch(
          `/api/ha/calendar?` +
          `start=${now.toISOString()}&end=${endDate.toISOString()}&entities=${encodeURIComponent(entityId)}`
        )
        
        if (res.ok) {
          const data = await res.json()
          const calEvents = data.events?.[entityId] || []
          const sortedEvents = calEvents
            .sort((a: TrashEvent, b: TrashEvent) => 
              new Date(a.start).getTime() - new Date(b.start).getTime()
            )
            .slice(0, 4)
          setEvents(sortedEvents)
        }
      } catch (error) {
        console.error('Error fetching trash calendar:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
    
    const interval = setInterval(fetchEvents, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [entityId])

  useEffect(() => {
    if (!enableReminders || !mounted || events.length === 0) return

    const checkForReminders = () => {
      const now = new Date()
      const currentHour = now.getHours()
      
      if (currentHour < 18 || currentHour > 21) return
      
      events.forEach((event) => {
        const daysUntil = getDaysUntil(event.start)
        const eventKey = `${event.summary}-${event.start}`
        
        if (daysUntil === 1 && !notifiedEvents.current.has(eventKey)) {
          notifiedEvents.current.add(eventKey)
          
          showNotification({
            title: 'Müllabfuhr morgen',
            message: `${event.summary} - Bitte Tonne rausstellen!`,
            severity: 'warning',
            tag: `trash-${event.summary}`,
          })
        }
        
        if (daysUntil === 0 && !notifiedEvents.current.has(eventKey + '-today')) {
          notifiedEvents.current.add(eventKey + '-today')
          
          showNotification({
            title: 'Müllabfuhr heute',
            message: `${event.summary} wird heute abgeholt!`,
            severity: 'critical',
            tag: `trash-today-${event.summary}`,
          })
        }
      })
    }

    checkForReminders()
    
    const interval = setInterval(checkForReminders, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [events, enableReminders, mounted, showNotification])

  if (!entityId) {
    return null
  }

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Trash2 className="w-4 h-4 text-accent-green" />
          <span className="text-white font-medium">Müllabfuhr</span>
        </div>
        <div className="glass-tile p-3 animate-pulse space-y-2">
          <div className="h-8 bg-white/10 rounded-lg" />
          <div className="h-8 bg-white/10 rounded-lg" />
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Trash2 className="w-4 h-4 text-accent-green" />
          <span className="text-white font-medium">Müllabfuhr</span>
        </div>
        <div className="glass-tile p-3">
          <p className="text-text-secondary text-sm">Keine Termine in den nächsten 2 Wochen</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Trash2 className="w-4 h-4 text-accent-green" />
        <span className="text-white font-medium">Müllabfuhr</span>
      </div>
      <div className="glass-tile p-3 space-y-2">
        {events.map((event, i) => {
          const daysUntil = mounted ? getDaysUntil(event.start) : 99
          const isUrgent = daysUntil <= 1
          
          return (
            <div 
              key={i} 
              className={`flex items-center gap-3 p-2 rounded-lg ${isUrgent ? 'bg-accent-orange/20' : 'bg-white/5'}`}
            >
              <div className={`w-3 h-3 rounded-full ${getTrashColor(event.summary)}`} />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{event.summary}</p>
              </div>
              <p className={`text-xs ${isUrgent ? 'text-accent-orange font-medium' : 'text-text-secondary'}`} suppressHydrationWarning>
                {mounted ? formatDate(event.start) : ''}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
