import type { Metadata, Viewport } from 'next'
import './globals.css'
import { HAProvider } from '@/components/providers/ha-provider'
import { ConfigProvider } from '@/components/providers/config-provider'

export const metadata: Metadata = {
  title: 'HA Dashboard',
  description: 'Mobile-first Home Assistant Dashboard',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/icon-192.png',
  },
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
      <body className="antialiased">
        <ConfigProvider>
          <HAProvider>
            {children}
          </HAProvider>
        </ConfigProvider>
      </body>
    </html>
  )
}
