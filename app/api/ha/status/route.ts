import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const haUrl = process.env.HA_URL
    const haToken = process.env.HA_ACCESS_TOKEN
    
    if (!haUrl || !haToken) {
      return NextResponse.json({ 
        connected: false, 
        error: 'Home Assistant not configured',
        configured: false
      })
    }
    
    const response = await fetch(`${haUrl}/api/`, {
      headers: {
        'Authorization': `Bearer ${haToken}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    })
    
    if (!response.ok) {
      return NextResponse.json({ 
        connected: false, 
        error: 'Connection failed',
        configured: true
      })
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      connected: true,
      configured: true,
      version: data.version,
      message: data.message
    })
  } catch (error) {
    console.error('[API] /ha/status error:', error)
    return NextResponse.json({ 
      connected: false, 
      error: error instanceof Error ? error.message : 'Connection failed',
      configured: !!process.env.HA_URL
    })
  }
}
