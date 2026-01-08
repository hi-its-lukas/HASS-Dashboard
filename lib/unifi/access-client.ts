import https from 'https'

const agent = new https.Agent({
  rejectUnauthorized: false
})

const ACCESS_PORT = 12445
const REQUEST_TIMEOUT_MS = 30000
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024

function createAbortSignal(timeoutMs: number = REQUEST_TIMEOUT_MS): AbortSignal {
  return AbortSignal.timeout(timeoutMs)
}

export interface AccessDoor {
  unique_id: string
  name: string
  door_position_status: string
  door_lock_relay_status: string
  type: string
}

export interface AccessDevice {
  unique_id: string
  name: string
  device_type: string
  connected_uah_id: string
  adoption_status: string
  version: string
}

export interface AccessEvent {
  unique_id: string
  type: string
  actor_id: string
  actor_type: string
  actor_display_name: string
  door_id: string
  door_name: string
  event_type: string
  datetime: string
}

export interface AccessUser {
  id: string
  first_name: string
  last_name: string
  status: string
  employee_number: string
}

export class AccessClient {
  private baseUrl: string
  private apiKey: string
  
  constructor(controllerUrl: string, apiKey: string) {
    const url = new URL(controllerUrl.replace(/\/$/, ''))
    this.baseUrl = `https://${url.hostname}:${ACCESS_PORT}`
    this.apiKey = apiKey
  }
  
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api/v1${path}`
    
    const response = await fetch(url, {
      ...options,
      signal: createAbortSignal(),
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      // @ts-expect-error - agent is valid for Node.js fetch
      agent
    })
    
    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      if (response.status === 401) {
        throw new Error('401 Unauthorized - API Key ungültig')
      } else if (response.status === 403) {
        throw new Error('403 Forbidden - Keine Berechtigung')
      } else if (response.status === 404) {
        throw new Error('404 Not Found - Access API nicht verfügbar')
      }
      throw new Error(`Access API error: ${response.status} - ${text.slice(0, 500)}`)
    }
    
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
      throw new Error('Response too large')
    }
    
    const data = await response.json()
    return data.data || data
  }
  
  async testConnection(): Promise<{ success: boolean; doors: number; error?: string }> {
    try {
      const doors = await this.getDoors()
      return { success: true, doors: doors.length }
    } catch (error) {
      // Extract the real error from error.cause for Node fetch network failures
      const cause = (error as { cause?: { code?: string; message?: string } })?.cause
      const errorCode = cause?.code || ''
      const causeMessage = cause?.message || ''
      const rawMessage = error instanceof Error ? error.message : String(error)
      const fullError = `${rawMessage} ${errorCode} ${causeMessage}`.toLowerCase()
      
      console.error('[Access] Connection test failed:', { rawMessage, errorCode, causeMessage })
      
      let userMessage: string
      
      if (errorCode === 'ECONNREFUSED' || fullError.includes('econnrefused')) {
        userMessage = 'Verbindung abgelehnt - ist UniFi Access auf Port 12445 erreichbar?'
      } else if (errorCode === 'ENOTFOUND' || errorCode === 'EAI_AGAIN' || fullError.includes('enotfound')) {
        userMessage = 'Hostname nicht gefunden - Bei Docker auf Mac: IP-Adresse verwenden'
      } else if (errorCode === 'ETIMEDOUT' || errorCode === 'ENETUNREACH' || fullError.includes('etimedout')) {
        userMessage = 'Netzwerk nicht erreichbar - Firewall oder Routing prüfen'
      } else if (fullError.includes('401') || fullError.includes('unauthorized')) {
        userMessage = 'API Key ungültig oder abgelaufen'
      } else if (fullError.includes('403') || fullError.includes('forbidden')) {
        userMessage = 'Zugriff verweigert - API Key Berechtigungen prüfen'
      } else if (fullError.includes('timeout') || fullError.includes('timeouterror') || errorCode === 'UND_ERR_CONNECT_TIMEOUT') {
        userMessage = 'Zeitüberschreitung - UniFi Access antwortet nicht'
      } else if (fullError.includes('fetch failed')) {
        userMessage = `Netzwerkfehler - Access nicht erreichbar (${errorCode || 'unbekannt'})`
      } else {
        userMessage = rawMessage
      }
      
      return { success: false, doors: 0, error: userMessage }
    }
  }
  
  async getDoors(): Promise<AccessDoor[]> {
    return this.request<AccessDoor[]>('/developer/doors')
  }
  
  async getDevices(): Promise<AccessDevice[]> {
    return this.request<AccessDevice[]>('/developer/devices')
  }
  
  async unlockDoor(doorId: string): Promise<void> {
    await this.request(`/developer/doors/${doorId}/unlock`, {
      method: 'PUT'
    })
  }
  
  async getEvents(page: number = 1, pageSize: number = 25): Promise<AccessEvent[]> {
    return this.request<AccessEvent[]>(`/developer/system/logs?page_num=${page}&page_size=${pageSize}`)
  }
  
  async getUsers(): Promise<AccessUser[]> {
    return this.request<AccessUser[]>('/developer/users')
  }
}
