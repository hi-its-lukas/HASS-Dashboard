import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import prisma from '@/lib/db/client'
import { ProtectClient } from '@/lib/unifi/protect-client'
import { decryptUnifiApiKeys, UnifiConfig } from '@/lib/unifi/encryption'
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
    
    const config = await prisma.dashboardConfig.findUnique({
      where: { userId: session.userId }
    })
    
    if (!config?.layoutConfig) {
      return NextResponse.json({ error: 'No saved config' }, { status: 404 })
    }
    
    const layoutConfig = JSON.parse(config.layoutConfig)
    if (!layoutConfig.unifi) {
      return NextResponse.json({ error: 'No UniFi config' }, { status: 404 })
    }
    
    const unifi = decryptUnifiApiKeys(layoutConfig.unifi as UnifiConfig)
    
    if (!unifi.controllerUrl || !unifi.protectApiKey) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }
    
    const client = new ProtectClient(unifi.controllerUrl, unifi.protectApiKey)
    const result = await client.testConnection()
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        cameras: result.cameras
      })
    } else {
      return NextResponse.json(
        { error: 'Connection failed' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[API] Protect test-saved error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 500 }
    )
  }
}
