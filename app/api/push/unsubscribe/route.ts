import { NextRequest, NextResponse } from 'next/server'
import { removeSubscription, removeSubscriptionByEndpoint } from '@/lib/push/subscriptions'
import { csrfProtection } from '@/lib/auth/csrf'
import { getSessionFromCookie } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const csrfError = csrfProtection(request)
    if (csrfError) return csrfError
    
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { userId, endpoint } = body
    
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Missing endpoint' },
        { status: 400 }
      )
    }
    
    if (userId) {
      removeSubscription(userId.toLowerCase(), endpoint)
      console.log(`[Push] Subscription removed for user: ${userId}`)
    } else {
      removeSubscriptionByEndpoint(endpoint)
      console.log(`[Push] Subscription removed by endpoint`)
    }
    
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[Push] Unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    )
  }
}
