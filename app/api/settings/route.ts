import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import prisma from '@/lib/db/client'

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
    
    if (!config) {
      return NextResponse.json({
        layoutConfig: {
          persons: [],
          rooms: [],
          lights: [],
          covers: [],
          customButtons: []
        },
        sidebarState: 'expanded'
      })
    }
    
    return NextResponse.json({
      layoutConfig: JSON.parse(config.layoutConfig),
      sidebarState: config.sidebarState
    })
  } catch (error) {
    console.error('[API] GET /settings error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { layoutConfig, sidebarState } = body
    
    await prisma.dashboardConfig.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        layoutConfig: JSON.stringify(layoutConfig || {}),
        sidebarState: sidebarState || 'expanded'
      },
      update: {
        layoutConfig: layoutConfig ? JSON.stringify(layoutConfig) : undefined,
        sidebarState: sidebarState || undefined
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] POST /settings error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
