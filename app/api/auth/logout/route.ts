import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { deleteSession, deleteSessionCookie } from '@/lib/auth/session'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('ha_session')?.value
    
    if (sessionToken) {
      await deleteSession(sessionToken)
    }
    
    await deleteSessionCookie()
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Auth] Logout error:', error)
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
}
