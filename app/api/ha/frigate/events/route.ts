import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getStoredToken } from '@/lib/auth/ha-oauth'

export const dynamic = 'force-dynamic'

interface FrigateEvent {
  id: string
  camera: string
  label: string
  score: number
  start_time: number
  end_time: number
  thumbnail: string
  has_clip: boolean
  has_snapshot: boolean
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const token = await getStoredToken(session.userId)
    if (!token) {
      return NextResponse.json({ error: 'No token' }, { status: 401 })
    }
    
    const haUrl = session.user.haInstanceUrl?.replace(/\/$/, '')
    if (!haUrl) {
      return NextResponse.json({ error: 'No HA URL' }, { status: 400 })
    }
    
    const { searchParams } = new URL(request.url)
    const hours = parseInt(searchParams.get('hours') || '6')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    const after = Math.floor(Date.now() / 1000) - (hours * 60 * 60)
    
    const frigateUrl = `${haUrl}/api/frigate/events?after=${after}&limit=${limit}`
    
    const res = await fetch(frigateUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    
    if (!res.ok) {
      console.log('[Frigate] API not available, returning empty events')
      return NextResponse.json([])
    }
    
    const events: FrigateEvent[] = await res.json()
    
    const mapped = events.map((e) => ({
      id: e.id,
      timestamp: new Date(e.start_time * 1000).toISOString(),
      camera: formatCameraName(e.camera),
      type: mapLabel(e.label),
      label: e.label.toUpperCase(),
      confidence: Math.round(e.score * 100),
      thumbnailUrl: `/api/ha/frigate/thumbnail/${e.id}`,
    }))
    
    return NextResponse.json(mapped)
  } catch (error) {
    console.error('[API] Frigate events error:', error)
    return NextResponse.json([])
  }
}

function formatCameraName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function mapLabel(label: string): 'person' | 'vehicle' | 'animal' | 'motion' {
  const lower = label.toLowerCase()
  if (lower === 'person') return 'person'
  if (['car', 'truck', 'motorcycle', 'bicycle'].includes(lower)) return 'vehicle'
  if (['dog', 'cat', 'bird', 'animal'].includes(lower)) return 'animal'
  return 'motion'
}
