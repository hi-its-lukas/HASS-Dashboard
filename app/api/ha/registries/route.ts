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
    
    const [states, areas, entities] = await Promise.all([
      fetchStates(user.haInstanceUrl, token),
      fetchAreas(user.haInstanceUrl, token),
      fetchEntityRegistry(user.haInstanceUrl, token)
    ])
    
    const persons = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('person.'))
    const lights = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('light.'))
    const covers = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('cover.'))
    const scripts = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('script.'))
    const scenes = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('scene.'))
    const switches = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('switch.'))
    const sensors = states.filter((s: { entity_id: string }) => 
      s.entity_id.startsWith('sensor.') && 
      (s.entity_id.includes('power') || s.entity_id.includes('energy') || s.entity_id.includes('battery'))
    )
    const alarms = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('alarm_control_panel.'))
    const weather = states.filter((s: { entity_id: string }) => s.entity_id.startsWith('weather.'))
    
    return NextResponse.json({
      areas,
      entities,
      discovered: {
        persons,
        lights,
        covers,
        scripts,
        scenes,
        switches,
        sensors,
        alarms,
        weather
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
