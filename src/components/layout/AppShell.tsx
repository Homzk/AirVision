import { Outlet } from 'react-router-dom'

import { Header } from '@/components/layout/Header'
import { MobileNav } from '@/components/layout/MobileNav'

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 pb-16 md:pb-0">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  )
}
