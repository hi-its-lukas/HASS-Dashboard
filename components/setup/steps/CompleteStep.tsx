'use client'

import { useState } from 'react'
import { CheckCircle, Loader2, Home, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

interface CompleteStepProps {
  haUrl: string
  haToken: string
  unifiEnabled: boolean
  unifiHost?: string
  unifiUsername?: string
  unifiPassword?: string
  adminUsername: string
  adminPassword: string
}

export default function CompleteStep({
  haUrl,
  haToken,
  unifiEnabled,
  unifiHost,
  unifiUsername,
  unifiPassword,
  adminUsername,
  adminPassword,
}: CompleteStepProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const completeSetup = async () => {
    setSaving(true)
    setError(null)
    
    try {
      const response = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          haUrl,
          haToken,
          unifiEnabled,
          unifiHost,
          unifiUsername,
          unifiPassword,
          adminUsername,
          adminPassword,
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setDone(true)
        setTimeout(() => {
          router.push('/login')
        }, 2000)
      } else {
        setError(data.error || 'Setup fehlgeschlagen')
      }
    } catch {
      setError('Netzwerkfehler')
    } finally {
      setSaving(false)
    }
  }

  if (done) {
    return (
      <Card className="p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-4">
          Setup abgeschlossen!
        </h2>
        
        <p className="text-text-secondary mb-6">
          Du wirst jetzt zum Login weitergeleitet...
        </p>
        
        <Loader2 className="w-6 h-6 text-accent-cyan animate-spin mx-auto" />
      </Card>
    )
  }

  return (
    <Card className="p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-accent-cyan/20 flex items-center justify-center mx-auto mb-4">
          <Home className="w-8 h-8 text-accent-cyan" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">
          Bereit zur Fertigstellung
        </h2>
        
        <p className="text-text-secondary">
          Überprüfe deine Einstellungen und schließe das Setup ab.
        </p>
      </div>
      
      <div className="space-y-4 mb-8">
        <div className="p-4 bg-bg-secondary rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Home Assistant</span>
            <span className="text-white font-medium">{haUrl}</span>
          </div>
        </div>
        
        <div className="p-4 bg-bg-secondary rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">UniFi Protect</span>
            <span className="text-white font-medium">
              {unifiEnabled ? unifiHost : 'Deaktiviert'}
            </span>
          </div>
        </div>
        
        <div className="p-4 bg-bg-secondary rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Administrator</span>
            <span className="text-white font-medium">{adminUsername}</span>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="p-4 rounded-xl mb-6 flex items-center gap-3 bg-red-500/20 border border-red-500/30">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
        </div>
      )}
      
      <button
        onClick={completeSetup}
        disabled={saving}
        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-accent-cyan hover:bg-accent-cyan/80 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Speichere...
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5" />
            Setup abschließen
          </>
        )}
      </button>
    </Card>
  )
}
