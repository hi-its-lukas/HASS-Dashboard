'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, Loader2, CheckCircle, Home } from 'lucide-react'

const DASHBOARD_TITLE_KEY = 'ha-dashboard-title'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorMessage = searchParams.get('error')
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(errorMessage)
  const [dashboardTitle, setDashboardTitle] = useState('HA Dashboard')
  const [haStatus, setHaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const redirectPath = searchParams.get('redirect') || '/'
  
  useEffect(() => {
    const savedTitle = localStorage.getItem(DASHBOARD_TITLE_KEY)
    if (savedTitle) {
      setDashboardTitle(savedTitle)
    }
    
    checkHAConnection()
  }, [])
  
  const checkHAConnection = async () => {
    try {
      const res = await fetch('/api/ha/status')
      if (res.ok) {
        const data = await res.json()
        setHaStatus(data.connected ? 'connected' : 'disconnected')
      } else {
        setHaStatus('disconnected')
      }
    } catch {
      setHaStatus('disconnected')
    }
  }
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }
      
      router.push(redirectPath)
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
        <h1 className="text-2xl font-bold text-white text-center mb-2 mt-4">
          {dashboardTitle}
        </h1>
        <p className="text-center mb-6" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
          Anmelden
        </p>
        
        <div className="flex items-center justify-center gap-2 mb-6 p-3 rounded-xl" 
          style={{ 
            background: haStatus === 'connected' 
              ? 'rgba(48, 209, 88, 0.15)' 
              : haStatus === 'disconnected' 
                ? 'rgba(255, 69, 58, 0.15)' 
                : 'rgba(255, 255, 255, 0.05)',
            border: haStatus === 'connected' 
              ? '1px solid rgba(48, 209, 88, 0.3)' 
              : haStatus === 'disconnected' 
                ? '1px solid rgba(255, 69, 58, 0.3)' 
                : '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          {haStatus === 'checking' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              <span className="text-sm text-gray-400">Home Assistant prüfen...</span>
            </>
          ) : haStatus === 'connected' ? (
            <>
              <CheckCircle className="w-4 h-4" style={{ color: '#30d158' }} />
              <span className="text-sm" style={{ color: '#30d158' }}>Home Assistant verbunden</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4" style={{ color: '#ff453a' }} />
              <span className="text-sm" style={{ color: '#ff453a' }}>Home Assistant nicht konfiguriert</span>
            </>
          )}
        </div>
        
        {error && (
          <div 
            className="rounded-xl p-4 mb-6 flex items-start gap-3"
            style={{ background: 'rgba(255, 69, 58, 0.15)', border: '1px solid rgba(255, 69, 58, 0.3)' }}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#ff453a' }} />
            <p className="text-sm" style={{ color: '#ff453a' }}>{error}</p>
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-2" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              Benutzername
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Benutzername"
              required
              autoComplete="username"
              className="w-full px-4 py-3 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              Passwort
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 active:scale-[0.98]"
            style={{ 
              background: 'rgba(255, 255, 255, 0.95)',
              color: '#1c1c1e'
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Anmelden...
              </>
            ) : (
              <>
                <Home className="w-5 h-5" />
                Anmelden
              </>
            )}
          </button>
        </form>
        
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
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'rgba(255, 255, 255, 0.6)' }} />
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
