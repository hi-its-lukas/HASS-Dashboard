'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Avatar } from '@/components/ui/avatar'
import { useHAStore } from '@/lib/ha'
import { Home, Car } from 'lucide-react'

const PersonMap = dynamic(
  () => import('./person-map').then((mod) => mod.PersonMap),
  { 
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-800 animate-pulse" />
  }
)

interface PersonMiniCardProps {
  entityId: string
  name: string
}

export function PersonMiniCard({ entityId, name }: PersonMiniCardProps) {
  const [mounted, setMounted] = useState(false)
  const states = useHAStore((s) => s.states)
  const state = states[entityId]
  
  const isHome = state?.state === 'home'
  const displayName = (state?.attributes?.friendly_name as string) || name
  
  const lat = state?.attributes?.latitude as number | undefined
  const lng = state?.attributes?.longitude as number | undefined
  const hasLocation = typeof lat === 'number' && typeof lng === 'number'
  
  const entityPicture = state?.attributes?.entity_picture as string | undefined
  const gpsAccuracy = state?.attributes?.gps_accuracy as number | undefined
  
  const getLocationText = () => {
    if (!state?.state) return 'Unbekannt'
    if (state.state === 'home') return 'Zuhause'
    if (state.state === 'not_home') return 'Unterwegs'
    if (state.state === 'unknown') return 'Unbekannt'
    return state.state.charAt(0).toUpperCase() + state.state.slice(1).replace(/_/g, ' ')
  }
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  const getStatusStyle = () => {
    if (isHome) return { bg: 'rgba(52, 211, 153, 0.3)', color: '#34d399' }
    if (state?.state === 'unknown') return { bg: 'rgba(156, 163, 175, 0.3)', color: '#9ca3af' }
    return { bg: 'rgba(251, 146, 60, 0.3)', color: '#fb923c' }
  }
  
  const statusStyle = getStatusStyle()
  
  return (
    <div className="glass-tile flex-shrink-0 overflow-hidden w-[200px] rounded-2xl">
      <div className="h-[140px] relative">
        {hasLocation && mounted ? (
          <PersonMap lat={lat} lng={lng} isHome={isHome} />
        ) : (
          <div className={`h-full w-full flex items-center justify-center ${
            isHome 
              ? 'bg-gradient-to-br from-accent-green/20 to-accent-green/5' 
              : 'bg-gradient-to-br from-accent-orange/20 to-accent-orange/5'
          }`}>
            {isHome ? (
              <Home className="w-16 h-16 text-accent-green/60" />
            ) : (
              <Car className="w-16 h-16 text-accent-orange/60" />
            )}
          </div>
        )}
        
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start pointer-events-none z-[1000]">
          <div 
            className="px-2 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-md"
            style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
          >
            {getLocationText()}
          </div>
          {gpsAccuracy && (
            <div className="px-1.5 py-0.5 rounded-full text-[9px] bg-black/50 text-white/80 backdrop-blur-md">
              ±{Math.round(gpsAccuracy)}m
            </div>
          )}
        </div>
      </div>
      
      <div className="p-3">
        <div className="flex items-center gap-3">
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
            {hasLocation ? (
              <p className="text-[10px] text-text-secondary truncate">
                {lat?.toFixed(4)}, {lng?.toFixed(4)}
              </p>
            ) : (
              <p className="text-[10px] text-text-secondary">
                Keine GPS-Daten
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
