import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { getSubscriptionsForUsers, removeSubscriptionByEndpoint } from '@/lib/push/subscriptions'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'
const PUSH_API_SECRET = process.env.PUSH_API_SECRET

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (!PUSH_API_SECRET || token !== PUSH_API_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return NextResponse.json(
      { error: 'VAPID keys not configured' },
      { status: 500 }
    )
  }
  
  try {
    const body = await request.json()
    const { users, title, message, image, tag, url } = body
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid users array' },
        { status: 400 }
      )
    }
    
    if (!title) {
      return NextResponse.json(
        { error: 'Missing title' },
        { status: 400 }
      )
    }
    
    const subscriptions = getSubscriptionsForUsers(users.map((u: string) => u.toLowerCase()))
    
    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No subscriptions found for specified users', users },
        { status: 404 }
      )
    }
    
    const payload = JSON.stringify({
      title,
      body: message,
      image,
      tag: tag || 'default',
      url: url || '/',
    })
    
    const results = await Promise.allSettled(
      subscriptions.map(async ({ subscription }) => {
        try {
          await webpush.sendNotification(subscription, payload)
          return { success: true, endpoint: subscription.endpoint }
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode
          if (statusCode === 410 || statusCode === 404) {
            removeSubscriptionByEndpoint(subscription.endpoint)
            console.log(`[Push] Removed expired subscription: ${subscription.endpoint}`)
          }
          throw error
        }
      })
    )
    
    const sent = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length
    
    console.log(`[Push] Sent ${sent}/${subscriptions.length} notifications (${failed} failed)`)
    
    return NextResponse.json({
      ok: true,
      sent,
      failed,
      total: subscriptions.length,
    })
  } catch (error) {
    console.error('[Push] Send error:', error)
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    )
  }
}
