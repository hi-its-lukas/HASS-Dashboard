'use client'

import { useState, useMemo, type ComponentType } from 'react'
import { motion } from 'framer-motion'
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudSnow, 
  CloudLightning, 
  Wind, 
  Droplets,
  Thermometer,
  TreePine,
  Flower2,
  AlertTriangle,
  ChevronRight,
  Moon
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useHAStore } from '@/lib/ha'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const WEATHER_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  'sunny': Sun,
  'clear': Sun,
  'partlycloudy': Cloud,
  'cloudy': Cloud,
  'rainy': CloudRain,
  'pouring': CloudRain,
  'snowy': CloudSnow,
  'snowy-rainy': CloudSnow,
  'fog': Cloud,
  'hail': CloudSnow,
  'lightning': CloudLightning,
  'lightning-rainy': CloudLightning,
  'windy': Wind,
  'windy-variant': Wind,
  'exceptional': AlertTriangle,
}

const POLLEN_LEVELS: Record<string, { label: string; color: string }> = {
  '0': { label: 'Keine', color: 'text-green-400' },
  '1': { label: 'Gering', color: 'text-green-400' },
  '2': { label: 'Niedrig', color: 'text-yellow-400' },
  '3': { label: 'Mittel', color: 'text-orange-400' },
  '4': { label: 'Hoch', color: 'text-red-400' },
  '5': { label: 'Sehr hoch', color: 'text-red-500' },
}

const CONDITION_TRANSLATIONS: Record<string, string> = {
  'sunny': 'Sonnig',
  'clear': 'Klar',
  'clear-night': 'Klare Nacht',
  'partlycloudy': 'Teilweise bewölkt',
  'cloudy': 'Bewölkt',
  'rainy': 'Regnerisch',
  'pouring': 'Starkregen',
  'snowy': 'Schnee',
  'snowy-rainy': 'Schneeregen',
  'fog': 'Nebel',
  'hail': 'Hagel',
  'lightning': 'Gewitter',
  'lightning-rainy': 'Gewitter mit Regen',
  'windy': 'Windig',
  'windy-variant': 'Windig',
  'exceptional': 'Außergewöhnlich',
}

function getPollenInfo(value: string | number | undefined) {
  const level = String(value || '0')
  return POLLEN_LEVELS[level] || POLLEN_LEVELS['0']
}

function getWeatherIcon(condition: string | undefined) {
  if (!condition) return Cloud
  const normalized = condition.toLowerCase().replace(/-/g, '').replace(/ /g, '')
  for (const [key, Icon] of Object.entries(WEATHER_ICONS)) {
    if (normalized.includes(key.replace(/-/g, ''))) {
      return Icon
    }
  }
  return Cloud
}

export default function WeatherPage() {
  const states = useHAStore((s) => s.states)
  const [activeTab, setActiveTab] = useState<'forecast' | 'pollen'>('forecast')
  
  const currentWeather = useMemo(() => {
    const condition = states['sensor.home_bedingung_tag_0']?.state
    const temperature = states['sensor.home_gefuhlte_temperatur']?.state
    const cloudCover = states['sensor.home_bewolkung']?.state
    const pressure = states['sensor.home_druck']?.state
    
    return {
      condition: condition || 'unknown',
      conditionText: CONDITION_TRANSLATIONS[condition?.toLowerCase() || ''] || condition || 'Unbekannt',
      temperature: temperature ? parseFloat(temperature) : null,
      cloudCover: cloudCover ? parseInt(cloudCover) : null,
      pressure: pressure ? parseFloat(pressure) : null,
    }
  }, [states])
  
  const forecast = useMemo(() => {
    const days = []
    const dayNames = ['Heute', 'Morgen', 'Übermorgen', 'In 3 Tagen', 'In 4 Tagen']
    
    for (let i = 0; i <= 4; i++) {
      const dayCondition = states[`sensor.home_bedingung_tag_${i}`]?.state
      const nightCondition = states[`sensor.home_bedingung_nacht_${i}`]?.state
      const dayCloud = states[`sensor.home_bewolkung_tag_${i}`]?.state
      const nightCloud = states[`sensor.home_bewolkung_nacht_${i}`]?.state
      const dayThunder = states[`sensor.home_gewitterwahrscheinlichkeit_tag_${i}`]?.state
      const nightThunder = states[`sensor.home_gewitterwahrscheinlichkeit_nacht_${i}`]?.state
      
      days.push({
        day: i,
        name: dayNames[i],
        dayCondition: dayCondition || 'unknown',
        dayConditionText: CONDITION_TRANSLATIONS[dayCondition?.toLowerCase() || ''] || dayCondition || '-',
        nightCondition: nightCondition || 'unknown',
        nightConditionText: CONDITION_TRANSLATIONS[nightCondition?.toLowerCase() || ''] || nightCondition || '-',
        dayCloudCover: dayCloud ? parseInt(dayCloud) : null,
        nightCloudCover: nightCloud ? parseInt(nightCloud) : null,
        dayThunderChance: dayThunder ? parseInt(dayThunder) : 0,
        nightThunderChance: nightThunder ? parseInt(nightThunder) : 0,
      })
    }
    
    return days
  }, [states])
  
  const pollenForecast = useMemo(() => {
    const types = [
      { id: 'graserpollen', name: 'Gräser', icon: Flower2 },
      { id: 'baumpollen', name: 'Bäume', icon: TreePine },
      { id: 'ambrosiapollen', name: 'Ambrosia', icon: Flower2 },
    ]
    
    return types.map(type => {
      const days = []
      for (let i = 0; i <= 4; i++) {
        const value = states[`sensor.home_${type.id}_tag_${i}`]?.state
        days.push({
          day: i,
          value: value || '0',
          ...getPollenInfo(value)
        })
      }
      return { ...type, days }
    })
  }, [states])
  
  const CurrentWeatherIcon = getWeatherIcon(currentWeather.condition)
  
  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Wetter</h1>
          <p className="text-text-muted text-sm">AccuWeather Vorhersage</p>
        </div>
        <Link href="/" className="text-text-muted hover:text-white transition-colors">
          <ChevronRight className="w-6 h-6 rotate-180" />
        </Link>
      </div>
      
      <Card className="glass-card p-6">
        <div className="flex items-center gap-6">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
            <CurrentWeatherIcon className="w-16 h-16 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              {currentWeather.temperature !== null && (
                <span className="text-5xl font-light text-white">
                  {Math.round(currentWeather.temperature)}°
                </span>
              )}
              <span className="text-xl text-text-muted">C</span>
            </div>
            <p className="text-lg text-white mt-1">{currentWeather.conditionText}</p>
          </div>
          <div className="text-right space-y-1">
            {currentWeather.cloudCover !== null && (
              <div className="flex items-center gap-2 text-text-muted text-sm">
                <Cloud className="w-4 h-4" />
                <span>{currentWeather.cloudCover}% Bewölkung</span>
              </div>
            )}
            {currentWeather.pressure !== null && (
              <div className="flex items-center gap-2 text-text-muted text-sm">
                <Droplets className="w-4 h-4" />
                <span>{currentWeather.pressure} hPa</span>
              </div>
            )}
          </div>
        </div>
      </Card>
      
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('forecast')}
          className={cn(
            "px-4 py-2 rounded-xl font-medium transition-colors",
            activeTab === 'forecast'
              ? "bg-white/20 text-white"
              : "bg-white/5 text-text-muted hover:bg-white/10"
          )}
        >
          5-Tage Vorhersage
        </button>
        <button
          onClick={() => setActiveTab('pollen')}
          className={cn(
            "px-4 py-2 rounded-xl font-medium transition-colors",
            activeTab === 'pollen'
              ? "bg-white/20 text-white"
              : "bg-white/5 text-text-muted hover:bg-white/10"
          )}
        >
          Pollenflug
        </button>
      </div>
      
      {activeTab === 'forecast' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-3"
        >
          {forecast.map((day) => {
            const DayIcon = getWeatherIcon(day.dayCondition)
            const NightIcon = getWeatherIcon(day.nightCondition)
            
            return (
              <Card key={day.day} className="glass-card p-4">
                <div className="flex items-center gap-4">
                  <div className="w-24">
                    <span className="text-white font-medium">{day.name}</span>
                  </div>
                  
                  <div className="flex-1 flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <Sun className="w-4 h-4 text-yellow-400" />
                      <div className="p-2 rounded-xl bg-white/5">
                        <DayIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-white text-sm">{day.dayConditionText}</p>
                        {day.dayCloudCover !== null && (
                          <p className="text-text-muted text-xs">{day.dayCloudCover}% Wolken</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Moon className="w-4 h-4 text-blue-300" />
                      <div className="p-2 rounded-xl bg-white/5">
                        <NightIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-white text-sm">{day.nightConditionText}</p>
                        {day.nightCloudCover !== null && (
                          <p className="text-text-muted text-xs">{day.nightCloudCover}% Wolken</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {(day.dayThunderChance > 0 || day.nightThunderChance > 0) && (
                    <div className="flex items-center gap-2 text-yellow-400">
                      <CloudLightning className="w-5 h-5" />
                      <span className="text-sm font-medium">
                        {Math.max(day.dayThunderChance, day.nightThunderChance)}%
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </motion.div>
      )}
      
      {activeTab === 'pollen' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {pollenForecast.map((type) => {
            const TypeIcon = type.icon
            
            return (
              <Card key={type.id} className="glass-card p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-xl bg-green-500/20">
                    <TypeIcon className="w-5 h-5 text-green-400" />
                  </div>
                  <h3 className="text-white font-medium">{type.name}</h3>
                </div>
                
                <div className="grid grid-cols-5 gap-2">
                  {type.days.map((day, i) => (
                    <div key={i} className="text-center">
                      <p className="text-text-muted text-xs mb-1">
                        {i === 0 ? 'Heute' : i === 1 ? 'Morgen' : `+${i}`}
                      </p>
                      <div className={cn(
                        "py-2 px-3 rounded-xl bg-white/5",
                        day.color
                      )}>
                        <span className="text-sm font-medium">{day.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )
          })}
          
          <Card className="glass-card p-4">
            <h3 className="text-white font-medium mb-3">Pollen-Legende</h3>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {Object.entries(POLLEN_LEVELS).map(([level, info]) => (
                <div key={level} className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", info.color.replace('text-', 'bg-'))} />
                  <span className="text-text-muted">{level}: {info.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
