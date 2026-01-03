import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
    
    return NextResponse.json({
      authenticated: true,
      user: session.user
    })
  } catch (error) {
    console.error('[API] /me error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
