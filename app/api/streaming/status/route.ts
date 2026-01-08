import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { isGo2rtcRunning, getGo2rtcApiUrl } from '@/lib/streaming/go2rtc'
import prisma from '@/lib/db/client'
import { decryptUnifiApiKeys } from '@/lib/unifi/encryption'

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const systemConfig = await prisma.systemConfig.findFirst({
      where: { key: 'unifi' }
    })

    let liveStreamEnabled = false
    let hasCredentials = false

    if (systemConfig?.value) {
      const rawConfig = JSON.parse(systemConfig.value)
      const unifiConfig = decryptUnifiApiKeys(rawConfig)
      liveStreamEnabled = unifiConfig.liveStreamEnabled === true
      hasCredentials = Boolean(unifiConfig.rtspUsername && unifiConfig.rtspPassword)
    }

    return NextResponse.json({
      running: isGo2rtcRunning(),
      apiUrl: isGo2rtcRunning() ? getGo2rtcApiUrl() : null,
      liveStreamEnabled,
      hasCredentials
    })
  } catch (error) {
    console.error('Error checking streaming status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
