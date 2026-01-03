import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getStoredToken } from '@/lib/auth/ha-oauth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
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
    
    const { eventId } = params
    
    const thumbnailUrl = `${haUrl}/api/frigate/notifications/${eventId}/thumbnail.jpg`
    
    const res = await fetch(thumbnailUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    
    if (!res.ok) {
      return new NextResponse(null, { status: 404 })
    }
    
    const buffer = await res.arrayBuffer()
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('[API] Frigate thumbnail error:', error)
    return new NextResponse(null, { status: 500 })
  }
}
