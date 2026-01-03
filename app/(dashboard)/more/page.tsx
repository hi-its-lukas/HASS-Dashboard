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
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useHAStore } from '@/lib/ha'

interface ActionButtonProps {
  icon: React.ReactNode
  label: string
  color?: string
  onClick?: () => void
  loading?: boolean
}

function ActionButton({ icon, label, color = 'text-white', onClick, loading }: ActionButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      disabled={loading}
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

interface ScriptButtonConfig {
  id: string
  label: string
  icon: React.ReactNode
  color: string
  scriptId: string
}

export default function MorePage() {
  const [loadingScript, setLoadingScript] = useState<string | null>(null)
  const callService = useHAStore((s) => s.callService)
  const states = useHAStore((s) => s.states)
  
  const scripts = Object.keys(states).filter((id) => id.startsWith('script.'))
  
  const foodReadyButtons: ScriptButtonConfig[] = [
    { id: 'girls_food', label: 'Girls Food Ready', icon: <Users className="w-6 h-6" />, color: 'text-accent-pink', scriptId: 'script.girls_food_ready' },
    { id: 'everyone_food', label: 'Everyone Food', icon: <Home className="w-6 h-6" />, color: 'text-accent-cyan', scriptId: 'script.everyone_food_ready' },
    { id: 'baba_food', label: 'Baba Food Ready', icon: <Users className="w-6 h-6" />, color: 'text-accent-pink', scriptId: 'script.baba_food_ready' },
    { id: 'girls_down', label: 'Girls Come Down', icon: <ArrowDown className="w-6 h-6" />, color: 'text-accent-cyan', scriptId: 'script.girls_come_down' },
  ]
  
  const individualButtons: ScriptButtonConfig[] = [
    { id: 'alexandra_down', label: 'Alexandra Down', icon: <ArrowDown className="w-6 h-6" />, color: 'text-accent-cyan', scriptId: 'script.alexandra_come_down' },
    { id: 'mila_down', label: 'Mila Down', icon: <ArrowDown className="w-6 h-6" />, color: 'text-accent-cyan', scriptId: 'script.mila_come_down' },
    { id: 'alexandra_room', label: 'Alexandra To Room', icon: <MapPin className="w-6 h-6" />, color: 'text-accent-orange', scriptId: 'script.alexandra_to_room' },
    { id: 'mila_room', label: 'Mila To Room', icon: <MapPin className="w-6 h-6" />, color: 'text-accent-orange', scriptId: 'script.mila_to_room' },
  ]
  
  const routineButtons: ScriptButtonConfig[] = [
    { id: 'bedtime', label: 'Bedtime', icon: <Moon className="w-6 h-6" />, color: 'text-accent-purple', scriptId: 'script.bedtime_routine' },
    { id: 'leave', label: 'Time to Leave', icon: <LogOut className="w-6 h-6" />, color: 'text-accent-cyan', scriptId: 'script.time_to_leave' },
  ]
  
  const handleRunScript = async (scriptId: string, buttonId: string) => {
    if (!scripts.includes(scriptId)) {
      console.warn(`Script ${scriptId} not found in HA`)
      return
    }
    
    setLoadingScript(buttonId)
    try {
      await callService('script', 'turn_on', scriptId)
    } catch (error) {
      console.error('Failed to run script:', error)
    } finally {
      setLoadingScript(null)
    }
  }
  
  const renderButton = (btn: ScriptButtonConfig) => {
    const isAvailable = scripts.includes(btn.scriptId)
    return (
      <ActionButton
        key={btn.id}
        icon={btn.icon}
        label={btn.label}
        color={isAvailable ? btn.color : 'text-gray-500'}
        loading={loadingScript === btn.id}
        onClick={isAvailable ? () => handleRunScript(btn.scriptId, btn.id) : undefined}
      />
    )
  }

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

      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 lg:mb-0"
        >
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
            Food Ready
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {foodReadyButtons.map(renderButton)}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 lg:mb-0"
        >
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
            Individual Calls
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {individualButtons.map(renderButton)}
          </div>
        </motion.section>

        <div>
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
              Routines
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {routineButtons.map(renderButton)}
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
              Quick Access
            </h2>
            <div className="space-y-2">
              <a href="/energy">
                <Card hoverable className="p-4">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-accent-yellow" />
                    <span className="font-medium text-white">Energy Dashboard</span>
                  </div>
                </Card>
              </a>
              <a href="/family">
                <Card hoverable className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-accent-cyan" />
                    <span className="font-medium text-white">Family Tracker</span>
                  </div>
                </Card>
              </a>
              <a href="/settings">
                <Card hoverable className="p-4">
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-text-muted" />
                    <span className="font-medium text-white">Settings</span>
                  </div>
                </Card>
              </a>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  )
}
