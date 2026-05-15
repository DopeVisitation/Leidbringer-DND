import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNav } from '@/components/layout/MobileNav'
import { MobileHeader } from '@/components/layout/MobileHeader'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 pb-20 md:pb-0 overflow-x-hidden">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  )
}
