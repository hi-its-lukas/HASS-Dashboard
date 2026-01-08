import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/permissions'
import { AccessClient } from '@/lib/unifi/access-client'
import { getGlobalUnifiConfig } from '@/lib/config/global-settings'
import { csrfProtection } from '@/lib/auth/csrf'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ doorId: string }> }
) {
  try {
    const csrfError = csrfProtection(request)
    if (csrfError) return csrfError
    
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const canUnlock = await hasPermission(session.userId, 'action:locks')
    if (!canUnlock) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }
    
    const { doorId } = await params
    
    const unifi = await getGlobalUnifiConfig()
    
    if (!unifi?.controllerUrl || !unifi?.accessApiKey) {
      return NextResponse.json({ error: 'UniFi Access not configured' }, { status: 400 })
    }
    
    const client = new AccessClient(unifi.controllerUrl, unifi.accessApiKey)
    await client.unlockDoor(doorId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Access unlock error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to unlock door' },
      { status: 500 }
    )
  }
}
