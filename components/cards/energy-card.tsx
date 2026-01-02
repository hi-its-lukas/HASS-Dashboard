'use client'

import { Sun, Battery, Grid3X3, Home, LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { cn } from '@/lib/utils'

interface EnergyCardProps {
  type: 'solar' | 'battery' | 'grid' | 'house'
  value: number
  unit?: string
  subLabel?: string
  batteryLevel?: number
}

const config: Record<string, { icon: LucideIcon; label: string; accent: 'yellow' | 'cyan' | 'pink' | 'green' }> = {
  solar: { icon: Sun, label: 'SOLAR', accent: 'yellow' },
  battery: { icon: Battery, label: 'BATTERY', accent: 'cyan' },
  grid: { icon: Grid3X3, label: 'GRID', accent: 'pink' },
  house: { icon: Home, label: 'HOUSE', accent: 'green' },
}

export function EnergyCard({ type, value, unit = 'W', subLabel, batteryLevel }: EnergyCardProps) {
  const { icon: Icon, label, accent } = config[type]
  const isBattery = type === 'battery'
  const displayValue = isBattery ? `${value}%` : `${value}${unit}`

  return (
    <Card accent={accent} className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn('w-5 h-5', `text-accent-${accent}`)} />
        <span className="text-xs font-medium text-text-muted tracking-wider">{label}</span>
      </div>
      <div className="mb-1">
        <span className="text-3xl font-bold text-white">{displayValue}</span>
      </div>
      <span className="text-sm text-text-secondary">{subLabel || (isBattery ? 'Charging' : 'Production')}</span>
      {isBattery && batteryLevel !== undefined && (
        <div className="mt-3">
          <ProgressBar value={batteryLevel} color="green" />
        </div>
      )}
    </Card>
  )
}
