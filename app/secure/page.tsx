'use client'

import { motion } from 'framer-motion'
import { Shield, ChevronRight, Clock, Dog, Home as HomeIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Toggle } from '@/components/ui/toggle'
import { SecurityActionCard } from '@/components/cards/security-action-card'
import { useAlarmState, useHAStore } from '@/lib/ha'
import { dashboardConfig } from '@/config/dashboard'
import { getAlarmStateLabel, cn } from '@/lib/utils'

export default function SecurityPage() {
  const alarmState = useAlarmState()
  const callService = useHAStore((s) => s.callService)
  const states = useHAStore((s) => s.states)
  const dogModeState = dashboardConfig.security.dogModeEntityId 
    ? states[dashboardConfig.security.dogModeEntityId]?.state === 'on'
    : false

  const activeZones = dashboardConfig.security.zones.filter(
    (z) => states[z.entityId]?.state === 'on'
  )

  const handleAlarmAction = async (action: string) => {
    const serviceMap: Record<string, string> = {
      stay: 'alarm_arm_home',
      away: 'alarm_arm_away',
      outside: 'alarm_arm_night',
      disarm: 'alarm_disarm',
    }
    await callService(
      'alarm_control_panel',
      serviceMap[action],
      dashboardConfig.security.alarmEntityId
    )
  }

  const handleDogModeToggle = async (checked: boolean) => {
    if (dashboardConfig.security.dogModeEntityId) {
      await callService(
        'input_boolean',
        checked ? 'turn_on' : 'turn_off',
        dashboardConfig.security.dogModeEntityId
      )
    }
  }

  return (
    <div className="px-4 py-6 safe-top max-w-7xl mx-auto">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-6"
      >
        <h1 className="text-2xl font-bold text-white">Security</h1>
      </motion.header>

      {/* Desktop: Two column layout */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-6">
        {/* Left column */}
        <div>
          {/* Status card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card accent="green" className="mb-4">
              <div className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 rounded-full bg-accent-green/20 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-accent-green" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{getAlarmStateLabel(alarmState)}</h2>
                  <p className="text-sm text-text-secondary">
                    {activeZones.length} zone{activeZones.length !== 1 ? 's' : ''} active
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Action buttons */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-3 mb-4"
          >
            <SecurityActionCard 
              action="stay" 
              onClick={() => handleAlarmAction('stay')}
              active={alarmState === 'armed_home'}
            />
            <SecurityActionCard 
              action="away" 
              onClick={() => handleAlarmAction('away')}
              active={alarmState === 'armed_away'}
            />
            <SecurityActionCard 
              action="outside" 
              onClick={() => handleAlarmAction('outside')}
              active={alarmState === 'armed_night'}
            />
            <SecurityActionCard 
              action="disarm" 
              onClick={() => handleAlarmAction('disarm')}
              active={alarmState === 'disarmed'}
            />
          </motion.section>
        </div>

        {/* Right column */}
        <div>
          {/* Dog mode */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="mb-4">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-pink/20 flex items-center justify-center">
                    <Dog className="w-5 h-5 text-accent-pink" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Dog Mode</h3>
                    <p className="text-xs text-text-secondary">Person-only alerts</p>
                  </div>
                </div>
                <Toggle checked={dogModeState} onChange={handleDogModeToggle} />
              </div>
            </Card>
          </motion.div>

          {/* Delayed exit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="mb-6">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-cyan/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-accent-cyan" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Delayed Exit</h3>
                    <p className="text-xs text-text-secondary">3 minute countdown before arming</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-text-muted" />
              </div>
            </Card>
          </motion.div>

          {/* Zones */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider">Zones</h2>
              <span className="text-xs text-text-secondary">{activeZones.length} active</span>
            </div>
            <div className="space-y-2">
              {dashboardConfig.security.zones.map((zone) => {
                const isActive = states[zone.entityId]?.state === 'on'
                return (
                  <Card key={zone.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <HomeIcon className="w-5 h-5 text-text-muted" />
                        <span className="font-medium text-white">{zone.name}</span>
                      </div>
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        isActive ? 'bg-accent-green' : 'bg-text-muted'
                      )} />
                    </div>
                  </Card>
                )
              })}
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  )
}
