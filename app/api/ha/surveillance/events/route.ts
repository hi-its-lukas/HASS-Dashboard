import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import prisma from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const hours = parseInt(searchParams.get('hours') || '6')
    const type = searchParams.get('type')
    const camera = searchParams.get('camera')
    const limit = parseInt(searchParams.get('limit') || '100')

    const since = new Date(Date.now() - hours * 60 * 60 * 1000)

    const where: Record<string, unknown> = {
      userId: session.userId,
      detectedAt: { gte: since }
    }

    if (type && type !== 'all') {
      where.eventType = type
    }

    if (camera) {
      where.cameraEntityId = camera
    }

    const events = await prisma.surveillanceEvent.findMany({
      where,
      orderBy: { detectedAt: 'desc' },
      take: limit
    })

    const stats = await prisma.surveillanceEvent.groupBy({
      by: ['eventType'],
      where: {
        userId: session.userId,
        detectedAt: { gte: since }
      },
      _count: true
    })

    const statsMap = {
      events: events.length,
      people: 0,
      vehicles: 0,
      animals: 0,
      motion: 0
    }

    stats.forEach((s: { eventType: string; _count: number }) => {
      if (s.eventType === 'person') statsMap.people = s._count
      if (s.eventType === 'vehicle') statsMap.vehicles = s._count
      if (s.eventType === 'animal') statsMap.animals = s._count
      if (s.eventType === 'motion') statsMap.motion = s._count
    })

    return NextResponse.json({ events, stats: statsMap })
  } catch (error) {
    console.error('[API] Surveillance events error:', error)
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
    const { cameraEntityId, cameraName, eventType, snapshotPath } = body

    if (!cameraEntityId || !eventType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const event = await prisma.surveillanceEvent.create({
      data: {
        userId: session.userId,
        cameraEntityId,
        cameraName: cameraName || cameraEntityId,
        eventType,
        detectedAt: new Date(),
        snapshotPath
      }
    })

    return NextResponse.json({ event })
  } catch (error) {
    console.error('[API] Create surveillance event error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
