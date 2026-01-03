'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Video, RefreshCw, Settings, Maximize2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useHAStore } from '@/lib/ha'

export default function CamerasPage() {
  const states = useHAStore((s) => s.states)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null)
  
  const cameraEntities = Object.keys(states).filter((id) => id.startsWith('camera.'))
  
  const handleRefresh = () => {
    setRefreshKey((k) => k + 1)
  }
  
  useEffect(() => {
    const interval = setInterval(handleRefresh, 10000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="px-4 py-6 safe-top max-w-7xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-cyan/20 flex items-center justify-center">
            <Video className="w-5 h-5 text-accent-cyan" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Kameras</h1>
            <p className="text-xs text-text-secondary">
              {cameraEntities.length} Kameras
            </p>
          </div>
        </div>
        
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Aktualisieren
        </button>
      </motion.header>

      {cameraEntities.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <Video className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-text-secondary mb-2">Keine Kameras gefunden</p>
          <p className="text-sm text-text-muted">
            Kameras werden automatisch aus Home Assistant erkannt
          </p>
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cameraEntities.map((entityId, index) => {
              const state = states[entityId]
              const friendlyName = (state?.attributes?.friendly_name as string) || entityId.split('.')[1].replace(/_/g, ' ')
              
              return (
                <motion.div
                  key={entityId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="overflow-hidden">
                    <div 
                      className="relative aspect-video bg-bg-secondary cursor-pointer group"
                      onClick={() => setSelectedCamera(entityId)}
                    >
                      <img
                        key={`${entityId}-${refreshKey}`}
                        src={`/api/ha/camera/${encodeURIComponent(entityId)}?t=${refreshKey}`}
                        alt={friendlyName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement
                          img.style.display = 'none'
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-white capitalize truncate">
                        {friendlyName}
                      </p>
                      <p className="text-xs text-text-muted">
                        {state?.state === 'streaming' ? 'Live' : state?.state || 'idle'}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
          
          {selectedCamera && (
            <div 
              className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedCamera(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-4xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-bg-card rounded-2xl overflow-hidden">
                  <img
                    src={`/api/ha/camera/${encodeURIComponent(selectedCamera)}?t=${Date.now()}`}
                    alt=""
                    className="w-full"
                  />
                  <div className="p-4 flex justify-between items-center">
                    <p className="text-white font-medium">
                      {(states[selectedCamera]?.attributes?.friendly_name as string) || selectedCamera}
                    </p>
                    <button
                      onClick={() => setSelectedCamera(null)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
