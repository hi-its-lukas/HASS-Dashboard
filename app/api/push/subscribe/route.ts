import { NextRequest, NextResponse } from 'next/server'
import { addSubscription } from '@/lib/push/subscriptions'
import { csrfProtection } from '@/lib/auth/csrf'
import { getSessionFromCookie } from '@/lib/auth/session'
import { PushSubscriptionSchema, validateBody } from '@/lib/validation/api-schemas'

export async function POST(request: NextRequest) {
  try {
    const csrfError = csrfProtection(request)
    if (csrfError) return csrfError
    
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    
    const validation = validateBody(PushSubscriptionSchema, body)
    if (!validation.success) {
      console.warn('[Push] Subscribe validation failed:', validation.details)
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 })
    }
    
    const { userId, subscription } = validation.data
    
    console.log('[Push] Subscribe request:', { userId, hasSubscription: !!subscription })
    
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
