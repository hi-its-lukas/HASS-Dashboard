'use client'

import { useState } from 'react'
import WizardLayout from '@/components/setup/WizardLayout'
import WelcomeStep from '@/components/setup/steps/WelcomeStep'
import HomeAssistantStep from '@/components/setup/steps/HomeAssistantStep'
import UnifiStep from '@/components/setup/steps/UnifiStep'
import AdminUserStep from '@/components/setup/steps/AdminUserStep'
import CompleteStep from '@/components/setup/steps/CompleteStep'
import { WizardStep, WizardState, getNextStep, getPrevStep } from '@/lib/setup/wizard-state'

export default function SetupPage() {
  const [state, setState] = useState<WizardState>({
    currentStep: 'welcome'
  })

  const goToStep = (step: WizardStep) => {
    setState(prev => ({ ...prev, currentStep: step }))
  }

  const handleNext = () => {
    const next = getNextStep(state.currentStep)
    if (next) goToStep(next)
  }

  const handleBack = () => {
    const prev = getPrevStep(state.currentStep)
    if (prev) goToStep(prev)
  }

  const handleHAComplete = (data: { url: string; token: string }) => {
    setState(prev => ({
      ...prev,
      haUrl: data.url,
      haToken: data.token,
      haConnected: true,
      currentStep: 'unifi'
    }))
  }

  const handleUnifiComplete = (data: { enabled: boolean; host?: string; username?: string; password?: string }) => {
    setState(prev => ({
      ...prev,
      unifiEnabled: data.enabled,
      unifiHost: data.host,
      unifiUsername: data.username,
      unifiPassword: data.password,
      unifiConnected: data.enabled,
      currentStep: 'admin-user'
    }))
  }

  const [adminPassword, setAdminPassword] = useState('')
  
  const handleAdminComplete = (data: { username: string; password: string }) => {
    setAdminPassword(data.password)
    setState(prev => ({
      ...prev,
      adminUsername: data.username,
      currentStep: 'complete'
    }))
  }

  return (
    <WizardLayout currentStep={state.currentStep}>
      {state.currentStep === 'welcome' && (
        <WelcomeStep onNext={handleNext} />
      )}
      
      {state.currentStep === 'home-assistant' && (
        <HomeAssistantStep
          onNext={handleHAComplete}
          onBack={handleBack}
          initialUrl={state.haUrl}
          initialToken={state.haToken}
        />
      )}
      
      {state.currentStep === 'unifi' && (
        <UnifiStep
          onNext={handleUnifiComplete}
          onBack={handleBack}
          initialHost={state.unifiHost}
          initialUsername={state.unifiUsername}
        />
      )}
      
      {state.currentStep === 'admin-user' && (
        <AdminUserStep
          onNext={handleAdminComplete}
          onBack={handleBack}
        />
      )}
      
      {state.currentStep === 'complete' && state.haUrl && state.haToken && state.adminUsername && (
        <CompleteStep
          haUrl={state.haUrl}
          haToken={state.haToken}
          unifiEnabled={state.unifiEnabled || false}
          unifiHost={state.unifiHost}
          unifiUsername={state.unifiUsername}
          unifiPassword={state.unifiPassword}
          adminUsername={state.adminUsername}
          adminPassword={adminPassword}
        />
      )}
    </WizardLayout>
  )
}
