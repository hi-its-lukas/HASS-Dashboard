// Home Assistant State Store using Zustand
// Last updated: 2026-01-02 22:05 UTC - Fixed Array.isArray type narrowing

import { create } from 'zustand'
import { HAState, SurveillanceEvent } from './types'
import { HAWebSocketClient } from './websocket-client'
import { mockStates, generatePowerTrendData, mockSurveillanceEvents, mockSurveillanceStats } from './mock-data'
import { dashboardConfig } from '@/config/dashboard'

interface PowerTrendPoint {
  time: string
  value: number
  avg: number
}

interface HAStore {
  // Connection state
  connected: boolean
  connecting: boolean
  error: string | null
  useMock: boolean

  // Entity states
  states: Record<string, HAState>

  // Derived data
  powerTrend: PowerTrendPoint[]
  surveillanceEvents: SurveillanceEvent[]
  surveillanceStats: {
    events: number
    people: number
    vehicles: number
    ai: number
  }

  // Actions
  connect: () => Promise<void>
  disconnect: () => void
  getState: (entityId: string) => HAState | undefined
  callService: (domain: string, service: string, entityId?: string, data?: Record<string, unknown>) => Promise<void>
  updateState: (entityId: string, state: HAState) => void
}

let wsClient: HAWebSocketClient | null = null

export const useHAStore = create<HAStore>((set, get) => ({
  connected: false,
  connecting: false,
  error: null,
  useMock: process.env.NEXT_PUBLIC_USE_MOCK === 'true',

  states: {},
  powerTrend: [],
  surveillanceEvents: [],
  surveillanceStats: { events: 0, people: 0, vehicles: 0, ai: 0 },

  connect: async () => {
    const { useMock, connecting, connected } = get()

    if (connecting || connected) return

    set({ connecting: true, error: null })

    if (useMock) {
      // Use mock data
      set({
        connected: true,
        connecting: false,
        states: mockStates,
        powerTrend: generatePowerTrendData(),
        surveillanceEvents: mockSurveillanceEvents,
        surveillanceStats: mockSurveillanceStats,
      })
      return
    }

    try {
      // Real HA connection via proxy
      const wsUrl = process.env.NEXT_PUBLIC_HA_WS_URL
      if (!wsUrl) {
        throw new Error('NEXT_PUBLIC_HA_WS_URL not configured')
      }

      wsClient = new HAWebSocketClient(wsUrl, async () => {
        // Fetch token from server-side proxy
        const res = await fetch('/api/ha/token')
        if (!res.ok) throw new Error('Failed to get token')
        const { token } = await res.json()
        return token
      })

      await wsClient.connect()

      // Get initial states
      const states = await wsClient.getStates()
      const statesMap: Record<string, HAState> = {}
      states.forEach((s) => {
        statesMap[s.entity_id] = s
      })

      // Subscribe to state changes
      await wsClient.subscribeToStateChanges()
      wsClient.onStateChange((entityId, newState) => {
        set((state) => ({
          states: { ...state.states, [entityId]: newState },
        }))
      })

      set({
        connected: true,
        connecting: false,
        states: statesMap,
        powerTrend: generatePowerTrendData(),
        surveillanceEvents: mockSurveillanceEvents,
        surveillanceStats: mockSurveillanceStats,
      })
    } catch (err) {
      console.error('[HA Store] Connection error:', err)
      set({
        connected: false,
        connecting: false,
        error: err instanceof Error ? err.message : 'Connection failed',
      })
    }
  },

  disconnect: () => {
    if (wsClient) {
      wsClient.disconnect()
      wsClient = null
    }
    set({ connected: false, connecting: false })
  },

  getState: (entityId: string) => {
    return get().states[entityId]
  },

  callService: async (domain, service, entityId, data) => {
    const { useMock } = get()

    if (useMock) {
      // Simulate service call in mock mode
      if (entityId) {
        const currentState = get().states[entityId]
        if (currentState) {
          let newState = currentState.state
          if (service === 'turn_on') newState = 'on'
          if (service === 'turn_off') newState = 'off'
          if (service === 'toggle') newState = currentState.state === 'on' ? 'off' : 'on'
          
          if (domain === 'alarm_control_panel') {
            if (service === 'alarm_disarm') newState = 'disarmed'
            if (service === 'alarm_arm_home') newState = 'armed_home'
            if (service === 'alarm_arm_away') newState = 'armed_away'
            if (service === 'alarm_arm_night') newState = 'armed_night'
          }

          set((state) => ({
            states: {
              ...state.states,
              [entityId]: {
                ...currentState,
                state: newState,
                last_changed: new Date().toISOString(),
                last_updated: new Date().toISOString(),
              },
            },
          }))
        }
      }
      return
    }

    if (wsClient) {
      await wsClient.callService({
        domain,
        service,
        serviceData: data,
        target: entityId ? { entity_id: entityId } : undefined,
      })
    }
  },

  updateState: (entityId, state) => {
    set((s) => ({
      states: { ...s.states, [entityId]: state },
    }))
  },
}))

// Selector hooks for specific data
export const useConnectionStatus = () => useHAStore((s) => ({
  connected: s.connected,
  connecting: s.connecting,
  error: s.error,
}))

export const useEntityState = (entityId: string) => useHAStore((s) => s.states[entityId])

export const useLightsCount = () => {
  const lightsGroup = useEntityState(dashboardConfig.lightsGroupEntityId)
  const states = useHAStore((s) => s.states)
  
  if (!lightsGroup) return { on: 0, total: 0 }
  
  const rawIds = lightsGroup.attributes?.entity_id
  const lightIds = Array.isArray(rawIds) ? rawIds as string[] : []
  const onCount = lightIds.filter((id) => states[id]?.state === 'on').length
  
  return { on: onCount, total: lightIds.length }
}

export const usePower = () => {
  const powerState = useEntityState(dashboardConfig.powerEntityId)
  return powerState ? parseInt(powerState.state) || 0 : 0
}

export interface Weather {
  temperature: number
  condition: string
}

export const useWeather = (): Weather => {
  const weatherState = useEntityState(dashboardConfig.weatherEntityId)
  
  if (!weatherState) {
    return { temperature: 0, condition: 'unknown' }
  }
  
  // Extract temperature with proper type narrowing
  const rawTemp = weatherState.attributes?.temperature
  const temperature = typeof rawTemp === 'number' ? rawTemp : 0
  
  return {
    temperature,
    condition: weatherState.state,
  }
}

export const useAlarmState = () => {
  const alarmState = useEntityState(dashboardConfig.security.alarmEntityId)
  return alarmState?.state || 'unknown'
}

export const usePersonsAtHome = () => {
  const states = useHAStore((s) => s.states)
  const persons = dashboardConfig.persons
  
  const atHome = persons.filter((p) => states[p.entityId]?.state === 'home')
  return atHome.length
}

export const useRoomLightsStatus = (roomEntityIds: string[]) => {
  const states = useHAStore((s) => s.states)
  
  const lightIds = roomEntityIds.filter((id) => id.startsWith('light.'))
  const onCount = lightIds.filter((id) => states[id]?.state === 'on').length
  
  if (onCount === 0) return 'All off'
  if (onCount === 1) return '1 light on'
  return `${onCount} lights on`
}

export const useEnergy = () => {
  const states = useHAStore((s) => s.states)
  const { energy } = dashboardConfig
  
  return {
    solar: parseInt(states[energy.solarEntityId]?.state || '0'),
    battery: parseInt(states[energy.batteryLevelEntityId]?.state || '0'),
    batteryPower: parseInt(states[energy.batteryEntityId]?.state || '0'),
    grid: parseInt(states[energy.gridEntityId]?.state || '0'),
    house: parseInt(states[energy.houseEntityId]?.state || '0'),
  }
}

export const usePowerTrend = () => useHAStore((s) => s.powerTrend)
export const useSurveillanceEvents = () => useHAStore((s) => s.surveillanceEvents)
export const useSurveillanceStats = () => useHAStore((s) => s.surveillanceStats)
