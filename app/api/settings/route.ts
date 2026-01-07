import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import prisma from '@/lib/db/client'
import { encryptUnifiApiKeys, decryptUnifiApiKeys, UnifiConfig } from '@/lib/unifi/encryption'
import { SettingsRequestSchema, validateRequestSize } from '@/lib/validation/settings'
import { validateUnifiControllerUrl } from '@/lib/validation/unifi-url'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const config = await prisma.dashboardConfig.findUnique({
      where: { userId: session.userId }
    })
    
    if (!config) {
      return NextResponse.json({
        layoutConfig: {
          persons: [],
          rooms: [],
          lights: [],
          covers: [],
          customButtons: []
        },
        sidebarState: 'expanded'
      })
    }
    
    const layoutConfig = JSON.parse(config.layoutConfig)
    
    if (layoutConfig.unifi) {
      const rawUnifi = layoutConfig.unifi as UnifiConfig
      const decrypted = decryptUnifiApiKeys(rawUnifi)
      
      layoutConfig.unifi = {
        controllerUrl: rawUnifi.controllerUrl || '',
        cameras: rawUnifi.cameras || [],
        accessDevices: rawUnifi.accessDevices || [],
        aiSurveillanceEnabled: rawUnifi.aiSurveillanceEnabled ?? true,
        protectApiKey: '',
        accessApiKey: '',
        _hasProtectKey: !!decrypted.protectApiKey,
        _hasAccessKey: !!decrypted.accessApiKey
      }
    }
    
    return NextResponse.json({
      layoutConfig,
      sidebarState: config.sidebarState
    })
  } catch (error) {
    console.error('[API] GET /settings error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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
    
    if (layoutConfig?.unifi?.controllerUrl) {
      const urlValidation = validateUnifiControllerUrl(layoutConfig.unifi.controllerUrl)
      if (!urlValidation.valid) {
        return NextResponse.json({ error: `Invalid UniFi URL: ${urlValidation.error}` }, { status: 400 })
      }
      if (urlValidation.sanitized) {
        layoutConfig.unifi.controllerUrl = urlValidation.sanitized
      }
    }
    
    if (layoutConfig?.unifi) {
      const existingConfig = await prisma.dashboardConfig.findUnique({
        where: { userId: session.userId }
      })
      
      let existingUnifi: UnifiConfig | null = null
      if (existingConfig?.layoutConfig) {
        const parsed = JSON.parse(existingConfig.layoutConfig)
        if (parsed.unifi) {
          existingUnifi = decryptUnifiApiKeys(parsed.unifi as UnifiConfig)
        }
      }
      
      const incomingUnifi = layoutConfig.unifi as UnifiConfig
      
      const isMaskedOrEmpty = (val: string | undefined) => 
        !val || val.includes('••••') || val.trim() === ''
      
      const unifiToSave: UnifiConfig = {
        controllerUrl: incomingUnifi.controllerUrl || '',
        protectApiKey: isMaskedOrEmpty(incomingUnifi.protectApiKey) && existingUnifi?.protectApiKey
          ? existingUnifi.protectApiKey
          : incomingUnifi.protectApiKey || '',
        accessApiKey: isMaskedOrEmpty(incomingUnifi.accessApiKey) && existingUnifi?.accessApiKey
          ? existingUnifi.accessApiKey
          : incomingUnifi.accessApiKey || '',
        cameras: incomingUnifi.cameras || [],
        accessDevices: incomingUnifi.accessDevices || [],
        aiSurveillanceEnabled: incomingUnifi.aiSurveillanceEnabled ?? true
      }
      
      layoutConfig.unifi = encryptUnifiApiKeys(unifiToSave)
    }
    
    await prisma.dashboardConfig.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        layoutConfig: JSON.stringify(layoutConfig || {}),
        sidebarState: sidebarState || 'expanded'
      },
      update: {
        layoutConfig: layoutConfig ? JSON.stringify(layoutConfig) : undefined,
        sidebarState: sidebarState || undefined
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] POST /settings error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
