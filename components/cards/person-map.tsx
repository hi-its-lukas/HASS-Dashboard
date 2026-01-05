'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'

interface PersonMapProps {
  lat: number
  lng: number
  isHome: boolean
}

export function PersonMap({ lat, lng, isHome }: PersonMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map)

    L.circleMarker([lat, lng], {
      radius: 10,
      fillColor: isHome ? '#34d399' : '#fb923c',
      fillOpacity: 1,
      color: 'white',
      weight: 3,
    }).addTo(map)

    mapInstanceRef.current = map

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [lat, lng, isHome])

  return <div ref={mapRef} className="h-full w-full" />
}
