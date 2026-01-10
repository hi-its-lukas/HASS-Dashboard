export type WizardStep = 'welcome' | 'home-assistant' | 'unifi' | 'admin-user' | 'complete'

export interface WizardState {
  currentStep: WizardStep
  haUrl?: string
  haToken?: string
  haConnected?: boolean
  unifiEnabled?: boolean
  unifiHost?: string
  unifiUsername?: string
  unifiPassword?: string
  unifiConnected?: boolean
  adminUsername?: string
  adminCreated?: boolean
}

export const WIZARD_STEPS: WizardStep[] = ['welcome', 'home-assistant', 'unifi', 'admin-user', 'complete']

export function getNextStep(current: WizardStep): WizardStep | null {
  const idx = WIZARD_STEPS.indexOf(current)
  if (idx === -1 || idx >= WIZARD_STEPS.length - 1) return null
  return WIZARD_STEPS[idx + 1]
}

export function getPrevStep(current: WizardStep): WizardStep | null {
  const idx = WIZARD_STEPS.indexOf(current)
  if (idx <= 0) return null
  return WIZARD_STEPS[idx - 1]
}

export function getStepNumber(step: WizardStep): number {
  return WIZARD_STEPS.indexOf(step) + 1
}

export function getTotalSteps(): number {
  return WIZARD_STEPS.length
}
