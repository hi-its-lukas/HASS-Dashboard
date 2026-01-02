'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { SurveillanceEvent } from '@/lib/ha/types'
import { formatEventTime } from '@/lib/utils'

interface SurveillanceEventCardProps {
  event: SurveillanceEvent
}

const typeBadgeVariant: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
  person: 'danger',
  vehicle: 'info',
  animal: 'warning',
  motion: 'default',
}

export function SurveillanceEventCard({ event }: SurveillanceEventCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 bg-bg-card rounded-xl"
    >
      <div className="w-16 h-12 bg-bg-secondary rounded-lg flex items-center justify-center overflow-hidden">
        {event.thumbnailUrl ? (
          <img src={event.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl">📷</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={typeBadgeVariant[event.type] || 'default'}>
            {event.label}
          </Badge>
          <span className="text-sm text-text-secondary">{event.confidence}%</span>
        </div>
        <p className="font-medium text-white text-sm">{event.camera}</p>
        <p className="text-xs text-text-muted">{formatEventTime(event.timestamp)}</p>
      </div>
    </motion.div>
  )
}
