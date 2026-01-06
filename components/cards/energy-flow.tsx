'use client'

import { motion } from 'framer-motion'
import { Sun, Battery, Home, Zap } from 'lucide-react'

interface EnergyFlowProps {
  solar: number
  battery: number
  batteryLevel: number
  grid: number
  house: number
}

interface FlowLineProps {
  active: boolean
  reverse?: boolean
  color: string
  className?: string
}

function FlowLine({ active, reverse, color, className }: FlowLineProps) {
  if (!active) return null
  
  return (
    <div className={`absolute ${className}`}>
      <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`flow-${color}`} x1={reverse ? "100%" : "0%"} y1="0%" x2={reverse ? "0%" : "100%"} y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor={color} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <motion.rect
          x="0"
          y="8"
          width="30"
          height="4"
          rx="2"
          fill={`url(#flow-${color})`}
          initial={{ x: reverse ? 100 : -30 }}
          animate={{ x: reverse ? -30 : 100 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </svg>
    </div>
  )
}

function EnergyNode({ 
  icon: Icon, 
  label, 
  value, 
  color, 
  bgColor,
  subLabel 
}: { 
  icon: typeof Sun
  label: string
  value: number
  color: string
  bgColor: string
  subLabel?: string
}) {
  const formatValue = (w: number) => {
    if (Math.abs(w) >= 1000) {
      return `${(w / 1000).toFixed(1)} kW`
    }
    return `${Math.round(w)} W`
  }

  return (
    <motion.div 
      className={`flex flex-col items-center p-4 rounded-2xl ${bgColor} border border-white/10`}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className={`w-12 h-12 rounded-full bg-black/30 flex items-center justify-center mb-2`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
      <span className={`text-xl font-bold ${color}`}>{formatValue(Math.abs(value))}</span>
      {subLabel && <span className="text-xs text-text-muted">{subLabel}</span>}
    </motion.div>
  )
}

export function EnergyFlow({ solar, battery, batteryLevel, grid, house }: EnergyFlowProps) {
  const solarToHouse = solar > 0
  const solarToBattery = solar > house && batteryLevel < 100
  const batteryToHouse = battery < 0
  const batteryCharging = battery > 0
  const gridImporting = grid > 0
  const gridExporting = grid < 0

  return (
    <div className="glass-tile p-6">
      <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-4">Energiefluss</h3>
      
      <div className="relative">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-start-2">
            <EnergyNode
              icon={Sun}
              label="Solar"
              value={solar}
              color="text-yellow-400"
              bgColor="bg-yellow-500/10"
              subLabel={solar > 0 ? "Erzeugung" : "Keine Erzeugung"}
            />
          </div>
        </div>

        <div className="relative h-16 my-2">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-8 relative">
              {solarToHouse && (
                <motion.div
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <svg className="w-full h-full" viewBox="0 0 200 40">
                    <motion.circle
                      cx="100"
                      cy="5"
                      r="4"
                      fill="#facc15"
                      initial={{ cy: 5 }}
                      animate={{ cy: 35 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <path
                      d="M100,5 L100,35"
                      stroke="rgba(250,204,21,0.3)"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <EnergyNode
            icon={Battery}
            label="Batterie"
            value={battery}
            color="text-emerald-400"
            bgColor="bg-emerald-500/10"
            subLabel={`${batteryLevel}%`}
          />
          
          <EnergyNode
            icon={Home}
            label="Haus"
            value={house}
            color="text-cyan-400"
            bgColor="bg-cyan-500/10"
            subLabel="Verbrauch"
          />
          
          <EnergyNode
            icon={Zap}
            label="Netz"
            value={grid}
            color={gridExporting ? "text-green-400" : "text-orange-400"}
            bgColor={gridExporting ? "bg-green-500/10" : "bg-orange-500/10"}
            subLabel={gridExporting ? "Export" : gridImporting ? "Import" : "Neutral"}
          />
        </div>

        <div className="absolute top-1/2 left-0 right-0 h-0.5 -translate-y-1/2 pointer-events-none">
          {batteryToHouse && (
            <motion.div
              className="absolute left-[16%] w-[18%] h-1 bg-gradient-to-r from-emerald-500 to-transparent rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          {batteryCharging && (
            <motion.div
              className="absolute left-[16%] w-[18%] h-1 bg-gradient-to-l from-yellow-500 to-transparent rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          {gridImporting && (
            <motion.div
              className="absolute right-[16%] w-[18%] h-1 bg-gradient-to-l from-orange-500 to-transparent rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          {gridExporting && (
            <motion.div
              className="absolute right-[16%] w-[18%] h-1 bg-gradient-to-r from-cyan-500 to-green-500 rounded-full"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-center gap-6 text-xs text-text-muted">
          {solarToHouse && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <span>Solar → Haus</span>
            </div>
          )}
          {batteryCharging && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Batterie lädt</span>
            </div>
          )}
          {batteryToHouse && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Batterie → Haus</span>
            </div>
          )}
          {gridImporting && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span>Netzbezug</span>
            </div>
          )}
          {gridExporting && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span>Netzeinspeisung</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
