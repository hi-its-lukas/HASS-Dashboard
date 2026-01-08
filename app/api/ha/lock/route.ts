import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/permissions'
import { getGlobalHAConfig } from '@/lib/ha/token'
import { csrfProtection } from '@/lib/auth/csrf'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const csrfError = csrfProtection(request)
    if (csrfError) return csrfError
    
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const canControlLocks = await hasPermission(session.userId, 'action:locks')
    if (!canControlLocks) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }
    
    const haConfig = await getGlobalHAConfig()
    if (!haConfig.url || !haConfig.token) {
      return NextResponse.json({ error: 'Home Assistant nicht konfiguriert' }, { status: 400 })
    }
    
    const { entityId, action } = await request.json()
    
    if (!entityId || !entityId.startsWith('lock.')) {
      return NextResponse.json({ error: 'Ungültige Entity-ID' }, { status: 400 })
    }
    
    if (!['lock', 'unlock'].includes(action)) {
      return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 })
    }
    
    const serviceUrl = new URL(`/api/services/lock/${action}`, haConfig.url)
    
    const response = await fetch(serviceUrl.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${haConfig.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ entity_id: entityId })
    })
    
    if (!response.ok) {
      const text = await response.text()
      return NextResponse.json({ error: `Fehler: ${text}` }, { status: response.status })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[HA Lock] Error:', error)
    return NextResponse.json(
      { error: 'Fehler bei der Schloss-Steuerung' },
      { status: 500 }
    )
  }
}
