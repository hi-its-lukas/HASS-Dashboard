import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { ProtectClient } from '@/lib/unifi/protect-client'
import { getGlobalUnifiConfig } from '@/lib/config/global-settings'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { eventId } = await params
    
    const unifi = await getGlobalUnifiConfig()
    
    if (!unifi?.controllerUrl || !unifi?.protectApiKey) {
      return NextResponse.json({ error: 'UniFi Protect not configured' }, { status: 400 })
    }
    
    const client = new ProtectClient(unifi.controllerUrl, unifi.protectApiKey)
    const thumbnail = await client.getThumbnail(eventId)
    
    return new NextResponse(new Uint8Array(thumbnail), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error) {
    console.error('[API] Protect thumbnail error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get thumbnail' },
      { status: 500 }
    )
  }
}
