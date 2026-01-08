import { NextRequest, NextResponse } from 'next/server'
import { ProtectClient } from '@/lib/unifi/protect-client'
import { csrfProtection } from '@/lib/auth/csrf'
import { getSessionFromCookie } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const csrfError = csrfProtection(request)
    if (csrfError) return csrfError
    
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { controllerUrl, apiKey } = await request.json()
    
    if (!controllerUrl || !apiKey) {
      return NextResponse.json(
        { error: 'Controller URL and API Key required' },
        { status: 400 }
      )
    }
    
    console.log('[API] Testing Protect connection to:', controllerUrl)
    
    const client = new ProtectClient(controllerUrl, apiKey)
    const result = await client.testConnection()
    
    console.log('[API] Protect test result:', result)
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        cameras: result.cameras
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Connection failed' },
        { status: 400 }
      )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Connection failed'
    console.error('[API] Protect test error:', errorMessage, error)
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
