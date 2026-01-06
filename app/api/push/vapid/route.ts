import { NextResponse } from 'next/server'
import { getPublicVapidKey } from '@/lib/push/vapid'

export async function GET() {
  try {
    const publicKey = getPublicVapidKey()
    return NextResponse.json({ publicKey })
  } catch (error) {
    console.error('[API] Failed to get VAPID key:', error)
    return NextResponse.json(
      { error: 'Failed to get VAPID key' },
      { status: 500 }
    )
  }
}
