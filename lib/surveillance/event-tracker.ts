import { SurveillanceCameraConfig } from '@/config/dashboard'

export interface DetectionEvent {
  cameraEntityId: string
  cameraName: string
  eventType: 'person' | 'vehicle' | 'animal' | 'motion'
  sensorEntityId: string
  detectedAt: Date
}

export async function trackDetectionEvent(event: DetectionEvent): Promise<void> {
  try {
    const cameraEntityId = encodeURIComponent(event.cameraEntityId)
    
    const snapshotRes = await fetch(`/api/ha/camera/${cameraEntityId}?t=${Date.now()}`)
    let snapshotPath: string | undefined

    if (snapshotRes.ok) {
      const blob = await snapshotRes.blob()
      const formData = new FormData()
      formData.append('file', blob, `snapshot_${Date.now()}.jpg`)
      formData.append('cameraEntityId', event.cameraEntityId)
      formData.append('eventType', event.eventType)
      
      const uploadRes = await fetch('/api/ha/surveillance/snapshot', {
        method: 'POST',
        body: formData
      })
      
      if (uploadRes.ok) {
        const data = await uploadRes.json()
        snapshotPath = data.path
      }
    }

    await fetch('/api/ha/surveillance/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cameraEntityId: event.cameraEntityId,
        cameraName: event.cameraName,
        eventType: event.eventType,
        snapshotPath
      })
    })
  } catch (error) {
    console.error('[EventTracker] Failed to track detection:', error)
  }
}

export function getSensorIdForType(
  config: SurveillanceCameraConfig,
  type: 'person' | 'vehicle' | 'animal' | 'motion'
): string | undefined {
  switch (type) {
    case 'person': return config.personSensorId
    case 'vehicle': return config.vehicleSensorId
    case 'animal': return config.animalSensorId
    case 'motion': return config.motionSensorId
    default: return undefined
  }
}

export function getEventTypeFromSensor(
  config: SurveillanceCameraConfig,
  sensorEntityId: string
): 'person' | 'vehicle' | 'animal' | 'motion' | null {
  if (config.personSensorId === sensorEntityId) return 'person'
  if (config.vehicleSensorId === sensorEntityId) return 'vehicle'
  if (config.animalSensorId === sensorEntityId) return 'animal'
  if (config.motionSensorId === sensorEntityId) return 'motion'
  return null
}
