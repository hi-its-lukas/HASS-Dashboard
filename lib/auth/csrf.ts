import { NextRequest } from 'next/server'

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']

function isDevEnvironment(): boolean {
  return process.env.NODE_ENV !== 'production' && !!process.env.REPL_ID
}

function getForwardedHost(request: NextRequest): string | null {
  return request.headers.get('x-forwarded-host') || request.headers.get('host')
}

export function validateOrigin(request: NextRequest): { valid: boolean; error?: string } {
  if (SAFE_METHODS.includes(request.method)) {
    return { valid: true }
  }
  
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')
  
  const appBaseUrl = process.env.APP_BASE_URL
  const allowedHosts = process.env.ALLOWED_HOSTS?.split(',').map(h => h.trim()) || []
  
  if (!origin && !referer) {
    return { valid: false, error: 'Missing Origin/Referer header' }
  }
  
  const checkUrl = origin || referer
  if (!checkUrl) {
    return { valid: false, error: 'No origin to validate' }
  }
  
  try {
    const url = new URL(checkUrl)
    const requestHost = url.origin
    
    if (appBaseUrl && requestHost === appBaseUrl) {
      return { valid: true }
    }
    
    if (allowedHosts.length > 0) {
      for (const allowed of allowedHosts) {
        if (requestHost === allowed || url.host === allowed) {
          return { valid: true }
        }
      }
    }
    
    // In Replit dev environment, compare origin host with forwarded host
    if (isDevEnvironment()) {
      const forwardedHost = getForwardedHost(request)
      if (forwardedHost && url.host === forwardedHost) {
        return { valid: true }
      }
    }
    
    if (!appBaseUrl && allowedHosts.length === 0) {
      const requestUrl = new URL(request.url)
      if (url.host === requestUrl.host) {
        return { valid: true }
      }
      // Also check forwarded host when no explicit config
      const forwardedHost = getForwardedHost(request)
      if (forwardedHost && url.host === forwardedHost) {
        return { valid: true }
      }
    }
    
    return { valid: false, error: `Origin ${requestHost} not allowed` }
  } catch {
    return { valid: false, error: 'Invalid origin URL' }
  }
}

export function csrfProtection(request: NextRequest): Response | null {
  const result = validateOrigin(request)
  
  if (!result.valid) {
    console.warn('[CSRF] Blocked request:', result.error, 'URL:', request.url)
    return new Response(JSON.stringify({ error: 'CSRF validation failed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  return null
}
