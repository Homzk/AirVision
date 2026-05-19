import { useEffect, useRef } from 'react'
import { Route, Routes } from 'react-router-dom'
import { toast } from 'sonner'

import { AppShell } from '@/components/layout/AppShell'
import { useAlertHistory } from '@/hooks/useAlertHistory'
import { useAuth } from '@/hooks/useAuth'
import { useAlertStore } from '@/stores/alertStore'
import { useAuthStore } from '@/stores/authStore'
import AlertsPage from '@/pages/AlertsPage'
import FavoritesPage from '@/pages/FavoritesPage'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'

export default function App() {
  useAuth()
  useAlertHistory()
  useAlertSummaryToast()
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/favoritos" element={<FavoritesPage />} />
        <Route path="/alertas" element={<AlertsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
      </Route>
    </Routes>
  )
}

/**
 * Emite UN toast resumen al inicio de sesión con la cantidad de alertas
 * sin ver. Idempotente por `userId` para que recargar la app no spamee.
 */
function useAlertSummaryToast() {
  const status = useAuthStore((s) => s.status)
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const loadedForUserId = useAlertStore((s) => s.loadedForUserId)
  const unseenCount = useAlertStore((s) => s.unseenCount)
  const notifiedRef = useRef<string | null>(null)

  useEffect(() => {
    if (status !== 'authenticated' || !userId) {
      notifiedRef.current = null
      return
    }
    if (loadedForUserId !== userId) return
    if (notifiedRef.current === userId) return
    notifiedRef.current = userId
    if (unseenCount > 0) {
      toast.info(`Tienes ${unseenCount} ${unseenCount === 1 ? 'alerta nueva' : 'alertas nuevas'}`)
    }
  }, [status, userId, loadedForUserId, unseenCount])
}
