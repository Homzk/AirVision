# Internal Contract: filtersStore + stationFilters

**Feature**: 004-station-search-filters · **Date**: 2026-06-02

Esta feature no expone APIs externas ni endpoints. El "contrato" relevante es **interno**: la API del store de filtros y las firmas del módulo de lógica pura que los componentes consumen. Documentarlo fija las expectativas que cubren los tests.

## `src/stores/filtersStore.ts` (Zustand)

```ts
interface FiltersState {
  searchTerm: string
  showNoData: boolean
  selectedLevels: Level[]
  nearMe: { active: boolean; coords: { lat: number; lng: number } | null }
  flyToTarget: { lat: number; lng: number; stationId: number | null } | null

  setSearchTerm: (term: string) => void
  setShowNoData: (show: boolean) => void
  toggleLevel: (level: Level) => void
  clearLevels: () => void
  setNearMe: (coords: { lat: number; lng: number }) => void
  clearNearMe: () => void
  requestFlyTo: (target: { lat: number; lng: number; stationId: number | null }) => void
  consumeFlyTo: () => void
  reset: () => void
}
```

**Invariantes / comportamiento esperado** (cubiertos por `filtersStore.test.ts`):

- `setShowNoData(true)` y luego `setShowNoData(false)` deja el estado inicial.
- `toggleLevel('unhealthy')` agrega; repetir lo quita; `clearLevels()` lo vacía.
- `setNearMe(coords)` pone `nearMe.active = true` y guarda `coords`; `clearNearMe()` lo resetea.
- `requestFlyTo(t)` setea `flyToTarget`; `consumeFlyTo()` lo vuelve `null` (un solo disparo).
- `reset()` restaura todos los defaults.

## `src/lib/stationFilters.ts` (puro)

```ts
export function normalize(text: string): string
export function matchesQuery(station: StationWithLatest, query: string): boolean
export function stationLevel(station: StationWithLatest): Level
export interface VisibleResult {
  visible: StationWithLatest[]
  total: number
  shownCount: number
}
export function applyFilters(
  stations: StationWithLatest[],
  filters: {
    searchTerm: string
    showNoData: boolean
    selectedLevels: Level[]
    nearMe: { active: boolean; coords: { lat: number; lng: number } | null }
  },
): VisibleResult
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number
export function sortByProximity(
  stations: StationWithLatest[],
  coords: { lat: number; lng: number },
): StationWithLatest[]
```

**Casos de prueba esperados** (`stationFilters.test.ts`):

- `normalize('Ñuñoa')` → `'nunoa'`; `normalize('TOCOPILLA')` → `'tocopilla'`.
- `matchesQuery` ignora acentos/mayúsculas; `< 2` caracteres no filtra (devuelve `true` para todos vía `applyFilters`).
- `applyFilters` con `showNoData=false` excluye `latest === null`.
- `applyFilters` con `selectedLevels=['unhealthy','hazardous']` deja solo esos niveles (OR).
- Combinación búsqueda+nivel+sin-datos = AND; `shownCount`/`total` correctos.
- `applyFilters` que deja 0 → `shownCount === 0` (dispara empty-state en UI).
- `haversineKm` Santiago↔Valparaíso ≈ 100 km (tolerancia).
- `sortByProximity` ordena ascendente por distancia.

## `src/hooks/useGeolocation.ts`

```ts
type GeoStatus = 'idle' | 'prompting' | 'granted' | 'denied' | 'unsupported' | 'error'
function useGeolocation(): {
  status: GeoStatus
  coords: { lat: number; lng: number } | null
  request: () => void
}
```

**Comportamiento** (`useGeolocation.test.ts`, mockeando `navigator.geolocation`):

- Sin `navigator.geolocation` → `status = 'unsupported'`.
- `request()` con éxito → `status = 'granted'`, `coords` poblado.
- `request()` con permiso denegado → `status = 'denied'`, `coords = null`.

## `src/hooks/useSupercluster.ts`

```ts
interface ClusterPoint {
  lat: number
  lng: number
  stationId: number
}
function useSupercluster(
  points: ClusterPoint[],
  view: { zoom: number; bounds: [number, number, number, number] | null },
): Array<
  | { type: 'cluster'; lat: number; lng: number; count: number; clusterId: number }
  | { type: 'leaf'; lat: number; lng: number; stationId: number }
>
```

**Comportamiento** (`useSupercluster.test.ts`): con puntos cercanos a zoom bajo devuelve ≥1 `cluster` cuyo `count` suma las hojas; a zoom alto devuelve `leaf` individuales. Los puntos de entrada son **solo** las estaciones visibles tras el filtro.
