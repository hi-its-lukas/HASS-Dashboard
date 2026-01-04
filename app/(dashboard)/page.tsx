'use client'

import { motion } from 'framer-motion'
import { CalendarWeek } from '@/components/cards/calendar-week'
import { PersonLocationMap } from '@/components/cards/person-location-map'
import { CoverStatusBar } from '@/components/cards/cover-status-bar'
import { Avatar } from '@/components/ui/avatar'
import {
  useHAStore,
  useConnectionStatus,
} from '@/lib/ha'
import { useConfig, useConfigStore } from '@/lib/config/store'
import { Lightbulb, Blinds, Thermometer, Shield, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const config = useConfig()
  const configStore = useConfigStore()
  const { error } = useConnectionStatus()
  const states = useHAStore((s) => s.states)
  
  const coverEntityIds = config.rooms
    .flatMap((r) => r.entityIds)
    .filter((id) => id.startsWith('cover.'))
  
  const calendarEntityIds = configStore.config.calendars && configStore.config.calendars.length > 0
    ? configStore.config.calendars
    : Object.keys(states).filter((id) => id.startsWith('calendar.'))
  
  const lightEntities = Object.entries(states).filter(([id, state]) => 
    id.startsWith('light.') && state.state === 'on'
  )
  const lightsOnCount = lightEntities.length
  
  const coverStates = coverEntityIds.map(id => states[id]).filter(Boolean)
  const openCovers = coverStates.filter(s => s.state !== 'closed').length
  
  return (
    <div className="min-h-screen">
      <div className="px-4 py-6 safe-top max-w-7xl mx-auto">
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 p-3 rounded-xl text-sm"
            style={{ background: 'rgba(255, 69, 58, 0.2)', color: '#ff453a' }}
          >
            {error}
          </motion.div>
        )}
        
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-white mb-1">Home</h1>
          <p className="text-text-secondary text-sm">Willkommen zuhause</p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4"
        >
          <Link href="/lights" className="glass-pill flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-accent-yellow" />
            <span>{lightsOnCount} Lichter an</span>
          </Link>
          <Link href="/covers" className="glass-pill flex-shrink-0">
            <Blinds className="w-4 h-4 text-accent-blue" />
            <span>{openCovers} Rollos offen</span>
          </Link>
          <div className="glass-pill flex-shrink-0">
            <Thermometer className="w-4 h-4 text-accent-orange" />
            <span>Klima</span>
          </div>
          <div className="glass-pill flex-shrink-0">
            <Shield className="w-4 h-4 text-accent-green" />
            <span>Sicherheit</span>
          </div>
        </motion.div>
        
        <CoverStatusBar coverEntityIds={coverEntityIds} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2">
            <CalendarWeek
              calendarEntityIds={calendarEntityIds}
              weatherEntityId={configStore.config.weatherEntityId || config.weatherEntityId}
            />
          </div>
          
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Link href="/family" className="room-header">
                <span>Familie</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              {config.persons.length === 0 ? (
                <div className="card p-4 text-center">
                  <p className="text-text-secondary text-sm mb-2">Keine Personen konfiguriert</p>
                  <a href="/settings" className="text-accent-cyan hover:underline text-xs">
                    Zu den Einstellungen
                  </a>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {config.persons.map((person) => {
                    const state = states[person.entityId]
                    const isHome = state?.state === 'home'
                    const displayName = (state?.attributes?.friendly_name as string) || person.name
                    
                    return (
                      <div key={person.id} className="glass-tile flex-col items-center text-center py-4">
                        <div className="relative mb-2">
                          <Avatar name={displayName} size="lg" />
                          <div 
                            className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 ${isHome ? 'status-dot-on' : 'status-dot-off'}`}
                            style={{ borderColor: 'rgba(28, 28, 30, 0.8)' }}
                          />
                        </div>
                        <p className="font-medium text-white text-sm">{displayName}</p>
                        <p className="text-xs text-text-secondary">
                          {isHome ? 'Zuhause' : 'Unterwegs'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="h-[250px]"
            >
              <PersonLocationMap />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
