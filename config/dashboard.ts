// Dashboard Configuration
// Customize entity mappings and room definitions here

export interface RoomConfig {
  id: string
  name: string
  floor: 'ground' | 'upper'
  icon: string
  entityIds: string[]
}

export interface PersonSensorConfig {
  id: string
  label: string
  entityId: string
  unit?: string
  icon?: string
}

export interface PersonConfig {
  id: string
  name: string
  entityId: string
  avatarUrl?: string
  batteryEntityId?: string
  sensors?: PersonSensorConfig[]
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

export interface CustomButtonConfig {
  id: string
  label: string
  icon: string
  domain: string
  service: string
  entityId?: string
  data?: Record<string, unknown>
}

export interface IntercomConfig {
  id: string
  name: string
  slug: string
  cameraEntityId: string
  speakUrl?: string
  lockEntityId?: string
  ttsEntityId?: string
}

export interface VacuumConfig {
  entityId: string
  batteryEntityId?: string
  statusEntityId?: string
  currentRoomEntityId?: string
  cleaningProgressEntityId?: string
  cleaningAreaEntityId?: string
  cleaningTimeEntityId?: string
  chargingEntityId?: string
  cleaningEntityId?: string
  mopAttachedEntityId?: string
  errorEntityId?: string
  mopModeEntityId?: string
  waterIntensityEntityId?: string
  filterRemainingEntityId?: string
  mainBrushRemainingEntityId?: string
  sideBrushRemainingEntityId?: string
  sensorRemainingEntityId?: string
  totalCleaningsEntityId?: string
  totalAreaEntityId?: string
  totalTimeEntityId?: string
  fullCleanButtonEntityId?: string
}

export interface LightConfig {
  entityId: string
  name?: string
}

export interface CoverConfig {
  entityId: string
  name?: string
}

export interface PersonDetailConfig {
  entityId: string
  name: string
  batteryEntityId?: string
  sensors: PersonSensorConfig[]
}

export interface DashboardConfig {
  weatherEntityId: string
  temperatureSensorId?: string
  trashCalendarId?: string
  lightsGroupEntityId: string
  powerEntityId: string
  backgroundUrl?: string
  calendars?: string[]
  climates?: string[]
  vacuumEntityId?: string
  vacuum?: VacuumConfig
  
  energy: EnergyConfig
  security: SecurityConfig
  rooms: RoomConfig[]
  persons: PersonConfig[]
  personDetails?: PersonDetailConfig[]
  appliances: ApplianceConfig[]
  customButtons: CustomButtonConfig[]
  intercoms: IntercomConfig[]
  lights: (string | LightConfig)[]
  covers: (string | CoverConfig)[]
  awnings?: string[]
  curtains?: string[]
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
  customButtons: [],
  intercoms: [],
  lights: [],
  covers: [],
  awnings: [],
  curtains: [],
}

export default dashboardConfig
