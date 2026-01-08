#!/usr/bin/env npx tsx
import * as readline from 'readline'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

function questionHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt)
    
    const stdin = process.stdin
    const wasRaw = stdin.isRaw
    stdin.setRawMode?.(true)
    stdin.resume()
    
    let password = ''
    
    const onData = (char: Buffer) => {
      const c = char.toString()
      
      if (c === '\n' || c === '\r') {
        stdin.setRawMode?.(wasRaw)
        stdin.pause()
        stdin.removeListener('data', onData)
        process.stdout.write('\n')
        resolve(password)
      } else if (c === '\u0003') {
        process.exit()
      } else if (c === '\u007F' || c === '\b') {
        if (password.length > 0) {
          password = password.slice(0, -1)
          process.stdout.write('\b \b')
        }
      } else {
        password += c
        process.stdout.write('*')
      }
    }
    
    stdin.on('data', onData)
  })
}

async function main() {
  console.log('\n=== HA Dashboard Admin Setup ===\n')
  
  const existingAdmins = await prisma.user.findMany({
    where: {
      role: {
        name: 'owner'
      }
    }
  })
  
  if (existingAdmins.length > 0) {
    console.log(`Es existieren bereits ${existingAdmins.length} Admin-Benutzer.`)
    const proceed = await question('Trotzdem einen neuen Admin erstellen? (ja/nein): ')
    if (proceed.toLowerCase() !== 'ja' && proceed.toLowerCase() !== 'j') {
      console.log('Abgebrochen.')
      process.exit(0)
    }
  }
  
  let ownerRole = await prisma.role.findUnique({
    where: { name: 'owner' }
  })
  
  if (!ownerRole) {
    console.log('Erstelle Owner-Rolle...')
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
  if (allPermissions.length === 0) {
    console.log('Keine Berechtigungen gefunden. Bitte zuerst "npx prisma db seed" ausführen.')
    process.exit(1)
  }
  
  const existingRolePerms = await prisma.rolePermission.count({
    where: { roleId: ownerRole.id }
  })
  
  if (existingRolePerms === 0) {
    console.log('Füge Berechtigungen zur Owner-Rolle hinzu...')
    for (const perm of allPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: ownerRole.id, permissionId: perm.id }
      })
    }
    console.log(`${allPermissions.length} Berechtigungen zugewiesen.`)
  }
  
  const username = await question('Benutzername: ')
  
  if (!username || username.length < 3) {
    console.error('Benutzername muss mindestens 3 Zeichen lang sein.')
    process.exit(1)
  }
  
  const existingUser = await prisma.user.findUnique({
    where: { username }
  })
  
  if (existingUser) {
    console.error(`Benutzer "${username}" existiert bereits.`)
    process.exit(1)
  }
  
  const password = await questionHidden('Passwort: ')
  
  if (!password || password.length < 8) {
    console.error('Passwort muss mindestens 8 Zeichen lang sein.')
    process.exit(1)
  }
  
  const confirmPassword = await questionHidden('Passwort bestätigen: ')
  
  if (password !== confirmPassword) {
    console.error('Passwörter stimmen nicht überein.')
    process.exit(1)
  }
  
  const displayName = await question('Anzeigename (optional): ')
  
  console.log('\nErstelle Admin-Benutzer...')
  
  const passwordHash = await bcrypt.hash(password, 12)
  
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      displayName: displayName || username,
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
  
  console.log(`\nAdmin-Benutzer "${username}" erfolgreich erstellt!`)
  console.log('Sie können sich jetzt einloggen.\n')
  
  rl.close()
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('Fehler:', e)
  await prisma.$disconnect()
  process.exit(1)
})
