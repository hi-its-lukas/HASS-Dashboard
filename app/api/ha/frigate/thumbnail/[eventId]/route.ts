import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getGlobalHAConfig } from '@/lib/ha/token'

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
    
    const haConfig = await getGlobalHAConfig()
    if (!haConfig.url || !haConfig.token) {
      return NextResponse.json({ error: 'Home Assistant nicht konfiguriert' }, { status: 400 })
    }
    
    const { eventId } = params
    
    const thumbnailUrl = `${haConfig.url}/api/frigate/notifications/${eventId}/thumbnail.jpg`
    
    const res = await fetch(thumbnailUrl, {
      headers: {
        'Authorization': `Bearer ${haConfig.token}`,
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
