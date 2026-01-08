'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Plus, 
  Loader2, 
  ChevronLeft,
  Pencil,
  Trash2,
  Shield,
  User,
  Check,
  X,
  Info
} from 'lucide-react'

const ROLE_DESCRIPTIONS: Record<string, { description: string; permissions: string[] }> = {
  owner: {
    description: 'Vollzugriff auf alle Funktionen',
    permissions: ['Alle Einstellungen', 'Benutzerverwaltung', 'Alle Module', 'Alle Aktionen']
  },
  admin: {
    description: 'Administration und voller Modulzugriff',
    permissions: ['Alle Einstellungen', 'Benutzerverwaltung', 'Alle Module', 'Alle Aktionen']
  },
  power_user: {
    description: 'Alle Module, keine Benutzerverwaltung',
    permissions: ['Einstellungen bearbeiten', 'Alle Module', 'Alle Aktionen']
  },
  viewer: {
    description: 'Nur ansehen, keine Aktionen',
    permissions: ['Einstellungen ansehen', 'Alle Module (nur lesen)']
  },
  guest: {
    description: 'Eingeschränkte Sicht',
    permissions: ['Dashboard', 'Kalender', 'Mehr-Seite']
  }
}

interface Role {
  id: string
  name: string
  displayName: string
  description: string | null
}

interface UserData {
  id: string
  username: string
  displayName: string | null
  role: Role | null
  status: string
  personEntityId: string | null
  lastLoginAt: string | null
  createdAt: string
}

export default function UsersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserData[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [canManage, setCanManage] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newRoleId, setNewRoleId] = useState('')
  
  useEffect(() => {
    loadUsers()
  }, [])
  
  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.status === 401) {
        router.push('/login')
        return
      }
      if (res.status === 403) {
        router.push('/settings')
        return
      }
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
        setRoles(data.roles)
        setCanManage(data.canManage)
        if (data.roles.length > 0) {
          setNewRoleId(data.roles.find((r: Role) => r.name === 'viewer')?.id || data.roles[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleAddUser = async () => {
    if (!newUsername || !newPassword) {
      setError('Benutzername und Passwort erforderlich')
      return
    }
    
    setSaving(true)
    setError(null)
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          displayName: newDisplayName || newUsername,
          roleId: newRoleId
        })
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create user')
      }
      
      setShowAddModal(false)
      setNewUsername('')
      setNewPassword('')
      setNewDisplayName('')
      loadUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user')
    } finally {
      setSaving(false)
    }
  }
  
  const handleUpdateUser = async (userId: string, updates: Record<string, unknown>) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      if (res.ok) {
        setEditingUser(null)
        loadUsers()
      }
    } catch (error) {
      console.error('Failed to update user:', error)
    } finally {
      setSaving(false)
    }
  }
  
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Benutzer wirklich löschen?')) return
    
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        loadUsers()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete user')
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#1c1c1e' }}>
        <Loader2 className="w-8 h-8 animate-spin text-white/60" />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: '#1c1c1e' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => router.push('/settings')}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <Users className="w-8 h-8 text-white" />
          <h1 className="text-2xl font-bold text-white">Benutzerverwaltung</h1>
        </div>
        
        {canManage && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl mb-6 transition-all hover:opacity-90"
            style={{ background: 'rgba(48, 209, 88, 0.2)', color: '#30d158' }}
          >
            <Plus className="w-5 h-5" />
            Benutzer hinzufügen
          </button>
        )}
        
        <div className="space-y-3">
          {users.map(user => (
            <div 
              key={user.id}
              className="rounded-2xl p-4"
              style={{
                background: 'rgba(44, 44, 46, 0.8)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                  >
                    <User className="w-5 h-5 text-white/60" />
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {user.displayName || user.username}
                    </div>
                    <div className="text-sm text-white/50">@{user.username}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div 
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm"
                    style={{ 
                      background: 'rgba(255, 149, 0, 0.15)', 
                      color: '#ff9500' 
                    }}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    {user.role?.displayName || 'Keine Rolle'}
                  </div>
                  
                  {user.status !== 'active' && (
                    <span 
                      className="px-2 py-1 rounded text-xs"
                      style={{ 
                        background: 'rgba(255, 69, 58, 0.15)', 
                        color: '#ff453a' 
                      }}
                    >
                      {user.status}
                    </span>
                  )}
                  
                  {canManage && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Pencil className="w-4 h-4 text-white/60" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {showAddModal && (
          <div 
            className="fixed inset-0 flex items-center justify-center p-4 z-50"
            style={{ background: 'rgba(0, 0, 0, 0.7)' }}
            onClick={() => setShowAddModal(false)}
          >
            <div 
              className="w-full max-w-md rounded-2xl p-6"
              style={{
                background: 'rgba(44, 44, 46, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold text-white mb-4">Neuer Benutzer</h2>
              
              {error && (
                <div 
                  className="rounded-xl p-3 mb-4 text-sm"
                  style={{ background: 'rgba(255, 69, 58, 0.15)', color: '#ff453a' }}
                >
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Benutzername</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-white"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-white/70 mb-1">Passwort</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-white"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-white/70 mb-1">Anzeigename</label>
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={e => setNewDisplayName(e.target.value)}
                    placeholder={newUsername || 'Optional'}
                    className="w-full px-3 py-2 rounded-xl text-white"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-white/70 mb-1">Rolle</label>
                  <select
                    value={newRoleId}
                    onChange={e => setNewRoleId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-white"
                    style={{
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.id} style={{ background: '#2c2c2e' }}>
                        {role.displayName}
                      </option>
                    ))}
                  </select>
                  {(() => {
                    const selectedRole = roles.find(r => r.id === newRoleId)
                    const roleInfo = selectedRole ? ROLE_DESCRIPTIONS[selectedRole.name] : null
                    return roleInfo && (
                      <div 
                        className="mt-2 p-3 rounded-xl text-sm"
                        style={{ background: 'rgba(10, 132, 255, 0.1)' }}
                      >
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-white/80 mb-1">{roleInfo.description}</div>
                            <div className="text-white/50 text-xs">
                              {roleInfo.permissions.join(' • ')}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 rounded-xl text-white/70 hover:bg-white/10 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAddUser}
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-xl font-medium transition-all disabled:opacity-50"
                  style={{ background: '#30d158', color: '#000' }}
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Erstellen'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {editingUser && (
          <EditUserModal
            user={editingUser}
            roles={roles}
            onClose={() => setEditingUser(null)}
            onSave={handleUpdateUser}
            saving={saving}
          />
        )}
      </div>
    </div>
  )
}

function EditUserModal({ 
  user, 
  roles, 
  onClose, 
  onSave, 
  saving 
}: { 
  user: UserData
  roles: Role[]
  onClose: () => void
  onSave: (id: string, updates: Record<string, unknown>) => void
  saving: boolean
}) {
  const [displayName, setDisplayName] = useState(user.displayName || '')
  const [roleId, setRoleId] = useState(user.role?.id || '')
  const [status, setStatus] = useState(user.status)
  const [newPassword, setNewPassword] = useState('')
  
  const handleSave = () => {
    const updates: Record<string, unknown> = {
      displayName,
      roleId,
      status
    }
    if (newPassword) {
      updates.password = newPassword
    }
    onSave(user.id, updates)
  }
  
  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div 
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          background: 'rgba(44, 44, 46, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-4">
          Benutzer bearbeiten: {user.username}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Anzeigename</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-white"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            />
          </div>
          
          <div>
            <label className="block text-sm text-white/70 mb-1">Neues Passwort (leer lassen = unverändert)</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-xl text-white"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            />
          </div>
          
          <div>
            <label className="block text-sm text-white/70 mb-1">Rolle</label>
            <select
              value={roleId}
              onChange={e => setRoleId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-white"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              {roles.map(role => (
                <option key={role.id} value={role.id} style={{ background: '#2c2c2e' }}>
                  {role.displayName}
                </option>
              ))}
            </select>
            {(() => {
              const selectedRole = roles.find(r => r.id === roleId)
              const roleInfo = selectedRole ? ROLE_DESCRIPTIONS[selectedRole.name] : null
              return roleInfo && (
                <div 
                  className="mt-2 p-3 rounded-xl text-sm"
                  style={{ background: 'rgba(10, 132, 255, 0.1)' }}
                >
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-white/80 mb-1">{roleInfo.description}</div>
                      <div className="text-white/50 text-xs">
                        {roleInfo.permissions.join(' • ')}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
          
          <div>
            <label className="block text-sm text-white/70 mb-1">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-white"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              <option value="active" style={{ background: '#2c2c2e' }}>Aktiv</option>
              <option value="inactive" style={{ background: '#2c2c2e' }}>Inaktiv</option>
              <option value="suspended" style={{ background: '#2c2c2e' }}>Gesperrt</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl text-white/70 hover:bg-white/10 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2 rounded-xl font-medium transition-all disabled:opacity-50"
            style={{ background: '#0a84ff', color: '#fff' }}
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}
