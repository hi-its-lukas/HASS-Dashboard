import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { host, username, password } = await request.json()
    
    if (!host || !username || !password) {
      return NextResponse.json({ error: 'Host, Benutzername und Passwort erforderlich' }, { status: 400 })
    }
    
    const { ProtectApi } = await import('unifi-protect')
    const api = new ProtectApi()
    
    const cleanHost = host.replace(/^https?:\/\//, '').replace(/\/+$/, '')
    
    const loginSuccess = await api.login(cleanHost, username, password)
    
    if (!loginSuccess) {
      return NextResponse.json({ error: 'Login fehlgeschlagen' }, { status: 401 })
    }
    
    const bootstrapSuccess = await api.getBootstrap()
    
    if (!bootstrapSuccess) {
      return NextResponse.json({ error: 'Bootstrap fehlgeschlagen' }, { status: 500 })
    }
    
    const cameras = api.bootstrap?.cameras?.length || 0
    
    return NextResponse.json({ 
      success: true,
      cameras,
      nvr: api.bootstrap?.nvr?.name || 'UniFi Protect'
    })
  } catch (error) {
    console.error('[Setup] UniFi test error:', error)
    return NextResponse.json({ error: 'Verbindung fehlgeschlagen' }, { status: 500 })
  }
}
