'use client'

import { motion } from 'framer-motion'
import { Blinds } from 'lucide-react'
import { useHAStore } from '@/lib/ha'
import { cn } from '@/lib/utils'

interface CoverStatusBarProps {
  coverEntityIds: string[]
}

export function CoverStatusBar({ coverEntityIds }: CoverStatusBarProps) {
  const states = useHAStore((s) => s.states)
  
  if (coverEntityIds.length === 0) return null
  
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {coverEntityIds.map((entityId) => {
        const state = states[entityId]
        if (!state) return null
        
        const position = state.attributes?.current_position as number | undefined
        const friendlyName = (state.attributes?.friendly_name as string) || entityId.split('.')[1]
        const isClosed = state.state === 'closed'
        const isOpen = state.state === 'open'
        
        let statusText = 'Offen'
        if (isClosed) {
          statusText = 'Geschlossen'
        } else if (position !== undefined) {
          statusText = position === 0 ? 'Geschlossen' : `${100 - position}%`
        }
        
        return (
          <motion.div
            key={entityId}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm',
              'bg-white/10 backdrop-blur-sm'
            )}
          >
            <Blinds className={cn(
              'w-4 h-4',
              isClosed ? 'text-text-muted' : 'text-accent-cyan'
            )} />
            <span className="text-text-secondary">{friendlyName}</span>
            <span className={cn(
              'font-medium',
              isClosed ? 'text-text-muted' : 'text-white'
            )}>
              {statusText}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
