import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getGlobalUnifiConfig } from '@/lib/config/global-settings'
import { writeGo2rtcConfig, buildRtspUrl, getGo2rtcApiUrl, GO2RTC_PORT } from '@/lib/streaming/go2rtc'

export async function POST() {
  try {
    const session = await getSessionFromCookie()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const unifiConfig = await getGlobalUnifiConfig()
    if (!unifiConfig) {
      return NextResponse.json({ error: 'UniFi not configured' }, { status: 400 })
    }
    
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

    const rtspChannel = unifiConfig.rtspChannel ?? 1
    
    // Use all cameras - Gateway manages go2rtc lifecycle now
    const useSecure = true // Use RTSPS with #insecure flag
    
    const streams = unifiConfig.cameras.map((cameraId: string) => ({
      cameraId,
      name: cameraId,
      rtspUrl: buildRtspUrl(
        nvrHost,
        cameraId,
        unifiConfig.rtspUsername!,
        unifiConfig.rtspPassword!,
        rtspChannel,
        useSecure
      )
    }))
    
    console.log('[Streaming] Writing go2rtc config with', streams.length, 'streams for host:', nvrHost, 'channel:', rtspChannel)

    // Write config file - Gateway will auto-detect and start go2rtc
    writeGo2rtcConfig(streams)

    // Wait a moment for Gateway to detect and start go2rtc
    await new Promise(resolve => setTimeout(resolve, 3000))

    // Check if go2rtc is now running by trying to reach its API
    try {
      const healthCheck = await fetch(`http://127.0.0.1:${GO2RTC_PORT}/api`, { 
        signal: AbortSignal.timeout(2000) 
      })
      if (healthCheck.ok) {
        return NextResponse.json({ 
          success: true, 
          message: 'go2rtc config written, Gateway started go2rtc',
          apiUrl: getGo2rtcApiUrl(),
          streams: streams.length
        })
      }
    } catch (e) {
      // go2rtc not yet running
    }

    return NextResponse.json({ 
      success: true, 
      message: 'go2rtc config written, Gateway will start go2rtc shortly',
      apiUrl: getGo2rtcApiUrl(),
      streams: streams.length
    })
  } catch (error) {
    console.error('Error writing streaming config:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
