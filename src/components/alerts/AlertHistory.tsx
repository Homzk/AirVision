import { Bell, Check } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

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
  const unseenCount = useAlertStore((s) => s.unseenCount)
  const markAllSeen = useAlertStore((s) => s.markAllSeen)
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const [isMarking, setMarking] = useState(false)

  async function handleMarkAllSeen() {
    if (!userId) return
    setMarking(true)
    const result = await markAllSeen(userId)
    setMarking(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Marcadas como leídas.')
  }

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
    <div className="space-y-3">
      {unseenCount > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void handleMarkAllSeen()}
            disabled={isMarking}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-orange-600 transition-colors hover:bg-orange-600/5 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check aria-hidden className="h-3.5 w-3.5" />
            {isMarking ? 'Marcando…' : 'Marcar todas como leídas'}
          </button>
        </div>
      )}

      <ul className="space-y-2">
        {history.map((entry) => {
          const alert = alerts.find((a) => a.id === entry.alert_id)
          const stationName = alert
            ? (stationsById[alert.station_id]?.name ?? `Estación ${alert.station_id}`)
            : 'Estación desconocida'
          return (
            <li key={entry.id}>
              <article className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{stationName}</p>
                  {!entry.seen && (
                    <span
                      className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-orange-600"
                      aria-label="No leída"
                    />
                  )}
                </div>
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
    </div>
  )
}
