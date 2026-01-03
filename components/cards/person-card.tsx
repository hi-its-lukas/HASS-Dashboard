'use client'

import { Card } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Badge } from '@/components/ui/badge'
import { useHAStore } from '@/lib/ha'
import { PersonConfig } from '@/config/dashboard'
import { getActivityIcon } from '@/lib/utils'

interface PersonCardProps {
  person: PersonConfig
}

export function PersonCard({ person }: PersonCardProps) {
  const states = useHAStore((s) => s.states)
  
  const personState = states[person.entityId]
  const isHome = personState?.state === 'home'
  
  const displayName = (personState?.attributes?.friendly_name as string) || person.name
  
  const battery = person.batteryEntityId ? parseInt(states[person.batteryEntityId]?.state || '0') : null
  const steps = person.stepsEntityId ? parseInt(states[person.stepsEntityId]?.state || '0') : null
  const distance = person.distanceEntityId ? states[person.distanceEntityId]?.state : null
  const floors = person.floorsEntityId ? parseInt(states[person.floorsEntityId]?.state || '0') : null
  const activity = person.activityEntityId ? states[person.activityEntityId]?.state : null

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <Avatar name={displayName} src={person.avatarUrl} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{displayName}</h3>
            {activity && (
              <Badge variant="info" className="text-[10px]">
                {getActivityIcon(activity)} Focus
              </Badge>
            )}
          </div>
          <p className="text-sm text-text-secondary">{isHome ? 'Home' : 'Away'}</p>
        </div>
        {battery !== null && (
          <div className="text-right">
            <span className="text-lg font-bold text-white">{battery}%</span>
          </div>
        )}
      </div>

      {battery !== null && (
        <div className="mb-4">
          <ProgressBar
            value={battery}
            color={battery > 50 ? 'green' : battery > 20 ? 'yellow' : 'orange'}
          />
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <span className="text-lg font-bold text-accent-cyan">{steps?.toLocaleString() || '-'}</span>
          <p className="text-[10px] text-text-muted uppercase">Steps</p>
        </div>
        <div>
          <span className="text-lg font-bold text-white">{distance || '-'}km</span>
          <p className="text-[10px] text-text-muted uppercase">Dist</p>
        </div>
        <div>
          <span className="text-lg font-bold text-white">{floors || '-'}</span>
          <p className="text-[10px] text-text-muted uppercase">Floors</p>
        </div>
        <div>
          <span className="text-lg">{activity ? getActivityIcon(activity) : '📍'}</span>
          <p className="text-[10px] text-text-muted uppercase">Activity</p>
        </div>
      </div>
    </Card>
  )
}
