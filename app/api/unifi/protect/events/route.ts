import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import prisma from '@/lib/db/client'
import { ProtectClient } from '@/lib/unifi/protect-client'
import { decryptUnifiApiKeys, UnifiConfig } from '@/lib/unifi/encryption'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
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
