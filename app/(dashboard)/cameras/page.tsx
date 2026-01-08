'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Video, RefreshCw, X, Maximize2, ImageOff, Settings, Play, Camera } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useHAStore } from '@/lib/ha'
import { useConfigStore } from '@/lib/config/store'
import dynamic from 'next/dynamic'

const WebRTCPlayer = dynamic(() => import('@/components/streaming/WebRTCPlayer'), { ssr: false })

interface UnifiCameraInfo {
  id: string
  name: string
  type: string
}

export default function CamerasPage() {
  const states = useHAStore((s) => s.states)
  const getEntityArea = useHAStore((s) => s.getEntityArea)
  const configuredCameras = useConfigStore((s) => s.cameras)
  const unifiCameraIds = useConfigStore((s) => s.unifi?.cameras)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null)
  const [selectedUnifiCamera, setSelectedUnifiCamera] = useState<UnifiCameraInfo | null>(null)
  const [unifiCameras, setUnifiCameras] = useState<UnifiCameraInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [useStream, setUseStream] = useState(true)
  const [liveStreamEnabled, setLiveStreamEnabled] = useState(false)
  const [useLiveStream, setUseLiveStream] = useState(false)
  
  const hasUnifiCameras = unifiCameraIds && unifiCameraIds.length > 0
  
  const cameraEntities = hasUnifiCameras 
    ? [] 
    : (configuredCameras || []).filter((id) => id.startsWith('camera.') && states[id])
  
  useEffect(() => {
    async function loadUnifiCameras() {
      if (!hasUnifiCameras) {
        setLoading(false)
        return
      }
      
      try {
        const [camerasResponse, streamingResponse] = await Promise.all([
          fetch('/api/unifi/discover-saved', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }),
          fetch('/api/streaming/status')
        ])
        
        if (camerasResponse.ok) {
          const data = await camerasResponse.json()
          const selectedCameras = data.cameras?.filter((cam: UnifiCameraInfo) => 
            unifiCameraIds?.includes(cam.id)
          ) || []
          setUnifiCameras(selectedCameras)
        }
        
        if (streamingResponse.ok) {
          const streamingData = await streamingResponse.json()
          setLiveStreamEnabled(streamingData.liveStreamEnabled && streamingData.hasCredentials)
        }
      } catch (error) {
        console.error('Failed to load UniFi cameras:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadUnifiCameras()
  }, [hasUnifiCameras, unifiCameraIds])
  
  const handleRefresh = () => {
    setRefreshKey((k) => k + 1)
  }

  const totalCameras = hasUnifiCameras ? unifiCameras.length : cameraEntities.length

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
              {totalCameras} {hasUnifiCameras ? 'UniFi' : ''} Kameras
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {hasUnifiCameras && liveStreamEnabled && (
            <button
              onClick={() => setUseLiveStream(!useLiveStream)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                useLiveStream 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              <Play className="w-4 h-4" />
              {useLiveStream ? 'Live' : 'Snapshots'}
            </button>
          )}
          {!hasUnifiCameras && cameraEntities.length > 0 && (
            <button
              onClick={() => setUseStream(!useStream)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                useStream 
                  ? 'bg-accent-green/20 text-accent-green' 
                  : 'bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              <Video className="w-4 h-4" />
              {useStream ? 'Live' : 'Bilder'}
            </button>
          )}
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </motion.header>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
        </div>
      ) : totalCameras === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <Video className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-text-secondary mb-2">Keine Kameras konfiguriert</p>
          <p className="text-sm text-text-muted mb-4">
            {hasUnifiCameras 
              ? 'Prüfe deine UniFi Protect Konfiguration' 
              : 'Füge Kameras in den Einstellungen hinzu'}
          </p>
          <a 
            href={hasUnifiCameras ? '/settings/unifi' : '/settings'} 
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan rounded-xl transition-colors"
          >
            <Settings className="w-4 h-4" />
            {hasUnifiCameras ? 'UniFi Einstellungen' : 'Zu den Einstellungen'}
          </a>
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unifiCameras.map((camera, index) => (
              <motion.div
                key={`unifi-${camera.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="overflow-hidden">
                  <div 
                    className="relative aspect-video bg-bg-secondary cursor-pointer group"
                    onClick={() => setSelectedUnifiCamera(camera)}
                  >
                    {useLiveStream ? (
                      <WebRTCPlayer
                        cameraId={camera.id}
                        className="w-full h-full"
                        autoPlay={true}
                      />
                    ) : (
                      <UnifiCameraFeed
                        cameraId={camera.id}
                        cameraName={camera.name}
                        refreshKey={refreshKey}
                      />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center pointer-events-none">
                      <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-white truncate">
                      {camera.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      UniFi Protect • {camera.type}
                    </p>
                  </div>
                </Card>
              </motion.div>
            ))}
            
            {cameraEntities.map((entityId, index) => {
              const state = states[entityId]
              const friendlyName = (state?.attributes?.friendly_name as string) || entityId.split('.')[1].replace(/_/g, ' ')
              const areaName = getEntityArea(entityId)
              
              return (
                <motion.div
                  key={`ha-${entityId}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (unifiCameras.length + index) * 0.05 }}
                >
                  <Card className="overflow-hidden">
                    <div 
                      className="relative aspect-video bg-bg-secondary cursor-pointer group"
                      onClick={() => setSelectedCamera(entityId)}
                    >
                      <CameraFeed
                        entityId={entityId}
                        friendlyName={friendlyName}
                        useStream={useStream}
                        refreshKey={refreshKey}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {useStream && (
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-red-500/80 rounded text-xs text-white font-medium flex items-center gap-1">
                          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                          LIVE
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-white capitalize truncate">
                        {friendlyName}
                      </p>
                      <p className="text-xs text-text-muted">
                        {areaName || (state?.state === 'streaming' ? 'Live' : state?.state || 'idle')}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
          
          {selectedUnifiCamera && (
            <UnifiCameraModal
              camera={selectedUnifiCamera}
              useLiveStream={useLiveStream && liveStreamEnabled}
              onClose={() => setSelectedUnifiCamera(null)}
            />
          )}
          
          {selectedCamera && (
            <CameraStreamModal
              entityId={selectedCamera}
              friendlyName={(states[selectedCamera]?.attributes?.friendly_name as string) || selectedCamera}
              onClose={() => setSelectedCamera(null)}
            />
          )}
        </>
      )}
    </div>
  )
}

function CameraFeed({
  entityId,
  friendlyName,
  useStream,
  refreshKey,
}: {
  entityId: string
  friendlyName: string
  useStream: boolean
  refreshKey: number
}) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const streamUrl = `/api/ha/camera/${encodeURIComponent(entityId)}/stream?t=${refreshKey}`
  const imageUrl = `/api/ha/camera/${encodeURIComponent(entityId)}?t=${refreshKey}`
  
  const src = useStream ? streamUrl : imageUrl
  
  return (
    <>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
        </div>
      )}
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
          <ImageOff className="w-8 h-8 mb-2" />
          <span className="text-xs">Stream nicht verfügbar</span>
        </div>
      ) : (
        <img
          key={`${entityId}-${useStream ? 'stream' : 'image'}-${refreshKey}`}
          src={src}
          alt={friendlyName}
          className="w-full h-full object-cover"
          onLoad={() => setLoading(false)}
          onError={() => {
            setError(true)
            setLoading(false)
          }}
        />
      )}
    </>
  )
}

function CameraStreamModal({ 
  entityId, 
  friendlyName, 
  onClose 
}: { 
  entityId: string
  friendlyName: string
  onClose: () => void 
}) {
  const [streamKey] = useState(() => Date.now())
  const [error, setError] = useState(false)
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-5xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-bg-card rounded-2xl overflow-hidden shadow-2xl">
          <div className="relative aspect-video bg-black">
            {error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                <ImageOff className="w-12 h-12 mb-2" />
                <span className="text-sm">Stream nicht verfügbar</span>
              </div>
            ) : (
              <img
                key={streamKey}
                src={`/api/ha/camera/${encodeURIComponent(entityId)}/stream?t=${streamKey}`}
                alt={friendlyName}
                className="w-full h-full object-contain"
                onError={() => setError(true)}
              />
            )}
            <div className="absolute top-4 left-4 px-3 py-1.5 bg-red-500/90 rounded-lg text-sm text-white font-medium flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE STREAM
            </div>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 flex justify-between items-center border-t border-white/10">
            <p className="text-white font-medium capitalize">
              {friendlyName}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function UnifiCameraFeed({
  cameraId,
  cameraName,
  refreshKey,
}: {
  cameraId: string
  cameraName: string
  refreshKey: number
}) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const snapshotUrl = `/api/unifi/camera/${encodeURIComponent(cameraId)}/snapshot?t=${refreshKey}`
  
  return (
    <>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin" />
        </div>
      )}
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
          <ImageOff className="w-8 h-8 mb-2" />
          <span className="text-xs">Snapshot nicht verfügbar</span>
        </div>
      ) : (
        <img
          key={`${cameraId}-${refreshKey}`}
          src={snapshotUrl}
          alt={cameraName}
          className="w-full h-full object-cover"
          onLoad={() => setLoading(false)}
          onError={() => {
            setError(true)
            setLoading(false)
          }}
        />
      )}
    </>
  )
}

function UnifiCameraModal({ 
  camera, 
  useLiveStream,
  onClose 
}: { 
  camera: { id: string; name: string; type: string }
  useLiveStream?: boolean
  onClose: () => void 
}) {
  const [refreshKey, setRefreshKey] = useState(() => Date.now())
  const [error, setError] = useState(false)
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])
  
  useEffect(() => {
    if (!useLiveStream) {
      const interval = setInterval(() => {
        setRefreshKey(Date.now())
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [useLiveStream])

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-5xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-bg-card rounded-2xl overflow-hidden shadow-2xl">
          <div className="relative aspect-video bg-black">
            {useLiveStream ? (
              <WebRTCPlayer
                cameraId={camera.id}
                className="w-full h-full"
                autoPlay={true}
              />
            ) : error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                <ImageOff className="w-12 h-12 mb-2" />
                <span className="text-sm">Snapshot nicht verfügbar</span>
              </div>
            ) : (
              <img
                key={refreshKey}
                src={`/api/unifi/camera/${encodeURIComponent(camera.id)}/snapshot?t=${refreshKey}`}
                alt={camera.name}
                className="w-full h-full object-contain"
                onError={() => setError(true)}
              />
            )}
            <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-lg text-sm text-white font-medium flex items-center gap-2 ${
              useLiveStream ? 'bg-green-500/90' : 'bg-accent-cyan/90'
            }`}>
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              {useLiveStream ? 'LIVE' : 'UniFi Protect'}
            </div>
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 flex justify-between items-center border-t border-white/10">
            <div>
              <p className="text-white font-medium">
                {camera.name}
              </p>
              <p className="text-xs text-text-muted">{camera.type}</p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
