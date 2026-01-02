// Home Assistant Types

export interface HAState {
  entity_id: string
  state: string
  attributes: Record<string, unknown>
  last_changed: string
  last_updated: string
  context?: {
    id: string
    parent_id?: string
    user_id?: string
  }
}

export interface HAEvent {
  event_type: string
  data: {
    entity_id?: string
    new_state?: HAState
    old_state?: HAState
  }
  origin: string
  time_fired: string
  context: {
    id: string
    parent_id?: string
    user_id?: string
  }
}

export interface HAMessage {
  id?: number
  type: string
  [key: string]: unknown
}

export interface HAAuthMessage {
  type: 'auth'
  access_token: string
}

export interface HAResultMessage {
  id: number
  type: 'result'
  success: boolean
  result?: unknown
  error?: {
    code: string
    message: string
  }
}

export interface HAEventMessage {
  id: number
  type: 'event'
  event: HAEvent
}

export type HAIncomingMessage = HAResultMessage | HAEventMessage | { type: 'auth_required' | 'auth_ok' | 'auth_invalid' | 'pong' }

export interface HAServiceCall {
  domain: string
  service: string
  serviceData?: Record<string, unknown>
  target?: {
    entity_id?: string | string[]
    device_id?: string | string[]
    area_id?: string | string[]
  }
}

// Surveillance types
export interface SurveillanceEvent {
  id: string
  timestamp: string
  camera: string
  type: 'person' | 'vehicle' | 'animal' | 'motion'
  label: string
  confidence: number
  thumbnailUrl?: string
}
