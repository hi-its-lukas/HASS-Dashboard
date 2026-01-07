import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    return NextResponse.json({
      userId: session.userId,
      username: session.user.username,
      displayName: session.user.displayName
    })
  } catch (error) {
    console.error('[Auth] Error getting user:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
