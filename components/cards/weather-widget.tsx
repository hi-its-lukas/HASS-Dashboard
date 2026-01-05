'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, Droplets, Thermometer } from 'lucide-react'
import { useHAStore } from '@/lib/ha'

interface WeatherForecast {
  datetime: string
  condition: string
  temperature: number
  templow?: number
}

interface WeatherWidgetProps {
  weatherEntityId?: string
  temperatureSensorId?: string
}

const weatherIcons: Record<string, ReactNode> = {
  'sunny': <Sun className="w-8 h-8 text-yellow-400" />,
  'clear-night': <Sun className="w-8 h-8 text-yellow-200" />,
  'partlycloudy': <Cloud className="w-8 h-8 text-gray-300" />,
  'cloudy': <Cloud className="w-8 h-8 text-gray-400" />,
  'rainy': <CloudRain className="w-8 h-8 text-blue-400" />,
  'pouring': <CloudRain className="w-8 h-8 text-blue-500" />,
  'snowy': <CloudSnow className="w-8 h-8 text-white" />,
  'snowy-rainy': <CloudSnow className="w-8 h-8 text-blue-200" />,
  'lightning': <CloudLightning className="w-8 h-8 text-yellow-500" />,
  'lightning-rainy': <CloudLightning className="w-8 h-8 text-yellow-400" />,
  'windy': <Wind className="w-8 h-8 text-gray-300" />,
  'fog': <Cloud className="w-8 h-8 text-gray-500" />,
}

const conditionLabels: Record<string, string> = {
  'sunny': 'Sonnig',
  'clear-night': 'Klar',
  'partlycloudy': 'Teilweise bewölkt',
  'cloudy': 'Bewölkt',
  'rainy': 'Regen',
  'pouring': 'Starkregen',
  'snowy': 'Schnee',
  'snowy-rainy': 'Schneeregen',
  'lightning': 'Gewitter',
  'lightning-rainy': 'Gewitter mit Regen',
  'windy': 'Windig',
  'fog': 'Nebel',
}

export function WeatherWidget({ weatherEntityId, temperatureSensorId }: WeatherWidgetProps) {
  const states = useHAStore((s) => s.states)
  const [forecast, setForecast] = useState<WeatherForecast[]>([])
  const [loading, setLoading] = useState(false)
  
  const weatherState = weatherEntityId ? states[weatherEntityId] : null
  const tempSensorState = temperatureSensorId ? states[temperatureSensorId] : null
  
  const currentCondition = weatherState?.state || 'unknown'
  const currentTemp = weatherState?.attributes?.temperature as number | undefined
  const humidity = weatherState?.attributes?.humidity as number | undefined
  const windSpeed = weatherState?.attributes?.wind_speed as number | undefined
  const indoorTemp = tempSensorState?.state ? parseFloat(tempSensorState.state) : undefined
  const tempUnit = (tempSensorState?.attributes?.unit_of_measurement as string) || '°C'
  
  useEffect(() => {
    if (!weatherEntityId) return
    
    const fetchForecast = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/ha/weather?entity_id=${weatherEntityId}`)
        if (res.ok) {
          const data = await res.json()
          setForecast(data.forecast?.slice(0, 5) || [])
        }
      } catch (e) {
        console.error('Failed to fetch forecast:', e)
      } finally {
        setLoading(false)
      }
    }
    
    fetchForecast()
    const interval = setInterval(fetchForecast, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [weatherEntityId])
  
  if (!weatherEntityId) {
    return (
      <div className="glass-tile p-4 text-center">
        <p className="text-text-secondary text-sm">Wetter nicht konfiguriert</p>
        <a href="/settings" className="text-accent-cyan hover:underline text-xs">
          Einstellungen
        </a>
      </div>
    )
  }
  
  return (
    <div className="glass-tile p-4">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {weatherIcons[currentCondition] || <Cloud className="w-8 h-8 text-gray-400" />}
          <div>
            <p className="text-2xl font-bold text-white">
              {currentTemp !== undefined ? `${Math.round(currentTemp)}°` : '--°'}
            </p>
            <p className="text-text-secondary text-sm">
              {conditionLabels[currentCondition] || currentCondition}
            </p>
          </div>
        </div>
        
        {indoorTemp !== undefined && (
          <div className="text-right">
            <div className="flex items-center gap-1 text-accent-orange">
              <Thermometer className="w-4 h-4" />
              <span className="text-lg font-semibold">{Math.round(indoorTemp)}{tempUnit}</span>
            </div>
            <p className="text-text-secondary text-xs">Innen</p>
          </div>
        )}
      </div>
      
      <div className="flex gap-4 mb-4 text-sm">
        {humidity !== undefined && (
          <div className="flex items-center gap-1 text-text-secondary">
            <Droplets className="w-4 h-4 text-blue-400" />
            <span>{humidity}%</span>
          </div>
        )}
        {windSpeed !== undefined && (
          <div className="flex items-center gap-1 text-text-secondary">
            <Wind className="w-4 h-4 text-gray-400" />
            <span>{Math.round(windSpeed)} km/h</span>
          </div>
        )}
      </div>
      
      {forecast.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {forecast.map((day, i) => {
            const date = new Date(day.datetime)
            const dayName = i === 0 ? 'Heute' : date.toLocaleDateString('de-DE', { weekday: 'short' })
            const icon = weatherIcons[day.condition] || <Cloud className="w-5 h-5 text-gray-400" />
            
            return (
              <div key={i} className="flex-shrink-0 text-center p-2 bg-white/5 rounded-lg min-w-[60px]">
                <p className="text-text-secondary text-xs mb-1">{dayName}</p>
                <div className="flex justify-center mb-1 [&>svg]:w-5 [&>svg]:h-5">
                  {icon}
                </div>
                <p className="text-white text-sm font-medium">{Math.round(day.temperature)}°</p>
                {day.templow !== undefined && (
                  <p className="text-text-secondary text-xs">{Math.round(day.templow)}°</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
