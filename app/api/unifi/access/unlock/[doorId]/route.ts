import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/permissions'
import prisma from '@/lib/db/client'
import { AccessClient } from '@/lib/unifi/access-client'
import { decryptUnifiApiKeys, UnifiConfig } from '@/lib/unifi/encryption'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ doorId: string }> }
) {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const canUnlock = await hasPermission(session.userId, 'action:locks')
    if (!canUnlock) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }
    
    const { doorId } = await params
    
    const config = await prisma.dashboardConfig.findUnique({
      where: { userId: session.userId }
    })
    
    if (!config?.layoutConfig) {
      return NextResponse.json({ error: 'No config found' }, { status: 404 })
    }
    
    const layoutConfig = JSON.parse(config.layoutConfig as string)
    const unifi = decryptUnifiApiKeys(layoutConfig.unifi as UnifiConfig)
    
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
