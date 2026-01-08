import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import prisma from '@/lib/db/client'
import { decryptUnifiApiKeys } from '@/lib/unifi/encryption'
import { startGo2rtc, isGo2rtcRunning, buildRtspUrl, getGo2rtcApiUrl } from '@/lib/streaming/go2rtc'

export async function POST() {
  try {
    const session = await getSessionFromCookie()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (isGo2rtcRunning()) {
      return NextResponse.json({ 
        success: true, 
        message: 'go2rtc already running',
        apiUrl: getGo2rtcApiUrl()
      })
    }

    const systemConfig = await prisma.systemConfig.findFirst({
      where: { key: 'unifi' }
    })

    if (!systemConfig?.value) {
      return NextResponse.json({ error: 'UniFi not configured' }, { status: 400 })
    }

    const rawConfig = JSON.parse(systemConfig.value)
    const unifiConfig = decryptUnifiApiKeys(rawConfig)
    
    if (!unifiConfig.liveStreamEnabled) {
      return NextResponse.json({ error: 'Live streaming not enabled' }, { status: 400 })
    }

    if (!unifiConfig.rtspUsername || !unifiConfig.rtspPassword) {
      return NextResponse.json({ error: 'RTSP credentials not configured' }, { status: 400 })
    }

    if (!unifiConfig.cameras || unifiConfig.cameras.length === 0) {
      return NextResponse.json({ error: 'No cameras configured' }, { status: 400 })
    }

    const controllerUrl = new URL(unifiConfig.controllerUrl)
    const nvrHost = controllerUrl.hostname

    const streams = unifiConfig.cameras.map((cameraId: string) => ({
      cameraId,
      name: cameraId,
      rtspUrl: buildRtspUrl(
        nvrHost,
        cameraId,
        unifiConfig.rtspUsername!,
        unifiConfig.rtspPassword!,
        0,
        true
      )
    }))

    const success = await startGo2rtc(streams)

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'go2rtc started',
        apiUrl: getGo2rtcApiUrl(),
        streams: streams.length
      })
    } else {
      return NextResponse.json({ error: 'Failed to start go2rtc' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error starting streaming:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
