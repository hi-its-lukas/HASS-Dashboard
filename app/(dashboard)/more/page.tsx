'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Home,
  ArrowDown,
  MapPin,
  Moon,
  LogOut,
  Zap,
  Settings,
  Bell,
  Loader2,
  Play,
  Lightbulb,
  Blinds,
  Video,
  DoorOpen,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
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
        <div className="w-10 h-10 rounded-full bg-accent-cyan/20 flex items-center justify-center">
          <Bell className="w-5 h-5 text-accent-cyan" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Alexa</h1>
          <p className="text-xs text-text-secondary">Home Announcements</p>
        </div>
      </motion.header>

      {customButtons.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-text-secondary mb-2">Keine Buttons konfiguriert</p>
          <p className="text-sm text-text-muted mb-4">
            Wähle in den Einstellungen Skripte aus, die hier als Buttons angezeigt werden sollen.
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
          className="mb-6"
        >
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
            Skripte ({customButtons.length})
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {customButtons.map((btn) => {
              const isAvailable = btn.entityId ? scripts.includes(btn.entityId) : true
              return (
                <ActionButton
                  key={btn.id}
                  icon={<Play className="w-6 h-6" />}
                  label={btn.label}
                  color={isAvailable ? 'text-accent-cyan' : 'text-gray-500'}
                  loading={loadingScript === btn.id}
                  disabled={!isAvailable}
                  onClick={isAvailable && btn.entityId ? () => handleRunScript(btn.entityId!, btn.id) : undefined}
                />
              )
            })}
          </div>
        </motion.section>
      )}

      {config.intercoms && config.intercoms.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
            Intercoms
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {config.intercoms.map((intercom) => (
              <a key={intercom.id} href={`/intercom/${intercom.slug}`}>
                <Card hoverable className="p-4">
                  <div className="flex items-center gap-3">
                    <DoorOpen className="w-5 h-5 text-accent-cyan" />
                    <span className="font-medium text-white">{intercom.name}</span>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        </motion.section>
      )}

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
          Quick Access
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <a href="/lights">
            <Card hoverable className="p-4">
              <div className="flex items-center gap-3">
                <Lightbulb className="w-5 h-5 text-accent-yellow" />
                <span className="font-medium text-white">Lichter</span>
              </div>
            </Card>
          </a>
          <a href="/covers">
            <Card hoverable className="p-4">
              <div className="flex items-center gap-3">
                <Blinds className="w-5 h-5 text-accent-purple" />
                <span className="font-medium text-white">Rollos</span>
              </div>
            </Card>
          </a>
          <a href="/cameras">
            <Card hoverable className="p-4">
              <div className="flex items-center gap-3">
                <Video className="w-5 h-5 text-accent-cyan" />
                <span className="font-medium text-white">Kameras</span>
              </div>
            </Card>
          </a>
          <a href="/energy">
            <Card hoverable className="p-4">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-accent-orange" />
                <span className="font-medium text-white">Energie</span>
              </div>
            </Card>
          </a>
          <a href="/family">
            <Card hoverable className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-accent-green" />
                <span className="font-medium text-white">Familie</span>
              </div>
            </Card>
          </a>
          <a href="/settings">
            <Card hoverable className="p-4">
              <div className="flex items-center gap-3">
                <Settings className="w-5 h-5 text-text-muted" />
                <span className="font-medium text-white">Einstellungen</span>
              </div>
            </Card>
          </a>
        </div>
      </motion.section>
    </div>
  )
}
