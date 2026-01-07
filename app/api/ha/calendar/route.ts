import { NextRequest, NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { getGlobalHAConfig } from '@/lib/ha/token'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const haConfig = await getGlobalHAConfig()
    
    if (!haConfig.url || !haConfig.token) {
      return NextResponse.json({ error: 'Home Assistant nicht konfiguriert' }, { status: 400 })
    }
    
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start') || new Date().toISOString()
    const end = searchParams.get('end') || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const entities = searchParams.get('entities')?.split(',') || []
    
    const events: Record<string, Array<{ summary: string; start: string; end: string; allDay?: boolean }>> = {}
    
    for (const entityId of entities) {
      if (!entityId.startsWith('calendar.')) continue
      
      try {
        const url = new URL(`/api/calendars/${entityId}`, haConfig.url)
        url.searchParams.set('start', start)
        url.searchParams.set('end', end)
        
        const response = await fetch(url.toString(), {
          headers: { 'Authorization': `Bearer ${haConfig.token}` }
        })
        
        if (response.ok) {
          const calEvents = await response.json()
          events[entityId] = calEvents.map((e: { summary: string; start: { dateTime?: string; date?: string }; end: { dateTime?: string; date?: string } }) => ({
            summary: e.summary,
            start: e.start.dateTime || e.start.date || '',
            end: e.end.dateTime || e.end.date || '',
            allDay: !e.start.dateTime,
          }))
        }
      } catch (e) {
        console.error(`[Calendar] Failed to fetch ${entityId}:`, e)
      }
    }
    
    return NextResponse.json({ events })
  } catch (error) {
    console.error('[API] /ha/calendar error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
