import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DashboardNotification {
  id: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  tag?: string
  createdAt: number
  readAt?: number
  cameraEntity?: string
  aiDescription?: string
  intercomSlug?: string
}

interface DismissedEntry {
  hash: string
  dismissedAt: number
}

function hashNotification(tag: string, message: string): string {
  return `${tag}:${message}`.substring(0, 200)
}

interface NotificationsState {
  notifications: DashboardNotification[]
  dismissedRecently: DismissedEntry[]
  isOpen: boolean
  _hasHydrated: boolean
  show: (notification: Partial<DashboardNotification>) => void
  dismiss: (id: string) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clearAll: () => void
  toggleOpen: () => void
  setOpen: (open: boolean) => void
  setHasHydrated: (state: boolean) => void
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

const DISMISS_COOLDOWN_MS = 30 * 1000

const pendingNotifications: Partial<DashboardNotification>[] = []

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [],
      dismissedRecently: [],
      isOpen: false,
      _hasHydrated: false,
      
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state })
        if (state) {
          pendingNotifications.forEach((n) => get().show(n))
          pendingNotifications.length = 0
        }
      },

      show: (notification) => {
        if (!get()._hasHydrated) {
          pendingNotifications.push(notification)
          return
        }
        const title = typeof notification.title === 'string' ? notification.title : 'Hinweis'
        const message = typeof notification.message === 'string' ? notification.message : ''
        const severity = ['info', 'warning', 'critical'].includes(notification.severity || '') 
          ? (notification.severity as 'info' | 'warning' | 'critical')
          : 'info'
        const tag = typeof notification.tag === 'string' ? notification.tag : undefined
        const cameraEntity = typeof notification.cameraEntity === 'string' ? notification.cameraEntity : undefined
        const aiDescription = typeof notification.aiDescription === 'string' ? notification.aiDescription : undefined
        const intercomSlug = typeof notification.intercomSlug === 'string' ? notification.intercomSlug : undefined

        const now = Date.now()
        if (tag) {
          const notificationHash = hashNotification(tag, message)
          const recentlyDismissed = get().dismissedRecently.find(
            (d) => d.hash === notificationHash && (now - d.dismissedAt) < DISMISS_COOLDOWN_MS
          )
          if (recentlyDismissed) {
            return
          }
        }

        const newNotification: DashboardNotification = {
          id: generateId(),
          title,
          message,
          severity,
          tag,
          createdAt: now,
          cameraEntity,
          aiDescription,
          intercomSlug,
        }

        set((state) => {
          let newNotifications = [...state.notifications]
          
          if (tag) {
            const existingIndex = newNotifications.findIndex((n) => n.tag === tag)
            if (existingIndex >= 0) {
              const existing = newNotifications[existingIndex]
              if (existing.message === message && (now - existing.createdAt) < 5000) {
                return state
              }
              newNotifications = newNotifications.filter((n) => n.tag !== tag)
            }
          }
          
          newNotifications.unshift(newNotification)
          
          if (newNotifications.length > 50) {
            newNotifications = newNotifications.slice(0, 50)
          }
          
          const cleanedDismissed = state.dismissedRecently.filter(
            (d) => (now - d.dismissedAt) < DISMISS_COOLDOWN_MS
          )
          
          return { notifications: newNotifications, dismissedRecently: cleanedDismissed }
        })
      },

      dismiss: (id) => {
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id)
          const now = Date.now()
          const newDismissed = notification?.tag 
            ? [...state.dismissedRecently.filter((d) => (now - d.dismissedAt) < DISMISS_COOLDOWN_MS), { hash: hashNotification(notification.tag, notification.message), dismissedAt: now }]
            : state.dismissedRecently
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            dismissedRecently: newDismissed.slice(-50),
          }
        })
      },

      markRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, readAt: Date.now() } : n
          ),
        }))
      },

      markAllRead: () => {
        const now = Date.now()
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.readAt ? n : { ...n, readAt: now }
          ),
        }))
      },

      clearAll: () => {
        set({ notifications: [] })
      },

      toggleOpen: () => {
        set((state) => ({ isOpen: !state.isOpen }))
      },

      setOpen: (open) => {
        set({ isOpen: open })
      },
    }),
    {
      name: 'ha-dashboard-notifications',
      version: 3,
      partialize: (state) => ({
        notifications: state.notifications,
        dismissedRecently: state.dismissedRecently,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

export const useUnreadCount = () => 
  useNotificationsStore((s) => s.notifications.filter((n) => !n.readAt).length)

export const useHasUnread = () => 
  useNotificationsStore((s) => s.notifications.some((n) => !n.readAt))

export const useLatestUnread = () =>
  useNotificationsStore((s) => s.notifications.find((n) => !n.readAt))
