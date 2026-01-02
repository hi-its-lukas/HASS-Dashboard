'use client'

import { cn } from '@/lib/utils'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variants: Record<BadgeVariant, string> = {
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
