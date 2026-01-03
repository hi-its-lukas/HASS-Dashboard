'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Video, Calendar, Shield, Menu } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', icon: Home, label: 'HOME' },
  { href: '/surveillance', icon: Video, label: 'CAMS' },
  { href: '/calendar', icon: Calendar, label: 'CALENDAR' },
  { href: '/secure', icon: Shield, label: 'SECURE' },
  { href: '/more', icon: Menu, label: 'MORE' },
]

export function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-primary/90 backdrop-blur-lg border-t border-gray-800/50 safe-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-4">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all',
                active ? 'nav-active' : 'text-text-muted hover:text-text-secondary'
              )}
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="relative"
              >
                <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 2} />
                {active && (
                  <motion.div
                    layoutId="nav-glow"
                    className="absolute -inset-2 bg-accent-cyan/20 rounded-full blur-md -z-10"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.div>
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
