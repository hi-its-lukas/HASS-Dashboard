'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Avatar } from '@/components/ui/avatar'
import { useHAStore } from '@/lib/ha'
import { Home, MapPin } from 'lucide-react'

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
  
  // Benutzerfreundliche Statusanzeige
  const getStatusText = () => {
    if (!state?.state) return 'Unbekannt'
    if (state.state === 'home') return 'Zuhause'
    if (state.state === 'not_home') return 'Unterwegs'
    // Zonennamen direkt anzeigen (z.B. "Arbeit", "Schule")
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
    <div className="glass-tile flex-shrink-0 p-0 overflow-hidden min-w-[200px] max-w-[240px]">
      <div className="h-[140px] relative bg-gray-800/50">
        {hasLocation && mounted ? (
          <MapContainer
            center={[lat, lng]}
            zoom={14}
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
          <div className="h-full w-full flex items-center justify-center">
            {isHome ? (
              <Home className="w-8 h-8 text-accent-green/50" />
            ) : (
              <MapPin className="w-8 h-8 text-gray-500" />
            )}
          </div>
        )}
      </div>
      
      <div className="p-3 flex items-center gap-2">
        <div className="relative">
          <Avatar name={displayName} size="sm" />
          <div 
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${isHome ? 'bg-accent-green' : 'bg-gray-500'}`}
            style={{ borderColor: 'rgba(28, 28, 30, 0.8)' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-xs truncate">{displayName}</p>
          <p className={`text-[10px] truncate ${isHome ? 'text-accent-green' : 'text-text-secondary'}`}>
            {getStatusText()}
          </p>
        </div>
      </div>
    </div>
  )
}
