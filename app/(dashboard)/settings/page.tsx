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
  DoorOpen,
  Eye,
  User,
  Car,
  PawPrint,
  Activity,
  Sun,
  Battery,
  Home,
  PlugZap,
  Pencil,
  Check,
  Calendar,
  CloudSun,
  Thermometer,
  Fan,
  Sparkles
} from 'lucide-react'
import { PushSettings } from '@/components/settings/push-settings'

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
  cameras: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  binarySensors: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  locks: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  calendars: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  climates: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  fans: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  vacuums: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  buttons: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  selects: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
}

interface IntercomConfig {
  id: string
  name: string
  slug: string
  cameraEntityId: string
  speakUrl?: string
  lockEntityId?: string
}

interface PersonSensorConfig {
  id: string
  label: string
  entityId: string
  unit?: string
}

interface PersonDetailConfig {
  entityId: string
  name: string
  batteryEntityId?: string
  sensors: PersonSensorConfig[]
}

interface EnergyConfig {
  solarEntityId?: string
  batteryEntityId?: string
  batteryLevelEntityId?: string
  gridEntityId?: string
  houseEntityId?: string
}

interface VacuumConfig {
  entityId: string
  batteryEntityId?: string
  statusEntityId?: string
  currentRoomEntityId?: string
  cleaningProgressEntityId?: string
  cleaningAreaEntityId?: string
  cleaningTimeEntityId?: string
  chargingEntityId?: string
  cleaningEntityId?: string
  mopAttachedEntityId?: string
  errorEntityId?: string
  mopModeEntityId?: string
  waterIntensityEntityId?: string
  filterRemainingEntityId?: string
  mainBrushRemainingEntityId?: string
  sideBrushRemainingEntityId?: string
  sensorRemainingEntityId?: string
  totalCleaningsEntityId?: string
  totalAreaEntityId?: string
  totalTimeEntityId?: string
  fullCleanButtonEntityId?: string
}

interface LayoutConfig {
  persons: string[]
  personDetails?: PersonDetailConfig[]
  lights: string[]
  covers: string[]
  climates?: string[]
  appliances?: string[]
  calendars?: string[]
  energy?: EnergyConfig
  vacuum?: VacuumConfig
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
  temperatureSensorId?: string
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
    climates: [],
    appliances: [],
    calendars: [],
    energy: {},
    customButtons: [],
  })
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    persons: true,
    personDetails: true,
    lights: true,
    covers: false,
    climates: false,
    calendars: false,
    energy: true,
    appliances: false,
    buttons: false,
    intercoms: false,
    vacuum: false
  })
  const [editingPerson, setEditingPerson] = useState<string | null>(null)
  const [newSensor, setNewSensor] = useState({ label: '', entityId: '', unit: '' })
  const [newIntercom, setNewIntercom] = useState({ name: '', cameraEntityId: '', speakUrl: '', lockEntityId: '' })
  const [editingIntercomIndex, setEditingIntercomIndex] = useState<number | null>(null)
  const [uploadingBackground, setUploadingBackground] = useState(false)
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null)
  const [dashboardTitle, setDashboardTitle] = useState('HA Dashboard')
  
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
          setConfig(prev => ({
            ...prev,
            ...data.layoutConfig,
            climates: data.layoutConfig.climates || [],
            appliances: data.layoutConfig.appliances || [],
            calendars: data.layoutConfig.calendars || [],
            energy: data.layoutConfig.energy || {},
          }))
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
        backgroundUrl: backgroundUrl || undefined,
        dashboardTitle: dashboardTitle || 'HA Dashboard'
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
  
  const toggleEntity = (type: 'persons' | 'lights' | 'covers' | 'climates' | 'appliances' | 'calendars', entityId: string) => {
    setConfig(prev => {
      const current = prev[type] || []
      return {
        ...prev,
        [type]: current.includes(entityId)
          ? current.filter((id: string) => id !== entityId)
          : [...current, entityId]
      }
    })
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
              <div className="flex-1">
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
              {!status.connected && (
                <button
                  onClick={() => router.push('/login?refresh=true')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Token erneuern
                </button>
              )}
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
              
              {config.persons.length > 0 && (
                <div className="border border-white/5 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleSection('personDetails')}
                    className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-cyan-400" />
                      <span className="text-white font-medium">Personen-Sensoren konfigurieren</span>
                    </div>
                    {expandedSections.personDetails ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                  </button>
                  {expandedSections.personDetails && (
                    <div className="p-4 space-y-4">
                      <p className="text-sm text-gray-400">
                        Wähle für jede Person die Sensoren aus, die angezeigt werden sollen.
                      </p>
                      {config.persons.map(personEntityId => {
                        const personEntity = discovered?.persons.find(p => p.entity_id === personEntityId)
                        const personName = personEntity ? getFriendlyName(personEntity) : personEntityId.split('.')[1]
                        const personDetail = config.personDetails?.find(p => p.entityId === personEntityId) || {
                          entityId: personEntityId,
                          name: personName,
                          sensors: []
                        }
                        const isEditing = editingPerson === personEntityId
                        
                        return (
                          <div key={personEntityId} className="p-4 bg-white/5 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                  <span className="text-blue-400 font-bold">{personName.charAt(0).toUpperCase()}</span>
                                </div>
                                <div>
                                  <p className="text-white font-medium">{personName}</p>
                                  <p className="text-xs text-gray-500">{personEntityId}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => setEditingPerson(isEditing ? null : personEntityId)}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${isEditing ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                              >
                                {isEditing ? 'Fertig' : 'Bearbeiten'}
                              </button>
                            </div>
                            
                            {personDetail.sensors.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-3">
                                {personDetail.sensors.map(sensor => (
                                  <span key={sensor.id} className="flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded-lg text-sm text-gray-300">
                                    {sensor.label}{sensor.unit && ` (${sensor.unit})`}
                                    {isEditing && (
                                      <button
                                        onClick={() => {
                                          setConfig(prev => ({
                                            ...prev,
                                            personDetails: (prev.personDetails || []).map(p => 
                                              p.entityId === personEntityId 
                                                ? { ...p, sensors: p.sensors.filter(s => s.id !== sensor.id) }
                                                : p
                                            ).filter(p => p.sensors.length > 0 || p.batteryEntityId)
                                          }))
                                        }}
                                        className="ml-1 text-red-400 hover:text-red-300"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </span>
                                ))}
                              </div>
                            )}
                            
                            {isEditing && (
                              <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                                <div>
                                  <label className="text-xs text-gray-400 mb-1 block">Batterie-Sensor (optional)</label>
                                  <select
                                    value={personDetail.batteryEntityId || ''}
                                    onChange={(e) => {
                                      const batteryEntityId = e.target.value || undefined
                                      setConfig(prev => {
                                        const existing = prev.personDetails?.find(p => p.entityId === personEntityId)
                                        if (existing) {
                                          return {
                                            ...prev,
                                            personDetails: prev.personDetails?.map(p => 
                                              p.entityId === personEntityId ? { ...p, batteryEntityId } : p
                                            )
                                          }
                                        } else {
                                          return {
                                            ...prev,
                                            personDetails: [...(prev.personDetails || []), { entityId: personEntityId, name: personName, batteryEntityId, sensors: [] }]
                                          }
                                        }
                                      })
                                    }}
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                  >
                                    <option value="">Kein Batterie-Sensor</option>
                                    {discovered?.sensors.filter(s => 
                                      s.entity_id.includes('battery') || s.attributes.device_class === 'battery'
                                    ).map(s => (
                                      <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)}</option>
                                    ))}
                                  </select>
                                </div>
                                
                                <p className="text-xs text-gray-400">Neuen Sensor hinzufügen:</p>
                                <div className="grid grid-cols-3 gap-2">
                                  <input
                                    type="text"
                                    placeholder="Label (z.B. Schritte)"
                                    value={newSensor.label}
                                    onChange={(e) => setNewSensor(prev => ({ ...prev, label: e.target.value }))}
                                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                  />
                                  <select
                                    value={newSensor.entityId}
                                    onChange={(e) => setNewSensor(prev => ({ ...prev, entityId: e.target.value }))}
                                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                  >
                                    <option value="">Sensor wählen...</option>
                                    {discovered?.sensors.map(s => (
                                      <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                                    ))}
                                  </select>
                                  <input
                                    type="text"
                                    placeholder="Einheit (optional)"
                                    value={newSensor.unit}
                                    onChange={(e) => setNewSensor(prev => ({ ...prev, unit: e.target.value }))}
                                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                                  />
                                </div>
                                <button
                                  onClick={() => {
                                    if (newSensor.label.trim() && newSensor.entityId) {
                                      const sensor: PersonSensorConfig = {
                                        id: `sensor_${Date.now()}`,
                                        label: newSensor.label.trim(),
                                        entityId: newSensor.entityId,
                                        ...(newSensor.unit.trim() && { unit: newSensor.unit.trim() })
                                      }
                                      setConfig(prev => {
                                        const existing = prev.personDetails?.find(p => p.entityId === personEntityId)
                                        if (existing) {
                                          return {
                                            ...prev,
                                            personDetails: prev.personDetails?.map(p => 
                                              p.entityId === personEntityId ? { ...p, sensors: [...p.sensors, sensor] } : p
                                            )
                                          }
                                        } else {
                                          return {
                                            ...prev,
                                            personDetails: [...(prev.personDetails || []), { entityId: personEntityId, name: personName, sensors: [sensor] }]
                                          }
                                        }
                                      })
                                      setNewSensor({ label: '', entityId: '', unit: '' })
                                    }
                                  }}
                                  disabled={!newSensor.label.trim() || !newSensor.entityId}
                                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Plus className="w-4 h-4" />
                                  Sensor hinzufügen
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
              
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
                  onClick={() => toggleSection('climates')}
                  className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Thermometer className="w-5 h-5 text-orange-400" />
                    <span className="text-white font-medium">Klima / Heizung ({(discovered.climates?.length || 0) + (discovered.fans?.length || 0)})</span>
                  </div>
                  {expandedSections.climates ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                </button>
                {expandedSections.climates && (
                  <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                    <p className="text-sm text-gray-400 mb-3">
                      Wähle die Klimageräte und Ventilatoren aus, die auf der Klima-Seite angezeigt werden sollen:
                    </p>
                    {discovered.climates?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                          <Thermometer className="w-3 h-3" /> Klimageräte / Heizung
                        </p>
                        {discovered.climates.map(entity => (
                          <label key={entity.entity_id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.climates?.includes(entity.entity_id) || false}
                              onChange={() => toggleEntity('climates', entity.entity_id)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="text-gray-300">{getFriendlyName(entity)}</span>
                            <span className="text-xs text-gray-500">{entity.entity_id}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {discovered.fans?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                          <Fan className="w-3 h-3" /> Ventilatoren
                        </p>
                        {discovered.fans.map(entity => (
                          <label key={entity.entity_id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.climates?.includes(entity.entity_id) || false}
                              onChange={() => toggleEntity('climates', entity.entity_id)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="text-gray-300">{getFriendlyName(entity)}</span>
                            <span className="text-xs text-gray-500">{entity.entity_id}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {(!discovered.climates?.length && !discovered.fans?.length) && (
                      <p className="text-sm text-gray-500">Keine Klimageräte oder Ventilatoren gefunden.</p>
                    )}
                  </div>
                )}
              </div>
              
              <div className="border border-white/5 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('calendars')}
                  className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-cyan-400" />
                    <span className="text-white font-medium">Kalender ({config.calendars?.length || 0})</span>
                  </div>
                  {expandedSections.calendars ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                </button>
                {expandedSections.calendars && (
                  <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                    <p className="text-sm text-gray-400 mb-3">
                      Wähle die Kalender aus, die auf der Hauptseite angezeigt werden sollen:
                    </p>
                    {discovered?.calendars && discovered.calendars.length > 0 ? (
                      discovered.calendars.map(entity => (
                        <label key={entity.entity_id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.calendars?.includes(entity.entity_id) || false}
                            onChange={() => toggleEntity('calendars', entity.entity_id)}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                          />
                          <span className="text-gray-300">{getFriendlyName(entity)}</span>
                          <span className="text-xs text-gray-500">{entity.entity_id}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">Keine Kalender gefunden. Klicke auf "Discover" um Kalender zu laden.</p>
                    )}
                    
                    <div className="pt-4 border-t border-white/10 mt-4 space-y-4">
                      <div>
                        <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                          <CloudSun className="w-4 h-4 text-yellow-400" />
                          Wetter-Vorhersage (Außentemperatur)
                        </label>
                        <select
                          value={config.weatherEntityId || ''}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            weatherEntityId: e.target.value || undefined
                          }))}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        >
                          <option value="" className="bg-gray-800">Kein Wetter anzeigen</option>
                          {discovered?.weather?.map(entity => (
                            <option key={entity.entity_id} value={entity.entity_id} className="bg-gray-800">
                              {getFriendlyName(entity)} ({entity.entity_id})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Zeigt Wetter-Widget auf der Startseite mit Vorhersage</p>
                      </div>
                      
                      <div>
                        <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                          <Thermometer className="w-4 h-4 text-orange-400" />
                          Innentemperatur-Sensor
                        </label>
                        <select
                          value={(config as { temperatureSensorId?: string }).temperatureSensorId || ''}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            temperatureSensorId: e.target.value || undefined
                          } as typeof prev))}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        >
                          <option value="" className="bg-gray-800">Kein Innensensor</option>
                          {discovered?.sensors?.filter(s => 
                            s.attributes.device_class === 'temperature' ||
                            s.entity_id.includes('temperature') ||
                            s.entity_id.includes('temp')
                          ).map(entity => (
                            <option key={entity.entity_id} value={entity.entity_id} className="bg-gray-800">
                              {getFriendlyName(entity)} ({entity.entity_id})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Zum Vergleich: Zeigt Innentemperatur neben Außentemperatur</p>
                      </div>
                      
                      <div>
                        <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                          <Trash2 className="w-4 h-4 text-green-400" />
                          Müllabfuhr-Kalender
                        </label>
                        <select
                          value={(config as { trashCalendarId?: string }).trashCalendarId || ''}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            trashCalendarId: e.target.value || undefined
                          } as typeof prev))}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        >
                          <option value="" className="bg-gray-800">Kein Müllkalender</option>
                          {discovered?.calendars?.map(entity => (
                            <option key={entity.entity_id} value={entity.entity_id} className="bg-gray-800">
                              {getFriendlyName(entity)} ({entity.entity_id})
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">Zeigt nächste Müllabholtermine auf der Startseite</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="border border-white/5 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('energy')}
                  className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-green-400" />
                    <span className="text-white font-medium">Energy Dashboard</span>
                  </div>
                  {expandedSections.energy ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                </button>
                {expandedSections.energy && (
                  <div className="p-4 space-y-4">
                    <p className="text-sm text-gray-400 mb-3">
                      Konfiguriere die Sensoren für das Energy Dashboard:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                          <Sun className="w-4 h-4 text-yellow-400" />
                          Solar (Produktion)
                        </label>
                        <select
                          value={config.energy?.solarEntityId || ''}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            energy: { ...prev.energy, solarEntityId: e.target.value || undefined }
                          }))}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        >
                          <option value="">Nicht konfiguriert</option>
                          {discovered?.sensors.filter(s => 
                            s.entity_id.includes('solar') || 
                            s.entity_id.includes('pv') || 
                            s.attributes.device_class === 'power'
                          ).map(s => (
                            <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                          <Battery className="w-4 h-4 text-blue-400" />
                          Batterie (Leistung)
                        </label>
                        <select
                          value={config.energy?.batteryEntityId || ''}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            energy: { ...prev.energy, batteryEntityId: e.target.value || undefined }
                          }))}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        >
                          <option value="">Nicht konfiguriert</option>
                          {discovered?.sensors.filter(s => 
                            s.attributes.device_class === 'power' || s.entity_id.includes('battery')
                          ).map(s => (
                            <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                          <Battery className="w-4 h-4 text-emerald-400" />
                          Batterie (Ladestand %)
                        </label>
                        <select
                          value={config.energy?.batteryLevelEntityId || ''}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            energy: { ...prev.energy, batteryLevelEntityId: e.target.value || undefined }
                          }))}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        >
                          <option value="">Nicht konfiguriert</option>
                          {discovered?.sensors.filter(s => 
                            s.attributes.device_class === 'battery' || 
                            s.entity_id.includes('battery') && (s.entity_id.includes('level') || s.entity_id.includes('soc'))
                          ).map(s => (
                            <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                          <PlugZap className="w-4 h-4 text-orange-400" />
                          Netz (Import/Export)
                        </label>
                        <select
                          value={config.energy?.gridEntityId || ''}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            energy: { ...prev.energy, gridEntityId: e.target.value || undefined }
                          }))}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        >
                          <option value="">Nicht konfiguriert</option>
                          {discovered?.sensors.filter(s => 
                            s.entity_id.includes('grid') || 
                            s.entity_id.includes('netz') ||
                            s.attributes.device_class === 'power'
                          ).map(s => (
                            <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                          <Home className="w-4 h-4 text-purple-400" />
                          Hausverbrauch
                        </label>
                        <select
                          value={config.energy?.houseEntityId || ''}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            energy: { ...prev.energy, houseEntityId: e.target.value || undefined }
                          }))}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        >
                          <option value="">Nicht konfiguriert</option>
                          {discovered?.sensors.filter(s => 
                            s.entity_id.includes('house') || 
                            s.entity_id.includes('consumption') ||
                            s.entity_id.includes('verbrauch') ||
                            s.attributes.device_class === 'power'
                          ).map(s => (
                            <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="border border-white/5 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleSection('appliances')}
                  className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <PlugZap className="w-5 h-5 text-orange-400" />
                    <span className="text-white font-medium">Geräte / Appliances ({config.appliances?.length || 0})</span>
                  </div>
                  {expandedSections.appliances ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                </button>
                {expandedSections.appliances && (
                  <div className="p-4 space-y-3">
                    <p className="text-sm text-gray-400 mb-3">
                      Wähle Geräte aus, die auf der Energy-Seite angezeigt werden sollen:
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {discovered?.sensors.filter(s => 
                        s.attributes.device_class === 'power' ||
                        s.entity_id.includes('washer') ||
                        s.entity_id.includes('dryer') ||
                        s.entity_id.includes('dishwasher') ||
                        s.entity_id.includes('heater') ||
                        s.entity_id.includes('boiler') ||
                        s.entity_id.includes('geyser') ||
                        s.entity_id.includes('pump')
                      ).map(entity => (
                        <label key={entity.entity_id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.appliances?.includes(entity.entity_id) || false}
                            onChange={() => toggleEntity('appliances', entity.entity_id)}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                          />
                          <span className="text-gray-300">{getFriendlyName(entity)}</span>
                          <span className="text-xs text-gray-500">{entity.entity_id}</span>
                        </label>
                      ))}
                      {discovered?.switches.map(entity => (
                        <label key={entity.entity_id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.appliances?.includes(entity.entity_id) || false}
                            onChange={() => toggleEntity('appliances', entity.entity_id)}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                          />
                          <span className="text-gray-300">{getFriendlyName(entity)}</span>
                          <span className="text-xs text-gray-500">{entity.entity_id}</span>
                        </label>
                      ))}
                    </div>
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
                    <span className="text-white font-medium">Aktionen ({config.customButtons?.length || 0})</span>
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
                <div key={intercom.id} className="p-4 bg-white/5 rounded-xl">
                  {editingIntercomIndex === index ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Name"
                        value={intercom.name}
                        onChange={(e) => {
                          setConfig(prev => ({
                            ...prev,
                            intercoms: prev.intercoms?.map((ic, i) => 
                              i === index ? { ...ic, name: e.target.value } : ic
                            ) || []
                          }))
                        }}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      />
                      <select
                        value={intercom.cameraEntityId}
                        onChange={(e) => {
                          setConfig(prev => ({
                            ...prev,
                            intercoms: prev.intercoms?.map((ic, i) => 
                              i === index ? { ...ic, cameraEntityId: e.target.value } : ic
                            ) || []
                          }))
                        }}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      >
                        <option value="" className="bg-gray-800">Kamera auswählen...</option>
                        {discovered?.cameras?.map(cam => (
                          <option key={cam.entity_id} value={cam.entity_id} className="bg-gray-800">
                            {getFriendlyName(cam)} ({cam.entity_id})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Sprechen URL (optional)"
                        value={intercom.speakUrl || ''}
                        onChange={(e) => {
                          setConfig(prev => ({
                            ...prev,
                            intercoms: prev.intercoms?.map((ic, i) => 
                              i === index ? { ...ic, speakUrl: e.target.value } : ic
                            ) || []
                          }))
                        }}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      />
                      <select
                        value={intercom.lockEntityId || ''}
                        onChange={(e) => {
                          setConfig(prev => ({
                            ...prev,
                            intercoms: prev.intercoms?.map((ic, i) => 
                              i === index ? { ...ic, lockEntityId: e.target.value } : ic
                            ) || []
                          }))
                        }}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      >
                        <option value="" className="bg-gray-800">Lock auswählen (optional)...</option>
                        {discovered?.locks?.map(lock => (
                          <option key={lock.entity_id} value={lock.entity_id} className="bg-gray-800">
                            {getFriendlyName(lock)} ({lock.entity_id})
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingIntercomIndex(null)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          Fertig
                        </button>
                        <button
                          onClick={() => {
                            setConfig(prev => ({
                              ...prev,
                              intercoms: prev.intercoms?.filter((_, i) => i !== index) || []
                            }))
                            setEditingIntercomIndex(null)
                          }}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-medium">{intercom.name}</p>
                        <p className="text-xs text-gray-500">{intercom.cameraEntityId}</p>
                        {intercom.lockEntityId && (
                          <p className="text-xs text-gray-500">Lock: {intercom.lockEntityId}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingIntercomIndex(index)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4 text-gray-400" />
                        </button>
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
                    </div>
                  )}
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
                <select
                  value={newIntercom.cameraEntityId}
                  onChange={(e) => setNewIntercom(prev => ({ ...prev, cameraEntityId: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="" className="bg-gray-800">Kamera auswählen...</option>
                  {discovered?.cameras?.map(cam => (
                    <option key={cam.entity_id} value={cam.entity_id} className="bg-gray-800">
                      {getFriendlyName(cam)} ({cam.entity_id})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Sprechen URL (optional)"
                  value={newIntercom.speakUrl}
                  onChange={(e) => setNewIntercom(prev => ({ ...prev, speakUrl: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <select
                  value={newIntercom.lockEntityId}
                  onChange={(e) => setNewIntercom(prev => ({ ...prev, lockEntityId: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  <option value="" className="bg-gray-800">Lock auswählen (optional)...</option>
                  {discovered?.locks?.map(lock => (
                    <option key={lock.entity_id} value={lock.entity_id} className="bg-gray-800">
                      {getFriendlyName(lock)} ({lock.entity_id})
                    </option>
                  ))}
                </select>
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
          <button
            onClick={() => toggleSection('vacuum')}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">Saugroboter</h2>
            </div>
            {expandedSections.vacuum ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
          </button>
          
          {expandedSections.vacuum && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-gray-400">
                Konfiguriere die Entity-IDs für deinen Saugroboter. Klicke zuerst oben auf "Discover" um verfügbare Entitäten zu laden.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Vacuum Entity *</label>
                  <select
                    value={config.vacuum?.entityId || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      vacuum: { ...prev.vacuum, entityId: e.target.value } as VacuumConfig
                    }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="">Vacuum auswählen...</option>
                    {discovered?.vacuums?.map(v => (
                      <option key={v.entity_id} value={v.entity_id}>{getFriendlyName(v)} ({v.entity_id})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Batterie-Sensor</label>
                  <select
                    value={config.vacuum?.batteryEntityId || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      vacuum: { ...prev.vacuum, entityId: prev.vacuum?.entityId || '', batteryEntityId: e.target.value || undefined } as VacuumConfig
                    }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="">Sensor auswählen...</option>
                    {discovered?.sensors?.map(s => (
                      <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Status-Sensor</label>
                  <select
                    value={config.vacuum?.statusEntityId || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      vacuum: { ...prev.vacuum, entityId: prev.vacuum?.entityId || '', statusEntityId: e.target.value || undefined } as VacuumConfig
                    }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="">Sensor auswählen...</option>
                    {discovered?.sensors?.map(s => (
                      <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Aktueller Raum</label>
                  <select
                    value={config.vacuum?.currentRoomEntityId || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      vacuum: { ...prev.vacuum, entityId: prev.vacuum?.entityId || '', currentRoomEntityId: e.target.value || undefined } as VacuumConfig
                    }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="">Sensor auswählen...</option>
                    {discovered?.sensors?.map(s => (
                      <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Ladestatus (binary_sensor)</label>
                  <select
                    value={config.vacuum?.chargingEntityId || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      vacuum: { ...prev.vacuum, entityId: prev.vacuum?.entityId || '', chargingEntityId: e.target.value || undefined } as VacuumConfig
                    }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="">Sensor auswählen...</option>
                    {discovered?.binarySensors?.map(s => (
                      <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Reinigt (binary_sensor)</label>
                  <select
                    value={config.vacuum?.cleaningEntityId || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      vacuum: { ...prev.vacuum, entityId: prev.vacuum?.entityId || '', cleaningEntityId: e.target.value || undefined } as VacuumConfig
                    }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="">Sensor auswählen...</option>
                    {discovered?.binarySensors?.map(s => (
                      <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Mopp angebracht (binary_sensor)</label>
                  <select
                    value={config.vacuum?.mopAttachedEntityId || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      vacuum: { ...prev.vacuum, entityId: prev.vacuum?.entityId || '', mopAttachedEntityId: e.target.value || undefined } as VacuumConfig
                    }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="">Sensor auswählen...</option>
                    {discovered?.binarySensors?.map(s => (
                      <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Fehler-Sensor</label>
                  <select
                    value={config.vacuum?.errorEntityId || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      vacuum: { ...prev.vacuum, entityId: prev.vacuum?.entityId || '', errorEntityId: e.target.value || undefined } as VacuumConfig
                    }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="">Sensor auswählen...</option>
                    {discovered?.sensors?.map(s => (
                      <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Reinigungsfortschritt</label>
                  <select
                    value={config.vacuum?.cleaningProgressEntityId || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      vacuum: { ...prev.vacuum, entityId: prev.vacuum?.entityId || '', cleaningProgressEntityId: e.target.value || undefined } as VacuumConfig
                    }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="">Sensor auswählen...</option>
                    {discovered?.sensors?.map(s => (
                      <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Reinigungsbereich (m²)</label>
                  <select
                    value={config.vacuum?.cleaningAreaEntityId || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      vacuum: { ...prev.vacuum, entityId: prev.vacuum?.entityId || '', cleaningAreaEntityId: e.target.value || undefined } as VacuumConfig
                    }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="">Sensor auswählen...</option>
                    {discovered?.sensors?.map(s => (
                      <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Reinigungszeit</label>
                  <select
                    value={config.vacuum?.cleaningTimeEntityId || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      vacuum: { ...prev.vacuum, entityId: prev.vacuum?.entityId || '', cleaningTimeEntityId: e.target.value || undefined } as VacuumConfig
                    }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="">Sensor auswählen...</option>
                    {discovered?.sensors?.map(s => (
                      <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Mopp-Modus (select)</label>
                  <select
                    value={config.vacuum?.mopModeEntityId || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      vacuum: { ...prev.vacuum, entityId: prev.vacuum?.entityId || '', mopModeEntityId: e.target.value || undefined } as VacuumConfig
                    }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="">Entity auswählen...</option>
                    {discovered?.selects?.map(s => (
                      <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Wisch-Intensität (select)</label>
                  <select
                    value={config.vacuum?.waterIntensityEntityId || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      vacuum: { ...prev.vacuum, entityId: prev.vacuum?.entityId || '', waterIntensityEntityId: e.target.value || undefined } as VacuumConfig
                    }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="">Entity auswählen...</option>
                    {discovered?.selects?.map(s => (
                      <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Vollreinigung Button</label>
                  <select
                    value={config.vacuum?.fullCleanButtonEntityId || ''}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      vacuum: { ...prev.vacuum, entityId: prev.vacuum?.entityId || '', fullCleanButtonEntityId: e.target.value || undefined } as VacuumConfig
                    }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    <option value="">Button auswählen...</option>
                    {discovered?.buttons?.map(s => (
                      <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="border-t border-white/10 pt-4 mt-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Wartungs-Sensoren</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Filter verbleibend</label>
                    <select
                      value={config.vacuum?.filterRemainingEntityId || ''}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        vacuum: { ...prev.vacuum, entityId: prev.vacuum?.entityId || '', filterRemainingEntityId: e.target.value || undefined } as VacuumConfig
                      }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      <option value="">Sensor auswählen...</option>
                      {discovered?.sensors?.map(s => (
                        <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Hauptbürste verbleibend</label>
                    <select
                      value={config.vacuum?.mainBrushRemainingEntityId || ''}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        vacuum: { ...prev.vacuum, entityId: prev.vacuum?.entityId || '', mainBrushRemainingEntityId: e.target.value || undefined } as VacuumConfig
                      }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      <option value="">Sensor auswählen...</option>
                      {discovered?.sensors?.map(s => (
                        <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Seitenbürste verbleibend</label>
                    <select
                      value={config.vacuum?.sideBrushRemainingEntityId || ''}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        vacuum: { ...prev.vacuum, entityId: prev.vacuum?.entityId || '', sideBrushRemainingEntityId: e.target.value || undefined } as VacuumConfig
                      }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      <option value="">Sensor auswählen...</option>
                      {discovered?.sensors?.map(s => (
                        <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Sensoren verbleibend</label>
                    <select
                      value={config.vacuum?.sensorRemainingEntityId || ''}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        vacuum: { ...prev.vacuum, entityId: prev.vacuum?.entityId || '', sensorRemainingEntityId: e.target.value || undefined } as VacuumConfig
                      }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      <option value="">Sensor auswählen...</option>
                      {discovered?.sensors?.map(s => (
                        <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="border-t border-white/10 pt-4 mt-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Statistik-Sensoren</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Gesamtzahl Reinigungen</label>
                    <select
                      value={config.vacuum?.totalCleaningsEntityId || ''}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        vacuum: { ...prev.vacuum, entityId: prev.vacuum?.entityId || '', totalCleaningsEntityId: e.target.value || undefined } as VacuumConfig
                      }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      <option value="">Sensor auswählen...</option>
                      {discovered?.sensors?.map(s => (
                        <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Gesamtfläche (m²)</label>
                    <select
                      value={config.vacuum?.totalAreaEntityId || ''}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        vacuum: { ...prev.vacuum, entityId: prev.vacuum?.entityId || '', totalAreaEntityId: e.target.value || undefined } as VacuumConfig
                      }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      <option value="">Sensor auswählen...</option>
                      {discovered?.sensors?.map(s => (
                        <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Gesamtzeit (Stunden)</label>
                    <select
                      value={config.vacuum?.totalTimeEntityId || ''}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        vacuum: { ...prev.vacuum, entityId: prev.vacuum?.entityId || '', totalTimeEntityId: e.target.value || undefined } as VacuumConfig
                      }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    >
                      <option value="">Sensor auswählen...</option>
                      {discovered?.sensors?.map(s => (
                        <option key={s.entity_id} value={s.entity_id}>{getFriendlyName(s)} ({s.entity_id})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-[#141b2d]/80 backdrop-blur-lg rounded-2xl p-6 border border-white/5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Pencil className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">Dashboard-Titel</h2>
          </div>
          
          <input
            type="text"
            value={dashboardTitle}
            onChange={(e) => {
              setDashboardTitle(e.target.value)
              localStorage.setItem('ha-dashboard-title', e.target.value)
            }}
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
