'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface FilterChipProps {
  label: string
  active: boolean
  onClick: () => void
  icon?: LucideIcon
}

export function FilterChip({ label, active, onClick, icon: Icon }: FilterChipProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn('chip', active ? 'chip-active' : 'chip-inactive')}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label}
    </motion.button>
  )
}
