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
    
    const streamUrl = `${haUrl}/api/camera_proxy_stream/${decodedEntityId}`
    
    const res = await fetch(streamUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch camera stream' }, { status: res.status })
    }
    
    const contentType = res.headers.get('content-type') || 'multipart/x-mixed-replace; boundary=frame'
    
    return new NextResponse(res.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[API] Camera stream error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
