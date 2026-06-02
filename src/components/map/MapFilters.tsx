import { useFiltersStore } from '@/stores/filtersStore'

/**
 * Overlay control panel for the map's discovery filters. For now it exposes the
 * "show stations without recent data" toggle; level chips (US3) and the
 * "near me" action (US5) are added to this same panel later.
 */
export function MapFilters() {
  const showNoData = useFiltersStore((s) => s.showNoData)
  const setShowNoData = useFiltersStore((s) => s.setShowNoData)

  return (
    <div
      role="region"
      aria-label="Filtros del mapa"
      className="rounded-md border border-border bg-background/95 p-3 text-sm shadow-md backdrop-blur"
    >
      <label className="flex cursor-pointer items-center gap-2 text-foreground">
        <input
          type="checkbox"
          checked={showNoData}
          onChange={(e) => setShowNoData(e.target.checked)}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        <span>Mostrar estaciones sin datos recientes</span>
      </label>
    </div>
  )
}
