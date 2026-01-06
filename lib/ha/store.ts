// Home Assistant State Store using Zustand
// Last updated: 2026-01-03 - Refactored to use dynamic per-user config

import { create } from 'zustand'
import { HAState } from './types'
import { HAWebSocketClient, HAArea, HADevice, HAEntityRegistryEntry } from './websocket-client'
import { mockStates, generatePowerTrendData } from './mock-data'
import { useConfigStore } from '@/lib/config/store'
import { useNotificationsStore } from '@/lib/ui/notifications-store'

interface DashboardPopupEventData extends Record<string, unknown> {
  title?: string
  message?: string
  severity?: string
  timeout?: number
  tag?: string
  camera_entity?: string
  ai_description?: string
  intercom_slug?: string
}

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

  // Registry data
  areas: HAArea[]
  devices: HADevice[]
  entityRegistry: HAEntityRegistryEntry[]

  // Derived data
  powerTrend: PowerTrendPoint[]

  // Actions
  connect: () => Promise<void>
  disconnect: () => void
  getState: (entityId: string) => HAState | undefined
  callService: (domain: string, service: string, entityId?: string, data?: Record<string, unknown>) => Promise<void>
  updateState: (entityId: string, state: HAState) => void
  getEntityArea: (entityId: string) => string | null
}

let wsClient: HAWebSocketClient | null = null

export const useHAStore = create<HAStore>((set, get) => ({
  connected: false,
  connecting: false,
  error: null,
  useMock: process.env.NEXT_PUBLIC_USE_MOCK === 'true',

  states: {},
  areas: [],
  devices: [],
  entityRegistry: [],
  powerTrend: [],

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
      })
      return
    }

    try {
      // Get HA instance URL from user's session/config
      const meRes = await fetch('/api/me')
      if (!meRes.ok) throw new Error('Not authenticated')
      const meData = await meRes.json()
      
      if (!meData.user?.haInstanceUrl) {
        throw new Error('Home Assistant URL not configured')
      }
      
      const haUrl = meData.user.haInstanceUrl.replace(/\/$/, '')
      const wsUrl = haUrl.replace(/^http/, 'ws') + '/api/websocket'

      wsClient = new HAWebSocketClient(wsUrl, async () => {
        const res = await fetch('/api/ha/token')
        if (!res.ok) throw new Error('Failed to get token')
        const { token } = await res.json()
        return token
      })

      await wsClient.connect()

      // Get initial states and registries in parallel
      const [states, areas, devices, entityRegistry] = await Promise.all([
        wsClient.getStates(),
        wsClient.getAreaRegistry().catch(() => []),
        wsClient.getDeviceRegistry().catch(() => []),
        wsClient.getEntityRegistry().catch(() => [])
      ])
      
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

      // Subscribe to dashboard popup events
      await wsClient.subscribeToEvents('dashboard_popup')
      wsClient.onEvent<DashboardPopupEventData>('dashboard_popup', (data) => {
        useNotificationsStore.getState().show({
          title: data.title,
          message: data.message,
          severity: data.severity as 'info' | 'warning' | 'critical',
          tag: data.tag,
          cameraEntity: data.camera_entity,
          aiDescription: data.ai_description,
          intercomSlug: data.intercom_slug,
        })
      })

      set({
        connected: true,
        connecting: false,
        states: statesMap,
        areas,
        devices,
        entityRegistry,
        powerTrend: generatePowerTrendData(),
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

  getEntityArea: (entityId: string) => {
    const { areas, devices, entityRegistry } = get()
    const entity = entityRegistry.find(e => e.entity_id === entityId)
    if (!entity) return null
    
    let areaId = entity.area_id
    if (!areaId && entity.device_id) {
      const device = devices.find(d => d.id === entity.device_id)
      areaId = device?.area_id
    }
    
    if (!areaId) return null
    const area = areas.find(a => a.area_id === areaId)
    return area?.name || null
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
  const config = useConfigStore((s) => s.config)
  const lightsGroup = useHAStore((s) => s.states[config.lightsGroupEntityId])
  const states = useHAStore((s) => s.states)
  
  if (!lightsGroup) return { on: 0, total: 0 }
  
  const rawIds = lightsGroup.attributes?.entity_id
  const lightIds = Array.isArray(rawIds) ? rawIds as string[] : []
  const onCount = lightIds.filter((id) => states[id]?.state === 'on').length
  
  return { on: onCount, total: lightIds.length }
}

export const usePower = () => {
  const config = useConfigStore((s) => s.config)
  const powerState = useHAStore((s) => s.states[config.powerEntityId])
  return powerState ? parseInt(powerState.state) || 0 : 0
}

export interface Weather {
  temperature: number
  condition: string
}

export const useWeather = (): Weather => {
  const config = useConfigStore((s) => s.config)
  const weatherState = useHAStore((s) => s.states[config.weatherEntityId])
  
  if (!weatherState) {
    return { temperature: 0, condition: 'unknown' }
  }
  
  const rawTemp = weatherState.attributes?.temperature
  const temperature = typeof rawTemp === 'number' ? rawTemp : 0
  
  return {
    temperature,
    condition: weatherState.state,
  }
}

export const useAlarmState = () => {
  const config = useConfigStore((s) => s.config)
  const alarmState = useHAStore((s) => s.states[config.security.alarmEntityId])
  return alarmState?.state || 'unknown'
}

export const usePersonsAtHome = () => {
  const states = useHAStore((s) => s.states)
  const persons = useConfigStore((s) => s.config.persons)
  
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
  const energy = useConfigStore((s) => s.config.energy)
  
  return {
    solar: parseInt(states[energy.solarEntityId]?.state || '0'),
    battery: parseInt(states[energy.batteryLevelEntityId]?.state || '0'),
    batteryPower: parseInt(states[energy.batteryEntityId]?.state || '0'),
    grid: parseInt(states[energy.gridEntityId]?.state || '0'),
    house: parseInt(states[energy.houseEntityId]?.state || '0'),
  }
}

export const usePowerTrend = () => useHAStore((s) => s.powerTrend)
