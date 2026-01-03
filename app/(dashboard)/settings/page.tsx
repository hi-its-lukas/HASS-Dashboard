'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Settings, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Users,
  Lightbulb,
  LayoutGrid,
  Zap,
  Save,
  LogOut,
  ChevronDown,
  ChevronRight,
  Upload,
  Image,
  Trash2,
  Play,
  Plus,
  X,
  Video,
  DoorOpen
} from 'lucide-react'

interface ConnectionStatus {
  connected: boolean
  version?: string
  instanceUrl?: string
  lastCheck?: string
  error?: string
}

interface DiscoveredEntities {
  persons: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  lights: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  covers: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  scripts: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  scenes: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  switches: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  sensors: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  alarms: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  weather: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
}

interface IntercomConfig {
  id: string
  name: string
  slug: string
  cameraEntityId: string
  speakUrl?: string
  lockEntityId?: string
}

interface LayoutConfig {
  persons: string[]
  lights: string[]
  covers: string[]
  customButtons: Array<{
    id: string
    label: string
    icon: string
    domain: string
    service: string
    entityId?: string
    data?: Record<string, unknown>
  }>
  intercoms?: IntercomConfig[]
  weatherEntityId?: string
  alarmEntityId?: string
  powerEntityId?: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [discovered, setDiscovered] = useState<DiscoveredEntities | null>(null)
  const [discoveringEntities, setDiscoveringEntities] = useState(false)
  const [config, setConfig] = useState<LayoutConfig>({
    persons: [],
    lights: [],
    covers: [],
    customButtons: [],
  })
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    persons: true,
    lights: true,
    covers: false,
    buttons: false,
    intercoms: false
  })
  const [newIntercom, setNewIntercom] = useState({ name: '', cameraEntityId: '', speakUrl: '', lockEntityId: '' })
  const [uploadingBackground, setUploadingBackground] = useState(false)
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  
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
          setConfig(data.layoutConfig)
          if (data.layoutConfig.backgroundUrl) {
            setBackgroundUrl(data.layoutConfig.backgroundUrl)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setLoading(false)
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
    } catch (error) {
      console.error('Failed to remove background:', error)
    }
  }
  
  const checkConnectionStatus = async () => {
    setCheckingStatus(true)
    try {
      const res = await fetch('/api/status')
      const data = await res.json()
      setStatus(data)
    } catch (error) {
      setStatus({ connected: false, error: 'Failed to check status' })
    } finally {
      setCheckingStatus(false)
    }
  }
  
  const discoverEntities = async () => {
    setDiscoveringEntities(true)
    try {
      const res = await fetch('/api/ha/registries')
      if (res.ok) {
        const data = await res.json()
        setDiscovered(data.discovered)
      }
    } catch (error) {
      console.error('Failed to discover entities:', error)
    } finally {
      setDiscoveringEntities(false)
    }
  }
  
  const saveSettings = async () => {
    setSaving(true)
    try {
      const layoutConfig = {
        ...config,
        backgroundUrl: backgroundUrl || undefined
      }
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layoutConfig })
      })
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSaving(false)
    }
  }
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }
  
  const toggleEntity = (type: 'persons' | 'lights' | 'covers', entityId: string) => {
    setConfig(prev => ({
      ...prev,
      [type]: prev[type].includes(entityId)
        ? prev[type].filter(id => id !== entityId)
        : [...prev[type], entityId]
    }))
  }
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }
  
  const getFriendlyName = (entity: { entity_id: string; attributes: Record<string, unknown> }) => {
    return (entity.attributes.friendly_name as string) || entity.entity_id.split('.')[1]
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-[#0a0f1a] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-emerald-500" />
            <h1 className="text-2xl font-bold text-white">Settings</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded-xl transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
        
        <div className="bg-[#141b2d]/80 backdrop-blur-lg rounded-2xl p-6 border border-white/5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Connection Status</h2>
            <button
              onClick={checkConnectionStatus}
              disabled={checkingStatus}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${checkingStatus ? 'animate-spin' : ''}`} />
              Check
            </button>
          </div>
          
          {status && (
            <div className={`flex items-center gap-3 p-4 rounded-xl ${status.connected ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
              {status.connected ? (
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400" />
              )}
              <div>
                <p className={status.connected ? 'text-emerald-400' : 'text-red-400'}>
                  {status.connected ? 'Connected' : 'Not Connected'}
                </p>
                {status.version && (
                  <p className="text-sm text-gray-400">Home Assistant {status.version}</p>
                )}
                {status.error && (
                  <p className="text-sm text-red-400">{status.error}</p>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-[#141b2d]/80 backdrop-blur-lg rounded-2xl p-6 border border-white/5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Entity Discovery</h2>
            <button
              onClick={discoverEntities}
              disabled={discoveringEntities}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors text-sm"
            >
              {discoveringEntities ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Discover
            </button>
          </div>
          
          {discovered && (
            <div className="space-y-4">
              <div className="border border-white/5 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('persons')}
                  className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-medium">Persons ({discovered.persons.length})</span>
                  </div>
                  {expandedSections.persons ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                </button>
                {expandedSections.persons && (
                  <div className="p-4 space-y-2">
                    {discovered.persons.map(entity => (
                      <label key={entity.entity_id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.persons.includes(entity.entity_id)}
                          onChange={() => toggleEntity('persons', entity.entity_id)}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-gray-300">{getFriendlyName(entity)}</span>
                        <span className="text-xs text-gray-500">{entity.entity_id}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="border border-white/5 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('lights')}
                  className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Lightbulb className="w-5 h-5 text-yellow-400" />
                    <span className="text-white font-medium">Lights ({discovered.lights.length})</span>
                  </div>
                  {expandedSections.lights ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                </button>
                {expandedSections.lights && (
                  <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                    {discovered.lights.map(entity => (
                      <label key={entity.entity_id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.lights.includes(entity.entity_id)}
                          onChange={() => toggleEntity('lights', entity.entity_id)}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-gray-300">{getFriendlyName(entity)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${entity.state === 'on' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {entity.state}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="border border-white/5 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('covers')}
                  className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <LayoutGrid className="w-5 h-5 text-purple-400" />
                    <span className="text-white font-medium">Covers ({discovered.covers.length})</span>
                  </div>
                  {expandedSections.covers ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                </button>
                {expandedSections.covers && (
                  <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                    {discovered.covers.map(entity => (
                      <label key={entity.entity_id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.covers.includes(entity.entity_id)}
                          onChange={() => toggleEntity('covers', entity.entity_id)}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                        />
                        <span className="text-gray-300">{getFriendlyName(entity)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="border border-white/5 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('buttons')}
                  className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Play className="w-5 h-5 text-cyan-400" />
                    <span className="text-white font-medium">Alexa Buttons ({config.customButtons?.length || 0})</span>
                  </div>
                  {expandedSections.buttons ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                </button>
                {expandedSections.buttons && (
                  <div className="p-4 space-y-3">
                    <p className="text-sm text-gray-400 mb-3">
                      Wähle Skripte aus, die als Buttons auf der "Mehr"-Seite angezeigt werden sollen:
                    </p>
                    {discovered.scripts.length === 0 ? (
                      <p className="text-gray-500 text-sm">Keine Skripte gefunden</p>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {discovered.scripts.map(entity => {
                          const isSelected = config.customButtons?.some(b => b.entityId === entity.entity_id)
                          return (
                            <label key={entity.entity_id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setConfig(prev => ({
                                      ...prev,
                                      customButtons: prev.customButtons?.filter(b => b.entityId !== entity.entity_id) || []
                                    }))
                                  } else {
                                    const friendlyName = getFriendlyName(entity)
                                    setConfig(prev => ({
                                      ...prev,
                                      customButtons: [
                                        ...(prev.customButtons || []),
                                        {
                                          id: entity.entity_id.replace(/\./g, '_'),
                                          label: friendlyName,
                                          icon: 'play',
                                          domain: 'script',
                                          service: 'turn_on',
                                          entityId: entity.entity_id
                                        }
                                      ]
                                    }))
                                  }
                                }}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                              />
                              <span className="text-gray-300">{getFriendlyName(entity)}</span>
                              <span className="text-xs text-gray-500">{entity.entity_id}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {!discovered && (
            <p className="text-gray-500 text-sm">
              Click "Discover" to fetch available entities from Home Assistant
            </p>
          )}
        </div>
        
        <div className="bg-[#141b2d]/80 backdrop-blur-lg rounded-2xl p-6 border border-white/5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <DoorOpen className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Intercoms</h2>
            </div>
            <button
              onClick={() => toggleSection('intercoms')}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              {expandedSections.intercoms ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
            </button>
          </div>
          
          {expandedSections.intercoms && (
            <div className="space-y-4">
              {config.intercoms?.map((intercom, index) => (
                <div key={intercom.id} className="p-3 bg-white/5 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{intercom.name}</p>
                    <p className="text-xs text-gray-500">{intercom.cameraEntityId}</p>
                  </div>
                  <button
                    onClick={() => {
                      setConfig(prev => ({
                        ...prev,
                        intercoms: prev.intercoms?.filter((_, i) => i !== index) || []
                      }))
                    }}
                    className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))}
              
              <div className="p-4 border border-dashed border-white/10 rounded-xl space-y-3">
                <p className="text-sm text-gray-400">Neuen Intercom hinzufügen:</p>
                <input
                  type="text"
                  placeholder="Name (z.B. Haustüre)"
                  value={newIntercom.name}
                  onChange={(e) => setNewIntercom(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <input
                  type="text"
                  placeholder="Kamera Entity ID (z.B. camera.haustuere)"
                  value={newIntercom.cameraEntityId}
                  onChange={(e) => setNewIntercom(prev => ({ ...prev, cameraEntityId: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <input
                  type="text"
                  placeholder="Sprechen URL (optional)"
                  value={newIntercom.speakUrl}
                  onChange={(e) => setNewIntercom(prev => ({ ...prev, speakUrl: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <input
                  type="text"
                  placeholder="Lock Entity ID (z.B. lock.haustuere)"
                  value={newIntercom.lockEntityId}
                  onChange={(e) => setNewIntercom(prev => ({ ...prev, lockEntityId: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <button
                  onClick={() => {
                    if (newIntercom.name.trim() && newIntercom.cameraEntityId.trim()) {
                      const baseSlug = newIntercom.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                      const existingSlugs = (config.intercoms || []).map(i => i.slug)
                      let slug = baseSlug
                      let counter = 1
                      while (existingSlugs.includes(slug)) {
                        slug = `${baseSlug}-${counter++}`
                      }
                      setConfig(prev => ({
                        ...prev,
                        intercoms: [
                          ...(prev.intercoms || []),
                          {
                            id: `intercom_${Date.now()}`,
                            name: newIntercom.name.trim(),
                            slug,
                            cameraEntityId: newIntercom.cameraEntityId.trim(),
                            ...(newIntercom.speakUrl.trim() && { speakUrl: newIntercom.speakUrl.trim() }),
                            ...(newIntercom.lockEntityId.trim() && { lockEntityId: newIntercom.lockEntityId.trim() })
                          }
                        ]
                      }))
                      setNewIntercom({ name: '', cameraEntityId: '', speakUrl: '', lockEntityId: '' })
                    }
                  }}
                  disabled={!newIntercom.name || !newIntercom.cameraEntityId}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Hinzufügen
                </button>
              </div>
            </div>
          )}
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
