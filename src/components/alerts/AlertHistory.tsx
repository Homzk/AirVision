import { Bell } from 'lucide-react'
import { useEffect } from 'react'

import { EmptyState } from '@/components/ui/EmptyState'
import { useAlertStore } from '@/stores/alertStore'
import { useAuthStore } from '@/stores/authStore'
import type { StationWithLatest } from '@/types/domain'
import { POLLUTANT_LABELS, POLLUTANT_UNITS } from '@/utils/constants'
import { formatRelative } from '@/utils/date'

interface AlertHistoryProps {
  stationsById: Record<number, StationWithLatest>
}

export function AlertHistory({ stationsById }: AlertHistoryProps) {
  const history = useAlertStore((s) => s.history)
  const alerts = useAlertStore((s) => s.alerts)
  const markAllSeen = useAlertStore((s) => s.markAllSeen)
  const userId = useAuthStore((s) => s.user?.id ?? null)

  useEffect(() => {
    if (userId) void markAllSeen(userId)
  }, [userId, markAllSeen])

  if (history.length === 0) {
    return (
      <EmptyState
        icon={<Bell aria-hidden className="h-8 w-8 text-muted-foreground" />}
        title="Sin disparos todavía"
        description="Cuando tus alertas se activen, aparecerán aquí los últimos 20 disparos."
      />
    )
  }

  return (
    <ul className="space-y-2">
      {history.map((entry) => {
        const alert = alerts.find((a) => a.id === entry.alert_id)
        const stationName = alert
          ? (stationsById[alert.station_id]?.name ?? `Estación ${alert.station_id}`)
          : 'Estación desconocida'
        return (
          <li key={entry.id}>
            <article className="rounded-lg border border-border bg-card p-3">
              <p className="text-sm font-medium">{stationName}</p>
              {alert && (
                <p className="text-xs text-muted-foreground">
                  {POLLUTANT_LABELS[alert.pollutant]} llegó a {entry.triggered_value.toFixed(0)}{' '}
                  {POLLUTANT_UNITS[alert.pollutant]} (umbral{' '}
                  {alert.direction === 'greater_than' ? '>' : '<'} {alert.threshold})
                </p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatRelative(entry.triggered_at)}
              </p>
            </article>
          </li>
        )
      })}
    </ul>
  )
}
