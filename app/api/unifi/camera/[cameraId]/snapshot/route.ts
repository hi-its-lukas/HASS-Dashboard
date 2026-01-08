import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getGlobalUnifiConfig } from '@/lib/config/global-settings'
import { ProtectClient } from '@/lib/unifi/protect-client'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { cameraId: string } }
) {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const unifi = await getGlobalUnifiConfig()
    if (!unifi?.controllerUrl || !unifi?.protectApiKey) {
      return NextResponse.json({ error: 'UniFi Protect nicht konfiguriert' }, { status: 400 })
    }
    
    const { cameraId } = params
    const decodedCameraId = decodeURIComponent(cameraId)
    
    const protectClient = new ProtectClient(unifi.controllerUrl, unifi.protectApiKey)
    const imageBuffer = await protectClient.getSnapshot(decodedCameraId)
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
  } catch (error) {
    console.error('[API] UniFi camera snapshot error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Snapshot failed' },
      { status: 500 }
    )
  }
}
