import { Sidebar } from '@/components/nav/sidebar'
import { BottomNav } from '@/components/nav/bottom-nav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 pb-20 lg:pb-6 lg:ml-64">
          {children}
        </main>
      </div>
      <div className="lg:hidden">
        <BottomNav />
      </div>
    </>
  )
}
