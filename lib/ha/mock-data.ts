// Mock Data Provider for development without HA connection

import { HAState, SurveillanceEvent } from './types'

export const mockStates: Record<string, HAState> = {
  // Weather
  'weather.home': {
    entity_id: 'weather.home',
    state: 'sunny',
    attributes: {
      temperature: 31,
      humidity: 45,
      friendly_name: 'Home',
    },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },

  // Lights
  'group.all_lights': {
    entity_id: 'group.all_lights',
    state: 'on',
    attributes: {
      entity_id: [
        'light.kitchen_main',
        'light.kitchen_counter',
        'light.living_room_main',
        'light.living_room_lamp',
        'light.entry',
        'light.hallway',
        'light.garage',
        'light.bedroom_main',
        'light.bedroom_lamp',
        'light.alexandra_room',
        'light.mila_room',
        'light.upstairs_hall',
      ],
      friendly_name: 'All Lights',
    },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'light.kitchen_main': {
    entity_id: 'light.kitchen_main',
    state: 'off',
    attributes: { friendly_name: 'Kitchen Main', brightness: 0 },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'light.kitchen_counter': {
    entity_id: 'light.kitchen_counter',
    state: 'off',
    attributes: { friendly_name: 'Kitchen Counter', brightness: 0 },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'light.living_room_main': {
    entity_id: 'light.living_room_main',
    state: 'on',
    attributes: { friendly_name: 'Living Room Main', brightness: 200 },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'light.living_room_lamp': {
    entity_id: 'light.living_room_lamp',
    state: 'off',
    attributes: { friendly_name: 'Living Room Lamp', brightness: 0 },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'light.entry': {
    entity_id: 'light.entry',
    state: 'off',
    attributes: { friendly_name: 'Entry', brightness: 0 },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'light.hallway': {
    entity_id: 'light.hallway',
    state: 'off',
    attributes: { friendly_name: 'Hallway', brightness: 0 },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'light.garage': {
    entity_id: 'light.garage',
    state: 'on',
    attributes: { friendly_name: 'Garage', brightness: 255 },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'light.bedroom_main': {
    entity_id: 'light.bedroom_main',
    state: 'on',
    attributes: { friendly_name: 'Main Bedroom', brightness: 150 },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'light.bedroom_lamp': {
    entity_id: 'light.bedroom_lamp',
    state: 'on',
    attributes: { friendly_name: 'Bedroom Lamp', brightness: 100 },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'light.alexandra_room': {
    entity_id: 'light.alexandra_room',
    state: 'off',
    attributes: { friendly_name: "Alexandra's Room", brightness: 0 },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'light.mila_room': {
    entity_id: 'light.mila_room',
    state: 'off',
    attributes: { friendly_name: "Mila's Room", brightness: 0 },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'light.upstairs_hall': {
    entity_id: 'light.upstairs_hall',
    state: 'off',
    attributes: { friendly_name: 'Upstairs Hall', brightness: 0 },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },

  // Power
  'sensor.power_consumption': {
    entity_id: 'sensor.power_consumption',
    state: '696',
    attributes: { friendly_name: 'Power Consumption', unit_of_measurement: 'W' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },

  // Energy sensors
  'sensor.solar_power': {
    entity_id: 'sensor.solar_power',
    state: '20',
    attributes: { friendly_name: 'Solar Power', unit_of_measurement: 'W' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.battery_power': {
    entity_id: 'sensor.battery_power',
    state: '150',
    attributes: { friendly_name: 'Battery Power', unit_of_measurement: 'W' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.battery_level': {
    entity_id: 'sensor.battery_level',
    state: '90',
    attributes: { friendly_name: 'Battery Level', unit_of_measurement: '%' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.grid_power': {
    entity_id: 'sensor.grid_power',
    state: '736',
    attributes: { friendly_name: 'Grid Power', unit_of_measurement: 'W' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.house_power': {
    entity_id: 'sensor.house_power',
    state: '702',
    attributes: { friendly_name: 'House Power', unit_of_measurement: 'W' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },

  // Alarm
  'alarm_control_panel.home_alarm': {
    entity_id: 'alarm_control_panel.home_alarm',
    state: 'disarmed',
    attributes: {
      friendly_name: 'Home Alarm',
      code_format: 'number',
      changed_by: 'User',
      code_arm_required: true,
    },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },

  // Security zones
  'binary_sensor.kitchen_motion': {
    entity_id: 'binary_sensor.kitchen_motion',
    state: 'on',
    attributes: { friendly_name: 'Kitchen Motion', device_class: 'motion' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'binary_sensor.living_motion': {
    entity_id: 'binary_sensor.living_motion',
    state: 'off',
    attributes: { friendly_name: 'Living Room Motion', device_class: 'motion' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'binary_sensor.entry_door': {
    entity_id: 'binary_sensor.entry_door',
    state: 'off',
    attributes: { friendly_name: 'Entry Door', device_class: 'door' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'input_boolean.dog_mode': {
    entity_id: 'input_boolean.dog_mode',
    state: 'off',
    attributes: { friendly_name: 'Dog Mode' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },

  // Persons
  'person.tatiana': {
    entity_id: 'person.tatiana',
    state: 'home',
    attributes: { friendly_name: 'Tatiana', source: 'device_tracker.tatiana_phone' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'person.nico': {
    entity_id: 'person.nico',
    state: 'home',
    attributes: { friendly_name: 'Nico', source: 'device_tracker.nico_phone' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'person.alexandra': {
    entity_id: 'person.alexandra',
    state: 'home',
    attributes: { friendly_name: 'Alexandra', source: 'device_tracker.alexandra_phone' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'person.mila': {
    entity_id: 'person.mila',
    state: 'home',
    attributes: { friendly_name: 'Mila', source: 'device_tracker.mila_phone' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },

  // Person batteries
  'sensor.tatiana_phone_battery': {
    entity_id: 'sensor.tatiana_phone_battery',
    state: '50',
    attributes: { friendly_name: 'Tatiana Phone Battery', unit_of_measurement: '%' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.nico_phone_battery': {
    entity_id: 'sensor.nico_phone_battery',
    state: '50',
    attributes: { friendly_name: 'Nico Phone Battery', unit_of_measurement: '%' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.alexandra_phone_battery': {
    entity_id: 'sensor.alexandra_phone_battery',
    state: '45',
    attributes: { friendly_name: 'Alexandra Phone Battery', unit_of_measurement: '%' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.mila_phone_battery': {
    entity_id: 'sensor.mila_phone_battery',
    state: '25',
    attributes: { friendly_name: 'Mila Phone Battery', unit_of_measurement: '%' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },

  // Activity sensors
  'sensor.tatiana_steps': {
    entity_id: 'sensor.tatiana_steps',
    state: '884',
    attributes: { friendly_name: 'Tatiana Steps', unit_of_measurement: 'steps' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.tatiana_distance': {
    entity_id: 'sensor.tatiana_distance',
    state: '0.6',
    attributes: { friendly_name: 'Tatiana Distance', unit_of_measurement: 'km' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.tatiana_floors': {
    entity_id: 'sensor.tatiana_floors',
    state: '4',
    attributes: { friendly_name: 'Tatiana Floors' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.tatiana_activity': {
    entity_id: 'sensor.tatiana_activity',
    state: 'walking',
    attributes: { friendly_name: 'Tatiana Activity' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.nico_steps': {
    entity_id: 'sensor.nico_steps',
    state: '1448',
    attributes: { friendly_name: 'Nico Steps', unit_of_measurement: 'steps' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.nico_distance': {
    entity_id: 'sensor.nico_distance',
    state: '1.0',
    attributes: { friendly_name: 'Nico Distance', unit_of_measurement: 'km' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.nico_floors': {
    entity_id: 'sensor.nico_floors',
    state: '4',
    attributes: { friendly_name: 'Nico Floors' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.nico_activity': {
    entity_id: 'sensor.nico_activity',
    state: 'driving',
    attributes: { friendly_name: 'Nico Activity' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.alexandra_steps': {
    entity_id: 'sensor.alexandra_steps',
    state: '765',
    attributes: { friendly_name: 'Alexandra Steps', unit_of_measurement: 'steps' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.alexandra_distance': {
    entity_id: 'sensor.alexandra_distance',
    state: '0.5',
    attributes: { friendly_name: 'Alexandra Distance', unit_of_measurement: 'km' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.alexandra_floors': {
    entity_id: 'sensor.alexandra_floors',
    state: '4',
    attributes: { friendly_name: 'Alexandra Floors' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.alexandra_activity': {
    entity_id: 'sensor.alexandra_activity',
    state: 'stationary',
    attributes: { friendly_name: 'Alexandra Activity' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.mila_steps': {
    entity_id: 'sensor.mila_steps',
    state: '793',
    attributes: { friendly_name: 'Mila Steps', unit_of_measurement: 'steps' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.mila_distance': {
    entity_id: 'sensor.mila_distance',
    state: '0.4',
    attributes: { friendly_name: 'Mila Distance', unit_of_measurement: 'km' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.mila_floors': {
    entity_id: 'sensor.mila_floors',
    state: '3',
    attributes: { friendly_name: 'Mila Floors' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'sensor.mila_activity': {
    entity_id: 'sensor.mila_activity',
    state: 'stationary',
    attributes: { friendly_name: 'Mila Activity' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },

  // Appliances
  'switch.geyser': {
    entity_id: 'switch.geyser',
    state: 'on',
    attributes: { friendly_name: 'Geyser' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'switch.washer': {
    entity_id: 'switch.washer',
    state: 'off',
    attributes: { friendly_name: 'Washer' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'switch.dryer': {
    entity_id: 'switch.dryer',
    state: 'off',
    attributes: { friendly_name: 'Dryer' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
  'switch.dishwasher': {
    entity_id: 'switch.dishwasher',
    state: 'off',
    attributes: { friendly_name: 'Dishwasher' },
    last_changed: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  },
}

// Generate power trend data for the last 6 hours
export function generatePowerTrendData() {
  const data = []
  const now = Date.now()
  for (let i = 360; i >= 0; i -= 10) {
    const time = new Date(now - i * 60 * 1000)
    const baseValue = 500 + Math.sin(i / 60) * 200
    const noise = Math.random() * 100 - 50
    data.push({
      time: time.toISOString(),
      value: Math.round(Math.max(0, baseValue + noise)),
      avg: Math.round(baseValue),
    })
  }
  return data
}

// Mock surveillance events
export const mockSurveillanceEvents: SurveillanceEvent[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    camera: 'Garage',
    type: 'vehicle',
    label: 'CAR',
    confidence: 85,
    thumbnailUrl: '/thumbnails/garage.jpg',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 19 * 60 * 1000).toISOString(),
    camera: 'Backyard',
    type: 'animal',
    label: 'DOG',
    confidence: 83,
    thumbnailUrl: '/thumbnails/backyard.jpg',
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    camera: 'Indoor',
    type: 'person',
    label: 'PERSON',
    confidence: 84,
    thumbnailUrl: '/thumbnails/indoor.jpg',
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    camera: 'Indoor',
    type: 'person',
    label: 'PERSON',
    confidence: 85,
    thumbnailUrl: '/thumbnails/indoor2.jpg',
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    camera: 'Front Door',
    type: 'person',
    label: 'PERSON',
    confidence: 93,
    thumbnailUrl: '/thumbnails/front.jpg',
  },
]

export const mockSurveillanceStats = {
  events: 50,
  people: 32,
  vehicles: 5,
  ai: 48,
}
