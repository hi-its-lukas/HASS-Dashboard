'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sun, Cloud, CloudRain, Snowflake, CloudSun } from 'lucide-react'
import { useHAStore } from '@/lib/ha'
import { cn } from '@/lib/utils'

interface CalendarEvent {
  summary: string
  start: string
  end: string
  allDay?: boolean
}

interface DayForecast {
  date: Date
  tempHigh: number
  tempLow: number
  condition: string
}

const weatherIcons: Record<string, React.ReactNode> = {
  sunny: <Sun className="w-4 h-4 text-yellow-400" />,
  clear: <Sun className="w-4 h-4 text-yellow-400" />,
  'clear-night': <Sun className="w-4 h-4 text-yellow-400" />,
  cloudy: <Cloud className="w-4 h-4 text-gray-400" />,
  partlycloudy: <CloudSun className="w-4 h-4 text-gray-300" />,
  rainy: <CloudRain className="w-4 h-4 text-blue-400" />,
  snowy: <Snowflake className="w-4 h-4 text-blue-200" />,
}

const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
const dayNamesShort = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']

function getWeekDates(baseDate: Date): Date[] {
  const dates: Date[] = []
  const current = new Date(baseDate)
  current.setHours(0, 0, 0, 0)
  
  for (let i = 0; i < 7; i++) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

function isToday(date: Date): boolean {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

function formatDayLabel(date: Date): string {
  if (isToday(date)) return 'Heute'
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (date.toDateString() === tomorrow.toDateString()) return 'Morgen'
  return dayNames[date.getDay()]
}

interface CalendarWeekProps {
  calendarEntityIds?: string[]
  weatherEntityId?: string
}

export function CalendarWeek({ calendarEntityIds = [], weatherEntityId }: CalendarWeekProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [events, setEvents] = useState<Record<string, CalendarEvent[]>>({})
  const [forecasts, setForecasts] = useState<DayForecast[]>([])
  const states = useHAStore((s) => s.states)
  
  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() + weekOffset * 7)
  const weekDates = getWeekDates(baseDate)
  const currentMonth = monthNames[weekDates[0].getMonth()]
  
  useEffect(() => {
    if (weatherEntityId && states[weatherEntityId]) {
      const weather = states[weatherEntityId]
      const forecast = weather.attributes?.forecast as Array<{
        datetime: string
        temperature: number
        templow?: number
        condition: string
      }> | undefined
      
      if (forecast) {
        const dailyForecasts: DayForecast[] = forecast.slice(0, 7).map((f) => ({
          date: new Date(f.datetime),
          tempHigh: f.temperature,
          tempLow: f.templow ?? f.temperature - 5,
          condition: f.condition,
        }))
        setForecasts(dailyForecasts)
      }
    }
  }, [weatherEntityId, states])
  
  useEffect(() => {
    async function loadEvents() {
      if (calendarEntityIds.length === 0) return
      
      try {
        const start = weekDates[0].toISOString()
        const end = new Date(weekDates[6])
        end.setDate(end.getDate() + 1)
        
        const res = await fetch(`/api/ha/calendar?start=${start}&end=${end.toISOString()}&entities=${calendarEntityIds.join(',')}`)
        if (res.ok) {
          const data = await res.json()
          setEvents(data.events || {})
        }
      } catch (e) {
        console.error('Failed to load calendar events:', e)
      }
    }
    loadEvents()
  }, [calendarEntityIds, weekOffset])
  
  const getForecast = (date: Date): DayForecast | undefined => {
    return forecasts.find((f) => f.date.toDateString() === date.toDateString())
  }
  
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = date.toISOString().split('T')[0]
    const allEvents: CalendarEvent[] = []
    
    Object.values(events).forEach((calEvents) => {
      calEvents.forEach((event) => {
        const eventDate = event.start.split('T')[0]
        if (eventDate === dateStr) {
          allEvents.push(event)
        }
      })
    })
    
    return allEvents
  }
  
  return (
    <div className="card p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekOffset(weekOffset - 1)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-text-muted" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-white">{currentMonth}</span>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs text-accent-cyan hover:underline"
            >
              Heute
            </button>
          )}
        </div>
        <button
          onClick={() => setWeekOffset(weekOffset + 1)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-text-muted" />
        </button>
      </div>
      
      <div className="space-y-3">
        {weekDates.map((date, idx) => {
          const forecast = getForecast(date)
          const dayEvents = getEventsForDate(date)
          const today = isToday(date)
          
          return (
            <motion.div
              key={date.toISOString()}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                'rounded-xl p-3',
                today ? 'bg-white/10' : 'bg-white/5'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-baseline gap-2">
                  <span className={cn(
                    'text-2xl font-bold',
                    today ? 'text-accent-cyan' : 'text-white'
                  )}>
                    {date.getDate()}
                  </span>
                  <span className="text-sm text-text-secondary">
                    {formatDayLabel(date)}
                  </span>
                </div>
                {forecast && (
                  <div className="flex items-center gap-2 text-xs text-text-secondary">
                    <span>{forecast.tempLow.toFixed(1)}°C / {forecast.tempHigh.toFixed(1)}°C</span>
                    {weatherIcons[forecast.condition] || <Cloud className="w-4 h-4" />}
                  </div>
                )}
              </div>
              
              {dayEvents.length > 0 ? (
                <div className="space-y-1">
                  {dayEvents.map((event, i) => (
                    <div
                      key={i}
                      className="bg-white/10 rounded-lg px-3 py-2 text-sm"
                    >
                      <span className="text-text-muted text-xs">
                        {event.allDay ? 'Ganztägig' : new Date(event.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <p className="text-white font-medium truncate">{event.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted">Keine Termine</p>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
