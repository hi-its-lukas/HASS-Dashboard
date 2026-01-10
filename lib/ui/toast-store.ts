import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  show: (message: string, type?: Toast['type'], duration?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
  dismiss: (id: string) => void
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  show: (message, type = 'info', duration = 4000) => {
    const id = generateId()
    const toast: Toast = { id, message, type, duration }
    
    set((state) => ({
      toasts: [...state.toasts, toast].slice(-5)
    }))

    if (duration > 0) {
      setTimeout(() => {
        get().dismiss(id)
      }, duration)
    }
  },

  success: (message) => get().show(message, 'success', 3000),
  error: (message) => get().show(message, 'error', 5000),
  warning: (message) => get().show(message, 'warning', 4000),
  info: (message) => get().show(message, 'info', 4000),

  dismiss: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
  },
}))
