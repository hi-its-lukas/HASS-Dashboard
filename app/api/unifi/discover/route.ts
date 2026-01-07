import { NextRequest, NextResponse } from 'next/server'

interface UnifiCamera {
  id: string
  name: string
  type: string
  state: string
  host: string
}

interface UnifiAccessDevice {
  id: string
  name: string
  type: string
  doorId?: string
}

export async function POST(req: NextRequest) {
  try {
    const { controllerUrl, username, password } = await req.json()
    
    if (!controllerUrl || !username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
    }
    
    const baseUrl = controllerUrl.replace(/\/$/, '')
    
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include'
    })
    
    if (!loginRes.ok) {
      return NextResponse.json({ error: 'Login failed' }, { status: 401 })
    }
    
    const cookies = loginRes.headers.get('set-cookie') || ''
    
    const cameras: UnifiCamera[] = []
    const accessDevices: UnifiAccessDevice[] = []
    
    try {
      const protectRes = await fetch(`${baseUrl}/proxy/protect/api/bootstrap`, {
        headers: { 'Cookie': cookies }
      })
      
      if (protectRes.ok) {
        const protectData = await protectRes.json()
        
        if (protectData.cameras) {
          for (const cam of protectData.cameras) {
            cameras.push({
              id: cam.id,
              name: cam.name || 'Unnamed Camera',
              type: cam.type || 'Unknown',
              state: cam.state || 'UNKNOWN',
              host: cam.host || ''
            })
          }
        }
      }
    } catch (e) {
      console.error('[Unifi Discover] Protect error:', e)
    }
    
    try {
      const accessRes = await fetch(`${baseUrl}/proxy/access/api/v2/device`, {
        headers: { 'Cookie': cookies }
      })
      
      if (accessRes.ok) {
        const accessData = await accessRes.json()
        
        if (Array.isArray(accessData)) {
          for (const device of accessData) {
            if (device.type?.includes('UA-G3') || device.type?.includes('reader') || device.capabilities?.includes('intercom')) {
              accessDevices.push({
                id: device.id || device._id,
                name: device.name || device.alias || 'Unnamed Device',
                type: device.type || 'Unknown',
                doorId: device.door_id
              })
            }
          }
        }
      }
    } catch (e) {
      console.error('[Unifi Discover] Access error:', e)
    }
    
    return NextResponse.json({
      cameras,
      accessDevices
    })
  } catch (error) {
    console.error('[Unifi Discover] Error:', error)
    return NextResponse.json({ error: 'Discovery failed' }, { status: 500 })
  }
}
