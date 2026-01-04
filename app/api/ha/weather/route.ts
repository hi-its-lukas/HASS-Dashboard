import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getStoredToken } from '@/lib/auth/ha-oauth'
import prisma from '@/lib/db/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    })
    
    if (!user?.haInstanceUrl) {
      return NextResponse.json({ error: 'No Home Assistant instance configured' }, { status: 400 })
    }
    
    const token = await getStoredToken(session.userId)
    
    if (!token) {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 })
    }
    
    const entityId = request.nextUrl.searchParams.get('entity_id')
    
    if (!entityId) {
      return NextResponse.json({ error: 'entity_id required' }, { status: 400 })
    }
    
    const response = await fetch(`${user.haInstanceUrl}/api/services/weather/get_forecasts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'daily',
        entity_id: entityId,
      }),
    })
    
    if (!response.ok) {
      const stateResponse = await fetch(`${user.haInstanceUrl}/api/states/${entityId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (stateResponse.ok) {
        const stateData = await stateResponse.json()
        if (stateData.attributes?.forecast) {
          return NextResponse.json({ forecast: stateData.attributes.forecast })
        }
      }
      
      return NextResponse.json({ forecast: [] })
    }
    
    const data = await response.json()
    
    const forecast = data[entityId]?.forecast || data.forecast || []
    
    return NextResponse.json({ forecast })
  } catch (error) {
    console.error('[API] GET /ha/weather error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
