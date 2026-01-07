import { encrypt, decrypt } from '@/lib/auth/encryption'

const ENCRYPTED_PREFIX = 'enc:'

export interface UnifiConfig {
  controllerUrl: string
  protectApiKey: string
  accessApiKey: string
  cameras: string[]
  accessDevices: { id: string; name: string; type: string; doorId?: string }[]
  aiSurveillanceEnabled: boolean
}

export function encryptUnifiApiKeys(config: UnifiConfig): UnifiConfig {
  const result = { ...config }
  
  if (config.protectApiKey && !config.protectApiKey.startsWith(ENCRYPTED_PREFIX)) {
    const { ciphertext, nonce } = encrypt(config.protectApiKey)
    result.protectApiKey = ENCRYPTED_PREFIX + Buffer.concat([nonce, ciphertext]).toString('base64')
  }
  
  if (config.accessApiKey && !config.accessApiKey.startsWith(ENCRYPTED_PREFIX)) {
    const { ciphertext, nonce } = encrypt(config.accessApiKey)
    result.accessApiKey = ENCRYPTED_PREFIX + Buffer.concat([nonce, ciphertext]).toString('base64')
  }
  
  return result
}

export function decryptUnifiApiKeys(config: UnifiConfig): UnifiConfig {
  const result = { ...config }
  
  if (config.protectApiKey?.startsWith(ENCRYPTED_PREFIX)) {
    try {
      const data = Buffer.from(config.protectApiKey.slice(ENCRYPTED_PREFIX.length), 'base64')
      const nonce = data.slice(0, 12)
      const ciphertext = data.slice(12)
      result.protectApiKey = decrypt(ciphertext, nonce)
    } catch (error) {
      console.error('[UniFi] Failed to decrypt Protect API key:', error)
      result.protectApiKey = ''
    }
  }
  
  if (config.accessApiKey?.startsWith(ENCRYPTED_PREFIX)) {
    try {
      const data = Buffer.from(config.accessApiKey.slice(ENCRYPTED_PREFIX.length), 'base64')
      const nonce = data.slice(0, 12)
      const ciphertext = data.slice(12)
      result.accessApiKey = decrypt(ciphertext, nonce)
    } catch (error) {
      console.error('[UniFi] Failed to decrypt Access API key:', error)
      result.accessApiKey = ''
    }
  }
  
  return result
}
