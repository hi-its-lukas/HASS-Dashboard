import { PrismaClient } from '@prisma/client'
import { encrypt } from '../lib/auth/encryption'

const prisma = new PrismaClient()

const GLOBAL_LAYOUT_KEY = 'global_layout_config'

async function main() {
  console.log('Starting migration to global config...')

  const existingGlobal = await prisma.systemConfig.findUnique({
    where: { key: GLOBAL_LAYOUT_KEY }
  })

  if (existingGlobal) {
    console.log('Global config already exists, skipping migration')
    return
  }

  const dashboardConfigs = await prisma.dashboardConfig.findMany({
    include: { user: { select: { username: true } } }
  })

  console.log(`Found ${dashboardConfigs.length} dashboard configs`)

  let bestConfig: Record<string, unknown> = {}
  let bestConfigUsername = ''

  for (const dc of dashboardConfigs) {
    if (dc.layoutConfig) {
      try {
        const parsed = JSON.parse(dc.layoutConfig)
        const configKeys = Object.keys(parsed).filter(k => 
          k !== 'backgroundUrl' && 
          (Array.isArray(parsed[k]) ? parsed[k].length > 0 : parsed[k] !== null && parsed[k] !== undefined)
        )
        
        if (configKeys.length > Object.keys(bestConfig).length) {
          bestConfig = parsed
          bestConfigUsername = dc.user?.username || 'unknown'
        }
      } catch {
        console.error(`Failed to parse config for user ${dc.userId}`)
      }
    }
  }

  if (Object.keys(bestConfig).length > 0) {
    console.log(`Using config from user: ${bestConfigUsername}`)
    
    const { backgroundUrl, ...globalConfig } = bestConfig
    
    const value = JSON.stringify(globalConfig)
    const encrypted = encrypt(value)
    const encryptedValue = JSON.stringify({
      ciphertext: encrypted.ciphertext.toString('base64'),
      nonce: encrypted.nonce.toString('base64')
    })

    await prisma.systemConfig.create({
      data: {
        key: GLOBAL_LAYOUT_KEY,
        value: encryptedValue,
        encrypted: true
      }
    })

    console.log('Global config created successfully')

    for (const dc of dashboardConfigs) {
      if (dc.layoutConfig) {
        try {
          const parsed = JSON.parse(dc.layoutConfig)
          const userPrefs = { backgroundUrl: parsed.backgroundUrl }
          
          await prisma.dashboardConfig.update({
            where: { id: dc.id },
            data: { layoutConfig: JSON.stringify(userPrefs) }
          })
          console.log(`Cleaned up config for user ${dc.userId}`)
        } catch {
          console.error(`Failed to clean up config for user ${dc.userId}`)
        }
      }
    }
  } else {
    console.log('No config to migrate, creating empty global config')
    
    const emptyConfig = {}
    const value = JSON.stringify(emptyConfig)
    const encrypted = encrypt(value)
    const encryptedValue = JSON.stringify({
      ciphertext: encrypted.ciphertext.toString('base64'),
      nonce: encrypted.nonce.toString('base64')
    })

    await prisma.systemConfig.create({
      data: {
        key: GLOBAL_LAYOUT_KEY,
        value: encryptedValue,
        encrypted: true
      }
    })

    console.log('Empty global config created')
  }

  console.log('Migration complete!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
