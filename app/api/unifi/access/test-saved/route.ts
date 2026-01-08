import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { AccessClient } from '@/lib/unifi/access-client'
import { getGlobalUnifiConfig } from '@/lib/config/global-settings'
import { csrfProtection } from '@/lib/auth/csrf'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const csrfError = csrfProtection(request)
    if (csrfError) return csrfError
    
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const unifi = await getGlobalUnifiConfig()
    
    if (!unifi?.controllerUrl || !unifi?.accessApiKey) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }
    
    const client = new AccessClient(unifi.controllerUrl, unifi.accessApiKey)
    const result = await client.testConnection()
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        doors: result.doors
      })
    } else {
      return NextResponse.json(
        { error: 'Connection failed' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[API] Access test-saved error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 500 }
    )
  }
}
