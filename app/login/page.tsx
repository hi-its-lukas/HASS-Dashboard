'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Home, AlertCircle, Loader2 } from 'lucide-react'

const HA_URL_STORAGE_KEY = 'ha-dashboard-instance-url'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorMessage = searchParams.get('error')
  
  const [haUrl, setHaUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(errorMessage)
  const redirectPath = searchParams.get('redirect') || '/'
  
  useEffect(() => {
    const savedUrl = localStorage.getItem(HA_URL_STORAGE_KEY)
    if (savedUrl) {
      setHaUrl(savedUrl)
    }
  }, [])
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    localStorage.setItem(HA_URL_STORAGE_KEY, haUrl)
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ haUrl, redirect: redirectPath })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }
      
      window.location.href = data.authUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setLoading(false)
    }
  }
  
  return (
    <div className="w-full max-w-md">
      <div 
        className="rounded-3xl p-8"
        style={{
          background: 'rgba(44, 44, 46, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div className="flex items-center justify-center mb-8">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #ff9f0a 0%, #ff375f 100%)' }}
          >
            <Home className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white text-center mb-2">
          HA Dashboard
        </h1>
        <p className="text-center mb-8" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
          Mit Home Assistant anmelden
        </p>
        
        {error && (
          <div 
            className="rounded-xl p-4 mb-6 flex items-start gap-3"
            style={{ background: 'rgba(255, 69, 58, 0.15)', border: '1px solid rgba(255, 69, 58, 0.3)' }}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ff453a' }} />
            <p className="text-sm" style={{ color: '#ff453a' }}>{error}</p>
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="haUrl" className="block text-sm font-medium mb-2" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              Home Assistant URL
            </label>
            <input
              type="url"
              id="haUrl"
              value={haUrl}
              onChange={(e) => setHaUrl(e.target.value)}
              placeholder="https://your-home-assistant.local:8123"
              required
              className="w-full px-4 py-3 rounded-xl text-white focus:outline-none focus:ring-2"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            />
            <p className="mt-2 text-xs" style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
              Gib die URL deiner Home Assistant-Instanz ein
            </p>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #30d158 0%, #34c759 100%)' }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verbinden...
              </>
            ) : (
              'Mit Home Assistant anmelden'
            )}
          </button>
        </form>
        
        <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <p className="text-xs text-center" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
            Deine Zugangsdaten werden nie gespeichert. Die Authentifizierung erfolgt direkt über Home Assistant mit OAuth.
          </p>
        </div>
      </div>
    </div>
  )
}

function LoginFormFallback() {
  return (
    <div className="w-full max-w-md">
      <div 
        className="rounded-3xl p-8 flex items-center justify-center"
        style={{
          background: 'rgba(44, 44, 46, 0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#30d158' }} />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
    >
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
