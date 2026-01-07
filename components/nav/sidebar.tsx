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
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Blinds,
  Phone,
  Thermometer,
  Calendar,
  Play,
  Bot,
  Sun,
  Theater
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConfigStore } from '@/lib/config/store'
import { NotificationBell } from '@/components/ui/notification-bell'

const DASHBOARD_TITLE_KEY = 'ha-dashboard-title'

function DashboardTitle() {
  const [title, setTitle] = useState('Zuhause')
  
  useEffect(() => {
    const savedTitle = localStorage.getItem(DASHBOARD_TITLE_KEY)
    if (savedTitle) {
      setTitle(savedTitle)
    }
  }, [])
  
  return (
    <div>
      <h1 className="font-semibold text-white text-lg">{title}</h1>
      <p className="text-xs text-text-muted">Home Assistant</p>
    </div>
  )
}

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/lights', icon: Lightbulb, label: 'Lichtquellen' },
  { href: '/covers', icon: Blinds, label: 'Rollos' },
  { href: '/awnings', icon: Sun, label: 'Markisen' },
  { href: '/curtains', icon: Theater, label: 'Gardinen' },
  { href: '/climate', icon: Thermometer, label: 'Klima' },
  { href: '/calendar', icon: Calendar, label: 'Kalender' },
  { href: '/cameras', icon: Video, label: 'Kameras' },
  { href: '/energy', icon: Zap, label: 'Energie' },
  { href: '/family', icon: Users, label: 'Familie' },
  { href: '/vacuum', icon: Bot, label: 'Saugroboter' },
  { href: '/more', icon: Play, label: 'Aktionen' },
]

export function Sidebar() {
  const pathname = usePathname()
  const sidebarState = useConfigStore((s) => s.sidebarState)
  const setSidebarState = useConfigStore((s) => s.setSidebarState)
  const isLoaded = useConfigStore((s) => s.isLoaded)
  const intercoms = useConfigStore((s) => s.config.intercoms)
  
  const collapsed = sidebarState === 'collapsed'
  
  useEffect(() => {
    if (!isLoaded) {
      const saved = localStorage.getItem('sidebar_collapsed')
      if (saved === 'true') {
        setSidebarState('collapsed')
      }
    }
  }, [isLoaded, setSidebarState])
  
  const toggleCollapsed = () => {
    const newState = collapsed ? 'expanded' : 'collapsed'
    setSidebarState(newState)
    localStorage.setItem('sidebar_collapsed', String(newState === 'collapsed'))
  }
  
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }
  
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 256 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0"
      style={{
        background: 'rgba(28, 28, 30, 0.8)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        overflowX: 'hidden',
        overflowY: 'hidden',
      }}
    >
      <div className="flex items-center justify-between px-4 py-5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <AnimatePresence mode="wait">
          {!collapsed ? (
            <motion.div
              key="title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center"
            >
              <DashboardTitle />
            </motion.div>
          ) : (
            <motion.div
              key="collapsed-icon"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center w-full"
            >
              <Home className="w-6 h-6 text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative',
                active 
                  ? 'text-white' 
                  : 'text-text-secondary hover:text-white'
              )}
              style={active ? { background: 'rgba(255, 255, 255, 0.12)' } : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="font-medium text-sm"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )
        })}
        
        {intercoms && intercoms.length > 0 && (
          <>
            {!collapsed && (
              <div className="pt-4 pb-2 px-3">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Intercoms</span>
              </div>
            )}
            {intercoms.map((intercom) => {
              const href = `/intercom/${intercom.slug}`
              const active = pathname === href
              return (
                <Link
                  key={intercom.id}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative',
                    active 
                      ? 'text-white' 
                      : 'text-text-secondary hover:text-white'
                  )}
                  style={active ? { background: 'rgba(255, 255, 255, 0.12)' } : undefined}
                >
                  <Phone className="w-5 h-5 flex-shrink-0" />
                  <AnimatePresence mode="wait">
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="font-medium text-sm truncate"
                      >
                        {intercom.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              )
            })}
          </>
        )}
      </nav>
      
      <div className="p-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-3 rounded-xl transition-all',
            pathname === '/settings'
              ? 'text-white'
              : 'text-text-secondary hover:text-white'
          )}
          style={pathname === '/settings' ? { background: 'rgba(255, 255, 255, 0.12)' } : undefined}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="font-medium text-sm"
              >
                Einstellungen
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        
        <button
          onClick={toggleCollapsed}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-2 rounded-xl text-text-muted hover:text-white transition-all"
          style={{ background: 'transparent' }}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Einklappen</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  )
}

export function SidebarPlaceholder({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div 
      className={cn(
        "hidden lg:block flex-shrink-0 transition-all duration-200",
        collapsed ? "w-20" : "w-64"
      )} 
    />
  )
}
