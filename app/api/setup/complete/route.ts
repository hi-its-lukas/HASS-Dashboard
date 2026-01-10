import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) throw new Error('ENCRYPTION_KEY not set')
  return Buffer.from(key, 'hex')
}

function encryptValue(value: string): string {
  const key = getEncryptionKey()
  const nonce = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([nonce, tag, encrypted]).toString('base64')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      haUrl,
      haToken,
      unifiEnabled,
      unifiHost,
      unifiUsername,
      unifiPassword,
      adminUsername,
      adminPassword,
    } = body
    
    if (!haUrl || !haToken || !adminUsername || !adminPassword) {
      return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 })
    }
    
    const existingUser = await prisma.user.findFirst()
    if (existingUser) {
      return NextResponse.json({ error: 'Setup bereits abgeschlossen' }, { status: 400 })
    }
    
    let ownerRole = await prisma.role.findUnique({ where: { name: 'owner' } })
    if (!ownerRole) {
      ownerRole = await prisma.role.create({
        data: {
          name: 'owner',
          displayName: 'Eigentümer',
          description: 'Vollzugriff auf alle Funktionen',
          isSystem: true
        }
      })
    }
    
    const allPermissions = await prisma.permission.findMany()
    if (allPermissions.length > 0) {
      const existingRolePerms = await prisma.rolePermission.count({
        where: { roleId: ownerRole.id }
      })
      
      if (existingRolePerms === 0) {
        for (const perm of allPermissions) {
          await prisma.rolePermission.create({
            data: { roleId: ownerRole.id, permissionId: perm.id }
          })
        }
      }
    }
    
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    
    const user = await prisma.user.create({
      data: {
        username: adminUsername,
        passwordHash,
        displayName: adminUsername,
        roleId: ownerRole.id,
        status: 'active'
      }
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
    
    const haConfig = {
      homeAssistant: {
        url: haUrl,
        token: haToken,
      },
      unifi: unifiEnabled ? {
        controllerUrl: unifiHost,
        rtspUsername: unifiUsername,
        rtspPassword: unifiPassword,
        rtspChannel: 1,
      } : undefined,
    }
    
    const encryptedConfig = encryptValue(JSON.stringify(haConfig))
    
    await prisma.systemConfig.upsert({
      where: { key: 'global_layout_config' },
      create: {
        key: 'global_layout_config',
        value: encryptedConfig,
        encrypted: true,
      },
      update: {
        value: encryptedConfig,
        encrypted: true,
      }
    })
    
    await prisma.systemConfig.upsert({
      where: { key: 'setup_complete' },
      create: {
        key: 'setup_complete',
        value: 'true',
        encrypted: false,
      },
      update: {
        value: 'true',
      }
    })
    
    console.log('[Setup] Setup completed successfully for user:', adminUsername)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Setup] Complete error:', error)
    return NextResponse.json({ error: 'Setup fehlgeschlagen' }, { status: 500 })
  }
}
