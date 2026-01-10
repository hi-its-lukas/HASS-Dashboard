import { IncomingMessage } from 'http'
import { parse as parseCookie } from 'cookie'
import { prisma, IS_PRODUCTION } from './config'

export async function validateSession(sessionToken: string): Promise<string | null> {
  try {
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true }
    })
    
    if (!session || new Date() > session.expiresAt) {
      console.log('[Auth] Session invalid or expired')
      return null
    }
    
    return session.userId
  } catch (error) {
    console.error('[Auth] Session validation error:', error)
    return null
  }
}

export function extractSessionToken(req: IncomingMessage): string | null {
  const cookieHeader = req.headers.cookie
  if (!cookieHeader) return null
  
  const cookies = parseCookie(cookieHeader)
  return cookies['ha_session'] || null
}

export function validateOrigin(req: IncomingMessage): boolean {
  if (!IS_PRODUCTION) {
    return true
  }

  const origin = req.headers.origin
  if (!origin) {
    return true
  }

  const allowedHosts = process.env.ALLOWED_HOSTS?.split(',').map(h => h.trim()) || []
  const appBaseUrl = process.env.APP_BASE_URL

  if (appBaseUrl) {
    try {
      const baseHost = new URL(appBaseUrl).host
      allowedHosts.push(baseHost)
    } catch {
      console.warn('[Auth] Invalid APP_BASE_URL')
    }
  }

  try {
    const originHost = new URL(origin).host
    const isAllowed = allowedHosts.some(allowed => originHost === allowed || originHost.endsWith('.' + allowed))
    if (!isAllowed) {
      console.warn('[Auth] Origin not allowed:', origin)
    }
    return isAllowed
  } catch {
    console.warn('[Auth] Invalid origin:', origin)
    return false
  }
}
