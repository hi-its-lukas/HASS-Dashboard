'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Blinds, ChevronUp, ChevronDown, Square, Settings, ChevronRight, Loader2 } from 'lucide-react'
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
  covers: string[]
}

export default function CoversPage() {
  const config = useConfig()
  const states = useHAStore((s) => s.states)
  const callService = useHAStore((s) => s.callService)
  const [activeAction, setActiveAction] = useState<string | null>(null)
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
  
  const roomCovers = (config.rooms || [])
    .flatMap((r) => r.entityIds || [])
    .filter((id) => id.startsWith('cover.'))
  
  const configuredCovers = (config.covers || [])
    .map((c) => typeof c === 'string' ? c : c.entityId)
    .filter(Boolean)
  
  const coverEntities = [...roomCovers, ...configuredCovers]
  const uniqueCovers = [...new Set(coverEntities)]
  
  const roomGroups = useMemo(() => {
    const areaMap = new Map(areas.map(a => [a.area_id, a.name]))
    const entityAreaMap = new Map(entities.map(e => [e.entity_id, e.area_id]))
    
    const groups: Record<string, string[]> = {}
    
    uniqueCovers.forEach((entityId) => {
      const areaId = entityAreaMap.get(entityId)
      const areaName = areaId ? areaMap.get(areaId) : null
      const roomName = areaName || 'Sonstige'
      
      if (!groups[roomName]) {
        groups[roomName] = []
      }
      groups[roomName].push(entityId)
    })
    
    const sortedGroups = Object.entries(groups)
      .map(([name, covers]) => ({ id: name, name, covers }))
      .sort((a, b) => {
        if (a.name === 'Sonstige') return 1
        if (b.name === 'Sonstige') return -1
        return a.name.localeCompare(b.name, 'de')
      })
    
    return sortedGroups
  }, [uniqueCovers, areas, entities])
  
  const handleAction = async (entityId: string, action: 'open' | 'close' | 'stop') => {
    setActiveAction(`${entityId}_${action}`)
    try {
      await callService('cover', `${action}_cover`, entityId)
    } catch (error) {
      console.error('Failed to control cover:', error)
    } finally {
      setActiveAction(null)
    }
  }
  
  const handleAllAction = async (action: 'open' | 'close') => {
    setActiveAction(`all_${action}`)
    try {
      for (const entityId of uniqueCovers) {
        await callService('cover', `${action}_cover`, entityId)
      }
    } catch (error) {
      console.error('Failed to control all covers:', error)
    } finally {
      setActiveAction(null)
    }
  }
  
  const handleRoomAction = async (roomCovers: string[], action: 'open' | 'close') => {
    setActiveAction(`room_${action}`)
    try {
      for (const entityId of roomCovers) {
        await callService('cover', `${action}_cover`, entityId)
      }
    } catch (error) {
      console.error('Failed to control room covers:', error)
    } finally {
      setActiveAction(null)
    }
  }
  
  const toggleRoomCollapse = (roomName: string) => {
    setCollapsedRooms(prev => ({
      ...prev,
      [roomName]: !prev[roomName]
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-accent-purple animate-spin" />
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
          <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center">
            <Blinds className="w-5 h-5 text-accent-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Rollos</h1>
            <p className="text-xs text-text-secondary">
              {uniqueCovers.length} Rollos
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => handleAllAction('open')}
            disabled={activeAction?.startsWith('all')}
            className="flex items-center gap-2 px-3 py-2 bg-accent-green/20 hover:bg-accent-green/30 text-accent-green rounded-xl transition-colors disabled:opacity-50"
          >
            <ChevronUp className="w-4 h-4" />
            Alle auf
          </button>
          <button
            onClick={() => handleAllAction('close')}
            disabled={activeAction?.startsWith('all')}
            className="flex items-center gap-2 px-3 py-2 bg-accent-orange/20 hover:bg-accent-orange/30 text-accent-orange rounded-xl transition-colors disabled:opacity-50"
          >
            <ChevronDown className="w-4 h-4" />
            Alle zu
          </button>
        </div>
      </motion.header>

      {uniqueCovers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <Blinds className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-text-secondary mb-2">Keine Rollos konfiguriert</p>
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
                    className="flex items-center gap-2 text-white hover:text-accent-purple transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                    <h2 className="text-lg font-semibold">{room.name}</h2>
                    <span className="text-sm text-text-muted">
                      ({room.covers.length})
                    </span>
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRoomAction(room.covers, 'open')}
                      disabled={activeAction?.startsWith('room')}
                      className="text-xs px-3 py-1 bg-accent-green/20 hover:bg-accent-green/30 text-accent-green rounded-lg transition-colors disabled:opacity-50"
                    >
                      Auf
                    </button>
                    <button
                      onClick={() => handleRoomAction(room.covers, 'close')}
                      disabled={activeAction?.startsWith('room')}
                      className="text-xs px-3 py-1 bg-accent-orange/20 hover:bg-accent-orange/30 text-accent-orange rounded-lg transition-colors disabled:opacity-50"
                    >
                      Zu
                    </button>
                  </div>
                </div>
                
                {!isCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {room.covers.map((entityId, index) => {
                      const state = states[entityId]
                      const position = state?.attributes?.current_position as number | undefined
                      const friendlyName = (state?.attributes?.friendly_name as string) || entityId.split('.')[1].replace(/_/g, ' ')
                      const isOpen = state?.state === 'open'
                      const isClosed = state?.state === 'closed'
                      
                      return (
                        <motion.div
                          key={entityId}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.02 }}
                        >
                          <Card className="p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <Blinds className={cn(
                                  'w-6 h-6',
                                  isOpen ? 'text-accent-green' : isClosed ? 'text-accent-orange' : 'text-accent-purple'
                                )} />
                                <div>
                                  <p className="text-sm font-medium text-white capitalize">
                                    {friendlyName}
                                  </p>
                                  <p className="text-xs text-text-muted">
                                    {position !== undefined ? `${position}%` : state?.state || 'Unbekannt'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {position !== undefined && (
                              <div className="mb-4">
                                <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-accent-purple transition-all"
                                    style={{ width: `${position}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAction(entityId, 'open')}
                                disabled={activeAction?.startsWith(entityId)}
                                className="flex-1 flex items-center justify-center gap-1 py-2 bg-accent-green/20 hover:bg-accent-green/30 text-accent-green rounded-lg transition-colors disabled:opacity-50"
                              >
                                <ChevronUp className="w-4 h-4" />
                                Auf
                              </button>
                              <button
                                onClick={() => handleAction(entityId, 'stop')}
                                disabled={activeAction?.startsWith(entityId)}
                                className="flex-1 flex items-center justify-center gap-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors disabled:opacity-50"
                              >
                                <Square className="w-3 h-3" />
                                Stop
                              </button>
                              <button
                                onClick={() => handleAction(entityId, 'close')}
                                disabled={activeAction?.startsWith(entityId)}
                                className="flex-1 flex items-center justify-center gap-1 py-2 bg-accent-orange/20 hover:bg-accent-orange/30 text-accent-orange rounded-lg transition-colors disabled:opacity-50"
                              >
                                <ChevronDown className="w-4 h-4" />
                                Zu
                              </button>
                            </div>
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
