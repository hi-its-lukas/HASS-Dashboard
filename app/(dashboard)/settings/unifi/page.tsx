'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  Shield,
  Loader2,
  Save,
  ChevronDown,
  ChevronRight,
  Video,
  DoorOpen,
  Zap,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles
} from 'lucide-react'

interface UnifiConfig {
  controllerUrl: string
  username: string
  password: string
  cameras: string[]
  accessDevices: UnifiAccessDevice[]
  aiSurveillanceEnabled: boolean
}

interface UnifiCamera {
  id: string
  name: string
  type: string
  state: string
  host: string
}

interface UnifiAccessDevice {
  id: string
  name: string
  type: string
  doorId?: string
}

interface DiscoveredUnifi {
  cameras: UnifiCamera[]
  accessDevices: UnifiAccessDevice[]
}

export default function UnifiSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [discovered, setDiscovered] = useState<DiscoveredUnifi | null>(null)
  const [discoveringEntities, setDiscoveringEntities] = useState(false)
  const [config, setConfig] = useState<UnifiConfig>({
    controllerUrl: '',
    username: '',
    password: '',
    cameras: [],
    accessDevices: [],
    aiSurveillanceEnabled: true
  })
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    connection: true,
    cameras: true,
    access: true,
    surveillance: true
  })
  
  useEffect(() => {
    checkAuth()
    loadSettings()
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
        if (data.layoutConfig?.unifi) {
          setConfig(prev => ({
            ...prev,
            ...data.layoutConfig.unifi
          }))
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const testConnection = async () => {
    if (!config.controllerUrl || !config.username || !config.password) {
      setTestResult({ success: false, message: 'Bitte alle Felder ausfüllen' })
      return
    }
    
    setTesting(true)
    setTestResult(null)
    
    try {
      const res = await fetch('/api/unifi/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          controllerUrl: config.controllerUrl,
          username: config.username,
          password: config.password
        })
      })
      
      const data = await res.json()
      
      if (res.ok && data.success) {
        setTestResult({ success: true, message: `Verbunden! ${data.cameras || 0} Kameras, ${data.accessDevices || 0} Access-Geräte gefunden` })
      } else {
        setTestResult({ success: false, message: data.error || 'Verbindung fehlgeschlagen' })
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Netzwerkfehler' })
    } finally {
      setTesting(false)
    }
  }
  
  const discoverEntities = async () => {
    if (!config.controllerUrl || !config.username || !config.password) {
      return
    }
    
    setDiscoveringEntities(true)
    
    try {
      const res = await fetch('/api/unifi/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          controllerUrl: config.controllerUrl,
          username: config.username,
          password: config.password
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        setDiscovered(data)
      }
    } catch (error) {
      console.error('Failed to discover Unifi entities:', error)
    } finally {
      setDiscoveringEntities(false)
    }
  }
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }
  
  const toggleCamera = (cameraId: string) => {
    setConfig(prev => ({
      ...prev,
      cameras: prev.cameras.includes(cameraId)
        ? prev.cameras.filter(id => id !== cameraId)
        : [...prev.cameras, cameraId]
    }))
  }
  
  const toggleAccessDevice = (device: UnifiAccessDevice) => {
    setConfig(prev => {
      const exists = prev.accessDevices.some(d => d.id === device.id)
      return {
        ...prev,
        accessDevices: exists
          ? prev.accessDevices.filter(d => d.id !== device.id)
          : [...prev.accessDevices, device]
      }
    })
  }
  
  const saveConfig = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          layoutConfig: { 
            unifi: config 
          } 
        })
      })
      if (res.ok) {
        router.push('/settings')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
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
          <button 
            onClick={() => router.push('/settings')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <Shield className="w-8 h-8 text-purple-400" />
          <h1 className="text-2xl font-bold text-white">Unifi Protect / Access</h1>
        </div>
        
        <div className="bg-[#141b2d]/80 backdrop-blur-lg rounded-2xl p-6 border border-white/5 mb-6">
          <button
            onClick={() => toggleSection('connection')}
            className="w-full flex items-center justify-between mb-4"
          >
            <h2 className="text-lg font-semibold text-white">Controller-Verbindung</h2>
            {expandedSections.connection ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
          </button>
          
          {expandedSections.connection && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Controller URL</label>
                <input
                  type="url"
                  placeholder="https://192.168.1.1"
                  value={config.controllerUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, controllerUrl: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#1a2235] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                <p className="text-xs text-gray-500 mt-1">Die IP oder URL deines Unifi Controllers (UDM, UNVR, Cloud Key)</p>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Benutzername</label>
                <input
                  type="text"
                  placeholder="admin"
                  value={config.username}
                  onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#1a2235] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-2">Passwort</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={config.password}
                    onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-3 bg-[#1a2235] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={testConnection}
                  disabled={testing || !config.controllerUrl || !config.username || !config.password}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition-colors disabled:opacity-50"
                >
                  {testing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                  Verbindung testen
                </button>
                <button
                  onClick={discoverEntities}
                  disabled={discoveringEntities || !config.controllerUrl || !config.username || !config.password}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl transition-colors disabled:opacity-50"
                >
                  {discoveringEntities ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  Discover
                </button>
              </div>
              
              {testResult && (
                <div className={`flex items-center gap-3 p-4 rounded-xl ${testResult.success ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  {testResult.success ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className={testResult.success ? 'text-emerald-400' : 'text-red-400'}>
                    {testResult.message}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="bg-[#141b2d]/80 backdrop-blur-lg rounded-2xl p-6 border border-white/5 mb-6">
          <button
            onClick={() => toggleSection('cameras')}
            className="w-full flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-3">
              <Video className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-semibold text-white">Protect Kameras {discovered ? `(${config.cameras.length}/${discovered.cameras.length})` : ''}</h2>
            </div>
            {expandedSections.cameras ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
          </button>
          
          {expandedSections.cameras && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {!discovered ? (
                <p className="text-gray-500 text-sm">Klicke auf "Discover" um Kameras zu laden</p>
              ) : discovered.cameras.length === 0 ? (
                <p className="text-gray-500 text-sm">Keine Kameras gefunden</p>
              ) : (
                discovered.cameras.map(camera => (
                  <label key={camera.id} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.cameras.includes(camera.id)}
                      onChange={() => toggleCamera(camera.id)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <span className="text-white">{camera.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{camera.type}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded ${camera.state === 'CONNECTED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {camera.state === 'CONNECTED' ? 'Online' : 'Offline'}
                    </span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>
        
        <div className="bg-[#141b2d]/80 backdrop-blur-lg rounded-2xl p-6 border border-white/5 mb-6">
          <button
            onClick={() => toggleSection('access')}
            className="w-full flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-3">
              <DoorOpen className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-semibold text-white">Access Intercoms {discovered ? `(${config.accessDevices.length}/${discovered.accessDevices.length})` : ''}</h2>
            </div>
            {expandedSections.access ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
          </button>
          
          {expandedSections.access && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              <p className="text-sm text-gray-400 mb-3">
                Wähle Access Reader aus, die als Intercoms in der Sidebar erscheinen sollen.
              </p>
              {!discovered ? (
                <p className="text-gray-500 text-sm">Klicke auf "Discover" um Access-Geräte zu laden</p>
              ) : discovered.accessDevices.length === 0 ? (
                <p className="text-gray-500 text-sm">Keine Access-Geräte gefunden</p>
              ) : (
                discovered.accessDevices.map(device => (
                  <label key={device.id} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.accessDevices.some(d => d.id === device.id)}
                      onChange={() => toggleAccessDevice(device)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div className="flex-1">
                      <span className="text-white">{device.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{device.type}</span>
                    </div>
                  </label>
                ))
              )}
            </div>
          )}
        </div>
        
        <div className="bg-[#141b2d]/80 backdrop-blur-lg rounded-2xl p-6 border border-white/5 mb-6">
          <button
            onClick={() => toggleSection('surveillance')}
            className="w-full flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">AI Surveillance</h2>
            </div>
            {expandedSections.surveillance ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
          </button>
          
          {expandedSections.surveillance && (
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.aiSurveillanceEnabled}
                  onChange={(e) => setConfig(prev => ({ ...prev, aiSurveillanceEnabled: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <span className="text-white font-medium">AI Surveillance aktivieren</span>
                  <p className="text-xs text-gray-400 mt-1">
                    Zeigt Personen-, Fahrzeug- und Paketerkennungen von Unifi Protect
                  </p>
                </div>
              </label>
              
              {config.aiSurveillanceEnabled && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-sm text-amber-400">
                    Die AI Surveillance Seite wird in der Sidebar erscheinen und Echtzeit-Events von Unifi Protect anzeigen.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/settings')}
            className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Speichern
          </button>
        </div>
      </div>
    </div>
  )
}
