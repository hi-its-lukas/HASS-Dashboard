'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Lightbulb, Blinds, Sun, Thermometer, Bot, Lock,
  Power, ChevronUp, ChevronDown, Square, Settings, 
  ChevronRight, Palette, Home, Unlock, RefreshCw,
  AlertCircle, Play, Pause, MapPin, Sparkles, Battery,
  Plus, Minus, Fan, Snowflake, Flame
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useHAStore } from '@/lib/ha'
import { useConfig, useConfigStore } from '@/lib/config/store'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type TabId = 'lights' | 'covers' | 'awnings' | 'climate' | 'vacuum' | 'locks'

const TABS: { id: TabId; label: string; icon: typeof Lightbulb; color: string }[] = [
  { id: 'lights', label: 'Licht', icon: Lightbulb, color: 'accent-yellow' },
  { id: 'covers', label: 'Rollos', icon: Blinds, color: 'accent-purple' },
  { id: 'awnings', label: 'Markisen', icon: Sun, color: 'amber-500' },
  { id: 'climate', label: 'Klima', icon: Thermometer, color: 'accent-orange' },
  { id: 'vacuum', label: 'Staubsauger', icon: Bot, color: 'accent-cyan' },
  { id: 'locks', label: 'Schlösser', icon: Lock, color: 'purple-400' },
]

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

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>('lights')

  return (
    <div className="px-4 py-6 safe-top max-w-7xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="w-10 h-10 rounded-full bg-accent-cyan/20 flex items-center justify-center">
          <Home className="w-5 h-5 text-accent-cyan" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Zuhause</h1>
          <p className="text-xs text-text-secondary">Geräte steuern</p>
        </div>
      </motion.header>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all',
                isActive
                  ? `bg-${tab.color}/20 text-${tab.color}`
                  : 'bg-white/5 text-text-secondary hover:bg-white/10 hover:text-white'
              )}
              style={isActive ? { 
                backgroundColor: `var(--${tab.color}, rgba(255,255,255,0.1))`,
                color: `var(--${tab.color}-text, white)`
              } : undefined}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'lights' && <LightsTab />}
          {activeTab === 'covers' && <CoversTab />}
          {activeTab === 'awnings' && <AwningsTab />}
          {activeTab === 'climate' && <ClimateTab />}
          {activeTab === 'vacuum' && <VacuumTab />}
          {activeTab === 'locks' && <LocksTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function LightsTab() {
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
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors disabled:opacity-50"
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
              className="flex items-center gap-2 text-white hover:text-accent-yellow transition-colors mb-3"
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              <h2 className="text-lg font-semibold">{room.name}</h2>
              <span className="text-sm text-text-muted">({roomOnCount}/{room.lights.length})</span>
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
                    <Card key={entityId} className={cn('p-4 transition-all relative', isOn && 'ring-2 ring-accent-yellow/50 bg-accent-yellow/10')}>
                      <div className="flex items-center justify-between mb-3 cursor-pointer" onClick={() => handleToggle(entityId)}>
                        <Lightbulb 
                          className={cn('w-6 h-6', isOn ? 'text-accent-yellow' : 'text-gray-500')} 
                          style={isOn && hasColor ? { color: getCurrentColor(state) } : undefined}
                        />
                        <div className="flex items-center gap-2">
                          {(hasColor || hasColorTemp) && isOn && (
                            <button onClick={(e) => { e.stopPropagation(); setColorPickerOpen(colorPickerOpen === entityId ? null : entityId) }} className="p-1 hover:bg-white/10 rounded-full">
                              <Palette className="w-4 h-4 text-text-secondary hover:text-white" />
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggle(entityId) }}
                            disabled={toggling === entityId}
                            className={cn('p-2 rounded-lg transition-all', isOn ? 'bg-accent-yellow/20 text-accent-yellow' : 'bg-gray-600/30 text-gray-400', toggling === entityId && 'animate-pulse')}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-white truncate capitalize">{friendlyName}</p>
                      <p className="text-xs text-text-muted">{isOn ? (brightnessPercent ? `${brightnessPercent}%` : 'An') : 'Aus'}</p>
                      
                      {isOn && brightnessPercent !== null && (
                        <input
                          type="range" min="1" max="100" value={brightnessPercent}
                          onChange={(e) => handleBrightnessChange(entityId, parseInt(e.target.value))}
                          className="w-full h-1 mt-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent-yellow"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      
                      {colorPickerOpen === entityId && (
                        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-bg-card border border-white/10 rounded-xl shadow-xl z-50" onClick={(e) => e.stopPropagation()}>
                          <div className="grid grid-cols-4 gap-2">
                            {COLOR_PRESETS.map((color) => (
                              <button key={color.name} onClick={() => handleColorChange(entityId, color)} className="group flex flex-col items-center gap-1 p-2 hover:bg-white/5 rounded-lg" title={color.name}>
                                <div className="w-6 h-6 rounded-full border-2 border-white/20" style={{ backgroundColor: `rgb(${color.rgb.join(',')})` }} />
                                <span className="text-[10px] text-text-muted truncate w-full text-center">{color.name}</span>
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

function CoversTab() {
  const config = useConfig()
  const states = useHAStore((s) => s.states)
  const callService = useHAStore((s) => s.callService)
  const getEntityArea = useHAStore((s) => s.getEntityArea)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [collapsedRooms, setCollapsedRooms] = useState<Record<string, boolean>>({})
  
  const roomCovers = (config.rooms || []).flatMap((r) => r.entityIds || []).filter((id) => id.startsWith('cover.'))
  const configuredCovers = (config.covers || []).map((c) => typeof c === 'string' ? c : c.entityId).filter(Boolean)
  const uniqueCovers = [...new Set([...roomCovers, ...configuredCovers])]
  
  const roomGroups = useMemo(() => {
    const groups: Record<string, string[]> = {}
    uniqueCovers.forEach((entityId) => {
      const areaName = getEntityArea(entityId) || 'Sonstige'
      if (!groups[areaName]) groups[areaName] = []
      groups[areaName].push(entityId)
    })
    return Object.entries(groups)
      .map(([name, covers]) => ({ id: name, name, covers }))
      .sort((a, b) => a.name === 'Sonstige' ? 1 : b.name === 'Sonstige' ? -1 : a.name.localeCompare(b.name, 'de'))
  }, [uniqueCovers, getEntityArea])
  
  const handleAction = async (entityId: string, action: 'open' | 'close' | 'stop') => {
    setActiveAction(`${entityId}_${action}`)
    try { await callService('cover', `${action}_cover`, entityId) } finally { setActiveAction(null) }
  }
  
  const handleAllAction = async (action: 'open' | 'close') => {
    setActiveAction(`all_${action}`)
    try { for (const id of uniqueCovers) await callService('cover', `${action}_cover`, id) } finally { setActiveAction(null) }
  }

  if (uniqueCovers.length === 0) return <EmptyState icon={Blinds} label="Keine Rollos konfiguriert" />

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <button onClick={() => handleAllAction('open')} disabled={activeAction?.startsWith('all')} className="flex items-center gap-2 px-3 py-2 bg-accent-green/20 hover:bg-accent-green/30 text-accent-green rounded-xl disabled:opacity-50">
          <ChevronUp className="w-4 h-4" /> Alle auf
        </button>
        <button onClick={() => handleAllAction('close')} disabled={activeAction?.startsWith('all')} className="flex items-center gap-2 px-3 py-2 bg-accent-orange/20 hover:bg-accent-orange/30 text-accent-orange rounded-xl disabled:opacity-50">
          <ChevronDown className="w-4 h-4" /> Alle zu
        </button>
      </div>
      
      {roomGroups.map((room) => (
        <section key={room.id}>
          <button onClick={() => setCollapsedRooms(prev => ({ ...prev, [room.name]: !prev[room.name] }))} className="flex items-center gap-2 text-white hover:text-accent-purple transition-colors mb-3">
            {collapsedRooms[room.name] ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            <h2 className="text-lg font-semibold">{room.name}</h2>
            <span className="text-sm text-text-muted">({room.covers.length})</span>
          </button>
          
          {!collapsedRooms[room.name] && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {room.covers.map((entityId) => {
                const state = states[entityId]
                const position = state?.attributes?.current_position as number | undefined
                const friendlyName = (state?.attributes?.friendly_name as string) || entityId.split('.')[1].replace(/_/g, ' ')
                const isOpen = state?.state === 'open'
                const isClosed = state?.state === 'closed'
                
                return (
                  <Card key={entityId} className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <Blinds className={cn('w-6 h-6', isOpen ? 'text-accent-green' : isClosed ? 'text-accent-orange' : 'text-accent-purple')} />
                      <div>
                        <p className="text-sm font-medium text-white capitalize">{friendlyName}</p>
                        <p className="text-xs text-text-muted">{position !== undefined ? `${position}%` : state?.state || 'Unbekannt'}</p>
                      </div>
                    </div>
                    {position !== undefined && (
                      <div className="h-2 bg-bg-secondary rounded-full overflow-hidden mb-4">
                        <div className="h-full bg-accent-purple transition-all" style={{ width: `${position}%` }} />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(entityId, 'open')} className="flex-1 flex items-center justify-center gap-1 py-2 bg-accent-green/20 hover:bg-accent-green/30 text-accent-green rounded-lg">
                        <ChevronUp className="w-4 h-4" /> Auf
                      </button>
                      <button onClick={() => handleAction(entityId, 'stop')} className="flex-1 flex items-center justify-center gap-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg">
                        <Square className="w-3 h-3" /> Stop
                      </button>
                      <button onClick={() => handleAction(entityId, 'close')} className="flex-1 flex items-center justify-center gap-1 py-2 bg-accent-orange/20 hover:bg-accent-orange/30 text-accent-orange rounded-lg">
                        <ChevronDown className="w-4 h-4" /> Zu
                      </button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

function AwningsTab() {
  const config = useConfig()
  const states = useHAStore((s) => s.states)
  const callService = useHAStore((s) => s.callService)
  const getEntityArea = useHAStore((s) => s.getEntityArea)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [collapsedRooms, setCollapsedRooms] = useState<Record<string, boolean>>({})
  
  const uniqueAwnings = [...new Set((config.awnings || []).map((a) => typeof a === 'string' ? a : a).filter(Boolean))]
  
  const roomGroups = useMemo(() => {
    const groups: Record<string, string[]> = {}
    uniqueAwnings.forEach((entityId) => {
      const areaName = getEntityArea(entityId) || 'Sonstige'
      if (!groups[areaName]) groups[areaName] = []
      groups[areaName].push(entityId)
    })
    return Object.entries(groups)
      .map(([name, awnings]) => ({ id: name, name, awnings }))
      .sort((a, b) => a.name === 'Sonstige' ? 1 : b.name === 'Sonstige' ? -1 : a.name.localeCompare(b.name, 'de'))
  }, [uniqueAwnings, getEntityArea])
  
  const handleAction = async (entityId: string, action: 'open' | 'close' | 'stop') => {
    setActiveAction(`${entityId}_${action}`)
    try { await callService('cover', `${action}_cover`, entityId) } finally { setActiveAction(null) }
  }
  
  const handleAllAction = async (action: 'open' | 'close') => {
    setActiveAction(`all_${action}`)
    try { for (const id of uniqueAwnings) await callService('cover', `${action}_cover`, id) } finally { setActiveAction(null) }
  }

  if (uniqueAwnings.length === 0) return <EmptyState icon={Sun} label="Keine Markisen konfiguriert" />

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <button onClick={() => handleAllAction('open')} disabled={activeAction?.startsWith('all')} className="flex items-center gap-2 px-3 py-2 bg-accent-green/20 hover:bg-accent-green/30 text-accent-green rounded-xl disabled:opacity-50">
          <ChevronDown className="w-4 h-4" /> Alle aus
        </button>
        <button onClick={() => handleAllAction('close')} disabled={activeAction?.startsWith('all')} className="flex items-center gap-2 px-3 py-2 bg-accent-orange/20 hover:bg-accent-orange/30 text-accent-orange rounded-xl disabled:opacity-50">
          <ChevronUp className="w-4 h-4" /> Alle ein
        </button>
      </div>
      
      {roomGroups.map((room) => (
        <section key={room.id}>
          <button onClick={() => setCollapsedRooms(prev => ({ ...prev, [room.name]: !prev[room.name] }))} className="flex items-center gap-2 text-white hover:text-amber-500 transition-colors mb-3">
            {collapsedRooms[room.name] ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            <h2 className="text-lg font-semibold">{room.name}</h2>
            <span className="text-sm text-text-muted">({room.awnings.length})</span>
          </button>
          
          {!collapsedRooms[room.name] && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {room.awnings.map((entityId) => {
                const state = states[entityId]
                const position = state?.attributes?.current_position as number | undefined
                const friendlyName = (state?.attributes?.friendly_name as string) || entityId.split('.')[1].replace(/_/g, ' ')
                const isOpen = state?.state === 'open'
                const isClosed = state?.state === 'closed'
                
                return (
                  <Card key={entityId} className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <Sun className={cn('w-6 h-6', isOpen ? 'text-accent-green' : isClosed ? 'text-accent-orange' : 'text-amber-500')} />
                      <div>
                        <p className="text-sm font-medium text-white capitalize">{friendlyName}</p>
                        <p className="text-xs text-text-muted">{position !== undefined ? `${position}%` : state?.state || 'Unbekannt'}</p>
                      </div>
                    </div>
                    {position !== undefined && (
                      <div className="h-2 bg-bg-secondary rounded-full overflow-hidden mb-4">
                        <div className="h-full bg-amber-500 transition-all" style={{ width: `${position}%` }} />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(entityId, 'open')} className="flex-1 flex items-center justify-center gap-1 py-2 bg-accent-green/20 hover:bg-accent-green/30 text-accent-green rounded-lg">
                        <ChevronDown className="w-4 h-4" /> Aus
                      </button>
                      <button onClick={() => handleAction(entityId, 'stop')} className="flex-1 flex items-center justify-center gap-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg">
                        <Square className="w-3 h-3" /> Stop
                      </button>
                      <button onClick={() => handleAction(entityId, 'close')} className="flex-1 flex items-center justify-center gap-1 py-2 bg-accent-orange/20 hover:bg-accent-orange/30 text-accent-orange rounded-lg">
                        <ChevronUp className="w-4 h-4" /> Ein
                      </button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

function ClimateTab() {
  const states = useHAStore((s) => s.states)
  const callService = useHAStore((s) => s.callService)
  const getEntityArea = useHAStore((s) => s.getEntityArea)
  const climates = useConfigStore((s) => s.climates)
  const fetchConfig = useConfigStore((s) => s.fetchConfig)
  const [toggling, setToggling] = useState<string | null>(null)
  const [collapsedRooms, setCollapsedRooms] = useState<Record<string, boolean>>({})
  
  useEffect(() => { fetchConfig() }, [fetchConfig])
  
  const allDevices = (climates || []).filter(id => states[id]).map(id => ({ entityId: id, type: id.startsWith('fan.') ? 'fan' as const : 'climate' as const }))
  
  const roomGroups = useMemo(() => {
    const groups: Record<string, typeof allDevices> = {}
    allDevices.forEach((device) => {
      const areaName = getEntityArea(device.entityId) || 'Sonstige'
      if (!groups[areaName]) groups[areaName] = []
      groups[areaName].push(device)
    })
    return Object.entries(groups)
      .map(([name, devices]) => ({ id: name, name, devices }))
      .sort((a, b) => a.name === 'Sonstige' ? 1 : b.name === 'Sonstige' ? -1 : a.name.localeCompare(b.name, 'de'))
  }, [allDevices, getEntityArea])
  
  const handleToggle = async (entityId: string, type: 'climate' | 'fan') => {
    const currentState = states[entityId]?.state
    setToggling(entityId)
    try {
      if (type === 'climate') {
        await callService('climate', currentState === 'off' ? 'turn_on' : 'turn_off', entityId)
      } else {
        await callService('fan', currentState === 'on' ? 'turn_off' : 'turn_on', entityId)
      }
    } finally { setToggling(null) }
  }
  
  const handleSetTemperature = async (entityId: string, temperature: number) => {
    await callService('climate', 'set_temperature', entityId, { temperature })
  }

  if (allDevices.length === 0) return <EmptyState icon={Thermometer} label="Keine Klimageräte konfiguriert" />

  return (
    <div className="space-y-6">
      {roomGroups.map((room) => (
        <section key={room.id}>
          <button onClick={() => setCollapsedRooms(prev => ({ ...prev, [room.name]: !prev[room.name] }))} className="flex items-center gap-2 text-white hover:text-accent-orange transition-colors mb-3">
            {collapsedRooms[room.name] ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            <h2 className="text-lg font-semibold">{room.name}</h2>
            <span className="text-sm text-text-muted">({room.devices.length})</span>
          </button>
          
          {!collapsedRooms[room.name] && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {room.devices.map((device) => {
                const state = states[device.entityId]
                const isActive = state?.state !== 'off' && state?.state !== 'unavailable'
                const friendlyName = (state?.attributes?.friendly_name as string) || device.entityId.split('.')[1].replace(/_/g, ' ')
                const currentTemp = state?.attributes?.current_temperature as number | undefined
                const targetTemp = state?.attributes?.temperature as number | undefined
                const minTemp = (state?.attributes?.min_temp as number) || 16
                const maxTemp = (state?.attributes?.max_temp as number) || 30
                const Icon = device.type === 'fan' ? Fan : Thermometer
                
                return (
                  <Card key={device.entityId} className={cn('p-4 transition-all', isActive && device.type === 'climate' && 'ring-2 ring-accent-orange/50 bg-accent-orange/10', isActive && device.type === 'fan' && 'ring-2 ring-accent-cyan/50 bg-accent-cyan/10')}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Icon className={cn('w-6 h-6', isActive ? (device.type === 'fan' ? 'text-accent-cyan' : 'text-accent-orange') : 'text-gray-500')} />
                        <div>
                          <p className="text-sm font-medium text-white capitalize">{friendlyName}</p>
                          <p className="text-xs text-text-muted">{currentTemp ? `${currentTemp}°C` : state?.state}</p>
                        </div>
                      </div>
                      <button onClick={() => handleToggle(device.entityId, device.type)} disabled={toggling === device.entityId} className={cn('p-2 rounded-full transition-all', isActive ? 'bg-white/20 hover:bg-white/30' : 'bg-white/10 hover:bg-white/20')}>
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
                          <button onClick={() => handleSetTemperature(device.entityId, Math.max(minTemp, targetTemp - 0.5))} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg">
                            <Minus className="w-4 h-4 text-white" />
                          </button>
                          <input type="range" min={minTemp} max={maxTemp} step={0.5} value={targetTemp} onChange={(e) => handleSetTemperature(device.entityId, parseFloat(e.target.value))} className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent-orange" />
                          <button onClick={() => handleSetTemperature(device.entityId, Math.min(maxTemp, targetTemp + 0.5))} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg">
                            <Plus className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}

function VacuumTab() {
  const states = useHAStore((s) => s.states)
  const callService = useHAStore((s) => s.callService)
  const config = useConfig()
  const [loading, setLoading] = useState<string | null>(null)

  const vacuumConfig = config.vacuum
  const vacuumEntityId = vacuumConfig?.entityId || config.vacuumEntityId

  if (!vacuumEntityId) return <EmptyState icon={Bot} label="Kein Saugroboter konfiguriert" />

  const vacuumState = states[vacuumEntityId]
  const battery = vacuumConfig?.batteryEntityId ? states[vacuumConfig.batteryEntityId]?.state : undefined
  const status = vacuumConfig?.statusEntityId ? states[vacuumConfig.statusEntityId]?.state : vacuumState?.state
  const isCleaning = vacuumConfig?.cleaningEntityId ? states[vacuumConfig.cleaningEntityId]?.state === 'on' : vacuumState?.state === 'cleaning'
  const isCharging = vacuumConfig?.chargingEntityId ? states[vacuumConfig.chargingEntityId]?.state === 'on' : false

  const handleAction = async (action: string) => {
    setLoading(action)
    try {
      if (action === 'full_clean' && vacuumConfig?.fullCleanButtonEntityId) {
        await callService('button', 'press', vacuumConfig.fullCleanButtonEntityId)
      } else {
        await callService('vacuum', action, vacuumEntityId)
      }
    } catch (err) { console.error('Vacuum action failed:', err) }
    setTimeout(() => setLoading(null), 2000)
  }

  const batteryNum = battery ? parseInt(battery) : 0
  const getBatteryColor = (level: number) => level > 50 ? 'text-green-400' : level > 20 ? 'text-yellow-400' : 'text-red-400'
  const getStatusColor = () => isCleaning ? 'bg-green-500' : isCharging ? 'bg-cyan-500' : 'bg-gray-500'

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-bg-secondary flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-accent-cyan" />
            </div>
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${getStatusColor()} border-2 border-bg-primary`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{status || 'Unbekannt'}</h2>
            <p className="text-sm text-text-secondary">{vacuumState?.attributes?.friendly_name || vacuumEntityId.split('.')[1]}</p>
          </div>
        </div>
        {battery && (
          <div className={`flex items-center gap-1 ${getBatteryColor(batteryNum)}`}>
            <Battery className="w-5 h-5" />
            <span className="text-2xl font-bold">{battery}%</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => handleAction('start')} disabled={loading !== null} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-green-500/20 hover:bg-green-500/30 disabled:opacity-50">
          {loading === 'start' ? <RefreshCw className="w-6 h-6 text-green-400 animate-spin" /> : <Play className="w-6 h-6 text-green-400" />}
          <span className="text-xs text-white">Start</span>
        </button>
        <button onClick={() => handleAction('pause')} disabled={loading !== null} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-yellow-500/20 hover:bg-yellow-500/30 disabled:opacity-50">
          {loading === 'pause' ? <RefreshCw className="w-6 h-6 text-yellow-400 animate-spin" /> : <Pause className="w-6 h-6 text-yellow-400" />}
          <span className="text-xs text-white">Pause</span>
        </button>
        <button onClick={() => handleAction('return_to_base')} disabled={loading !== null} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-50">
          {loading === 'return_to_base' ? <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" /> : <Home className="w-6 h-6 text-cyan-400" />}
          <span className="text-xs text-white">Basis</span>
        </button>
      </div>
    </Card>
  )
}

function LocksTab() {
  const unifiAccessDevices = useConfigStore((s) => s.unifi?.accessDevices) || []
  const configuredLocks = useConfigStore((s) => s.locks) || []
  const states = useHAStore((s) => s.states)
  const [unlocking, setUnlocking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
    
  const hasUnifiAccess = unifiAccessDevices.length > 0
  const haLockEntities = hasUnifiAccess ? [] : configuredLocks.filter((id) => id.startsWith('lock.') && states[id])
  const totalLocks = hasUnifiAccess ? unifiAccessDevices.length : haLockEntities.length
  
  const handleUnifiUnlock = async (device: { id: string; name: string }) => {
    setUnlocking(device.id)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch('/api/unifi/access/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doorId: device.id })
      })
      if (response.ok) {
        setSuccess(`${device.name} wurde entriegelt`)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Entriegeln fehlgeschlagen')
      }
    } catch { setError('Verbindungsfehler') }
    finally { setUnlocking(null) }
  }
  
  const handleHALock = async (entityId: string, action: 'lock' | 'unlock') => {
    setUnlocking(entityId)
    setError(null)
    setSuccess(null)
    const state = states[entityId]
    const name = (state?.attributes?.friendly_name as string) || entityId
    try {
      const response = await fetch('/api/ha/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId, action })
      })
      if (response.ok) {
        setSuccess(`${name} wurde ${action === 'unlock' ? 'entriegelt' : 'verriegelt'}`)
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const data = await response.json()
        setError(data.error || 'Aktion fehlgeschlagen')
      }
    } catch { setError('Verbindungsfehler') }
    finally { setUnlocking(null) }
  }

  if (totalLocks === 0) return <EmptyState icon={Lock} label="Keine Türschlösser konfiguriert" />

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center gap-2 text-green-400">
          <Unlock className="w-4 h-4" />
          <span className="text-sm">{success}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hasUnifiAccess ? (
          unifiAccessDevices.map((device) => (
            <Card key={device.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <Lock className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{device.name}</p>
                    <p className="text-xs text-text-muted">UniFi Access</p>
                  </div>
                </div>
                <button onClick={() => handleUnifiUnlock(device)} disabled={unlocking === device.id} className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl disabled:opacity-50">
                  {unlocking === device.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                  <span>{unlocking === device.id ? 'Öffne...' : 'Öffnen'}</span>
                </button>
              </div>
            </Card>
          ))
        ) : (
          haLockEntities.map((entityId) => {
            const state = states[entityId]
            const friendlyName = (state?.attributes?.friendly_name as string) || entityId.split('.')[1].replace(/_/g, ' ')
            const isLocked = state?.state === 'locked'
            
            return (
              <Card key={entityId} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLocked ? 'bg-purple-500/20' : 'bg-green-500/20'}`}>
                      {isLocked ? <Lock className="w-6 h-6 text-purple-400" /> : <Unlock className="w-6 h-6 text-green-400" />}
                    </div>
                    <div>
                      <p className="font-medium text-white capitalize">{friendlyName}</p>
                      <p className="text-xs text-text-muted">{isLocked ? 'Verriegelt' : 'Entriegelt'}</p>
                    </div>
                  </div>
                  <button onClick={() => handleHALock(entityId, isLocked ? 'unlock' : 'lock')} disabled={unlocking === entityId} className={`flex items-center gap-2 px-4 py-2 rounded-xl disabled:opacity-50 ${isLocked ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400' : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400'}`}>
                    {unlocking === entityId ? <RefreshCw className="w-4 h-4 animate-spin" /> : isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    <span>{isLocked ? 'Öffnen' : 'Schließen'}</span>
                  </button>
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

function EmptyState({ icon: Icon, label }: { icon: typeof Lightbulb; label: string }) {
  return (
    <div className="text-center py-12">
      <Icon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
      <p className="text-text-secondary mb-4">{label}</p>
      <Link href="/settings" className="inline-flex items-center gap-2 px-4 py-2 bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan rounded-xl transition-colors">
        <Settings className="w-4 h-4" />
        Einstellungen
      </Link>
    </div>
  )
}
