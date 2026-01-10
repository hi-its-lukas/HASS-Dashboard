'use client'

import { Settings, LucideIcon } from 'lucide-react'
import Link from 'next/link'

interface EmptyStateProps {
  icon: LucideIcon
  label: string
}

export default function EmptyState({ icon: Icon, label }: EmptyStateProps) {
  return (
    <div className="text-center py-12">
      <Icon className="w-12 h-12 text-white/30 mx-auto mb-4" />
      <p className="text-white/50 mb-4">{label}</p>
      <Link href="/settings" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors">
        <Settings className="w-4 h-4" />
        Einstellungen
      </Link>
    </div>
  )
}
