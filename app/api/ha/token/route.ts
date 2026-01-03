import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getStoredToken } from '@/lib/auth/ha-oauth'

export async function GET() {
  const session = await getSessionFromCookie()
  
  if (!session) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  }
  
  const token = await getStoredToken(session.userId)
  
  if (!token) {
    return NextResponse.json(
      { error: 'No tokens found - please re-authenticate' },
      { status: 401 }
    )
  }
  
  return NextResponse.json({ token })
}
