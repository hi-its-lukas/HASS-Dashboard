// Dashboard Configuration
// Customize entity mappings and room definitions here

export interface RoomConfig {
  id: string
  name: string
  floor: 'ground' | 'upper'
  icon: string
  entityIds: string[]
}

export interface PersonConfig {
  id: string
  name: string
  entityId: string
  avatarUrl?: string
  batteryEntityId?: string
  stepsEntityId?: string
  distanceEntityId?: string
  floorsEntityId?: string
  activityEntityId?: string
}

export interface EnergyConfig {
  solarEntityId: string
  batteryEntityId: string
  batteryLevelEntityId: string
  gridEntityId: string
  houseEntityId: string
}

export interface SecurityConfig {
  alarmEntityId: string
  zones: { id: string; name: string; entityId: string }[]
  dogModeEntityId?: string
}

export interface ApplianceConfig {
  id: string
  name: string
  entityId: string
  icon: string
}

export interface DashboardConfig {
  weatherEntityId: string
  lightsGroupEntityId: string
  powerEntityId: string
  backgroundUrl?: string
  
  energy: EnergyConfig
  security: SecurityConfig
  rooms: RoomConfig[]
  persons: PersonConfig[]
  appliances: ApplianceConfig[]
}

export const dashboardConfig: DashboardConfig = {
  weatherEntityId: 'weather.home',
  lightsGroupEntityId: 'group.all_lights',
  powerEntityId: 'sensor.power_consumption',
  
  energy: {
    solarEntityId: 'sensor.solar_power',
    batteryEntityId: 'sensor.battery_power',
    batteryLevelEntityId: 'sensor.battery_level',
    gridEntityId: 'sensor.grid_power',
    houseEntityId: 'sensor.house_power',
  },
  
  security: {
    alarmEntityId: 'alarm_control_panel.home_alarm',
    zones: [],
    dogModeEntityId: 'input_boolean.dog_mode',
  },
  
  rooms: [],
  persons: [],
  appliances: [],
}

export default dashboardConfig
