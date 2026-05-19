import {
  computeWorstLevel,
  levelToColor,
  levelToLabel,
  POLLUTANTS,
  type Pollutant,
} from '@/lib/airQuality'
import { cn } from '@/lib/utils'
import type { StationWithLatest } from '@/types/domain'
import { POLLUTANT_LABELS, POLLUTANT_UNITS } from '@/utils/constants'
import { formatReadingTime } from '@/utils/date'

interface StationPopupProps {
  station: StationWithLatest
  onOpenTrends?: (id: number) => void
}

function PollutantCell({ pollutant, value }: { pollutant: Pollutant; value: number | null }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{POLLUTANT_LABELS[pollutant]}</dt>
      <dd className={cn('text-sm font-medium', value === null && 'text-muted-foreground')}>
        {value === null ? '—' : `${value.toFixed(0)} ${POLLUTANT_UNITS[pollutant]}`}
      </dd>
    </div>
  )
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

      {onOpenTrends && (
        <button
          type="button"
          onClick={() => onOpenTrends(station.id)}
          className="w-full rounded-md bg-foreground/90 px-3 py-1.5 text-xs font-medium text-background transition-colors hover:bg-foreground"
        >
          Ver tendencias
        </button>
      )}
    </div>
  )
}
