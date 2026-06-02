import { LocateFixed } from 'lucide-react'
import { useEffect } from 'react'

import { useGeolocation } from '@/hooks/useGeolocation'
import { levelToColor, levelToLabel, type Level } from '@/lib/airQuality'
import { useFiltersStore } from '@/stores/filtersStore'

// Air-quality levels offered as filter chips (worst-of categories; the
// no-data case is handled by the separate toggle, not a level).
const FILTER_LEVELS: readonly Level[] = ['good', 'moderate', 'unhealthy', 'hazardous']

/**
 * Overlay control panel for the map's discovery filters: the "show stations
 * without recent data" toggle and the air-quality level chips. The "near me"
 * action (US5) is added to this same panel later.
 */
export function MapFilters() {
  const showNoData = useFiltersStore((s) => s.showNoData)
  const setShowNoData = useFiltersStore((s) => s.setShowNoData)
  const selectedLevels = useFiltersStore((s) => s.selectedLevels)
  const toggleLevel = useFiltersStore((s) => s.toggleLevel)
  const setNearMe = useFiltersStore((s) => s.setNearMe)
  const requestFlyTo = useFiltersStore((s) => s.requestFlyTo)

  const { status, coords, request } = useGeolocation()

  // When the user grants location, prioritise nearby stations and fly there.
  useEffect(() => {
    if (status === 'granted' && coords) {
      setNearMe(coords)
      requestFlyTo({ lat: coords.lat, lng: coords.lng, stationId: null })
    }
  }, [status, coords, setNearMe, requestFlyTo])

  const locationFailed = status === 'denied' || status === 'unsupported' || status === 'error'

  return (
    <div
      role="region"
      aria-label="Filtros del mapa"
      className="space-y-3 rounded-md border border-border bg-background/95 p-3 text-sm shadow-md backdrop-blur"
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

      <fieldset>
        <legend className="mb-1.5 font-medium text-foreground">Nivel de calidad</legend>
        <div className="flex flex-wrap gap-1.5">
          {FILTER_LEVELS.map((level) => {
            const active = selectedLevels.includes(level)
            return (
              <button
                key={level}
                type="button"
                aria-pressed={active}
                onClick={() => toggleLevel(level)}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                  active
                    ? 'border-foreground bg-accent text-accent-foreground'
                    : 'border-border text-muted-foreground'
                }`}
              >
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: levelToColor(level) }}
                />
                {levelToLabel(level)}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div>
        <button
          type="button"
          onClick={request}
          className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <LocateFixed aria-hidden className="h-3.5 w-3.5" />
          {status === 'prompting' ? 'Localizando…' : 'Estaciones cerca de mí'}
        </button>
        {locationFailed && (
          <p role="alert" className="mt-1 text-xs text-muted-foreground">
            No pudimos obtener tu ubicación. Revisa los permisos del navegador.
          </p>
        )}
      </div>
    </div>
  )
}
