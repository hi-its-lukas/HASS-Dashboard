'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Thermometer, Droplets, Gauge, Zap, Radio, ChevronDown, ChevronRight, 
  Settings, AlertTriangle, ThermometerSun, ThermometerSnowflake,
  Flame, Activity
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useHAStore } from '@/lib/ha'
import { useConfigStore } from '@/lib/config/store'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type SectionId = 'temperatures' | 'hotWater' | 'compressor' | 'energy' | 'sgReady'

function formatValue(state: string | undefined, unit?: string): string {
  if (!state || state === 'unavailable' || state === 'unknown') return '–'
  const num = parseFloat(state)
  if (isNaN(num)) return state
  return `${num.toFixed(1)}${unit || ''}`
}

function SensorCard({ 
  entityId, 
  label, 
  icon: Icon,
  colorClass = 'text-white'
}: { 
  entityId?: string
  label: string
  icon: React.ElementType
  colorClass?: string
}) {
  const states = useHAStore((s) => s.states)
  
  if (!entityId) return null
  
  const state = states[entityId]
  const value = state?.state
  const unit = state?.attributes?.unit_of_measurement || ''
  
  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20 p-4">
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-full bg-white/10 flex items-center justify-center", colorClass)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/60 truncate">{label}</p>
          <p className="text-lg font-semibold text-white">
            {formatValue(value, unit)}
          </p>
        </div>
      </div>
    </Card>
  )
}

function TemperaturePairCard({
  flowEntityId,
  returnEntityId,
  label
}: {
  flowEntityId?: string
  returnEntityId?: string
  label: string
}) {
  const states = useHAStore((s) => s.states)
  
  if (!flowEntityId && !returnEntityId) return null
  
  const flowState = flowEntityId ? states[flowEntityId] : null
  const returnState = returnEntityId ? states[returnEntityId] : null
  
  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20 p-4">
      <p className="text-sm font-medium text-white mb-3">{label}</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <ThermometerSun className="w-5 h-5 text-accent-orange" />
          <div>
            <p className="text-xs text-white/60">Vorlauf</p>
            <p className="text-lg font-semibold text-white">
              {formatValue(flowState?.state, '°C')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThermometerSnowflake className="w-5 h-5 text-accent-cyan" />
          <div>
            <p className="text-xs text-white/60">Rücklauf</p>
            <p className="text-lg font-semibold text-white">
              {formatValue(returnState?.state, '°C')}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

function EnergyPairCard({
  consumedEntityId,
  producedEntityId,
  label,
  unit = 'kWh'
}: {
  consumedEntityId?: string
  producedEntityId?: string
  label: string
  unit?: string
}) {
  const states = useHAStore((s) => s.states)
  
  if (!consumedEntityId && !producedEntityId) return null
  
  const consumed = consumedEntityId ? states[consumedEntityId]?.state : null
  const produced = producedEntityId ? states[producedEntityId]?.state : null
  
  const consumedVal = consumed ? parseFloat(consumed) : 0
  const producedVal = produced ? parseFloat(produced) : 0
  const cop = consumedVal > 0 ? (producedVal / consumedVal).toFixed(2) : '–'
  
  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-white">{label}</p>
        <span className="text-xs px-2 py-1 rounded-full bg-accent-green/20 text-accent-green">
          COP: {cop}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-white/60">Verbraucht</p>
          <p className="text-lg font-semibold text-accent-orange">
            {formatValue(consumed, ` ${unit}`)}
          </p>
        </div>
        <div>
          <p className="text-xs text-white/60">Erzeugt</p>
          <p className="text-lg font-semibold text-accent-green">
            {formatValue(produced, ` ${unit}`)}
          </p>
        </div>
      </div>
    </Card>
  )
}

export default function HeatPumpPage() {
  const states = useHAStore((s) => s.states)
  const heatPump = useConfigStore((s) => s.heatPump)
  const fetchConfig = useConfigStore((s) => s.fetchConfig)
  const [collapsedSections, setCollapsedSections] = useState<Record<SectionId, boolean>>({
    temperatures: false,
    hotWater: false,
    compressor: true,
    energy: false,
    sgReady: true
  })
  
  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])
  
  const toggleSection = (section: SectionId) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }
  
  const operationMode = heatPump?.operationModeEntityId 
    ? states[heatPump.operationModeEntityId]?.state 
    : null
  const outdoorTemp = heatPump?.outdoorTemperatureEntityId
    ? states[heatPump.outdoorTemperatureEntityId]?.state
    : null
  const activeError = heatPump?.activeErrorEntityId
    ? states[heatPump.activeErrorEntityId]?.state
    : null
  const hasError = activeError && activeError !== 'off' && activeError !== '0' && activeError !== 'none'
  
  const hasTemperatures = heatPump?.temperatures && Object.values(heatPump.temperatures).some(v => v)
  const hasHotWater = heatPump?.hotWater && Object.values(heatPump.hotWater).some(v => v)
  const hasCompressor = heatPump?.compressor && Object.values(heatPump.compressor).some(v => v)
  const hasEnergy = heatPump?.energy && Object.values(heatPump.energy).some(v => v)
  const hasSgReady = heatPump?.sgReady && Object.values(heatPump.sgReady).some(v => v)
  
  const hasAnyConfig = hasTemperatures || hasHotWater || hasCompressor || hasEnergy || hasSgReady

  return (
    <div className="px-4 py-6 safe-top max-w-7xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-cyan/20 flex items-center justify-center">
            <Flame className="w-5 h-5 text-accent-cyan" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Wärmepumpe</h1>
            <p className="text-xs text-white/60">
              {operationMode || 'Stiebel Eltron'}
              {outdoorTemp && ` · Außen: ${formatValue(outdoorTemp, '°C')}`}
            </p>
          </div>
        </div>
        <Link
          href="/settings/heatpump"
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <Settings className="w-5 h-5 text-white" />
        </Link>
      </motion.header>
      
      {hasError && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-4"
        >
          <Card className="bg-red-500/20 backdrop-blur-md border-red-500/50 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-400">Fehler aktiv</p>
                <p className="text-xs text-red-300">{activeError}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
      
      {!hasAnyConfig ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <Flame className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-white mb-2">Keine Wärmepumpe konfiguriert</h2>
          <p className="text-sm text-white/60 mb-6">
            Konfiguriere deine Stiebel Eltron Wärmepumpe in den Einstellungen.
          </p>
          <Link
            href="/settings/heatpump"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
            Einstellungen öffnen
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {hasTemperatures && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <button
                onClick={() => toggleSection('temperatures')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors mb-2"
              >
                <div className="flex items-center gap-3">
                  <Thermometer className="w-5 h-5 text-accent-orange" />
                  <span className="font-medium text-white">Temperaturen</span>
                </div>
                {collapsedSections.temperatures ? (
                  <ChevronRight className="w-5 h-5 text-white/60" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white/60" />
                )}
              </button>
              
              {!collapsedSections.temperatures && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  <TemperaturePairCard
                    flowEntityId={heatPump?.temperatures?.totalFlowEntityId}
                    returnEntityId={heatPump?.temperatures?.totalReturnEntityId}
                    label="Gesamt"
                  />
                  <TemperaturePairCard
                    flowEntityId={heatPump?.temperatures?.upperFloorFlowEntityId}
                    returnEntityId={heatPump?.temperatures?.upperFloorReturnEntityId}
                    label="Obergeschoss"
                  />
                  <TemperaturePairCard
                    flowEntityId={heatPump?.temperatures?.groundFloorFlowEntityId}
                    returnEntityId={heatPump?.temperatures?.groundFloorReturnEntityId}
                    label="Erdgeschoss"
                  />
                </div>
              )}
            </motion.section>
          )}
          
          {hasHotWater && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <button
                onClick={() => toggleSection('hotWater')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors mb-2"
              >
                <div className="flex items-center gap-3">
                  <Droplets className="w-5 h-5 text-accent-cyan" />
                  <span className="font-medium text-white">Warmwasser</span>
                </div>
                {collapsedSections.hotWater ? (
                  <ChevronRight className="w-5 h-5 text-white/60" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white/60" />
                )}
              </button>
              
              {!collapsedSections.hotWater && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <SensorCard
                    entityId={heatPump?.hotWater?.actualTemperatureEntityId}
                    label="Ist-Temperatur"
                    icon={Thermometer}
                    colorClass="text-accent-cyan"
                  />
                  <SensorCard
                    entityId={heatPump?.hotWater?.targetTemperatureEntityId}
                    label="Soll-Temperatur"
                    icon={Thermometer}
                    colorClass="text-accent-orange"
                  />
                  <SensorCard
                    entityId={heatPump?.hotWater?.bufferActualEntityId}
                    label="Puffer Ist"
                    icon={Droplets}
                    colorClass="text-accent-cyan"
                  />
                  <SensorCard
                    entityId={heatPump?.hotWater?.bufferTargetEntityId}
                    label="Puffer Soll"
                    icon={Droplets}
                    colorClass="text-accent-orange"
                  />
                </div>
              )}
            </motion.section>
          )}
          
          {hasCompressor && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <button
                onClick={() => toggleSection('compressor')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors mb-2"
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-accent-purple" />
                  <span className="font-medium text-white">Kompressor</span>
                </div>
                {collapsedSections.compressor ? (
                  <ChevronRight className="w-5 h-5 text-white/60" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white/60" />
                )}
              </button>
              
              {!collapsedSections.compressor && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <SensorCard
                    entityId={heatPump?.compressor?.flowTemperatureEntityId}
                    label="Vorlauf"
                    icon={ThermometerSun}
                    colorClass="text-accent-orange"
                  />
                  <SensorCard
                    entityId={heatPump?.compressor?.returnTemperatureEntityId}
                    label="Rücklauf"
                    icon={ThermometerSnowflake}
                    colorClass="text-accent-cyan"
                  />
                  <SensorCard
                    entityId={heatPump?.compressor?.hotGasTemperatureEntityId}
                    label="Heißgas"
                    icon={Flame}
                    colorClass="text-red-400"
                  />
                  <SensorCard
                    entityId={heatPump?.compressor?.highPressureEntityId}
                    label="Hochdruck"
                    icon={Gauge}
                    colorClass="text-accent-orange"
                  />
                  <SensorCard
                    entityId={heatPump?.compressor?.lowPressureEntityId}
                    label="Niederdruck"
                    icon={Gauge}
                    colorClass="text-accent-cyan"
                  />
                  <SensorCard
                    entityId={heatPump?.compressor?.volumeStreamEntityId}
                    label="Volumenstrom"
                    icon={Droplets}
                    colorClass="text-accent-cyan"
                  />
                  <SensorCard
                    entityId={heatPump?.compressor?.heaterPressureEntityId}
                    label="Heizungsdruck"
                    icon={Gauge}
                    colorClass="text-accent-green"
                  />
                </div>
              )}
            </motion.section>
          )}
          
          {hasEnergy && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <button
                onClick={() => toggleSection('energy')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors mb-2"
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-accent-yellow" />
                  <span className="font-medium text-white">Energie</span>
                </div>
                {collapsedSections.energy ? (
                  <ChevronRight className="w-5 h-5 text-white/60" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white/60" />
                )}
              </button>
              
              {!collapsedSections.energy && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-white/60 px-1">Heizung</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <EnergyPairCard
                      consumedEntityId={heatPump?.energy?.consumedHeatingEntityId}
                      producedEntityId={heatPump?.energy?.producedHeatingEntityId}
                      label="Aktuell"
                      unit="kW"
                    />
                    <EnergyPairCard
                      consumedEntityId={heatPump?.energy?.consumedHeatingTodayEntityId}
                      producedEntityId={heatPump?.energy?.producedHeatingTodayEntityId}
                      label="Heute"
                    />
                    <EnergyPairCard
                      consumedEntityId={heatPump?.energy?.consumedHeatingTotalEntityId}
                      producedEntityId={heatPump?.energy?.producedHeatingTotalEntityId}
                      label="Gesamt"
                    />
                  </div>
                  
                  <h3 className="text-sm font-medium text-white/60 px-1 pt-2">Warmwasser</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <EnergyPairCard
                      consumedEntityId={heatPump?.energy?.consumedWaterEntityId}
                      producedEntityId={heatPump?.energy?.producedWaterEntityId}
                      label="Aktuell"
                      unit="kW"
                    />
                    <EnergyPairCard
                      consumedEntityId={heatPump?.energy?.consumedWaterTodayEntityId}
                      producedEntityId={heatPump?.energy?.producedWaterTodayEntityId}
                      label="Heute"
                    />
                    <EnergyPairCard
                      consumedEntityId={heatPump?.energy?.consumedWaterTotalEntityId}
                      producedEntityId={heatPump?.energy?.producedWaterTotalEntityId}
                      label="Gesamt"
                    />
                  </div>
                </div>
              )}
            </motion.section>
          )}
          
          {hasSgReady && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <button
                onClick={() => toggleSection('sgReady')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors mb-2"
              >
                <div className="flex items-center gap-3">
                  <Radio className="w-5 h-5 text-accent-green" />
                  <span className="font-medium text-white">SG Ready</span>
                </div>
                {collapsedSections.sgReady ? (
                  <ChevronRight className="w-5 h-5 text-white/60" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white/60" />
                )}
              </button>
              
              {!collapsedSections.sgReady && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <SensorCard
                    entityId={heatPump?.sgReady?.stateEntityId}
                    label="Status"
                    icon={Radio}
                    colorClass="text-accent-green"
                  />
                  <SensorCard
                    entityId={heatPump?.sgReady?.activeEntityId}
                    label="Aktiv"
                    icon={Zap}
                    colorClass="text-accent-yellow"
                  />
                  <SensorCard
                    entityId={heatPump?.sgReady?.input1EntityId}
                    label="Eingang 1"
                    icon={Radio}
                    colorClass="text-white/60"
                  />
                  <SensorCard
                    entityId={heatPump?.sgReady?.input2EntityId}
                    label="Eingang 2"
                    icon={Radio}
                    colorClass="text-white/60"
                  />
                </div>
              )}
            </motion.section>
          )}
        </div>
      )}
    </div>
  )
}
