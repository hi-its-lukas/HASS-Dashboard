import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getStoredToken } from '@/lib/auth/ha-oauth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { entityId: string } }
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
    
    const { entityId } = params
    const decodedEntityId = decodeURIComponent(entityId)
    
    const haUrl = session.user.haInstanceUrl?.replace(/\/$/, '')
    if (!haUrl) {
      return NextResponse.json({ error: 'No HA URL' }, { status: 400 })
    }
    
    const imageUrl = `${haUrl}/api/camera_proxy/${decodedEntityId}`
    
    const res = await fetch(imageUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch camera image' }, { status: res.status })
    }
    
    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') || 'image/jpeg'
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[API] Camera proxy error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
