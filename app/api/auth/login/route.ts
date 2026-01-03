import { NextRequest, NextResponse } from 'next/server'
import { initiateOAuth } from '@/lib/auth/ha-oauth'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { haUrl, redirect } = body
    
    if (!haUrl) {
      return NextResponse.json({ error: 'Home Assistant URL is required' }, { status: 400 })
    }
    
    const urlRegex = /^https?:\/\/.+/
    if (!urlRegex.test(haUrl)) {
      return NextResponse.json({ error: 'Invalid Home Assistant URL' }, { status: 400 })
    }
    
    const headersList = await headers()
    const host = headersList.get('host') || 'localhost:5000'
    const protocol = headersList.get('x-forwarded-proto') || 'http'
    const requestBaseUrl = `${protocol}://${host}`
    
    const redirectPath = typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/'
    const authUrl = await initiateOAuth(haUrl, redirectPath, requestBaseUrl)
    
    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('[Auth] Login error:', error)
    return NextResponse.json({ error: 'Failed to initiate login' }, { status: 500 })
  }
}
