'use client'

import { useState } from 'react'
import { ArrowRight, ArrowLeft, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface HomeAssistantStepProps {
  onNext: (data: { url: string; token: string }) => void
  onBack: () => void
  initialUrl?: string
  initialToken?: string
}

export default function HomeAssistantStep({ onNext, onBack, initialUrl = '', initialToken = '' }: HomeAssistantStepProps) {
  const [url, setUrl] = useState(initialUrl)
  const [token, setToken] = useState(initialToken)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const testConnection = async () => {
    if (!url || !token) return
    
    setTesting(true)
    setTestResult(null)
    
    try {
      const response = await fetch('/api/setup/test-ha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, token })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setTestResult({ success: true, message: `Verbunden mit ${data.locationName || 'Home Assistant'}` })
      } else {
        setTestResult({ success: false, message: data.error || 'Verbindung fehlgeschlagen' })
      }
    } catch {
      setTestResult({ success: false, message: 'Netzwerkfehler' })
    } finally {
      setTesting(false)
    }
  }

  const handleNext = () => {
    if (testResult?.success) {
      onNext({ url, token })
    }
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold text-white mb-2">Home Assistant verbinden</h2>
      <p className="text-text-secondary mb-6">
        Gib deine Home Assistant URL und einen Long-Lived Access Token ein.
      </p>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Home Assistant URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setTestResult(null) }}
            placeholder="https://homeassistant.local:8123"
            className="w-full px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-cyan"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Long-Lived Access Token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => { setToken(e.target.value); setTestResult(null) }}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            className="w-full px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-cyan"
          />
          <a
            href="https://www.home-assistant.io/docs/authentication/#your-account-profile"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-accent-cyan hover:underline mt-2"
          >
            Wie erstelle ich einen Token?
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
      
      {testResult && (
        <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 ${
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
      
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-text-secondary hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={testConnection}
            disabled={!url || !token || testing}
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
        </div>
      </div>
    </Card>
  )
}
