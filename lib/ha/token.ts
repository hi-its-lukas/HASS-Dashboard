import prisma from '@/lib/db/client'
import { encrypt, decrypt } from '@/lib/auth/encryption'

const HA_TOKEN_KEY = 'ha_long_lived_token'
const HA_URL_KEY = 'ha_instance_url'

export interface HAConfig {
  token: string | null
  url: string | null
}

export async function getGlobalHAToken(): Promise<string | null> {
  try {
    const record = await prisma.systemConfig.findUnique({
      where: { key: HA_TOKEN_KEY }
    })
    
    if (!record) return null
    
    if (record.encrypted) {
      const parsed = JSON.parse(record.value)
      return decrypt(Buffer.from(parsed.ciphertext, 'base64'), Buffer.from(parsed.nonce, 'base64'))
    }
    
    return record.value
  } catch (error) {
    console.error('[HA] Failed to get global token:', error)
    return null
  }
}

export async function getGlobalHAUrl(): Promise<string | null> {
  try {
    const record = await prisma.systemConfig.findUnique({
      where: { key: HA_URL_KEY }
    })
    
    return record?.value || null
  } catch (error) {
    console.error('[HA] Failed to get global URL:', error)
    return null
  }
}

export async function getGlobalHAConfig(): Promise<HAConfig> {
  const [token, url] = await Promise.all([
    getGlobalHAToken(),
    getGlobalHAUrl()
  ])
  
  return { token, url }
}

export async function setGlobalHAToken(token: string): Promise<void> {
  const encrypted = encrypt(token)
  const value = JSON.stringify({
    ciphertext: encrypted.ciphertext.toString('base64'),
    nonce: encrypted.nonce.toString('base64')
  })
  
  await prisma.systemConfig.upsert({
    where: { key: HA_TOKEN_KEY },
    create: { key: HA_TOKEN_KEY, value, encrypted: true },
    update: { value, encrypted: true }
  })
}

export async function setGlobalHAUrl(url: string): Promise<void> {
  const normalizedUrl = url.replace(/\/$/, '')
  
  await prisma.systemConfig.upsert({
    where: { key: HA_URL_KEY },
    create: { key: HA_URL_KEY, value: normalizedUrl, encrypted: false },
    update: { value: normalizedUrl }
  })
}

export async function hasGlobalHAConfig(): Promise<boolean> {
  const config = await getGlobalHAConfig()
  return !!(config.token && config.url)
}

export async function testHAConnection(url: string, token: string): Promise<{ success: boolean; message?: string; version?: string }> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)
    
    const response = await fetch(`${url}/api/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      if (response.status === 401) {
        return { success: false, message: 'Ungültiger Token' }
      }
      return { success: false, message: `HTTP ${response.status}` }
    }
    
    const data = await response.json()
    return { success: true, message: data.message, version: data.version }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, message: 'Zeitüberschreitung' }
    }
    return { success: false, message: error instanceof Error ? error.message : 'Verbindungsfehler' }
  }
}
