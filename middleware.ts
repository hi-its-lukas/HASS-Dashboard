import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/callback',
  '/api/auth/logout',
  '/api/status',
]

const PUBLIC_PREFIXES = [
  '/_next',
  '/favicon',
  '/icons',
  '/manifest',
]

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  if (PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  if (pathname.endsWith('.ico') || pathname.endsWith('.png') || pathname.endsWith('.svg')) {
    return NextResponse.next()
  }

  if (pathname.startsWith('/api/') && !SAFE_METHODS.includes(method)) {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    
    if (!origin && !referer) {
      return NextResponse.json(
        { error: 'Missing Origin or Referer header' },
        { status: 403 }
      )
    }
  }

  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get('ha_session')

  if (!sessionCookie?.value) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Use X-Forwarded headers if behind proxy
    const forwardedHost = request.headers.get('x-forwarded-host')
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
    
    let loginUrl: URL
    if (forwardedHost) {
      loginUrl = new URL(`${forwardedProto}://${forwardedHost}/login`)
    } else {
      loginUrl = new URL('/login', request.url)
    }
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
