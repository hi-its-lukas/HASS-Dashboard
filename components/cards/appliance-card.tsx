'use client'

import { motion } from 'framer-motion'
import { Flame, Loader, Wind, Droplets, Zap, Thermometer, Snowflake, Fan, Droplet, LucideIcon } from 'lucide-react'
import { Toggle } from '@/components/ui/toggle'
import { useHAStore } from '@/lib/ha'
import { cn } from '@/lib/utils'

interface ApplianceCardProps {
  name: string
  entityId: string
  icon: string
}

const iconMap: Record<string, LucideIcon> = {
  flame: Flame,
  loader: Loader,
  wind: Wind,
  droplets: Droplets,
  zap: Zap,
  thermometer: Thermometer,
  snowflake: Snowflake,
  fan: Fan,
  droplet: Droplet,
}

export function ApplianceCard({ name, entityId, icon }: ApplianceCardProps) {
  const state = useHAStore((s) => s.states[entityId])
  const callService = useHAStore((s) => s.callService)
  
  const isOn = state?.state === 'on'
  const displayName = (state?.attributes?.friendly_name as string) || name
  const Icon = iconMap[icon] || Flame

  const handleToggle = async (checked: boolean) => {
    await callService('switch', checked ? 'turn_on' : 'turn_off', entityId)
  }

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className={cn(
        'card flex items-center justify-between p-4',
        isOn && 'bg-bg-cardHover'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center',
          isOn ? 'bg-accent-orange/20' : 'bg-bg-secondary'
        )}>
          <Icon className={cn('w-5 h-5', isOn ? 'text-accent-orange' : 'text-text-muted')} />
        </div>
        <span className="font-medium text-white">{displayName}</span>
      </div>
      <Toggle checked={isOn} onChange={handleToggle} />
    </motion.div>
  )
}
