import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getUserPermissions } from '@/lib/auth/permissions'
import prisma from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { role: true }
    })
    
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
    
    const permissions = await getUserPermissions(session.userId)
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role?.name,
        roleDisplayName: user.role?.displayName,
        personEntityId: user.personEntityId,
        permissions
      }
    })
  } catch (error) {
    console.error('[API] /me error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
