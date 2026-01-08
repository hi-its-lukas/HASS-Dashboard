'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Trash2, Star, Edit2, Save, X, Cloud } from 'lucide-react'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface WeatherLocation {
  id: string
  name: string
  entityPrefix: string
  isPrimary?: boolean
}

export default function WeatherSettingsPage() {
  const [locations, setLocations] = useState<WeatherLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newLocation, setNewLocation] = useState({ name: '', entityPrefix: '' })
  const [editForm, setEditForm] = useState({ name: '', entityPrefix: '' })

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const data = await res.json()
        setLocations(data.layoutConfig?.weatherLocations || [])
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveLocations = async (updatedLocations: WeatherLocation[]) => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layoutConfig: { weatherLocations: updatedLocations } })
      })
      if (res.ok) {
        setLocations(updatedLocations)
      }
    } catch (error) {
      console.error('Failed to save locations:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleAddLocation = () => {
    if (!newLocation.name.trim() || !newLocation.entityPrefix.trim()) return

    const id = newLocation.entityPrefix.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const isPrimary = locations.length === 0

    const updatedLocations = [
      ...locations,
      { id, name: newLocation.name, entityPrefix: newLocation.entityPrefix, isPrimary }
    ]

    saveLocations(updatedLocations)
    setNewLocation({ name: '', entityPrefix: '' })
    setShowAddForm(false)
  }

  const handleDeleteLocation = (id: string) => {
    const locationToDelete = locations.find(l => l.id === id)
    let updatedLocations = locations.filter(l => l.id !== id)

    if (locationToDelete?.isPrimary && updatedLocations.length > 0) {
      updatedLocations[0].isPrimary = true
    }

    saveLocations(updatedLocations)
  }

  const handleSetPrimary = (id: string) => {
    const updatedLocations = locations.map(l => ({
      ...l,
      isPrimary: l.id === id
    }))
    saveLocations(updatedLocations)
  }

  const handleStartEdit = (location: WeatherLocation) => {
    setEditingId(location.id)
    setEditForm({ name: location.name, entityPrefix: location.entityPrefix })
  }

  const handleSaveEdit = () => {
    if (!editingId || !editForm.name.trim() || !editForm.entityPrefix.trim()) return

    const updatedLocations = locations.map(l =>
      l.id === editingId
        ? { ...l, name: editForm.name, entityPrefix: editForm.entityPrefix }
        : l
    )

    saveLocations(updatedLocations)
    setEditingId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({ name: '', entityPrefix: '' })
  }

  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings" className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Wetter-Orte</h1>
          <p className="text-text-muted text-sm">AccuWeather Standorte konfigurieren</p>
        </div>
      </div>

      <Card className="glass-card p-4">
        <div className="flex items-start gap-3 text-text-muted text-sm">
          <Cloud className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="mb-2">
              Hier kannst du mehrere Wetter-Standorte konfigurieren. Der <strong>Entity-Präfix</strong> ist der Teil vor dem Unterstrich in deinen AccuWeather-Sensoren.
            </p>
            <p className="text-xs">
              Beispiel: Für <code className="bg-white/10 px-1 rounded">sensor.home_bedingung_tag_0</code> ist der Präfix <code className="bg-white/10 px-1 rounded">home</code>
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {locations.map((location) => (
          <motion.div
            key={location.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass-card p-4">
              {editingId === location.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Name (z.B. Zuhause)"
                    className="w-full px-3 py-2 bg-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  <input
                    type="text"
                    value={editForm.entityPrefix}
                    onChange={(e) => setEditForm({ ...editForm, entityPrefix: e.target.value })}
                    placeholder="Entity-Präfix (z.B. home)"
                    className="w-full px-3 py-2 bg-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Speichern
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/10 text-text-muted rounded-xl hover:bg-white/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {location.isPrimary && (
                      <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    )}
                    <div>
                      <p className="text-white font-medium">{location.name}</p>
                      <p className="text-text-muted text-sm">
                        Präfix: <code className="bg-white/10 px-1 rounded">{location.entityPrefix}</code>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!location.isPrimary && (
                      <button
                        onClick={() => handleSetPrimary(location.id)}
                        className="p-2 text-text-muted hover:text-yellow-400 transition-colors"
                        title="Als primär setzen"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleStartEdit(location)}
                      className="p-2 text-text-muted hover:text-white transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(location.id)}
                      className="p-2 text-text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </motion.div>
        ))}

        {locations.length === 0 && !showAddForm && (
          <Card className="glass-card p-6 text-center">
            <Cloud className="w-12 h-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-muted">Noch keine Wetter-Orte konfiguriert</p>
          </Card>
        )}

        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass-card p-4 space-y-3">
              <input
                type="text"
                value={newLocation.name}
                onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                placeholder="Name (z.B. Büro)"
                className="w-full px-3 py-2 bg-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-white/20"
                autoFocus
              />
              <input
                type="text"
                value={newLocation.entityPrefix}
                onChange={(e) => setNewLocation({ ...newLocation, entityPrefix: e.target.value })}
                placeholder="Entity-Präfix (z.B. office)"
                className="w-full px-3 py-2 bg-white/10 rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-white/20"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddLocation}
                  disabled={!newLocation.name.trim() || !newLocation.entityPrefix.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Hinzufügen
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setNewLocation({ name: '', entityPrefix: '' })
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/10 text-text-muted rounded-xl hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Abbrechen
                </button>
              </div>
            </Card>
          </motion.div>
        )}

        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Neuen Ort hinzufügen
          </button>
        )}
      </div>

      {saving && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      )}
    </div>
  )
}
