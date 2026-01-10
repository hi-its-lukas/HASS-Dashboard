'use client'

import { useState, useMemo } from 'react'
import { Lightbulb, Power, ChevronDown, ChevronRight, Palette } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useHAStore } from '@/lib/ha'
import { useConfig } from '@/lib/config/store'
import { cn } from '@/lib/utils'
import EmptyState from './EmptyState'
import { COLOR_PRESETS } from './constants'

export default function LightsTab() {
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
      if (!groups[areaName]) groups[areaName] = []
      groups[areaName].push(entityId)
    })
    return Object.entries(groups)
      .map(([name, lights]) => ({ id: name, name, lights }))
      .sort((a, b) => {
        if (a.name === 'Sonstige') return 1
        if (b.name === 'Sonstige') return -1
        return a.name.localeCompare(b.name, 'de')
      })
  }, [uniqueLights, getEntityArea])
  
  const handleToggle = async (entityId: string) => {
    const currentState = states[entityId]?.state
    setToggling(entityId)
    try {
      await callService('light', currentState === 'on' ? 'turn_off' : 'turn_on', entityId)
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
    } finally {
      setToggling(null)
      setColorPickerOpen(null)
    }
  }
  
  const handleBrightnessChange = async (entityId: string, brightness: number) => {
    await callService('light', 'turn_on', entityId, { brightness: Math.round(brightness * 2.55) })
  }
  
  const handleAllOff = async () => {
    setToggling('all')
    try {
      for (const entityId of uniqueLights) {
        if (states[entityId]?.state === 'on') {
          await callService('light', 'turn_off', entityId)
        }
      }
    } finally {
      setToggling(null)
    }
  }
  
  const supportsColor = (state: any) => {
    const colorModes = state?.attributes?.supported_color_modes as string[] | undefined
    return colorModes?.some(mode => ['rgb', 'rgbw', 'rgbww', 'hs', 'xy'].includes(mode)) || false
  }
  
  const supportsColorTemp = (state: any) => {
    const colorModes = state?.attributes?.supported_color_modes as string[] | undefined
    return colorModes?.some(mode => ['color_temp'].includes(mode)) || false
  }
  
  const getCurrentColor = (state: any): string => {
    const rgb = state?.attributes?.rgb_color as [number, number, number] | undefined
    return rgb ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : '#ffa500'
  }
  
  const onCount = uniqueLights.filter((id) => states[id]?.state === 'on').length

  if (uniqueLights.length === 0) {
    return <EmptyState icon={Lightbulb} label="Keine Lichter konfiguriert" />
  }

  return (
    <div className="space-y-6">
      {onCount > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleAllOff}
            disabled={toggling === 'all'}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            <Power className="w-4 h-4" />
            Alle aus ({onCount})
          </button>
        </div>
      )}
      
      {roomGroups.map((room) => {
        const roomOnCount = room.lights.filter((id) => states[id]?.state === 'on').length
        const isCollapsed = collapsedRooms[room.name]
        
        return (
          <section key={room.id}>
            <button
              onClick={() => setCollapsedRooms(prev => ({ ...prev, [room.name]: !prev[room.name] }))}
              className="flex items-center gap-2 text-white hover:text-white/80 transition-colors mb-3"
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              <h2 className="text-lg font-semibold">{room.name}</h2>
              <span className="text-sm text-white/50">({roomOnCount}/{room.lights.length})</span>
            </button>
            
            {!isCollapsed && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {room.lights.map((entityId) => {
                  const state = states[entityId]
                  const isOn = state?.state === 'on'
                  const friendlyName = (state?.attributes?.friendly_name as string) || entityId.split('.')[1].replace(/_/g, ' ')
                  const brightness = state?.attributes?.brightness as number | undefined
                  const brightnessPercent = brightness ? Math.round((brightness / 255) * 100) : null
                  const hasColor = supportsColor(state)
                  const hasColorTemp = supportsColorTemp(state)
                  
                  return (
                    <Card key={entityId} className={cn('p-4 transition-all relative', isOn && 'ring-1 ring-white/30 bg-white/5')}>
                      <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => handleToggle(entityId)}>
                        <Lightbulb 
                          className={cn('w-6 h-6', isOn ? 'text-white' : 'text-white/40')} 
                          style={isOn && hasColor ? { color: getCurrentColor(state) } : undefined}
                        />
                        <div className="flex items-center gap-2">
                          {(hasColor || hasColorTemp) && isOn && (
                            <button onClick={(e) => { e.stopPropagation(); setColorPickerOpen(colorPickerOpen === entityId ? null : entityId) }} className="p-1 hover:bg-white/10 rounded-full">
                              <Palette className="w-4 h-4 text-white/50 hover:text-white" />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggle(entityId) }}
                            disabled={toggling === entityId}
                            className={cn('p-2 rounded-lg transition-all', isOn ? 'bg-white/20 text-white' : 'bg-white/10 text-white/50', toggling === entityId && 'animate-pulse')}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-white truncate capitalize">{friendlyName}</p>
                      <p className="text-xs text-white/50">{isOn ? (brightnessPercent ? `${brightnessPercent}%` : 'An') : 'Aus'}</p>
                      
                      {isOn && brightnessPercent !== null && (
                        <input
                          type="range" min="1" max="100" value={brightnessPercent}
                          onChange={(e) => handleBrightnessChange(entityId, parseInt(e.target.value))}
                          className="w-full h-1 mt-3 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      
                      {colorPickerOpen === entityId && (
                        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-[#1a1f2e] border border-white/10 rounded-xl shadow-xl z-50" onClick={(e) => e.stopPropagation()}>
                          <div className="grid grid-cols-4 gap-2">
                            {COLOR_PRESETS.map((color) => (
                              <button key={color.name} onClick={() => handleColorChange(entityId, color)} className="group flex flex-col items-center gap-1 p-2 hover:bg-white/5 rounded-lg" title={color.name}>
                                <div className="w-6 h-6 rounded-full border-2 border-white/20" style={{ backgroundColor: `rgb(${color.rgb.join(',')})` }} />
                                <span className="text-[10px] text-white/50 truncate w-full text-center">{color.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
