import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getStoredToken } from '@/lib/auth/ha-oauth'
import prisma from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    })
    
    if (!user?.haInstanceUrl) {
      return NextResponse.json({
        connected: false,
        error: 'No Home Assistant instance configured'
      })
    }
    
    const token = await getStoredToken(session.userId)
    
    if (!token) {
      return NextResponse.json({
        connected: false,
        error: 'Token expired or missing. Please log in again.'
      })
    }
    
    try {
      const response = await fetch(new URL('/api/', user.haInstanceUrl).toString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal: AbortSignal.timeout(10000)
      })
      
      if (response.ok) {
        const data = await response.json()
        return NextResponse.json({
          connected: true,
          version: data.version,
          instanceUrl: user.haInstanceUrl,
          lastCheck: new Date().toISOString()
        })
      } else {
        return NextResponse.json({
          connected: false,
          error: `Home Assistant returned ${response.status}`
        })
      }
    } catch (fetchError) {
      return NextResponse.json({
        connected: false,
        error: fetchError instanceof Error ? fetchError.message : 'Connection failed'
      })
    }
  } catch (error) {
    console.error('[API] /status error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
