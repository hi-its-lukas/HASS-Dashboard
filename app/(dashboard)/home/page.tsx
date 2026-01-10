'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home } from 'lucide-react'
import { 
  LightsTab, 
  CoversTab, 
  AwningsTab, 
  ClimateTab, 
  VacuumTab, 
  LocksTab,
  TABS,
  type TabId 
} from '@/components/dashboard/home'

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>('lights')

  return (
    <div className="px-4 py-6 safe-top max-w-7xl mx-auto">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="w-10 h-10 rounded-full bg-accent-cyan/20 flex items-center justify-center">
          <Home className="w-5 h-5 text-accent-cyan" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Zuhause</h1>
          <p className="text-xs text-text-secondary">Geräte steuern</p>
        </div>
      </motion.header>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all"
              style={isActive 
                ? { backgroundColor: tab.bgColor, color: tab.textColor }
                : { backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }
              }
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'lights' && <LightsTab />}
          {activeTab === 'covers' && <CoversTab />}
          {activeTab === 'awnings' && <AwningsTab />}
          {activeTab === 'climate' && <ClimateTab />}
          {activeTab === 'vacuum' && <VacuumTab />}
          {activeTab === 'locks' && <LocksTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
