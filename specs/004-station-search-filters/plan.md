# Implementation Plan: Búsqueda y filtrado de estaciones en el mapa

**Branch**: `004-station-search-filters` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-station-search-filters/spec.md`

## Summary

Mejorar el descubrimiento de estaciones en el mapa (página principal, anónima) con cuatro capacidades que se combinan: (1) buscador accesible por nombre/comuna que centra el mapa y abre el detalle; (2) toggle para ocultar/mostrar estaciones sin datos recientes, con contador "X de Y"; (3) filtro por nivel de calidad worst-of; (4) clustering de marcadores y "estaciones cerca de mí" por geolocalización. Todo es **front-end sobre las estaciones ya cargadas en memoria** (`useStations` → `dashboardStore`): sin nuevas peticiones por tecla, sin cambios de base de datos, migraciones ni RLS. La lógica de filtrado/búsqueda/cercanía se aísla en un módulo **puro** (`src/lib/stationFilters.ts`) con cobertura de tests; el estado compartido vive en un store Zustand (`filtersStore`); los marcadores agrupan con **Supercluster** renderizado de forma declarativa en react-leaflet.

## Technical Context

**Language/Version**: TypeScript 5.6 (modo estricto), React 18.3

**Primary Dependencies**: react-leaflet 4.2 / Leaflet 1.9 (ya presentes), Zustand 5, Tailwind CSS 3.4, lucide-react (íconos). **Nueva dependencia**: `supercluster` (clustering geoespacial puro). El navegador aporta `navigator.geolocation` (Web API, no es un proveedor externo de datos).

**Storage**: N/A — la feature no persiste nada ni toca Postgres. Opera sobre `StationWithLatest[]` ya en memoria. El estado de filtros es efímero (no se guarda en URL ni sesión).

**Testing**: Vitest + React Testing Library (unit/integration con Supabase mockeado donde aplique); Playwright para un spec E2E nuevo de búsqueda+filtros.

**Target Platform**: Navegador, escritorio y móvil (ancho mínimo soportado 360px, conforme a la constitución).

**Project Type**: Aplicación web — proyecto único de frontend (`src/`), suite E2E en `e2e/`.

**Performance Goals**: búsqueda y filtrado percibidos como instantáneos (<50 ms) sobre ~169 estaciones; interacción del mapa fluida (~60 fps) con clustering al alejar el zoom.

**Constraints**: solo cliente; cero peticiones de red nuevas por interacción; sin cambios de BD/RLS/secretos; UI 100% en español; reutilizar la clasificación de niveles existente (`src/lib/airQuality.ts`).

**Scale/Scope**: ~169 estaciones hoy; el diseño debe seguir siendo fluido hasta unos pocos cientos. ~5 componentes nuevos + 1 store + 1 módulo de lógica pura + 1–2 hooks + 1 spec E2E.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **I. Type Safety & Code Quality**: ✅ TS estricto; sin `any`; componentes `PascalCase` un-archivo-por-componente; hooks `useX`; identificadores/comentarios en inglés. Sin excepciones.
- **II. Architectural Boundaries**: ✅ La feature **no** llama a APIs externas de datos. Reutiliza los datos que `useStations` (hook bajo `src/hooks/`) ya cargó; los componentes no importan el cliente Supabase. `navigator.geolocation` es una Web API del navegador, no un proveedor de datos de terceros tipo OpenAQ → no infringe el Principio II. La nueva lógica de acceso/derivación vive en módulo puro + store, no en componentes.
- **III. Security by Default**: ✅ Sin tablas nuevas, sin `service_role`, sin secretos, sin red. La ubicación del usuario se usa en memoria y no se almacena ni se envía.
- **IV. User-Visible Quality**: ✅ Estados explícitos loading/empty/error en español (la búsqueda y los filtros definen "sin resultados"; geolocalización define el caso "permiso denegado"). Responsive ≥360px verificado. Tailwind + lucide (el proyecto no usa shadcn/ui pese a la mención de la constitución; es una desviación **preexistente** de todo el código, no introducida por esta feature — se sigue el patrón real del repo).
- **V. Conventional Workflow & Modular Code**: ✅ Commits convencionales; un componente por archivo; toda derivación compartida en store/módulo; trabajo en rama `004-…` con merge a `main` por PR (rama protegida).
- **VI. Testing Discipline**: ✅ `stationFilters.ts` (lógica pura: match de búsqueda normalizado, filtro combinado, conteos, distancia haversine, orden por cercanía) y `filtersStore.ts` con tests co-localizados; cobertura ≥70% sobre `src/lib`/`src/stores`/`src/hooks`. Componentes UI con smoke test. Un spec E2E de Playwright (post-MVP, ya habilitado por la feature 003).

**Resultado del gate**: PASA. Sin violaciones → sin entradas en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/004-station-search-filters/
├── plan.md              # Este archivo
├── research.md          # Fase 0: decisiones (clustering, flyTo+popup, búsqueda, geolocalización)
├── data-model.md        # Fase 1: estado de filtros y vista derivada (cliente, sin BD)
├── quickstart.md        # Fase 1: cómo validar la feature en local
├── contracts/
│   └── filters-and-store.md   # Contrato interno: API del store + firmas de stationFilters
├── checklists/
│   └── requirements.md  # Checklist de calidad de la spec (ya en verde)
└── tasks.md             # Fase 2 (lo genera /speckit-tasks, NO este comando)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── airQuality.ts            # (existe) niveles worst-of, colores, labels — se REUTILIZA
│   ├── stationFilters.ts        # NUEVO: lógica pura (search/normalize, filtro combinado, conteos, haversine, nearest)
│   └── stationFilters.test.ts   # NUEVO: tests unitarios de la lógica pura
├── stores/
│   ├── dashboardStore.ts        # (existe) stationsById, selectedStationId
│   ├── filtersStore.ts          # NUEVO: searchTerm, showNoData, selectedLevels, nearMe, flyToTarget + acciones
│   └── filtersStore.test.ts     # NUEVO
├── hooks/
│   ├── useGeolocation.ts        # NUEVO: envuelve navigator.geolocation (permiso/denegado/no soportado)
│   ├── useGeolocation.test.ts   # NUEVO
│   ├── useSupercluster.ts       # NUEVO: agrupa puntos visibles según zoom/bounds del mapa
│   └── useSupercluster.test.ts  # NUEVO
├── components/map/
│   ├── MapView.tsx              # (existe) se modifica: aplica filtros, monta controles y capa de clusters
│   ├── StationMarker.tsx        # (existe) marcador hoja (CircleMarker) — se reutiliza
│   ├── MapLegend.tsx            # (existe) — se reutiliza la clasificación de niveles
│   ├── StationSearch.tsx        # NUEVO: combobox accesible (nombre/comuna)
│   ├── MapFilters.tsx           # NUEVO: toggle sin-datos + chips de nivel + botón "cerca de mí"
│   ├── StationCounter.tsx       # NUEVO: "Mostrando X de Y" + estado vacío
│   ├── StationClusterLayer.tsx  # NUEVO: render de clusters (burbuja con conteo) + hojas
│   ├── MapController.tsx        # NUEVO: useMap → flyTo a estación/ubicación y abre popup
│   └── *.test.tsx               # NUEVO: smoke/integration por componente con lógica

e2e/specs/
└── discovery.spec.ts            # NUEVO: E2E de búsqueda + toggle sin-datos + filtro de nivel + contador
```

**Structure Decision**: Proyecto único de frontend (ya existente). La feature añade un módulo de lógica pura (`src/lib/stationFilters.ts`), un store Zustand (`src/stores/filtersStore.ts`), dos hooks (`useGeolocation`, `useSupercluster`) y componentes de mapa bajo `src/components/map/`, reutilizando `airQuality.ts`, `StationMarker` y la salida de `useStations`. La suite E2E vive en `e2e/specs/` como en la feature 003.

## Complexity Tracking

> Sin violaciones de la constitución. Tabla no aplicable.
