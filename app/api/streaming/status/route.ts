import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { isGo2rtcRunning, getGo2rtcApiUrl, checkGo2rtcHealth } from '@/lib/streaming/go2rtc'
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

    // Check both process state and actual health
    const processRunning = isGo2rtcRunning()
    const isHealthy = await checkGo2rtcHealth()
    const running = processRunning && isHealthy

    return NextResponse.json({
      running,
      processRunning,
      isHealthy,
      apiUrl: running ? getGo2rtcApiUrl() : null,
      liveStreamEnabled,
      hasCredentials
    })
  } catch (error) {
    console.error('Error checking streaming status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
