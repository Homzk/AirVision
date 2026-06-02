import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { matchesQuery, MIN_QUERY_LENGTH, normalize } from '@/lib/stationFilters'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useFiltersStore } from '@/stores/filtersStore'
import type { StationWithLatest } from '@/types/domain'

const LISTBOX_ID = 'station-search-listbox'
const MAX_SUGGESTIONS = 8

/**
 * Accessible combobox to find a station by name or comuna. Typing filters the
 * map (via the shared search term) and shows a suggestion list; choosing one
 * asks the map to fly to it (`requestFlyTo`). All matching is client-side over
 * the stations already loaded in the dashboard store.
 */
export function StationSearch() {
  const stationsById = useDashboardStore((s) => s.stationsById)
  const searchTerm = useFiltersStore((s) => s.searchTerm)
  const setSearchTerm = useFiltersStore((s) => s.setSearchTerm)
  const requestFlyTo = useFiltersStore((s) => s.requestFlyTo)

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const hasQuery = normalize(searchTerm.trim()).length >= MIN_QUERY_LENGTH

  const suggestions = useMemo(() => {
    if (!hasQuery) return []
    return Object.values(stationsById)
      .filter((station) => matchesQuery(station, searchTerm))
      .slice(0, MAX_SUGGESTIONS)
  }, [stationsById, searchTerm, hasQuery])

  const showList = open && hasQuery
  const showEmpty = showList && suggestions.length === 0

  function select(station: StationWithLatest) {
    requestFlyTo({ lat: station.latitude, lng: station.longitude, stationId: station.id })
    setSearchTerm(station.name)
    setOpen(false)
    setActiveIndex(-1)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        event.preventDefault()
        select(suggestions[activeIndex])
      }
    } else if (event.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div className="relative w-64 max-w-[calc(100vw-2rem)]">
      <label htmlFor="station-search-input" className="sr-only">
        Buscar estación o comuna
      </label>
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id="station-search-input"
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={LISTBOX_ID}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `station-search-option-${activeIndex}` : undefined
          }
          autoComplete="off"
          placeholder="Buscar estación o comuna…"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setOpen(true)
            setActiveIndex(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full rounded-md border border-border bg-background/95 py-2 pl-8 pr-3 text-sm text-foreground shadow-md backdrop-blur placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {showList && (
        <ul
          id={LISTBOX_ID}
          role="listbox"
          aria-label="Estaciones coincidentes"
          className="absolute z-[1000] mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-background/95 py-1 text-sm shadow-lg backdrop-blur"
        >
          {suggestions.map((station, index) => (
            <li
              key={station.id}
              id={`station-search-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(station)}
              className={`cursor-pointer px-3 py-1.5 ${
                index === activeIndex ? 'bg-accent text-accent-foreground' : 'text-foreground'
              }`}
            >
              <span className="font-medium">{station.name}</span>
              {station.city && <span className="text-muted-foreground"> · {station.city}</span>}
            </li>
          ))}
        </ul>
      )}

      {showEmpty && (
        <div
          role="status"
          className="absolute z-[1000] mt-1 w-full rounded-md border border-border bg-background/95 px-3 py-2 text-sm text-muted-foreground shadow-lg backdrop-blur"
        >
          Sin resultados para “{searchTerm.trim()}”.
        </div>
      )}
    </div>
  )
}
