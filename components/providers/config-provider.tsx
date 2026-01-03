'use client'

import { useEffect } from 'react'
import { useConfigStore } from '@/lib/config/store'

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const loadConfig = useConfigStore((s) => s.loadConfig)
  const isLoaded = useConfigStore((s) => s.isLoaded)

  useEffect(() => {
    if (!isLoaded) {
      loadConfig()
    }
  }, [loadConfig, isLoaded])

  return <>{children}</>
}
