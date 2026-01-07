import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db/client'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/permissions'
import { csrfProtection } from '@/lib/auth/csrf'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrfError = csrfProtection(request)
    if (csrfError) return csrfError
    
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const canManage = await hasPermission(session.userId, 'users:manage')
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { id } = await params
    const body = await request.json()
    const { displayName, roleId, status, personEntityId, password } = body
    
    const updateData: Record<string, unknown> = {}
    
    if (displayName !== undefined) updateData.displayName = displayName
    if (roleId !== undefined) updateData.roleId = roleId
    if (status !== undefined) updateData.status = status
    if (personEntityId !== undefined) updateData.personEntityId = personEntityId
    
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12)
    }
    
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: { role: true }
    })
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
        personEntityId: user.personEntityId
      }
    })
  } catch (error) {
    console.error('[API] /admin/users/[id] PATCH error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const csrfError = csrfProtection(request)
    if (csrfError) return csrfError
    
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const canManage = await hasPermission(session.userId, 'users:manage')
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { id } = await params
    
    if (id === session.userId) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
    }
    
    const ownerCount = await prisma.user.count({
      where: {
        role: { name: 'owner' },
        status: 'active'
      }
    })
    
    const userToDelete = await prisma.user.findUnique({
      where: { id },
      include: { role: true }
    })
    
    if (userToDelete?.role?.name === 'owner' && ownerCount <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last owner' }, { status: 400 })
    }
    
    await prisma.user.delete({ where: { id } })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] /admin/users/[id] DELETE error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
