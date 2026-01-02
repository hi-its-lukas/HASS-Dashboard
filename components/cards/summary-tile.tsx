'use client'

import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SummaryTileProps {
  icon: LucideIcon
  value: string | number
  label: string
  color?: 'yellow' | 'cyan' | 'green' | 'pink'
  onClick?: () => void
}

const colorClasses = {
  yellow: 'text-accent-yellow',
  cyan: 'text-accent-cyan',
  green: 'text-accent-green',
  pink: 'text-accent-pink',
}

export function SummaryTile({ icon: Icon, value, label, color = 'yellow', onClick }: SummaryTileProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="card flex flex-col items-center justify-center py-4 px-2 min-h-[100px]"
    >
      <Icon className={cn('w-5 h-5 mb-2', colorClasses[color])} />
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
    </motion.button>
  )
}
