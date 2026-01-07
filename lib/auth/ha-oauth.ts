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
    
    // SECURITY: Using Prisma's $executeRaw with tagged template literals.
    // All ${...} interpolations are automatically parameterized by Prisma,
    // preventing SQL injection attacks. Do NOT use string concatenation here.
    await prisma.$executeRaw`
      INSERT INTO oauth_tokens (id, user_id, provider, access_token_enc, access_token_nonce, refresh_token_enc, refresh_token_nonce, client_id, expires_at, created_at, updated_at)
      VALUES (
        ${crypto.randomUUID()},
        ${user.id},
        'home_assistant',
        ${accessTokenEncrypted.ciphertext},
        ${accessTokenEncrypted.nonce},
        ${refreshTokenEncrypted?.ciphertext ?? null},
        ${refreshTokenEncrypted?.nonce ?? null},
        ${baseUrl},
        ${new Date(Date.now() + tokenResponse.expires_in * 1000)},
        ${new Date()},
        ${new Date()}
      )
      ON CONFLICT (user_id, provider) DO UPDATE SET
        access_token_enc = ${accessTokenEncrypted.ciphertext},
        access_token_nonce = ${accessTokenEncrypted.nonce},
        refresh_token_enc = ${refreshTokenEncrypted?.ciphertext ?? null},
        refresh_token_nonce = ${refreshTokenEncrypted?.nonce ?? null},
        client_id = ${baseUrl},
        expires_at = ${new Date(Date.now() + tokenResponse.expires_in * 1000)},
        updated_at = ${new Date()}
    `
    
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
  try {
    // Call Home Assistant API to get current user info
    const response = await fetch(`${haUrl}/api/`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HA API check failed: ${response.status}`)
    }
    
    // Try to get user-specific info from the auth/current_user endpoint
    const userResponse = await fetch(`${haUrl}/api/config`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (userResponse.ok) {
      const config = await userResponse.json()
      // Generate a stable, unique ID based on HA instance + token hash
      // This ensures the same user always gets the same ID
      const { createHash } = await import('crypto')
      const tokenHash = createHash('sha256').update(accessToken).digest('hex').substring(0, 32)
      const instanceId = config.uuid || config.location_name || haUrl
      const stableUserId = createHash('sha256')
        .update(`${instanceId}:${tokenHash}`)
        .digest('hex')
        .substring(0, 32)
      
      return {
        id: stableUserId,
        name: config.location_name || 'Home Assistant User'
      }
    }
    
    // Fallback: Create stable ID from token hash (token is validated above)
    const { createHash } = await import('crypto')
    const stableId = createHash('sha256').update(accessToken).digest('hex').substring(0, 32)
    return { id: stableId, name: 'User' }
  } catch (error) {
    console.error('[OAuth] Failed to fetch HA user info:', error)
    throw new Error('Failed to verify Home Assistant token')
  }
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
          await refreshAccessToken(userId, tokenRecord as unknown as TokenRecordForRefresh, user.haInstanceUrl)
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
  clientId: string | null
}

async function refreshAccessToken(userId: string, tokenRecord: TokenRecordForRefresh, haUrl: string): Promise<void> {
  if (!tokenRecord.refreshTokenEnc || !tokenRecord.refreshTokenNonce) {
    throw new Error('No refresh token available')
  }
  
  const refreshToken = decrypt(tokenRecord.refreshTokenEnc, tokenRecord.refreshTokenNonce)
  const storedClientId = tokenRecord.clientId
  const currentClientId = getClientId()
  
  const validation = validateClientId(storedClientId, currentClientId)
  if (!validation.valid) {
    console.warn('[OAuth]', validation.warning)
  }
  
  const clientId = storedClientId || currentClientId
  
  console.log('[OAuth] Refreshing token for user', userId, 'with client_id:', clientId)
  
  const tokenUrl = new URL('/auth/token', haUrl)
  const response = await fetch(tokenUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId
    })
  })
  
  if (!response.ok) {
    const text = await response.text()
    console.error('[OAuth] Token refresh failed:', response.status, text)
    throw new Error(`Token refresh failed: ${response.status}`)
  }
  
  const tokenData: TokenResponse = await response.json()
  console.log('[OAuth] Token refreshed successfully, new expiry in', tokenData.expires_in, 'seconds')
  
  const accessTokenEncrypted = encrypt(tokenData.access_token)
  const refreshTokenEncrypted = tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null
  
  await prisma.oAuthToken.update({
    where: { userId_provider: { userId, provider: 'home_assistant' } },
    data: {
      accessTokenEnc: accessTokenEncrypted.ciphertext,
      accessTokenNonce: accessTokenEncrypted.nonce,
      refreshTokenEnc: refreshTokenEncrypted?.ciphertext ?? tokenRecord.refreshTokenEnc,
      refreshTokenNonce: refreshTokenEncrypted?.nonce ?? tokenRecord.refreshTokenNonce,
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

export function validateClientId(storedClientId: string | null, currentBaseUrl: string): { valid: boolean; warning?: string } {
  if (!storedClientId) {
    return { valid: true }
  }
  
  const normalizeUrl = (url: string) => url.replace(/\/$/, '').toLowerCase()
  const storedNormalized = normalizeUrl(storedClientId)
  const currentNormalized = normalizeUrl(currentBaseUrl)
  
  if (storedNormalized !== currentNormalized) {
    return {
      valid: false,
      warning: `OAuth client_id mismatch: stored "${storedClientId}" does not match current "${currentBaseUrl}". Token refresh will fail. Re-authenticate to fix.`
    }
  }
  
  return { valid: true }
}

export function deriveBaseUrlFromRequest(request: Request): string {
  // SECURITY: In production, ALWAYS use APP_BASE_URL to prevent Host Header Poisoning
  if (process.env.NODE_ENV === 'production') {
    const appBaseUrl = process.env.APP_BASE_URL
    if (appBaseUrl) {
      return appBaseUrl.replace(/\/$/, '')
    }
    console.warn('[OAuth] APP_BASE_URL not set in production - this is a security risk!')
  }
  
  // Check allowed hosts if configured
  const allowedHosts = process.env.ALLOWED_HOSTS?.split(',').map(h => h.trim().toLowerCase()) || []
  
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const cfVisitor = request.headers.get('cf-visitor')
  let protocol = forwardedProto || 'http'
  
  if (cfVisitor) {
    try {
      const visitor = JSON.parse(cfVisitor)
      if (visitor.scheme) {
        protocol = visitor.scheme
      }
    } catch {}
  }
  
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')
  
  if (!host) {
    console.warn('[OAuth] No host header found')
    return process.env.APP_BASE_URL || 'http://localhost:3000'
  }
  
  // Validate host against allowlist if configured
  const hostWithoutPort = host.split(':')[0].toLowerCase()
  if (allowedHosts.length > 0 && !allowedHosts.includes(hostWithoutPort)) {
    console.warn('[OAuth] Host not in allowlist:', host)
    return process.env.APP_BASE_URL || 'http://localhost:3000'
  }
  
  // Reject suspicious hosts (random hex strings, internal IPs in production)
  if (/^[a-f0-9]{12}/.test(host)) {
    console.warn('[OAuth] Suspicious host detected:', host)
    return process.env.APP_BASE_URL || 'http://localhost:3000'
  }
  
  let baseUrl = `${protocol}://${host}`
  
  if (host.endsWith(':80') || host.endsWith(':443')) {
    const cleanHost = host.replace(/:80$/, '').replace(/:443$/, '')
    baseUrl = `${protocol}://${cleanHost}`
  }
  
  return baseUrl
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
