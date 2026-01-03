import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import prisma from '@/lib/db/client'

const SESSION_COOKIE_NAME = 'ha_session'
const SESSION_DURATION_DAYS = 365

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000)
  
  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt
    }
  })
  
  return token
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60
  })
}

export async function getSessionFromCookie(): Promise<{ userId: string; user: { id: string; haName: string | null; haInstanceUrl: string | null } } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  
  if (!token) return null
  
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true }
  })
  
  if (!session) return null
  
  if (new Date() > session.expiresAt) {
    await prisma.session.delete({ where: { id: session.id } })
    return null
  }
  
  return {
    userId: session.userId,
    user: {
      id: session.user.id,
      haName: session.user.haName,
      haInstanceUrl: session.user.haInstanceUrl
    }
  }
}

export async function deleteSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { token } })
}

export async function deleteSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.session.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  })
  return result.count
}
