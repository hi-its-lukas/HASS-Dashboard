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
      <div className="bg-[#141b2d]/80 backdrop-blur-lg rounded-3xl p-8 border border-white/5">
        <div className="flex items-center justify-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center">
            <Home className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white text-center mb-2">
          HA Dashboard
        </h1>
        <p className="text-gray-400 text-center mb-8">
          Login with your Home Assistant account
        </p>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="haUrl" className="block text-sm font-medium text-gray-300 mb-2">
              Home Assistant URL
            </label>
            <input
              type="url"
              id="haUrl"
              value={haUrl}
              onChange={(e) => setHaUrl(e.target.value)}
              placeholder="https://your-home-assistant.local:8123"
              required
              className="w-full px-4 py-3 bg-[#1a2235] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
            />
            <p className="mt-2 text-xs text-gray-500">
              Enter the URL where your Home Assistant is accessible
            </p>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              'Login with Home Assistant'
            )}
          </button>
        </form>
        
        <div className="mt-8 pt-6 border-t border-white/5">
          <p className="text-xs text-gray-500 text-center">
            Your credentials are never stored. Authentication is handled directly by Home Assistant using OAuth.
          </p>
        </div>
      </div>
    </div>
  )
}

function LoginFormFallback() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-[#141b2d]/80 backdrop-blur-lg rounded-3xl p-8 border border-white/5 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center p-4">
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
