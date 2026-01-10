import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db/client'
import { createSession, setSessionCookie } from '@/lib/auth/session'
import { csrfProtection } from '@/lib/auth/csrf'
import { checkRateLimit, recordLoginAttempt, getFailedAttemptCount } from '@/lib/auth/rate-limit'

const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMye.SxLhNqVjBpWrWNKDiuSAp3nQv7LGIS'

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip') || 'unknown'
}

async function logLoginAttempt(username: string, ip: string, success: boolean, reason?: string) {
  const timestamp = new Date().toISOString()
  const status = success ? 'SUCCESS' : 'FAILED'
  console.log(`[Auth Audit] ${timestamp} | ${status} | User: ${username} | IP: ${ip}${reason ? ` | Reason: ${reason}` : ''}`)
  
  try {
    await prisma.auditLog.create({
      data: {
        action: 'login',
        username,
        ipAddress: ip,
        success,
        reason: reason || null,
      }
    })
  } catch {
  }
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request)
  
  try {
    const csrfError = csrfProtection(request)
    if (csrfError) {
      return csrfError
    }
    
    const rateCheck = checkRateLimit(clientIP)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Zu viele Anmeldeversuche. Bitte warten Sie ${rateCheck.retryAfter} Sekunden.` },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      )
    }
    
    const body = await request.json()
    
    if (!body.username || !body.password) {
      return NextResponse.json({ error: 'Benutzername und Passwort erforderlich' }, { status: 400 })
    }
    
    const user = await prisma.user.findUnique({
      where: { username: body.username },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    })
    
    const hashToCompare = user?.passwordHash || DUMMY_HASH
    const validPassword = await bcrypt.compare(body.password, hashToCompare)
    
    if (!user || !user.passwordHash || !validPassword) {
      recordLoginAttempt(clientIP, false)
      await logLoginAttempt(body.username, clientIP, false, 'Invalid credentials')
      const attempts = getFailedAttemptCount(clientIP)
      const remaining = 5 - attempts
      return NextResponse.json({ 
        error: remaining > 0 
          ? `Ungültige Anmeldedaten. Noch ${remaining} Versuche.`
          : 'Ungültige Anmeldedaten' 
      }, { status: 401 })
    }
    
    if (user.status !== 'active') {
      await logLoginAttempt(body.username, clientIP, false, 'Account disabled')
      return NextResponse.json({ error: 'Konto deaktiviert' }, { status: 403 })
    }
    
    recordLoginAttempt(clientIP, true)
    await logLoginAttempt(body.username, clientIP, true)
    
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      })
    } catch (updateError) {
      console.warn('[Auth] Could not update lastLoginAt:', updateError)
    }
    
    const sessionToken = await createSession(user.id)
    await setSessionCookie(sessionToken)
    
    const permissions = user.role?.permissions.map(rp => rp.permission.key) || []
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role?.name,
        permissions
      }
    })
  } catch (error) {
    console.error('[Auth] Login error:', error)
    return NextResponse.json({ error: 'Login fehlgeschlagen' }, { status: 500 })
  }
}
