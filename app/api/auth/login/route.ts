import { NextRequest, NextResponse } from 'next/server'
import { initiateOAuth } from '@/lib/auth/ha-oauth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { haUrl } = body
    
    if (!haUrl) {
      return NextResponse.json({ error: 'Home Assistant URL is required' }, { status: 400 })
    }
    
    const urlRegex = /^https?:\/\/.+/
    if (!urlRegex.test(haUrl)) {
      return NextResponse.json({ error: 'Invalid Home Assistant URL' }, { status: 400 })
    }
    
    const authUrl = await initiateOAuth(haUrl)
    
    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('[Auth] Login error:', error)
    return NextResponse.json({ error: 'Failed to initiate login' }, { status: 500 })
  }
}
