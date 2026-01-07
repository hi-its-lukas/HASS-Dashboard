import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { controllerUrl, username, password } = await req.json()
    
    if (!controllerUrl || !username || !password) {
      return NextResponse.json({ success: false, error: 'Missing credentials' }, { status: 400 })
    }
    
    const baseUrl = controllerUrl.replace(/\/$/, '')
    
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include'
    })
    
    if (!loginRes.ok) {
      return NextResponse.json({ 
        success: false, 
        error: 'Login fehlgeschlagen. Bitte Zugangsdaten prüfen.' 
      })
    }
    
    const cookies = loginRes.headers.get('set-cookie') || ''
    
    const [protectRes, accessRes] = await Promise.all([
      fetch(`${baseUrl}/proxy/protect/api/bootstrap`, {
        headers: { 'Cookie': cookies }
      }).catch(() => null),
      fetch(`${baseUrl}/proxy/access/api/v2/device`, {
        headers: { 'Cookie': cookies }
      }).catch(() => null)
    ])
    
    let cameras = 0
    let accessDevices = 0
    
    if (protectRes?.ok) {
      const protectData = await protectRes.json()
      cameras = protectData.cameras?.length || 0
    }
    
    if (accessRes?.ok) {
      const accessData = await accessRes.json()
      accessDevices = Array.isArray(accessData) ? accessData.length : 0
    }
    
    return NextResponse.json({
      success: true,
      cameras,
      accessDevices
    })
  } catch (error) {
    console.error('[Unifi Test] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Verbindung fehlgeschlagen. Ist der Controller erreichbar?' 
    })
  }
}
