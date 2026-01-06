'use client'

import { Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationsStore, useUnreadCount } from '@/lib/ui/notifications-store'

export function NotificationBell() {
  const toggleOpen = useNotificationsStore((s) => s.toggleOpen)
  const unreadCount = useUnreadCount()

  return (
    <button
      onClick={toggleOpen}
      className="relative p-2 rounded-xl hover:bg-white/10 transition-colors"
      aria-label={`Benachrichtigungen${unreadCount > 0 ? ` (${unreadCount} ungelesen)` : ''}`}
    >
      <Bell className="w-6 h-6 text-white" />
      <AnimatePresence>
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center"
          >
            <span className="text-[10px] font-bold text-white px-1">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  )
}
