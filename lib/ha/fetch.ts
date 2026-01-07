import { getGlobalHAConfig } from './token'

export interface HAFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>
  timeout?: number
}

export interface HAFetchResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  status?: number
}

export async function haFetch<T = unknown>(
  path: string,
  options: HAFetchOptions = {}
): Promise<HAFetchResult<T>> {
  const config = await getGlobalHAConfig()
  
  if (!config.url || !config.token) {
    return {
      success: false,
      error: 'Home Assistant ist nicht konfiguriert',
      status: 503
    }
  }
  
  const url = `${config.url}${path.startsWith('/') ? path : `/${path}`}`
  const timeout = options.timeout || 15000
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      return {
        success: false,
        error: `Home Assistant Fehler: ${response.status}`,
        status: response.status
      }
    }
    
    const contentType = response.headers.get('content-type')
    if (contentType?.includes('application/json')) {
      const data = await response.json() as T
      return { success: true, data, status: response.status }
    }
    
    return { success: true, status: response.status }
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Home Assistant Timeout',
        status: 504
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Verbindungsfehler',
      status: 502
    }
  }
}

export async function haFetchRaw(
  path: string,
  options: HAFetchOptions = {}
): Promise<Response | null> {
  const config = await getGlobalHAConfig()
  
  if (!config.url || !config.token) {
    return null
  }
  
  const url = `${config.url}${path.startsWith('/') ? path : `/${path}`}`
  const timeout = options.timeout || 15000
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${config.token}`,
        ...options.headers
      }
    })
    
    clearTimeout(timeoutId)
    return response
  } catch {
    clearTimeout(timeoutId)
    return null
  }
}

export async function getHAWebSocketUrl(): Promise<{ wsUrl: string; token: string } | null> {
  const config = await getGlobalHAConfig()
  
  if (!config.url || !config.token) {
    return null
  }
  
  const wsUrl = config.url.replace(/^http/, 'ws') + '/api/websocket'
  return { wsUrl, token: config.token }
}
