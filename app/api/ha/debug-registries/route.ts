import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getStoredToken } from '@/lib/auth/ha-oauth'
import prisma from '@/lib/db/client'

export const dynamic = 'force-dynamic'

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
    
    const [areasResult, entitiesResult, devicesResult] = await Promise.all([
      fetchAreas(user.haInstanceUrl, token),
      fetchEntityRegistry(user.haInstanceUrl, token),
      fetchDeviceRegistry(user.haInstanceUrl, token)
    ])
    
    const areas = Array.isArray(areasResult) ? areasResult : []
    const entities = Array.isArray(entitiesResult) ? entitiesResult : []
    const devices = Array.isArray(devicesResult) ? devicesResult : []
    
    const lightEntities = entities.filter((e: any) => e.entity_id?.startsWith('light.'))
    const coverEntities = entities.filter((e: any) => e.entity_id?.startsWith('cover.'))
    
    return NextResponse.json({
      areasRaw: areasResult,
      entitiesRaw: entitiesResult,
      devicesRaw: devicesResult,
      areas,
      devices: devices.slice(0, 10),
      lightEntities: lightEntities.slice(0, 5),
      coverEntities: coverEntities.slice(0, 5),
      totalEntities: entities.length,
      totalDevices: devices.length,
      totalAreas: areas.length
    }, { status: 200 })
  } catch (error) {
    console.error('[API] /ha/debug-registries error:', error)
    return NextResponse.json({ error: 'Internal error', details: String(error) }, { status: 500 })
  }
}

async function fetchAreas(haUrl: string, token: string) {
  try {
    const response = await fetch(new URL('/api/config/area_registry/list', haUrl).toString(), {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: '{}'
    })
    if (!response.ok) {
      return { error: response.status, statusText: response.statusText }
    }
    return response.json()
  } catch (e) {
    return { fetchError: String(e) }
  }
}

async function fetchEntityRegistry(haUrl: string, token: string) {
  try {
    const response = await fetch(new URL('/api/config/entity_registry/list', haUrl).toString(), {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: '{}'
    })
    if (!response.ok) {
      return { error: response.status, statusText: response.statusText }
    }
    return response.json()
  } catch (e) {
    return { fetchError: String(e) }
  }
}

async function fetchDeviceRegistry(haUrl: string, token: string) {
  try {
    const response = await fetch(new URL('/api/config/device_registry/list', haUrl).toString(), {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: '{}'
    })
    if (!response.ok) {
      return { error: response.status, statusText: response.statusText }
    }
    return response.json()
  } catch (e) {
    return { fetchError: String(e) }
  }
}
