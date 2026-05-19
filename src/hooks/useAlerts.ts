import { useCallback, useEffect } from 'react'

import { MAX_ALERTS, useAlertStore, type CreateAlertInput } from '@/stores/alertStore'
import { useAuthStore } from '@/stores/authStore'

interface UseAlertsResult {
  alerts: ReturnType<typeof useAlertStore.getState>['alerts']
  isLoading: boolean
  error: Error | null
  canCreateMore: boolean
  createAlert: (input: CreateAlertInput) => Promise<{ error: string | null }>
  deleteAlert: (id: string) => Promise<{ error: string | null }>
}

export function useAlerts(): UseAlertsResult {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const status = useAuthStore((s) => s.status)
  const alerts = useAlertStore((s) => s.alerts)
  const isLoading = useAlertStore((s) => s.isLoading)
  const error = useAlertStore((s) => s.error)
  const loadAll = useAlertStore((s) => s.loadAll)
  const reset = useAlertStore((s) => s.reset)
  const createInStore = useAlertStore((s) => s.createAlert)
  const deleteInStore = useAlertStore((s) => s.deleteAlert)

  useEffect(() => {
    if (status === 'authenticated' && userId) {
      void loadAll(userId)
    } else if (status === 'anonymous') {
      reset()
    }
  }, [status, userId, loadAll, reset])

  const createAlert = useCallback(
    async (input: CreateAlertInput) => {
      if (!userId) return { error: 'Debes iniciar sesión.' }
      return createInStore(userId, input)
    },
    [userId, createInStore],
  )

  return {
    alerts,
    isLoading,
    error,
    canCreateMore: alerts.length < MAX_ALERTS,
    createAlert,
    deleteAlert: deleteInStore,
  }
}
