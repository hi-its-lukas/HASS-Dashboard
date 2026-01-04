import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import prisma from '@/lib/db/client'
import { getStoredToken } from '@/lib/auth/ha-oauth'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('session')?.value
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'No session' }, { status: 401 })
    }
    
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true }
    })
    
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }
    
    const accessToken = await getStoredToken(session.userId)
    const haUrl = session.user.haInstanceUrl
    
    if (!accessToken || !haUrl) {
      return NextResponse.json({ error: 'No HA credentials' }, { status: 400 })
    }
    
    const results: Record<string, unknown> = {
      dbUser: {
        id: session.user.id,
        haName: session.user.haName,
        haUserId: session.user.haUserId
      }
    }
    
    // Test /api/
    try {
      const apiRes = await fetch(new URL('/api/', haUrl).toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      results.api_root = {
        status: apiRes.status,
        body: apiRes.ok ? await apiRes.json() : await apiRes.text()
      }
    } catch (e) {
      results.api_root = { error: String(e) }
    }
    
    // Test /api/config
    try {
      const configRes = await fetch(new URL('/api/config', haUrl).toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      results.api_config = {
        status: configRes.status,
        body: configRes.ok ? await configRes.json() : await configRes.text()
      }
    } catch (e) {
      results.api_config = { error: String(e) }
    }
    
    return NextResponse.json(results, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
