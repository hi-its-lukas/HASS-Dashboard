'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Settings,
  Loader2,
  Play,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHAStore } from '@/lib/ha'
import { useConfig } from '@/lib/config/store'

interface ActionButtonProps {
  icon: React.ReactNode
  label: string
  color?: string
  onClick?: () => void
  loading?: boolean
  disabled?: boolean
}

function ActionButton({ icon, label, color = 'text-white', onClick, loading, disabled }: ActionButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={loading || disabled}
      className="card flex flex-col items-center justify-center py-6 px-4 min-h-[100px] disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mb-2" />
      ) : (
        <div className={cn('mb-2', color)}>{icon}</div>
      )}
      <span className="text-sm font-medium text-white text-center">{label}</span>
    </motion.button>
  )
}

export default function MorePage() {
  const [loadingScript, setLoadingScript] = useState<string | null>(null)
  const callService = useHAStore((s) => s.callService)
  const states = useHAStore((s) => s.states)
  const config = useConfig()
  
  const scripts = Object.keys(states).filter((id) => id.startsWith('script.'))
  
  const handleRunScript = async (entityId: string, buttonId: string) => {
    if (!scripts.includes(entityId)) {
      console.warn(`Script ${entityId} not found in HA`)
      return
    }
    
    setLoadingScript(buttonId)
    try {
      await callService('script', 'turn_on', entityId)
    } catch (error) {
      console.error('Failed to run script:', error)
    } finally {
      setLoadingScript(null)
    }
  }
  
  const customButtons = config.customButtons || []

  return (
    <div className="px-4 py-6 safe-top max-w-7xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="w-10 h-10 rounded-full bg-accent-orange/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-accent-orange" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Aktionen</h1>
          <p className="text-xs text-text-secondary">Home Assistant Skripte</p>
        </div>
      </motion.header>

      {customButtons.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <Zap className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-text-secondary mb-2">Keine Aktionen konfiguriert</p>
          <p className="text-sm text-text-muted mb-4">
            Wähle in den Einstellungen Skripte aus, die hier als Aktionen angezeigt werden sollen.
          </p>
          <a 
            href="/settings" 
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-cyan/20 hover:bg-accent-cyan/30 text-accent-cyan rounded-xl transition-colors"
          >
            <Settings className="w-4 h-4" />
            Zu den Einstellungen
          </a>
        </motion.div>
      ) : (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {customButtons.map((btn) => {
              const isAvailable = btn.entityId ? scripts.includes(btn.entityId) : true
              return (
                <ActionButton
                  key={btn.id}
                  icon={<Play className="w-6 h-6" />}
                  label={btn.label}
                  color={isAvailable ? 'text-accent-orange' : 'text-gray-500'}
                  loading={loadingScript === btn.id}
                  disabled={!isAvailable}
                  onClick={isAvailable && btn.entityId ? () => handleRunScript(btn.entityId!, btn.id) : undefined}
                />
              )
            })}
          </div>
        </motion.section>
      )}
    </div>
  )
}
