import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import prisma from '@/lib/db/client'
import { ProtectClient } from '@/lib/unifi/protect-client'
import { decryptUnifiApiKeys, UnifiConfig } from '@/lib/unifi/encryption'

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
    
    const config = await prisma.dashboardConfig.findUnique({
      where: { userId: session.userId }
    })
    
    if (!config?.layoutConfig) {
      return NextResponse.json({ error: 'No config found' }, { status: 404 })
    }
    
    const layoutConfig = JSON.parse(config.layoutConfig as string)
    const unifi = decryptUnifiApiKeys(layoutConfig.unifi as UnifiConfig)
    
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
