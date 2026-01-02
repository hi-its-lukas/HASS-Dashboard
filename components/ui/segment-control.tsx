'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SegmentControlProps {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}

export function SegmentControl({ options, value, onChange }: SegmentControlProps) {
  return (
    <div className="segment-control relative">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'segment-button relative z-10',
            value === option.value ? 'text-white' : 'segment-inactive'
          )}
        >
          {value === option.value && (
            <motion.div
              layoutId="segment-active"
              className="absolute inset-0 bg-bg-card rounded-md -z-10"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
          {option.label}
        </button>
      ))}
    </div>
  )
}
