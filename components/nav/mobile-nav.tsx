'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Home, 
  Zap, 
  Video, 
  Users, 
  Settings,
  Menu,
  X,
  Lightbulb,
  Blinds,
  Phone,
  Thermometer,
  Calendar,
  Play,
  DoorOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConfigStore } from '@/lib/config/store'
import { useHAStore } from '@/lib/ha'

const DASHBOARD_TITLE_KEY = 'ha-dashboard-title'

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/lights', icon: Lightbulb, label: 'Lichtquellen' },
  { href: '/covers', icon: Blinds, label: 'Rollos' },
  { href: '/locks', icon: DoorOpen, label: 'Türschlösser' },
  { href: '/climate', icon: Thermometer, label: 'Klima' },
  { href: '/calendar', icon: Calendar, label: 'Kalender' },
  { href: '/cameras', icon: Video, label: 'Kameras' },
  { href: '/energy', icon: Zap, label: 'Energie' },
  { href: '/family', icon: Users, label: 'Familie' },
  { href: '/more', icon: Play, label: 'Aktionen' },
]

export function MobileNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('Zuhause')
  const intercoms = useConfigStore((s) => s.config.intercoms)
  const connectionMode = useHAStore((s) => s.connectionMode)
  const connected = useHAStore((s) => s.connected)
  
  useEffect(() => {
    const savedTitle = localStorage.getItem(DASHBOARD_TITLE_KEY)
    if (savedTitle) {
      setTitle(savedTitle)
    }
  }, [])
  
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])
  
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }
  
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-6 left-4 z-40 p-2 rounded-xl shadow-lg"
        style={{
          background: 'rgba(28, 28, 30, 0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
        aria-label="Menü öffnen"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed inset-0 z-50 bg-black/60"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col"
              style={{
                background: 'rgba(28, 28, 30, 0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div className="flex items-center justify-between px-4 py-5" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div>
                  <h1 className="font-semibold text-white text-lg">{title}</h1>
                  <p className="text-xs text-text-muted">Home Assistant</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl text-text-muted hover:text-white transition-colors"
                  aria-label="Menü schließen"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map(({ href, icon: Icon, label }) => {
                  const active = isActive(href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                        active 
                          ? 'text-white' 
                          : 'text-text-secondary hover:text-white'
                      )}
                      style={active ? { background: 'rgba(255, 255, 255, 0.12)' } : undefined}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{label}</span>
                    </Link>
                  )
                })}
                
                {intercoms && intercoms.length > 0 && (
                  <>
                    <div className="pt-4 pb-2 px-4">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Intercoms</span>
                    </div>
                    {intercoms.map((intercom) => {
                      const href = `/intercom/${intercom.slug}`
                      const active = pathname === href
                      return (
                        <Link
                          key={intercom.id}
                          href={href}
                          className={cn(
                            'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                            active 
                              ? 'text-white' 
                              : 'text-text-secondary hover:text-white'
                          )}
                          style={active ? { background: 'rgba(255, 255, 255, 0.12)' } : undefined}
                        >
                          <Phone className="w-5 h-5 flex-shrink-0" />
                          <span className="font-medium truncate">{intercom.name}</span>
                        </Link>
                      )
                    })}
                  </>
                )}
              </nav>
              
              <div className="p-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                {connected && (
                  <div className={cn(
                    'flex items-center gap-2 px-4 py-2 mb-2 rounded-lg text-xs',
                    connectionMode === 'websocket' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                  )}>
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      connectionMode === 'websocket' ? 'bg-green-400' : 'bg-amber-400 animate-pulse'
                    )} />
                    <span>
                      {connectionMode === 'websocket' ? 'WebSocket' : 'Polling (Backup)'}
                    </span>
                  </div>
                )}
                
                <Link
                  href="/settings"
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                    pathname === '/settings'
                      ? 'text-white'
                      : 'text-text-secondary hover:text-white'
                  )}
                  style={pathname === '/settings' ? { background: 'rgba(255, 255, 255, 0.12)' } : undefined}
                >
                  <Settings className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">Einstellungen</span>
                </Link>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
