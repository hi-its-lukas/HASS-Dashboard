import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const PERMISSIONS = [
  { key: 'settings:view', category: 'settings', displayName: 'Einstellungen ansehen', description: 'Kann Einstellungen-Seite öffnen' },
  { key: 'settings:edit', category: 'settings', displayName: 'Einstellungen bearbeiten', description: 'Kann Einstellungen ändern' },
  { key: 'users:manage', category: 'admin', displayName: 'Benutzer verwalten', description: 'Kann Benutzer anlegen, bearbeiten, löschen' },
  { key: 'users:view', category: 'admin', displayName: 'Benutzer ansehen', description: 'Kann Benutzerliste sehen' },
  
  { key: 'module:dashboard', category: 'module', displayName: 'Dashboard', description: 'Zugriff auf Hauptseite' },
  { key: 'module:energy', category: 'module', displayName: 'Energie', description: 'Zugriff auf Energie-Dashboard' },
  { key: 'module:cameras', category: 'module', displayName: 'Kameras', description: 'Zugriff auf Kamera-Übersicht' },
  { key: 'module:surveillance', category: 'module', displayName: 'AI Überwachung', description: 'Zugriff auf AI Surveillance Events' },
  { key: 'module:climate', category: 'module', displayName: 'Klima', description: 'Zugriff auf Heizung/Klima' },
  { key: 'module:lights', category: 'module', displayName: 'Lichter', description: 'Zugriff auf Lichter-Seite' },
  { key: 'module:covers', category: 'module', displayName: 'Rollläden', description: 'Zugriff auf Rollläden/Markisen' },
  { key: 'module:intercom', category: 'module', displayName: 'Türsprechanlage', description: 'Zugriff auf Intercoms' },
  { key: 'module:vacuum', category: 'module', displayName: 'Saugroboter', description: 'Zugriff auf Staubsauger' },
  { key: 'module:family', category: 'module', displayName: 'Familie', description: 'Zugriff auf Familien-Standorte' },
  { key: 'module:calendar', category: 'module', displayName: 'Kalender', description: 'Zugriff auf Kalender' },
  { key: 'module:more', category: 'module', displayName: 'Mehr-Seite', description: 'Zugriff auf Mehr-Menü' },
  
  { key: 'action:lights', category: 'action', displayName: 'Lichter schalten', description: 'Kann Lichter ein-/ausschalten' },
  { key: 'action:covers', category: 'action', displayName: 'Rollläden steuern', description: 'Kann Rollläden öffnen/schließen' },
  { key: 'action:locks', category: 'action', displayName: 'Türen öffnen', description: 'Kann Türschlösser steuern' },
  { key: 'action:climate', category: 'action', displayName: 'Klima steuern', description: 'Kann Temperatur ändern' },
  { key: 'action:scenes', category: 'action', displayName: 'Szenen aktivieren', description: 'Kann Szenen/Skripte ausführen' },
  { key: 'action:vacuum', category: 'action', displayName: 'Saugroboter steuern', description: 'Kann Staubsauger starten/stoppen' },
  { key: 'action:intercom', category: 'action', displayName: 'Türsprechanlage bedienen', description: 'Kann Tür öffnen, sprechen' },
]

const ROLES = [
  {
    name: 'owner',
    displayName: 'Owner',
    description: 'Voller Zugriff, kann andere Admins ernennen',
    isSystem: true,
    permissions: PERMISSIONS.map(p => p.key)
  },
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Benutzer verwalten, alle Module',
    isSystem: true,
    permissions: PERMISSIONS.map(p => p.key)
  },
  {
    name: 'power_user',
    displayName: 'Power User',
    description: 'Alle Module, keine Benutzerverwaltung',
    isSystem: true,
    permissions: PERMISSIONS.filter(p => p.category !== 'admin').map(p => p.key)
  },
  {
    name: 'viewer',
    displayName: 'Betrachter',
    description: 'Nur ansehen, keine Aktionen',
    isSystem: true,
    permissions: PERMISSIONS.filter(p => p.category === 'module' || p.key === 'settings:view').map(p => p.key)
  },
  {
    name: 'guest',
    displayName: 'Gast',
    description: 'Eingeschränkte Sicht',
    isSystem: true,
    permissions: ['module:dashboard', 'module:calendar', 'module:more']
  }
]

async function main() {
  console.log('Seeding database...')
  
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { displayName: perm.displayName, description: perm.description },
      create: perm
    })
  }
  console.log(`Created ${PERMISSIONS.length} permissions`)
  
  for (const roleData of ROLES) {
    const { permissions: permKeys, ...roleInfo } = roleData
    
    const role = await prisma.role.upsert({
      where: { name: roleInfo.name },
      update: { displayName: roleInfo.displayName, description: roleInfo.description },
      create: roleInfo
    })
    
    for (const permKey of permKeys) {
      const permission = await prisma.permission.findUnique({ where: { key: permKey } })
      if (permission) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id }
        })
      }
    }
  }
  console.log(`Created ${ROLES.length} roles with permissions`)
  
  const existingUsers = await prisma.user.count()
  const isProduction = process.env.NODE_ENV === 'production'
  const allowDefaultAdmin = process.env.ALLOW_DEFAULT_ADMIN === 'true'
  
  if (existingUsers === 0) {
    if (isProduction && !allowDefaultAdmin) {
      console.log('Production mode: No default admin created.')
      console.log('Use "npm run create-admin" to create the initial admin user.')
      console.log('Or set ALLOW_DEFAULT_ADMIN=true to allow default admin creation.')
    } else {
      const ownerRole = await prisma.role.findUnique({ where: { name: 'owner' } })
      if (ownerRole) {
        const passwordHash = await bcrypt.hash('admin', 12)
        const adminUser = await prisma.user.create({
          data: {
            username: 'admin',
            passwordHash,
            displayName: 'Administrator',
            roleId: ownerRole.id,
            status: 'active'
          }
        })
        
        await prisma.dashboardConfig.create({
          data: {
            userId: adminUser.id,
            layoutConfig: JSON.stringify({
              persons: [],
              lights: [],
              covers: [],
              customButtons: []
            })
          }
        })
        
        console.log('Created default admin user (username: admin, password: admin)')
        console.log('WARNING: Change the password immediately after first login!')
      }
    }
  } else {
    console.log('Users already exist, skipping default admin creation')
  }
  
  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error('Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
