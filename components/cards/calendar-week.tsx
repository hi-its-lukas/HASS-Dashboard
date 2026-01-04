'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sun, Cloud, CloudRain, Snowflake, CloudSun, Wind, CloudFog } from 'lucide-react'
import { useHAStore } from '@/lib/ha'
import { cn } from '@/lib/utils'

interface CalendarEvent {
  summary: string
  start: string
  end: string
  allDay?: boolean
  calendarId?: string
}

interface DayForecast {
  date: Date
  tempHigh: number
  tempLow: number
  condition: string
}

const weatherIcons: Record<string, React.ReactNode> = {
  sunny: <Sun className="w-5 h-5 text-yellow-400" />,
  clear: <Sun className="w-5 h-5 text-yellow-400" />,
  'clear-night': <Sun className="w-5 h-5 text-yellow-400" />,
  cloudy: <Cloud className="w-5 h-5 text-gray-400" />,
  partlycloudy: <CloudSun className="w-5 h-5 text-gray-300" />,
  rainy: <CloudRain className="w-5 h-5 text-blue-400" />,
  snowy: <Snowflake className="w-5 h-5 text-blue-200" />,
  windy: <Wind className="w-5 h-5 text-gray-300" />,
  fog: <CloudFog className="w-5 h-5 text-gray-400" />,
}

const eventColors = [
  'bg-cyan-500/80',
  'bg-emerald-500/80',
  'bg-purple-500/80',
  'bg-orange-500/80',
  'bg-pink-500/80',
  'bg-blue-500/80',
  'bg-yellow-500/80',
]

const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']
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
  const [calendarColors, setCalendarColors] = useState<Record<string, string>>({})
  const states = useHAStore((s) => s.states)
  
  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() + weekOffset * 7)
  const weekDates = getWeekDates(baseDate)
  const currentMonth = monthNames[weekDates[0].getMonth()]
  
  useEffect(() => {
    const colors: Record<string, string> = {}
    calendarEntityIds.forEach((id, idx) => {
      colors[id] = eventColors[idx % eventColors.length]
    })
    setCalendarColors(colors)
  }, [calendarEntityIds])
  
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
  
  const getEventsForDate = (date: Date): (CalendarEvent & { color: string })[] => {
    const dateStr = date.toISOString().split('T')[0]
    const allEvents: (CalendarEvent & { color: string })[] = []
    
    Object.entries(events).forEach(([calendarId, calEvents]) => {
      calEvents.forEach((event) => {
        const eventDate = event.start.split('T')[0]
        if (eventDate === dateStr) {
          allEvents.push({
            ...event,
            calendarId,
            color: calendarColors[calendarId] || 'bg-cyan-500/80'
          })
        }
      })
    })
    
    return allEvents.sort((a, b) => {
      if (a.allDay && !b.allDay) return -1
      if (!a.allDay && b.allDay) return 1
      return new Date(a.start).getTime() - new Date(b.start).getTime()
    })
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
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
        {weekDates.map((date, idx) => {
          const forecast = getForecast(date)
          const dayEvents = getEventsForDate(date)
          const today = isToday(date)
          
          return (
            <motion.div
              key={date.toISOString()}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className={cn(
                'rounded-xl p-3 min-h-[140px] flex flex-col',
                today ? 'bg-white/15 ring-1 ring-cyan-500/50' : 'bg-white/5'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className={cn(
                    'text-3xl font-bold block',
                    today ? 'text-cyan-400' : 'text-white'
                  )}>
                    {date.getDate()}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {formatDayLabel(date)}
                  </span>
                </div>
                {forecast && (
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[10px] text-text-muted">
                      {forecast.tempLow.toFixed(0)}°C / {forecast.tempHigh.toFixed(0)}°C
                    </span>
                    {weatherIcons[forecast.condition] || <Cloud className="w-5 h-5 text-gray-400" />}
                  </div>
                )}
              </div>
              
              <div className="flex-1 space-y-1 overflow-hidden">
                {dayEvents.length > 0 ? (
                  dayEvents.slice(0, 3).map((event, i) => (
                    <div
                      key={i}
                      className={cn(
                        'rounded px-2 py-1 text-xs truncate',
                        event.color
                      )}
                    >
                      {event.allDay ? (
                        <span className="text-white font-medium">{event.summary}</span>
                      ) : (
                        <span className="text-white font-medium">{event.summary}</span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-text-muted">Keine Termine</p>
                )}
                {dayEvents.length > 3 && (
                  <p className="text-[10px] text-text-muted">+{dayEvents.length - 3} weitere</p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
