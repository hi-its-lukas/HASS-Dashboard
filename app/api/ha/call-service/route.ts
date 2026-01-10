import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getGlobalHAConfig } from '@/lib/ha/token'
import { csrfProtection } from '@/lib/auth/csrf'
import { CallServiceSchema, validateBody } from '@/lib/validation/api-schemas'

export async function POST(request: NextRequest) {
  try {
    const csrfError = csrfProtection(request)
    if (csrfError) return csrfError
    
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const haConfig = await getGlobalHAConfig()
    
    if (!haConfig.url || !haConfig.token) {
      return NextResponse.json({ error: 'Home Assistant nicht konfiguriert' }, { status: 400 })
    }
    
    const body = await request.json()
    
    const validation = validateBody(CallServiceSchema, body)
    if (!validation.success) {
      console.warn('[API] /ha/call-service validation failed:', validation.details)
      return NextResponse.json({ error: validation.error, details: validation.details }, { status: 400 })
    }
    
    const { domain, service, entityId, data } = validation.data
    
    const serviceUrl = new URL(`/api/services/${domain}/${service}`, haConfig.url)
    
    const serviceData: Record<string, unknown> = { ...data }
    if (entityId) {
      serviceData.entity_id = entityId
    }
    
    const response = await fetch(serviceUrl.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${haConfig.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(serviceData)
    })
    
    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json({ error: `Service call failed: ${text}` }, { status: response.status })
    }
    
    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[API] /ha/call-service error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
