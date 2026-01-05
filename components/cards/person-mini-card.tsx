'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Avatar } from '@/components/ui/avatar'
import { useHAStore } from '@/lib/ha'
import { Home, MapPin, Navigation } from 'lucide-react'

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
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
  const hasLocation = lat !== undefined && lng !== undefined
  
  const getStatusText = () => {
    if (!state?.state) return 'Unbekannt'
    if (state.state === 'home') return 'Zuhause'
    if (state.state === 'not_home') return 'Unterwegs'
    return state.state.charAt(0).toUpperCase() + state.state.slice(1).replace(/_/g, ' ')
  }
  
  useEffect(() => {
    import('leaflet').then((L) => {
      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })
      setMounted(true)
    })
  }, [])
  
  return (
    <div className="glass-tile flex-shrink-0 overflow-hidden w-[220px]">
      <div className="h-[160px] relative">
        {hasLocation && mounted ? (
          <MapContainer
            center={[lat, lng]}
            zoom={15}
            scrollWheelZoom={false}
            zoomControl={false}
            attributionControl={false}
            dragging={false}
            className="h-full w-full"
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            <Marker position={[lat, lng]} />
          </MapContainer>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-gray-800/80 to-gray-900/80 flex items-center justify-center">
            {isHome ? (
              <div className="text-center">
                <Home className="w-10 h-10 text-accent-green mx-auto mb-2" />
                <p className="text-accent-green text-xs font-medium">Zuhause</p>
              </div>
            ) : (
              <div className="text-center">
                <Navigation className="w-10 h-10 text-accent-orange mx-auto mb-2" />
                <p className="text-accent-orange text-xs font-medium">Unterwegs</p>
              </div>
            )}
          </div>
        )}
        
        <div className="absolute top-2 right-2">
          <div 
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-sm ${
              isHome 
                ? 'bg-accent-green/20 text-accent-green border border-accent-green/30' 
                : 'bg-accent-orange/20 text-accent-orange border border-accent-orange/30'
            }`}
          >
            {getStatusText()}
          </div>
        </div>
      </div>
      
      <div className="p-3 flex items-center gap-3 bg-black/20">
        <div className="relative">
          <Avatar name={displayName} size="md" />
          <div 
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card-bg ${
              isHome ? 'bg-accent-green' : 'bg-accent-orange'
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm truncate">{displayName}</p>
          {hasLocation && (
            <div className="flex items-center gap-1 text-text-secondary">
              <MapPin className="w-3 h-3" />
              <p className="text-[10px] truncate">
                {lat?.toFixed(4)}, {lng?.toFixed(4)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
