import prisma from '@/lib/db/client'
import { permissionsCache } from '@/lib/cache/permissions-cache'

export async function hasPermission(userId: string, permissionKey: string): Promise<boolean> {
  const perms = await getUserPermissions(userId)
  return perms.includes(permissionKey)
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const cacheKey = `perms:${userId}`
  
  const cached = permissionsCache.get(cacheKey)
  if (cached) {
    return cached
  }
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      },
      permissionOverrides: {
        include: {
          permission: true
        }
      }
    }
  })
  
  if (!user) return []
  
  const rolePermissions = new Set(
    user.role?.permissions.map(rp => rp.permission.key) || []
  )
  
  for (const override of user.permissionOverrides) {
    if (override.granted) {
      rolePermissions.add(override.permission.key)
    } else {
      rolePermissions.delete(override.permission.key)
    }
  }
  
  const permissions = Array.from(rolePermissions)
  permissionsCache.set(cacheKey, permissions)
  
  return permissions
}

export async function getAllPermissions() {
  return prisma.permission.findMany({
    orderBy: [{ category: 'asc' }, { key: 'asc' }]
  })
}

export async function getAllRoles() {
  return prisma.role.findMany({
    include: {
      permissions: {
        include: {
          permission: true
        }
      }
    },
    orderBy: { name: 'asc' }
  })
}
