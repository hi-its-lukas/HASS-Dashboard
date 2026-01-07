import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import prisma from '@/lib/db/client'
import { ProtectClient } from '@/lib/unifi/protect-client'
import { AccessClient } from '@/lib/unifi/access-client'
import { decryptUnifiApiKeys, UnifiConfig } from '@/lib/unifi/encryption'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const config = await prisma.dashboardConfig.findUnique({
      where: { userId: session.userId }
    })
    
    if (!config?.layoutConfig) {
      return NextResponse.json({ error: 'No saved config' }, { status: 404 })
    }
    
    const layoutConfig = JSON.parse(config.layoutConfig)
    if (!layoutConfig.unifi) {
      return NextResponse.json({ error: 'No UniFi config' }, { status: 404 })
    }
    
    const unifi = decryptUnifiApiKeys(layoutConfig.unifi as UnifiConfig)
    
    if (!unifi.controllerUrl) {
      return NextResponse.json({ error: 'Controller URL required' }, { status: 400 })
    }
    
    const cameras: { id: string; name: string; type: string; state: string; host: string }[] = []
    const accessDevices: { id: string; name: string; type: string; doorId?: string }[] = []
    
    if (unifi.protectApiKey) {
      try {
        const protectClient = new ProtectClient(unifi.controllerUrl, unifi.protectApiKey)
        const protectCameras = await protectClient.getCameras()
        
        cameras.push(...protectCameras.map(cam => ({
          id: cam.id,
          name: cam.name,
          type: cam.modelKey || cam.type,
          state: cam.state,
          host: cam.host
        })))
      } catch (error) {
        console.error('[API] Protect discovery error:', error)
      }
    }
    
    if (unifi.accessApiKey) {
      try {
        const accessClient = new AccessClient(unifi.controllerUrl, unifi.accessApiKey)
        const doors = await accessClient.getDoors()
        
        accessDevices.push(...doors.map(door => ({
          id: door.unique_id,
          name: door.name,
          type: door.type || 'door',
          doorId: door.unique_id
        })))
      } catch (error) {
        console.error('[API] Access discovery error:', error)
      }
    }
    
    return NextResponse.json({
      cameras,
      accessDevices
    })
  } catch (error) {
    console.error('[API] Discover-saved error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Discovery failed' },
      { status: 500 }
    )
  }
}
