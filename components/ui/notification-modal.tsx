'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, AlertTriangle, AlertCircle, Bot, Video } from 'lucide-react'
import { useNotificationsStore, DashboardNotification } from '@/lib/ui/notifications-store'
import Link from 'next/link'

function NotificationItem({ notification, onDismiss }: { 
  notification: DashboardNotification
  onDismiss: () => void 
}) {
  const [progress, setProgress] = useState(100)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setImageUrl(null)
    setImageError(false)
    
    if (notification.cameraEntity) {
      const entityId = notification.cameraEntity.replace('camera.', '')
      setImageUrl(`/api/ha/camera/${entityId}`)
      
      const refreshInterval = setInterval(() => {
        setImageUrl(`/api/ha/camera/${entityId}?t=${Date.now()}`)
      }, 3000)
      
      return () => clearInterval(refreshInterval)
    }
  }, [notification.id, notification.cameraEntity])

  useEffect(() => {
    if (notification.timeout <= 0) return

    const startTime = Date.now()
    const endTime = startTime + notification.timeout

    const interval = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(0, endTime - now)
      const percent = (remaining / notification.timeout) * 100
      setProgress(percent)

      if (remaining <= 0) {
        clearInterval(interval)
        onDismiss()
      }
    }, 100)

    return () => clearInterval(interval)
  }, [notification.timeout, onDismiss])

  const severityStyles = {
    info: {
      border: 'border-cyan-500/50',
      bg: 'bg-cyan-500/10',
      icon: <Bell className="w-5 h-5 text-cyan-400" />,
      progress: 'bg-cyan-500',
    },
    warning: {
      border: 'border-amber-500/50',
      bg: 'bg-amber-500/10',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
      progress: 'bg-amber-500',
    },
    critical: {
      border: 'border-red-500/50',
      bg: 'bg-red-500/10',
      icon: <AlertCircle className="w-5 h-5 text-red-400 animate-pulse" />,
      progress: 'bg-red-500',
    },
  }

  const style = severityStyles[notification.severity]

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className={`relative w-full max-w-md bg-gray-900/95 backdrop-blur-xl border ${style.border} rounded-2xl shadow-2xl overflow-hidden`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${style.bg}`}>
              {style.icon}
            </div>
            <h3 className="font-semibold text-white text-lg">{notification.title}</h3>
          </div>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {imageUrl && !imageError && (
          <div className="mt-4 rounded-xl overflow-hidden bg-black/50">
            <img
              src={imageUrl}
              alt="Camera"
              className="w-full h-48 object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        )}

        {notification.aiDescription && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
            <Bot className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <p className="text-purple-200 text-sm">{notification.aiDescription}</p>
          </div>
        )}

        {notification.message && (
          <p className="mt-3 text-gray-300">{notification.message}</p>
        )}

        {notification.intercomSlug && (
          <Link
            href={`/intercom/${notification.intercomSlug}`}
            className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 rounded-xl text-emerald-400 font-medium transition-colors"
            onClick={onDismiss}
          >
            <Video className="w-5 h-5" />
            Zur Gegensprechanlage
          </Link>
        )}
      </div>

      {notification.timeout > 0 && (
        <div className="h-1 bg-gray-800">
          <div
            className={`h-full ${style.progress} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </motion.div>
  )
}

export function NotificationModal() {
  const { queue, dismiss } = useNotificationsStore()
  const currentNotification = queue[queue.length - 1]

  const handleDismiss = useCallback(() => {
    if (currentNotification) {
      dismiss(currentNotification.id)
    }
  }, [currentNotification, dismiss])

  useEffect(() => {
    if (currentNotification) {
      try {
        window.focus()
      } catch {}
    }
  }, [currentNotification])

  return (
    <AnimatePresence>
      {currentNotification && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4"
          onClick={handleDismiss}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <NotificationItem
              notification={currentNotification}
              onDismiss={handleDismiss}
            />
            {queue.length > 1 && (
              <div className="mt-2 text-center text-sm text-gray-400">
                +{queue.length - 1} weitere Benachrichtigungen
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
