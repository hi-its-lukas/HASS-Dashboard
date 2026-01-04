import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getStoredToken } from '@/lib/auth/ha-oauth'
import prisma from '@/lib/db/client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { entityId: string } }
) {
  try {
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    })
    
    if (!user?.haInstanceUrl) {
      return NextResponse.json({ error: 'No Home Assistant instance configured' }, { status: 400 })
    }
    
    const token = await getStoredToken(session.userId)
    
    if (!token) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 })
    }
    
    const entityId = params.entityId.startsWith('camera.') 
      ? params.entityId 
      : `camera.${params.entityId}`

    const response = await fetch(`${user.haInstanceUrl}/api/camera_proxy_stream/${entityId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to get stream' }, { status: response.status })
    }

    const readable = response.body
    if (!readable) {
      return NextResponse.json({ error: 'No stream body' }, { status: 500 })
    }
    
    const contentType = response.headers.get('content-type') || 'multipart/x-mixed-replace; boundary=frame'
    
    return new Response(readable as unknown as ReadableStream, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    })
  } catch (error) {
    console.error('[API] GET /ha/stream error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
