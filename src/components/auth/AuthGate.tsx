import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { LoadingState } from '@/components/ui/LoadingState'
import { useAuthStore } from '@/stores/authStore'

interface AuthGateProps {
  children: ReactNode
}

/**
 * Renderiza `children` solo si hay sesión. Si el estado aún está cargando,
 * muestra un spinner. Si es anónimo, redirige a `/login`.
 */
export function AuthGate({ children }: AuthGateProps) {
  const status = useAuthStore((s) => s.status)
  if (status === 'loading') return <LoadingState message="Verificando sesión…" />
  if (status === 'anonymous') return <Navigate to="/login" replace />
  return <>{children}</>
}
