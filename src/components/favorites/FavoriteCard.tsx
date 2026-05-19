import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { PollutantCell } from '@/components/ui/PollutantCell'
import { useFavorites } from '@/hooks/useFavorites'
import { computeWorstLevel, levelToColor, levelToLabel, POLLUTANTS } from '@/lib/airQuality'
import { useDashboardStore } from '@/stores/dashboardStore'
import type { StationWithLatest } from '@/types/domain'
import { formatReadingTime } from '@/utils/date'

interface FavoriteCardProps {
  station: StationWithLatest
}

export function FavoriteCard({ station }: FavoriteCardProps) {
  const navigate = useNavigate()
  const setSelectedStationId = useDashboardStore((s) => s.setSelectedStationId)
  const { remove } = useFavorites()
  const [isRemoving, setRemoving] = useState(false)

  const { latest } = station
  const level = latest ? computeWorstLevel(latest) : 'no_data'

  async function handleRemove() {
    setRemoving(true)
    const result = await remove(station.id)
    setRemoving(false)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('Eliminada de favoritos.')
  }

  function handleOpenTrends() {
    setSelectedStationId(station.id)
    navigate('/')
  }

  return (
    <article className="space-y-3 rounded-lg border border-border bg-card p-4">
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span
            className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: levelToColor(level) }}
            aria-hidden
          />
          <div>
            <h3 className="font-medium leading-tight">{station.name}</h3>
            {station.city && <p className="text-xs text-muted-foreground">{station.city}</p>}
            <p className="mt-0.5 text-xs text-muted-foreground">{levelToLabel(level)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          disabled={isRemoving}
          aria-label="Quitar de favoritos"
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 aria-hidden className="h-4 w-4" />
        </button>
      </header>

      {latest ? (
        <>
          <dl className="grid grid-cols-3 gap-2">
            {POLLUTANTS.map((p) => (
              <PollutantCell key={p} pollutant={p} value={latest[p]} />
            ))}
          </dl>
          <p className="text-xs text-muted-foreground">
            Última lectura: {formatReadingTime(latest.measured_at)}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Sin datos recientes</p>
      )}

      <button
        type="button"
        onClick={handleOpenTrends}
        className="w-full rounded-md border border-input px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
      >
        Ver tendencias
      </button>
    </article>
  )
}
