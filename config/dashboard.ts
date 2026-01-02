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
  // General
  weatherEntityId: string
  lightsGroupEntityId: string
  powerEntityId: string
  
  // Sections
  energy: EnergyConfig
  security: SecurityConfig
  rooms: RoomConfig[]
  persons: PersonConfig[]
  appliances: ApplianceConfig[]
}

export const dashboardConfig: DashboardConfig = {
  // Weather entity for temperature display
  weatherEntityId: 'weather.home',
  
  // Group that contains all lights for counting
  lightsGroupEntityId: 'group.all_lights',
  
  // Power sensor for current consumption
  powerEntityId: 'sensor.power_consumption',
  
  // Energy configuration
  energy: {
    solarEntityId: 'sensor.solar_power',
    batteryEntityId: 'sensor.battery_power',
    batteryLevelEntityId: 'sensor.battery_level',
    gridEntityId: 'sensor.grid_power',
    houseEntityId: 'sensor.house_power',
  },
  
  // Security configuration
  security: {
    alarmEntityId: 'alarm_control_panel.home_alarm',
    zones: [
      { id: 'kitchen', name: 'Kitchen', entityId: 'binary_sensor.kitchen_motion' },
      { id: 'living', name: 'Living Room', entityId: 'binary_sensor.living_motion' },
      { id: 'entry', name: 'Entry', entityId: 'binary_sensor.entry_door' },
    ],
    dogModeEntityId: 'input_boolean.dog_mode',
  },
  
  // Room definitions
  rooms: [
    {
      id: 'kitchen',
      name: 'Kitchen',
      floor: 'ground',
      icon: 'utensils',
      entityIds: [
        'light.kitchen_main',
        'light.kitchen_counter',
        'switch.kitchen_hood',
      ],
    },
    {
      id: 'living_room',
      name: 'Living Room',
      floor: 'ground',
      icon: 'sofa',
      entityIds: [
        'light.living_room_main',
        'light.living_room_lamp',
        'switch.tv_power',
      ],
    },
    {
      id: 'entry',
      name: 'Entry',
      floor: 'ground',
      icon: 'door-open',
      entityIds: [
        'light.entry',
        'lock.front_door',
      ],
    },
    {
      id: 'hallway',
      name: 'Hallway',
      floor: 'ground',
      icon: 'layout',
      entityIds: [
        'light.hallway',
      ],
    },
    {
      id: 'garage',
      name: 'Garage',
      floor: 'ground',
      icon: 'warehouse',
      entityIds: [
        'light.garage',
        'cover.garage_door',
      ],
    },
    {
      id: 'main_bedroom',
      name: 'Main Bedroom',
      floor: 'upper',
      icon: 'home',
      entityIds: [
        'light.bedroom_main',
        'light.bedroom_lamp',
        'fan.bedroom',
      ],
    },
    {
      id: 'alexandras_room',
      name: "Alexandra's Room",
      floor: 'upper',
      icon: 'star',
      entityIds: [
        'light.alexandra_room',
      ],
    },
    {
      id: 'milas_room',
      name: "Mila's Room",
      floor: 'upper',
      icon: 'heart',
      entityIds: [
        'light.mila_room',
      ],
    },
    {
      id: 'upstairs_hall',
      name: 'Upstairs Hall',
      floor: 'upper',
      icon: 'layout',
      entityIds: [
        'light.upstairs_hall',
      ],
    },
  ],
  
  // Person/family member definitions
  persons: [
    {
      id: 'tatiana',
      name: 'Tatiana',
      entityId: 'person.tatiana',
      avatarUrl: '/avatars/tatiana.jpg',
      batteryEntityId: 'sensor.tatiana_phone_battery',
      stepsEntityId: 'sensor.tatiana_steps',
      distanceEntityId: 'sensor.tatiana_distance',
      floorsEntityId: 'sensor.tatiana_floors',
      activityEntityId: 'sensor.tatiana_activity',
    },
    {
      id: 'nico',
      name: 'Nico',
      entityId: 'person.nico',
      avatarUrl: '/avatars/nico.jpg',
      batteryEntityId: 'sensor.nico_phone_battery',
      stepsEntityId: 'sensor.nico_steps',
      distanceEntityId: 'sensor.nico_distance',
      floorsEntityId: 'sensor.nico_floors',
      activityEntityId: 'sensor.nico_activity',
    },
    {
      id: 'alexandra',
      name: 'Alexandra',
      entityId: 'person.alexandra',
      avatarUrl: '/avatars/alexandra.jpg',
      batteryEntityId: 'sensor.alexandra_phone_battery',
      stepsEntityId: 'sensor.alexandra_steps',
      distanceEntityId: 'sensor.alexandra_distance',
      floorsEntityId: 'sensor.alexandra_floors',
      activityEntityId: 'sensor.alexandra_activity',
    },
    {
      id: 'mila',
      name: 'Mila',
      entityId: 'person.mila',
      avatarUrl: '/avatars/mila.jpg',
      batteryEntityId: 'sensor.mila_phone_battery',
      stepsEntityId: 'sensor.mila_steps',
      distanceEntityId: 'sensor.mila_distance',
      floorsEntityId: 'sensor.mila_floors',
      activityEntityId: 'sensor.mila_activity',
    },
  ],
  
  // Appliances for energy page
  appliances: [
    { id: 'geyser', name: 'Geyser', entityId: 'switch.geyser', icon: 'flame' },
    { id: 'washer', name: 'Washer', entityId: 'switch.washer', icon: 'loader' },
    { id: 'dryer', name: 'Dryer', entityId: 'switch.dryer', icon: 'wind' },
    { id: 'dishwasher', name: 'Dishwasher', entityId: 'switch.dishwasher', icon: 'droplets' },
  ],
}

export default dashboardConfig
