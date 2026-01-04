import { create } from 'zustand'

export interface DashboardNotification {
  id: string
  title: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  timeout: number
  tag?: string
  createdAt: Date
  cameraEntity?: string
  aiDescription?: string
  intercomSlug?: string
}

interface NotificationsState {
  queue: DashboardNotification[]
  show: (notification: Partial<DashboardNotification>) => void
  dismiss: (id: string) => void
  clearAll: () => void
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  queue: [],

  show: (notification) => {
    const title = typeof notification.title === 'string' ? notification.title : 'Hinweis'
    const message = typeof notification.message === 'string' ? notification.message : ''
    const severity = ['info', 'warning', 'critical'].includes(notification.severity || '') 
      ? (notification.severity as 'info' | 'warning' | 'critical')
      : 'info'
    const timeout = typeof notification.timeout === 'number' 
      ? Math.max(0, Math.min(notification.timeout, 120000))
      : 15000
    const tag = typeof notification.tag === 'string' ? notification.tag : undefined
    const cameraEntity = typeof notification.cameraEntity === 'string' ? notification.cameraEntity : undefined
    const aiDescription = typeof notification.aiDescription === 'string' ? notification.aiDescription : undefined
    const intercomSlug = typeof notification.intercomSlug === 'string' ? notification.intercomSlug : undefined

    const newNotification: DashboardNotification = {
      id: generateId(),
      title,
      message,
      severity,
      timeout,
      tag,
      createdAt: new Date(),
      cameraEntity,
      aiDescription,
      intercomSlug,
    }

    set((state) => {
      let newQueue = [...state.queue]
      
      if (tag) {
        newQueue = newQueue.filter((n) => n.tag !== tag)
      }
      
      newQueue.push(newNotification)
      
      if (newQueue.length > 5) {
        newQueue = newQueue.slice(-5)
      }
      
      return { queue: newQueue }
    })
  },

  dismiss: (id) => {
    set((state) => ({
      queue: state.queue.filter((n) => n.id !== id),
    }))
  },

  clearAll: () => {
    set({ queue: [] })
  },
}))
