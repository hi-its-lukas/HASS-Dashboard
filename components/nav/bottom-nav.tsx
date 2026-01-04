'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Video, Lightbulb, Menu } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/lights', icon: Lightbulb, label: 'Lichter' },
  { href: '/cameras', icon: Video, label: 'Kameras' },
  { href: '/more', icon: Menu, label: 'Mehr' },
]

export function BottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 safe-bottom"
      style={{
        background: 'rgba(28, 28, 30, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 px-4">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = isActive(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all',
                active ? 'text-white' : 'text-text-muted'
              )}
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="relative"
              >
                <Icon 
                  className={cn('w-6 h-6', active && 'text-accent-cyan')} 
                  strokeWidth={active ? 2.5 : 2} 
                />
              </motion.div>
              <span className={cn(
                'text-[10px] font-medium',
                active && 'text-accent-cyan'
              )}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
