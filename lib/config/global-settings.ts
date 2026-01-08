import prisma from '@/lib/db/client'
import { encrypt, decrypt } from '@/lib/auth/encryption'
import type { UnifiConfig } from '@/lib/unifi/encryption'
import { decryptUnifiApiKeys } from '@/lib/unifi/encryption'

const GLOBAL_LAYOUT_KEY = 'global_layout_config'

export interface GlobalLayoutConfig {
  dashboardTitle?: string
  weatherEntityId?: string
  temperatureSensorId?: string
  trashCalendarId?: string
  lightsGroupEntityId?: string
  powerEntityId?: string
  alarmEntityId?: string
  energy?: {
    solarEntityId?: string
    batteryEntityId?: string
    batteryLevelEntityId?: string
    gridEntityId?: string
    houseEntityId?: string
  }
  security?: {
    alarmEntityId?: string
    zones?: { id: string; name: string; entityId: string }[]
    dogModeEntityId?: string
  }
  rooms?: { id: string; name: string; icon: string; entityIds: string[] }[]
  persons?: string[] | { id: string; name: string; entityId: string }[]
  personDetails?: { personId: string; activitySensor?: string; stepsSensor?: string; distanceSensor?: string; batterySensor?: string }[]
  lights?: string[]
  covers?: string[]
  awnings?: string[]
  curtains?: string[]
  climates?: string[]
  calendars?: string[]
  cameras?: string[]
  appliances?: string[] | { id: string; name: string; entityId: string; icon?: string }[]
  customButtons?: { id: string; label: string; icon: string; domain: string; service: string; entityId?: string; data?: Record<string, unknown> }[]
  intercoms?: { id: string; name: string; cameraEntityId: string; speakUrl?: string; lockEntityId?: string; slug: string }[]
  vacuum?: { entityId?: string; roomIds?: Record<string, number> }
  unifi?: UnifiConfig
}

export async function getGlobalLayoutConfig(): Promise<GlobalLayoutConfig> {
  try {
    const record = await prisma.systemConfig.findUnique({
      where: { key: GLOBAL_LAYOUT_KEY }
    })
    
    if (!record) {
      return {}
    }
    
    if (record.encrypted) {
      const parsed = JSON.parse(record.value)
      const decrypted = decrypt(Buffer.from(parsed.ciphertext, 'base64'), Buffer.from(parsed.nonce, 'base64'))
      return JSON.parse(decrypted)
    }
    
    return JSON.parse(record.value)
  } catch (error) {
    console.error('[GlobalSettings] Failed to get global layout config:', error)
    return {}
  }
}

export async function setGlobalLayoutConfig(config: GlobalLayoutConfig): Promise<void> {
  const value = JSON.stringify(config)
  const encrypted = encrypt(value)
  const encryptedValue = JSON.stringify({
    ciphertext: encrypted.ciphertext.toString('base64'),
    nonce: encrypted.nonce.toString('base64')
  })
  
  await prisma.systemConfig.upsert({
    where: { key: GLOBAL_LAYOUT_KEY },
    create: { key: GLOBAL_LAYOUT_KEY, value: encryptedValue, encrypted: true },
    update: { value: encryptedValue, encrypted: true }
  })
}

export async function mergeGlobalLayoutConfig(partial: Partial<GlobalLayoutConfig>): Promise<GlobalLayoutConfig> {
  const existing = await getGlobalLayoutConfig()
  const merged = { ...existing, ...partial }
  await setGlobalLayoutConfig(merged)
  return merged
}

export async function getGlobalUnifiConfig(): Promise<UnifiConfig | null> {
  const config = await getGlobalLayoutConfig()
  if (!config.unifi) {
    return null
  }
  return decryptUnifiApiKeys(config.unifi)
}
