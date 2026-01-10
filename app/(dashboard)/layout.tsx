'use client'

import { Sidebar } from '@/components/nav/sidebar'
import { MobileNav } from '@/components/nav/mobile-nav'
import { NotificationModal } from '@/components/ui/notification-modal'
import { NotificationCenter } from '@/components/ui/notification-center'
import { NotificationBell } from '@/components/ui/notification-bell'
import { ToastContainer } from '@/components/ui/toast-container'
import { useConfigStore } from '@/lib/config/store'
import { usePushListener } from '@/lib/push/use-push-listener'
import { useEffect, useState } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const backgroundUrl = useConfigStore((s) => s.config.backgroundUrl)
  const sidebarState = useConfigStore((s) => s.sidebarState)
  const [mounted, setMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  
  usePushListener()
  
  useEffect(() => {
    setMounted(true)
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024)
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])
  
  const sidebarWidth = sidebarState === 'collapsed' ? 80 : 256
  
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
      <div className="flex min-h-screen relative overflow-x-hidden">
        <Sidebar />
        <main 
          className="flex-1 pb-6 transition-[padding] duration-200 w-full box-border"
          style={{ paddingLeft: mounted && isDesktop ? sidebarWidth : 0 }}
        >
          {children}
        </main>
      </div>
      <MobileNav />
      <NotificationModal />
      <NotificationCenter />
      <ToastContainer />
      <div className="fixed bottom-20 right-4 z-30 lg:bottom-4">
        <NotificationBell />
      </div>
    </>
  )
}
