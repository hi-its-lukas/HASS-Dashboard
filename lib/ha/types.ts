// Home Assistant Types
// Last updated: 2026-01-06 - Strikte Typen für WebSocket API

export interface HAContext {
  id: string
  parent_id?: string | null
  user_id?: string | null
}

export interface HAState {
  entity_id: string
  state: string
  attributes: HAStateAttributes
  last_changed: string
  last_updated: string
  context?: HAContext
}

export interface HAStateAttributes {
  friendly_name?: string
  unit_of_measurement?: string
  device_class?: string
  icon?: string
  entity_picture?: string
  supported_features?: number
  [key: string]: unknown
}

export interface HAStateChangedEventData {
  entity_id: string
  new_state: HAState | null
  old_state: HAState | null
}

export interface HAEvent<T = Record<string, unknown>> {
  event_type: string
  data: T
  origin: string
  time_fired: string
  context: HAContext
}

export interface HAStateChangedEvent extends HAEvent<HAStateChangedEventData> {
  event_type: 'state_changed'
}

export interface HACallServiceEventData {
  domain: string
  service: string
  service_data: Record<string, unknown>
}

export interface HACallServiceEvent extends HAEvent<HACallServiceEventData> {
  event_type: 'call_service'
}

export interface HAAutomationTriggeredEventData {
  name: string
  entity_id: string
  source: string
}

export interface HAScriptStartedEventData {
  name: string
  entity_id: string
}

export interface HAMobileAppNotificationEventData {
  title?: string
  message: string
  data?: Record<string, unknown>
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

export interface HAPingMessage {
  type: 'ping'
  id?: number
}

export interface HAPongMessage {
  type: 'pong'
  id: number
}

export interface HAAuthRequiredMessage {
  type: 'auth_required'
  ha_version: string
}

export interface HAAuthOkMessage {
  type: 'auth_ok'
  ha_version: string
}

export interface HAAuthInvalidMessage {
  type: 'auth_invalid'
  message: string
}

export interface HAResultMessage<T = unknown> {
  id: number
  type: 'result'
  success: boolean
  result?: T
  error?: HAError
}

export interface HAError {
  code: string
  message: string
}

export interface HAEventMessage<T = Record<string, unknown>> {
  id: number
  type: 'event'
  event: HAEvent<T>
}

export type HAIncomingMessage = 
  | HAResultMessage
  | HAEventMessage
  | HAAuthRequiredMessage
  | HAAuthOkMessage
  | HAAuthInvalidMessage
  | HAPongMessage

export interface HAServiceCall {
  domain: string
  service: string
  serviceData?: Record<string, unknown>
  target?: HAServiceTarget
}

export interface HAServiceTarget {
  entity_id?: string | string[]
  device_id?: string | string[]
  area_id?: string | string[]
}

export interface HACalendarEvent {
  summary: string
  description?: string
  location?: string
  start: HACalendarDateTime
  end: HACalendarDateTime
  uid?: string
  recurrence_id?: string
  rrule?: string
}

export interface HACalendarDateTime {
  dateTime?: string
  date?: string
}

export interface HAWeatherForecast {
  datetime: string
  temperature?: number
  templow?: number
  condition?: string
  precipitation?: number
  precipitation_probability?: number
  humidity?: number
  wind_speed?: number
  wind_bearing?: number
}

export interface HAArea {
  area_id: string
  name: string
  picture?: string | null
  aliases?: string[]
}

export interface HADevice {
  id: string
  name: string
  name_by_user?: string | null
  area_id?: string | null
  manufacturer?: string | null
  model?: string | null
  sw_version?: string | null
  hw_version?: string | null
  serial_number?: string | null
  disabled_by?: string | null
  configuration_url?: string | null
}

export interface HAEntityRegistryEntry {
  entity_id: string
  name?: string | null
  icon?: string | null
  platform: string
  area_id?: string | null
  device_id?: string | null
  disabled_by?: string | null
  hidden_by?: string | null
  entity_category?: string | null
  original_name?: string | null
  unique_id: string
}

export class HAApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'HAApiError'
  }

  static unauthorized(message = 'Not authenticated'): HAApiError {
    return new HAApiError(message, 'UNAUTHORIZED', 401)
  }

  static tokenExpired(message = 'Token expired - please re-authenticate'): HAApiError {
    return new HAApiError(message, 'TOKEN_EXPIRED', 401)
  }

  static notConfigured(message = 'Home Assistant instance not configured'): HAApiError {
    return new HAApiError(message, 'NOT_CONFIGURED', 400)
  }

  static connectionFailed(message = 'Failed to connect to Home Assistant'): HAApiError {
    return new HAApiError(message, 'CONNECTION_FAILED', 502)
  }

  static serviceCallFailed(domain: string, service: string, details?: string): HAApiError {
    return new HAApiError(
      `Service call ${domain}.${service} failed: ${details || 'Unknown error'}`,
      'SERVICE_CALL_FAILED',
      500,
      { domain, service }
    )
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      details: this.details
    }
  }
}
