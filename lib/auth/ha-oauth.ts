import { randomBytes, createHash } from 'crypto'
import { cookies } from 'next/headers'
import prisma from '@/lib/db/client'
import { encrypt, decrypt } from './encryption'
import { createSession, setSessionCookie } from './session'

const OAUTH_STATE_COOKIE = 'ha_oauth_state'
const OAUTH_VERIFIER_COOKIE = 'ha_oauth_verifier'

export interface OAuthState {
  state: string
  codeVerifier: string
  haUrl: string
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function generateCodeChallenge(verifier: string): string {
  const hash = createHash('sha256').update(verifier).digest()
  return base64UrlEncode(hash)
}

export async function initiateOAuth(haUrl: string, redirectPath: string = '/', requestBaseUrl?: string): Promise<string> {
  const state = randomBytes(32).toString('hex')
  const codeVerifier = base64UrlEncode(randomBytes(32))
  const codeChallenge = generateCodeChallenge(codeVerifier)
  
  const normalizedUrl = haUrl.replace(/\/$/, '')
  const baseUrl = requestBaseUrl || getAppBaseUrl()
  
  const cookieStore = await cookies()
  
  cookieStore.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600
  })
  
  cookieStore.set(OAUTH_VERIFIER_COOKIE, JSON.stringify({ 
    verifier: codeVerifier, 
    haUrl: normalizedUrl, 
    redirectPath,
    appBaseUrl: baseUrl
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600
  })
  
  const clientId = baseUrl
  const redirectUri = `${baseUrl}/api/auth/callback`
  
  const authUrl = new URL('/auth/authorize', normalizedUrl)
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  authUrl.searchParams.set('response_type', 'code')
  
  return authUrl.toString()
}

export async function handleOAuthCallback(code: string, state: string): Promise<{ success: boolean; error?: string; redirectPath?: string }> {
  const cookieStore = await cookies()
  
  const storedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value
  const verifierData = cookieStore.get(OAUTH_VERIFIER_COOKIE)?.value
  
  cookieStore.delete(OAUTH_STATE_COOKIE)
  cookieStore.delete(OAUTH_VERIFIER_COOKIE)
  
  if (!storedState || storedState !== state) {
    return { success: false, error: 'Invalid state parameter' }
  }
  
  if (!verifierData) {
    return { success: false, error: 'Missing OAuth verifier' }
  }
  
  const { verifier, haUrl, redirectPath = '/', appBaseUrl } = JSON.parse(verifierData) as { 
    verifier: string
    haUrl: string
    redirectPath?: string
    appBaseUrl?: string 
  }
  
  try {
    const baseUrl = appBaseUrl || getAppBaseUrl()
    const tokenResponse = await exchangeCodeForToken(code, verifier, haUrl, baseUrl)
    
    const userInfo = await fetchHAUserInfo(haUrl, tokenResponse.access_token)
    
    let user = await prisma.user.findUnique({
      where: { haUserId: userInfo.id }
    })
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          haUserId: userInfo.id,
          haName: userInfo.name,
          haInstanceUrl: haUrl
        }
      })
      
      await prisma.dashboardConfig.create({
        data: {
          userId: user.id,
          layoutConfig: JSON.stringify(getDefaultLayoutConfig())
        }
      })
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          haName: userInfo.name,
          haInstanceUrl: haUrl
        }
      })
    }
    
    const accessTokenEncrypted = encrypt(tokenResponse.access_token)
    const refreshTokenEncrypted = tokenResponse.refresh_token ? encrypt(tokenResponse.refresh_token) : null
    
    await prisma.oAuthToken.upsert({
      where: {
        userId_provider: {
          userId: user.id,
          provider: 'home_assistant'
        }
      },
      create: {
        userId: user.id,
        provider: 'home_assistant',
        accessTokenEnc: accessTokenEncrypted.ciphertext,
        accessTokenNonce: accessTokenEncrypted.nonce,
        refreshTokenEnc: refreshTokenEncrypted?.ciphertext ?? null,
        refreshTokenNonce: refreshTokenEncrypted?.nonce ?? null,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000)
      },
      update: {
        accessTokenEnc: accessTokenEncrypted.ciphertext,
        accessTokenNonce: accessTokenEncrypted.nonce,
        refreshTokenEnc: refreshTokenEncrypted?.ciphertext ?? null,
        refreshTokenNonce: refreshTokenEncrypted?.nonce ?? null,
        expiresAt: new Date(Date.now() + tokenResponse.expires_in * 1000)
      }
    })
    
    const sessionToken = await createSession(user.id)
    await setSessionCookie(sessionToken)
    
    return { success: true, redirectPath }
  } catch (error) {
    console.error('[OAuth] Callback error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'OAuth exchange failed' }
  }
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}

async function exchangeCodeForToken(code: string, codeVerifier: string, haUrl: string, appBaseUrl: string): Promise<TokenResponse> {
  const tokenUrl = new URL('/auth/token', haUrl)
  
  const response = await fetch(tokenUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      client_id: appBaseUrl,
      redirect_uri: `${appBaseUrl}/api/auth/callback`
    })
  })
  
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Token exchange failed: ${response.status} ${text}`)
  }
  
  return response.json()
}

interface HAUserInfo {
  id: string
  name: string
}

async function fetchHAUserInfo(haUrl: string, accessToken: string): Promise<HAUserInfo> {
  const response = await fetch(new URL('/api/auth/current_user', haUrl).toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  
  if (!response.ok) {
    throw new Error('Failed to fetch user info from Home Assistant')
  }
  
  return response.json()
}

export async function getStoredToken(userId: string): Promise<string | null> {
  const tokenRecord = await prisma.oAuthToken.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: 'home_assistant'
      }
    }
  })
  
  if (!tokenRecord) return null
  
  if (new Date() > tokenRecord.expiresAt) {
    if (tokenRecord.refreshTokenEnc && tokenRecord.refreshTokenNonce) {
      try {
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (user?.haInstanceUrl) {
          await refreshAccessToken(userId, tokenRecord, user.haInstanceUrl)
          const refreshedToken = await prisma.oAuthToken.findUnique({
            where: { userId_provider: { userId, provider: 'home_assistant' } }
          })
          if (refreshedToken) {
            return decrypt(refreshedToken.accessTokenEnc, refreshedToken.accessTokenNonce)
          }
        }
      } catch (error) {
        console.error('[OAuth] Token refresh failed:', error)
        return null
      }
    }
    return null
  }
  
  return decrypt(tokenRecord.accessTokenEnc, tokenRecord.accessTokenNonce)
}

interface TokenRecordForRefresh {
  refreshTokenEnc: Buffer | null
  refreshTokenNonce: Buffer | null
}

async function refreshAccessToken(userId: string, tokenRecord: TokenRecordForRefresh, haUrl: string): Promise<void> {
  if (!tokenRecord.refreshTokenEnc || !tokenRecord.refreshTokenNonce) {
    throw new Error('No refresh token available')
  }
  
  const refreshToken = decrypt(tokenRecord.refreshTokenEnc, tokenRecord.refreshTokenNonce)
  
  const tokenUrl = new URL('/auth/token', haUrl)
  const response = await fetch(tokenUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: getClientId()
    })
  })
  
  if (!response.ok) {
    throw new Error('Token refresh failed')
  }
  
  const tokenData: TokenResponse = await response.json()
  
  const accessTokenEncrypted = encrypt(tokenData.access_token)
  const refreshTokenEncrypted = tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null
  
  await prisma.oAuthToken.update({
    where: { userId_provider: { userId, provider: 'home_assistant' } },
    data: {
      accessTokenEnc: accessTokenEncrypted.ciphertext,
      accessTokenNonce: accessTokenEncrypted.nonce,
      refreshTokenEnc: refreshTokenEncrypted?.ciphertext ?? null,
      refreshTokenNonce: refreshTokenEncrypted?.nonce ?? null,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
    }
  })
}

function getClientId(): string {
  return process.env.APP_BASE_URL || 'http://localhost:3000'
}

export function getAppBaseUrl(): string {
  return process.env.APP_BASE_URL || 'http://localhost:3000'
}

export function deriveBaseUrlFromRequest(request: Request): string {
  const url = new URL(request.url)
  
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const cfVisitor = request.headers.get('cf-visitor')
  let protocol = forwardedProto || url.protocol.replace(':', '')
  
  if (cfVisitor) {
    try {
      const visitor = JSON.parse(cfVisitor)
      if (visitor.scheme) {
        protocol = visitor.scheme
      }
    } catch {}
  }
  
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host') || url.host
  
  return `${protocol}://${host}`
}

function getDefaultLayoutConfig() {
  return {
    persons: [],
    rooms: [],
    lights: [],
    covers: [],
    customButtons: []
  }
}
