import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { getSubscriptionsForUsers, removeSubscriptionByEndpoint } from '@/lib/push/subscriptions'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export async function POST(request: NextRequest) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return NextResponse.json(
      { error: 'VAPID keys not configured' },
      { status: 500 }
    )
  }
  
  try {
    const body = await request.json()
    const { userId } = body
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }
    
    const subscriptions = getSubscriptionsForUsers([userId.toLowerCase()])
    
    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'Keine Subscription gefunden. Bitte Push erst aktivieren.' },
        { status: 404 }
      )
    }
    
    const payload = JSON.stringify({
      title: 'Test-Benachrichtigung',
      body: `Hallo ${userId}! Push funktioniert.`,
      tag: 'test',
      url: '/',
    })
    
    const results = await Promise.allSettled(
      subscriptions.map(async ({ subscription }) => {
        try {
          await webpush.sendNotification(subscription, payload)
          return { success: true }
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode
          if (statusCode === 410 || statusCode === 404) {
            removeSubscriptionByEndpoint(subscription.endpoint)
          }
          throw error
        }
      })
    )
    
    const sent = results.filter((r) => r.status === 'fulfilled').length
    
    if (sent === 0) {
      return NextResponse.json(
        { error: 'Alle Subscriptions sind abgelaufen. Bitte Push neu aktivieren.' },
        { status: 410 }
      )
    }
    
    return NextResponse.json({ ok: true, sent })
  } catch (error) {
    console.error('[Push] Test error:', error)
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    )
  }
}
