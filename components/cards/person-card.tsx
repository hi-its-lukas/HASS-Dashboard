'use client'

import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { ProgressBar } from '@/components/ui/progress-bar'
import { useHAStore } from '@/lib/ha'
import { useConfig } from '@/lib/config/store'
import { PersonConfig } from '@/config/dashboard'

interface PersonCardProps {
  person: PersonConfig
}

export function PersonCard({ person }: PersonCardProps) {
  const states = useHAStore((s) => s.states)
  const config = useConfig()
  
  const personState = states[person.entityId]
  const isHome = personState?.state === 'home'
  
  const displayName = (personState?.attributes?.friendly_name as string) || person.name

  const personDetail = config.personDetails?.find(p => p.entityId === person.entityId)
  
  let battery: number | null = null
  if (personDetail?.batteryEntityId) {
    const batteryValue = states[personDetail.batteryEntityId]?.state
    if (batteryValue && batteryValue !== 'unavailable' && batteryValue !== 'unknown') {
      battery = parseInt(batteryValue)
    }
  } else if (person.batteryEntityId) {
    const batteryValue = states[person.batteryEntityId]?.state
    if (batteryValue && batteryValue !== 'unavailable' && batteryValue !== 'unknown') {
      battery = parseInt(batteryValue)
    }
  }

  const sensors = personDetail?.sensors || []
  const sensorValues = sensors.map(sensor => {
    const state = states[sensor.entityId]
    let value = state?.state
    if (value === 'unavailable' || value === 'unknown') {
      value = '-'
    }
    return {
      ...sensor,
      value: value || '-'
    }
  })

  return (
    <Card className="p-5 lg:p-6">
      <div className="flex items-center gap-4 mb-4">
        <Avatar name={displayName} src={person.avatarUrl} size="xl" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white text-lg lg:text-xl">{displayName}</h3>
          </div>
          <p className="text-sm lg:text-base text-text-secondary">{isHome ? 'Zuhause' : 'Unterwegs'}</p>
        </div>
        {battery !== null && !isNaN(battery) && (
          <div className="text-right">
            <span className="text-xl lg:text-2xl font-bold text-white">{battery}%</span>
          </div>
        )}
      </div>

      {battery !== null && !isNaN(battery) && (
        <div className="mb-5">
          <ProgressBar
            value={battery}
            color={battery > 50 ? 'green' : battery > 20 ? 'yellow' : 'orange'}
          />
        </div>
      )}

      {sensorValues.length > 0 ? (
        <div className="space-y-3">
          {sensorValues.map(sensor => (
            <div key={sensor.id} className="flex justify-between items-start gap-2">
              <span className="text-xs lg:text-sm text-text-muted uppercase flex-shrink-0">{sensor.label}</span>
              <span className="text-sm lg:text-base font-medium text-accent-cyan text-right break-words">
                {sensor.value}{sensor.unit && sensor.value !== '-' ? sensor.unit : ''}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted text-center py-3">
          Keine Sensoren konfiguriert
        </p>
      )}
    </Card>
  )
}
