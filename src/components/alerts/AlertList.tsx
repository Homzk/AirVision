import { Bell, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/ui/EmptyState'
import { useAlerts } from '@/hooks/useAlerts'
import type { StationWithLatest } from '@/types/domain'
import { POLLUTANT_LABELS, POLLUTANT_UNITS } from '@/utils/constants'

interface AlertListProps {
  stationsById: Record<number, StationWithLatest>
}

export function AlertList({ stationsById }: AlertListProps) {
  const { alerts, deleteAlert } = useAlerts()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={<Bell aria-hidden className="h-8 w-8 text-muted-foreground" />}
        title="Aún no tienes alertas"
        description='Toca "Nueva alerta" para crear tu primera regla.'
      />
    )
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const result = await deleteAlert(id)
    setDeletingId(null)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Alerta eliminada.')
  }

  return (
    <ul className="space-y-2">
      {alerts.map((alert) => {
        const station = stationsById[alert.station_id]
        const stationName = station?.name ?? `Estación ${alert.station_id}`
        const symbol = alert.direction === 'greater_than' ? '>' : '<'
        return (
          <li key={alert.id}>
            <article className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
              <div>
                <p className="text-sm font-medium">
                  {POLLUTANT_LABELS[alert.pollutant]} {symbol} {alert.threshold}{' '}
                  {POLLUTANT_UNITS[alert.pollutant]}
                </p>
                <p className="text-xs text-muted-foreground">{stationName}</p>
                <p className="mt-0.5 text-xs">
                  <span className={alert.is_armed ? 'text-emerald-600' : 'text-muted-foreground'}>
                    {alert.is_armed ? 'Armada' : 'Esperando re-arme'}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(alert.id)}
                disabled={deletingId === alert.id}
                aria-label="Eliminar alerta"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 aria-hidden className="h-4 w-4" />
              </button>
            </article>
          </li>
        )
      })}
    </ul>
  )
}
