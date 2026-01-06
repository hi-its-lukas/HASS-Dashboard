'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, AlertTriangle, AlertCircle, Trash2, CheckCheck, Video } from 'lucide-react'
import { useNotificationsStore, DashboardNotification } from '@/lib/ui/notifications-store'
import Link from 'next/link'

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Gerade eben'
  if (minutes < 60) return `vor ${minutes} Min.`
  if (hours < 24) return `vor ${hours} Std.`
  return `vor ${days} Tag${days > 1 ? 'en' : ''}`
}

function NotificationCenterItem({ 
  notification, 
  onDismiss,
  onMarkRead 
}: { 
  notification: DashboardNotification
  onDismiss: () => void
  onMarkRead: () => void
}) {
  const severityStyles = {
    info: {
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/10',
      icon: <Bell className="w-4 h-4 text-cyan-400" />,
    },
    warning: {
      border: 'border-amber-500/30',
      bg: 'bg-amber-500/10',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    },
    critical: {
      border: 'border-red-500/30',
      bg: 'bg-red-500/10',
      icon: <AlertCircle className="w-4 h-4 text-red-400" />,
    },
  }

  const style = severityStyles[notification.severity]
  const isRead = !!notification.readAt

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      className={`relative p-3 rounded-xl border ${style.border} ${isRead ? 'opacity-60' : ''} ${style.bg}`}
      onClick={onMarkRead}
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-black/20">
          {style.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`font-medium text-sm ${isRead ? 'text-gray-400' : 'text-white'}`}>
              {notification.title}
            </h4>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDismiss()
              }}
              className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          {notification.message && (
            <p className={`text-xs mt-1 ${isRead ? 'text-gray-500' : 'text-gray-300'}`}>
              {notification.message}
            </p>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-gray-500">
              {formatTimeAgo(notification.createdAt)}
            </span>
            {notification.intercomSlug && (
              <Link
                href={`/intercom/${notification.intercomSlug}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
              >
                <Video className="w-3 h-3" />
                Intercom
              </Link>
            )}
          </div>
        </div>
        {!isRead && (
          <div className="absolute top-3 left-3 w-2 h-2 bg-blue-500 rounded-full" />
        )}
      </div>
    </motion.div>
  )
}

export function NotificationCenter() {
  const { notifications, isOpen, setOpen, dismiss, markRead, markAllRead, clearAll } = useNotificationsStore()

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, setOpen])

  const unreadCount = notifications.filter((n) => !n.readAt).length

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-16 right-4 z-50 w-[calc(100%-2rem)] max-w-md max-h-[70vh] bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  Benachrichtigungen
                  {unreadCount > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-400">
                      ({unreadCount} ungelesen)
                    </span>
                  )}
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              {notifications.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-400 bg-cyan-500/10 rounded-lg hover:bg-cyan-500/20 transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Alle gelesen
                    </button>
                  )}
                  <button
                    onClick={clearAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Alle löschen
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-y-auto max-h-[calc(70vh-120px)] p-4 space-y-2">
              <AnimatePresence mode="popLayout">
                {notifications.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-8"
                  >
                    <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Keine Benachrichtigungen</p>
                  </motion.div>
                ) : (
                  notifications.map((notification) => (
                    <NotificationCenterItem
                      key={notification.id}
                      notification={notification}
                      onDismiss={() => dismiss(notification.id)}
                      onMarkRead={() => markRead(notification.id)}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
