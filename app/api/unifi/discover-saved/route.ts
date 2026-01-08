import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { ProtectClient } from '@/lib/unifi/protect-client'
import { AccessClient } from '@/lib/unifi/access-client'
import { getGlobalUnifiConfig } from '@/lib/config/global-settings'
import { csrfProtection } from '@/lib/auth/csrf'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const csrfError = csrfProtection(request)
    if (csrfError) return csrfError
    
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const unifi = await getGlobalUnifiConfig()
    
    if (!unifi?.controllerUrl) {
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
