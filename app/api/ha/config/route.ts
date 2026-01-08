import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { csrfProtection } from '@/lib/auth/csrf'
import { getGlobalHAConfig, setGlobalHAToken, setGlobalHAUrl, testHAConnection } from '@/lib/ha/token'
import { hasPermission } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const config = await getGlobalHAConfig()
    
    return NextResponse.json({
      url: config.url || '',
      hasToken: !!config.token
    })
  } catch (error) {
    console.error('[API] GET /ha/config error:', error)
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
    
    const canEditHA = await hasPermission(session.userId, 'settings:ha')
    if (!canEditHA) {
      return NextResponse.json({ error: 'Nur Administratoren können die Home Assistant-Verbindung konfigurieren' }, { status: 403 })
    }
    
    const body = await request.json()
    const { url, token, testOnly } = body
    
    if (!url) {
      return NextResponse.json({ error: 'URL ist erforderlich' }, { status: 400 })
    }
    
    const testToken = token || (await getGlobalHAConfig()).token
    
    if (!testToken) {
      return NextResponse.json({ error: 'Token ist erforderlich' }, { status: 400 })
    }
    
    const testResult = await testHAConnection(url, testToken)
    
    if (!testResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: testResult.message 
      }, { status: 400 })
    }
    
    if (testOnly) {
      return NextResponse.json({ 
        success: true, 
        message: 'Verbindung erfolgreich',
        version: testResult.version
      })
    }
    
    await setGlobalHAUrl(url)
    
    if (token && token.trim() !== '') {
      await setGlobalHAToken(token)
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Konfiguration gespeichert',
      version: testResult.version
    })
  } catch (error) {
    console.error('[API] POST /ha/config error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
