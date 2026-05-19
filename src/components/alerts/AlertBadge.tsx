import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAlertStore } from '@/stores/alertStore'
import { useAuthStore } from '@/stores/authStore'

export function AlertBadge() {
  const status = useAuthStore((s) => s.status)
  const unseenCount = useAlertStore((s) => s.unseenCount)

  if (status !== 'authenticated' || unseenCount === 0) return null

  const label = `${unseenCount} ${unseenCount === 1 ? 'alerta nueva' : 'alertas nuevas'}`

  return (
    <Link
      to="/alertas"
      aria-label={label}
      className="relative grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Bell aria-hidden className="h-4 w-4" />
      <span
        aria-hidden
        className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-orange-600 px-1 text-[10px] font-medium leading-none text-white"
      >
        {unseenCount}
      </span>
    </Link>
  )
}
