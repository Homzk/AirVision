import { X } from 'lucide-react'
import { useEffect } from 'react'

import { computeWorstLevel, levelToColor, levelToLabel } from '@/lib/airQuality'
import { useDashboardStore } from '@/stores/dashboardStore'

import { ChartPanel } from './ChartPanel'

export function StationPanel() {
  const selectedStationId = useDashboardStore((s) => s.selectedStationId)
  const station = useDashboardStore((s) => {
    if (s.selectedStationId === null) return null
    return s.stationsById[s.selectedStationId] ?? null
  })
  const close = useDashboardStore((s) => s.setSelectedStationId)

  useEffect(() => {
    if (selectedStationId === null) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedStationId, close])

  if (selectedStationId === null || !station) return null

  const level = station.latest ? computeWorstLevel(station.latest) : 'no_data'

  return (
    <>
      <div
        className="fixed inset-0 z-[1010] bg-black/40 md:hidden"
        onClick={() => close(null)}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Tendencias de ${station.name}`}
        className="fixed inset-x-0 bottom-0 z-[1020] max-h-[85vh] overflow-y-auto rounded-t-xl border-t border-border bg-background p-4 shadow-xl md:inset-y-0 md:left-auto md:right-0 md:h-full md:max-h-none md:w-[420px] md:rounded-none md:border-l md:border-t-0"
      >
        <header className="mb-4 flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span
              className="mt-1 inline-block h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: levelToColor(level) }}
              aria-hidden
            />
            <div>
              <h2 className="text-lg font-semibold leading-tight">{station.name}</h2>
              {station.city && <p className="text-xs text-muted-foreground">{station.city}</p>}
              <p className="mt-0.5 text-xs text-muted-foreground">{levelToLabel(level)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => close(null)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Cerrar panel"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </header>
        <ChartPanel stationId={station.id} />
      </aside>
    </>
  )
}
