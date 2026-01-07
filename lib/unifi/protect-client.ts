import https from 'https'

const agent = new https.Agent({
  rejectUnauthorized: false
})

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
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      },
      // @ts-expect-error - agent is valid for Node.js fetch
      agent
    })
    
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Protect API error: ${response.status} - ${text}`)
    }
    
    return response.json()
  }
  
  async testConnection(): Promise<{ success: boolean; cameras: number; version?: string }> {
    try {
      const cameras = await this.getCameras()
      return { success: true, cameras: cameras.length }
    } catch (error) {
      console.error('[Protect] Connection test failed:', error)
      return { success: false, cameras: 0 }
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
      headers: {
        'X-API-KEY': this.apiKey
      },
      // @ts-expect-error - agent is valid for Node.js fetch
      agent
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
      headers: {
        'X-API-KEY': this.apiKey
      },
      // @ts-expect-error - agent is valid for Node.js fetch
      agent
    })
    
    if (!response.ok) {
      throw new Error(`Failed to get snapshot: ${response.status}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }
}
