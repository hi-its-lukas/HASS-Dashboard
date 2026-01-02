'use client'

import { motion } from 'framer-motion'
import { Home, MapPin, Globe, Unlock, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SecurityActionProps {
  action: 'stay' | 'away' | 'outside' | 'disarm'
  onClick: () => void
  active?: boolean
}

const config: Record<string, { icon: LucideIcon; label: string; color: string }> = {
  stay: { icon: Home, label: 'Stay', color: 'text-accent-yellow' },
  away: { icon: MapPin, label: 'Away', color: 'text-accent-orange' },
  outside: { icon: Globe, label: 'Outside', color: 'text-accent-cyan' },
  disarm: { icon: Unlock, label: 'Disarm', color: 'text-accent-cyan' },
}

export function SecurityActionCard({ action, onClick, active }: SecurityActionProps) {
  const { icon: Icon, label, color } = config[action]

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'card flex flex-col items-center justify-center py-6 px-4',
        active && 'ring-2 ring-accent-cyan'
      )}
    >
      <Icon className={cn('w-8 h-8 mb-2', color)} />
      <span className={cn('text-sm font-medium', color)}>{label}</span>
    </motion.button>
  )
}
