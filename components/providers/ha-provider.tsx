'use client'

import { useEffect } from 'react'
import { useHAStore } from '@/lib/ha'

export function HAProvider({ children }: { children: React.ReactNode }) {
  const connect = useHAStore((s) => s.connect)

  useEffect(() => {
    connect()
  }, [connect])

  return <>{children}</>
}
