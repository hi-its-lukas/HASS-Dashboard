import { create } from 'zustand'
import { DashboardConfig, dashboardConfig as staticConfig, PersonConfig, PersonDetailConfig, RoomConfig, ApplianceConfig, IntercomConfig } from '@/config/dashboard'

export interface CustomButtonConfig {
  id: string
  label: string
  icon: string
  domain: string
  service: string
  entityId?: string
  data?: Record<string, unknown>
}

interface UserLayoutConfig {
  dashboardTitle?: string
  weatherEntityId?: string
  temperatureSensorId?: string
  lightsGroupEntityId?: string
  powerEntityId?: string
  alarmEntityId?: string
  backgroundUrl?: string
  energy?: {
    solarEntityId?: string
    batteryEntityId?: string
    batteryLevelEntityId?: string
    gridEntityId?: string
    houseEntityId?: string
  }
  security?: {
    alarmEntityId?: string
    zones?: { id: string; name: string; entityId: string }[]
    dogModeEntityId?: string
  }
  rooms?: RoomConfig[]
  persons?: string[] | PersonConfig[]
  personDetails?: PersonDetailConfig[]
  lights?: string[]
  covers?: string[]
  climates?: string[]
  calendars?: string[]
  appliances?: string[] | ApplianceConfig[]
  customButtons?: CustomButtonConfig[]
  intercoms?: IntercomConfig[]
}

function entityIdToName(entityId: string): string {
  const parts = entityId.split('.')
  if (parts.length < 2) return entityId
  return parts[1]
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function convertPersonsArray(persons: string[]): PersonConfig[] {
  return persons.map((entityId) => ({
    id: entityId.replace('person.', ''),
    name: entityIdToName(entityId),
    entityId,
  }))
}

function convertLightsToRooms(lights: string[]): RoomConfig[] {
  const roomMap: Record<string, string[]> = {}
  
  lights.forEach((entityId) => {
    const parts = entityId.split('.')
    if (parts.length < 2) return
    
    const name = parts[1]
    const roomMatch = name.match(/^([a-z_]+?)_/)
    const roomId = roomMatch ? roomMatch[1] : 'other'
    
    if (!roomMap[roomId]) {
      roomMap[roomId] = []
    }
    roomMap[roomId].push(entityId)
  })
  
  return Object.entries(roomMap).map(([roomId, entityIds]) => ({
    id: roomId,
    name: roomId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    floor: 'ground' as const,
    icon: 'lightbulb',
    entityIds,
  }))
}

function getApplianceIcon(entityId: string): string {
  const name = entityId.toLowerCase()
  if (name.includes('washer') || name.includes('washing')) return 'loader'
  if (name.includes('dryer')) return 'wind'
  if (name.includes('dishwasher')) return 'droplets'
  if (name.includes('geyser') || name.includes('water_heater') || name.includes('boiler')) return 'flame'
  if (name.includes('heater') || name.includes('heating')) return 'thermometer'
  if (name.includes('ac') || name.includes('aircon') || name.includes('climate')) return 'snowflake'
  if (name.includes('fan')) return 'fan'
  if (name.includes('pump')) return 'droplet'
  return 'zap'
}

function convertAppliancesArray(appliances: string[]): ApplianceConfig[] {
  return appliances.map((entityId) => ({
    id: entityId.replace(/\./g, '_'),
    name: entityIdToName(entityId),
    entityId,
    icon: getApplianceIcon(entityId),
  }))
}

interface ConfigStore {
  config: DashboardConfig
  isLoaded: boolean
  isAuthenticated: boolean
  sidebarState: 'expanded' | 'collapsed'
  climates: string[]
  calendars: string[]
  
  loadConfig: () => Promise<void>
  fetchConfig: () => Promise<void>
  updateConfig: (updates: Partial<UserLayoutConfig>) => Promise<boolean>
  setSidebarState: (state: 'expanded' | 'collapsed') => Promise<void>
  reset: () => void
}

function mergeWithDefaults(userConfig: UserLayoutConfig): DashboardConfig {
  let persons: PersonConfig[] = staticConfig.persons
  if (userConfig.persons?.length) {
    if (typeof userConfig.persons[0] === 'string') {
      persons = convertPersonsArray(userConfig.persons as string[])
    } else {
      persons = userConfig.persons as PersonConfig[]
    }
  }

  let rooms: RoomConfig[] = staticConfig.rooms
  if (userConfig.rooms?.length) {
    rooms = userConfig.rooms
  } else if (userConfig.lights?.length) {
    rooms = convertLightsToRooms(userConfig.lights)
  }

  let appliances: ApplianceConfig[] = staticConfig.appliances
  if (userConfig.appliances?.length) {
    if (typeof userConfig.appliances[0] === 'string') {
      appliances = convertAppliancesArray(userConfig.appliances as string[])
    } else {
      appliances = userConfig.appliances as ApplianceConfig[]
    }
  }

  return {
    weatherEntityId: userConfig.weatherEntityId || staticConfig.weatherEntityId,
    temperatureSensorId: userConfig.temperatureSensorId,
    lightsGroupEntityId: userConfig.lightsGroupEntityId || staticConfig.lightsGroupEntityId,
    powerEntityId: userConfig.powerEntityId || staticConfig.powerEntityId,
    backgroundUrl: userConfig.backgroundUrl,
    energy: {
      solarEntityId: userConfig.energy?.solarEntityId || staticConfig.energy.solarEntityId,
      batteryEntityId: userConfig.energy?.batteryEntityId || staticConfig.energy.batteryEntityId,
      batteryLevelEntityId: userConfig.energy?.batteryLevelEntityId || staticConfig.energy.batteryLevelEntityId,
      gridEntityId: userConfig.energy?.gridEntityId || staticConfig.energy.gridEntityId,
      houseEntityId: userConfig.energy?.houseEntityId || staticConfig.energy.houseEntityId,
    },
    security: {
      alarmEntityId: userConfig.security?.alarmEntityId || userConfig.alarmEntityId || staticConfig.security.alarmEntityId,
      zones: userConfig.security?.zones?.length ? userConfig.security.zones : staticConfig.security.zones,
      dogModeEntityId: userConfig.security?.dogModeEntityId || staticConfig.security.dogModeEntityId,
    },
    rooms,
    persons,
    personDetails: userConfig.personDetails,
    appliances,
    customButtons: userConfig.customButtons || staticConfig.customButtons,
    intercoms: userConfig.intercoms || staticConfig.intercoms,
    lights: userConfig.lights || staticConfig.lights,
    covers: userConfig.covers || staticConfig.covers,
    climates: userConfig.climates || [],
  }
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  config: staticConfig,
  isLoaded: false,
  isAuthenticated: false,
  sidebarState: 'expanded',
  climates: [],
  calendars: [],

  loadConfig: async () => {
    try {
      const res = await fetch('/api/settings')
      
      if (res.status === 401) {
        set({ isLoaded: true, isAuthenticated: false, config: staticConfig })
        return
      }
      
      if (!res.ok) {
        console.error('[ConfigStore] Failed to load config')
        set({ isLoaded: true, isAuthenticated: false })
        return
      }
      
      const data = await res.json()
      const mergedConfig = mergeWithDefaults(data.layoutConfig || {})
      
      set({
        config: mergedConfig,
        isLoaded: true,
        isAuthenticated: true,
        sidebarState: data.sidebarState || 'expanded',
        climates: data.layoutConfig?.climates || [],
        calendars: data.layoutConfig?.calendars || []
      })
    } catch (error) {
      console.error('[ConfigStore] Error loading config:', error)
      set({ isLoaded: true, isAuthenticated: false })
    }
  },

  fetchConfig: async () => {
    const { isLoaded } = get()
    if (!isLoaded) {
      await get().loadConfig()
    }
  },

  updateConfig: async (updates) => {
    const { config, isAuthenticated } = get()
    
    if (!isAuthenticated) return false
    
    const newLayoutConfig: UserLayoutConfig = {
      weatherEntityId: updates.weatherEntityId ?? config.weatherEntityId,
      lightsGroupEntityId: updates.lightsGroupEntityId ?? config.lightsGroupEntityId,
      powerEntityId: updates.powerEntityId ?? config.powerEntityId,
      backgroundUrl: updates.backgroundUrl ?? config.backgroundUrl,
      energy: updates.energy ?? config.energy,
      security: updates.security ?? config.security,
      rooms: updates.rooms ?? config.rooms,
      persons: updates.persons ?? config.persons,
      covers: updates.covers,
      lights: updates.lights,
      appliances: updates.appliances ?? config.appliances,
      customButtons: updates.customButtons ?? config.customButtons,
      intercoms: updates.intercoms ?? config.intercoms,
      personDetails: updates.personDetails ?? config.personDetails,
    }
    
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layoutConfig: newLayoutConfig })
      })
      
      if (!res.ok) return false
      
      set({ config: mergeWithDefaults(newLayoutConfig) })
      return true
    } catch {
      return false
    }
  },

  setSidebarState: async (state) => {
    const { isAuthenticated } = get()
    
    set({ sidebarState: state })
    
    if (isAuthenticated) {
      try {
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sidebarState: state })
        })
      } catch {
        console.error('[ConfigStore] Failed to save sidebar state')
      }
    }
  },

  reset: () => {
    set({
      config: staticConfig,
      isLoaded: false,
      isAuthenticated: false,
      sidebarState: 'expanded'
    })
  }
}))

export const useConfig = () => useConfigStore((s) => s.config)
export const useSidebarState = () => useConfigStore((s) => s.sidebarState)
export const useIsAuthenticated = () => useConfigStore((s) => s.isAuthenticated)
