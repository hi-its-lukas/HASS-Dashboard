'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Settings, 
  Loader2,
  Upload,
  Image,
  Trash2,
  Pencil,
  Home as HomeIcon,
  Server,
  Shield,
  ChevronRight,
  CheckCircle,
  XCircle,
  Users
} from 'lucide-react'
import { PushSettings } from '@/components/settings/push-settings'

interface ConnectionStatus {
  ha: { connected: boolean; version?: string }
  unifi: { connected: boolean; cameras?: number; accessDevices?: number }
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [uploadingBackground, setUploadingBackground] = useState(false)
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [dashboardTitle, setDashboardTitle] = useState('HA Dashboard')
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)
  
  useEffect(() => {
    checkAuth()
    loadSettings()
    checkConnectionStatus()
  }, [])
  
  const checkAuth = async () => {
    const res = await fetch('/api/me')
    if (!res.ok) {
      router.push('/login')
    }
  }
  
  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        if (data.layoutConfig) {
          if (data.layoutConfig.backgroundUrl) {
            setBackgroundUrl(data.layoutConfig.backgroundUrl)
          }
          if (data.layoutConfig.dashboardTitle) {
            setDashboardTitle(data.layoutConfig.dashboardTitle)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const checkConnectionStatus = async () => {
    setCheckingStatus(true)
    try {
      const [haRes, unifiRes] = await Promise.all([
        fetch('/api/status').catch(() => null),
        fetch('/api/unifi/status').catch(() => null)
      ])
      
      const haData = haRes?.ok ? await haRes.json() : { connected: false }
      const unifiData = unifiRes?.ok ? await unifiRes.json() : { connected: false }
      
      setConnectionStatus({
        ha: haData,
        unifi: unifiData
      })
    } catch (error) {
      setConnectionStatus({
        ha: { connected: false },
        unifi: { connected: false }
      })
    } finally {
      setCheckingStatus(false)
    }
  }
  
  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploadingBackground(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const res = await fetch('/api/upload/background', {
        method: 'POST',
        body: formData,
      })
      
      if (res.ok) {
        const data = await res.json()
        setBackgroundUrl(data.url)
        await saveBackgroundUrl(data.url)
      }
    } catch (error) {
      console.error('Failed to upload background:', error)
    } finally {
      setUploadingBackground(false)
    }
  }
  
  const handleRemoveBackground = async () => {
    try {
      await fetch('/api/upload/background', { method: 'DELETE' })
      setBackgroundUrl(null)
      await saveBackgroundUrl(null)
    } catch (error) {
      console.error('Failed to remove background:', error)
    }
  }
  
  const saveBackgroundUrl = async (url: string | null) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layoutConfig: { backgroundUrl: url } })
      })
    } catch (error) {
      console.error('Failed to save background URL:', error)
    }
  }
  
  const saveDashboardTitle = async (title: string) => {
    try {
      localStorage.setItem('ha-dashboard-title', title)
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layoutConfig: { dashboardTitle: title } })
      })
    } catch (error) {
      console.error('Failed to save dashboard title:', error)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a1f2e] to-[#0d1117] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1f2e] to-[#0d1117] p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-8 h-8 text-white" />
          <h1 className="text-2xl font-bold text-white">Einstellungen</h1>
        </div>
        
        <div className="bg-[#141b2d]/80 backdrop-blur-lg rounded-2xl p-6 border border-white/5 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Verbindungen</h2>
          
          <div className="space-y-3">
            <Link 
              href="/settings/homeassistant"
              className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <HomeIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Home Assistant</h3>
                  <p className="text-sm text-gray-400">Entitäten, Kameras, Sensoren</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {checkingStatus ? (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                ) : connectionStatus?.ha.connected ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs text-emerald-400">Verbunden</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span className="text-xs text-red-400">Nicht verbunden</span>
                  </div>
                )}
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </div>
            </Link>
            
            <Link 
              href="/settings/unifi"
              className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Unifi Protect / Access</h3>
                  <p className="text-sm text-gray-400">Kameras, Türklingeln, AI Surveillance</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {checkingStatus ? (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                ) : connectionStatus?.unifi.connected ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs text-emerald-400">Verbunden</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Nicht konfiguriert</span>
                  </div>
                )}
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </div>
            </Link>
            
            <Link 
              href="/settings/users"
              className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-white font-medium">Benutzerverwaltung</h3>
                  <p className="text-sm text-gray-400">Benutzer, Rollen, Berechtigungen</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
              </div>
            </Link>
          </div>
        </div>
        
        <div className="bg-[#141b2d]/80 backdrop-blur-lg rounded-2xl p-6 border border-white/5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Pencil className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Dashboard-Titel</h2>
          </div>
          
          <input
            type="text"
            value={dashboardTitle}
            onChange={(e) => setDashboardTitle(e.target.value)}
            onBlur={(e) => saveDashboardTitle(e.target.value)}
            placeholder="HA Dashboard"
            className="w-full px-4 py-3 bg-[#1a2235] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
          <p className="text-xs text-gray-500 mt-2">
            Der Titel wird in der Sidebar und auf der Login-Seite angezeigt
          </p>
        </div>
        
        <div className="bg-[#141b2d]/80 backdrop-blur-lg rounded-2xl p-6 border border-white/5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Image className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">Hintergrundbild</h2>
          </div>
          
          {backgroundUrl ? (
            <div className="relative">
              <img
                src={backgroundUrl}
                alt="Background preview"
                className="w-full h-32 object-cover rounded-xl"
              />
              <button
                onClick={handleRemoveBackground}
                className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition-colors">
              {uploadingBackground ? (
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-400">Bild hochladen</span>
                  <span className="text-xs text-gray-500 mt-1">JPG, PNG, WebP (max 10MB)</span>
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleBackgroundUpload}
                className="hidden"
                disabled={uploadingBackground}
              />
            </label>
          )}
        </div>
        
        <div className="mb-6">
          <PushSettings />
        </div>
        
        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Zurück zum Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
