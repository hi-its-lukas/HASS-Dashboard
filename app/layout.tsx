import type { Metadata, Viewport } from 'next'
import './globals.css'
import { HAProvider } from '@/components/providers/ha-provider'
import { BottomNav } from '@/components/nav/bottom-nav'

export const metadata: Metadata = {
  title: 'HA Dashboard',
  description: 'Mobile-first Home Assistant Dashboard',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HA Dash',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0b0f1a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="antialiased">
        <HAProvider>
          <div className="flex min-h-screen">
            {/* Desktop Sidebar - hidden on mobile */}
            <DesktopSidebar />
            {/* Main content */}
            <main className="flex-1 pb-20 lg:pb-6 lg:pl-64">
              {children}
            </main>
          </div>
          {/* Mobile bottom nav - hidden on desktop */}
          <div className="lg:hidden">
            <BottomNav />
          </div>
        </HAProvider>
      </body>
    </html>
  )
}

function DesktopSidebar() {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-bg-secondary border-r border-gray-800">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-cyan to-accent-green flex items-center justify-center">
          <span className="text-xl">🏠</span>
        </div>
        <div>
          <h1 className="font-bold text-white">HA Dashboard</h1>
          <p className="text-xs text-text-muted">Home Assistant</p>
        </div>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-1">
        <SidebarLink href="/" icon="🏠" label="Home" />
        <SidebarLink href="/energy" icon="⚡" label="Energy" />
        <SidebarLink href="/cams" icon="📹" label="Surveillance" />
        <SidebarLink href="/calendar" icon="📅" label="Calendar" />
        <SidebarLink href="/secure" icon="🔒" label="Security" />
        <SidebarLink href="/family" icon="👨‍👩‍👧‍👦" label="Family" />
        <SidebarLink href="/more" icon="⚙️" label="More" />
      </nav>
    </aside>
  )
}

function SidebarLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:bg-bg-card hover:text-white transition-colors"
    >
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{label}</span>
    </a>
  )
}
