'use client'

import { Home, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface WelcomeStepProps {
  onNext: () => void
}

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <Card className="p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-accent-cyan/20 flex items-center justify-center mx-auto mb-6">
        <Home className="w-10 h-10 text-accent-cyan" />
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-4">
        Willkommen beim HA Dashboard
      </h2>
      
      <p className="text-text-secondary mb-8 max-w-md mx-auto">
        Dieses Setup hilft dir, dein Dashboard mit Home Assistant zu verbinden 
        und optional UniFi-Geräte einzurichten. Der Vorgang dauert nur wenige Minuten.
      </p>
      
      <div className="space-y-4 text-left bg-bg-secondary rounded-xl p-6 mb-8">
        <h3 className="font-semibold text-white mb-3">Was wird eingerichtet:</h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-accent-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs text-accent-cyan font-bold">1</span>
            </div>
            <div>
              <p className="text-white font-medium">Home Assistant Verbindung</p>
              <p className="text-sm text-text-muted">URL und Long-Lived Access Token</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-accent-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs text-accent-cyan font-bold">2</span>
            </div>
            <div>
              <p className="text-white font-medium">UniFi Integration (Optional)</p>
              <p className="text-sm text-text-muted">Protect Kameras und Access Türen</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-accent-cyan/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs text-accent-cyan font-bold">3</span>
            </div>
            <div>
              <p className="text-white font-medium">Administrator-Konto</p>
              <p className="text-sm text-text-muted">Dein Benutzername und Passwort</p>
            </div>
          </li>
        </ul>
      </div>
      
      <button
        onClick={onNext}
        className="inline-flex items-center gap-2 px-6 py-3 bg-accent-cyan hover:bg-accent-cyan/80 text-white font-semibold rounded-xl transition-colors"
      >
        Los geht's
        <ArrowRight className="w-5 h-5" />
      </button>
    </Card>
  )
}
