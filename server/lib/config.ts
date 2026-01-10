import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { PrismaClient } from '@prisma/client'
import { createDecipheriv } from 'crypto'

export const WS_PORT = parseInt(process.env.WS_PROXY_PORT || '6000', 10)
export const SQLITE_URL = process.env.SQLITE_URL || 'file:./data/ha-dashboard.db'
export const IS_PRODUCTION = process.env.NODE_ENV === 'production'

export const prisma = new PrismaClient({ datasources: { db: { url: SQLITE_URL } } })

let cachedEncryptionKey: Buffer | null = null

export function loadEncryptionKey(): Buffer {
  if (cachedEncryptionKey) {
    return cachedEncryptionKey
  }

  const envKey = process.env.ENCRYPTION_KEY
  if (envKey) {
    const keyBuffer = Buffer.from(envKey, 'hex')
    if (keyBuffer.length === 32) {
      cachedEncryptionKey = keyBuffer
      return cachedEncryptionKey
    }
  }

  const keyPaths = [
    '/data/.encryption_key',
    join(process.cwd(), 'data', '.encryption_key')
  ]

  for (const keyPath of keyPaths) {
    if (existsSync(keyPath)) {
      const keyHex = readFileSync(keyPath, 'utf-8').trim()
      const keyBuffer = Buffer.from(keyHex, 'hex')
      if (keyBuffer.length === 32) {
        cachedEncryptionKey = keyBuffer
        return cachedEncryptionKey
      }
    }
  }

  throw new Error('Encryption key not found. Set ENCRYPTION_KEY environment variable or create data/.encryption_key file.')
}

export function getEncryptionKey(): Buffer {
  if (!cachedEncryptionKey) {
    cachedEncryptionKey = loadEncryptionKey()
  }
  return cachedEncryptionKey
}

export function decryptToken(value: string): string {
  const key = getEncryptionKey()
  
  const parsed = JSON.parse(value)
  const ciphertext = Buffer.from(parsed.ciphertext, 'base64')
  const nonce = Buffer.from(parsed.nonce, 'base64')
  
  const AUTH_TAG_LENGTH = 16
  const authTag = ciphertext.slice(-AUTH_TAG_LENGTH)
  const encryptedData = ciphertext.slice(0, -AUTH_TAG_LENGTH)
  
  const decipher = createDecipheriv('aes-256-gcm', key, nonce)
  decipher.setAuthTag(authTag)
  
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final()
  ])
  
  return decrypted.toString('utf-8')
}

export function decryptFromParts(ciphertext: Buffer, nonce: Buffer): string {
  const key = getEncryptionKey()
  const AUTH_TAG_LENGTH = 16
  const authTag = ciphertext.slice(-AUTH_TAG_LENGTH)
  const encryptedData = ciphertext.slice(0, -AUTH_TAG_LENGTH)
  
  const decipher = createDecipheriv('aes-256-gcm', key, nonce)
  decipher.setAuthTag(authTag)
  
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final()
  ])
  
  return decrypted.toString('utf-8')
}
