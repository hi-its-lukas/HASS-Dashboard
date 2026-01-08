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

interface RegistryCache {
  areas: unknown[]
  devices: unknown[]
  entities: unknown[]
  timestamp: number
}

let cachedStates: HAState[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 2000

let registryCache: RegistryCache | null = null
const REGISTRY_CACHE_TTL = 60000

export async function GET(request: Request) {
  try {
    const session = await getSessionFromCookie()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const includeRegistries = searchParams.get('registries') === 'true'
    
    const now = Date.now()
    
    let states = cachedStates
    let statesCached = true
    if (!cachedStates || now - cacheTimestamp >= CACHE_TTL) {
      const result = await haFetch<HAState[]>('/api/states')
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.status || 502 })
      }
      cachedStates = result.data || []
      cacheTimestamp = now
      states = cachedStates
      statesCached = false
    }
    
    const response: Record<string, unknown> = { states, cached: statesCached }
    
    if (includeRegistries) {
      if (!registryCache || now - registryCache.timestamp >= REGISTRY_CACHE_TTL) {
        const [areasRes, devicesRes, entitiesRes] = await Promise.all([
          haFetch<unknown[]>('/api/config/area_registry/list', { method: 'GET' }).catch(() => ({ success: false, data: [] })),
          haFetch<unknown[]>('/api/config/device_registry/list', { method: 'GET' }).catch(() => ({ success: false, data: [] })),
          haFetch<unknown[]>('/api/config/entity_registry/list', { method: 'GET' }).catch(() => ({ success: false, data: [] })),
        ])
        
        registryCache = {
          areas: areasRes.success ? areasRes.data || [] : [],
          devices: devicesRes.success ? devicesRes.data || [] : [],
          entities: entitiesRes.success ? entitiesRes.data || [] : [],
          timestamp: now
        }
      }
      
      response.areas = registryCache.areas
      response.devices = registryCache.devices
      response.entityRegistry = registryCache.entities
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('[API] Poll error:', error)
    return NextResponse.json({ error: 'Poll failed' }, { status: 500 })
  }
}
