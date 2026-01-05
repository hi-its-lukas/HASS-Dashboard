import { NextResponse } from 'next/server'
import { getAllSubscriptions, type PushSubscription } from '@/lib/push/subscriptions'

export async function GET() {
  const hasVapidPublic = !!process.env.VAPID_PUBLIC_KEY
  const hasVapidPrivate = !!process.env.VAPID_PRIVATE_KEY
  const hasVapidSubject = !!process.env.VAPID_SUBJECT
  
  const subscriptions = getAllSubscriptions()
  
  const subscriptionSummary: Record<string, number> = {}
  for (const [userId, subs] of Object.entries(subscriptions) as [string, PushSubscription[]][]) {
    subscriptionSummary[userId] = subs.length
  }
  
  return NextResponse.json({
    vapid: {
      publicKey: hasVapidPublic ? 'configured' : 'MISSING',
      privateKey: hasVapidPrivate ? 'configured' : 'MISSING',
      subject: hasVapidSubject ? process.env.VAPID_SUBJECT : 'MISSING',
    },
    subscriptions: subscriptionSummary,
    totalSubscriptions: Object.values(subscriptions).flat().length,
    serverTime: new Date().toISOString(),
  })
}
