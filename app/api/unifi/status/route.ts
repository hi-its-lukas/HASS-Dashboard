import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import prisma from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ connected: false }, { status: 401 })
    }
    
    const dashboardConfig = await prisma.dashboardConfig.findUnique({
      where: { userId: session.userId }
    })
    
    if (!dashboardConfig?.layoutConfig) {
      return NextResponse.json({ connected: false })
    }
    
    const layoutConfig = JSON.parse(dashboardConfig.layoutConfig) as Record<string, unknown>
    const unifiConfig = layoutConfig.unifi as Record<string, unknown> | undefined
    
    if (!unifiConfig?.controllerUrl || !unifiConfig?.username || !unifiConfig?.password) {
      return NextResponse.json({ connected: false })
    }
    
    return NextResponse.json({
      connected: true,
      cameras: (unifiConfig.cameras as string[] || []).length,
      accessDevices: (unifiConfig.accessDevices as unknown[] || []).length
    })
  } catch (error) {
    console.error('[Unifi Status] Error:', error)
    return NextResponse.json({ connected: false, error: 'Failed to check status' })
  }
}
