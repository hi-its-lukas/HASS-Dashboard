import { NextRequest, NextResponse } from 'next/server'
import { ProtectClient } from '@/lib/unifi/protect-client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { controllerUrl, apiKey } = await request.json()
    
    if (!controllerUrl || !apiKey) {
      return NextResponse.json(
        { error: 'Controller URL and API Key required' },
        { status: 400 }
      )
    }
    
    const client = new ProtectClient(controllerUrl, apiKey)
    const result = await client.testConnection()
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        cameras: result.cameras
      })
    } else {
      return NextResponse.json(
        { error: 'Connection failed' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[API] Protect test error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 500 }
    )
  }
}
