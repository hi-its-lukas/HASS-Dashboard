import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db/client'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const canView = await hasPermission(session.userId, 'users:view')
    const canManage = await hasPermission(session.userId, 'users:manage')
    
    if (!canView && !canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const users = await prisma.user.findMany({
      include: {
        role: true
      },
      orderBy: { createdAt: 'asc' }
    })
    
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' }
    })
    
    return NextResponse.json({
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        role: u.role,
        status: u.status,
        personEntityId: u.personEntityId,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt
      })),
      roles,
      canManage
    })
  } catch (error) {
    console.error('[API] /admin/users GET error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const canManage = await hasPermission(session.userId, 'users:manage')
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { username, password, displayName, roleId, personEntityId } = await request.json()
    
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
    }
    
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 })
    }
    
    const passwordHash = await bcrypt.hash(password, 12)
    
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        displayName: displayName || username,
        roleId,
        personEntityId,
        status: 'active'
      },
      include: { role: true }
    })
    
    await prisma.dashboardConfig.create({
      data: {
        userId: user.id,
        layoutConfig: JSON.stringify({
          persons: [],
          lights: [],
          covers: [],
          customButtons: []
        })
      }
    })
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        status: user.status
      }
    })
  } catch (error) {
    console.error('[API] /admin/users POST error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
