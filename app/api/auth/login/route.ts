import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db/client'
import { createSession, setSessionCookie } from '@/lib/auth/session'
import { csrfProtection } from '@/lib/auth/csrf'

const DUMMY_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMye.SxLhNqVjBpWrWNKDiuSAp3nQv7LGIS'

export async function POST(request: NextRequest) {
  try {
    const csrfError = csrfProtection(request)
    if (csrfError) {
      return csrfError
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
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 })
    }
    
    if (user.status !== 'active') {
      return NextResponse.json({ error: 'Konto deaktiviert' }, { status: 403 })
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })
    
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
