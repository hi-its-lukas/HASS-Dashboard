'use client'

import { useState } from 'react'
import { ArrowRight, ArrowLeft, Loader2, CheckCircle, AlertCircle, SkipForward } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface UnifiStepProps {
  onNext: (data: { enabled: boolean; host?: string; username?: string; password?: string }) => void
  onBack: () => void
  initialHost?: string
  initialUsername?: string
}

export default function UnifiStep({ onNext, onBack, initialHost = '', initialUsername = '' }: UnifiStepProps) {
  const [enabled, setEnabled] = useState(false)
  const [host, setHost] = useState(initialHost)
  const [username, setUsername] = useState(initialUsername)
  const [password, setPassword] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; cameras?: number } | null>(null)

  const testConnection = async () => {
    if (!host || !username || !password) return
    
    setTesting(true)
    setTestResult(null)
    
    try {
      const response = await fetch('/api/setup/test-unifi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, username, password })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setTestResult({ 
          success: true, 
          message: `Verbunden! ${data.cameras || 0} Kameras gefunden`,
          cameras: data.cameras 
        })
      } else {
        setTestResult({ success: false, message: data.error || 'Verbindung fehlgeschlagen' })
      }
    } catch {
      setTestResult({ success: false, message: 'Netzwerkfehler' })
    } finally {
      setTesting(false)
    }
  }

  const handleSkip = () => {
    onNext({ enabled: false })
  }

  const handleNext = () => {
    if (!enabled) {
      onNext({ enabled: false })
    } else if (testResult?.success) {
      onNext({ enabled: true, host, username, password })
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold text-white mb-2">UniFi Integration (Optional)</h2>
      <p className="text-text-secondary mb-6">
        Verbinde UniFi Protect für Kamera-Livestreams und AI-Erkennung.
      </p>
      
      <div className="mb-6">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 bg-bg-secondary text-accent-cyan focus:ring-accent-cyan"
          />
          <span className="text-white font-medium">UniFi Protect aktivieren</span>
        </label>
      </div>
      
      {enabled && (
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              UniFi Controller URL
            </label>
            <input
              type="text"
              value={host}
              onChange={(e) => { setHost(e.target.value); setTestResult(null) }}
              placeholder="192.168.1.1"
              className="w-full px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-cyan"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Benutzername
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setTestResult(null) }}
              placeholder="admin"
              className="w-full px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-cyan"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setTestResult(null) }}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-cyan"
            />
          </div>
          
          {testResult && (
            <div className={`p-4 rounded-xl flex items-center gap-3 ${
              testResult.success 
                ? 'bg-green-500/20 border border-green-500/30' 
                : 'bg-red-500/20 border border-red-500/30'
            }`}>
              {testResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
              <span className={testResult.success ? 'text-green-400' : 'text-red-400'}>
                {testResult.message}
              </span>
            </div>
          )}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </button>
        
        <div className="flex gap-3">
          {!enabled ? (
            <button
              onClick={handleSkip}
              className="inline-flex items-center gap-2 px-6 py-2 bg-accent-cyan hover:bg-accent-cyan/80 text-white font-semibold rounded-xl transition-colors"
            >
              Überspringen
              <SkipForward className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                onClick={testConnection}
                disabled={!host || !username || !password || testing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Verbindung testen
              </button>
              
              <button
                onClick={handleNext}
                disabled={!testResult?.success}
                className="inline-flex items-center gap-2 px-6 py-2 bg-accent-cyan hover:bg-accent-cyan/80 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                Weiter
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}
