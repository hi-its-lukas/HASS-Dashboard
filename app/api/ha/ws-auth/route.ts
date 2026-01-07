import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getGlobalHAConfig } from '@/lib/ha/token'

export async function GET() {
  const session = await getSessionFromCookie()
  
  if (!session) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  }
  
  const haConfig = await getGlobalHAConfig()
  
  if (!haConfig.url || !haConfig.token) {
    return NextResponse.json(
      { error: 'Home Assistant nicht konfiguriert' },
      { status: 400 }
    )
  }
  
  const wsUrl = haConfig.url.replace(/^http/, 'ws') + '/api/websocket'
  
  return NextResponse.json({ 
    wsUrl,
    token: haConfig.token
  })
}
