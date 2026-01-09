import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getGlobalUnifiConfig } from '@/lib/config/global-settings'

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let liveStreamEnabled = false
    let hasCredentials = false

    const unifiConfig = await getGlobalUnifiConfig()
    if (unifiConfig) {
      liveStreamEnabled = unifiConfig.liveStreamEnabled === true
      hasCredentials = Boolean(unifiConfig.rtspUsername && unifiConfig.rtspPassword)
    }

    return NextResponse.json({
      running: hasCredentials && liveStreamEnabled,
      liveStreamEnabled,
      hasCredentials,
      streamingMethod: 'unifi-protect-native'
    })
  } catch (error) {
    console.error('Error checking streaming status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
