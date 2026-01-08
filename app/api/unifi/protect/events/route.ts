import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { ProtectClient } from '@/lib/unifi/protect-client'
import { getGlobalUnifiConfig } from '@/lib/config/global-settings'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const unifi = await getGlobalUnifiConfig()
    
    if (!unifi?.controllerUrl || !unifi?.protectApiKey) {
      return NextResponse.json({ error: 'UniFi Protect not configured' }, { status: 400 })
    }
    
    const client = new ProtectClient(unifi.controllerUrl, unifi.protectApiKey)
    
    const searchParams = request.nextUrl.searchParams
    const hours = parseInt(searchParams.get('hours') || '24')
    
    const events = await client.getSmartDetections(hours)
    
    return NextResponse.json({ events })
  } catch (error) {
    console.error('[API] Protect events error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get events' },
      { status: 500 }
    )
  }
}
