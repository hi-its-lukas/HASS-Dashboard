'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CalendarWeek } from '@/components/cards/calendar-week'
import { PersonLocationMap } from '@/components/cards/person-location-map'
import { CoverStatusBar } from '@/components/cards/cover-status-bar'
import { PersonCard } from '@/components/cards/person-card'
import { Avatar } from '@/components/ui/avatar'
import { Card } from '@/components/ui/card'
import {
  useHAStore,
  useConnectionStatus,
} from '@/lib/ha'
import { useConfig, useConfigStore } from '@/lib/config/store'

export default function HomePage() {
  const config = useConfig()
  const configStore = useConfigStore()
  const { connected, connecting, error } = useConnectionStatus()
  const states = useHAStore((s) => s.states)
  
  const homePersons = config.persons.filter(
    (p) => states[p.entityId]?.state === 'home'
  )
  
  const coverEntityIds = config.rooms
    .flatMap((r) => r.entityIds)
    .filter((id) => id.startsWith('cover.'))
  
  const calendarEntityIds = configStore.config.calendars && configStore.config.calendars.length > 0
    ? configStore.config.calendars
    : Object.keys(states).filter((id) => id.startsWith('calendar.'))
  
  const backgroundUrl = configStore.config.backgroundUrl
  
  return (
    <div 
      className="min-h-screen relative"
      style={{
        backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {backgroundUrl && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      )}
      
      <div className="relative px-4 py-6 safe-top max-w-7xl mx-auto">
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 p-3 bg-accent-red/20 rounded-xl text-accent-red text-sm"
          >
            {error}
          </motion.div>
        )}
        
        <CoverStatusBar coverEntityIds={coverEntityIds} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CalendarWeek
              calendarEntityIds={calendarEntityIds}
              weatherEntityId={configStore.config.weatherEntityId || config.weatherEntityId}
            />
          </div>
          
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
                Familie
              </h3>
              {config.persons.length === 0 ? (
                <Card className="p-4 text-center">
                  <p className="text-text-secondary text-sm mb-2">Keine Personen konfiguriert</p>
                  <a href="/settings" className="text-accent-cyan hover:underline text-xs">
                    Zu den Einstellungen
                  </a>
                </Card>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {config.persons.map((person) => {
                    const state = states[person.entityId]
                    const isHome = state?.state === 'home'
                    const displayName = (state?.attributes?.friendly_name as string) || person.name
                    
                    return (
                      <Card key={person.id} className="p-3 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="relative">
                            <Avatar name={displayName} size="lg" />
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-bg-card ${isHome ? 'bg-accent-green' : 'bg-text-muted'}`} />
                          </div>
                          <div>
                            <p className="font-medium text-white text-sm">{displayName}</p>
                            <p className="text-xs text-text-secondary">
                              {isHome ? 'Zuhause' : 'Unterwegs'}
                            </p>
                          </div>
                        </div>
                      </Card>
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
