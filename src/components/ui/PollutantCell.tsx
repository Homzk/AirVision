import type { Pollutant } from '@/lib/airQuality'
import { cn } from '@/lib/utils'
import { POLLUTANT_LABELS, POLLUTANT_UNITS } from '@/utils/constants'

interface PollutantCellProps {
  pollutant: Pollutant
  value: number | null
}

export function PollutantCell({ pollutant, value }: PollutantCellProps) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{POLLUTANT_LABELS[pollutant]}</dt>
      <dd className={cn('text-sm font-medium', value === null && 'text-muted-foreground')}>
        {value === null ? '—' : `${value.toFixed(0)} ${POLLUTANT_UNITS[pollutant]}`}
      </dd>
    </div>
  )
}
