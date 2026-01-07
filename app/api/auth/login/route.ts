import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db/client'
import { createSession, setSessionCookie } from '@/lib/auth/session'
import { csrfProtection } from '@/lib/auth/csrf'

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
    
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 })
    }
    
    if (user.status !== 'active') {
      return NextResponse.json({ error: 'Konto deaktiviert' }, { status: 403 })
    }
    
    const validPassword = await bcrypt.compare(body.password, user.passwordHash)
    
    if (!validPassword) {
      return NextResponse.json({ error: 'Ungültige Anmeldedaten' }, { status: 401 })
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
