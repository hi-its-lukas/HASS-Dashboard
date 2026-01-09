import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { csrfProtection } from '@/lib/auth/csrf'
import prisma from '@/lib/db/client'
import { encryptUnifiApiKeys, decryptUnifiApiKeys, UnifiConfig } from '@/lib/unifi/encryption'
import { SettingsRequestSchema, validateRequestSize } from '@/lib/validation/settings'
import { validateUnifiControllerUrl } from '@/lib/validation/unifi-url'
import { getGlobalLayoutConfig, setGlobalLayoutConfig, GlobalLayoutConfig } from '@/lib/config/global-settings'
import { hasPermission } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

interface UserPreferences {
  backgroundUrl?: string
  sidebarState?: string
}

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const globalConfig = await getGlobalLayoutConfig()
    
    const userConfig = await prisma.dashboardConfig.findUnique({
      where: { userId: session.userId }
    })
    
    let userPrefs: UserPreferences = {}
    if (userConfig?.layoutConfig) {
      try {
        const parsed = JSON.parse(userConfig.layoutConfig)
        userPrefs = {
          backgroundUrl: parsed.backgroundUrl
        }
      } catch {
        userPrefs = {}
      }
    }
    
    let layoutConfig: GlobalLayoutConfig & { backgroundUrl?: string } = { ...globalConfig }
    
    if (userPrefs.backgroundUrl) {
      layoutConfig.backgroundUrl = userPrefs.backgroundUrl
    }
    
    if (layoutConfig.unifi) {
      const rawUnifi = layoutConfig.unifi as UnifiConfig
      const decrypted = decryptUnifiApiKeys(rawUnifi)
      
      layoutConfig.unifi = {
        controllerUrl: rawUnifi.controllerUrl || '',
        cameras: rawUnifi.cameras || [],
        accessDevices: rawUnifi.accessDevices?.map(device => ({
          id: device.id,
          name: device.name,
          type: device.type,
          doorId: device.doorId,
          cameraId: device.cameraId
        })) || [],
        aiSurveillanceEnabled: rawUnifi.aiSurveillanceEnabled ?? true,
        liveStreamEnabled: rawUnifi.liveStreamEnabled ?? false,
        rtspUsername: decrypted.rtspUsername || '',
        protectApiKey: '',
        accessApiKey: '',
        rtspPassword: '',
        _hasProtectKey: !!decrypted.protectApiKey,
        _hasAccessKey: !!decrypted.accessApiKey,
        _hasRtspPassword: !!decrypted.rtspPassword
      } as UnifiConfig & { _hasProtectKey: boolean; _hasAccessKey: boolean; _hasRtspPassword: boolean }
    }
    
    const canEditGlobalSettings = await hasPermission(session.userId, 'settings:edit')
    
    return NextResponse.json({
      layoutConfig,
      sidebarState: userConfig?.sidebarState || 'expanded',
      canEditGlobalSettings
    })
  } catch (error) {
    console.error('[API] GET /settings error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const csrfError = csrfProtection(request)
    if (csrfError) return csrfError
    
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const rawBody = await request.text()
    
    if (!validateRequestSize(rawBody)) {
      return NextResponse.json({ error: 'Request body too large (max 100KB)' }, { status: 413 })
    }
    
    let body: unknown
    try {
      body = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    
    const validationResult = SettingsRequestSchema.safeParse(body)
    if (!validationResult.success) {
      console.error('[API] Settings validation failed:', validationResult.error.issues)
      return NextResponse.json({ 
        error: 'Invalid settings format',
        details: validationResult.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
      }, { status: 400 })
    }
    
    let { layoutConfig, sidebarState } = validationResult.data
    
    if (layoutConfig) {
      const { backgroundUrl, ...globalSettings } = layoutConfig as GlobalLayoutConfig & { backgroundUrl?: string }
      
      const canEditSettings = await hasPermission(session.userId, 'settings:edit')
      
      console.log('[API] POST /settings - canEditSettings:', canEditSettings, 'userId:', session.userId, 'globalSettings keys:', Object.keys(globalSettings))
      
      if (canEditSettings && Object.keys(globalSettings).length > 0) {
        if (globalSettings.unifi?.controllerUrl) {
          const urlValidation = validateUnifiControllerUrl(globalSettings.unifi.controllerUrl)
          if (!urlValidation.valid) {
            return NextResponse.json({ error: `Invalid UniFi URL: ${urlValidation.error}` }, { status: 400 })
          }
          if (urlValidation.sanitized) {
            globalSettings.unifi.controllerUrl = urlValidation.sanitized
          }
        }
        
        if (globalSettings.unifi) {
          const existingGlobal = await getGlobalLayoutConfig()
          let existingUnifi: UnifiConfig | null = null
          if (existingGlobal.unifi) {
            existingUnifi = decryptUnifiApiKeys(existingGlobal.unifi as UnifiConfig)
          }
          
          const incomingUnifi = globalSettings.unifi as UnifiConfig
          
          const isMaskedOrEmpty = (val: string | undefined) => 
            !val || val.includes('••••') || val.trim() === ''
          
          const mergedAccessDevices = incomingUnifi.accessDevices?.map(device => {
            const existingDevice = existingUnifi?.accessDevices?.find(d => d.id === device.id)
            return {
              ...device,
              cameraId: device.cameraId ?? existingDevice?.cameraId
            }
          }) || existingUnifi?.accessDevices || []
          
          const unifiToSave: UnifiConfig = {
            controllerUrl: incomingUnifi.controllerUrl || '',
            protectApiKey: isMaskedOrEmpty(incomingUnifi.protectApiKey) && existingUnifi?.protectApiKey
              ? existingUnifi.protectApiKey
              : incomingUnifi.protectApiKey || '',
            accessApiKey: isMaskedOrEmpty(incomingUnifi.accessApiKey) && existingUnifi?.accessApiKey
              ? existingUnifi.accessApiKey
              : incomingUnifi.accessApiKey || '',
            rtspUsername: incomingUnifi.rtspUsername || existingUnifi?.rtspUsername || '',
            rtspPassword: isMaskedOrEmpty(incomingUnifi.rtspPassword) && existingUnifi?.rtspPassword
              ? existingUnifi.rtspPassword
              : incomingUnifi.rtspPassword || '',
            liveStreamEnabled: incomingUnifi.liveStreamEnabled ?? existingUnifi?.liveStreamEnabled ?? false,
            cameras: incomingUnifi.cameras || existingUnifi?.cameras || [],
            accessDevices: mergedAccessDevices,
            aiSurveillanceEnabled: incomingUnifi.aiSurveillanceEnabled ?? existingUnifi?.aiSurveillanceEnabled ?? true
          }
          
          globalSettings.unifi = encryptUnifiApiKeys(unifiToSave)
        }
        
        const existingGlobal = await getGlobalLayoutConfig()
        const mergedGlobal = { ...existingGlobal, ...globalSettings }
        await setGlobalLayoutConfig(mergedGlobal)
      }
      
      if (backgroundUrl !== undefined || sidebarState) {
        const userPrefs = { backgroundUrl }
        
        await prisma.dashboardConfig.upsert({
          where: { userId: session.userId },
          create: {
            userId: session.userId,
            layoutConfig: JSON.stringify(userPrefs),
            sidebarState: sidebarState || 'expanded'
          },
          update: {
            layoutConfig: JSON.stringify(userPrefs),
            sidebarState: sidebarState || undefined
          }
        })
      }
    } else if (sidebarState) {
      await prisma.dashboardConfig.upsert({
        where: { userId: session.userId },
        create: {
          userId: session.userId,
          layoutConfig: JSON.stringify({}),
          sidebarState
        },
        update: {
          sidebarState
        }
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] POST /settings error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
