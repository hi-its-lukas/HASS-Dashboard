'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Lightbulb, Power, Settings, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useHAStore } from '@/lib/ha'
import { useConfig } from '@/lib/config/store'
import { cn } from '@/lib/utils'

interface HAArea {
  area_id: string
  name: string
}

interface HAEntity {
  entity_id: string
  area_id?: string
  device_id?: string
}

interface RoomGroup {
  id: string
  name: string
  lights: string[]
}

export default function LightsPage() {
  const config = useConfig()
  const states = useHAStore((s) => s.states)
  const callService = useHAStore((s) => s.callService)
  const [toggling, setToggling] = useState<string | null>(null)
  const [collapsedRooms, setCollapsedRooms] = useState<Record<string, boolean>>({})
  const [areas, setAreas] = useState<HAArea[]>([])
  const [entities, setEntities] = useState<HAEntity[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function fetchRegistries() {
      try {
        const res = await fetch('/api/ha/registries')
        if (res.ok) {
          const data = await res.json()
          setAreas(data.areas || [])
          setEntities(data.entities || [])
        }
      } catch (error) {
        console.error('Failed to fetch registries:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchRegistries()
  }, [])
  
  const roomLights = (config.rooms || [])
    .flatMap((r) => r.entityIds || [])
    .filter((id) => id.startsWith('light.'))
  
  const configuredLights = (config.lights || [])
    .map((l) => typeof l === 'string' ? l : l.entityId)
    .filter(Boolean)
  
  const lightEntities = [...roomLights, ...configuredLights]
  const uniqueLights = [...new Set(lightEntities)]
  
  const roomGroups = useMemo(() => {
    const areaMap = new Map(areas.map(a => [a.area_id, a.name]))
    const entityAreaMap = new Map(entities.map(e => [e.entity_id, e.area_id]))
    
    const groups: Record<string, string[]> = {}
    
    uniqueLights.forEach((entityId) => {
      const areaId = entityAreaMap.get(entityId)
      const areaName = areaId ? areaMap.get(areaId) : null
      const roomName = areaName || 'Sonstige'
      
      if (!groups[roomName]) {
        groups[roomName] = []
      }
      groups[roomName].push(entityId)
    })
    
    const sortedGroups = Object.entries(groups)
      .map(([name, lights]) => ({ id: name, name, lights }))
      .sort((a, b) => {
        if (a.name === 'Sonstige') return 1
        if (b.name === 'Sonstige') return -1
        return a.name.localeCompare(b.name, 'de')
      })
    
    return sortedGroups
  }, [uniqueLights, areas, entities])
  
  const handleToggle = async (entityId: string) => {
    const currentState = states[entityId]?.state
    setToggling(entityId)
    try {
      await callService('light', currentState === 'on' ? 'turn_off' : 'turn_on', entityId)
    } catch (error) {
      console.error('Failed to toggle light:', error)
    } finally {
      setToggling(null)
    }
  }
  
  const handleAllOff = async () => {
    setToggling('all')
    try {
      for (const entityId of uniqueLights) {
        if (states[entityId]?.state === 'on') {
          await callService('light', 'turn_off', entityId)
        }
      }
    } catch (error) {
      console.error('Failed to turn off all lights:', error)
    } finally {
      setToggling(null)
    }
  }
  
  const handleRoomToggle = async (roomLights: string[], turnOn: boolean) => {
    setToggling('room')
    try {
      for (const entityId of roomLights) {
        await callService('light', turnOn ? 'turn_on' : 'turn_off', entityId)
      }
    } catch (error) {
      console.error('Failed to toggle room lights:', error)
    } finally {
      setToggling(null)
    }
  }
  
  const toggleRoomCollapse = (roomName: string) => {
    setCollapsedRooms(prev => ({
      ...prev,
      [roomName]: !prev[roomName]
    }))
  }
  
  const onCount = uniqueLights.filter((id) => states[id]?.state === 'on').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-accent-yellow animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 safe-top max-w-7xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-yellow/20 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-accent-yellow" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Lichter</h1>
            <p className="text-xs text-text-secondary">
              {onCount} von {uniqueLights.length} an
            </p>
          </div>
        </div>
        
        {onCount > 0 && (
          <button
            onClick={handleAllOff}
            disabled={toggling === 'all'}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors disabled:opacity-50"
          >
            <Power className="w-4 h-4" />
            Alle aus
          </button>
        )}
      </motion.header>

      {uniqueLights.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <Lightbulb className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-text-secondary mb-2">Keine Lichter konfiguriert</p>
          <a 
            href="/settings" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan rounded-xl transition-colors"
          >
            <Settings className="w-4 h-4" />
            Zu den Einstellungen
          </a>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {roomGroups.map((room, roomIndex) => {
            const roomOnCount = room.lights.filter((id) => states[id]?.state === 'on').length
            const isCollapsed = collapsedRooms[room.name]
            
            return (
              <motion.section
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: roomIndex * 0.1 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => toggleRoomCollapse(room.name)}
                    className="flex items-center gap-2 text-white hover:text-accent-yellow transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                    <h2 className="text-lg font-semibold">{room.name}</h2>
                    <span className="text-sm text-text-muted">
                      ({roomOnCount}/{room.lights.length})
                    </span>
                  </button>
                  
                  <div className="flex gap-2">
                    {roomOnCount > 0 && (
                      <button
                        onClick={() => handleRoomToggle(room.lights, false)}
                        disabled={toggling === 'room'}
                        className="text-xs px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                      >
                        Aus
                      </button>
                    )}
                    {roomOnCount < room.lights.length && (
                      <button
                        onClick={() => handleRoomToggle(room.lights, true)}
                        disabled={toggling === 'room'}
                        className="text-xs px-3 py-1 bg-accent-yellow/20 hover:bg-accent-yellow/30 text-accent-yellow rounded-lg transition-colors disabled:opacity-50"
                      >
                        An
                      </button>
                    )}
                  </div>
                </div>
                
                {!isCollapsed && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {room.lights.map((entityId, index) => {
                      const state = states[entityId]
                      const isOn = state?.state === 'on'
                      const friendlyName = (state?.attributes?.friendly_name as string) || entityId.split('.')[1].replace(/_/g, ' ')
                      const brightness = state?.attributes?.brightness as number | undefined
                      const brightnessPercent = brightness ? Math.round((brightness / 255) * 100) : null
                      
                      return (
                        <motion.div
                          key={entityId}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.02 }}
                        >
                          <Card
                            hoverable
                            className={cn(
                              'p-4 cursor-pointer transition-all',
                              isOn && 'ring-2 ring-accent-yellow/50 bg-accent-yellow/10'
                            )}
                            onClick={() => handleToggle(entityId)}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <Lightbulb className={cn(
                                'w-6 h-6',
                                isOn ? 'text-accent-yellow' : 'text-gray-500'
                              )} />
                              <div className={cn(
                                'w-3 h-3 rounded-full',
                                isOn ? 'bg-accent-yellow' : 'bg-gray-600',
                                toggling === entityId && 'animate-pulse'
                              )} />
                            </div>
                            <p className="text-sm font-medium text-white truncate capitalize">
                              {friendlyName}
                            </p>
                            <p className="text-xs text-text-muted">
                              {isOn ? (brightnessPercent ? `${brightnessPercent}%` : 'An') : 'Aus'}
                            </p>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </motion.section>
            )
          })}
        </div>
      )}
    </div>
  )
}
