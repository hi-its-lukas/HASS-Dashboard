import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getGlobalUnifiConfig } from '@/lib/config/global-settings'
import { isGo2rtcRunning, getGo2rtcApiUrl } from '@/lib/streaming/go2rtc'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const unifiConfig = await getGlobalUnifiConfig()
    
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
    if (isGo2rtcRunning()) {
      try {
        const res = await fetch(`${getGo2rtcApiUrl()}/api/streams`)
        if (res.ok) {
          const streams = await res.json()
          go2rtcApiStatus = `running, ${Object.keys(streams).length} streams configured`
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
