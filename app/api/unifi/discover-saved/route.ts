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
    
    const cameras: { id: string; name: string; type: string; state: string; host: string; width?: number; height?: number }[] = []
    const accessDevices: { id: string; name: string; type: string; doorId?: string }[] = []
    
    if (unifi.protectApiKey) {
      try {
        const protectClient = new ProtectClient(unifi.controllerUrl, unifi.protectApiKey)
        const protectCameras = await protectClient.getCameras()
        
        cameras.push(...protectCameras.map(cam => {
          const highChannel = cam.channels?.find(ch => ch.name === 'High') || cam.channels?.[0]
          return {
            id: cam.id,
            name: cam.name,
            type: cam.modelKey || cam.type,
            state: cam.state,
            host: cam.host,
            width: highChannel?.width,
            height: highChannel?.height
          }
        }))
      } catch (error) {
        console.error('[API] Protect discovery error:', error)
      }
    }
    
    if (unifi.accessApiKey) {
      try {
        const accessClient = new AccessClient(unifi.controllerUrl, unifi.accessApiKey)
        const doors = await accessClient.getDoors()
        
        console.log('[API] Raw doors from Access API:', JSON.stringify(doors, null, 2))
        
        accessDevices.push(...doors.map(door => {
          const rawDoor = door as unknown as Record<string, unknown>
          const id = door.unique_id || rawDoor.id || rawDoor._id || ''
          console.log('[API] Door mapping:', { unique_id: door.unique_id, id: rawDoor.id, _id: rawDoor._id, name: door.name, finalId: id })
          return {
            id: String(id),
            name: door.name,
            type: door.type || 'door',
            doorId: String(id)
          }
        }))
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
