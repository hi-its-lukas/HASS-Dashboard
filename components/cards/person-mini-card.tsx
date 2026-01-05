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
    <div className="glass-tile w-full min-w-0 overflow-hidden rounded-2xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-shrink-0">
          {entityPicture ? (
            <img 
              src={entityPicture} 
              alt={displayName}
              className="w-9 h-9 rounded-full object-cover border-2 border-white/20"
            />
          ) : (
            <Avatar name={displayName} size="sm" />
          )}
          <div 
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card-bg"
            style={{ backgroundColor: statusStyle.color }}
          />
        </div>
        <p className="font-semibold text-white text-sm truncate min-w-0 flex-1">{displayName}</p>
      </div>
      
      <div className="flex items-center gap-2">
        <div 
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: statusStyle.bg }}
        >
          {isHome ? (
            <Home className="w-3.5 h-3.5" style={{ color: statusStyle.color }} />
          ) : (
            <MapPin className="w-3.5 h-3.5" style={{ color: statusStyle.color }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white text-xs font-medium truncate">{getLocationText()}</p>
          {gpsAccuracy && (
            <p className="text-text-secondary text-[9px] truncate">±{Math.round(gpsAccuracy)}m</p>
          )}
        </div>
      </div>
    </div>
  )
}
