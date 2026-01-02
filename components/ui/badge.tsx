'use client'

import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

const variants = {
  default: 'bg-gray-600 text-white',
  success: 'bg-accent-green text-black',
  warning: 'bg-accent-yellow text-black',
  danger: 'bg-accent-red text-white',
  info: 'bg-accent-cyan text-black',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('badge', variants[variant], className)}>
      {children}
    </span>
  )
}
