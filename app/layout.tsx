import type { Metadata, Viewport } from 'next'
import './globals.css'
import { HAProvider } from '@/components/providers/ha-provider'
import { ConfigProvider } from '@/components/providers/config-provider'

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
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
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
