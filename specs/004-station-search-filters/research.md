# Research: Búsqueda y filtrado de estaciones en el mapa

**Feature**: 004-station-search-filters · **Date**: 2026-06-02

Decisiones técnicas para resolver los puntos abiertos del plan. Formato: Decisión / Rationale / Alternativas consideradas.

## 1. Clustering de marcadores

**Decisión**: Usar **`supercluster`** (algoritmo de clustering geoespacial puro, de Mapbox) y renderizar los resultados de forma **declarativa** en react-leaflet: un hook `useSupercluster` recalcula los clusters a partir de los puntos visibles + el `zoom`/`bounds` actuales del mapa (vía `useMap` + `useMapEvents`), y `StationClusterLayer` pinta cada cluster como una burbuja (`CircleMarker` o `Marker` con `divIcon`) con su conteo, y cada hoja como el `StationMarker` (`CircleMarker`) ya existente.

**Rationale**:

- Nuestros marcadores son `CircleMarker` (vectores) con color por nivel. `leaflet.markercluster` está diseñado para `L.Marker` (íconos), su API es **imperativa** (`addLayer`/`removeLayer`/`refreshClusters`) y choca con el modelo declarativo de React y con el **filtrado dinámico** (habría que sincronizar capas a mano en cada cambio de filtro). La documentación oficial confirma el flujo basado en `L.marker` + `markerClusterGroup`.
- `supercluster` separa el **cálculo** (puro, función de puntos+zoom+bounds) del **render** (React), lo que encaja con la constitución: la parte testeable queda en un hook/módulo y el render queda declarativo y reactivo a los filtros.
- Mantiene intacto el estilo de marcador hoja por nivel (no hay que migrar `CircleMarker` → `divIcon`).

**Alternativas consideradas**:

- `leaflet.markercluster` (+ wrapper `react-leaflet-cluster`): menos código inicial, pero imperativo, orientado a `L.Marker`, y reconciliar el set tras cada filtro es frágil. Rechazado por fricción con React y con el filtrado.
- Sin clustering, solo `click({force})` como en E2E: no resuelve la legibilidad real a nivel país. Rechazado (US4 lo pide explícitamente).

## 2. Centrar el mapa y abrir el popup al elegir en el buscador (`flyTo`)

**Decisión**: Un componente hijo `MapController` montado dentro de `MapContainer` usa `useMap()` para obtener la instancia Leaflet. Observa `flyToTarget` del `filtersStore` (estación o coordenada); ante un cambio, llama `map.flyTo([lat, lng], zoom)` y marca `selectedStationId`. El popup de la estación seleccionada se abre de forma controlada (manteniendo un registro de refs de marcador por `id`, o renderizando el `Popup` de la estación seleccionada en estado abierto).

**Rationale**: `useMap()` es el patrón soportado por react-leaflet para acción imperativa puntual sobre el mapa desde un componente declarativo; aísla el efecto en un único controlador y mantiene el resto del árbol puro.

**Alternativas consideradas**: pasar la instancia del mapa hacia arriba con `whenReady`/estado global — más acoplamiento. Rechazado frente al patrón idiomático `useMap()` en un hijo.

## 3. Coincidencia de búsqueda (normalización)

**Decisión**: Búsqueda **insensible a mayúsculas y acentos** sobre `name` + `city`, con `string.normalize('NFD')` + remoción de diacríticos y `toLocaleLowerCase('es')`; coincidencia por substring a partir de 2 caracteres. Función pura en `stationFilters.ts` (`matchesQuery(station, query)`), unit-testeada (p. ej. "tocopilla" ↔ "Tocopilla", "valpo" no, "ñuñoa" ↔ "nunoa").

**Rationale**: usuarios chilenos escriben sin acentos; coincidencia normalizada evita falsos negativos. Mantenerlo puro lo hace testeable y reusable por el contador y la capa de marcadores.

**Alternativas consideradas**: búsqueda difusa (Fuse.js) — sobredimensionada para 169 ítems y añade dependencia; rechazada. Filtrado en servidor (PostgREST `ilike`) — viola el objetivo "sin red por tecla". Rechazada.

## 4. Geolocalización ("estaciones cerca de mí")

**Decisión**: Hook `useGeolocation` que envuelve `navigator.geolocation.getCurrentPosition` con estados explícitos: `idle | prompting | granted(coords) | denied | unsupported | error`. La distancia se calcula con **haversine** (función pura en `stationFilters.ts`); `sortByProximity(stations, coords)` ordena por cercanía. Al conceder permiso, `MapController` hace `flyTo` a la posición; al denegar/no soportar, se muestra copy en español sin romper la página.

**Rationale**: separar el efecto (permiso del navegador, no determinista) en un hook y el cálculo (haversine/orden) en funciones puras maximiza la testabilidad (el hook se prueba mockeando `navigator.geolocation`; las funciones se prueban directo).

**Alternativas consideradas**: librería de geo-distancia externa — innecesaria para una sola fórmula. Rechazada. Filtrar (no solo ordenar) por radio — contradice la asunción de la spec (cercanía prioriza, no elimina). Rechazada.

## 5. Estado de filtros: store vs estado local

**Decisión**: `filtersStore` (Zustand) con `searchTerm`, `showNoData` (default `false`), `selectedLevels` (subconjunto de `Level`, default vacío = todos), `nearMe` (activo + `coords`), `flyToTarget`. La vista derivada (estaciones visibles + conteos) se calcula con `stationFilters.applyFilters(stations, filters)` — función pura, NO se guarda en el store (se deriva en render/selector).

**Rationale**: el estado de filtros lo comparten buscador, controles, contador y mapa (componentes no relacionados) → Zustand por constitución. Derivar la vista en vez de almacenarla evita estado redundante y bugs de sincronización; además es trivialmente testeable.

**Alternativas consideradas**: estado local en `MapView` y prop-drilling — acopla y dificulta el contador/empty-state. Rechazado. Persistir filtros en URL — fuera de alcance (diferido).

## 6. Combinación de filtros y conteo

**Decisión**: Los tipos de filtro se combinan con **AND** (búsqueda ∧ nivel ∧ sin-datos); dentro del filtro de nivel, varios niveles seleccionados son **OR**. El contador refleja `visibles.length` vs `total` (total = todas las estaciones cargadas). Selección explícita desde el buscador **prevalece**: si la estación elegida quedaría oculta por un filtro, se centra/abre igualmente (la intención del usuario gana); el detalle de cómo señalizarlo se afina en implementación.

**Rationale**: coincide con las asunciones de la spec y con la expectativa del usuario; AND/OR documentado evita ambigüedad para los tests.

## Resumen de dependencias nuevas

| Paquete        | Uso                         | Tamaño aprox. | Justificación                                                               |
| -------------- | --------------------------- | ------------- | --------------------------------------------------------------------------- |
| `supercluster` | Clustering geoespacial puro | ~15 kB        | Cálculo de clusters reactivo a filtros, render declarativo en react-leaflet |

Sin otras dependencias. `navigator.geolocation` es nativo del navegador.
