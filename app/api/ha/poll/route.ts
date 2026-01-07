import { NextResponse } from 'next/server'
import { getSessionFromCookie } from '@/lib/auth/session'
import { haFetch } from '@/lib/ha/fetch'

export const dynamic = 'force-dynamic'

interface HAState {
  entity_id: string
  state: string
  attributes: Record<string, unknown>
  last_changed: string
  last_updated: string
}

let cachedStates: HAState[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 2000

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const now = Date.now()
    if (cachedStates && now - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json({ states: cachedStates, cached: true })
    }
    
    const result = await haFetch<HAState[]>('/api/states')
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status || 502 })
    }
    
    cachedStates = result.data || []
    cacheTimestamp = now
    
    return NextResponse.json({ states: cachedStates, cached: false })
  } catch (error) {
    console.error('[API] Poll error:', error)
    return NextResponse.json({ error: 'Poll failed' }, { status: 500 })
  }
}
