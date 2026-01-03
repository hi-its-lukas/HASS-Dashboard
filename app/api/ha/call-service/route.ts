import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getStoredToken } from '@/lib/auth/ha-oauth'
import prisma from '@/lib/db/client'

export async function POST(request: NextRequest) {
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
    
    const body = await request.json()
    const { domain, service, entityId, data } = body
    
    if (!domain || !service) {
      return NextResponse.json({ error: 'Domain and service are required' }, { status: 400 })
    }
    
    const serviceUrl = new URL(`/api/services/${domain}/${service}`, user.haInstanceUrl)
    
    const serviceData: Record<string, unknown> = { ...data }
    if (entityId) {
      serviceData.entity_id = entityId
    }
    
    const response = await fetch(serviceUrl.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
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
