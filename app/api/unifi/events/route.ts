import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import prisma from '@/lib/db/client'

export const dynamic = 'force-dynamic'

interface UnifiEvent {
  id: string
  type: string
  camera: {
    id: string
    name: string
  }
  start: number
  end?: number
  score: number
  thumbnail?: string
  smartDetectTypes?: string[]
}

async function getUnifiConfig(userId: string) {
  const config = await prisma.dashboardConfig.findUnique({
    where: { userId }
  })
  
  if (!config?.layoutConfig) return null
  
  const layoutConfig = JSON.parse(config.layoutConfig) as Record<string, unknown>
  return layoutConfig.unifi as {
    controllerUrl?: string
    username?: string
    password?: string
    aiSurveillanceEnabled?: boolean
  } | undefined
}

async function authenticateUnifi(controllerUrl: string, username: string, password: string) {
  const baseUrl = controllerUrl.replace(/\/$/, '')
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include'
  })
  
  if (!loginRes.ok) {
    throw new Error('UniFi authentication failed')
  }
  
  return loginRes.headers.get('set-cookie') || ''
}

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const unifiConfig = await getUnifiConfig(session.userId)
    
    if (!unifiConfig?.controllerUrl || !unifiConfig?.username || !unifiConfig?.password) {
      return NextResponse.json({ 
        error: 'UniFi not configured',
        events: [] 
      }, { status: 200 })
    }
    
    if (!unifiConfig.aiSurveillanceEnabled) {
      return NextResponse.json({ 
        error: 'AI Surveillance not enabled',
        events: [] 
      }, { status: 200 })
    }
    
    const cookies = await authenticateUnifi(
      unifiConfig.controllerUrl,
      unifiConfig.username,
      unifiConfig.password
    )
    
    if (!cookies) {
      return NextResponse.json({ error: 'UniFi auth failed' }, { status: 500 })
    }
    
    const baseUrl = unifiConfig.controllerUrl.replace(/\/$/, '')
    const now = Date.now()
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000
    
    const eventsRes = await fetch(
      `${baseUrl}/proxy/protect/api/events?start=${twentyFourHoursAgo}&end=${now}&types=smartDetectZone,motion`, 
      {
        headers: {
          'Cookie': cookies,
          'Accept': 'application/json'
        }
      }
    )
    
    if (!eventsRes.ok) {
      const text = await eventsRes.text()
      console.error('[UniFi Events] Failed:', text)
      return NextResponse.json({ error: 'Failed to fetch events', events: [] }, { status: 200 })
    }
    
    const rawEvents: UnifiEvent[] = await eventsRes.json()
    
    const events = rawEvents.map((event) => {
      let type = 'motion'
      if (event.smartDetectTypes?.includes('person')) type = 'person'
      else if (event.smartDetectTypes?.includes('vehicle')) type = 'vehicle'
      else if (event.smartDetectTypes?.includes('package')) type = 'package'
      else if (event.smartDetectTypes?.includes('animal')) type = 'animal'
      
      return {
        id: event.id,
        type,
        cameraName: event.camera?.name || 'Unknown Camera',
        cameraId: event.camera?.id || '',
        timestamp: new Date(event.start).toISOString(),
        thumbnailUrl: event.thumbnail 
          ? `/api/unifi/thumbnail/${event.id}`
          : undefined,
        confidence: event.score / 100,
        description: event.smartDetectTypes?.join(', ')
      }
    })
    
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    return NextResponse.json({ events: events.slice(0, 100) })
  } catch (error) {
    console.error('[UniFi Events] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      events: [] 
    }, { status: 200 })
  }
}
