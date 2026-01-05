'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface PersonMapProps {
  lat: number
  lng: number
  isHome: boolean
}

export function PersonMap({ lat, lng, isHome }: PersonMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map)

    L.circleMarker([lat, lng], {
      radius: 12,
      fillColor: isHome ? '#34d399' : '#fb923c',
      fillOpacity: 1,
      color: 'white',
      weight: 3,
    }).addTo(map)

    mapRef.current = map

    setTimeout(() => {
      map.invalidateSize()
    }, 100)

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [lat, lng, isHome])

  return (
    <div 
      ref={containerRef} 
      style={{ height: '100%', width: '100%', minHeight: '140px' }}
    />
  )
}

export default PersonMap
