import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getGlobalUnifiConfig } from '@/lib/config/global-settings'
import { ProtectApi } from 'unifi-protect'

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const config = await getGlobalUnifiConfig()
    if (!config) {
      return NextResponse.json({ error: 'No UniFi config found' }, { status: 400 })
    }

    const results: Record<string, unknown> = {
      hasControllerUrl: !!config.controllerUrl,
      hasApiKey: !!config.protectApiKey,
      hasRtspUsername: !!config.rtspUsername,
      hasRtspPassword: !!config.rtspPassword,
      channel: config.rtspChannel,
      liveStreamEnabled: config.liveStreamEnabled
    }

    if (!config.rtspUsername || !config.rtspPassword) {
      return NextResponse.json({ 
        ...results, 
        error: 'RTSP Username und Password werden für Livestreams benötigt' 
      })
    }

    let host = config.controllerUrl
    host = host.replace(/^https?:\/\//, '').replace(/\/+$/, '')
    results.cleanedHost = host

    const api = new ProtectApi()
    
    try {
      console.log('[Debug] Attempting login to:', host)
      const loginSuccess = await api.login(host, config.rtspUsername, config.rtspPassword)
      results.loginSuccess = loginSuccess
      
      if (!loginSuccess) {
        return NextResponse.json({ ...results, error: 'Login failed' })
      }

      const bootstrapSuccess = await api.getBootstrap()
      results.bootstrapSuccess = bootstrapSuccess
      
      if (bootstrapSuccess && api.bootstrap) {
        results.nvrName = api.bootstrap.nvr?.name
        results.cameraCount = api.bootstrap.cameras?.length ?? 0
        results.cameras = api.bootstrap.cameras?.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          state: c.state,
          isConnected: c.isConnected
        }))
      }

      await api.logout()
      results.logoutSuccess = true

    } catch (apiError) {
      results.apiError = String(apiError)
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('[Debug] Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
