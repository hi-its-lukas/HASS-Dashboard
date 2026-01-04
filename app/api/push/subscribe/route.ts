import { NextRequest, NextResponse } from 'next/server'
import { addSubscription } from '@/lib/push/subscriptions'

const VALID_USERS = ['lukas', 'simon']

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, subscription } = body
    
    if (!userId || !VALID_USERS.includes(userId.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid userId. Must be one of: ' + VALID_USERS.join(', ') },
        { status: 400 }
      )
    }
    
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription object' },
        { status: 400 }
      )
    }
    
    addSubscription(userId.toLowerCase(), {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    })
    
    console.log(`[Push] Subscription added for user: ${userId}`)
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Push] Subscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    )
  }
}
