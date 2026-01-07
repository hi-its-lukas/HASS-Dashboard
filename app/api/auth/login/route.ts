import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db/client'
import { createSession, setSessionCookie } from '@/lib/auth/session'
import { initiateOAuth } from '@/lib/auth/ha-oauth'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    if (body.username && body.password) {
      return handleCredentialsLogin(body.username, body.password)
    }
    
    if (body.haUrl) {
      return handleOAuthLogin(body.haUrl, body.redirect)
    }
    
    return NextResponse.json({ error: 'Invalid login request' }, { status: 400 })
  } catch (error) {
    console.error('[Auth] Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}

async function handleCredentialsLogin(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { username },
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
  
  const validPassword = await bcrypt.compare(password, user.passwordHash)
  
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
}

async function handleOAuthLogin(haUrl: string, redirect?: string) {
  const urlRegex = /^https?:\/\/.+/
  if (!urlRegex.test(haUrl)) {
    return NextResponse.json({ error: 'Invalid Home Assistant URL' }, { status: 400 })
  }
  
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:5000'
  const protocol = headersList.get('x-forwarded-proto') || 'http'
  const requestBaseUrl = `${protocol}://${host}`
  
  const redirectPath = typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/'
  const authUrl = await initiateOAuth(haUrl, redirectPath, requestBaseUrl)
  
  return NextResponse.json({ authUrl })
}
