import { create } from 'zustand'
import { DashboardConfig, dashboardConfig as staticConfig } from '@/config/dashboard'

interface UserLayoutConfig {
  weatherEntityId?: string
  lightsGroupEntityId?: string
  powerEntityId?: string
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
  rooms?: {
    id: string
    name: string
    floor: 'ground' | 'upper'
    icon: string
    entityIds: string[]
  }[]
  persons?: {
    id: string
    name: string
    entityId: string
    avatarUrl?: string
    batteryEntityId?: string
    stepsEntityId?: string
    distanceEntityId?: string
    floorsEntityId?: string
    activityEntityId?: string
  }[]
  appliances?: {
    id: string
    name: string
    entityId: string
    icon: string
  }[]
}

interface ConfigStore {
  config: DashboardConfig
  isLoaded: boolean
  isAuthenticated: boolean
  sidebarState: 'expanded' | 'collapsed'
  
  loadConfig: () => Promise<void>
  updateConfig: (updates: Partial<UserLayoutConfig>) => Promise<boolean>
  setSidebarState: (state: 'expanded' | 'collapsed') => Promise<void>
  reset: () => void
}

function mergeWithDefaults(userConfig: UserLayoutConfig): DashboardConfig {
  return {
    weatherEntityId: userConfig.weatherEntityId || staticConfig.weatherEntityId,
    lightsGroupEntityId: userConfig.lightsGroupEntityId || staticConfig.lightsGroupEntityId,
    powerEntityId: userConfig.powerEntityId || staticConfig.powerEntityId,
    energy: {
      solarEntityId: userConfig.energy?.solarEntityId || staticConfig.energy.solarEntityId,
      batteryEntityId: userConfig.energy?.batteryEntityId || staticConfig.energy.batteryEntityId,
      batteryLevelEntityId: userConfig.energy?.batteryLevelEntityId || staticConfig.energy.batteryLevelEntityId,
      gridEntityId: userConfig.energy?.gridEntityId || staticConfig.energy.gridEntityId,
      houseEntityId: userConfig.energy?.houseEntityId || staticConfig.energy.houseEntityId,
    },
    security: {
      alarmEntityId: userConfig.security?.alarmEntityId || staticConfig.security.alarmEntityId,
      zones: userConfig.security?.zones?.length ? userConfig.security.zones : staticConfig.security.zones,
      dogModeEntityId: userConfig.security?.dogModeEntityId || staticConfig.security.dogModeEntityId,
    },
    rooms: userConfig.rooms?.length ? userConfig.rooms : staticConfig.rooms,
    persons: userConfig.persons?.length ? userConfig.persons : staticConfig.persons,
    appliances: userConfig.appliances?.length ? userConfig.appliances : staticConfig.appliances,
  }
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  config: staticConfig,
  isLoaded: false,
  isAuthenticated: false,
  sidebarState: 'expanded',

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
        sidebarState: data.sidebarState || 'expanded'
      })
    } catch (error) {
      console.error('[ConfigStore] Error loading config:', error)
      set({ isLoaded: true, isAuthenticated: false })
    }
  },

  updateConfig: async (updates) => {
    const { config, isAuthenticated } = get()
    
    if (!isAuthenticated) return false
    
    const newLayoutConfig = {
      weatherEntityId: updates.weatherEntityId ?? config.weatherEntityId,
      lightsGroupEntityId: updates.lightsGroupEntityId ?? config.lightsGroupEntityId,
      powerEntityId: updates.powerEntityId ?? config.powerEntityId,
      energy: updates.energy ?? config.energy,
      security: updates.security ?? config.security,
      rooms: updates.rooms ?? config.rooms,
      persons: updates.persons ?? config.persons,
      appliances: updates.appliances ?? config.appliances,
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
