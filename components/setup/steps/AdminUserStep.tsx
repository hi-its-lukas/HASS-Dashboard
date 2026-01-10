'use client'

import { useState } from 'react'
import { ArrowRight, ArrowLeft, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface AdminUserStepProps {
  onNext: (data: { username: string; password: string }) => void
  onBack: () => void
}

export default function AdminUserStep({ onNext, onBack }: AdminUserStepProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateAndNext = () => {
    setError(null)
    
    if (username.length < 3) {
      setError('Benutzername muss mindestens 3 Zeichen lang sein')
      return
    }
    
    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein')
      return
    }
    
    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein')
      return
    }
    
    onNext({ username, password })
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold text-white mb-2">Administrator-Konto erstellen</h2>
      <p className="text-text-secondary mb-6">
        Erstelle dein Admin-Konto für den Zugriff auf das Dashboard.
      </p>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Benutzername
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(null) }}
            placeholder="admin"
            className="w-full px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-cyan"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Passwort
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null) }}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-cyan pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Passwort bestätigen
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setError(null) }}
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-bg-secondary border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-accent-cyan"
          />
        </div>
      </div>
      
      {error && (
        <div className="p-4 rounded-xl mb-6 flex items-center gap-3 bg-red-500/20 border border-red-500/30">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400">{error}</span>
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
        
        <button
          onClick={validateAndNext}
          disabled={!username || !password || !confirmPassword}
          className="inline-flex items-center gap-2 px-6 py-2 bg-accent-cyan hover:bg-accent-cyan/80 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
        >
          Konto erstellen
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </Card>
  )
}
