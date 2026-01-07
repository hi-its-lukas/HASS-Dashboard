import prisma from '@/lib/db/client'

export async function hasPermission(userId: string, permissionKey: string): Promise<boolean> {
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
  
  if (!user) return false
  
  const override = user.permissionOverrides.find(o => o.permission.key === permissionKey)
  if (override) {
    return override.granted
  }
  
  const rolePermissions = user.role?.permissions.map(rp => rp.permission.key) || []
  return rolePermissions.includes(permissionKey)
}

export async function getUserPermissions(userId: string): Promise<string[]> {
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
  
  return Array.from(rolePermissions)
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
