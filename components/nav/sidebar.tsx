'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Home, 
  Zap, 
  Video, 
  Calendar, 
  Shield, 
  Users, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  Lightbulb,
  Blinds
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConfigStore } from '@/lib/config/store'

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/lights', icon: Lightbulb, label: 'Lights' },
  { href: '/covers', icon: Blinds, label: 'Covers' },
  { href: '/cameras', icon: Video, label: 'Cameras' },
  { href: '/calendar', icon: Calendar, label: 'Calendar' },
  { href: '/energy', icon: Zap, label: 'Energy' },
  { href: '/surveillance', icon: Shield, label: 'Surveillance' },
  { href: '/family', icon: Users, label: 'Family' },
  { href: '/more', icon: Menu, label: 'More' },
]

export function Sidebar() {
  const pathname = usePathname()
  const sidebarState = useConfigStore((s) => s.sidebarState)
  const setSidebarState = useConfigStore((s) => s.setSidebarState)
  const isLoaded = useConfigStore((s) => s.isLoaded)
  
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
      className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 bg-[#0d1321] border-r border-gray-800/50"
    >
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-800/50">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-sm">HA Dashboard</h1>
                <p className="text-xs text-gray-500">Home Assistant</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {collapsed && (
          <div className="w-full flex justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center">
              <Home className="w-5 h-5 text-white" />
            </div>
          </div>
        )}
      </div>
      
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl transition-all group relative',
                active 
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon className={cn('w-5 h-5 flex-shrink-0', active && 'text-emerald-400')} />
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
              
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  {label}
                </div>
              )}
              
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 w-1 h-8 bg-emerald-400 rounded-r-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          )
        })}
      </nav>
      
      <div className="border-t border-gray-800/50 p-3">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-3 py-3 rounded-xl transition-all',
            pathname === '/settings'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'text-gray-400 hover:bg-white/5 hover:text-white'
          )}
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
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        
        <button
          onClick={toggleCollapsed}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 mt-2 rounded-xl text-gray-500 hover:bg-white/5 hover:text-white transition-all"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Collapse</span>
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
