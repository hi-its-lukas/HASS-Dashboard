'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Lightbulb, Zap, Shield, Users } from 'lucide-react'
import { SummaryTile } from '@/components/cards/summary-tile'
import { RoomCard } from '@/components/cards/room-card'
import { SegmentControl } from '@/components/ui/segment-control'
import {
  useLightsCount,
  usePower,
  useWeather,
  useAlarmState,
  usePersonsAtHome,
  useConnectionStatus,
} from '@/lib/ha'
import { dashboardConfig } from '@/config/dashboard'
import { formatTime, formatDate, getAlarmStateLabel, getWeatherIcon } from '@/lib/utils'

export default function HomePage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [floor, setFloor] = useState<'ground' | 'upper'>('ground')
  
  const { connected, connecting, error } = useConnectionStatus()
  const { on: lightsOn } = useLightsCount()
  const power = usePower()
  const weather = useWeather()
  const alarmState = useAlarmState()
  const personsAtHome = usePersonsAtHome()

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const filteredRooms = dashboardConfig.rooms.filter((r) => r.floor === floor)

  return (
    <div className="px-4 py-6 safe-top max-w-7xl mx-auto">
      {/* Header with time and weather */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between mb-6"
      >
        <div>
          <h1 className="text-5xl lg:text-6xl font-bold text-white tracking-tight">
            {formatTime(currentTime)}
          </h1>
          <p className="text-text-secondary mt-1">{formatDate(currentTime)}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-bg-card rounded-full">
          <span className="text-lg">{getWeatherIcon(weather.condition)}</span>
          <span className="text-lg font-medium text-white">{weather.temperature ?? '—'}°</span>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-accent-green' : connecting ? 'bg-accent-yellow animate-pulse' : 'bg-accent-red'}`} />
        </div>
      </motion.header>

      {/* Connection error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-3 bg-accent-red/20 rounded-xl text-accent-red text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* Desktop: Two column layout */}
      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        {/* Left column - Summary and Rooms */}
        <div className="lg:col-span-2">
          {/* Summary tiles */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-4 gap-3 mb-6"
          >
            <SummaryTile icon={Lightbulb} value={lightsOn} label="Lights" color="yellow" />
            <SummaryTile icon={Zap} value={`${power}W`} label="Power" color="cyan" />
            <SummaryTile icon={Shield} value={getAlarmStateLabel(alarmState)} label="" color="green" />
            <SummaryTile icon={Users} value={personsAtHome} label="Home" color="pink" />
          </motion.section>

          {/* Rooms section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Rooms</h2>
              <SegmentControl
                options={[
                  { value: 'ground', label: 'Ground' },
                  { value: 'upper', label: 'Upper' },
                ]}
                value={floor}
                onChange={(v) => setFloor(v as 'ground' | 'upper')}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredRooms.map((room, index) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <RoomCard
                    name={room.name}
                    icon={room.icon}
                    entityIds={room.entityIds}
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>
        </div>

        {/* Right column - Quick info (desktop only) */}
        <div className="hidden lg:block space-y-4 mt-0">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">Quick Status</h3>
            <div className="card p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Security</span>
                <span className="text-accent-green font-medium">{getAlarmStateLabel(alarmState)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">People Home</span>
                <span className="text-white font-medium">{personsAtHome} / 4</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Lights On</span>
                <span className="text-accent-yellow font-medium">{lightsOn}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Power Usage</span>
                <span className="text-accent-cyan font-medium">{power}W</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <a href="/energy" className="card p-4 flex items-center gap-3 hover:bg-bg-cardHover transition-colors">
                <Zap className="w-5 h-5 text-accent-yellow" />
                <span className="text-white">Energy Dashboard</span>
              </a>
              <a href="/secure" className="card p-4 flex items-center gap-3 hover:bg-bg-cardHover transition-colors">
                <Shield className="w-5 h-5 text-accent-green" />
                <span className="text-white">Security Panel</span>
              </a>
              <a href="/family" className="card p-4 flex items-center gap-3 hover:bg-bg-cardHover transition-colors">
                <Users className="w-5 h-5 text-accent-pink" />
                <span className="text-white">Family Tracker</span>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
