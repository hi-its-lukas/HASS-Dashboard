import { Agent } from 'undici'

const dispatcher = new Agent({
  connect: {
    rejectUnauthorized: false
  }
})

const REQUEST_TIMEOUT_MS = 30000
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024

function createAbortSignal(timeoutMs: number = REQUEST_TIMEOUT_MS): AbortSignal {
  return AbortSignal.timeout(timeoutMs)
}

export interface ProtectCamera {
  id: string
  name: string
  type: string
  state: string
  host: string
  mac: string
  modelKey: string
  firmwareVersion: string
  featureFlags: {
    hasSmartDetect: boolean
    hasPackageCamera: boolean
  }
}

export interface ProtectEvent {
  id: string
  type: string
  start: number
  end: number
  score: number
  camera: string
  thumbnail: string
  smartDetectTypes: string[]
  smartDetectObjectTypes: string[]
}

export interface ProtectBootstrap {
  cameras: ProtectCamera[]
  nvr: {
    name: string
    version: string
    host: string
  }
}

export class ProtectClient {
  private baseUrl: string
  private apiKey: string
  
  constructor(controllerUrl: string, apiKey: string) {
    this.baseUrl = controllerUrl.replace(/\/$/, '')
    this.apiKey = apiKey
  }
  
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/proxy/protect/integration/v1${path}`
    
    const response = await fetch(url, {
      ...options,
      signal: createAbortSignal(),
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      },
      // @ts-expect-error - dispatcher is undici's way to configure TLS
      dispatcher
    })
    
    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error')
      if (response.status === 401) {
        throw new Error('401 Unauthorized - API Key ungültig')
      } else if (response.status === 403) {
        throw new Error('403 Forbidden - Keine Berechtigung')
      } else if (response.status === 404) {
        throw new Error('404 Not Found - Integration API nicht verfügbar. Protect Version 5.3+ erforderlich')
      }
      throw new Error(`Protect API error: ${response.status} - ${text.slice(0, 500)}`)
    }
    
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_SIZE) {
      throw new Error('Response too large')
    }
    
    return response.json()
  }
  
  async testConnection(): Promise<{ success: boolean; cameras: number; version?: string; error?: string }> {
    try {
      // First try meta/info endpoint (faster, simpler)
      const info = await this.request<{ applicationVersion?: string }>('/meta/info')
      const cameras = await this.getCameras()
      return { success: true, cameras: cameras.length, version: info.applicationVersion }
    } catch (error) {
      // Extract the real error from error.cause for Node fetch network failures
      const cause = (error as { cause?: { code?: string; message?: string } })?.cause
      const errorCode = cause?.code || ''
      const causeMessage = cause?.message || ''
      const rawMessage = error instanceof Error ? error.message : String(error)
      const fullError = `${rawMessage} ${errorCode} ${causeMessage}`.toLowerCase()
      
      console.error('[Protect] Connection test failed:', { rawMessage, errorCode, causeMessage })
      
      let userMessage: string
      
      if (errorCode === 'ECONNREFUSED' || fullError.includes('econnrefused')) {
        userMessage = 'Verbindung abgelehnt - ist der UniFi Controller erreichbar? URL und Netzwerk prüfen'
      } else if (errorCode === 'ENOTFOUND' || errorCode === 'EAI_AGAIN' || fullError.includes('enotfound')) {
        userMessage = 'Hostname nicht gefunden - DNS-Auflösung fehlgeschlagen. Bei Docker auf Mac: IP-Adresse statt .local verwenden'
      } else if (errorCode === 'ETIMEDOUT' || errorCode === 'ENETUNREACH' || fullError.includes('etimedout')) {
        userMessage = 'Netzwerk nicht erreichbar - Firewall oder Routing prüfen'
      } else if (fullError.includes('cert') || fullError.includes('ssl') || fullError.includes('certificate')) {
        userMessage = 'SSL/Zertifikatsfehler - Self-signed Zertifikate werden akzeptiert, anderes Problem?'
      } else if (fullError.includes('401') || fullError.includes('unauthorized')) {
        userMessage = 'API Key ungültig oder abgelaufen - bitte neuen Key erstellen'
      } else if (fullError.includes('403') || fullError.includes('forbidden')) {
        userMessage = 'Zugriff verweigert - API Key hat nicht die erforderlichen Berechtigungen'
      } else if (fullError.includes('timeout') || fullError.includes('timeouterror') || errorCode === 'UND_ERR_CONNECT_TIMEOUT') {
        userMessage = 'Zeitüberschreitung - UniFi Controller antwortet nicht (30s)'
      } else if (fullError.includes('fetch failed')) {
        userMessage = `Netzwerkfehler - Controller nicht erreichbar (${errorCode || 'unbekannt'})`
      } else {
        userMessage = rawMessage
      }
      
      return { success: false, cameras: 0, error: userMessage }
    }
  }
  
  async getCameras(): Promise<ProtectCamera[]> {
    return this.request<ProtectCamera[]>('/cameras')
  }
  
  async getEvents(start?: number, end?: number, types?: string[]): Promise<ProtectEvent[]> {
    const now = Date.now()
    const params = new URLSearchParams({
      start: String(start || now - 24 * 60 * 60 * 1000),
      end: String(end || now)
    })
    
    if (types && types.length > 0) {
      types.forEach(t => params.append('types[]', t))
    }
    
    return this.request<ProtectEvent[]>(`/events?${params}`)
  }
  
  async getSmartDetections(hours: number = 24): Promise<ProtectEvent[]> {
    const now = Date.now()
    const start = now - hours * 60 * 60 * 1000
    
    return this.request<ProtectEvent[]>(`/events?start=${start}&end=${now}&types[]=smartDetectZone`)
  }
  
  async getThumbnail(eventId: string): Promise<Buffer> {
    const url = `${this.baseUrl}/proxy/protect/integration/v1/events/${eventId}/thumbnail`
    
    const response = await fetch(url, {
      signal: createAbortSignal(),
      headers: {
        'X-API-KEY': this.apiKey
      },
      // @ts-expect-error - dispatcher is undici's way to configure TLS
      dispatcher
    })
    
    if (!response.ok) {
      throw new Error(`Failed to get thumbnail: ${response.status}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }
  
  async getSnapshot(cameraId: string): Promise<Buffer> {
    const url = `${this.baseUrl}/proxy/protect/integration/v1/cameras/${cameraId}/snapshot`
    
    const response = await fetch(url, {
      signal: createAbortSignal(),
      headers: {
        'X-API-KEY': this.apiKey
      },
      // @ts-expect-error - dispatcher is undici's way to configure TLS
      dispatcher
    })
    
    if (!response.ok) {
      throw new Error(`Failed to get snapshot: ${response.status}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }
}
