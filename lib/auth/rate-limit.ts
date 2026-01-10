interface RateLimitEntry {
  count: number
  firstAttempt: number
  blockedUntil?: number
}

const loginAttempts = new Map<string, RateLimitEntry>()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000
const BLOCK_DURATION_MS = 15 * 60 * 1000

export function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = loginAttempts.get(identifier)
  
  if (entry?.blockedUntil && now < entry.blockedUntil) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((entry.blockedUntil - now) / 1000) 
    }
  }
  
  if (entry && now - entry.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(identifier)
    return { allowed: true }
  }
  
  if (entry && entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_DURATION_MS
    return { 
      allowed: false, 
      retryAfter: Math.ceil(BLOCK_DURATION_MS / 1000) 
    }
  }
  
  return { allowed: true }
}

export function recordLoginAttempt(identifier: string, success: boolean): void {
  if (success) {
    loginAttempts.delete(identifier)
    return
  }
  
  const now = Date.now()
  const entry = loginAttempts.get(identifier)
  
  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    loginAttempts.set(identifier, { count: 1, firstAttempt: now })
  } else {
    entry.count++
  }
}

export function getFailedAttemptCount(identifier: string): number {
  const entry = loginAttempts.get(identifier)
  return entry?.count || 0
}

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of loginAttempts.entries()) {
    if (now - entry.firstAttempt > WINDOW_MS && (!entry.blockedUntil || now > entry.blockedUntil)) {
      loginAttempts.delete(key)
    }
  }
}, 60 * 1000)
