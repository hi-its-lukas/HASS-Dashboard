import https from 'https'

const agent = new https.Agent({
  rejectUnauthorized: false
})

const ACCESS_PORT = 12445

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
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      // @ts-expect-error - agent is valid for Node.js fetch
      agent
    })
    
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Access API error: ${response.status} - ${text}`)
    }
    
    const data = await response.json()
    return data.data || data
  }
  
  async testConnection(): Promise<{ success: boolean; doors: number }> {
    try {
      const doors = await this.getDoors()
      return { success: true, doors: doors.length }
    } catch (error) {
      console.error('[Access] Connection test failed:', error)
      return { success: false, doors: 0 }
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
