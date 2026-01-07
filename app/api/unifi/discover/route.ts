import { NextRequest, NextResponse } from 'next/server'
import { ProtectClient } from '@/lib/unifi/protect-client'
import { AccessClient } from '@/lib/unifi/access-client'
import { csrfProtection } from '@/lib/auth/csrf'
import { getSessionFromCookie } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const csrfError = csrfProtection(request)
    if (csrfError) return csrfError
    
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { controllerUrl, protectApiKey, accessApiKey } = await request.json()
    
    if (!controllerUrl) {
      return NextResponse.json(
        { error: 'Controller URL required' },
        { status: 400 }
      )
    }
    
    const cameras: { id: string; name: string; type: string; state: string; host: string }[] = []
    const accessDevices: { id: string; name: string; type: string; doorId?: string }[] = []
    
    if (protectApiKey) {
      try {
        const protectClient = new ProtectClient(controllerUrl, protectApiKey)
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
    
    if (accessApiKey) {
      try {
        const accessClient = new AccessClient(controllerUrl, accessApiKey)
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
    console.error('[API] Discover error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Discovery failed' },
      { status: 500 }
    )
  }
}
