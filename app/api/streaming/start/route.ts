import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getGlobalUnifiConfig } from '@/lib/config/global-settings'

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
      return NextResponse.json({ 
        error: 'UniFi Protect credentials required for live streaming' 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Live streaming is ready via unifi-protect native API',
      streamingMethod: 'unifi-protect-native'
    })
  } catch (error) {
    console.error('Error starting streaming:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
