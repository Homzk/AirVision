import { Link, NavLink } from 'react-router-dom'

import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { to: '/', label: 'Mapa' },
  { to: '/favoritos', label: 'Favoritos' },
  { to: '/alertas', label: 'Alertas' },
] as const

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          AirVision
        </Link>
        <nav className="hidden md:flex md:items-center md:gap-1" aria-label="Secciones">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                  isActive && 'bg-muted text-foreground',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div
          className="flex items-center gap-2 text-sm"
          data-slot="auth"
          aria-label="Estado de sesión"
        />
      </div>
    </header>
  )
}
