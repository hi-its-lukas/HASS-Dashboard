import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getGlobalUnifiConfig } from '@/lib/config/global-settings'
import { isGo2rtcRunning, getGo2rtcApiUrl, startGo2rtc, buildRtspUrl } from '@/lib/streaming/go2rtc'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  const startParam = request.nextUrl.searchParams.get('start')
  try {
    const session = await getSessionFromCookie()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const unifiConfig = await getGlobalUnifiConfig()
    
    let startResult: { success: boolean; error?: string } | null = null
    
    if (startParam === 'true' && unifiConfig && !isGo2rtcRunning()) {
      const controllerUrl = new URL(unifiConfig.controllerUrl)
      const nvrHost = controllerUrl.hostname
      const rtspChannel = unifiConfig.rtspChannel ?? 1
      
      const streams = unifiConfig.cameras.map((cameraId: string) => ({
        cameraId,
        name: cameraId,
        rtspUrl: buildRtspUrl(
          nvrHost,
          cameraId,
          unifiConfig.rtspUsername!,
          unifiConfig.rtspPassword!,
          rtspChannel,
          true
        )
      }))
      
      console.log('[Debug] Starting go2rtc with streams:', streams.map(s => ({ id: s.cameraId, url: s.rtspUrl.replace(/:[^:@]+@/, ':***@') })))
      startResult = await startGo2rtc(streams)
      console.log('[Debug] Start result:', startResult)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    const possiblePaths = [
      path.join(process.cwd(), 'node_modules', 'go2rtc-static', 'dist', 'go2rtc'),
      path.join(process.cwd(), 'node_modules', 'go2rtc-static', 'go2rtc'),
      '/app/node_modules/go2rtc-static/dist/go2rtc',
      '/app/node_modules/go2rtc-static/go2rtc',
    ]
    
    const binaryInfo = possiblePaths.map(p => ({
      path: p,
      exists: fs.existsSync(p),
      executable: fs.existsSync(p) ? checkExecutable(p) : false
    }))
    
    let go2rtcApiStatus = 'not running'
    let streamDetails: Record<string, unknown> = {}
    
    if (isGo2rtcRunning()) {
      try {
        const res = await fetch(`${getGo2rtcApiUrl()}/api/streams`)
        if (res.ok) {
          const streams = await res.json()
          go2rtcApiStatus = `running, ${Object.keys(streams).length} streams configured`
          
          for (const [name, config] of Object.entries(streams as Record<string, { producers?: unknown[], consumers?: unknown[] }>)) {
            streamDetails[name] = {
              configured: true,
              producers: config.producers?.length || 0,
              consumers: config.consumers?.length || 0,
              producerDetails: config.producers || []
            }
          }
        } else {
          go2rtcApiStatus = `running but API error: ${res.status}`
        }
      } catch (e) {
        go2rtcApiStatus = `running but API unreachable: ${e}`
      }
    }

    return NextResponse.json({
      cwd: process.cwd(),
      go2rtcRunning: isGo2rtcRunning(),
      go2rtcApiUrl: getGo2rtcApiUrl(),
      go2rtcApiStatus,
      streamDetails,
      binaryInfo,
      config: {
        hasUnifiConfig: !!unifiConfig,
        controllerUrl: unifiConfig?.controllerUrl || null,
        liveStreamEnabled: unifiConfig?.liveStreamEnabled || false,
        rtspChannel: unifiConfig?.rtspChannel ?? 1,
        hasRtspUsername: !!unifiConfig?.rtspUsername,
        hasRtspPassword: !!unifiConfig?.rtspPassword,
        cameraCount: unifiConfig?.cameras?.length || 0,
        cameras: unifiConfig?.cameras || []
      }
    })
  } catch (error) {
    console.error('[Streaming Debug] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

function checkExecutable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.X_OK)
    return true
  } catch {
    return false
  }
}
