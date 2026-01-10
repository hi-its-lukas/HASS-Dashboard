'use client'

import { useState, useMemo, useEffect } from 'react'
import { Thermometer, Power, ChevronDown, ChevronRight, Plus, Minus, Fan } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useHAStore } from '@/lib/ha'
import { useConfigStore } from '@/lib/config/store'
import { cn } from '@/lib/utils'
import EmptyState from './EmptyState'

export default function ClimateTab() {
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
