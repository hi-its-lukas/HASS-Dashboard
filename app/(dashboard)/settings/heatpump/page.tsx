'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, Flame, Loader2, Save, ChevronDown, ChevronRight, Thermometer,
  Droplets, Activity, Zap, Radio, CheckCircle
} from 'lucide-react'
import { Card } from '@/components/ui/card'

interface HeatPumpConfig {
  operationModeEntityId?: string
  outdoorTemperatureEntityId?: string
  activeErrorEntityId?: string
  temperatures?: {
    totalFlowEntityId?: string
    totalReturnEntityId?: string
    upperFloorFlowEntityId?: string
    upperFloorReturnEntityId?: string
    groundFloorFlowEntityId?: string
    groundFloorReturnEntityId?: string
  }
  hotWater?: {
    actualTemperatureEntityId?: string
    targetTemperatureEntityId?: string
    bufferActualEntityId?: string
    bufferTargetEntityId?: string
  }
  compressor?: {
    flowTemperatureEntityId?: string
    returnTemperatureEntityId?: string
    hotGasTemperatureEntityId?: string
    highPressureEntityId?: string
    lowPressureEntityId?: string
    volumeStreamEntityId?: string
    heaterPressureEntityId?: string
  }
  energy?: {
    consumedHeatingEntityId?: string
    consumedHeatingTodayEntityId?: string
    consumedHeatingTotalEntityId?: string
    producedHeatingEntityId?: string
    producedHeatingTodayEntityId?: string
    producedHeatingTotalEntityId?: string
    consumedWaterEntityId?: string
    consumedWaterTodayEntityId?: string
    consumedWaterTotalEntityId?: string
    producedWaterEntityId?: string
    producedWaterTodayEntityId?: string
    producedWaterTotalEntityId?: string
  }
  sgReady?: {
    stateEntityId?: string
    activeEntityId?: string
    input1EntityId?: string
    input2EntityId?: string
  }
}

function cleanEmptyStrings<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') return (obj === '' ? undefined : obj) as T
  if (typeof obj !== 'object') return obj
  
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const cleaned = cleanEmptyStrings(value)
    if (cleaned !== undefined) {
      result[key] = cleaned
    }
  }
  return (Object.keys(result).length > 0 ? result : undefined) as T
}

interface HAEntity {
  entity_id: string
  state: string
  attributes: Record<string, unknown>
}

const defaultConfig: HeatPumpConfig = {
  operationModeEntityId: '',
  outdoorTemperatureEntityId: '',
  activeErrorEntityId: '',
  temperatures: {
    totalFlowEntityId: '',
    totalReturnEntityId: '',
    upperFloorFlowEntityId: '',
    upperFloorReturnEntityId: '',
    groundFloorFlowEntityId: '',
    groundFloorReturnEntityId: ''
  },
  hotWater: {
    actualTemperatureEntityId: '',
    targetTemperatureEntityId: '',
    bufferActualEntityId: '',
    bufferTargetEntityId: ''
  },
  compressor: {
    flowTemperatureEntityId: '',
    returnTemperatureEntityId: '',
    hotGasTemperatureEntityId: '',
    highPressureEntityId: '',
    lowPressureEntityId: '',
    volumeStreamEntityId: '',
    heaterPressureEntityId: ''
  },
  energy: {
    consumedHeatingEntityId: '',
    consumedHeatingTodayEntityId: '',
    consumedHeatingTotalEntityId: '',
    producedHeatingEntityId: '',
    producedHeatingTodayEntityId: '',
    producedHeatingTotalEntityId: '',
    consumedWaterEntityId: '',
    consumedWaterTodayEntityId: '',
    consumedWaterTotalEntityId: '',
    producedWaterEntityId: '',
    producedWaterTodayEntityId: '',
    producedWaterTotalEntityId: ''
  },
  sgReady: {
    stateEntityId: '',
    activeEntityId: '',
    input1EntityId: '',
    input2EntityId: ''
  }
}

function EntitySelect({
  label,
  value,
  onChange,
  entities,
  filter
}: {
  label: string
  value: string
  onChange: (val: string) => void
  entities: HAEntity[]
  filter?: (e: HAEntity) => boolean
}) {
  const filtered = filter ? entities.filter(filter) : entities
  
  return (
    <div>
      <label className="block text-sm text-white/60 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-cyan"
      >
        <option value="" className="bg-gray-800">-- Nicht konfiguriert --</option>
        {filtered.map((entity) => (
          <option key={entity.entity_id} value={entity.entity_id} className="bg-gray-800">
            {entity.attributes.friendly_name || entity.entity_id}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function HeatPumpSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null)
  const [canEditGlobalSettings, setCanEditGlobalSettings] = useState(false)
  const [config, setConfig] = useState<HeatPumpConfig>(defaultConfig)
  const [entities, setEntities] = useState<HAEntity[]>([])
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    general: true,
    temperatures: true,
    hotWater: true,
    compressor: false,
    energy: true,
    sgReady: false
  })
  
  useEffect(() => {
    loadSettings()
    loadEntities()
  }, [])
  
  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        if (data.layoutConfig?.heatPump) {
          setConfig(prev => ({
            ...prev,
            ...data.layoutConfig.heatPump,
            temperatures: { ...prev.temperatures, ...data.layoutConfig.heatPump?.temperatures },
            hotWater: { ...prev.hotWater, ...data.layoutConfig.heatPump?.hotWater },
            compressor: { ...prev.compressor, ...data.layoutConfig.heatPump?.compressor },
            energy: { ...prev.energy, ...data.layoutConfig.heatPump?.energy },
            sgReady: { ...prev.sgReady, ...data.layoutConfig.heatPump?.sgReady }
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
  
  const loadEntities = async () => {
    try {
      const res = await fetch('/api/ha/states')
      if (res.ok) {
        const data = await res.json()
        setEntities(data)
      }
    } catch (error) {
      console.error('Failed to load entities:', error)
    }
  }
  
  const saveSettings = async () => {
    setSaving(true)
    setSaveResult(null)
    
    try {
      const cleanedConfig = cleanEmptyStrings(config)
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layoutConfig: { heatPump: cleanedConfig }
        })
      })
      
      if (res.ok) {
        setSaveResult({ success: true, message: 'Einstellungen gespeichert' })
      } else {
        const data = await res.json()
        setSaveResult({ success: false, message: data.error || 'Speichern fehlgeschlagen' })
      }
    } catch (error) {
      setSaveResult({ success: false, message: 'Netzwerkfehler' })
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
  
  const updateConfig = useCallback(<K extends keyof HeatPumpConfig>(
    key: K, 
    value: HeatPumpConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }, [])
  
  const updateNestedConfig = useCallback(<
    K extends 'temperatures' | 'hotWater' | 'compressor' | 'energy' | 'sgReady'
  >(
    section: K,
    key: keyof HeatPumpConfig[K],
    value: string
  ) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }))
  }, [])
  
  const sensorEntities = entities.filter(e => e.entity_id.startsWith('sensor.'))
  const binarySensorEntities = entities.filter(e => e.entity_id.startsWith('binary_sensor.') || e.entity_id.startsWith('sensor.'))
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 safe-top max-w-4xl mx-auto">
      <header className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Wärmepumpe</h1>
          <p className="text-sm text-white/60">Stiebel Eltron Konfiguration</p>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving || !canEditGlobalSettings}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent-cyan hover:bg-accent-cyan/80 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Speichern
        </button>
      </header>
      
      {saveResult && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          saveResult.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          <CheckCircle className="w-5 h-5" />
          {saveResult.message}
        </div>
      )}
      
      {!canEditGlobalSettings && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-500/20 text-yellow-400">
          Du hast keine Berechtigung, globale Einstellungen zu bearbeiten.
        </div>
      )}
      
      <div className="space-y-4">
        <Card className="bg-white/10 backdrop-blur-md border-white/20 overflow-hidden">
          <button
            onClick={() => toggleSection('general')}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <Flame className="w-5 h-5 text-accent-cyan" />
              <span className="font-medium text-white">Allgemein</span>
            </div>
            {expandedSections.general ? (
              <ChevronDown className="w-5 h-5 text-white/60" />
            ) : (
              <ChevronRight className="w-5 h-5 text-white/60" />
            )}
          </button>
          
          {expandedSections.general && (
            <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <EntitySelect
                label="Betriebsmodus"
                value={config.operationModeEntityId}
                onChange={(v) => updateConfig('operationModeEntityId', v)}
                entities={sensorEntities}
              />
              <EntitySelect
                label="Außentemperatur"
                value={config.outdoorTemperatureEntityId}
                onChange={(v) => updateConfig('outdoorTemperatureEntityId', v)}
                entities={sensorEntities}
              />
              <EntitySelect
                label="Aktiver Fehler"
                value={config.activeErrorEntityId}
                onChange={(v) => updateConfig('activeErrorEntityId', v)}
                entities={binarySensorEntities}
              />
            </div>
          )}
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-md border-white/20 overflow-hidden">
          <button
            onClick={() => toggleSection('temperatures')}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <Thermometer className="w-5 h-5 text-accent-orange" />
              <span className="font-medium text-white">Heizkreis-Temperaturen</span>
            </div>
            {expandedSections.temperatures ? (
              <ChevronDown className="w-5 h-5 text-white/60" />
            ) : (
              <ChevronRight className="w-5 h-5 text-white/60" />
            )}
          </button>
          
          {expandedSections.temperatures && (
            <div className="px-4 pb-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EntitySelect
                  label="Gesamt Vorlauf"
                  value={config.temperatures.totalFlowEntityId}
                  onChange={(v) => updateNestedConfig('temperatures', 'totalFlowEntityId', v)}
                  entities={sensorEntities}
                />
                <EntitySelect
                  label="Gesamt Rücklauf"
                  value={config.temperatures.totalReturnEntityId}
                  onChange={(v) => updateNestedConfig('temperatures', 'totalReturnEntityId', v)}
                  entities={sensorEntities}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EntitySelect
                  label="OG Vorlauf"
                  value={config.temperatures.upperFloorFlowEntityId}
                  onChange={(v) => updateNestedConfig('temperatures', 'upperFloorFlowEntityId', v)}
                  entities={sensorEntities}
                />
                <EntitySelect
                  label="OG Rücklauf"
                  value={config.temperatures.upperFloorReturnEntityId}
                  onChange={(v) => updateNestedConfig('temperatures', 'upperFloorReturnEntityId', v)}
                  entities={sensorEntities}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EntitySelect
                  label="EG Vorlauf"
                  value={config.temperatures.groundFloorFlowEntityId}
                  onChange={(v) => updateNestedConfig('temperatures', 'groundFloorFlowEntityId', v)}
                  entities={sensorEntities}
                />
                <EntitySelect
                  label="EG Rücklauf"
                  value={config.temperatures.groundFloorReturnEntityId}
                  onChange={(v) => updateNestedConfig('temperatures', 'groundFloorReturnEntityId', v)}
                  entities={sensorEntities}
                />
              </div>
            </div>
          )}
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-md border-white/20 overflow-hidden">
          <button
            onClick={() => toggleSection('hotWater')}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <Droplets className="w-5 h-5 text-accent-cyan" />
              <span className="font-medium text-white">Warmwasser</span>
            </div>
            {expandedSections.hotWater ? (
              <ChevronDown className="w-5 h-5 text-white/60" />
            ) : (
              <ChevronRight className="w-5 h-5 text-white/60" />
            )}
          </button>
          
          {expandedSections.hotWater && (
            <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <EntitySelect
                label="Ist-Temperatur"
                value={config.hotWater.actualTemperatureEntityId}
                onChange={(v) => updateNestedConfig('hotWater', 'actualTemperatureEntityId', v)}
                entities={sensorEntities}
              />
              <EntitySelect
                label="Soll-Temperatur"
                value={config.hotWater.targetTemperatureEntityId}
                onChange={(v) => updateNestedConfig('hotWater', 'targetTemperatureEntityId', v)}
                entities={sensorEntities}
              />
              <EntitySelect
                label="Puffer Ist"
                value={config.hotWater.bufferActualEntityId}
                onChange={(v) => updateNestedConfig('hotWater', 'bufferActualEntityId', v)}
                entities={sensorEntities}
              />
              <EntitySelect
                label="Puffer Soll"
                value={config.hotWater.bufferTargetEntityId}
                onChange={(v) => updateNestedConfig('hotWater', 'bufferTargetEntityId', v)}
                entities={sensorEntities}
              />
            </div>
          )}
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-md border-white/20 overflow-hidden">
          <button
            onClick={() => toggleSection('compressor')}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-accent-purple" />
              <span className="font-medium text-white">Kompressor</span>
            </div>
            {expandedSections.compressor ? (
              <ChevronDown className="w-5 h-5 text-white/60" />
            ) : (
              <ChevronRight className="w-5 h-5 text-white/60" />
            )}
          </button>
          
          {expandedSections.compressor && (
            <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <EntitySelect
                label="Vorlauf"
                value={config.compressor.flowTemperatureEntityId}
                onChange={(v) => updateNestedConfig('compressor', 'flowTemperatureEntityId', v)}
                entities={sensorEntities}
              />
              <EntitySelect
                label="Rücklauf"
                value={config.compressor.returnTemperatureEntityId}
                onChange={(v) => updateNestedConfig('compressor', 'returnTemperatureEntityId', v)}
                entities={sensorEntities}
              />
              <EntitySelect
                label="Heißgas"
                value={config.compressor.hotGasTemperatureEntityId}
                onChange={(v) => updateNestedConfig('compressor', 'hotGasTemperatureEntityId', v)}
                entities={sensorEntities}
              />
              <EntitySelect
                label="Hochdruck"
                value={config.compressor.highPressureEntityId}
                onChange={(v) => updateNestedConfig('compressor', 'highPressureEntityId', v)}
                entities={sensorEntities}
              />
              <EntitySelect
                label="Niederdruck"
                value={config.compressor.lowPressureEntityId}
                onChange={(v) => updateNestedConfig('compressor', 'lowPressureEntityId', v)}
                entities={sensorEntities}
              />
              <EntitySelect
                label="Volumenstrom"
                value={config.compressor.volumeStreamEntityId}
                onChange={(v) => updateNestedConfig('compressor', 'volumeStreamEntityId', v)}
                entities={sensorEntities}
              />
              <EntitySelect
                label="Heizungsdruck"
                value={config.compressor.heaterPressureEntityId}
                onChange={(v) => updateNestedConfig('compressor', 'heaterPressureEntityId', v)}
                entities={sensorEntities}
              />
            </div>
          )}
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-md border-white/20 overflow-hidden">
          <button
            onClick={() => toggleSection('energy')}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-accent-yellow" />
              <span className="font-medium text-white">Energie</span>
            </div>
            {expandedSections.energy ? (
              <ChevronDown className="w-5 h-5 text-white/60" />
            ) : (
              <ChevronRight className="w-5 h-5 text-white/60" />
            )}
          </button>
          
          {expandedSections.energy && (
            <div className="px-4 pb-4 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-white/60 mb-3">Heizung</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <EntitySelect
                    label="Verbrauch aktuell (kW)"
                    value={config.energy.consumedHeatingEntityId}
                    onChange={(v) => updateNestedConfig('energy', 'consumedHeatingEntityId', v)}
                    entities={sensorEntities}
                  />
                  <EntitySelect
                    label="Erzeugt aktuell (kW)"
                    value={config.energy.producedHeatingEntityId}
                    onChange={(v) => updateNestedConfig('energy', 'producedHeatingEntityId', v)}
                    entities={sensorEntities}
                  />
                  <div></div>
                  <EntitySelect
                    label="Verbrauch heute (kWh)"
                    value={config.energy.consumedHeatingTodayEntityId}
                    onChange={(v) => updateNestedConfig('energy', 'consumedHeatingTodayEntityId', v)}
                    entities={sensorEntities}
                  />
                  <EntitySelect
                    label="Erzeugt heute (kWh)"
                    value={config.energy.producedHeatingTodayEntityId}
                    onChange={(v) => updateNestedConfig('energy', 'producedHeatingTodayEntityId', v)}
                    entities={sensorEntities}
                  />
                  <div></div>
                  <EntitySelect
                    label="Verbrauch gesamt (kWh)"
                    value={config.energy.consumedHeatingTotalEntityId}
                    onChange={(v) => updateNestedConfig('energy', 'consumedHeatingTotalEntityId', v)}
                    entities={sensorEntities}
                  />
                  <EntitySelect
                    label="Erzeugt gesamt (kWh)"
                    value={config.energy.producedHeatingTotalEntityId}
                    onChange={(v) => updateNestedConfig('energy', 'producedHeatingTotalEntityId', v)}
                    entities={sensorEntities}
                  />
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-white/60 mb-3">Warmwasser</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <EntitySelect
                    label="Verbrauch aktuell (kW)"
                    value={config.energy.consumedWaterEntityId}
                    onChange={(v) => updateNestedConfig('energy', 'consumedWaterEntityId', v)}
                    entities={sensorEntities}
                  />
                  <EntitySelect
                    label="Erzeugt aktuell (kW)"
                    value={config.energy.producedWaterEntityId}
                    onChange={(v) => updateNestedConfig('energy', 'producedWaterEntityId', v)}
                    entities={sensorEntities}
                  />
                  <div></div>
                  <EntitySelect
                    label="Verbrauch heute (kWh)"
                    value={config.energy.consumedWaterTodayEntityId}
                    onChange={(v) => updateNestedConfig('energy', 'consumedWaterTodayEntityId', v)}
                    entities={sensorEntities}
                  />
                  <EntitySelect
                    label="Erzeugt heute (kWh)"
                    value={config.energy.producedWaterTodayEntityId}
                    onChange={(v) => updateNestedConfig('energy', 'producedWaterTodayEntityId', v)}
                    entities={sensorEntities}
                  />
                  <div></div>
                  <EntitySelect
                    label="Verbrauch gesamt (kWh)"
                    value={config.energy.consumedWaterTotalEntityId}
                    onChange={(v) => updateNestedConfig('energy', 'consumedWaterTotalEntityId', v)}
                    entities={sensorEntities}
                  />
                  <EntitySelect
                    label="Erzeugt gesamt (kWh)"
                    value={config.energy.producedWaterTotalEntityId}
                    onChange={(v) => updateNestedConfig('energy', 'producedWaterTotalEntityId', v)}
                    entities={sensorEntities}
                  />
                </div>
              </div>
            </div>
          )}
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-md border-white/20 overflow-hidden">
          <button
            onClick={() => toggleSection('sgReady')}
            className="w-full flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <Radio className="w-5 h-5 text-accent-green" />
              <span className="font-medium text-white">SG Ready</span>
            </div>
            {expandedSections.sgReady ? (
              <ChevronDown className="w-5 h-5 text-white/60" />
            ) : (
              <ChevronRight className="w-5 h-5 text-white/60" />
            )}
          </button>
          
          {expandedSections.sgReady && (
            <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <EntitySelect
                label="Status"
                value={config.sgReady.stateEntityId}
                onChange={(v) => updateNestedConfig('sgReady', 'stateEntityId', v)}
                entities={binarySensorEntities}
              />
              <EntitySelect
                label="Aktiv"
                value={config.sgReady.activeEntityId}
                onChange={(v) => updateNestedConfig('sgReady', 'activeEntityId', v)}
                entities={binarySensorEntities}
              />
              <EntitySelect
                label="Eingang 1"
                value={config.sgReady.input1EntityId}
                onChange={(v) => updateNestedConfig('sgReady', 'input1EntityId', v)}
                entities={binarySensorEntities}
              />
              <EntitySelect
                label="Eingang 2"
                value={config.sgReady.input2EntityId}
                onChange={(v) => updateNestedConfig('sgReady', 'input2EntityId', v)}
                entities={binarySensorEntities}
              />
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
