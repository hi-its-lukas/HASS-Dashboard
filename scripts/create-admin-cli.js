#!/usr/bin/env node
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.log('Usage: node scripts/create-admin-cli.js <username> <password> [displayName]')
    console.log('Example: node scripts/create-admin-cli.js admin MySecurePass123 "Admin User"')
    process.exit(1)
  }
  
  const username = args[0]
  const password = args[1]
  const displayName = args[2] || username
  
  console.log('\n=== HA Dashboard Admin Setup ===\n')
  
  if (username.length < 3) {
    console.error('Error: Username must be at least 3 characters.')
    process.exit(1)
  }
  
  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters.')
    process.exit(1)
  }
  
  const existingUser = await prisma.user.findUnique({
    where: { username }
  })
  
  if (existingUser) {
    console.error(`Error: User "${username}" already exists.`)
    process.exit(1)
  }
  
  let ownerRole = await prisma.role.findUnique({
    where: { name: 'owner' }
  })
  
  if (!ownerRole) {
    console.log('Creating owner role...')
    ownerRole = await prisma.role.create({
      data: {
        name: 'owner',
        displayName: 'Owner',
        description: 'Full access to all features',
        isSystem: true
      }
    })
  }
  
  console.log('Creating admin user...')
  
  const passwordHash = await bcrypt.hash(password, 12)
  
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
      displayName,
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
  
  console.log(`\nAdmin user "${username}" created successfully!`)
  console.log('You can now log in.\n')
  
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('Error:', e.message)
  await prisma.$disconnect()
  process.exit(1)
})
