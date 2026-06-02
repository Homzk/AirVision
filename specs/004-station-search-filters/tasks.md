---
description: 'Task list for AirVision feature 004 — Búsqueda y filtrado de estaciones en el mapa'
---

# Tasks: Búsqueda y filtrado de estaciones en el mapa

**Input**: Design documents from `/specs/004-station-search-filters/`

**Prerequisites**: plan.md (✅), spec.md (✅), research.md (✅), data-model.md (✅), contracts/ (✅), quickstart.md (✅)

**Tests**: En AirVision los tests son **obligatorios** (Constitución, Principio VI): cada tarea de implementación entrega su test co-localizado en el mismo cambio. La lógica pura (`src/lib`), el store (`src/stores`) y los hooks (`src/hooks`) cuentan para el gate de cobertura (≥70%). Los componentes solo-UI llevan al menos un smoke test. Se añade un spec E2E (Playwright) para los flujos de búsqueda/filtrado.

**Organization**: Tareas agrupadas por historia de usuario. Setup instala la dependencia de clustering; Foundational entrega el motor compartido (lógica pura + store) que bloquea las historias. US1 (buscador) y US2 (sin-datos+contador) son el MVP (ambas P1).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (otro archivo, sin dependencias incompletas)
- **[Story]**: US1…US5 — Setup, Foundational y Polish no llevan etiqueta
- Cada tarea incluye su ruta de archivo exacta

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencia nueva para el clustering.

- [ ] T001 Añadir `supercluster` (y `@types/supercluster` si no trae tipos) a `package.json` y ejecutar `npm install`; verificar que `npm run build` sigue verde.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Motor compartido **puro y testeable** que consumen todas las historias: lógica de filtrado/búsqueda/cercanía y estado de filtros. No toca la base de datos.

**⚠️ CRITICAL**: Ninguna historia puede completarse hasta terminar esta fase.

- [ ] T002 [P] Crear `src/lib/stationFilters.ts` con `normalize`, `matchesQuery`, `stationLevel`, `applyFilters` (reglas sin-datos ∧ nivel ∧ búsqueda; OR entre niveles; cómputo de `shownCount`/`total`), `haversineKm` y `sortByProximity`, según `contracts/filters-and-store.md`; reutiliza `computeWorstLevel`/`Level` de `src/lib/airQuality.ts`. Añadir `src/lib/stationFilters.test.ts` cubriendo normalización (acentos/mayúsculas), umbral de 2 chars, exclusión de `latest===null`, OR de niveles, combinación AND, conteos, caso 0 resultados, haversine (Santiago↔Valparaíso ≈100 km) y orden por cercanía.
- [ ] T003 [P] Crear `src/stores/filtersStore.ts` (Zustand) con `searchTerm`, `showNoData` (default `false`), `selectedLevels` (default `[]`), `nearMe`, `flyToTarget` y las acciones `setSearchTerm`, `setShowNoData`, `toggleLevel`, `clearLevels`, `setNearMe`, `clearNearMe`, `requestFlyTo`, `consumeFlyTo`, `reset`. Añadir `src/stores/filtersStore.test.ts` con los invariantes del contrato (toggles idempotentes, flyTo de un disparo, reset).

**Checkpoint**: motor listo → las historias pueden construirse sobre él.

---

## Phase 3: User Story 1 - Encontrar una estación por nombre o comuna (Priority: P1) 🎯 MVP

**Goal**: Un buscador accesible que, al elegir una estación, centra el mapa en ella y abre su detalle.

**Independent Test**: escribir "Tocopilla" → ver sugerencias → elegir una → el mapa vuela y abre el popup; término sin coincidencias → "sin resultados".

- [ ] T004 [US1] Crear `src/components/map/StationSearch.tsx`: combobox accesible (ARIA, navegación por teclado) que filtra las estaciones de `dashboardStore` con `matchesQuery` (≥2 chars), lista sugerencias (nombre + comuna), y al seleccionar llama `requestFlyTo` del `filtersStore`; muestra copy "sin resultados" en español. Añadir `src/components/map/StationSearch.test.tsx` (render, escribe y sugiere, selección dispara la acción, estado sin resultados).
- [ ] T005 [US1] Crear `src/components/map/MapController.tsx`: componente hijo de `MapContainer` que con `useMap()` observa `flyToTarget`, hace `map.flyTo([lat,lng], zoom)`, fija `selectedStationId` en `dashboardStore`, abre el popup de la estación y llama `consumeFlyTo`. Añadir `src/components/map/MapController.test.tsx` (smoke con mock de `useMap`).
- [ ] T006 [US1] Integrar en `src/components/map/MapView.tsx`: montar `MapController` dentro de `MapContainer` y `StationSearch` como control superpuesto; cablear la selección → `requestFlyTo`. Actualizar/crear pruebas de `MapView` afectadas.

**Checkpoint**: el buscador funciona de extremo a extremo (MVP demostrable).

---

## Phase 4: User Story 2 - Ocultar estaciones sin datos recientes (Priority: P1)

**Goal**: Por defecto solo se ven estaciones con datos; un control las revela; un contador muestra "X de Y".

**Independent Test**: al cargar, solo estaciones con datos + contador correcto; activar el control → aparecen las grises y el contador sube; desactivar → se ocultan.

- [ ] T007 [US2] Modificar `src/components/map/MapView.tsx` para derivar las estaciones visibles con `applyFilters(Object.values(stationsById), filters)` y renderizar solo `visible` (en vez de todas). Mantener la suscripción realtime existente. Actualizar las pruebas de `MapView`.
- [ ] T008 [US2] Crear `src/components/map/MapFilters.tsx` con el toggle "mostrar estaciones sin datos recientes" (lee/escribe `showNoData` del `filtersStore`), como panel de control superpuesto. Añadir `src/components/map/MapFilters.test.tsx` (toggle refleja y muta el estado).
- [ ] T009 [US2] Crear `src/components/map/StationCounter.tsx` que muestre "Mostrando {shownCount} de {total} estaciones con datos" y un estado vacío en español cuando `shownCount === 0`. Añadir `src/components/map/StationCounter.test.tsx` (conteo y empty-state).
- [ ] T010 [US2] Asegurar que las estaciones sin datos (`no_data`, gris) sean visualmente distinguibles de las activas cuando se muestran (revisar `src/components/map/StationMarker.tsx`: opacidad/borde) y actualizar `src/components/map/StationMarker.test.tsx`.

**Checkpoint**: mapa limpio por defecto, revelable, con contador y empty-state.

---

## Phase 5: User Story 3 - Filtrar por nivel de calidad del aire (Priority: P2)

**Goal**: Chips por nivel worst-of que dejan visibles solo las estaciones de los niveles elegidos.

**Independent Test**: elegir nivel(es) → solo esas estaciones + contador correcto; combinación sin resultados → mensaje de vacío.

- [ ] T011 [US3] Añadir a `src/components/map/MapFilters.tsx` los chips de nivel (multi-selección con `toggleLevel`/`clearLevels`), reutilizando `levelToColor`/`levelToLabel` de `src/lib/airQuality.ts`. Actualizar `src/components/map/MapFilters.test.tsx` (selección/deselección y unión OR).
- [ ] T012 [US3] Añadir una prueba de integración (en `MapView.test.tsx` o `StationCounter.test.tsx`) que verifique la combinación búsqueda + nivel + sin-datos (AND) y el empty-state cuando el resultado es 0. (La lógica ya vive en `applyFilters`; esta tarea es el cableado/verificación.)

**Checkpoint**: filtro por nivel combinable con los demás.

---

## Phase 6: User Story 4 - Mapa legible con muchas estaciones (clustering) (Priority: P3)

**Goal**: Estaciones cercanas se agrupan al alejar el zoom y se separan al acercar; los conteos reflejan solo lo visible.

**Independent Test**: a nivel país, burbujas con conteo; al hacer zoom se dividen en marcadores; con filtros activos los conteos cuadran.

- [ ] T013 [US4] Crear `src/hooks/useSupercluster.ts` que envuelva `supercluster`: recibe los puntos visibles + `{ zoom, bounds }` y devuelve clusters/hojas (ver `contracts/filters-and-store.md`). Añadir `src/hooks/useSupercluster.test.ts` (agrupa a zoom bajo con `count` correcto; hojas a zoom alto).
- [ ] T014 [US4] Crear `src/components/map/StationClusterLayer.tsx`: usa `useMap`/`useMapEvents` para leer zoom/bounds, llama `useSupercluster` con las estaciones visibles, y pinta cada cluster como burbuja con su conteo y cada hoja con `StationMarker` (+ su `Popup`). Añadir `src/components/map/StationClusterLayer.test.tsx` (smoke).
- [ ] T015 [US4] Integrar `StationClusterLayer` en `src/components/map/MapView.tsx` reemplazando el render directo de marcadores por el clustered de las estaciones visibles; clic en cluster / zoom lo expande. Actualizar pruebas de `MapView`.

**Checkpoint**: mapa legible a cualquier zoom, coherente con los filtros.

---

## Phase 7: User Story 5 - Ver las estaciones cercanas a mí (Priority: P3)

**Goal**: Centrar el mapa en la ubicación del usuario y priorizar por cercanía, con fallback si se deniega el permiso.

**Independent Test**: activar "cerca de mí" + permiso → mapa centrado y cercanía priorizada; denegar → mensaje de fallback sin romper la página.

- [ ] T016 [US5] Crear `src/hooks/useGeolocation.ts` que envuelva `navigator.geolocation.getCurrentPosition` con `status ∈ idle|prompting|granted|denied|unsupported|error` y `request()`. Añadir `src/hooks/useGeolocation.test.ts` mockeando `navigator.geolocation` (no soportado / concedido / denegado).
- [ ] T017 [US5] Añadir el botón "estaciones cerca de mí" a `src/components/map/MapFilters.tsx`: al conceder → `setNearMe(coords)` + `requestFlyTo(userCoords)` y orden por cercanía (`sortByProximity`) en la vista; al denegar/no soportar → mensaje de fallback en español. Actualizar `src/components/map/MapFilters.test.tsx`.

**Checkpoint**: las cinco historias funcionan y se combinan de forma coherente.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: E2E, responsive, docs y validación end-to-end.

- [ ] T018 [P] [US1][US2][US3] Crear `e2e/specs/discovery.spec.ts` (Playwright) cubriendo: buscar → centrar/abrir; toggle sin-datos + contador; chip de nivel + empty-state. Localizadores web-first; sin `waitForTimeout` fijos. (Geolocalización y clustering quedan como E2E opcional por su complejidad de simulación.)
- [ ] T019 [P] Barrido responsive a 360px de los controles nuevos (`StationSearch`, `MapFilters`, `StationCounter`): sin scroll horizontal ni solapes; ajustar clases Tailwind si hace falta.
- [ ] T020 [P] Actualizar `README.md` (Roadmap: feature 004 + nota de la dependencia `supercluster` en Setup) y registrar la feature 004 en `NOTES.md`.
- [ ] T021 Ejecutar la validación de `quickstart.md` (SC-001…SC-008), correr `npm run test:coverage` (gate ≥70%) y confirmar sin regresiones en los specs E2E previos (map/auth/favorites/alerts).

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: sin dependencias.
- **Phase 2 (Foundational)**: depende de Setup. **BLOQUEA** todas las historias (todas usan `stationFilters`/`filtersStore`).
- **Phase 3 (US1)** y **Phase 4 (US2)**: dependen de Foundational. Juntas son el MVP (ambas P1).
- **Phase 5 (US3)**: depende de Foundational; comparte `MapFilters.tsx` con US2 (hacer US2 antes de US3).
- **Phase 6 (US4)**: depende de Foundational y de que `MapView` ya renderice las visibles (US2/T007).
- **Phase 7 (US5)**: depende de Foundational; añade botón a `MapFilters.tsx` (tras US2/US3).
- **Phase 8 (Polish)**: depende de las historias deseadas completas.

### Within each phase

- Foundational: T002 y T003 en paralelo (archivos distintos).
- US1: T004 y T005 en paralelo; T006 después (integra ambos en `MapView`).
- US2: T007 → (T008, T009, T010 en su mayoría independientes; T008/T011/T017 tocan el mismo `MapFilters.tsx` → secuenciar).

### Parallel opportunities

- Setup: ninguna (una tarea).
- Foundational: T002 ∥ T003.
- Polish: T018, T019, T020 en paralelo; T021 al final.
- Cuidado: `MapFilters.tsx` lo tocan T008, T011 y T017 → no paralelizar entre sí. `MapView.tsx` lo tocan T006, T007 y T015 → secuenciar.

---

## Implementation Strategy

### MVP First (US1 + US2, ambas P1)

1. **Setup** (T001) + **Foundational** (T002–T003): motor puro testeado.
2. **US1** (T004–T006): buscador → flyTo. **STOP y validar**.
3. **US2** (T007–T010): mapa limpio + contador. **STOP y validar** → este es el MVP demostrable.

### Incremental Delivery

4. **US3** (T011–T012): filtro por nivel.
5. **US4** (T013–T015): clustering.
6. **US5** (T016–T017): cerca de mí.
7. **Polish** (T018–T021): E2E, responsive, docs, validación.

### Notas

- Lógica pura primero (Foundational) → las historias quedan en su mayoría cableado + UI, fáciles de testear.
- Localizadores web-first en E2E; sin sleeps fijos.
- Sin cambios de BD/RLS/secretos; `navigator.geolocation` es Web API del navegador.
- Cada tarea entrega su test co-localizado (Constitución VI); commits convencionales; sin `--no-verify`.
- Merge a `main` por PR (rama protegida; checks `quality` + `e2e` requeridos).
