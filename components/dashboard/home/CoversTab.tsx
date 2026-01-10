'use client'

import { useState, useMemo } from 'react'
import { Blinds, ChevronUp, ChevronDown, ChevronRight, Square } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useHAStore } from '@/lib/ha'
import { useConfig } from '@/lib/config/store'
import { cn } from '@/lib/utils'
import EmptyState from './EmptyState'

export default function CoversTab() {
  const config = useConfig()
  const states = useHAStore((s) => s.states)
  const callService = useHAStore((s) => s.callService)
  const getEntityArea = useHAStore((s) => s.getEntityArea)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [collapsedRooms, setCollapsedRooms] = useState<Record<string, boolean>>({})
  
  const roomCovers = (config.rooms || []).flatMap((r) => r.entityIds || []).filter((id) => id.startsWith('cover.'))
  const configuredCovers = (config.covers || []).map((c) => typeof c === 'string' ? c : c.entityId).filter(Boolean)
  const uniqueCovers = [...new Set([...roomCovers, ...configuredCovers])]
  
  const roomGroups = useMemo(() => {
    const groups: Record<string, string[]> = {}
    uniqueCovers.forEach((entityId) => {
      const areaName = getEntityArea(entityId) || 'Sonstige'
      if (!groups[areaName]) groups[areaName] = []
      groups[areaName].push(entityId)
    })
    return Object.entries(groups)
      .map(([name, covers]) => ({ id: name, name, covers }))
      .sort((a, b) => a.name === 'Sonstige' ? 1 : b.name === 'Sonstige' ? -1 : a.name.localeCompare(b.name, 'de'))
  }, [uniqueCovers, getEntityArea])
  
  const handleAction = async (entityId: string, action: 'open' | 'close' | 'stop') => {
    setActiveAction(`${entityId}_${action}`)
    try { await callService('cover', `${action}_cover`, entityId) } finally { setActiveAction(null) }
  }
  
  const handleAllAction = async (action: 'open' | 'close') => {
    setActiveAction(`all_${action}`)
    try { for (const id of uniqueCovers) await callService('cover', `${action}_cover`, id) } finally { setActiveAction(null) }
  }

  if (uniqueCovers.length === 0) return <EmptyState icon={Blinds} label="Keine Rollos konfiguriert" />

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <button onClick={() => handleAllAction('open')} disabled={activeAction?.startsWith('all')} className="flex items-center gap-2 px-3 py-2 bg-accent-green/20 hover:bg-accent-green/30 text-accent-green rounded-xl disabled:opacity-50">
          <ChevronUp className="w-4 h-4" /> Alle auf
        </button>
        <button onClick={() => handleAllAction('close')} disabled={activeAction?.startsWith('all')} className="flex items-center gap-2 px-3 py-2 bg-accent-orange/20 hover:bg-accent-orange/30 text-accent-orange rounded-xl disabled:opacity-50">
          <ChevronDown className="w-4 h-4" /> Alle zu
        </button>
      </div>
      
      {roomGroups.map((room) => (
        <section key={room.id}>
          <button onClick={() => setCollapsedRooms(prev => ({ ...prev, [room.name]: !prev[room.name] }))} className="flex items-center gap-2 text-white hover:text-accent-purple transition-colors mb-3">
            {collapsedRooms[room.name] ? <ChevronRight className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            <h2 className="text-lg font-semibold">{room.name}</h2>
            <span className="text-sm text-text-muted">({room.covers.length})</span>
          </button>
          
          {!collapsedRooms[room.name] && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {room.covers.map((entityId) => {
                const state = states[entityId]
                const position = state?.attributes?.current_position as number | undefined
                const friendlyName = (state?.attributes?.friendly_name as string) || entityId.split('.')[1].replace(/_/g, ' ')
                const isOpen = state?.state === 'open'
                const isClosed = state?.state === 'closed'
                
                return (
                  <Card key={entityId} className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <Blinds className={cn('w-6 h-6', isOpen ? 'text-accent-green' : isClosed ? 'text-accent-orange' : 'text-accent-purple')} />
                      <div>
                        <p className="text-sm font-medium text-white capitalize">{friendlyName}</p>
                        <p className="text-xs text-text-muted">{position !== undefined ? `${position}%` : state?.state || 'Unbekannt'}</p>
                      </div>
                    </div>
                    {position !== undefined && (
                      <div className="h-2 bg-bg-secondary rounded-full overflow-hidden mb-4">
                        <div className="h-full bg-accent-purple transition-all" style={{ width: `${position}%` }} />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(entityId, 'open')} className="flex-1 flex items-center justify-center gap-1 py-2 bg-accent-green/20 hover:bg-accent-green/30 text-accent-green rounded-lg">
                        <ChevronUp className="w-4 h-4" /> Auf
                      </button>
                      <button onClick={() => handleAction(entityId, 'stop')} className="flex-1 flex items-center justify-center gap-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg">
                        <Square className="w-3 h-3" /> Stop
                      </button>
                      <button onClick={() => handleAction(entityId, 'close')} className="flex-1 flex items-center justify-center gap-1 py-2 bg-accent-orange/20 hover:bg-accent-orange/30 text-accent-orange rounded-lg">
                        <ChevronDown className="w-4 h-4" /> Zu
                      </button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
