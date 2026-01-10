import { z } from 'zod'

export const LoginSchema = z.object({
  username: z.string().min(1, 'Username required').max(100),
  password: z.string().min(1, 'Password required').max(200)
})

export const CallServiceSchema = z.object({
  domain: z.string().min(1).max(100).regex(/^[a-z_]+$/i, 'Invalid domain'),
  service: z.string().min(1).max(100).regex(/^[a-z_]+$/i, 'Invalid service'),
  entityId: z.string().max(200).regex(/^[a-z_]+\.[a-z0-9_]+$/i).optional(),
  data: z.record(z.string(), z.unknown()).optional()
})

export const CreateUserSchema = z.object({
  username: z.string().min(3, 'Min 3 characters').max(50).regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, underscores'),
  password: z.string().min(8, 'Min 8 characters').max(200),
  displayName: z.string().max(100).optional(),
  roleId: z.string().uuid().optional(),
  personEntityId: z.string().max(200).optional()
})

export const UpdateUserSchema = z.object({
  displayName: z.string().max(100).optional(),
  password: z.string().min(8).max(200).optional(),
  roleId: z.string().uuid().optional(),
  personEntityId: z.string().max(200).nullable().optional(),
  status: z.enum(['active', 'disabled']).optional()
})

export const PushSubscriptionSchema = z.object({
  userId: z.string().min(1).max(200),
  subscription: z.object({
    endpoint: z.string().url().max(2000),
    keys: z.object({
      p256dh: z.string().min(1).max(200),
      auth: z.string().min(1).max(200)
    })
  })
})

export const PushUnsubscribeSchema = z.object({
  userId: z.string().min(1).max(200),
  endpoint: z.string().url().max(2000)
})

export const UnlockDoorSchema = z.object({
  doorId: z.string().min(1).max(200)
})

export const StartStreamSchema = z.object({
  cameraId: z.string().min(1).max(200),
  channel: z.enum(['high', 'medium', 'low']).optional()
})

export const LockActionSchema = z.object({
  entityId: z.string().max(200).regex(/^lock\.[a-z0-9_]+$/i, 'Invalid lock entity'),
  action: z.enum(['lock', 'unlock'])
})

export const EntityIdParamSchema = z.object({
  entityId: z.string().max(200).regex(/^[a-z_]+\.[a-z0-9_]+$/i)
})

export const CameraIdParamSchema = z.object({
  cameraId: z.string().min(1).max(200)
})

export const EventIdParamSchema = z.object({
  eventId: z.string().min(1).max(200)
})

export const UserIdParamSchema = z.object({
  id: z.string().uuid()
})

export const DoorIdParamSchema = z.object({
  doorId: z.string().min(1).max(200)
})

export const CalendarQuerySchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
  entity_id: z.string().max(200).optional()
})

export const EventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  type: z.enum(['motion', 'ring', 'person', 'vehicle', 'animal', 'package']).optional()
})

export function validateBody<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string; details: string[] } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return {
    success: false,
    error: 'Validation failed',
    details: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
  }
}

export function validateParams<T>(schema: z.ZodSchema<T>, params: Record<string, string>): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(params)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return {
    success: false,
    error: result.error.issues.map(i => i.message).join(', ')
  }
}

export function validateQuery<T>(schema: z.ZodSchema<T>, searchParams: URLSearchParams): { success: true; data: T } | { success: false; error: string } {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  const result = schema.safeParse(params)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return {
    success: false,
    error: result.error.issues.map(i => i.message).join(', ')
  }
}
