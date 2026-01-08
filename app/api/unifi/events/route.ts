import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { ProtectClient } from '@/lib/unifi/protect-client'
import { getGlobalUnifiConfig, getGlobalLayoutConfig } from '@/lib/config/global-settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const layoutConfig = await getGlobalLayoutConfig()
    const unifi = await getGlobalUnifiConfig()
    
    if (!unifi?.controllerUrl || !unifi?.protectApiKey) {
      return NextResponse.json({ 
        error: 'UniFi Protect not configured',
        events: [] 
      }, { status: 200 })
    }
    
    if (!layoutConfig.unifi?.aiSurveillanceEnabled) {
      return NextResponse.json({ 
        error: 'AI Surveillance not enabled',
        events: [] 
      }, { status: 200 })
    }
    
    const client = new ProtectClient(unifi.controllerUrl, unifi.protectApiKey)
    const rawEvents = await client.getSmartDetections(24)
    
    const events = rawEvents.map((event) => {
      let type = 'motion'
      if (event.smartDetectTypes?.includes('person')) type = 'person'
      else if (event.smartDetectTypes?.includes('vehicle')) type = 'vehicle'
      else if (event.smartDetectTypes?.includes('package')) type = 'package'
      else if (event.smartDetectTypes?.includes('animal')) type = 'animal'
      
      return {
        id: event.id,
        type,
        cameraName: 'Camera',
        cameraId: event.camera || '',
        timestamp: new Date(event.start).toISOString(),
        thumbnailUrl: `/api/unifi/protect/thumbnail/${event.id}`,
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
