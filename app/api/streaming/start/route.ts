import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getGlobalUnifiConfig } from '@/lib/config/global-settings'
import { writeGo2rtcConfig, buildTokenRtspUrl, getGo2rtcApiUrl, GO2RTC_PORT } from '@/lib/streaming/go2rtc'
import { ProtectClient } from '@/lib/unifi/protect-client'

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

    if (!unifiConfig.cameras || unifiConfig.cameras.length === 0) {
      return NextResponse.json({ error: 'No cameras configured' }, { status: 400 })
    }

    const controllerUrl = new URL(unifiConfig.controllerUrl)
    const nvrHost = controllerUrl.hostname

    const rtspChannel = unifiConfig.rtspChannel ?? 1
    
    const client = new ProtectClient(unifiConfig.controllerUrl, unifiConfig.protectApiKey)
    
    if (unifiConfig.rtspUsername && unifiConfig.rtspPassword) {
      console.log('[Streaming] Attempting session login for Bootstrap API access...')
      console.log('[Streaming] Using username:', unifiConfig.rtspUsername)
      const loginSuccess = await client.loginWithCredentials(
        unifiConfig.rtspUsername,
        unifiConfig.rtspPassword
      )
      if (loginSuccess) {
        console.log('[Streaming] Session login SUCCESSFUL - Bootstrap API should work')
      } else {
        console.log('[Streaming] Session login FAILED - Bootstrap API will likely fail too')
      }
    } else {
      console.log('[Streaming] No RTSP credentials configured - cannot authenticate to Bootstrap API')
    }
    
    console.log('[Streaming] Fetching RTSP tokens from Bootstrap API...')
    const rtspTokens = await client.getRtspTokens()
    console.log('[Streaming] Got', rtspTokens.length, 'cameras with RTSP tokens')
    
    if (rtspTokens.length === 0) {
      console.log('[Streaming] No RTSP tokens found - RTSP may not be enabled or session auth required')
      return NextResponse.json({ 
        error: 'No RTSP tokens found. Please ensure RTSP is enabled in UniFi Protect and credentials are correct.' 
      }, { status: 400 })
    }
    
    const streams: { cameraId: string; name: string; rtspUrl: string }[] = []
    
    for (const cameraId of unifiConfig.cameras) {
      const cameraTokens = rtspTokens.find(t => t.cameraId === cameraId)
      
      if (!cameraTokens) {
        console.log(`[Streaming] No RTSP tokens for camera ${cameraId}`)
        continue
      }
      
      let token: string | undefined
      if (rtspChannel === 0 && cameraTokens.high) {
        token = cameraTokens.high
      } else if (rtspChannel === 1 && cameraTokens.medium) {
        token = cameraTokens.medium
      } else if (rtspChannel === 2 && cameraTokens.low) {
        token = cameraTokens.low
      } else {
        token = cameraTokens.medium || cameraTokens.high || cameraTokens.low
      }
      
      if (token) {
        streams.push({
          cameraId,
          name: cameraTokens.cameraName || cameraId,
          rtspUrl: buildTokenRtspUrl(nvrHost, token)
        })
      }
    }
    
    if (streams.length === 0) {
      return NextResponse.json({ 
        error: 'No valid RTSP streams found. Enable RTSP for cameras in UniFi Protect.' 
      }, { status: 400 })
    }
    
    console.log('[Streaming] Writing go2rtc config with', streams.length, 'token-based streams for host:', nvrHost, 'quality:', rtspChannel === 0 ? 'high' : rtspChannel === 1 ? 'medium' : 'low')

    writeGo2rtcConfig(streams)

    await new Promise(resolve => setTimeout(resolve, 3000))

    try {
      const healthCheck = await fetch(`http://127.0.0.1:${GO2RTC_PORT}/api`, { 
        signal: AbortSignal.timeout(2000) 
      })
      if (healthCheck.ok) {
        return NextResponse.json({ 
          success: true, 
          message: 'go2rtc config written with token-based RTSP URLs',
          apiUrl: getGo2rtcApiUrl(),
          streams: streams.length
        })
      }
    } catch {
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
