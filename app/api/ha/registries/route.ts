import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getStoredToken } from '@/lib/auth/ha-oauth'
import prisma from '@/lib/db/client'

export const dynamic = 'force-dynamic'

interface HAArea {
  area_id: string
  name: string
  picture?: string
}

interface HADevice {
  id: string
  name: string
  area_id?: string
  manufacturer?: string
  model?: string
}

interface HAEntity {
  entity_id: string
  name?: string
  area_id?: string
  device_id?: string
  platform?: string
}

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    })
    
    if (!user?.haInstanceUrl) {
      return NextResponse.json({ error: 'No Home Assistant instance configured' }, { status: 400 })
    }
    
    const token = await getStoredToken(session.userId)
    
    if (!token) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 })
    }
    
    const [states, areas, entities, devices] = await Promise.all([
      fetchStates(user.haInstanceUrl, token),
      fetchAreas(user.haInstanceUrl, token),
      fetchEntityRegistry(user.haInstanceUrl, token),
      fetchDeviceRegistry(user.haInstanceUrl, token)
    ])
    
    const persons = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('person.'))
    const lights = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('light.'))
    const covers = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('cover.'))
    const scripts = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('script.'))
    const scenes = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('scene.'))
    const switches = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('switch.'))
    const sensors = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('sensor.'))
    const binarySensors = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('binary_sensor.'))
    const alarms = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('alarm_control_panel.'))
    const weather = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('weather.'))
    const cameras = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('camera.'))
    const calendars = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('calendar.'))
    const climates = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('climate.'))
    const locks = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('lock.'))
    const mediaPlayers = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('media_player.'))
    const inputBooleans = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('input_boolean.'))
    const automations = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('automation.'))
    const deviceTrackers = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('device_tracker.'))
    const fans = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('fan.'))
    const vacuums = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('vacuum.'))
    const buttons = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('button.'))
    const selects = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('select.'))
    
    return NextResponse.json({
      areas,
      entities,
      devices,
      discovered: {
        persons,
        lights,
        covers,
        scripts,
        scenes,
        switches,
        sensors,
        binarySensors,
        alarms,
        weather,
        cameras,
        calendars,
        climates,
        locks,
        mediaPlayers,
        inputBooleans,
        automations,
        deviceTrackers,
        fans,
        vacuums,
        buttons,
        selects
      }
    })
  } catch (error) {
    console.error('[API] /ha/registries error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function fetchStates(haUrl: string, token: string) {
  const response = await fetch(new URL('/api/states', haUrl).toString(), {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!response.ok) return []
  return response.json()
}

async function fetchAreas(haUrl: string, token: string): Promise<HAArea[]> {
  const response = await fetch(new URL('/api/config/area_registry/list', haUrl).toString(), {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: '{}'
  })
  if (!response.ok) return []
  return response.json()
}

async function fetchEntityRegistry(haUrl: string, token: string): Promise<HAEntity[]> {
  const response = await fetch(new URL('/api/config/entity_registry/list', haUrl).toString(), {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: '{}'
  })
  if (!response.ok) return []
  return response.json()
}

async function fetchDeviceRegistry(haUrl: string, token: string): Promise<HADevice[]> {
  const response = await fetch(new URL('/api/config/device_registry/list', haUrl).toString(), {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: '{}'
  })
  if (!response.ok) return []
  return response.json()
}
