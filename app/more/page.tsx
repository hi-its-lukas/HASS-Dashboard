'use client'

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
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ActionButtonProps {
  icon: React.ReactNode
  label: string
  color?: string
  onClick?: () => void
}

function ActionButton({ icon, label, color = 'text-white', onClick }: ActionButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="card flex flex-col items-center justify-center py-6 px-4 min-h-[100px]"
    >
      <div className={cn('mb-2', color)}>{icon}</div>
      <span className="text-sm font-medium text-white text-center">{label}</span>
    </motion.button>
  )
}

export default function MorePage() {
  return (
    <div className="px-4 py-6 safe-top max-w-7xl mx-auto">
      {/* Header with Alexa icon */}
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

      {/* Desktop: Multi-column layout */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Column 1 - Food Ready */}
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
            <ActionButton
              icon={<Users className="w-6 h-6" />}
              label="Girls Food Ready"
              color="text-accent-pink"
            />
            <ActionButton
              icon={<Home className="w-6 h-6" />}
              label="Everyone Food"
              color="text-accent-cyan"
            />
            <ActionButton
              icon={<Users className="w-6 h-6" />}
              label="Baba Food Ready"
              color="text-accent-pink"
            />
            <ActionButton
              icon={<ArrowDown className="w-6 h-6" />}
              label="Girls Come Down"
              color="text-accent-cyan"
            />
          </div>
        </motion.section>

        {/* Column 2 - Individual Calls */}
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
            <ActionButton
              icon={<ArrowDown className="w-6 h-6" />}
              label="Alexandra Down"
              color="text-accent-cyan"
            />
            <ActionButton
              icon={<ArrowDown className="w-6 h-6" />}
              label="Mila Down"
              color="text-accent-cyan"
            />
            <ActionButton
              icon={<MapPin className="w-6 h-6" />}
              label="Alexandra To Room"
              color="text-accent-orange"
            />
            <ActionButton
              icon={<MapPin className="w-6 h-6" />}
              label="Mila To Room"
              color="text-accent-orange"
            />
          </div>
        </motion.section>

        {/* Column 3 - Routines & Quick Access */}
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
              <ActionButton
                icon={<Moon className="w-6 h-6" />}
                label="Bedtime"
                color="text-accent-purple"
              />
              <ActionButton
                icon={<LogOut className="w-6 h-6" />}
                label="Time to Leave"
                color="text-accent-cyan"
              />
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
              <Card hoverable className="p-4">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-text-muted" />
                  <span className="font-medium text-white">Settings</span>
                </div>
              </Card>
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  )
}
