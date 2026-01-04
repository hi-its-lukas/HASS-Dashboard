'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sun, Cloud, CloudRain, Snowflake, CloudSun, Wind, CloudFog, Calendar } from 'lucide-react'
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
  sunny: <Sun className="w-4 h-4 text-yellow-400" />,
  clear: <Sun className="w-4 h-4 text-yellow-400" />,
  'clear-night': <Sun className="w-4 h-4 text-yellow-400" />,
  cloudy: <Cloud className="w-4 h-4 text-gray-400" />,
  partlycloudy: <CloudSun className="w-4 h-4 text-gray-300" />,
  rainy: <CloudRain className="w-4 h-4 text-blue-400" />,
  snowy: <Snowflake className="w-4 h-4 text-blue-200" />,
  windy: <Wind className="w-4 h-4 text-gray-300" />,
  fog: <CloudFog className="w-4 h-4 text-gray-400" />,
}

const eventColors = [
  'bg-cyan-500',
  'bg-emerald-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-blue-500',
  'bg-yellow-500',
]

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

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const states = useHAStore((s) => s.states)
  
  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() + weekOffset * 7)
  const weekDates = getWeekDates(baseDate)
  const currentMonth = monthNames[weekDates[3].getMonth()]
  const currentYear = weekDates[3].getFullYear()
  
  useEffect(() => {
    const colors: Record<string, string> = {}
    calendarEntityIds.forEach((id, idx) => {
      colors[id] = eventColors[idx % eventColors.length]
    })
    setCalendarColors(colors)
  }, [calendarEntityIds])
  
  useEffect(() => {
    async function loadForecast() {
      if (!weatherEntityId) return
      
      try {
        const res = await fetch(`/api/ha/weather?entity_id=${encodeURIComponent(weatherEntityId)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.forecast && Array.isArray(data.forecast)) {
            const dailyForecasts: DayForecast[] = data.forecast.slice(0, 7).map((f: {
              datetime: string
              temperature: number
              templow?: number
              condition: string
            }) => ({
              date: new Date(f.datetime),
              tempHigh: f.temperature,
              tempLow: f.templow ?? f.temperature - 5,
              condition: f.condition,
            }))
            setForecasts(dailyForecasts)
          }
        }
      } catch (e) {
        console.error('Failed to load weather forecast:', e)
      }
    }
    loadForecast()
  }, [weatherEntityId])
  
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
            color: calendarColors[calendarId] || 'bg-cyan-500'
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
  
  const allWeekEvents = weekDates.flatMap((date) => {
    const dayEvents = getEventsForDate(date)
    return dayEvents.map((event) => ({ ...event, date }))
  })
  
  const displayDate = selectedDate || new Date()
  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : allWeekEvents.slice(0, 5)
  
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-accent-cyan" />
          <div>
            <span className="text-lg font-semibold text-white">{currentMonth} {currentYear}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-text-muted" />
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => { setWeekOffset(0); setSelectedDate(null); }}
              className="px-3 py-1 text-xs bg-accent-cyan/20 text-accent-cyan rounded-lg hover:bg-accent-cyan/30 transition-colors"
            >
              Heute
            </button>
          )}
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-text-muted" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-2 mb-5">
        {weekDates.map((date, idx) => {
          const forecast = getForecast(date)
          const dayEvents = getEventsForDate(date)
          const today = isToday(date)
          const isSelected = selectedDate?.toDateString() === date.toDateString()
          
          return (
            <motion.button
              key={date.toISOString()}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
              onClick={() => setSelectedDate(isSelected ? null : date)}
              className={cn(
                'rounded-2xl p-3 flex flex-col items-center transition-all',
                today && !isSelected && 'bg-accent-cyan/20',
                isSelected && 'bg-white/20 ring-2 ring-white/30',
                !today && !isSelected && 'bg-white/5 hover:bg-white/10'
              )}
            >
              <span className="text-xs text-text-muted mb-1">{dayNamesShort[date.getDay()]}</span>
              <span className={cn(
                'text-2xl font-bold mb-1',
                today ? 'text-accent-cyan' : 'text-white'
              )}>
                {date.getDate()}
              </span>
              
              {forecast && (
                <div className="flex items-center gap-1 mb-1">
                  {weatherIcons[forecast.condition] || <Cloud className="w-4 h-4 text-gray-400" />}
                  <span className="text-[10px] text-text-muted">{forecast.tempHigh.toFixed(0)}°</span>
                </div>
              )}
              
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-1">
                  {dayEvents.slice(0, 3).map((_, i) => (
                    <div
                      key={i}
                      className={cn('w-1.5 h-1.5 rounded-full', dayEvents[i]?.color || 'bg-accent-cyan')}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[8px] text-text-muted ml-0.5">+{dayEvents.length - 3}</span>
                  )}
                </div>
              )}
            </motion.button>
          )
        })}
      </div>
      
      <div className="border-t border-white/10 pt-4">
        <h3 className="text-sm font-medium text-text-muted mb-3">
          {selectedDate 
            ? `${dayNamesShort[selectedDate.getDay()]}, ${selectedDate.getDate()}. ${monthNames[selectedDate.getMonth()]}`
            : 'Kommende Termine'
          }
        </h3>
        
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {selectedEvents.length > 0 ? (
            selectedEvents.map((event, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className={cn('w-1 h-full min-h-[40px] rounded-full', event.color)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{event.summary}</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {event.allDay ? 'Ganztägig' : formatTime(event.start)}
                    {'date' in event && (
                      <span className="ml-2 text-text-muted">
                        {(event as any).date.getDate()}. {monthNames[(event as any).date.getMonth()]}
                      </span>
                    )}
                  </p>
                </div>
              </motion.div>
            ))
          ) : (
            <p className="text-sm text-text-muted text-center py-4">Keine Termine</p>
          )}
        </div>
      </div>
    </div>
  )
}
