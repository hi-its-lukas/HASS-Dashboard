import { NextRequest, NextResponse } from 'next/server'
import { AccessClient } from '@/lib/unifi/access-client'

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
    
    const client = new AccessClient(controllerUrl, apiKey)
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
    console.error('[API] Access test error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Connection failed' },
      { status: 500 }
    )
  }
}
