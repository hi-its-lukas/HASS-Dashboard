interface CacheEntry<T> {
  value: T
  expiresAt: number
}

class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private ttlMs: number

  constructor(ttlSeconds: number = 60) {
    this.ttlMs = ttlSeconds * 1000
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return undefined
    }
    
    return entry.value
  }

  set(key: string, value: T): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs
    })
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  invalidateAll(): void {
    this.cache.clear()
  }

  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key)
      }
    }
  }
}

export const permissionsCache = new SimpleCache<string[]>(120)

export const globalConfigCache = new SimpleCache<Record<string, unknown>>(60)

export function invalidateUserPermissions(userId: string): void {
  permissionsCache.delete(`perms:${userId}`)
  console.log('[Cache] Invalidated permissions for user:', userId)
}

export function invalidateAllPermissions(): void {
  permissionsCache.invalidateAll()
  console.log('[Cache] Invalidated all permissions')
}

export function invalidateGlobalConfig(): void {
  globalConfigCache.invalidateAll()
  console.log('[Cache] Invalidated global config')
}
