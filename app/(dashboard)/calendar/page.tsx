'use client'

import { motion } from 'framer-motion'
import { Calendar } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function CalendarPage() {
  return (
    <div className="px-4 py-6 safe-top max-w-lg mx-auto">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-white">Calendar</h1>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-accent-cyan/20 flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-accent-cyan" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Calendar View</h2>
            <p className="text-text-secondary">
              Connect your Home Assistant calendar entities to see upcoming events and schedules here.
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
