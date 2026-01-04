'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Thermometer, Fan, Snowflake, Flame, Power, Settings, ChevronDown, ChevronRight, Plus, Minus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useHAStore } from '@/lib/ha'
import { cn } from '@/lib/utils'

interface ClimateDevice {
  entityId: string
  type: 'climate' | 'fan'
}

export default function ClimatePage() {
  const states = useHAStore((s) => s.states)
  const callService = useHAStore((s) => s.callService)
  const getEntityArea = useHAStore((s) => s.getEntityArea)
  const [toggling, setToggling] = useState<string | null>(null)
  const [collapsedRooms, setCollapsedRooms] = useState<Record<string, boolean>>({})
  
  const climateEntities = Object.keys(states).filter(id => id.startsWith('climate.'))
  const fanEntities = Object.keys(states).filter(id => id.startsWith('fan.'))
  
  const allDevices: ClimateDevice[] = [
    ...climateEntities.map(id => ({ entityId: id, type: 'climate' as const })),
    ...fanEntities.map(id => ({ entityId: id, type: 'fan' as const })),
  ]
  
  const roomGroups = useMemo(() => {
    const groups: Record<string, ClimateDevice[]> = {}
    
    allDevices.forEach((device) => {
      const areaName = getEntityArea(device.entityId) || 'Sonstige'
      
      if (!groups[areaName]) {
        groups[areaName] = []
      }
      groups[areaName].push(device)
    })
    
    return Object.entries(groups)
      .map(([name, devices]) => ({ id: name, name, devices }))
      .sort((a, b) => {
        if (a.name === 'Sonstige') return 1
        if (b.name === 'Sonstige') return -1
        return a.name.localeCompare(b.name, 'de')
      })
  }, [allDevices, getEntityArea])
  
  const handleToggle = async (entityId: string, type: 'climate' | 'fan') => {
    const currentState = states[entityId]?.state
    setToggling(entityId)
    try {
      if (type === 'climate') {
        if (currentState === 'off') {
          await callService('climate', 'turn_on', entityId)
        } else {
          await callService('climate', 'turn_off', entityId)
        }
      } else {
        await callService('fan', currentState === 'on' ? 'turn_off' : 'turn_on', entityId)
      }
    } catch (error) {
      console.error('Failed to toggle device:', error)
    } finally {
      setToggling(null)
    }
  }
  
  const handleSetTemperature = async (entityId: string, temperature: number) => {
    try {
      await callService('climate', 'set_temperature', entityId, { temperature })
    } catch (error) {
      console.error('Failed to set temperature:', error)
    }
  }
  
  const handleSetHvacMode = async (entityId: string, hvacMode: string) => {
    setToggling(entityId)
    try {
      await callService('climate', 'set_hvac_mode', entityId, { hvac_mode: hvacMode })
    } catch (error) {
      console.error('Failed to set HVAC mode:', error)
    } finally {
      setToggling(null)
    }
  }
  
  const handleSetFanSpeed = async (entityId: string, percentage: number) => {
    try {
      await callService('fan', 'set_percentage', entityId, { percentage })
    } catch (error) {
      console.error('Failed to set fan speed:', error)
    }
  }
  
  const handleAllOff = async () => {
    setToggling('all')
    try {
      for (const entityId of climateEntities) {
        if (states[entityId]?.state !== 'off') {
          await callService('climate', 'turn_off', entityId)
        }
      }
      for (const entityId of fanEntities) {
        if (states[entityId]?.state === 'on') {
          await callService('fan', 'turn_off', entityId)
        }
      }
    } catch (error) {
      console.error('Failed to turn off all:', error)
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
  
  const getDeviceIcon = (device: ClimateDevice) => {
    const state = states[device.entityId]
    if (device.type === 'fan') return Fan
    
    const hvacAction = state?.attributes?.hvac_action as string | undefined
    const hvacMode = state?.state
    
    if (hvacAction === 'cooling' || hvacMode === 'cool') return Snowflake
    if (hvacAction === 'heating' || hvacMode === 'heat') return Flame
    return Thermometer
  }
  
  const getDeviceColor = (device: ClimateDevice) => {
    const state = states[device.entityId]
    if (device.type === 'fan') return state?.state === 'on' ? 'text-accent-cyan' : 'text-gray-500'
    
    const hvacAction = state?.attributes?.hvac_action as string | undefined
    const hvacMode = state?.state
    
    if (hvacAction === 'cooling' || hvacMode === 'cool') return 'text-accent-cyan'
    if (hvacAction === 'heating' || hvacMode === 'heat') return 'text-accent-orange'
    if (hvacMode === 'off') return 'text-gray-500'
    return 'text-accent-green'
  }
  
  const activeCount = allDevices.filter((d) => {
    const state = states[d.entityId]?.state
    return state !== 'off' && state !== 'unavailable'
  }).length

  return (
    <div className="px-4 py-6 safe-top max-w-7xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-orange/20 flex items-center justify-center">
            <Thermometer className="w-5 h-5 text-accent-orange" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Klima</h1>
            <p className="text-xs text-text-secondary">
              {activeCount} von {allDevices.length} aktiv
            </p>
          </div>
        </div>
        
        {activeCount > 0 && (
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

      {allDevices.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <Thermometer className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-text-secondary mb-2">Keine Klimageräte gefunden</p>
          <p className="text-text-muted text-sm">
            Klimaanlagen, Heizungen und Ventilatoren werden automatisch erkannt
          </p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {roomGroups.map((room, roomIndex) => {
            const roomActiveCount = room.devices.filter((d) => {
              const state = states[d.entityId]?.state
              return state !== 'off' && state !== 'unavailable'
            }).length
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
                    className="flex items-center gap-2 text-white hover:text-accent-orange transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                    <h2 className="text-lg font-semibold">{room.name}</h2>
                    <span className="text-sm text-text-muted">
                      ({roomActiveCount}/{room.devices.length})
                    </span>
                  </button>
                </div>
                
                {!isCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {room.devices.map((device, index) => {
                      const state = states[device.entityId]
                      const isActive = state?.state !== 'off' && state?.state !== 'unavailable'
                      const friendlyName = (state?.attributes?.friendly_name as string) || device.entityId.split('.')[1].replace(/_/g, ' ')
                      const Icon = getDeviceIcon(device)
                      const colorClass = getDeviceColor(device)
                      
                      const currentTemp = state?.attributes?.current_temperature as number | undefined
                      const targetTemp = state?.attributes?.temperature as number | undefined
                      const minTemp = (state?.attributes?.min_temp as number) || 16
                      const maxTemp = (state?.attributes?.max_temp as number) || 30
                      const hvacModes = state?.attributes?.hvac_modes as string[] | undefined
                      const fanPercentage = state?.attributes?.percentage as number | undefined
                      
                      return (
                        <motion.div
                          key={device.entityId}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.02 }}
                        >
                          <Card
                            className={cn(
                              'p-4 transition-all',
                              isActive && device.type === 'climate' && 'ring-2 ring-accent-orange/50 bg-accent-orange/10',
                              isActive && device.type === 'fan' && 'ring-2 ring-accent-cyan/50 bg-accent-cyan/10'
                            )}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <Icon className={cn('w-6 h-6', colorClass)} />
                                <div>
                                  <p className="text-sm font-medium text-white capitalize">
                                    {friendlyName}
                                  </p>
                                  <p className="text-xs text-text-muted">
                                    {device.type === 'climate' ? (
                                      currentTemp ? `${currentTemp}°C` : state?.state
                                    ) : (
                                      fanPercentage !== undefined ? `${fanPercentage}%` : state?.state
                                    )}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleToggle(device.entityId, device.type)}
                                disabled={toggling === device.entityId}
                                className={cn(
                                  'p-2 rounded-full transition-all',
                                  isActive 
                                    ? 'bg-white/20 hover:bg-white/30' 
                                    : 'bg-white/10 hover:bg-white/20'
                                )}
                              >
                                <Power className={cn('w-4 h-4', isActive ? 'text-white' : 'text-gray-500')} />
                              </button>
                            </div>
                            
                            {device.type === 'climate' && isActive && targetTemp !== undefined && (
                              <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-text-muted">Zieltemperatur</span>
                                  <span className="text-lg font-semibold text-white">{targetTemp}°C</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleSetTemperature(device.entityId, Math.max(minTemp, targetTemp - 0.5))}
                                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                  >
                                    <Minus className="w-4 h-4 text-white" />
                                  </button>
                                  <input
                                    type="range"
                                    min={minTemp}
                                    max={maxTemp}
                                    step={0.5}
                                    value={targetTemp}
                                    onChange={(e) => handleSetTemperature(device.entityId, parseFloat(e.target.value))}
                                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent-orange"
                                  />
                                  <button
                                    onClick={() => handleSetTemperature(device.entityId, Math.min(maxTemp, targetTemp + 0.5))}
                                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                  >
                                    <Plus className="w-4 h-4 text-white" />
                                  </button>
                                </div>
                              </div>
                            )}
                            
                            {device.type === 'climate' && hvacModes && hvacModes.length > 1 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {hvacModes.map((mode) => (
                                  <button
                                    key={mode}
                                    onClick={() => handleSetHvacMode(device.entityId, mode)}
                                    disabled={toggling === device.entityId}
                                    className={cn(
                                      'px-3 py-1 text-xs rounded-lg transition-colors capitalize',
                                      state?.state === mode
                                        ? 'bg-accent-orange text-white'
                                        : 'bg-white/10 text-text-secondary hover:bg-white/20'
                                    )}
                                  >
                                    {mode === 'off' ? 'Aus' : 
                                     mode === 'heat' ? 'Heizen' : 
                                     mode === 'cool' ? 'Kühlen' : 
                                     mode === 'auto' ? 'Auto' : 
                                     mode === 'dry' ? 'Trocknen' : 
                                     mode === 'fan_only' ? 'Lüften' : mode}
                                  </button>
                                ))}
                              </div>
                            )}
                            
                            {device.type === 'fan' && isActive && (
                              <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs text-text-muted">Geschwindigkeit</span>
                                  <span className="text-sm font-medium text-white">{fanPercentage || 0}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={fanPercentage || 0}
                                  onChange={(e) => handleSetFanSpeed(device.entityId, parseInt(e.target.value))}
                                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent-cyan"
                                />
                              </div>
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
