// Home Assistant WebSocket Client

import { HAState, HAMessage, HAServiceCall, HAIncomingMessage } from './types'

type StateChangeCallback = (entityId: string, newState: HAState, oldState: HAState | null) => void

// Connection resolve/reject - für Promise<void>
type ConnectResolve = () => void
type ConnectReject = (reason: Error) => void

// Generic request resolve/reject - für Promise<T> mit beliebigem Rückgabewert
type RequestResolve = (value: unknown) => void
type RequestReject = (reason: Error) => void

export class HAWebSocketClient {
  private ws: WebSocket | null = null
  private messageId = 1
  private pendingRequests = new Map<number, { resolve: RequestResolve; reject: RequestReject }>()
  private stateChangeCallbacks: StateChangeCallback[] = []
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  private heartbeatInterval: NodeJS.Timeout | null = null
  private isAuthenticated = false
  private url: string
  private getToken: () => Promise<string>

  constructor(url: string, getToken: () => Promise<string>) {
    this.url = url
    this.getToken = getToken
  }

  async connect(): Promise<void> {
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
          reject(new Error('WebSocket error'))
        }

        this.ws.onclose = () => {
          console.log('[HA WS] Disconnected')
          this.isAuthenticated = false
          this.stopHeartbeat()
          this.handleReconnect()
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
  ) {
    if ('type' in message) {
      switch (message.type) {
        case 'auth_required':
          const token = await this.getToken()
          this.send({ type: 'auth', access_token: token })
          break

        case 'auth_ok':
          console.log('[HA WS] Authenticated')
          this.isAuthenticated = true
          connectResolve?.()
          break

        case 'auth_invalid':
          console.error('[HA WS] Authentication failed')
          this.isAuthenticated = false
          connectReject?.(new Error('Authentication failed'))
          break

        case 'result':
          const resultMsg = message as { id: number; success: boolean; result?: unknown; error?: { message?: string } }
          const pending = this.pendingRequests.get(resultMsg.id)
          if (pending) {
            if (resultMsg.success) {
              pending.resolve(resultMsg.result)
            } else {
              pending.reject(new Error(resultMsg.error?.message || 'Unknown error'))
            }
            this.pendingRequests.delete(resultMsg.id)
          }
          break

        case 'event':
          const eventMsg = message as { event: { data: { entity_id?: string; new_state?: HAState; old_state?: HAState } } }
          const { entity_id, new_state, old_state } = eventMsg.event.data
          if (entity_id && new_state) {
            this.stateChangeCallbacks.forEach((cb) => cb(entity_id, new_state, old_state || null))
          }
          break

        case 'pong':
          // Heartbeat response received
          break
      }
    }
  }

  private send(message: HAMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  private sendCommand<T>(command: HAMessage): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = this.messageId++
      this.pendingRequests.set(id, {
        resolve: resolve as RequestResolve,
        reject
      })
      this.send({ ...command, id })

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error('Request timeout'))
        }
      }, 30000)
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

  onStateChange(callback: StateChangeCallback) {
    this.stateChangeCallbacks.push(callback)
    return () => {
      this.stateChangeCallbacks = this.stateChangeCallbacks.filter((cb) => cb !== callback)
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' })
      }
    }, 30000)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
      console.log(`[HA WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
      setTimeout(() => this.connect(), delay)
    } else {
      console.error('[HA WS] Max reconnection attempts reached')
    }
  }

  disconnect() {
    this.stopHeartbeat()
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated
  }
}
