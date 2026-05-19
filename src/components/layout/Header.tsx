import { Wind } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

const NAV_LINKS = [
  { to: '/', label: 'Mapa' },
  { to: '/favoritos', label: 'Favoritos' },
  { to: '/alertas', label: 'Alertas' },
] as const

export function Header() {
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link to="/" className="group flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-orange-600/10 ring-1 ring-orange-600/20 transition-colors group-hover:bg-orange-600/15">
            <Wind aria-hidden className="h-4 w-4 text-orange-600" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            Air<span className="text-orange-600">Vision</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <nav className="hidden md:flex md:items-center md:gap-1" aria-label="Secciones">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                    isActive && 'bg-orange-600/10 text-orange-700 hover:text-orange-700',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 text-sm" aria-label="Estado de sesión">
            {status === 'authenticated' && user && (
              <>
                <span
                  className="hidden text-muted-foreground sm:inline-block"
                  title={user.email ?? ''}
                >
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Cerrar sesión
                </button>
              </>
            )}
            {status === 'anonymous' && (
              <>
                <Link
                  to="/login"
                  className="hidden rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
                >
                  Iniciar sesión
                </Link>
                <Link
                  to="/registro"
                  className="rounded-md bg-orange-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-700"
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
