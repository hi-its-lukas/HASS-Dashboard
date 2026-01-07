import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

const KEY_FILE_PATH = '/data/.encryption_key'
const DEV_KEY_FILE_PATH = join(process.cwd(), 'data', '.encryption_key')

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

let cachedKey: Buffer | null = null

function getKeyFilePath(): string {
  if (existsSync('/data')) {
    return KEY_FILE_PATH
  }
  return DEV_KEY_FILE_PATH
}

function ensureKeyFileExistsDev(): void {
  const keyPath = getKeyFilePath()
  const keyDir = dirname(keyPath)
  
  if (!existsSync(keyDir)) {
    mkdirSync(keyDir, { recursive: true })
  }
  
  if (!existsSync(keyPath)) {
    const newKey = randomBytes(32).toString('hex')
    writeFileSync(keyPath, newKey, { mode: 0o600 })
    console.log('[Encryption] Generated new encryption key at:', keyPath)
  }
}

function getEncryptionKey(): Buffer {
  if (cachedKey) {
    return cachedKey
  }

  const envKey = process.env.ENCRYPTION_KEY
  if (envKey) {
    const keyBuffer = Buffer.from(envKey, 'hex')
    if (keyBuffer.length === 32) {
      cachedKey = keyBuffer
      return cachedKey
    }
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)')
  }

  if (IS_PRODUCTION) {
    const keyPath = getKeyFilePath()
    if (existsSync(keyPath)) {
      const fileKey = readFileSync(keyPath, 'utf8').trim()
      const keyBuffer = Buffer.from(fileKey, 'hex')
      if (keyBuffer.length !== 32) {
        throw new Error('Encryption key file must contain 32 bytes (64 hex characters)')
      }
      cachedKey = keyBuffer
      return cachedKey
    }
    throw new Error(
      'CRITICAL: No encryption key available in production. ' +
      'Set ENCRYPTION_KEY environment variable (64 hex chars) or create ' +
      keyPath + ' with a 64-character hex key. ' +
      'Generate one with: openssl rand -hex 32'
    )
  }

  ensureKeyFileExistsDev()
  const keyPath = getKeyFilePath()
  const fileKey = readFileSync(keyPath, 'utf8').trim()
  
  const keyBuffer = Buffer.from(fileKey, 'hex')
  if (keyBuffer.length !== 32) {
    throw new Error('Encryption key must be 32 bytes (64 hex characters)')
  }
  
  cachedKey = keyBuffer
  return cachedKey
}

export interface EncryptedData {
  ciphertext: Buffer
  nonce: Buffer
}

export function encrypt(plaintext: string): EncryptedData {
  const key = getEncryptionKey()
  const nonce = randomBytes(IV_LENGTH)
  
  const cipher = createCipheriv(ALGORITHM, key, nonce)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ])
  const authTag = cipher.getAuthTag()
  
  const ciphertext = Buffer.concat([encrypted, authTag])
  
  return { ciphertext, nonce }
}

export function decrypt(ciphertext: Buffer, nonce: Buffer): string {
  const key = getEncryptionKey()
  
  const authTag = ciphertext.slice(-AUTH_TAG_LENGTH)
  const encryptedData = ciphertext.slice(0, -AUTH_TAG_LENGTH)
  
  const decipher = createDecipheriv(ALGORITHM, key, nonce)
  decipher.setAuthTag(authTag)
  
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final()
  ])
  
  return decrypted.toString('utf8')
}

export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex')
}
