import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import prisma from '@/lib/db/client'

export const dynamic = 'force-dynamic'

async function getUnifiConfig(userId: string) {
  const config = await prisma.dashboardConfig.findUnique({
    where: { userId }
  })
  
  if (!config?.layoutConfig) return null
  
  const layoutConfig = JSON.parse(config.layoutConfig) as Record<string, unknown>
  return layoutConfig.unifi as {
    controllerUrl?: string
    username?: string
    password?: string
  } | undefined
}

async function authenticateUnifi(controllerUrl: string, username: string, password: string) {
  const baseUrl = controllerUrl.replace(/\/$/, '')
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include'
  })
  
  if (!loginRes.ok) {
    throw new Error('UniFi authentication failed')
  }
  
  return loginRes.headers.get('set-cookie') || ''
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const unifiConfig = await getUnifiConfig(session.userId)
    
    if (!unifiConfig?.controllerUrl || !unifiConfig?.username || !unifiConfig?.password) {
      return NextResponse.json({ error: 'UniFi not configured' }, { status: 400 })
    }
    
    const cookies = await authenticateUnifi(
      unifiConfig.controllerUrl,
      unifiConfig.username,
      unifiConfig.password
    )
    
    if (!cookies) {
      return NextResponse.json({ error: 'UniFi auth failed' }, { status: 500 })
    }
    
    const baseUrl = unifiConfig.controllerUrl.replace(/\/$/, '')
    const thumbnailRes = await fetch(
      `${baseUrl}/proxy/protect/api/events/${eventId}/thumbnail`, 
      {
        headers: {
          'Cookie': cookies,
          'Accept': 'image/*'
        }
      }
    )
    
    if (!thumbnailRes.ok) {
      return NextResponse.json({ error: 'Thumbnail not found' }, { status: 404 })
    }
    
    const imageBuffer = await thumbnailRes.arrayBuffer()
    const contentType = thumbnailRes.headers.get('content-type') || 'image/jpeg'
    
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error) {
    console.error('[UniFi Thumbnail] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
