# Data Model: Búsqueda y filtrado de estaciones en el mapa

**Feature**: 004-station-search-filters · **Date**: 2026-06-02

> Esta feature **no introduce ni modifica tablas, vistas, columnas ni políticas RLS**. Todo el "modelo" es estado de cliente efímero y vistas derivadas en memoria sobre datos que ya provee `useStations`. Se documentan aquí las formas (tipos) y reglas de derivación.

## Entidades existentes reutilizadas

- **`StationWithLatest`** (`src/types/domain.ts`, ya existe): `id`, `name`, `city`, `latitude`, `longitude`, `country_code`, `created_at`, y `latest: { measured_at, pm25, pm10, o3 } | null`. La condición **"sin datos recientes"** es exactamente `latest === null`.
- **`Level`** (`src/lib/airQuality.ts`, ya existe): `'good' | 'moderate' | 'unhealthy' | 'hazardous' | 'no_data'`. El nivel worst-of de una estación es `station.latest ? computeWorstLevel(station.latest) : 'no_data'`.

## Estado de filtros (nuevo, efímero)

`FiltersState` (en `src/stores/filtersStore.ts`), no se persiste:

| Campo            | Tipo                                                     | Default | Significado                                                                        |
| ---------------- | -------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------- |
| `searchTerm`     | `string`                                                 | `''`    | Texto del buscador (sin normalizar; la normalización ocurre en la comparación).    |
| `showNoData`     | `boolean`                                                | `false` | Si las estaciones con `latest === null` se muestran. Default oculto (mapa limpio). |
| `selectedLevels` | `Level[]`                                                | `[]`    | Niveles activos del filtro. Vacío = **todos** los niveles (sin restricción).       |
| `nearMe`         | `{ active: boolean; coords: { lat: number; lng: number } | null }` | `{ active: false, coords: null }`                                                  | Estado del modo "cerca de mí". |
| `flyToTarget`    | `{ lat: number; lng: number; stationId: number           | null }  | null`                                                                              | `null`                         | Objetivo puntual de `flyTo` (consumido por `MapController`, luego se limpia). |

**Acciones**: `setSearchTerm`, `toggleShowNoData` (o `setShowNoData`), `toggleLevel(level)` / `clearLevels`, `setNearMe(coords)` / `clearNearMe`, `requestFlyTo(target)` / `consumeFlyTo`, y `reset`.

## Vista derivada (pura, no almacenada)

Calculada por `applyFilters(stations, filters)` en `src/lib/stationFilters.ts`:

```text
VisibleResult {
  visible: StationWithLatest[]   // estaciones que pasan TODOS los filtros activos
  total: number                  // total de estaciones cargadas (denominador del contador)
  shownCount: number             // visible.length (numerador del contador)
}
```

### Reglas de derivación

1. **sin-datos**: si `showNoData === false`, excluir estaciones con `latest === null`.
2. **nivel**: si `selectedLevels` no está vacío, incluir solo estaciones cuyo nivel worst-of ∈ `selectedLevels` (OR entre niveles).
3. **búsqueda**: si `searchTerm` (normalizado) tiene ≥2 caracteres, incluir solo estaciones cuyo `name` o `city` normalizados contengan el término.
4. **Combinación**: las reglas 1–3 se aplican con **AND** entre sí.
5. **cercanía**: si `nearMe.active && nearMe.coords`, el resultado se **ordena** por distancia haversine ascendente (no filtra).
6. **Contador**: `shownCount = visible.length`, `total = stations.length`. Si `shownCount === 0` → estado vacío con copy en español.
7. **Override de selección**: una estación elegida explícitamente en el buscador puede centrarse/abrirse aunque un filtro la ocultaría (la acción del usuario prevalece).

## Funciones puras (firmas) en `stationFilters.ts`

```text
normalize(text: string): string                                   // NFD + sin diacríticos + minúsculas es
matchesQuery(station, query: string): boolean                     // name|city contiene query normalizado
stationLevel(station): Level                                      // worst-of o 'no_data'
applyFilters(stations, filters): VisibleResult                    // reglas 1–6
haversineKm(a: {lat,lng}, b: {lat,lng}): number                   // distancia en km
sortByProximity(stations, coords): StationWithLatest[]            // orden ascendente por distancia
```

## Clustering (derivado, en memoria)

`useSupercluster(points, { zoom, bounds })` recibe **solo las estaciones visibles** (post-filtro) como puntos `{ lat, lng, stationId }` y devuelve clusters (`{ lat, lng, count, clusterId }`) y hojas individuales para el `zoom`/`bounds` actuales. No persiste; se recalcula al moverse/zoom o al cambiar los filtros.

## Geolocalización (efímero, no almacenado)

`useGeolocation()` expone `{ status, coords, request() }` con `status ∈ idle|prompting|granted|denied|unsupported|error`. `coords` solo vive en memoria del componente/hook; **no** se guarda ni se envía a ningún servicio.
