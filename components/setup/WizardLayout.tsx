'use client'

import { motion } from 'framer-motion'
import { Home, Settings, Shield, User, CheckCircle } from 'lucide-react'
import { WizardStep, getStepNumber, getTotalSteps } from '@/lib/setup/wizard-state'

interface WizardLayoutProps {
  currentStep: WizardStep
  children: React.ReactNode
}

const STEP_ICONS = {
  'welcome': Home,
  'home-assistant': Settings,
  'unifi': Shield,
  'admin-user': User,
  'complete': CheckCircle,
}

const STEP_LABELS = {
  'welcome': 'Willkommen',
  'home-assistant': 'Home Assistant',
  'unifi': 'UniFi (Optional)',
  'admin-user': 'Admin-Benutzer',
  'complete': 'Fertig',
}

export default function WizardLayout({ currentStep, children }: WizardLayoutProps) {
  const stepNumber = getStepNumber(currentStep)
  const totalSteps = getTotalSteps()
  const progress = (stepNumber / totalSteps) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col">
      <header className="p-6 border-b border-white/10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white">HA Dashboard Setup</h1>
            <span className="text-sm text-text-secondary">
              Schritt {stepNumber} von {totalSteps}
            </span>
          </div>
          
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-accent-cyan"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          <div className="flex justify-between mt-4">
            {Object.entries(STEP_LABELS).map(([step, label]) => {
              const Icon = STEP_ICONS[step as WizardStep]
              const isActive = step === currentStep
              const stepNum = getStepNumber(step as WizardStep)
              const isCompleted = stepNum < stepNumber
              
              return (
                <div key={step} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                    isActive ? 'bg-accent-cyan text-white' :
                    isCompleted ? 'bg-green-500 text-white' :
                    'bg-gray-700 text-gray-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className={`text-xs mt-1 hidden md:block ${
                    isActive ? 'text-accent-cyan' : 'text-gray-500'
                  }`}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </header>
      
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  )
}
