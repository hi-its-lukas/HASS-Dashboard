'use client'

import { motion } from 'framer-motion'
import { PersonLocationMap } from '@/components/cards/person-location-map'
import { Avatar } from '@/components/ui/avatar'
import {
  useHAStore,
  useConnectionStatus,
} from '@/lib/ha'
import { useConfig, useConfigStore } from '@/lib/config/store'
import { Lightbulb, Blinds, Thermometer, Calendar, ChevronRight, MapPin } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const config = useConfig()
  const configStore = useConfigStore()
  const { error } = useConnectionStatus()
  const states = useHAStore((s) => s.states)
  
  const coverEntityIds = config.rooms
    .flatMap((r) => r.entityIds)
    .filter((id) => id.startsWith('cover.'))
  
  const lightEntities = Object.entries(states).filter(([id, state]) => 
    id.startsWith('light.') && state.state === 'on'
  )
  const lightsOnCount = lightEntities.length
  
  const coverStates = coverEntityIds.map(id => states[id]).filter(Boolean)
  const openCovers = coverStates.filter(s => s.state !== 'closed').length
  
  const personsAtHome = config.persons.filter(p => {
    const state = states[p.entityId]
    return state?.state === 'home'
  }).length

  return (
    <div className="min-h-screen pb-24">
      <div className="px-4 pt-4 pb-6 safe-top">
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-3 p-3 rounded-xl text-sm"
            style={{ background: 'rgba(255, 69, 58, 0.2)', color: '#ff453a' }}
          >
            {error}
          </motion.div>
        )}
        
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <h1 className="text-xl font-bold text-white">Home</h1>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3 mb-4"
        >
          <Link href="/lights" className="glass-tile p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-yellow/20 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-accent-yellow" />
              </div>
              <div>
                <p className="text-white font-medium text-lg">{lightsOnCount}</p>
                <p className="text-text-secondary text-xs">Lichter an</p>
              </div>
            </div>
          </Link>
          
          <Link href="/covers" className="glass-tile p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center">
                <Blinds className="w-5 h-5 text-accent-blue" />
              </div>
              <div>
                <p className="text-white font-medium text-lg">{openCovers}</p>
                <p className="text-text-secondary text-xs">Rollos offen</p>
              </div>
            </div>
          </Link>
          
          <Link href="/climate" className="glass-tile p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-orange/20 flex items-center justify-center">
                <Thermometer className="w-5 h-5 text-accent-orange" />
              </div>
              <div>
                <p className="text-white font-medium text-lg">Klima</p>
                <p className="text-text-secondary text-xs">Steuerung</p>
              </div>
            </div>
          </Link>
          
          <Link href="/calendar" className="glass-tile p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent-cyan/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-accent-cyan" />
              </div>
              <div>
                <p className="text-white font-medium text-lg">Kalender</p>
                <p className="text-text-secondary text-xs">Termine</p>
              </div>
            </div>
          </Link>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <Link href="/family" className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent-green" />
              <span className="text-white font-medium">Familie</span>
              <span className="text-text-secondary text-sm">({personsAtHome} zuhause)</span>
            </div>
            <ChevronRight className="w-4 h-4 text-text-secondary" />
          </Link>
          
          {config.persons.length === 0 ? (
            <div className="glass-tile p-4 text-center">
              <p className="text-text-secondary text-sm mb-2">Keine Personen konfiguriert</p>
              <Link href="/settings" className="text-accent-cyan hover:underline text-xs">
                Einstellungen
              </Link>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {config.persons.map((person) => {
                const state = states[person.entityId]
                const isHome = state?.state === 'home'
                const displayName = (state?.attributes?.friendly_name as string) || person.name
                
                return (
                  <div key={person.id} className="glass-tile flex-shrink-0 flex-col items-center text-center p-3 min-w-[80px]">
                    <div className="relative mb-1">
                      <Avatar name={displayName} size="md" />
                      <div 
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${isHome ? 'bg-accent-green' : 'bg-gray-500'}`}
                        style={{ borderColor: 'rgba(28, 28, 30, 0.8)' }}
                      />
                    </div>
                    <p className="font-medium text-white text-xs truncate max-w-[70px]">{displayName}</p>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="h-[200px] rounded-2xl overflow-hidden"
        >
          <PersonLocationMap />
        </motion.div>
      </div>
    </div>
  )
}
