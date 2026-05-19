import { Bell, Map as MapIcon, Star } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/utils'

const ITEMS = [
  { to: '/', label: 'Mapa', icon: MapIcon },
  { to: '/favoritos', label: 'Favoritos', icon: Star },
  { to: '/alertas', label: 'Alertas', icon: Bell },
] as const

export function MobileNav() {
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-30 flex h-16 border-t border-border bg-background md:hidden"
    >
      {ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground transition-colors',
              isActive && 'text-foreground',
            )
          }
        >
          <Icon aria-hidden className="h-5 w-5" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
