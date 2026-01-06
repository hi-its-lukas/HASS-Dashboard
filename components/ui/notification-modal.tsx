'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, AlertTriangle, AlertCircle, Bot, Video } from 'lucide-react'
import { useNotificationsStore, useLatestUnread, DashboardNotification } from '@/lib/ui/notifications-store'
import Link from 'next/link'

function NotificationItem({ notification, onDismiss }: { 
  notification: DashboardNotification
  onDismiss: () => void 
}) {
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

  const severityStyles = {
    info: {
      border: 'border-cyan-500/50',
      bg: 'bg-cyan-500/10',
      icon: <Bell className="w-5 h-5 text-cyan-400" />,
    },
    warning: {
      border: 'border-amber-500/50',
      bg: 'bg-amber-500/10',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    },
    critical: {
      border: 'border-red-500/50',
      bg: 'bg-red-500/10',
      icon: <AlertCircle className="w-5 h-5 text-red-400 animate-pulse" />,
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
    </motion.div>
  )
}

export function NotificationModal() {
  const { notifications, markRead, setOpen } = useNotificationsStore()
  const latestUnread = useLatestUnread()
  const unreadCount = notifications.filter((n) => !n.readAt).length

  const handleDismiss = useCallback(() => {
    if (latestUnread) {
      markRead(latestUnread.id)
    }
  }, [latestUnread, markRead])

  const handleOpenAll = useCallback(() => {
    if (latestUnread) {
      markRead(latestUnread.id)
    }
    setOpen(true)
  }, [latestUnread, markRead, setOpen])

  useEffect(() => {
    if (latestUnread) {
      try {
        window.focus()
      } catch {}
    }
  }, [latestUnread])

  return (
    <AnimatePresence>
      {latestUnread && (
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
              notification={latestUnread}
              onDismiss={handleDismiss}
            />
            {unreadCount > 1 && (
              <button
                onClick={handleOpenAll}
                className="mt-2 w-full text-center text-sm text-cyan-400 hover:text-cyan-300 py-2 bg-gray-900/80 rounded-xl border border-white/10 transition-colors"
              >
                +{unreadCount - 1} weitere Benachrichtigungen anzeigen
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
