'use client'

import { motion } from 'framer-motion'
import {
  Utensils,
  Sofa,
  DoorOpen,
  LayoutGrid,
  Warehouse,
  Home,
  Star,
  Heart,
  LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRoomLightsStatus } from '@/lib/ha'

const iconMap: Record<string, LucideIcon> = {
  utensils: Utensils,
  sofa: Sofa,
  'door-open': DoorOpen,
  layout: LayoutGrid,
  warehouse: Warehouse,
  home: Home,
  star: Star,
  heart: Heart,
}

interface RoomCardProps {
  name: string
  icon: string
  entityIds: string[]
  onClick?: () => void
}

export function RoomCard({ name, icon, entityIds, onClick }: RoomCardProps) {
  const status = useRoomLightsStatus(entityIds)
  const Icon = iconMap[icon] || Home
  const lightsOn = entityIds.filter((id) => id.startsWith('light.')).length > 0 && status !== 'All off'
  const onCount = status.match(/^(\d+)/)?.[1]

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'card flex flex-col items-center justify-center py-6 px-4 min-h-[130px] relative',
        lightsOn && 'bg-bg-cardHover'
      )}
    >
      <div className="relative mb-3">
        <Icon className={cn('w-8 h-8', lightsOn ? 'text-white' : 'text-text-muted')} />
        {onCount && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-accent-orange rounded-full flex items-center justify-center text-xs font-bold text-white"
          >
            {onCount}
          </motion.div>
        )}
      </div>
      <span className="text-sm font-medium text-white mb-1">{name}</span>
      <span className={cn(
        'text-xs',
        lightsOn ? 'text-accent-orange' : 'text-text-muted'
      )}>
        {status}
      </span>
    </motion.button>
  )
}
