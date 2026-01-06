'use client'

import { useEffect } from 'react'
import { useNotificationsStore } from '@/lib/ui/notifications-store'

interface PushMessage {
  type: 'PUSH_NOTIFICATION'
  payload: {
    title: string
    message: string
    severity?: 'info' | 'warning' | 'critical'
    tag?: string
    cameraEntity?: string
    aiDescription?: string
    intercomSlug?: string
  }
}

export function usePushListener() {
  const showNotification = useNotificationsStore((s) => s.show)
  
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }
    
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as PushMessage
      
      if (data?.type === 'PUSH_NOTIFICATION' && data.payload) {
        showNotification({
          title: data.payload.title,
          message: data.payload.message,
          severity: data.payload.severity || 'info',
          tag: data.payload.tag,
          cameraEntity: data.payload.cameraEntity,
          aiDescription: data.payload.aiDescription,
          intercomSlug: data.payload.intercomSlug,
        })
      }
    }
    
    navigator.serviceWorker.addEventListener('message', handleMessage)
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [showNotification])
}
