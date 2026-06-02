import { useMemo } from 'react'

import { applyFilters } from '@/lib/stationFilters'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useFiltersStore } from '@/stores/filtersStore'

/**
 * Shows how many stations are visible out of the total, and an empty-state
 * message when the active filters leave nothing. Uses the same `applyFilters`
 * as the map so the count and the markers can never drift apart.
 */
export function StationCounter() {
  const stationsById = useDashboardStore((s) => s.stationsById)
  const searchTerm = useFiltersStore((s) => s.searchTerm)
  const showNoData = useFiltersStore((s) => s.showNoData)
  const selectedLevels = useFiltersStore((s) => s.selectedLevels)
  const nearMe = useFiltersStore((s) => s.nearMe)

  const { shownCount, total } = useMemo(
    () =>
      applyFilters(Object.values(stationsById), {
        searchTerm,
        showNoData,
        selectedLevels,
        nearMe,
      }),
    [stationsById, searchTerm, showNoData, selectedLevels, nearMe],
  )

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-md border border-border bg-background/95 px-3 py-1.5 text-xs text-foreground shadow-md backdrop-blur"
    >
      {shownCount === 0 ? (
        <span>Ninguna estación coincide con los filtros.</span>
      ) : (
        <span>
          Mostrando <strong>{shownCount}</strong> de {total} estaciones
        </span>
      )}
    </div>
  )
}
