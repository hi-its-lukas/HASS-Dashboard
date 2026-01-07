import { z } from 'zod'
import { UnifiConfigSchema } from './unifi-url'

const EntityIdSchema = z.string().max(200).regex(/^[a-z_]+\.[a-z0-9_]+$/i).optional()

const EnergyConfigSchema = z.object({
  solarEntityId: EntityIdSchema,
  batteryEntityId: EntityIdSchema,
  batteryLevelEntityId: EntityIdSchema,
  gridEntityId: EntityIdSchema,
  houseEntityId: EntityIdSchema
}).optional()

const SecurityZoneSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  entityId: z.string().max(200)
})

const SecurityConfigSchema = z.object({
  alarmEntityId: EntityIdSchema,
  zones: z.array(SecurityZoneSchema).max(50).optional(),
  dogModeEntityId: EntityIdSchema
}).optional()

const RoomConfigSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  floor: z.enum(['ground', 'first', 'second', 'basement', 'attic']).optional(),
  icon: z.string().max(50).optional(),
  entityIds: z.array(z.string().max(200)).max(100)
})

const PersonConfigSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  entityId: z.string().max(200)
})

const PersonDetailConfigSchema = z.object({
  entityId: z.string().max(200),
  stepsEntityId: z.string().max(200).optional(),
  distanceEntityId: z.string().max(200).optional(),
  batteryEntityId: z.string().max(200).optional()
})

const ApplianceConfigSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  entityId: z.string().max(200),
  icon: z.string().max(50).optional()
})

const CustomButtonSchema = z.object({
  id: z.string().max(100),
  label: z.string().max(200),
  icon: z.string().max(50),
  domain: z.string().max(100),
  service: z.string().max(100),
  entityId: z.string().max(200).optional(),
  data: z.record(z.string(), z.unknown()).optional()
})

const IntercomConfigSchema = z.object({
  id: z.string().max(100),
  name: z.string().max(200),
  cameraEntityId: z.string().max(200).optional(),
  speakUrl: z.string().max(500).optional(),
  lockEntityId: z.string().max(200).optional(),
  unifiDoorId: z.string().max(100).optional()
})

const VacuumConfigSchema = z.object({
  entityId: z.string().max(200),
  mapImageEntityId: z.string().max(200).optional()
}).optional()

export const LayoutConfigSchema = z.object({
  dashboardTitle: z.string().max(200).optional(),
  weatherEntityId: EntityIdSchema,
  temperatureSensorId: EntityIdSchema,
  trashCalendarId: EntityIdSchema,
  lightsGroupEntityId: EntityIdSchema,
  powerEntityId: EntityIdSchema,
  alarmEntityId: EntityIdSchema,
  backgroundUrl: z.string().max(1000).optional(),
  energy: EnergyConfigSchema,
  security: SecurityConfigSchema,
  rooms: z.array(RoomConfigSchema).max(50).optional(),
  persons: z.union([
    z.array(z.string().max(200)).max(50),
    z.array(PersonConfigSchema).max(50)
  ]).optional(),
  personDetails: z.array(PersonDetailConfigSchema).max(50).optional(),
  lights: z.array(z.string().max(200)).max(200).optional(),
  covers: z.array(z.string().max(200)).max(100).optional(),
  awnings: z.array(z.string().max(200)).max(50).optional(),
  curtains: z.array(z.string().max(200)).max(50).optional(),
  climates: z.array(z.string().max(200)).max(50).optional(),
  calendars: z.array(z.string().max(200)).max(20).optional(),
  cameras: z.array(z.string().max(200)).max(50).optional(),
  appliances: z.union([
    z.array(z.string().max(200)).max(50),
    z.array(ApplianceConfigSchema).max(50)
  ]).optional(),
  customButtons: z.array(CustomButtonSchema).max(50).optional(),
  intercoms: z.array(IntercomConfigSchema).max(20).optional(),
  vacuum: VacuumConfigSchema,
  unifi: UnifiConfigSchema.optional()
}).passthrough()

export const SettingsRequestSchema = z.object({
  layoutConfig: LayoutConfigSchema.optional(),
  sidebarState: z.enum(['expanded', 'collapsed']).optional()
})

export type ValidatedLayoutConfig = z.infer<typeof LayoutConfigSchema>
export type ValidatedSettingsRequest = z.infer<typeof SettingsRequestSchema>

const MAX_REQUEST_SIZE = 100 * 1024

export function validateRequestSize(body: string): boolean {
  return body.length <= MAX_REQUEST_SIZE
}
