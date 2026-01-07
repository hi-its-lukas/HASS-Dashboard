'use client'

import { useHAStore } from './store'
import { useConfig } from '@/lib/config/store'

interface EnergyData {
  solar: number
  battery: number
  batteryPower: number
  grid: number
  house: number
}

interface PowerTrendPoint {
  time: string
  value: number
  avg: number
}

interface ConnectionStatus {
  connected: boolean
  connecting: boolean
  connectionMode: 'websocket' | 'polling' | 'connecting' | 'disconnected'
  error: string | null
}

interface AlarmState {
  state: string
  armed: boolean
  triggered: boolean
}

export function useEnergy(): EnergyData {
  const states = useHAStore((s) => s.states)
  const config = useConfig()
  
  const getValue = (entityId: string | undefined): number => {
    if (!entityId) return 0
    const state = states[entityId]
    if (!state) return 0
    const val = parseFloat(state.state)
    return isNaN(val) ? 0 : val
  }
  
  return {
    solar: getValue(config.energy?.solarEntityId),
    battery: getValue(config.energy?.batteryLevelEntityId),
    batteryPower: getValue(config.energy?.batteryEntityId),
    grid: getValue(config.energy?.gridEntityId),
    house: getValue(config.energy?.houseEntityId),
  }
}

export function usePersonsAtHome(): number {
  const states = useHAStore((s) => s.states)
  const config = useConfig()
  
  return config.persons.filter((p) => {
    const state = states[p.entityId]
    return state?.state === 'home'
  }).length
}

export function useConnectionStatus(): ConnectionStatus {
  return useHAStore((s) => ({
    connected: s.connected,
    connecting: s.connecting,
    connectionMode: s.connectionMode,
    error: s.error,
  }))
}

export function useAlarmState(): AlarmState {
  const states = useHAStore((s) => s.states)
  const config = useConfig()
  
  const alarmEntityId = config.security?.alarmEntityId
  if (!alarmEntityId) {
    return { state: 'unknown', armed: false, triggered: false }
  }
  
  const alarmState = states[alarmEntityId]
  if (!alarmState) {
    return { state: 'unknown', armed: false, triggered: false }
  }
  
  const state = alarmState.state
  const armed = state.includes('armed')
  const triggered = state === 'triggered' || state === 'pending'
  
  return { state, armed, triggered }
}

export function usePowerTrend(): PowerTrendPoint[] {
  return useHAStore((s) => s.powerTrend)
}
