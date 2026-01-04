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
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <Avatar name={displayName} src={person.avatarUrl} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{displayName}</h3>
          </div>
          <p className="text-sm text-text-secondary">{isHome ? 'Home' : 'Away'}</p>
        </div>
        {battery !== null && !isNaN(battery) && (
          <div className="text-right">
            <span className="text-lg font-bold text-white">{battery}%</span>
          </div>
        )}
      </div>

      {battery !== null && !isNaN(battery) && (
        <div className="mb-4">
          <ProgressBar
            value={battery}
            color={battery > 50 ? 'green' : battery > 20 ? 'yellow' : 'orange'}
          />
        </div>
      )}

      {sensorValues.length > 0 ? (
        <div className="space-y-2">
          {sensorValues.map(sensor => (
            <div key={sensor.id} className="flex justify-between items-start gap-2">
              <span className="text-[10px] text-text-muted uppercase flex-shrink-0">{sensor.label}</span>
              <span className="text-sm font-medium text-accent-cyan text-right break-words">
                {sensor.value}{sensor.unit && sensor.value !== '-' ? sensor.unit : ''}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-text-muted text-center py-2">
          Keine Sensoren konfiguriert
        </p>
      )}
    </Card>
  )
}
