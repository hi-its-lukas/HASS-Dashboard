import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import webPush from 'web-push'

const VAPID_FILE_PATH = '/data/.vapid_keys.json'
const DEV_VAPID_FILE_PATH = join(process.cwd(), 'data', '.vapid_keys.json')

interface VapidKeys {
  publicKey: string
  privateKey: string
  subject: string
}

let cachedKeys: VapidKeys | null = null

function getVapidFilePath(): string {
  if (existsSync('/data')) {
    return VAPID_FILE_PATH
  }
  return DEV_VAPID_FILE_PATH
}

function ensureVapidKeysExist(): void {
  const keyPath = getVapidFilePath()
  const keyDir = dirname(keyPath)
  
  if (!existsSync(keyDir)) {
    mkdirSync(keyDir, { recursive: true })
  }
  
  if (!existsSync(keyPath)) {
    const keys = webPush.generateVAPIDKeys()
    const vapidData: VapidKeys = {
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
      subject: process.env.VAPID_SUBJECT || 'mailto:admin@localhost'
    }
    writeFileSync(keyPath, JSON.stringify(vapidData, null, 2), { mode: 0o600 })
    console.log('[VAPID] Generated new VAPID keys at:', keyPath)
  }
}

export function getVapidKeys(): VapidKeys {
  if (cachedKeys) {
    return cachedKeys
  }

  const envPublic = process.env.VAPID_PUBLIC_KEY
  const envPrivate = process.env.VAPID_PRIVATE_KEY
  const envSubject = process.env.VAPID_SUBJECT

  if (envPublic && envPrivate && envSubject) {
    cachedKeys = {
      publicKey: envPublic,
      privateKey: envPrivate,
      subject: envSubject
    }
    return cachedKeys
  }

  ensureVapidKeysExist()
  const keyPath = getVapidFilePath()
  const fileContent = readFileSync(keyPath, 'utf8')
  cachedKeys = JSON.parse(fileContent) as VapidKeys
  
  return cachedKeys
}

export function getPublicVapidKey(): string {
  return getVapidKeys().publicKey
}

export function initializeWebPush(): void {
  const keys = getVapidKeys()
  webPush.setVapidDetails(
    keys.subject,
    keys.publicKey,
    keys.privateKey
  )
}

export async function sendPushNotification(
  subscription: webPush.PushSubscription,
  payload: {
    title: string
    body: string
    icon?: string
    badge?: string
    tag?: string
    data?: Record<string, unknown>
  }
): Promise<boolean> {
  try {
    initializeWebPush()
    await webPush.sendNotification(subscription, JSON.stringify(payload))
    return true
  } catch (error) {
    console.error('[Push] Failed to send notification:', error)
    return false
  }
}
