'use client'

import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLMotionProps<'div'> {
  accent?: 'yellow' | 'cyan' | 'green' | 'pink' | 'orange' | 'purple' | 'red' | 'blue' | 'gradient'
  hoverable?: boolean
  children: React.ReactNode
}

const accentColors = {
  yellow: 'bg-accent-yellow',
  cyan: 'bg-accent-cyan',
  green: 'bg-accent-green',
  pink: 'bg-accent-pink',
  orange: 'bg-accent-orange',
  purple: 'bg-accent-purple',
  red: 'bg-accent-red',
  blue: 'bg-accent-blue',
  gradient: 'bg-gradient-to-r from-accent-cyan to-accent-green',
}

export function Card({
  accent,
  hoverable = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <motion.div
      whileTap={hoverable ? { scale: 0.98 } : undefined}
      className={cn(
        'card relative',
        hoverable && 'card-hover cursor-pointer',
        className
      )}
      {...props}
    >
      {accent && (
        <div className={cn('card-accent', accentColors[accent])} />
      )}
      {children}
    </motion.div>
  )
}
