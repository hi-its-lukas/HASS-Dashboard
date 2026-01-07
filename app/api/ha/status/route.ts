import { NextResponse } from 'next/server'
import { getGlobalHAConfig, testHAConnection } from '@/lib/ha/token'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const config = await getGlobalHAConfig()
    
    if (!config.url || !config.token) {
      return NextResponse.json({ 
        connected: false, 
        error: 'Home Assistant nicht konfiguriert',
        configured: false
      })
    }
    
    const result = await testHAConnection(config.url, config.token)
    
    if (!result.success) {
      return NextResponse.json({ 
        connected: false, 
        error: result.message,
        configured: true
      })
    }
    
    return NextResponse.json({
      connected: true,
      configured: true,
      version: result.version,
      message: result.message
    })
  } catch (error) {
    console.error('[API] /ha/status error:', error)
    return NextResponse.json({ 
      connected: false, 
      error: error instanceof Error ? error.message : 'Verbindungsfehler',
      configured: false
    })
  }
}
