import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getGlobalHAConfig } from '@/lib/ha/token'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const haConfig = await getGlobalHAConfig()
    
    if (!haConfig.url || !haConfig.token) {
      return NextResponse.json({ error: 'Home Assistant nicht konfiguriert' }, { status: 400 })
    }
    
    const response = await fetch(new URL('/api/states', haConfig.url).toString(), {
      headers: {
        'Authorization': `Bearer ${haConfig.token}`
      }
    })
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch states' }, { status: response.status })
    }
    
    const states = await response.json()
    return NextResponse.json(states)
  } catch (error) {
    console.error('[API] /ha/states error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
