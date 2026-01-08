import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getGlobalLayoutConfig } from '@/lib/config/global-settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ connected: false }, { status: 401 })
    }
    
    const layoutConfig = await getGlobalLayoutConfig()
    const unifiConfig = layoutConfig.unifi
    
    if (!unifiConfig?.controllerUrl) {
      return NextResponse.json({ connected: false })
    }
    
    const hasProtectKey = !!(unifiConfig.protectApiKey && !unifiConfig.protectApiKey.includes('••••'))
    const hasAccessKey = !!(unifiConfig.accessApiKey && !unifiConfig.accessApiKey.includes('••••'))
    
    return NextResponse.json({
      connected: hasProtectKey || hasAccessKey,
      cameras: (unifiConfig.cameras || []).length,
      accessDevices: (unifiConfig.accessDevices || []).length
    })
  } catch (error) {
    console.error('[Unifi Status] Error:', error)
    return NextResponse.json({ connected: false, error: 'Failed to check status' })
  }
}
