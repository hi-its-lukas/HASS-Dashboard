import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { url, token } = await request.json()
    
    if (!url || !token) {
      return NextResponse.json({ error: 'URL und Token erforderlich' }, { status: 400 })
    }
    
    const haUrl = url.replace(/\/$/, '')
    const response = await fetch(`${haUrl}/api/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json({ error: 'Ungültiger Token' }, { status: 401 })
      }
      return NextResponse.json({ error: `HTTP ${response.status}` }, { status: response.status })
    }
    
    const data = await response.json()
    
    return NextResponse.json({ 
      success: true,
      locationName: data.location_name || 'Home Assistant',
      version: data.version
    })
  } catch (error) {
    console.error('[Setup] HA test error:', error)
    return NextResponse.json({ error: 'Verbindung fehlgeschlagen' }, { status: 500 })
  }
}
