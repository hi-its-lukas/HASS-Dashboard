import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getGo2rtcApiUrl, GO2RTC_PORT } from '@/lib/streaming/go2rtc'
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

    // Check go2rtc health by calling its API (managed by Gateway now)
    let isHealthy = false
    try {
      const response = await fetch(`http://127.0.0.1:${GO2RTC_PORT}/api`, {
        signal: AbortSignal.timeout(2000)
      })
      isHealthy = response.ok
    } catch {
      isHealthy = false
    }

    return NextResponse.json({
      running: isHealthy,
      processRunning: isHealthy,
      isHealthy,
      apiUrl: isHealthy ? getGo2rtcApiUrl() : null,
      liveStreamEnabled,
      hasCredentials
    })
  } catch (error) {
    console.error('Error checking streaming status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
