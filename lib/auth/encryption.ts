import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  const keyBuffer = Buffer.from(key, 'hex')
  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)')
  }
  return keyBuffer
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
