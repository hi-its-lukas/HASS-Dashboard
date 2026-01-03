import { NextRequest, NextResponse } from 'next/server'
import { handleOAuthCallback, deriveBaseUrlFromRequest } from '@/lib/auth/ha-oauth'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  
  const baseUrl = deriveBaseUrlFromRequest(request)
  
  if (error) {
    const errorDescription = searchParams.get('error_description') || 'Unknown error'
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errorDescription)}`, baseUrl))
  }
  
  if (!code || !state) {
    return NextResponse.redirect(new URL('/login?error=Missing+code+or+state', baseUrl))
  }
  
  const result = await handleOAuthCallback(code, state)
  
  if (result.success) {
    const redirectTo = result.redirectPath && result.redirectPath.startsWith('/') ? result.redirectPath : '/'
    return NextResponse.redirect(new URL(redirectTo, baseUrl))
  } else {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(result.error || 'Authentication failed')}`, baseUrl))
  }
}
