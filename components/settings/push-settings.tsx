'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Send, Loader2, AlertCircle, CheckCircle, User, Pencil } from 'lucide-react'
import { Card } from '@/components/ui/card'

const PUSH_USER_KEY = 'ha-dashboard-push-user'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer as ArrayBuffer
}

export function PushSettings() {
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [customName, setCustomName] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [vapidKey, setVapidKey] = useState<string | null>(null)
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default')
  
  const effectiveUser = customName || currentUser
  
  useEffect(() => {
    const savedName = localStorage.getItem(PUSH_USER_KEY)
    if (savedName) {
      setCustomName(savedName)
    }
    
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.name) {
          setCurrentUser(data.name.toLowerCase())
        }
      })
      .catch(console.error)
      .finally(() => setIsLoadingUser(false))
    
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermissionState('unsupported')
      return
    }
    
    setPermissionState(Notification.permission)
    
    fetch('/api/push/vapid')
      .then(res => res.json())
      .then(data => {
        if (data.publicKey) {
          setVapidKey(data.publicKey)
        }
      })
      .catch(console.error)
    
    checkSubscription()
  }, [])
  
  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (error) {
      console.error('Error checking subscription:', error)
    }
  }
  
  const handleSaveName = () => {
    if (customName.trim()) {
      localStorage.setItem(PUSH_USER_KEY, customName.trim().toLowerCase())
      setCustomName(customName.trim().toLowerCase())
    } else {
      localStorage.removeItem(PUSH_USER_KEY)
      setCustomName('')
    }
    setIsEditing(false)
  }
  
  const handleSubscribe = async () => {
    if (!effectiveUser) {
      setStatus({ type: 'error', message: 'Benutzer konnte nicht ermittelt werden.' })
      return
    }
    
    if (!vapidKey) {
      setStatus({ type: 'error', message: 'VAPID Key nicht konfiguriert. Bitte Secrets einrichten.' })
      return
    }
    
    setIsLoading(true)
    setStatus(null)
    
    try {
      const permission = await Notification.requestPermission()
      setPermissionState(permission)
      
      if (permission !== 'granted') {
        setStatus({ type: 'error', message: 'Benachrichtigungen wurden nicht erlaubt.' })
        setIsLoading(false)
        return
      }
      
      const registration = await navigator.serviceWorker.ready
      
      let subscription = await registration.pushManager.getSubscription()
      
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })
      }
      
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: effectiveUser,
          subscription: subscription.toJSON(),
        }),
      })
      
      if (response.ok) {
        setIsSubscribed(true)
        setStatus({ type: 'success', message: `Push-Benachrichtigungen aktiviert!` })
      } else {
        const data = await response.json()
        setStatus({ type: 'error', message: data.error || 'Fehler beim Aktivieren.' })
      }
    } catch (error) {
      console.error('Subscribe error:', error)
      setStatus({ type: 'error', message: 'Fehler beim Aktivieren der Benachrichtigungen.' })
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleUnsubscribe = async () => {
    setIsLoading(true)
    setStatus(null)
    
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: effectiveUser,
            endpoint: subscription.endpoint,
          }),
        })
        
        await subscription.unsubscribe()
      }
      
      setIsSubscribed(false)
      setStatus({ type: 'success', message: 'Push-Benachrichtigungen deaktiviert.' })
    } catch (error) {
      console.error('Unsubscribe error:', error)
      setStatus({ type: 'error', message: 'Fehler beim Deaktivieren.' })
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleTestPush = async () => {
    if (!effectiveUser) {
      setStatus({ type: 'error', message: 'Benutzer konnte nicht ermittelt werden.' })
      return
    }
    
    setIsLoading(true)
    setStatus(null)
    
    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: effectiveUser }),
      })
      
      if (response.ok) {
        setStatus({ type: 'success', message: 'Test-Benachrichtigung gesendet!' })
      } else {
        const data = await response.json()
        setStatus({ type: 'error', message: data.error || 'Fehler beim Senden.' })
      }
    } catch (error) {
      console.error('Test push error:', error)
      setStatus({ type: 'error', message: 'Fehler beim Senden der Test-Benachrichtigung.' })
    } finally {
      setIsLoading(false)
    }
  }
  
  if (permissionState === 'unsupported') {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-accent-orange" />
          <h3 className="font-semibold text-white">Push-Benachrichtigungen</h3>
        </div>
        <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200">
            <p className="font-medium">Nicht unterstützt</p>
            <p className="text-yellow-300/80 mt-1">
              Dein Browser unterstützt keine Push-Benachrichtigungen. 
              Auf dem iPhone musst du die App als PWA zum Homescreen hinzufügen.
            </p>
          </div>
        </div>
      </Card>
    )
  }
  
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="w-5 h-5 text-accent-orange" />
        <h3 className="font-semibold text-white">Push-Benachrichtigungen</h3>
      </div>
      
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-accent-cyan" />
            <span className="text-sm text-text-secondary">Push-Name:</span>
            {isLoadingUser ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder={currentUser || 'Name eingeben'}
                  className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="px-2 py-1 bg-accent-cyan/20 text-accent-cyan rounded text-sm"
                >
                  OK
                </button>
              </div>
            ) : (
              <>
                <span className="text-white font-medium capitalize">{effectiveUser || 'Unbekannt'}</span>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 hover:bg-white/10 rounded transition-colors"
                >
                  <Pencil className="w-3 h-3 text-text-secondary" />
                </button>
              </>
            )}
          </div>
          <p className="text-xs text-text-muted mt-2">
            Dieser Name wird für Push-Benachrichtigungen verwendet. Muss mit dem Namen in Home Assistant übereinstimmen.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {isSubscribed ? (
            <button
              onClick={handleUnsubscribe}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
              Push deaktivieren
            </button>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={isLoading || !effectiveUser}
              className="flex items-center gap-2 px-4 py-2 bg-accent-green/20 hover:bg-accent-green/30 text-accent-green rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
              Push aktivieren
            </button>
          )}
          
          {isSubscribed && (
            <button
              onClick={handleTestPush}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Test senden
            </button>
          )}
        </div>
        
        {status && (
          <div className={`flex items-start gap-2 p-3 rounded-lg ${
            status.type === 'success' 
              ? 'bg-green-500/10 border border-green-500/30' 
              : 'bg-red-500/10 border border-red-500/30'
          }`}>
            {status.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            )}
            <span className={`text-sm ${status.type === 'success' ? 'text-green-200' : 'text-red-200'}`}>
              {status.message}
            </span>
          </div>
        )}
        
        <p className="text-xs text-text-muted">
          Hinweis: Auf dem iPhone muss die App als PWA zum Home-Bildschirm hinzugefügt werden, 
          damit Push-Benachrichtigungen funktionieren.
        </p>
      </div>
    </Card>
  )
}
