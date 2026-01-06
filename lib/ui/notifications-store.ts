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

interface NotificationsState {
  notifications: DashboardNotification[]
  isOpen: boolean
  show: (notification: Partial<DashboardNotification>) => void
  dismiss: (id: string) => void
  markRead: (id: string) => void
  markAllRead: () => void
  clearAll: () => void
  toggleOpen: () => void
  setOpen: (open: boolean) => void
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [],
      isOpen: false,

      show: (notification) => {
        const title = typeof notification.title === 'string' ? notification.title : 'Hinweis'
        const message = typeof notification.message === 'string' ? notification.message : ''
        const severity = ['info', 'warning', 'critical'].includes(notification.severity || '') 
          ? (notification.severity as 'info' | 'warning' | 'critical')
          : 'info'
        const tag = typeof notification.tag === 'string' ? notification.tag : undefined
        const cameraEntity = typeof notification.cameraEntity === 'string' ? notification.cameraEntity : undefined
        const aiDescription = typeof notification.aiDescription === 'string' ? notification.aiDescription : undefined
        const intercomSlug = typeof notification.intercomSlug === 'string' ? notification.intercomSlug : undefined

        const newNotification: DashboardNotification = {
          id: generateId(),
          title,
          message,
          severity,
          tag,
          createdAt: Date.now(),
          cameraEntity,
          aiDescription,
          intercomSlug,
        }

        set((state) => {
          let newNotifications = [...state.notifications]
          
          if (tag) {
            newNotifications = newNotifications.filter((n) => n.tag !== tag)
          }
          
          newNotifications.unshift(newNotification)
          
          if (newNotifications.length > 50) {
            newNotifications = newNotifications.slice(0, 50)
          }
          
          return { notifications: newNotifications }
        })
      },

      dismiss: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }))
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
      version: 1,
      partialize: (state) => ({
        notifications: state.notifications,
      }),
    }
  )
)

export const useUnreadCount = () => 
  useNotificationsStore((s) => s.notifications.filter((n) => !n.readAt).length)

export const useHasUnread = () => 
  useNotificationsStore((s) => s.notifications.some((n) => !n.readAt))

export const useLatestUnread = () =>
  useNotificationsStore((s) => s.notifications.find((n) => !n.readAt))
