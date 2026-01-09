import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getGlobalUnifiConfig } from '@/lib/config/global-settings'

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await getGlobalUnifiConfig()
    if (!config) {
      return NextResponse.json({ error: 'No UniFi config found', configured: false })
    }

    let host = config.controllerUrl || ''
    const cleanedHost = host.replace(/^https?:\/\//, '').replace(/\/+$/, '')

    const wsProxyPort = process.env.WS_PROXY_PORT || '6000'
    let wsProxyStatus: Record<string, unknown> = { error: 'Could not reach WS Proxy' }
    
    try {
      const wsProxyResponse = await fetch(`http://127.0.0.1:${wsProxyPort}/debug/protect-test`, {
        signal: AbortSignal.timeout(5000)
      })
      if (wsProxyResponse.ok) {
        wsProxyStatus = await wsProxyResponse.json()
      }
    } catch (err) {
      wsProxyStatus = { error: String(err) }
    }

    return NextResponse.json({
      configured: true,
      controllerUrl: config.controllerUrl ? '***configured***' : null,
      cleanedHost: cleanedHost ? `${cleanedHost.substring(0, 10)}...` : null,
      hasProtectApiKey: !!config.protectApiKey,
      hasRtspUsername: !!config.rtspUsername,
      hasRtspPassword: !!config.rtspPassword,
      rtspChannel: config.rtspChannel,
      liveStreamEnabled: config.liveStreamEnabled,
      cameraCount: config.cameras?.length ?? 0,
      wsProxyStatus
    })
  } catch (error) {
    console.error('[Debug] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
