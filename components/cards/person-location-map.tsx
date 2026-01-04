'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useHAStore } from '@/lib/ha'
import { useConfig } from '@/lib/config/store'

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
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)

interface PersonLocation {
  name: string
  lat: number
  lng: number
  state: string
}

export function PersonLocationMap() {
  const [mounted, setMounted] = useState(false)
  const states = useHAStore((s) => s.states)
  const config = useConfig()
  
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
  
  const locations: PersonLocation[] = config.persons
    .map((person) => {
      const state = states[person.entityId]
      if (!state) return null
      
      const lat = state.attributes?.latitude as number | undefined
      const lng = state.attributes?.longitude as number | undefined
      const friendlyName = (state.attributes?.friendly_name as string) || person.name
      
      if (lat && lng) {
        return {
          name: friendlyName,
          lat,
          lng,
          state: state.state,
        }
      }
      return null
    })
    .filter((l): l is PersonLocation => l !== null)
  
  if (!mounted) {
    return (
      <div className="card h-full flex items-center justify-center">
        <span className="text-text-muted">Loading map...</span>
      </div>
    )
  }
  
  if (locations.length === 0) {
    return (
      <div className="card h-full flex items-center justify-center p-4">
        <span className="text-text-muted text-sm text-center">
          No location data available
        </span>
      </div>
    )
  }
  
  const center: [number, number] = [
    locations.reduce((sum, l) => sum + l.lat, 0) / locations.length,
    locations.reduce((sum, l) => sum + l.lng, 0) / locations.length,
  ]
  
  return (
    <div className="card h-full overflow-hidden rounded-xl">
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {locations.map((loc) => (
          <Marker key={loc.name} position={[loc.lat, loc.lng]}>
            <Popup>
              <strong>{loc.name}</strong>
              <br />
              {loc.state === 'home' ? 'Zuhause' : loc.state}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
