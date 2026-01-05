'use client'

import { Avatar } from '@/components/ui/avatar'
import { useHAStore } from '@/lib/ha'
import { Home, MapPin } from 'lucide-react'

interface PersonMiniCardProps {
  entityId: string
  name: string
}

export function PersonMiniCard({ entityId, name }: PersonMiniCardProps) {
  const states = useHAStore((s) => s.states)
  const state = states[entityId]
  
  const isHome = state?.state === 'home'
  const displayName = (state?.attributes?.friendly_name as string) || name
  
  const entityPicture = state?.attributes?.entity_picture as string | undefined
  const gpsAccuracy = state?.attributes?.gps_accuracy as number | undefined
  
  const getLocationText = () => {
    if (!state?.state) return 'Unbekannt'
    if (state.state === 'home') return 'Zuhause'
    if (state.state === 'not_home') return 'Unterwegs'
    if (state.state === 'unknown') return 'Unbekannt'
    return state.state.charAt(0).toUpperCase() + state.state.slice(1).replace(/_/g, ' ')
  }
  
  const getStatusStyle = () => {
    if (isHome) return { bg: 'rgba(52, 211, 153, 0.3)', color: '#34d399' }
    if (state?.state === 'unknown') return { bg: 'rgba(156, 163, 175, 0.3)', color: '#9ca3af' }
    return { bg: 'rgba(251, 146, 60, 0.3)', color: '#fb923c' }
  }
  
  const statusStyle = getStatusStyle()
  
  return (
    <div className="glass-tile flex-shrink-0 overflow-hidden w-[160px] sm:w-[180px] rounded-2xl p-3">
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-shrink-0">
          {entityPicture ? (
            <img 
              src={entityPicture} 
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
            />
          ) : (
            <Avatar name={displayName} size="md" />
          )}
          <div 
            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card-bg"
            style={{ backgroundColor: statusStyle.color }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">{displayName}</p>
        </div>
      </div>
      
      <div className="flex items-start gap-2">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: statusStyle.bg }}
        >
          {isHome ? (
            <Home className="w-4 h-4" style={{ color: statusStyle.color }} />
          ) : (
            <MapPin className="w-4 h-4" style={{ color: statusStyle.color }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium">{getLocationText()}</p>
          {gpsAccuracy && (
            <p className="text-text-secondary text-[10px]">±{Math.round(gpsAccuracy)}m Genauigkeit</p>
          )}
        </div>
      </div>
    </div>
  )
}
