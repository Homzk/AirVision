import { cn } from '@/lib/utils'
import { useDashboardStore } from '@/stores/dashboardStore'
import { TIME_RANGE_LABELS, TIME_RANGES } from '@/utils/constants'

export function RangeSelector() {
  const range = useDashboardStore((s) => s.range)
  const setRange = useDashboardStore((s) => s.setRange)

  return (
    <div
      role="group"
      aria-label="Rango temporal"
      className="inline-flex rounded-full border border-border bg-muted/40 p-0.5"
    >
      {TIME_RANGES.map((r) => {
        const isActive = r === range
        return (
          <button
            key={r}
            type="button"
            aria-pressed={isActive}
            onClick={() => setRange(r)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {TIME_RANGE_LABELS[r]}
          </button>
        )
      })}
    </div>
  )
}
