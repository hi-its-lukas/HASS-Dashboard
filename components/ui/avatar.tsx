'use client'

import { cn } from '@/lib/utils'

interface AvatarProps {
  name: string
  src?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-16 h-16 text-xl lg:w-20 lg:h-20',
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className={cn('avatar', sizes[size], className)}>
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  )
}

interface AvatarGroupProps {
  children: React.ReactNode
  max?: number
}

export function AvatarGroup({ children, max = 4 }: AvatarGroupProps) {
  const childArray = Array.isArray(children) ? children : [children]
  const visible = childArray.slice(0, max)
  const remaining = childArray.length - max

  return (
    <div className="avatar-group">
      {visible}
      {remaining > 0 && (
        <div className="avatar w-10 h-10 text-xs bg-bg-secondary">
          +{remaining}
        </div>
      )}
    </div>
  )
}
