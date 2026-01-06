// Home Assistant WebSocket Client

import { 
  HAState, 
  HAMessage, 
  HAServiceCall, 
  HAIncomingMessage,
  HAArea,
  HADevice,
  HAEntityRegistryEntry,
  HAStateChangedEventData,
  HAEvent,
  HAResultMessage,
  HAEventMessage
} from './types'

type StateChangeCallback = (entityId: string, newState: HAState, oldState: HAState | null) => void
type EventCallback<T = Record<string, unknown>> = (data: T, rawEvent: HAEvent<T>) => void

type ConnectResolve = () => void
type ConnectReject = (reason: Error) => void

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timeoutId: NodeJS.Timeout
}

export class HAWebSocketClient {
  private ws: WebSocket | null = null
  private messageId = 1
  private pendingRequests = new Map<number, PendingRequest>()
  private stateChangeCallbacks: StateChangeCallback[] = []
  private eventCallbacks = new Map<string, Set<EventCallback<Record<string, unknown>>>>()
  private subscribedEventTypes = new Set<string>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  private reconnectTimeout: NodeJS.Timeout | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private isAuthenticated = false
  private isDisconnecting = false
  private url: string
  private getToken: () => Promise<string>

  constructor(url: string, getToken: () => Promise<string>) {
    this.url = url
    this.getToken = getToken
  }

  async connect(): Promise<void> {
    this.isDisconnecting = false
    
    return new Promise<void>((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)

        this.ws.onopen = () => {
          console.log('[HA WS] Connected')
          this.reconnectAttempts = 0
          this.startHeartbeat()
        }

        this.ws.onmessage = async (event) => {
          try {
            const message: HAIncomingMessage = JSON.parse(event.data)
            await this.handleMessage(message, resolve, reject)
          } catch (err) {
            console.error('[HA WS] Failed to parse message:', err)
          }
        }

        this.ws.onerror = (error) => {
          console.error('[HA WS] Error:', error)
          reject(new Error('WebSocket connection error'))
        }

        this.ws.onclose = (event) => {
          console.log('[HA WS] Disconnected:', event.code, event.reason)
          this.isAuthenticated = false
          this.stopHeartbeat()
          
          if (!this.isDisconnecting) {
            this.handleReconnect()
          }
        }
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Connection failed'))
      }
    })
  }

  private async handleMessage(
    message: HAIncomingMessage,
    connectResolve?: ConnectResolve,
    connectReject?: ConnectReject
  ): Promise<void> {
    switch (message.type) {
      case 'auth_required': {
        try {
          const token = await this.getToken()
          this.send({ type: 'auth', access_token: token })
        } catch (err) {
          console.error('[HA WS] Failed to get token:', err)
          connectReject?.(err instanceof Error ? err : new Error('Token retrieval failed'))
        }
        break
      }

      case 'auth_ok': {
        console.log('[HA WS] Authenticated')
        this.isAuthenticated = true
        
        const previouslySubscribed = Array.from(this.subscribedEventTypes)
        this.subscribedEventTypes.clear()
        
        for (const eventType of previouslySubscribed) {
          this.subscribeToEvents(eventType).catch(err => {
            console.error(`[HA WS] Failed to re-subscribe to ${eventType}:`, err)
          })
        }
        connectResolve?.()
        break
      }

      case 'auth_invalid': {
        const authInvalidMsg = message as { type: 'auth_invalid'; message?: string }
        const errorMsg = authInvalidMsg.message || 'Authentication failed'
        console.error('[HA WS] Authentication failed:', errorMsg)
        this.isAuthenticated = false
        connectReject?.(new Error(`Authentication failed: ${errorMsg}`))
        break
      }

      case 'result': {
        const resultMsg = message as HAResultMessage
        const pending = this.pendingRequests.get(resultMsg.id)
        if (pending) {
          clearTimeout(pending.timeoutId)
          if (resultMsg.success) {
            pending.resolve(resultMsg.result)
          } else {
            const errorMessage = resultMsg.error?.message || 'Unknown error'
            const errorCode = resultMsg.error?.code || 'UNKNOWN'
            pending.reject(new Error(`[${errorCode}] ${errorMessage}`))
          }
          this.pendingRequests.delete(resultMsg.id)
        }
        break
      }

      case 'event': {
        const eventMsg = message as HAEventMessage
        const event = eventMsg.event
        const eventType = event.event_type
        
        if (eventType === 'state_changed') {
          const data = event.data as unknown as HAStateChangedEventData
          if (data.entity_id && data.new_state) {
            this.stateChangeCallbacks.forEach((cb) => {
              try {
                cb(data.entity_id, data.new_state!, data.old_state)
              } catch (err) {
                console.error('[HA WS] State change callback error:', err)
              }
            })
          }
        } else if (eventType) {
          const callbacks = this.eventCallbacks.get(eventType)
          if (callbacks) {
            callbacks.forEach((cb) => {
              try {
                cb(event.data as Record<string, unknown>, event as HAEvent<Record<string, unknown>>)
              } catch (err) {
                console.error(`[HA WS] Event callback error for ${eventType}:`, err)
              }
            })
          }
        }
        break
      }

      case 'pong':
        break
    }
  }

  private send(message: HAMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('[HA WS] Cannot send message - WebSocket not open')
    }
  }

  private sendCommand<T>(command: HAMessage, timeoutMs = 30000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'))
        return
      }

      const id = this.messageId++
      
      const timeoutId = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error(`Request timeout after ${timeoutMs}ms`))
        }
      }, timeoutMs)

      this.pendingRequests.set(id, {
        resolve: (value: unknown) => resolve(value as T),
        reject,
        timeoutId
      })
      
      this.send({ ...command, id })
    })
  }

  async getStates(): Promise<HAState[]> {
    return this.sendCommand<HAState[]>({ type: 'get_states' })
  }

  async subscribeToStateChanges(): Promise<void> {
    await this.sendCommand({
      type: 'subscribe_events',
      event_type: 'state_changed',
    })
  }

  async callService(call: HAServiceCall): Promise<void> {
    await this.sendCommand({
      type: 'call_service',
      domain: call.domain,
      service: call.service,
      service_data: call.serviceData,
      target: call.target,
    })
  }

  async getAreaRegistry(): Promise<HAArea[]> {
    return this.sendCommand<HAArea[]>({ type: 'config/area_registry/list' })
  }

  async getDeviceRegistry(): Promise<HADevice[]> {
    return this.sendCommand<HADevice[]>({ type: 'config/device_registry/list' })
  }

  async getEntityRegistry(): Promise<HAEntityRegistryEntry[]> {
    return this.sendCommand<HAEntityRegistryEntry[]>({ type: 'config/entity_registry/list' })
  }

  onStateChange(callback: StateChangeCallback): () => void {
    this.stateChangeCallbacks.push(callback)
    return () => {
      this.stateChangeCallbacks = this.stateChangeCallbacks.filter((cb) => cb !== callback)
    }
  }

  async subscribeToEvents(eventType: string): Promise<void> {
    if (this.subscribedEventTypes.has(eventType)) {
      return
    }
    await this.sendCommand({
      type: 'subscribe_events',
      event_type: eventType,
    })
    this.subscribedEventTypes.add(eventType)
  }

  onEvent<T extends Record<string, unknown> = Record<string, unknown>>(
    eventType: string, 
    callback: EventCallback<T>
  ): () => void {
    if (!this.eventCallbacks.has(eventType)) {
      this.eventCallbacks.set(eventType, new Set())
    }
    const callbacks = this.eventCallbacks.get(eventType)!
    callbacks.add(callback as EventCallback<Record<string, unknown>>)
    
    return () => {
      callbacks.delete(callback as EventCallback<Record<string, unknown>>)
      if (callbacks.size === 0) {
        this.eventCallbacks.delete(eventType)
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' })
      }
    }, 30000)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  private handleReconnect(): void {
    if (this.isDisconnecting) {
      return
    }
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
      console.log(`[HA WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
      
      this.clearReconnectTimeout()
      this.reconnectTimeout = setTimeout(() => {
        if (!this.isDisconnecting) {
          this.connect().catch(err => {
            console.error('[HA WS] Reconnection failed:', err)
          })
        }
      }, delay)
    } else {
      console.error('[HA WS] Max reconnection attempts reached')
    }
  }

  disconnect(): void {
    this.isDisconnecting = true
    
    this.stopHeartbeat()
    this.clearReconnectTimeout()
    
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeoutId)
      pending.reject(new Error('Connection closed'))
    }
    this.pendingRequests.clear()
    
    this.stateChangeCallbacks = []
    this.eventCallbacks.clear()
    this.subscribedEventTypes.clear()
    
    if (this.ws) {
      this.ws.onopen = null
      this.ws.onmessage = null
      this.ws.onerror = null
      this.ws.onclose = null
      
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Client disconnect')
      }
      this.ws = null
    }
    
    this.isAuthenticated = false
    this.reconnectAttempts = 0
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated
  }
}

export type { HAArea, HADevice, HAEntityRegistryEntry }
