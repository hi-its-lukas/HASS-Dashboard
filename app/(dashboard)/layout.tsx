'use client'

import { Sidebar } from '@/components/nav/sidebar'
import { BottomNav } from '@/components/nav/bottom-nav'
import { NotificationModal } from '@/components/ui/notification-modal'
import { useConfigStore } from '@/lib/config/store'
import { useEffect, useState } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const backgroundUrl = useConfigStore((s) => s.config.backgroundUrl)
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  return (
    <>
      <div 
        className="app-background"
        style={mounted && backgroundUrl ? {
          backgroundImage: `url(${backgroundUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        } : undefined}
      />
      <div className="flex min-h-screen relative">
        <Sidebar />
        <main className="flex-1 pb-20 lg:pb-6 lg:ml-64">
          {children}
        </main>
      </div>
      <div className="lg:hidden">
        <BottomNav />
      </div>
      <NotificationModal />
    </>
  )
}
