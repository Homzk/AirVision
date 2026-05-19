import { FavoriteButton } from '@/components/favorites/FavoriteButton'
import { PollutantCell } from '@/components/ui/PollutantCell'
import { computeWorstLevel, levelToColor, levelToLabel, POLLUTANTS } from '@/lib/airQuality'
import type { StationWithLatest } from '@/types/domain'
import { formatReadingTime } from '@/utils/date'

interface StationPopupProps {
  station: StationWithLatest
  onOpenTrends?: (id: number) => void
}

export function StationPopup({ station, onOpenTrends }: StationPopupProps) {
  const { latest } = station
  const level = latest ? computeWorstLevel(latest) : 'no_data'
  const color = levelToColor(level)

  return (
    <div className="min-w-[220px] space-y-2 text-sm">
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold leading-tight">{station.name}</p>
          {station.city && <p className="text-xs text-muted-foreground">{station.city}</p>}
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium text-white"
          style={{ backgroundColor: color }}
        >
          {levelToLabel(level)}
        </span>
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
        <p className="text-xs text-muted-foreground">Sin datos recientes</p>
      )}

      <div className="flex items-center gap-2">
        <FavoriteButton stationId={station.id} />
        {onOpenTrends && (
          <button
            type="button"
            onClick={() => onOpenTrends(station.id)}
            className="flex-1 rounded-md bg-foreground/90 px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-foreground"
          >
            Ver tendencias
          </button>
        )}
      </div>
    </div>
  )
}
