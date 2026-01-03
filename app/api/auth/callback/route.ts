import { NextRequest, NextResponse } from 'next/server'
import { handleOAuthCallback } from '@/lib/auth/ha-oauth'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  
  if (error) {
    const errorDescription = searchParams.get('error_description') || 'Unknown error'
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorDescription)}`, request.url))
  }
  
  if (!code || !state) {
    return NextResponse.redirect(new URL('/login?error=Missing+code+or+state', request.url))
  }
  
  const result = await handleOAuthCallback(code, state)
  
  if (result.success) {
    return NextResponse.redirect(new URL('/', request.url))
  } else {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(result.error || 'Authentication failed')}`, request.url))
  }
}
