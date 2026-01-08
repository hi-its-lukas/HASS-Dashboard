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
  Sparkles,
  Key
} from 'lucide-react'

interface UnifiConfig {
  controllerUrl: string
  protectApiKey: string
  accessApiKey: string
  cameras: string[]
  accessDevices: UnifiAccessDevice[]
  aiSurveillanceEnabled: boolean
  _hasProtectKey?: boolean
  _hasAccessKey?: boolean
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
  const [canEditGlobalSettings, setCanEditGlobalSettings] = useState(false)
  const [testingProtect, setTestingProtect] = useState(false)
  const [testingAccess, setTestingAccess] = useState(false)
  const [protectResult, setProtectResult] = useState<{ success: boolean; message: string } | null>(null)
  const [accessResult, setAccessResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showProtectKey, setShowProtectKey] = useState(false)
  const [showAccessKey, setShowAccessKey] = useState(false)
  const [discovered, setDiscovered] = useState<DiscoveredUnifi | null>(null)
  const [discoveringEntities, setDiscoveringEntities] = useState(false)
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null)
  const [config, setConfig] = useState<UnifiConfig>({
    controllerUrl: '',
    protectApiKey: '',
    accessApiKey: '',
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
        setCanEditGlobalSettings(data.canEditGlobalSettings ?? false)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const testProtectConnection = async () => {
    const hasNewKey = config.protectApiKey && !config.protectApiKey.includes('••••')
    const hasSavedKey = config._hasProtectKey
    
    if (!config.controllerUrl || (!hasNewKey && !hasSavedKey)) {
      setProtectResult({ success: false, message: 'Controller-URL und Protect API Key erforderlich' })
      return
    }
    
    setTestingProtect(true)
    setProtectResult(null)
    
    try {
      let res: Response
      
      if (hasNewKey) {
        res = await fetch('/api/unifi/protect/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            controllerUrl: config.controllerUrl,
            apiKey: config.protectApiKey
          })
        })
      } else {
        res = await fetch('/api/unifi/protect/test-saved', {
          method: 'POST'
        })
      }
      
      const data = await res.json()
      setProtectResult({
        success: res.ok,
        message: res.ok ? `Verbunden! ${data.cameras || 0} Kameras gefunden` : (data.error || 'Verbindung fehlgeschlagen')
      })
    } catch (error) {
      setProtectResult({ success: false, message: 'Netzwerkfehler' })
    } finally {
      setTestingProtect(false)
    }
  }
  
  const testAccessConnection = async () => {
    const hasNewKey = config.accessApiKey && !config.accessApiKey.includes('••••')
    const hasSavedKey = config._hasAccessKey
    
    if (!config.controllerUrl || (!hasNewKey && !hasSavedKey)) {
      setAccessResult({ success: false, message: 'Controller-URL und Access API Key erforderlich' })
      return
    }
    
    setTestingAccess(true)
    setAccessResult(null)
    
    try {
      let res: Response
      
      if (hasNewKey) {
        res = await fetch('/api/unifi/access/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            controllerUrl: config.controllerUrl,
            apiKey: config.accessApiKey
          })
        })
      } else {
        res = await fetch('/api/unifi/access/test-saved', {
          method: 'POST'
        })
      }
      
      const data = await res.json()
      setAccessResult({
        success: res.ok,
        message: res.ok ? `Verbunden! ${data.doors || 0} Türen gefunden` : (data.error || 'Verbindung fehlgeschlagen')
      })
    } catch (error) {
      setAccessResult({ success: false, message: 'Netzwerkfehler' })
    } finally {
      setTestingAccess(false)
    }
  }
  
  const discoverEntities = async () => {
    if (!config.controllerUrl) {
      return
    }
    
    setDiscoveringEntities(true)
    
    try {
      const hasNewProtectKey = config.protectApiKey && !config.protectApiKey.includes('••••')
      const hasNewAccessKey = config.accessApiKey && !config.accessApiKey.includes('••••')
      const useSavedKeys = !hasNewProtectKey && !hasNewAccessKey && (config._hasProtectKey || config._hasAccessKey)
      
      let res: Response
      
      if (useSavedKeys) {
        res = await fetch('/api/unifi/discover-saved', {
          method: 'POST'
        })
      } else {
        res = await fetch('/api/unifi/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            controllerUrl: config.controllerUrl,
            protectApiKey: hasNewProtectKey ? config.protectApiKey : undefined,
            accessApiKey: hasNewAccessKey ? config.accessApiKey : undefined
          })
        })
      }
      
      if (res.ok) {
        const data = await res.json()
        setDiscovered(data)
      }
    } catch (error) {
      console.error('Discovery failed:', error)
    } finally {
      setDiscoveringEntities(false)
    }
  }
  
  const saveSettings = async () => {
    alert('Speichern gestartet...')
    console.log('[UniFi] saveSettings called, canEditGlobalSettings:', canEditGlobalSettings)
    console.log('[UniFi] config to save:', JSON.stringify(config, null, 2))
    setSaving(true)
    setSaveResult(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layoutConfig: { unifi: config }
        })
      })
      
      if (res.ok) {
        setSaveResult({ success: true, message: 'Einstellungen gespeichert!' })
      } else {
        const data = await res.json().catch(() => ({}))
        setSaveResult({ 
          success: false, 
          message: data.error || `Fehler beim Speichern (${res.status})`
        })
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveResult({ success: false, message: 'Netzwerkfehler beim Speichern' })
    } finally {
      setSaving(false)
    }
  }
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
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
    setConfig(prev => ({
      ...prev,
      accessDevices: prev.accessDevices.some(d => d.id === device.id)
        ? prev.accessDevices.filter(d => d.id !== device.id)
        : [...prev.accessDevices, device]
    }))
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
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <Shield className="w-8 h-8 text-purple-400" />
          <h1 className="text-2xl font-bold text-white">UniFi Protect & Access</h1>
        </div>
        
        <div className="bg-[#141b2d]/80 backdrop-blur-lg rounded-2xl border border-white/5 mb-6 overflow-hidden">
          <button
            onClick={() => toggleSection('connection')}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">API-Verbindung</span>
            </div>
            {expandedSections.connection ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {expandedSections.connection && (
            <div className="p-4 pt-0 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Controller URL</label>
                <input
                  type="text"
                  value={config.controllerUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, controllerUrl: e.target.value }))}
                  placeholder="https://192.168.1.1"
                  className="w-full px-4 py-3 bg-[#1a2235] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  IP-Adresse oder Hostname deines UniFi-Controllers (z.B. https://192.168.1.1)
                </p>
              </div>
              
              <div className="border-t border-white/10 pt-4">
                <label className="block text-sm text-gray-400 mb-2">
                  <Video className="w-4 h-4 inline mr-2" />
                  UniFi Protect API Key
                  {config._hasProtectKey && (
                    <span className="ml-2 text-emerald-400 text-xs">(gespeichert)</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showProtectKey ? 'text' : 'password'}
                    value={config.protectApiKey}
                    onChange={(e) => setConfig(prev => ({ ...prev, protectApiKey: e.target.value, _hasProtectKey: false }))}
                    placeholder={config._hasProtectKey ? "Neuen Key eingeben oder leer lassen" : "Protect API Key eingeben"}
                    className="w-full px-4 py-3 pr-20 bg-[#1a2235] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowProtectKey(!showProtectKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                  >
                    {showProtectKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Erstelle den Key unter: Protect → Settings → Control Plane → Integrations → Generate API Key
                </p>
                
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={testProtectConnection}
                    disabled={testingProtect || !canEditGlobalSettings}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {testingProtect ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    Protect testen
                  </button>
                  
                  {protectResult && (
                    <div className={`flex items-center gap-2 text-sm ${protectResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                      {protectResult.success ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      {protectResult.message}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="border-t border-white/10 pt-4">
                <label className="block text-sm text-gray-400 mb-2">
                  <DoorOpen className="w-4 h-4 inline mr-2" />
                  UniFi Access API Key
                  {config._hasAccessKey && (
                    <span className="ml-2 text-emerald-400 text-xs">(gespeichert)</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showAccessKey ? 'text' : 'password'}
                    value={config.accessApiKey}
                    onChange={(e) => setConfig(prev => ({ ...prev, accessApiKey: e.target.value, _hasAccessKey: false }))}
                    placeholder={config._hasAccessKey ? "Neuen Key eingeben oder leer lassen" : "Access API Key eingeben"}
                    className="w-full px-4 py-3 pr-20 bg-[#1a2235] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAccessKey(!showAccessKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                  >
                    {showAccessKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Erstelle den Key unter: Access → Settings → General → Advanced → API Token → Create New
                </p>
                
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={testAccessConnection}
                    disabled={testingAccess || !canEditGlobalSettings}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {testingAccess ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    Access testen
                  </button>
                  
                  {accessResult && (
                    <div className={`flex items-center gap-2 text-sm ${accessResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                      {accessResult.success ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      {accessResult.message}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="border-t border-white/10 pt-4">
                <button
                  onClick={discoverEntities}
                  disabled={discoveringEntities || (!config.protectApiKey && !config.accessApiKey) || !canEditGlobalSettings}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors disabled:opacity-50"
                >
                  {discoveringEntities ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Geräte entdecken
                </button>
              </div>
            </div>
          )}
        </div>
        
        {discovered && discovered.cameras.length > 0 && (
          <div className="bg-[#141b2d]/80 backdrop-blur-lg rounded-2xl border border-white/5 mb-6 overflow-hidden">
            <button
              onClick={() => toggleSection('cameras')}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Video className="w-5 h-5 text-cyan-400" />
                <span className="text-white font-medium">Protect Kameras ({discovered.cameras.length})</span>
              </div>
              {expandedSections.cameras ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            {expandedSections.cameras && (
              <div className="p-4 pt-0 space-y-2">
                {discovered.cameras.map(camera => (
                  <div
                    key={camera.id}
                    onClick={() => toggleCamera(camera.id)}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={config.cameras.includes(camera.id)}
                      onChange={() => {}}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 rounded bg-white/10 border-white/20 text-purple-500 focus:ring-purple-500/50 pointer-events-none"
                    />
                    <div className="flex-1">
                      <div className="text-white">{camera.name}</div>
                      <div className="text-xs text-gray-500">{camera.type} • {camera.state}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {discovered && discovered.accessDevices.length > 0 && (
          <div className="bg-[#141b2d]/80 backdrop-blur-lg rounded-2xl border border-white/5 mb-6 overflow-hidden">
            <button
              onClick={() => toggleSection('access')}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <DoorOpen className="w-5 h-5 text-orange-400" />
                <span className="text-white font-medium">Access Türen ({discovered.accessDevices.length})</span>
              </div>
              {expandedSections.access ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            {expandedSections.access && (
              <div className="p-4 pt-0 space-y-2">
                {discovered.accessDevices.map(device => (
                  <div
                    key={device.id}
                    onClick={() => toggleAccessDevice(device)}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={config.accessDevices.some(d => d.id === device.id)}
                      onChange={() => {}}
                      onClick={(e) => e.stopPropagation()}
                      className="w-5 h-5 rounded bg-white/10 border-white/20 text-purple-500 focus:ring-purple-500/50 pointer-events-none"
                    />
                    <div className="flex-1">
                      <div className="text-white">{device.name}</div>
                      <div className="text-xs text-gray-500">{device.type}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        <div className="bg-[#141b2d]/80 backdrop-blur-lg rounded-2xl border border-white/5 mb-6 overflow-hidden">
          <button
            onClick={() => toggleSection('surveillance')}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="text-white font-medium">AI Surveillance</span>
            </div>
            {expandedSections.surveillance ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {expandedSections.surveillance && (
            <div className="p-4 pt-0">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.aiSurveillanceEnabled}
                  onChange={(e) => setConfig(prev => ({ ...prev, aiSurveillanceEnabled: e.target.checked }))}
                  className="w-5 h-5 rounded bg-white/10 border-white/20 text-amber-500 focus:ring-amber-500/50"
                />
                <div>
                  <div className="text-white">AI Surveillance aktivieren</div>
                  <div className="text-xs text-gray-500">
                    Zeigt Smart Detection Events (Personen, Fahrzeuge, Pakete) in der Sidebar
                  </div>
                </div>
              </label>
            </div>
          )}
        </div>
        
        {saveResult && (
          <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${
            saveResult.success 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            {saveResult.success ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{saveResult.message}</span>
          </div>
        )}
        
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/settings')}
            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={saveSettings}
            disabled={saving || !canEditGlobalSettings}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Speichern
          </button>
        </div>
        {!canEditGlobalSettings && (
          <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-400 text-sm text-center">
              Diese Einstellungen sind global und können nur von Administratoren geändert werden.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
