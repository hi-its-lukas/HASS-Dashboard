import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getGlobalHAConfig, testHAConnection } from '@/lib/ha/token'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const config = await getGlobalHAConfig()
    
    if (!config.url || !config.token) {
      return NextResponse.json({
        connected: false,
        configured: false,
        error: 'Home Assistant nicht konfiguriert'
      })
    }
    
    const result = await testHAConnection(config.url, config.token)
    
    if (!result.success) {
      return NextResponse.json({
        connected: false,
        configured: true,
        error: result.message
      })
    }
    
    return NextResponse.json({
      connected: true,
      configured: true,
      version: result.version,
      instanceUrl: config.url,
      lastCheck: new Date().toISOString()
    })
  } catch (error) {
    console.error('[API] /status error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
