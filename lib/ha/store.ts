import { create } from 'zustand'
import { HAState } from './types'
import { HAWebSocketClient, HAArea, HADevice, HAEntityRegistryEntry } from './websocket-client'
import { mockStates, generatePowerTrendData } from './mock-data'
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

type ConnectionMode = 'websocket' | 'polling' | 'connecting' | 'disconnected'

interface HAStore {
  connected: boolean
  connecting: boolean
  connectionMode: ConnectionMode
  error: string | null
  useMock: boolean
  states: Record<string, HAState>
  areas: HAArea[]
  devices: HADevice[]
  entityRegistry: HAEntityRegistryEntry[]
  powerTrend: PowerTrendPoint[]
  connect: () => Promise<void>
  disconnect: () => void
  getState: (entityId: string) => HAState | undefined
  callService: (domain: string, service: string, entityId?: string, data?: Record<string, unknown>) => Promise<void>
  updateState: (entityId: string, state: HAState) => void
  getEntityArea: (entityId: string) => string | null
}

let wsClient: HAWebSocketClient | null = null
let pollInterval: NodeJS.Timeout | null = null
let wsRetryTimeout: NodeJS.Timeout | null = null
let wsRetryCount = 0

const POLL_INTERVAL = 5000
const WS_RETRY_DELAYS = [5000, 10000, 20000, 60000]

export const useHAStore = create<HAStore>((set, get) => ({
  connected: false,
  connecting: false,
  connectionMode: 'disconnected',
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

    set({ connecting: true, error: null, connectionMode: 'connecting' })

    if (useMock) {
      set({
        connected: true,
        connecting: false,
        connectionMode: 'websocket',
        states: mockStates,
        powerTrend: generatePowerTrendData(),
      })
      return
    }

    await tryWebSocketConnection()
  },

  disconnect: () => {
    if (wsClient) {
      wsClient.disconnect()
      wsClient = null
    }
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
    if (wsRetryTimeout) {
      clearTimeout(wsRetryTimeout)
      wsRetryTimeout = null
    }
    set({
      connected: false,
      connecting: false,
      connectionMode: 'disconnected',
      error: null,
    })
  },

  getState: (entityId: string) => get().states[entityId],

  callService: async (domain: string, service: string, entityId?: string, data?: Record<string, unknown>) => {
    try {
      const response = await fetch('/api/ha/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          domain,
          service,
          target: entityId ? { entity_id: entityId } : undefined,
          service_data: data,
        }),
      })

      if (!response.ok) {
        throw new Error('Service call failed')
      }
    } catch (error) {
      console.error('[HA Store] Service call error:', error)
      throw error
    }
  },

  updateState: (entityId: string, state: HAState) => {
    set((s) => ({
      states: { ...s.states, [entityId]: state },
    }))
  },

  getEntityArea: (entityId: string) => {
    const { entityRegistry, devices, areas } = get()
    const entity = entityRegistry.find((e) => e.entity_id === entityId)
    if (!entity) return null
    if (entity.area_id) {
      const area = areas.find((a) => a.area_id === entity.area_id)
      return area?.name || null
    }
    if (entity.device_id) {
      const device = devices.find((d) => d.id === entity.device_id)
      if (device?.area_id) {
        const area = areas.find((a) => a.area_id === device.area_id)
        return area?.name || null
      }
    }
    return null
  },
}))

async function tryWebSocketConnection() {
  const store = useHAStore.getState()
  
  try {
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost'
    
    // WebSocket proxy runs on same host/port as the app
    const wsUrl = `${protocol}//${host}/ws/ha`
    
    wsClient = new HAWebSocketClient(wsUrl, async () => '')
    
    await wsClient.connect()
    
    wsRetryCount = 0
    
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
    
    const [states, areas, devices, entityRegistry] = await Promise.all([
      wsClient.getStates(),
      wsClient.getAreaRegistry().catch(() => []),
      wsClient.getDeviceRegistry().catch(() => []),
      wsClient.getEntityRegistry().catch(() => [])
    ])
    
    const statesMap: Record<string, HAState> = {}
    states.forEach((s) => { statesMap[s.entity_id] = s })
    
    useHAStore.setState({
      connected: true,
      connecting: false,
      connectionMode: 'websocket',
      states: statesMap,
      areas,
      devices,
      entityRegistry,
      powerTrend: generatePowerTrendData(),
    })
    
    await wsClient.subscribeToStateChanges()
    wsClient.onStateChange((entityId, newState) => {
      useHAStore.setState((state) => ({
        states: { ...state.states, [entityId]: newState },
      }))
    })
    
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
    
    wsClient.onClose(() => {
      console.log('[HA Store] WebSocket closed, switching to polling')
      wsClient = null
      startPolling()
      scheduleWsRetry()
    })
    
  } catch (error) {
    console.error('[HA Store] WebSocket connection failed:', error)
    wsClient = null
    startPolling()
    scheduleWsRetry()
  }
}

function scheduleWsRetry() {
  if (wsRetryTimeout) {
    clearTimeout(wsRetryTimeout)
  }
  
  const delay = WS_RETRY_DELAYS[Math.min(wsRetryCount, WS_RETRY_DELAYS.length - 1)]
  wsRetryCount++
  
  console.log(`[HA Store] Will retry WebSocket in ${delay / 1000}s`)
  
  wsRetryTimeout = setTimeout(() => {
    const { connectionMode } = useHAStore.getState()
    if (connectionMode !== 'websocket') {
      tryWebSocketConnection()
    }
  }, delay)
}

async function startPolling() {
  useHAStore.setState({ 
    connectionMode: 'polling',
    connecting: false
  })
  
  if (pollInterval) return
  
  await pollStates(true)
  
  pollInterval = setInterval(async () => {
    const { connectionMode } = useHAStore.getState()
    if (connectionMode === 'websocket') {
      if (pollInterval) {
        clearInterval(pollInterval)
        pollInterval = null
      }
      return
    }
    
    await pollStates(false)
  }, POLL_INTERVAL)
}

async function pollStates(includeRegistries = false) {
  try {
    const url = includeRegistries ? '/api/ha/poll?registries=true' : '/api/ha/poll'
    const response = await fetch(url, { credentials: 'include' })
    
    if (!response.ok) {
      throw new Error(`Poll failed: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.states) {
      const statesMap: Record<string, HAState> = {}
      data.states.forEach((s: HAState) => { statesMap[s.entity_id] = s })
      
      const update: Partial<HAStore> = {
        connected: true,
        states: statesMap,
      }
      
      if (data.areas) {
        update.areas = data.areas
      }
      if (data.devices) {
        update.devices = data.devices
      }
      if (data.entityRegistry) {
        update.entityRegistry = data.entityRegistry
      }
      
      useHAStore.setState((state) => ({
        ...update,
        powerTrend: state.powerTrend.length ? state.powerTrend : generatePowerTrendData(),
      }))
    }
    
  } catch (error) {
    console.error('[HA Store] Polling error:', error)
    useHAStore.setState({
      error: error instanceof Error ? error.message : 'Polling failed'
    })
  }
}
