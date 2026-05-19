import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase'
import { POLLUTANT_LABELS, POLLUTANT_UNITS } from '@/utils/constants'
import { useAlertStore, type AlertHistoryRow } from '@/stores/alertStore'
import { useAuthStore } from '@/stores/authStore'
import { useDashboardStore } from '@/stores/dashboardStore'

/**
 * Mantiene viva la suscripción Realtime al canal `alert_history:user:${userId}`
 * y dispara `toast.info` por cada nuevo disparo. Debe llamarse UNA sola vez
 * en `App` — suscribir desde otros lugares crearía canales duplicados.
 *
 * También dispara el load inicial cuando el usuario se autentica (deduplicado
 * dentro del store) y resetea al cerrar sesión.
 */
export function useAlertHistory() {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const status = useAuthStore((s) => s.status)
  const loadAll = useAlertStore((s) => s.loadAll)
  const reset = useAlertStore((s) => s.reset)
  const applyTriggerInsert = useAlertStore((s) => s.applyTriggerInsert)
  const callbackRef = useRef(applyTriggerInsert)
  callbackRef.current = applyTriggerInsert

  useEffect(() => {
    if (status === 'anonymous') {
      reset()
      return
    }
    if (status !== 'authenticated' || !userId) return

    void loadAll(userId)

    const channel = supabase
      .channel(`alert_history:user:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alert_history',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as AlertHistoryRow
          callbackRef.current(row)

          const state = useAlertStore.getState()
          const alert = state.alerts.find((a) => a.id === row.alert_id)
          if (alert) {
            const station = useDashboardStore.getState().stationsById[alert.station_id]
            const stationName = station?.name ?? `Estación ${alert.station_id}`
            const pollutantLabel = POLLUTANT_LABELS[alert.pollutant]
            const unit = POLLUTANT_UNITS[alert.pollutant]
            toast.info(
              `${stationName}: ${pollutantLabel} llegó a ${row.triggered_value.toFixed(0)} ${unit}`,
            )
          } else {
            toast.info(`Una alerta se disparó (valor ${row.triggered_value.toFixed(0)})`)
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [status, userId, loadAll, reset])
}
