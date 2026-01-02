'use client'

import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  color?: 'cyan' | 'green' | 'yellow' | 'pink' | 'orange'
  className?: string
}

const colorClasses = {
  cyan: 'bg-accent-cyan',
  green: 'bg-accent-green',
  yellow: 'bg-accent-yellow',
  pink: 'bg-accent-pink',
  orange: 'bg-accent-orange',
}

export function ProgressBar({ value, max = 100, color = 'green', className }: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={cn('progress-bar', className)}>
      <div
        className={cn('progress-fill', colorClasses[color])}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
