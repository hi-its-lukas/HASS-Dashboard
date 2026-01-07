import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import prisma from '@/lib/db/client'
import { AccessClient } from '@/lib/unifi/access-client'

export const dynamic = 'force-dynamic'

export async function GET() {
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
    const unifi = layoutConfig.unifi
    
    if (!unifi?.controllerUrl || !unifi?.accessApiKey) {
      return NextResponse.json({ error: 'UniFi Access not configured' }, { status: 400 })
    }
    
    const client = new AccessClient(unifi.controllerUrl, unifi.accessApiKey)
    const doors = await client.getDoors()
    
    return NextResponse.json({ doors })
  } catch (error) {
    console.error('[API] Access doors error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get doors' },
      { status: 500 }
    )
  }
}
