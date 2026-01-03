'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Lightbulb, Power, Settings, ChevronDown, ChevronRight, Palette } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useHAStore } from '@/lib/ha'
import { useConfig } from '@/lib/config/store'
import { cn } from '@/lib/utils'

interface RoomGroup {
  id: string
  name: string
  lights: string[]
}

const COLOR_PRESETS = [
  { name: 'Warmweiß', rgb: [255, 180, 107], kelvin: 2700 },
  { name: 'Neutralweiß', rgb: [255, 228, 206], kelvin: 4000 },
  { name: 'Kaltweiß', rgb: [255, 255, 255], kelvin: 6500 },
  { name: 'Rot', rgb: [255, 0, 0] },
  { name: 'Orange', rgb: [255, 165, 0] },
  { name: 'Gelb', rgb: [255, 255, 0] },
  { name: 'Grün', rgb: [0, 255, 0] },
  { name: 'Cyan', rgb: [0, 255, 255] },
  { name: 'Blau', rgb: [0, 0, 255] },
  { name: 'Lila', rgb: [128, 0, 255] },
  { name: 'Pink', rgb: [255, 0, 128] },
]

export default function LightsPage() {
  const config = useConfig()
  const states = useHAStore((s) => s.states)
  const callService = useHAStore((s) => s.callService)
  const getEntityArea = useHAStore((s) => s.getEntityArea)
  const [toggling, setToggling] = useState<string | null>(null)
  const [collapsedRooms, setCollapsedRooms] = useState<Record<string, boolean>>({})
  const [colorPickerOpen, setColorPickerOpen] = useState<string | null>(null)
  
  const roomLights = (config.rooms || [])
    .flatMap((r) => r.entityIds || [])
    .filter((id) => id.startsWith('light.'))
  
  const configuredLights = (config.lights || [])
    .map((l) => typeof l === 'string' ? l : l.entityId)
    .filter(Boolean)
  
  const lightEntities = [...roomLights, ...configuredLights]
  const uniqueLights = [...new Set(lightEntities)]
  
  const roomGroups = useMemo(() => {
    const groups: Record<string, string[]> = {}
    
    uniqueLights.forEach((entityId) => {
      const areaName = getEntityArea(entityId) || 'Sonstige'
      
      if (!groups[areaName]) {
        groups[areaName] = []
      }
      groups[areaName].push(entityId)
    })
    
    const sortedGroups = Object.entries(groups)
      .map(([name, lights]) => ({ id: name, name, lights }))
      .sort((a, b) => {
        if (a.name === 'Sonstige') return 1
        if (b.name === 'Sonstige') return -1
        return a.name.localeCompare(b.name, 'de')
      })
    
    return sortedGroups
  }, [uniqueLights, getEntityArea])
  
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
  
  const handleColorChange = async (entityId: string, color: typeof COLOR_PRESETS[0]) => {
    setToggling(entityId)
    try {
      if (color.kelvin) {
        await callService('light', 'turn_on', entityId, { color_temp_kelvin: color.kelvin })
      } else {
        await callService('light', 'turn_on', entityId, { rgb_color: color.rgb })
      }
    } catch (error) {
      console.error('Failed to change color:', error)
    } finally {
      setToggling(null)
      setColorPickerOpen(null)
    }
  }
  
  const handleBrightnessChange = async (entityId: string, brightness: number) => {
    try {
      await callService('light', 'turn_on', entityId, { brightness: Math.round(brightness * 2.55) })
    } catch (error) {
      console.error('Failed to change brightness:', error)
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
  
  const supportsColor = (state: any) => {
    const colorModes = state?.attributes?.supported_color_modes as string[] | undefined
    if (!colorModes) return false
    return colorModes.some(mode => ['rgb', 'rgbw', 'rgbww', 'hs', 'xy'].includes(mode))
  }
  
  const supportsColorTemp = (state: any) => {
    const colorModes = state?.attributes?.supported_color_modes as string[] | undefined
    if (!colorModes) return false
    return colorModes.some(mode => ['color_temp'].includes(mode))
  }
  
  const getCurrentColor = (state: any): string => {
    const rgb = state?.attributes?.rgb_color as [number, number, number] | undefined
    if (rgb) {
      return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
    }
    return '#ffa500'
  }
  
  const onCount = uniqueLights.filter((id) => states[id]?.state === 'on').length

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
                      const hasColor = supportsColor(state)
                      const hasColorTemp = supportsColorTemp(state)
                      const isColorPickerOpen = colorPickerOpen === entityId
                      
                      return (
                        <motion.div
                          key={entityId}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.02 }}
                        >
                          <Card
                            className={cn(
                              'p-4 transition-all relative',
                              isOn && 'ring-2 ring-accent-yellow/50 bg-accent-yellow/10'
                            )}
                          >
                            <div 
                              className="flex items-center justify-between mb-3 cursor-pointer"
                              onClick={() => handleToggle(entityId)}
                            >
                              <Lightbulb 
                                className={cn('w-6 h-6', isOn ? 'text-accent-yellow' : 'text-gray-500')} 
                                style={isOn && hasColor ? { color: getCurrentColor(state) } : undefined}
                              />
                              <div className="flex items-center gap-2">
                                {(hasColor || hasColorTemp) && isOn && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setColorPickerOpen(isColorPickerOpen ? null : entityId)
                                    }}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                  >
                                    <Palette className="w-4 h-4 text-text-secondary hover:text-white" />
                                  </button>
                                )}
                                <div className={cn(
                                  'w-3 h-3 rounded-full',
                                  isOn ? 'bg-accent-yellow' : 'bg-gray-600',
                                  toggling === entityId && 'animate-pulse'
                                )} />
                              </div>
                            </div>
                            <p className="text-sm font-medium text-white truncate capitalize">
                              {friendlyName}
                            </p>
                            <p className="text-xs text-text-muted">
                              {isOn ? (brightnessPercent ? `${brightnessPercent}%` : 'An') : 'Aus'}
                            </p>
                            
                            {isOn && brightnessPercent !== null && (
                              <div className="mt-3">
                                <input
                                  type="range"
                                  min="1"
                                  max="100"
                                  value={brightnessPercent}
                                  onChange={(e) => handleBrightnessChange(entityId, parseInt(e.target.value))}
                                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent-yellow"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            )}
                            
                            {isColorPickerOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute top-full left-0 right-0 mt-2 p-3 bg-bg-card border border-white/10 rounded-xl shadow-xl z-50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="grid grid-cols-4 gap-2">
                                  {COLOR_PRESETS.map((color) => (
                                    <button
                                      key={color.name}
                                      onClick={() => handleColorChange(entityId, color)}
                                      className="group flex flex-col items-center gap-1 p-2 hover:bg-white/5 rounded-lg transition-colors"
                                      title={color.name}
                                    >
                                      <div
                                        className="w-6 h-6 rounded-full border-2 border-white/20 group-hover:border-white/40 transition-colors"
                                        style={{ backgroundColor: `rgb(${color.rgb.join(',')})` }}
                                      />
                                      <span className="text-[10px] text-text-muted truncate w-full text-center">
                                        {color.name}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
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
