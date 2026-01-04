import fs from 'fs'
import path from 'path'

const SUBSCRIPTIONS_FILE = path.join(process.cwd(), 'data', 'push-subscriptions.json')

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface SubscriptionsData {
  [userId: string]: PushSubscription[]
}

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

export function loadSubscriptions(): SubscriptionsData {
  ensureDataDir()
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      const data = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error loading subscriptions:', error)
  }
  return {}
}

export function saveSubscriptions(data: SubscriptionsData): void {
  ensureDataDir()
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(data, null, 2))
}

export function addSubscription(userId: string, subscription: PushSubscription): void {
  const data = loadSubscriptions()
  
  if (!data[userId]) {
    data[userId] = []
  }
  
  const existingIndex = data[userId].findIndex(
    (sub) => sub.endpoint === subscription.endpoint
  )
  
  if (existingIndex >= 0) {
    data[userId][existingIndex] = subscription
  } else {
    data[userId].push(subscription)
  }
  
  saveSubscriptions(data)
}

export function removeSubscription(userId: string, endpoint: string): void {
  const data = loadSubscriptions()
  
  if (data[userId]) {
    data[userId] = data[userId].filter((sub) => sub.endpoint !== endpoint)
    if (data[userId].length === 0) {
      delete data[userId]
    }
    saveSubscriptions(data)
  }
}

export function removeSubscriptionByEndpoint(endpoint: string): void {
  const data = loadSubscriptions()
  
  for (const userId of Object.keys(data)) {
    data[userId] = data[userId].filter((sub) => sub.endpoint !== endpoint)
    if (data[userId].length === 0) {
      delete data[userId]
    }
  }
  
  saveSubscriptions(data)
}

export function getSubscriptionsForUsers(userIds: string[]): { userId: string; subscription: PushSubscription }[] {
  const data = loadSubscriptions()
  const result: { userId: string; subscription: PushSubscription }[] = []
  
  for (const userId of userIds) {
    if (data[userId]) {
      for (const subscription of data[userId]) {
        result.push({ userId, subscription })
      }
    }
  }
  
  return result
}
