'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Users,
  Lightbulb,
  LayoutGrid,
  Zap,
  Save,
  ChevronDown,
  ChevronRight,
  Play,
  Plus,
  X,
  Video,
  DoorOpen,
  User,
  Sun,
  Home,
  PlugZap,
  Pencil,
  Check,
  Calendar,
  CloudSun,
  Thermometer,
  Fan,
  Sparkles,
  Theater,
  Search
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
  cameras: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  binarySensors: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  locks: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  calendars: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  climates: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  fans: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  vacuums: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  buttons: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  selects: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  inputNumbers: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  inputTexts: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  inputSelects: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  inputDatetimes: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  inputButtons: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  timers: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  counters: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
  numbers: Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>
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
  awnings?: string[]
  curtains?: string[]
  climates?: string[]
  appliances?: string[]
  calendars?: string[]
  cameras?: string[]
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
  trashCalendarId?: string
}

export default function HomeAssistantSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [canEditGlobalSettings, setCanEditGlobalSettings] = useState(false)
  const [status, setStatus] = useState<ConnectionStatus | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [haUrl, setHaUrl] = useState('')
  const [haToken, setHaToken] = useState('')
  const [hasToken, setHasToken] = useState(false)
  const [savingHaConfig, setSavingHaConfig] = useState(false)
  const [haConfigMessage, setHaConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [discovered, setDiscovered] = useState<DiscoveredEntities | null>(null)
  const [discoveringEntities, setDiscoveringEntities] = useState(false)
  const [config, setConfig] = useState<LayoutConfig>({
    persons: [],
    lights: [],
    covers: [],
    awnings: [],
    curtains: [],
    climates: [],
    appliances: [],
    calendars: [],
    cameras: [],
    energy: {},
    customButtons: [],
    intercoms: [],
  })
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    persons: true,
    personDetails: false,
    lights: true,
    covers: false,
    awnings: false,
    curtains: false,
    climates: false,
    calendars: false,
    cameras: false,
    energy: false,
    weather: false,
    appliances: false,
    buttons: false,
    intercoms: false,
    vacuum: false
  })
  const [newSensor, setNewSensor] = useState({ label: '', entityId: '', unit: '' })
  const [newIntercom, setNewIntercom] = useState({ name: '', cameraEntityId: '', speakUrl: '', lockEntityId: '' })
  const [editingIntercomIndex, setEditingIntercomIndex] = useState<number | null>(null)
  const [searchFilters, setSearchFilters] = useState<Record<string, string>>({
    persons: '',
    lights: '',
    covers: '',
    awnings: '',
    curtains: '',
    climates: '',
    appliances: '',
    calendars: '',
    cameras: '',
    sensors: ''
  })
  
  useEffect(() => {
    checkAuth()
    loadSettings()
    loadHaConfig()
    checkConnectionStatus()
  }, [])
  
  const loadHaConfig = async () => {
    try {
      const res = await fetch('/api/ha/config')
      if (res.ok) {
        const data = await res.json()
        setHaUrl(data.url || '')
        setHasToken(data.hasToken || false)
      }
    } catch (error) {
      console.error('Failed to load HA config:', error)
    }
  }
  
  const saveHaConfig = async () => {
    setSavingHaConfig(true)
    setHaConfigMessage(null)
    try {
      const res = await fetch('/api/ha/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          url: haUrl, 
          token: haToken || undefined 
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setHaConfigMessage({ type: 'success', text: `Verbunden! ${data.version ? `Version: ${data.version}` : ''}` })
        setHasToken(true)
        setHaToken('')
        checkConnectionStatus()
      } else {
        setHaConfigMessage({ type: 'error', text: data.error || 'Verbindung fehlgeschlagen' })
      }
    } catch (error) {
      setHaConfigMessage({ type: 'error', text: 'Fehler beim Speichern' })
    } finally {
      setSavingHaConfig(false)
    }
  }
  
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
            awnings: data.layoutConfig.awnings || [],
            curtains: data.layoutConfig.curtains || [],
            climates: data.layoutConfig.climates || [],
            appliances: data.layoutConfig.appliances || [],
            calendars: data.layoutConfig.calendars || [],
            cameras: data.layoutConfig.cameras || [],
            energy: data.layoutConfig.energy || {},
            intercoms: data.layoutConfig.intercoms || [],
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
  
  const checkConnectionStatus = async () => {
    setCheckingStatus(true)
    try {
      const res = await fetch('/api/ha/status')
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
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }
  
  const toggleEntity = (type: 'persons' | 'lights' | 'covers' | 'climates' | 'appliances' | 'calendars' | 'cameras', entityId: string) => {
    setConfig(prev => {
      const current = prev[type] as string[] || []
      const isSelected = current.includes(entityId)
      return {
        ...prev,
        [type]: isSelected 
          ? current.filter(id => id !== entityId)
          : [...current, entityId]
      }
    })
  }
  
  const getFriendlyName = (entity: { entity_id: string; attributes: Record<string, unknown> }) => {
    return (entity.attributes.friendly_name as string) || entity.entity_id.split('.')[1].replace(/_/g, ' ')
  }
  
  const filterEntities = <T extends { entity_id: string; attributes: Record<string, unknown> }>(
    entities: T[], 
    searchTerm: string
  ): T[] => {
    if (!searchTerm.trim()) return entities
    const term = searchTerm.toLowerCase()
    return entities.filter(entity => {
      const friendlyName = getFriendlyName(entity).toLowerCase()
      const entityId = entity.entity_id.toLowerCase()
      return friendlyName.includes(term) || entityId.includes(term)
    })
  }
  
  const updateSearchFilter = (section: string, value: string) => {
    setSearchFilters(prev => ({ ...prev, [section]: value }))
  }
  
  const saveConfig = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layoutConfig: config })
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
  
  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }
  
  const addIntercom = () => {
    if (!newIntercom.name || !newIntercom.cameraEntityId) return
    
    const intercom: IntercomConfig = {
      id: `intercom-${Date.now()}`,
      name: newIntercom.name,
      slug: generateSlug(newIntercom.name),
      cameraEntityId: newIntercom.cameraEntityId,
      speakUrl: newIntercom.speakUrl || undefined,
      lockEntityId: newIntercom.lockEntityId || undefined,
    }
    
    setConfig(prev => ({
      ...prev,
      intercoms: [...(prev.intercoms || []), intercom]
    }))
    
    setNewIntercom({ name: '', cameraEntityId: '', speakUrl: '', lockEntityId: '' })
  }
  
  const removeIntercom = (index: number) => {
    setConfig(prev => ({
      ...prev,
      intercoms: (prev.intercoms || []).filter((_, i) => i !== index)
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
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <Home className="w-8 h-8 text-blue-400" />
          <h1 className="text-2xl font-bold text-white">Home Assistant</h1>
        </div>
        
        <div className="bg-[#141b2d]/80 backdrop-blur-lg rounded-2xl p-6 border border-white/5 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Verbindung konfigurieren</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Home Assistant URL</label>
              <input
                type="url"
                value={haUrl}
                onChange={(e) => setHaUrl(e.target.value)}
                placeholder="https://homeassistant.local:8123"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Long-Lived Access Token {hasToken && <span className="text-emerald-400">(gespeichert)</span>}
              </label>
              <input
                type="password"
                value={haToken}
                onChange={(e) => setHaToken(e.target.value)}
                placeholder={hasToken ? '••••••••••••••••' : 'Token eingeben'}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Erstelle einen Token unter: Profil → Langlebige Zugriffstoken
              </p>
            </div>
            
            {haConfigMessage && (
              <div className={`p-3 rounded-lg ${haConfigMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {haConfigMessage.text}
              </div>
            )}
            
            <button
              onClick={saveHaConfig}
              disabled={savingHaConfig || !haUrl || !canEditGlobalSettings}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {savingHaConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Speichern & Testen
            </button>
            {!canEditGlobalSettings && (
              <p className="text-amber-400/80 text-xs mt-2 text-center">
                Nur Administratoren können diese Einstellung ändern
              </p>
            )}
          </div>
          
          {status && (
            <div className={`flex items-center gap-3 p-4 rounded-xl mt-4 ${status.connected ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              {status.connected ? (
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400" />
              )}
              <div>
                <p className={`font-medium ${status.connected ? 'text-emerald-400' : 'text-red-400'}`}>
                  {status.connected ? 'Verbunden' : 'Nicht verbunden'}
                </p>
                {status.version && (
                  <p className="text-sm text-gray-400">Version: {status.version}</p>
                )}
                {status.error && (
                  <p className="text-sm text-red-400">{status.error}</p>
                )}
              </div>
              <button
                onClick={checkConnectionStatus}
                disabled={checkingStatus}
                className="ml-auto p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                {checkingStatus ? <Loader2 className="w-4 h-4 text-gray-400 animate-spin" /> : <RefreshCw className="w-4 h-4 text-gray-400" />}
              </button>
            </div>
          )}
        </div>
        
        <div className="bg-[#141b2d]/80 backdrop-blur-lg rounded-2xl p-6 border border-white/5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Entity Discovery</h2>
            <button
              onClick={discoverEntities}
              disabled={discoveringEntities || !canEditGlobalSettings}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              {discoveringEntities ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Discover
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="border border-white/5 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('persons')}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-medium">Personen {discovered ? `(${config.persons.length}/${discovered.persons.length})` : ''}</span>
                </div>
                {expandedSections.persons ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
              </button>
              {expandedSections.persons && (
                <div className="p-4">
                  {!discovered ? (
                    <p className="text-gray-500 text-sm">Klicke auf "Discover" um Entitäten zu laden</p>
                  ) : discovered.persons.length === 0 ? (
                    <p className="text-gray-500 text-sm">Keine Personen gefunden</p>
                  ) : (
                    <>
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Suchen..."
                          value={searchFilters.persons || ''}
                          onChange={(e) => updateSearchFilter('persons', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                        />
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {filterEntities(discovered.persons, searchFilters.persons).map(entity => (
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
                    </>
                  )}
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
                  <span className="text-white font-medium">Lichtquellen {discovered ? `(${config.lights.length}/${discovered.lights.length})` : ''}</span>
                </div>
                {expandedSections.lights ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
              </button>
              {expandedSections.lights && (
                <div className="p-4">
                  {!discovered ? (
                    <p className="text-gray-500 text-sm">Klicke auf "Discover" um Entitäten zu laden</p>
                  ) : discovered.lights.length === 0 ? (
                    <p className="text-gray-500 text-sm">Keine Lichtquellen gefunden</p>
                  ) : (
                    <>
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Suchen..."
                          value={searchFilters.lights || ''}
                          onChange={(e) => updateSearchFilter('lights', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                        />
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {filterEntities(discovered.lights, searchFilters.lights).map(entity => (
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
                    </>
                  )}
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
                  <span className="text-white font-medium">Rollos {discovered ? `(${config.covers.length}/${discovered.covers.length})` : ''}</span>
                </div>
                {expandedSections.covers ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
              </button>
              {expandedSections.covers && (
                <div className="p-4">
                  {!discovered ? (
                    <p className="text-gray-500 text-sm">Klicke auf "Discover" um Entitäten zu laden</p>
                  ) : discovered.covers.length === 0 ? (
                    <p className="text-gray-500 text-sm">Keine Rollos gefunden</p>
                  ) : (
                    <>
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Suchen..."
                          value={searchFilters.covers || ''}
                          onChange={(e) => updateSearchFilter('covers', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                        />
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {filterEntities(discovered.covers, searchFilters.covers).map(entity => (
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
                    </>
                  )}
                </div>
              )}
            </div>
            
            <div className="border border-white/5 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('awnings')}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Sun className="w-5 h-5 text-amber-500" />
                  <span className="text-white font-medium">Markisen {discovered ? `(${config.awnings?.length || 0}/${discovered.covers.length})` : ''}</span>
                </div>
                {expandedSections.awnings ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
              </button>
              {expandedSections.awnings && (
                <div className="p-4">
                  {!discovered ? (
                    <p className="text-gray-500 text-sm">Klicke auf "Discover" um Entitäten zu laden</p>
                  ) : discovered.covers.length === 0 ? (
                    <p className="text-gray-500 text-sm">Keine Markisen gefunden</p>
                  ) : (
                    <>
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Suchen..."
                          value={searchFilters.awnings || ''}
                          onChange={(e) => updateSearchFilter('awnings', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                        />
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {filterEntities(discovered.covers, searchFilters.awnings).map(entity => (
                          <label key={entity.entity_id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.awnings?.includes(entity.entity_id) || false}
                              onChange={() => {
                                const currentAwnings = config.awnings || []
                                const isSelected = currentAwnings.includes(entity.entity_id)
                                setConfig(prev => ({
                                  ...prev,
                                  awnings: isSelected
                                    ? currentAwnings.filter(id => id !== entity.entity_id)
                                    : [...currentAwnings, entity.entity_id]
                                }))
                              }}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="text-gray-300">{getFriendlyName(entity)}</span>
                            <span className="text-xs text-gray-500">{entity.entity_id}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <div className="border border-white/5 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('curtains')}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Theater className="w-5 h-5 text-purple-400" />
                  <span className="text-white font-medium">Gardinen {discovered ? `(${config.curtains?.length || 0}/${discovered.covers.length})` : ''}</span>
                </div>
                {expandedSections.curtains ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
              </button>
              {expandedSections.curtains && (
                <div className="p-4">
                  {!discovered ? (
                    <p className="text-gray-500 text-sm">Klicke auf "Discover" um Entitäten zu laden</p>
                  ) : discovered.covers.length === 0 ? (
                    <p className="text-gray-500 text-sm">Keine Gardinen gefunden</p>
                  ) : (
                    <>
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Suchen..."
                          value={searchFilters.curtains || ''}
                          onChange={(e) => updateSearchFilter('curtains', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                        />
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {filterEntities(discovered.covers, searchFilters.curtains).map(entity => (
                          <label key={entity.entity_id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.curtains?.includes(entity.entity_id) || false}
                              onChange={() => {
                                const currentCurtains = config.curtains || []
                                const isSelected = currentCurtains.includes(entity.entity_id)
                                setConfig(prev => ({
                                  ...prev,
                                  curtains: isSelected
                                    ? currentCurtains.filter(id => id !== entity.entity_id)
                                    : [...currentCurtains, entity.entity_id]
                                }))
                              }}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="text-gray-300">{getFriendlyName(entity)}</span>
                            <span className="text-xs text-gray-500">{entity.entity_id}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
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
                  <span className="text-white font-medium">Klima / Heizung {discovered ? `(${config.climates?.length || 0}/${(discovered.climates?.length || 0) + (discovered.fans?.length || 0)})` : ''}</span>
                </div>
                {expandedSections.climates ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
              </button>
              {expandedSections.climates && (
                <div className="p-4">
                  {!discovered ? (
                    <p className="text-gray-500 text-sm">Klicke auf "Discover" um Entitäten zu laden</p>
                  ) : (
                    <>
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Suchen..."
                          value={searchFilters.climates || ''}
                          onChange={(e) => updateSearchFilter('climates', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                        />
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {filterEntities(discovered.climates || [], searchFilters.climates).map(entity => (
                          <label key={entity.entity_id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.climates?.includes(entity.entity_id) || false}
                              onChange={() => toggleEntity('climates', entity.entity_id)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                            />
                            <Thermometer className="w-4 h-4 text-orange-400" />
                            <span className="text-gray-300">{getFriendlyName(entity)}</span>
                          </label>
                        ))}
                        {filterEntities(discovered.fans || [], searchFilters.climates).map(entity => (
                          <label key={entity.entity_id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.climates?.includes(entity.entity_id) || false}
                              onChange={() => toggleEntity('climates', entity.entity_id)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                            />
                            <Fan className="w-4 h-4 text-cyan-400" />
                            <span className="text-gray-300">{getFriendlyName(entity)}</span>
                          </label>
                        ))}
                      </div>
                    </>
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
                  <span className="text-white font-medium">Kalender {discovered ? `(${config.calendars?.length || 0}/${discovered.calendars?.length || 0})` : ''}</span>
                </div>
                {expandedSections.calendars ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
              </button>
              {expandedSections.calendars && (
                <div className="p-4">
                  {!discovered ? (
                    <p className="text-gray-500 text-sm">Klicke auf "Discover" um Entitäten zu laden</p>
                  ) : (discovered.calendars?.length || 0) === 0 ? (
                    <p className="text-gray-500 text-sm">Keine Kalender gefunden</p>
                  ) : (
                    <>
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Suchen..."
                          value={searchFilters.calendars || ''}
                          onChange={(e) => updateSearchFilter('calendars', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                        />
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {filterEntities(discovered.calendars || [], searchFilters.calendars).map(entity => (
                          <label key={entity.entity_id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.calendars?.includes(entity.entity_id) || false}
                              onChange={() => toggleEntity('calendars', entity.entity_id)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="text-gray-300">{getFriendlyName(entity)}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <div className="border border-white/5 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('cameras')}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Video className="w-5 h-5 text-red-400" />
                  <span className="text-white font-medium">Kameras (Backup) {discovered ? `(${config.cameras?.length || 0}/${discovered.cameras?.length || 0})` : ''}</span>
                </div>
                {expandedSections.cameras ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
              </button>
              {expandedSections.cameras && (
                <div className="p-4">
                  <p className="text-sm text-amber-400/80 mb-3">
                    Diese Kameras dienen als Backup, falls Unifi Protect nicht konfiguriert ist.
                  </p>
                  {!discovered ? (
                    <p className="text-gray-500 text-sm">Klicke auf "Discover" um Entitäten zu laden</p>
                  ) : (discovered.cameras?.length || 0) === 0 ? (
                    <p className="text-gray-500 text-sm">Keine Kameras gefunden</p>
                  ) : (
                    <>
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Suchen..."
                          value={searchFilters.cameras || ''}
                          onChange={(e) => updateSearchFilter('cameras', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                        />
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {filterEntities(discovered.cameras || [], searchFilters.cameras).map(entity => (
                          <label key={entity.entity_id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.cameras?.includes(entity.entity_id) || false}
                              onChange={() => toggleEntity('cameras', entity.entity_id)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="text-gray-300">{getFriendlyName(entity)}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
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
                  <span className="text-white font-medium">Geräte / Appliances {discovered ? `(${config.appliances?.length || 0}/${(discovered.sensors?.filter(s => s.attributes?.device_class === 'power' || s.attributes?.unit_of_measurement === 'W' || s.attributes?.unit_of_measurement === 'kW').length || 0) + (discovered.switches?.length || 0)})` : ''}</span>
                </div>
                {expandedSections.appliances ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
              </button>
              {expandedSections.appliances && (
                <div className="p-4">
                  {!discovered ? (
                    <p className="text-gray-500 text-sm">Klicke auf "Discover" um Entitäten zu laden</p>
                  ) : (
                    <>
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Suchen..."
                          value={searchFilters.appliances || ''}
                          onChange={(e) => updateSearchFilter('appliances', e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
                        />
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {filterEntities(discovered.sensors?.filter(s => s.attributes?.device_class === 'power' || s.attributes?.unit_of_measurement === 'W' || s.attributes?.unit_of_measurement === 'kW') || [], searchFilters.appliances).map(entity => (
                          <label key={entity.entity_id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.appliances?.includes(entity.entity_id) || false}
                              onChange={() => toggleEntity('appliances', entity.entity_id)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="text-gray-300">{getFriendlyName(entity)}</span>
                          </label>
                        ))}
                        {filterEntities(discovered.switches || [], searchFilters.appliances).map(entity => (
                          <label key={entity.entity_id} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.appliances?.includes(entity.entity_id) || false}
                              onChange={() => toggleEntity('appliances', entity.entity_id)}
                              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span className="text-gray-300">{getFriendlyName(entity)}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <div className="border border-white/5 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('energy')}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <span className="text-white font-medium">Energie / Solar</span>
                </div>
                {expandedSections.energy ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
              </button>
              {expandedSections.energy && (
                <div className="p-4 space-y-4">
                  <p className="text-sm text-gray-400">
                    Wähle die Sensoren für dein Energie-Dashboard. Du kannst auch Summen-Sensoren oder Helfer-Entitäten verwenden.
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Solar-Produktion (W)</label>
                      <select
                        value={config.energy?.solarEntityId || ''}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          energy: { ...prev.energy, solarEntityId: e.target.value || undefined }
                        }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      >
                        <option value="">-- Nicht konfiguriert --</option>
                        {discovered?.sensors?.filter(s => 
                          s.attributes?.device_class === 'power' || 
                          s.attributes?.unit_of_measurement === 'W' ||
                          s.entity_id.includes('solar') ||
                          s.entity_id.includes('pv')
                        ).map(sensor => (
                          <option key={sensor.entity_id} value={sensor.entity_id}>
                            {getFriendlyName(sensor)} ({sensor.state} {String(sensor.attributes?.unit_of_measurement || 'W')})
                          </option>
                        ))}
                        <optgroup label="Helfer (input_number)">
                          {discovered?.inputNumbers?.map(entity => (
                            <option key={entity.entity_id} value={entity.entity_id}>
                              {getFriendlyName(entity)} ({entity.state})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Alle Sensoren">
                          {discovered?.sensors?.map(sensor => (
                            <option key={sensor.entity_id} value={sensor.entity_id}>
                              {getFriendlyName(sensor)} ({sensor.state})
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Batterie-Leistung (W)</label>
                      <select
                        value={config.energy?.batteryEntityId || ''}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          energy: { ...prev.energy, batteryEntityId: e.target.value || undefined }
                        }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      >
                        <option value="">-- Nicht konfiguriert --</option>
                        {discovered?.sensors?.filter(s => 
                          s.entity_id.includes('battery') && 
                          (s.attributes?.unit_of_measurement === 'W' || s.attributes?.device_class === 'power')
                        ).map(sensor => (
                          <option key={sensor.entity_id} value={sensor.entity_id}>
                            {getFriendlyName(sensor)} ({sensor.state} {String(sensor.attributes?.unit_of_measurement || 'W')})
                          </option>
                        ))}
                        <optgroup label="Helfer (input_number)">
                          {discovered?.inputNumbers?.map(entity => (
                            <option key={entity.entity_id} value={entity.entity_id}>
                              {getFriendlyName(entity)} ({entity.state})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Alle Sensoren">
                          {discovered?.sensors?.map(sensor => (
                            <option key={sensor.entity_id} value={sensor.entity_id}>
                              {getFriendlyName(sensor)} ({sensor.state})
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Batterie-Level (%)</label>
                      <select
                        value={config.energy?.batteryLevelEntityId || ''}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          energy: { ...prev.energy, batteryLevelEntityId: e.target.value || undefined }
                        }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      >
                        <option value="">-- Nicht konfiguriert --</option>
                        {discovered?.sensors?.filter(s => 
                          s.attributes?.device_class === 'battery' || 
                          s.attributes?.unit_of_measurement === '%' ||
                          s.entity_id.includes('battery') && s.entity_id.includes('level')
                        ).map(sensor => (
                          <option key={sensor.entity_id} value={sensor.entity_id}>
                            {getFriendlyName(sensor)} ({sensor.state} {String(sensor.attributes?.unit_of_measurement || '%')})
                          </option>
                        ))}
                        <optgroup label="Helfer (input_number)">
                          {discovered?.inputNumbers?.map(entity => (
                            <option key={entity.entity_id} value={entity.entity_id}>
                              {getFriendlyName(entity)} ({entity.state})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Alle Sensoren">
                          {discovered?.sensors?.map(sensor => (
                            <option key={sensor.entity_id} value={sensor.entity_id}>
                              {getFriendlyName(sensor)} ({sensor.state})
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Netz-Leistung (W) - positiv = Bezug, negativ = Einspeisung</label>
                      <select
                        value={config.energy?.gridEntityId || ''}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          energy: { ...prev.energy, gridEntityId: e.target.value || undefined }
                        }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      >
                        <option value="">-- Nicht konfiguriert --</option>
                        {discovered?.sensors?.filter(s => 
                          s.entity_id.includes('grid') || 
                          s.entity_id.includes('netz') ||
                          (s.attributes?.unit_of_measurement === 'W' && s.attributes?.device_class === 'power')
                        ).map(sensor => (
                          <option key={sensor.entity_id} value={sensor.entity_id}>
                            {getFriendlyName(sensor)} ({sensor.state} {String(sensor.attributes?.unit_of_measurement || 'W')})
                          </option>
                        ))}
                        <optgroup label="Alle Sensoren">
                          {discovered?.sensors?.map(sensor => (
                            <option key={sensor.entity_id} value={sensor.entity_id}>
                              {getFriendlyName(sensor)} ({sensor.state})
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Hausverbrauch (W) - Summen-Sensor oder Helfer</label>
                      <select
                        value={config.energy?.houseEntityId || ''}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          energy: { ...prev.energy, houseEntityId: e.target.value || undefined }
                        }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                      >
                        <option value="">-- Nicht konfiguriert --</option>
                        {discovered?.sensors?.filter(s => 
                          s.entity_id.includes('house') || 
                          s.entity_id.includes('home') ||
                          s.entity_id.includes('consumption') ||
                          s.entity_id.includes('verbrauch') ||
                          s.entity_id.includes('stromverbrauch') ||
                          s.entity_id.includes('load') ||
                          s.entity_id.includes('power') ||
                          s.attributes?.unit_of_measurement === 'W' ||
                          s.attributes?.device_class === 'power'
                        ).map(sensor => (
                          <option key={sensor.entity_id} value={sensor.entity_id}>
                            {getFriendlyName(sensor)} ({sensor.state} {String(sensor.attributes?.unit_of_measurement || 'W')})
                          </option>
                        ))}
                        <optgroup label="Helfer (input_number)">
                          {discovered?.inputNumbers?.map(entity => (
                            <option key={entity.entity_id} value={entity.entity_id}>
                              {getFriendlyName(entity)} ({entity.state})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Helfer (number)">
                          {discovered?.numbers?.map(entity => (
                            <option key={entity.entity_id} value={entity.entity_id}>
                              {getFriendlyName(entity)} ({entity.state})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Alle Sensoren">
                          {discovered?.sensors?.map(sensor => (
                            <option key={sensor.entity_id} value={sensor.entity_id}>
                              {getFriendlyName(sensor)} ({sensor.state})
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="border border-white/5 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('weather')}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CloudSun className="w-5 h-5 text-sky-400" />
                  <span className="text-white font-medium">Wetter & Temperatur</span>
                </div>
                {expandedSections.weather ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
              </button>
              {expandedSections.weather && (
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Wetter-Entity (für Vorhersage im Kalender)</label>
                    <select
                      value={config.weatherEntityId || ''}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        weatherEntityId: e.target.value || undefined
                      }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="">-- Nicht konfiguriert --</option>
                      {discovered?.weather?.map(entity => (
                        <option key={entity.entity_id} value={entity.entity_id}>
                          {getFriendlyName(entity)} ({entity.state})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Außentemperatur-Sensor (für Dashboard)</label>
                    <select
                      value={config.temperatureSensorId || ''}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        temperatureSensorId: e.target.value || undefined
                      }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="">-- Nicht konfiguriert --</option>
                      {discovered?.sensors?.filter(s => 
                        s.attributes?.device_class === 'temperature' ||
                        s.attributes?.unit_of_measurement === '°C' ||
                        s.attributes?.unit_of_measurement === '°F'
                      ).map(sensor => (
                        <option key={sensor.entity_id} value={sensor.entity_id}>
                          {getFriendlyName(sensor)} ({sensor.state}{String(sensor.attributes?.unit_of_measurement || '°C')})
                        </option>
                      ))}
                      <optgroup label="Alle Sensoren">
                        {discovered?.sensors?.map(sensor => (
                          <option key={sensor.entity_id} value={sensor.entity_id}>
                            {getFriendlyName(sensor)} ({sensor.state})
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Müllkalender (für Dashboard-Widget)</label>
                    <select
                      value={config.trashCalendarId || ''}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        trashCalendarId: e.target.value || undefined
                      }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="">-- Nicht konfiguriert --</option>
                      {discovered?.calendars?.map(entity => (
                        <option key={entity.entity_id} value={entity.entity_id}>
                          {getFriendlyName(entity)}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Zeigt Müllabfuhr-Termine auf dem Dashboard an
                    </p>
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
                  <span className="text-white font-medium">Aktionen {discovered ? `(${config.customButtons?.length || 0}/${discovered.scripts?.length || 0})` : ''}</span>
                </div>
                {expandedSections.buttons ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
              </button>
              {expandedSections.buttons && (
                <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                  {!discovered ? (
                    <p className="text-gray-500 text-sm">Klicke auf "Discover" um Entitäten zu laden</p>
                  ) : discovered.scripts.length === 0 ? (
                    <p className="text-gray-500 text-sm">Keine Skripte gefunden</p>
                  ) : (
                    discovered.scripts.map(entity => {
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
                                const newButton = {
                                  id: `btn-${Date.now()}`,
                                  label: getFriendlyName(entity),
                                  icon: 'play',
                                  domain: 'script',
                                  service: 'turn_on',
                                  entityId: entity.entity_id
                                }
                                setConfig(prev => ({
                                  ...prev,
                                  customButtons: [...(prev.customButtons || []), newButton]
                                }))
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                          />
                          <span className="text-gray-300">{getFriendlyName(entity)}</span>
                        </label>
                      )
                    })
                  )}
                </div>
              )}
            </div>
            
            <div className="border border-white/5 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleSection('intercoms')}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <DoorOpen className="w-5 h-5 text-green-400" />
                  <span className="text-white font-medium">Intercoms (HA) ({config.intercoms?.length || 0})</span>
                </div>
                {expandedSections.intercoms ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
              </button>
              {expandedSections.intercoms && (
                <div className="p-4 space-y-4">
                  <p className="text-sm text-amber-400/80">
                    Diese Intercoms dienen als Backup, falls Unifi Access nicht konfiguriert ist.
                  </p>
                  
                  {config.intercoms?.map((intercom, index) => (
                    <div key={intercom.id} className="p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">{intercom.name}</span>
                        <button
                          onClick={() => removeIntercom(index)}
                          className="p-1 hover:bg-red-500/20 rounded text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-gray-400 space-y-1">
                        <p>Kamera: {intercom.cameraEntityId}</p>
                        {intercom.lockEntityId && <p>Schloss: {intercom.lockEntityId}</p>}
                      </div>
                    </div>
                  ))}
                  
                  <div className="space-y-3 pt-3 border-t border-white/10">
                    <input
                      type="text"
                      placeholder="Name (z.B. Haustür)"
                      value={newIntercom.name}
                      onChange={(e) => setNewIntercom(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                    />
                    <select
                      value={newIntercom.cameraEntityId}
                      onChange={(e) => setNewIntercom(prev => ({ ...prev, cameraEntityId: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                    >
                      <option value="">Kamera auswählen...</option>
                      {discovered?.cameras?.map(c => (
                        <option key={c.entity_id} value={c.entity_id}>{getFriendlyName(c)}</option>
                      ))}
                    </select>
                    <select
                      value={newIntercom.lockEntityId}
                      onChange={(e) => setNewIntercom(prev => ({ ...prev, lockEntityId: e.target.value }))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                    >
                      <option value="">Schloss auswählen (optional)...</option>
                      {discovered?.locks?.map(l => (
                        <option key={l.entity_id} value={l.entity_id}>{getFriendlyName(l)}</option>
                      ))}
                    </select>
                    <button
                      onClick={addIntercom}
                      disabled={!newIntercom.name || !newIntercom.cameraEntityId}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      Intercom hinzufügen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
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
            disabled={saving || !canEditGlobalSettings}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
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
