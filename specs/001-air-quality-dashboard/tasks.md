---
description: 'Task list for AirVision MVP — Dashboard de Calidad del Aire en Tiempo Real'
---

# Tasks: Dashboard de Calidad del Aire en Tiempo Real

**Input**: Design documents from `/specs/001-air-quality-dashboard/`

**Prerequisites**: plan.md (✅), spec.md (✅), research.md (✅), data-model.md (✅), contracts/ (✅), quickstart.md (✅)

**Tests**: **MANDATORY** for this project — the project constitution (`.specify/memory/constitution.md`, Principle VI) requires Vitest + React Testing Library, co-located tests, and ≥70% line coverage on `src/hooks/`, `src/utils/`, `src/stores/`. Every implementation task in this list ships with its corresponding test task in the same phase.

**Organization**: Tasks are grouped by user story (US1…US5) to enable independent delivery. P1 is MVP-shippable on its own. Time estimate: 10–12 working days total per user input.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps task to user story (US1, US2, …) — Setup, Foundational, and Polish phases have no story label.
- Each task includes its exact file path.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project skeleton, tooling, and quality gates per constitution.

- [x] T001 Initialize Vite + React + TypeScript project with strict mode in `package.json`, `tsconfig.json`, `vite.config.ts` at repo root
- [x] T002 [P] Configure Tailwind CSS 3 and install shadcn/ui in `tailwind.config.ts`, `postcss.config.js`, `components.json`, `src/index.css` (used `.js` instead of `.cjs` since project is ESM)
- [x] T003 [P] Configure ESLint + Prettier with TypeScript rules in `eslint.config.js` (flat config for v9), `.prettierrc`, `.prettierignore`
- [x] T004 [P] Configure Vitest + React Testing Library + `@vitest/coverage-v8` with thresholds (lines ≥ 70 on `src/hooks/**`, `src/utils/**`, `src/stores/**`, `src/lib/**`) in `vitest.config.ts` and `src/test/setup.ts`
- [x] T005 [P] Install and configure Husky + lint-staged pre-commit hook (ESLint --fix, Prettier --write) in `.husky/pre-commit` and `package.json` `lint-staged` block
- [x] T006 [P] Add npm scripts (`dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `test:coverage`) in `package.json`
- [x] T007 [P] Create `.env.example` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `OPENAQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` placeholders; create `.gitignore` with `.env*`
- [x] T008 [P] Create Supabase project structure stub (`supabase/config.toml` placeholder + empty `supabase/migrations/` and `supabase/functions/_shared/` directories); `supabase init --force` can replace later
- [x] T009 [P] Create GitHub Actions CI workflow in `.github/workflows/ci.yml` running lint, typecheck, and `vitest run --coverage` on push and PR
- [x] T010 [P] Install runtime dependencies in `package.json`: `react`, `react-dom`, `react-router-dom`, `@supabase/supabase-js`, `zustand`, `recharts`, `react-leaflet`, `leaflet`, `sonner`, `lucide-react`, `clsx`, `tailwind-merge` — 489 packages installed; `npm run build` smoke passes (142 kB / 46 kB gzip).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented. Includes shared types, Supabase client, public DB schema, pure-logic libraries, and the ingestion pipeline (needed for US1 to display anything).

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

### Database (public schema)

- [x] T011 Create migration `supabase/migrations/0001_stations.sql` with `stations` table, CHECK constraints on lat/lon, `stations_country_idx`, and RLS policy `stations_select_public`
- [x] T012 Create migration `supabase/migrations/0002_readings.sql` with `readings` table (wide format, nullable `pm25`/`pm10`/`o3`), `UNIQUE (station_id, measured_at)`, non-negative CHECK constraints, indexes `readings_station_time_idx` and `readings_measured_at_idx`, and RLS policy `readings_select_public`
- [x] T013 Create migration `supabase/migrations/0010_latest_reading_view.sql` defining the `latest_station_readings` view (DISTINCT ON per station; `security_invoker=on` para respetar RLS de `readings`)
- [x] T014 Create migration `supabase/migrations/0011_realtime_publication.sql` running `ALTER PUBLICATION supabase_realtime ADD TABLE readings` (guardado con `DO $$` idempotente)
- [x] T014b Create `supabase/seed.sql` con 5 estaciones de Chile + 24 h de lecturas horarias sintéticas (idempotente; no se aplica con `db push`, hay que correrlo manual)
- [x] T015 **Adaptado a Cloud (sin Docker)**: 4 migraciones aplicadas con `supabase db push`; seed corrido desde Studio (5 stations + 120 readings); `src/types/database.ts` generado con `supabase gen types typescript --linked` y reencodeado a UTF-8 sin BOM (PowerShell 5.1 escribe UTF-16 por defecto con `>`). Para futuros refresh de tipos, canalizar por `| Out-File -Encoding utf8` o equivalente

### Frontend foundation

- [x] T016 [P] Implement Supabase client singleton with `anon` key in `src/lib/supabase.ts` (typed against `src/types/database.ts`). Excluido de coverage en `vitest.config.ts` (es boilerplate de infra).
- [x] T017 [P] Implement `computeLevel`, `computeWorstLevel`, OMS thresholds, `levelToColor`, `levelToLabel` helpers in `src/lib/airQuality.ts`. Paleta alineada con `tailwind.config.ts → colors.airQuality`.
- [x] T018 [P] Write unit tests for `airQuality.ts` (26 tests: thresholds por pollutant, worst-of, no-data, color/label) in `src/lib/airQuality.test.ts`. Cobertura 100/100.
- [x] T019 [P] Define `POLLUTANT_LABELS`, `POLLUTANT_UNITS`, `DEFAULT_MAP_VIEW`, `TIME_RANGES`, `TIME_RANGE_LABELS` (más type `TimeRange`) en `src/utils/constants.ts`. `POLLUTANTS` y `LEVEL_COLORS` viven en `airQuality.ts` para evitar ciclos.
- [x] T020 [P] Implement date helpers (`rangeToSince`, `formatReadingTime`, `formatRelative`) en `src/utils/date.ts`. Usa `Intl.DateTimeFormat` y `Intl.RelativeTimeFormat` en `es-CL`/`es`.
- [x] T021 [P] Unit tests for `src/utils/date.ts` (10 tests: rangos, mismo-día vs distinto-día, min/hora/día relativo) en `src/utils/date.test.ts`.
- [x] T021b Extra: tests para `constants.ts` (verifica labels, units, center dentro de bounds, time ranges) en `src/utils/constants.test.ts` — necesario para mantener coverage del directorio.
- [x] T022 [P] `AppShell` con Header arriba, `<Outlet />` central y `MobileNav` abajo en <md, en `src/components/layout/AppShell.tsx`.
- [x] T023 [P] `Header` (logo + nav desktop con `NavLink` activo + slot vacío para auth de US3) en `src/components/layout/Header.tsx`.
- [x] T024 [P] `MobileNav` (tabs fijos abajo con iconos lucide, oculto en md+) en `src/components/layout/MobileNav.tsx`.
- [x] T025 `App.tsx` con rutas `/`, `/favoritos`, `/alertas`, `/login`, `/registro` envueltas en `AppShell`. Páginas placeholder creadas en `src/pages/*Page.tsx`.
- [x] T026 `main.tsx` con `<BrowserRouter>` + `<Toaster richColors />` de `sonner`.
- [x] T027 [P] `LoadingState`, `ErrorState` (con `onRetry` opcional), `EmptyState` en `src/components/ui/`. Iconos lucide, mensajes en español, ARIA `role`/`aria-live`.

### Ingestion pipeline (Supabase backend) — **diferida a post-MVP**

> El seed sintético de `supabase/seed.sql` (5 estaciones + 24 h horarias) cubre
> US1+US2 sin OpenAQ. La ingesta real se conecta sin tocar el frontend cuando
> esté disponible la `OPENAQ_API_KEY` y un slot de despliegue de Edge Functions.

- [ ] T028 [P] [deferred] Implement OpenAQ shared client with pagination, retries, validation in `supabase/functions/_shared/openaq.ts`
- [ ] T029 [P] [deferred] Write Deno unit tests for `openaq.ts` covering invalid-reading filter and pagination loop in `supabase/functions/_shared/openaq.test.ts`
- [ ] T030 [deferred] Implement Edge Function `seed-stations` (fetches OpenAQ locations, upserts to `stations`) in `supabase/functions/seed-stations/index.ts`
- [ ] T031 [deferred] Implement Edge Function `ingest-openaq` (fetches measurements for last 30 min for pm25/pm10/o3 across Chile bbox, upserts with `ON CONFLICT DO UPDATE COALESCE`) in `supabase/functions/ingest-openaq/index.ts`
- [ ] T032 [deferred] Deploy both functions and schedule cron `*/15 * * * *` en Supabase Cloud (alternativa a `supabase functions deploy` local)

**Checkpoint**: Public DB schema live, types generated, app shell renders, OpenAQ data flowing. Ready to build user-facing stories.

---

## Phase 3: User Story 1 - Explorar el mapa de calidad del aire (Priority: P1) 🎯 MVP

**Goal**: Un visitante sin cuenta abre la app, ve un mapa de Chile con estaciones coloreadas según su lectura más reciente (worst-of PM2.5/PM10/O3), y al hacer click ve un popup con valores actuales.

**Independent Test**: Abrir `/` sin login → confirmar que aparece el mapa centrado en Chile, los marcadores tienen colores correctos, y el popup muestra los tres contaminantes con sus unidades.

### Hooks

- [x] T033 [P] [US1] `useStations()` en `src/hooks/useStations.ts` — dos queries paralelas (`stations` + `latest_station_readings`) y merge cliente; evita depender de embedded join sobre vistas y conserva stations sin lecturas (`latest: null`).
- [x] T034 [P] [US1] Tests de `useStations` (6: empty, merge, null measured_at, error en stations, error en latest, refresh) en `src/hooks/useStations.test.ts`.
- [x] T035 [P] [US1] `useReadingsRealtime()` en `src/hooks/useReadingsRealtime.ts` — canal `readings:inserts`, callback vía ref para no re-suscribir, expone `status: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'`.
- [x] T036 [P] [US1] Tests de `useReadingsRealtime` (7: subscribe, cleanup, callback, callback identity, status transitions, error states, fallback) en `src/hooks/useReadingsRealtime.test.ts`.

### Store

- [x] T037 [P] [US1] `dashboardStore` (Zustand) con `selectedStationId`, `stationsById`, `setStations`, `applyNewReading` (descarta lecturas más antiguas, no-op para stations desconocidas), `setSelectedStationId` en `src/stores/dashboardStore.ts`.
- [x] T038 [P] [US1] Tests de `dashboardStore` (8: estado inicial, indexar por id, replace, newer, older, unknown station, primer reading desde null, set/clear selection) en `src/stores/dashboardStore.test.ts`.
- [x] T038b [US1] Tipos compartidos `Station`, `Reading`, `LatestReading`, `StationWithLatest` en `src/types/domain.ts`.

### Components

- [x] T039 [P] [US1] `StationMarker` (`<CircleMarker>` blanco con borde y color de fondo según `computeWorstLevel`) en `src/components/map/StationMarker.tsx`.
- [x] T040 [P] [US1] Tests de `StationMarker` (4: posición, no_data, worst-of, click) con `react-leaflet` mockeado en `src/components/map/StationMarker.test.tsx`.
- [x] T041 [P] [US1] `StationPopup` con nombre, ciudad, 3 contaminantes (`PollutantCell` subcomp), badge de nivel, timestamp formateado, branch "Sin datos recientes", botón "Ver tendencias" opcional en `src/components/map/StationPopup.tsx`.
- [x] T042 [P] [US1] Tests de `StationPopup` (5: render normal, em-dash por valor null, sin datos, botón con onOpenTrends, botón oculto sin handler) en `src/components/map/StationPopup.test.tsx`.
- [x] T043 [P] [US1] `MapLegend` con 5 colores + labels en español, overlay absoluto con z-index 1000 en `src/components/map/MapLegend.tsx`.
- [x] T044 [US1] `MapView` ensambla `<MapContainer>` + tiles OSM + markers desde `dashboardStore.stationsById` + `<MapLegend>`; alimenta el store con las stations recibidas y suscribe `useReadingsRealtime → applyNewReading` para refrescar marcadores en vivo. CSS de Leaflet importado en `main.tsx`.
- [x] T045 [US1] `HomePage` orquesta `useStations` con sus 3 estados (LoadingState, ErrorState con retry, EmptyState con banner "Aún no se han recibido mediciones") y renderiza `MapView` en el camino feliz.
- [x] T046 [US1] `HomePage` ya queda montada en `/` (la ruta se cableó en Phase 2 T025).

**Checkpoint**: User Story 1 fully functional. Visitor sees colored markers on a Chile map and can open popups. App is deployable as a standalone MVP.

---

## Phase 4: User Story 2 - Ver tendencias temporales de una estación (Priority: P2)

**Goal**: Tras seleccionar una estación, ver tres gráficos de línea (PM2.5, PM10, O3) con selector de rango 6h/24h/7d que se actualizan en tiempo real.

**Independent Test**: Click sobre un marcador → abrir panel → alternar 6h/24h/7d → ver que el rango cambia; insertar manualmente una nueva lectura en BD y verificar que el gráfico añade el punto sin recargar.

### Hooks

- [x] T047 [P] [US2] `useStationReadings(stationId, range)` en `src/hooks/useStationReadings.ts` — fetch inicial con `.gte(rangeToSince)` y subscribe filtrado `station_id=eq.${id}` para appendear inserts en vivo dentro del rango. Idle cuando `stationId === null`.
- [x] T048 [P] [US2] Tests de `useStationReadings` (7: idle, fetch + canal, error, insert dentro de rango, insert fuera de rango ignorado, cleanup, re-fetch al cambiar rango) en `src/hooks/useStationReadings.test.ts`.

### Store (extended)

- [x] T049 [US2] `dashboardStore` extendido con `range: TimeRange` (default `'24h'`) + `setRange(range)`. Tests actualizados (default + setRange) en `src/stores/dashboardStore.test.ts`.

### Components

- [x] T050 [P] [US2] `RangeSelector` (toggle pill con 3 botones, `aria-pressed`, lee/escribe en el store) en `src/components/dashboard/RangeSelector.tsx`.
- [x] T051 [P] [US2] Tests de `RangeSelector` (3: render, pressed state, click → store) en `src/components/dashboard/RangeSelector.test.tsx`.
- [x] T052 [P] [US2] `PollutantChart` con Recharts `LineChart` + `ResponsiveContainer`, `connectNulls`, color `hsl(var(--ring))`, branches "Sin datos en este rango" / "Sin cobertura de X en este rango" en `src/components/dashboard/PollutantChart.tsx`.
- [x] T053 [P] [US2] Tests de `PollutantChart` (3: empty, no cobertura, render normal con dataKey correcto) — Recharts mockeado para que jsdom no pelee con el SVG en `src/components/dashboard/PollutantChart.test.tsx`.
- [x] T054 [US2] `ChartPanel` con header "Tendencias" + `RangeSelector` + 3 `PollutantChart` apilados + estados loading/error desde `useStationReadings` en `src/components/dashboard/ChartPanel.tsx`.
- [x] T055 [US2] `StationPanel` como slide-over right (md+) / bottom sheet (mobile) con backdrop, ESC para cerrar, header con nombre/ciudad/nivel + botón X, embebe `ChartPanel(stationId)`. Realtime per-station vive dentro de `useStationReadings`, no aquí. En `src/components/dashboard/StationPanel.tsx`.
- [x] T056 [US2] Wiring del "Ver tendencias" del `StationPopup` ya existía desde US1 (`onOpenTrends → setSelectedStationId`). `StationPanel` montado en `src/pages/HomePage.tsx` después de `MapView` para que el slide-over flote sobre el mapa.

**Checkpoint**: User Stories 1 AND 2 work. Mapa + tendencias realtime.

---

## Phase 5: User Story 3 - Crear cuenta e iniciar sesión (Priority: P3)

**Goal**: Visitante puede crear cuenta con email+password, iniciar sesión, ver su sesión persistir tras recarga, y cerrar sesión.

**Independent Test**: Registrarse desde `/registro`, recargar la página, comprobar que sigue autenticado, cerrar sesión, volver a iniciar sesión con las mismas credenciales.

### Hook + Store

- [x] T057 [P] [US3] `useAuth()` en `src/hooks/useAuth.ts` — bootstrap (getSession inicial + onAuthStateChange), retorna `{status, user, signUp, signIn, signOut}` derivado del store. Debe llamarse UNA vez en `App.tsx`.
- [x] T058 [P] [US3] Tests de `useAuth` (5: bootstrap anónimo, bootstrap autenticado, transición SIGNED_IN tardío, unsubscribe en unmount, actions expuestas) en `src/hooks/useAuth.test.ts`.
- [x] T059 [P] [US3] `authStore` (Zustand) con `status: 'loading'|'authenticated'|'anonymous'`, `user`, `session`, `setSession`, y actions `signUp/signIn/signOut` que envuelven `supabase.auth.*` y mapean errores a español vía `mapAuthError`. `signUp` distingue caso de confirmación de email pendiente.
- [x] T060 [P] [US3] Tests de `authStore` (10: estado inicial, setSession null/válida, signIn ok/error mapeado, signUp con/sin confirmación + error, signOut delega, mapAuthError cubre patrones conocidos + fallback) en `src/stores/authStore.test.ts`.

### Components

- [x] T061 [P] [US3] `LoginForm` con email + password (autoComplete, minLength 8), estado local `isSubmitting`/`error`, navegación a `/` en éxito. Error en `<p role="alert">`. En `src/components/auth/LoginForm.tsx`.
- [x] T062 [P] [US3] Tests de `LoginForm` (3: render, submit success → navigate, error mapeado en alert) en `src/components/auth/LoginForm.test.tsx`.
- [x] T063 [P] [US3] `RegisterForm` con email + password + confirmación; valida `length ≥ 8` y `password === confirmPassword` antes de llamar a `signUp`; ramifica entre `needsConfirmation` (info toast + redirect `/login`) y sesión inmediata (success toast + redirect `/`). En `src/components/auth/RegisterForm.tsx`.
- [x] T064 [P] [US3] Tests de `RegisterForm` (6: render, password corto, passwords no coinciden, signup con sesión → navigate + toast success, signup sin sesión → navigate /login + toast info, error backend mapeado) en `src/components/auth/RegisterForm.test.tsx`.
- [x] T065 [P] [US3] `AuthGate` renderiza `LoadingState` mientras `status === 'loading'`, `<Navigate to="/login" replace>` si `anonymous`, children si `authenticated`. En `src/components/auth/AuthGate.tsx`. (Aún no montado en rutas; eso se hace en T078/T101.)
- [x] T066 [US3] `LoginPage` y `RegisterPage` con form embebido + link cruzado a la otra pantalla en `src/pages/LoginPage.tsx` y `src/pages/RegisterPage.tsx`.
- [x] T067 [US3] `Header` ahora lee `status`/`user`/`signOut` del store; muestra email + "Cerrar sesión" si autenticado, "Iniciar sesión" (oculto < sm) + botón naranjo "Registrarse" si anónimo, nada si `loading`. En `src/components/layout/Header.tsx`.
- [x] T068 [US3] `App.tsx` llama `useAuth()` al tope. Rutas `/login` y `/registro` ya cableadas desde Phase 2 T025.

**Checkpoint**: Auth flow complete. Sections `/favoritos` and `/alertas` are now gateable (still empty placeholders).

---

## Phase 6: User Story 4 - Gestionar estaciones favoritas (Priority: P4)

**Goal**: Usuario autenticado marca/desmarca estaciones favoritas (máx 10) desde popup o panel, las ve listadas en `/favoritos` con su última lectura.

**Independent Test**: Logueado, abrir popup de una estación → "Agregar a favoritos" → ir a `/favoritos` → ver la estación con lectura actual → desmarcar y verla desaparecer.

### Database

- [x] T069 [US4] Migración `supabase/migrations/0003_user_favorites.sql`: tabla con PK compuesta `(user_id, station_id)`, FKs a `auth.users` y `stations` con `ON DELETE CASCADE`, índice `(user_id, created_at DESC)`, RLS habilitada con políticas `select/insert/delete_own` y trigger `enforce_favorites_limit` (BEFORE INSERT) que aborta con `Máximo 10 estaciones favoritas por usuario` cuando se supera el tope.
- [x] T070 [US4] Aplicada con `supabase db push` y regenerados los tipos con `supabase gen types typescript --linked | Out-File -Encoding utf8` (per memoria `feedback-pwsh-utf8-redirect`). `user_favorites` ahora aparece en `src/types/database.ts`.

### Hook

- [x] T071 [P] [US4] `useFavorites()` en `src/hooks/useFavorites.ts` envuelve un `favoritesStore` (Zustand) con `Set<number>` deduplicado y `loadedForUserId` para evitar fetches repetidos entre consumidores. Expone `favorites`, `isFavorite`, `canAddMore`, `add`, `remove`. Hace `reset()` al cerrar sesión y `load()` al autenticarse. Limit pre-check en cliente + mapeo del error del trigger a "Has alcanzado el máximo de 10…". Caso `23505` (duplicate) es silent-success.
- [x] T072 [P] [US4] Tests de `useFavorites` (8: anónimo idle, load autenticado, add success, add con tope local, add con error de trigger, add duplicate 23505 silencioso, remove success, reset al cerrar sesión) en `src/hooks/useFavorites.test.ts`.
- [x] T072b [US4] `favoritesStore` (Zustand) en `src/stores/favoritesStore.ts` — fuente única para que `StationPopup`, `StationPanel`, `FavoritesPage` queden sincronizados sin múltiples fetches. Tests cubren su lógica indirectamente vía useFavorites.

### Components

- [x] T073 [P] [US4] `FavoriteButton` 32×32 icon button con estrella `lucide-react`, `aria-label` cambia entre "Agregar/Quitar de favoritos" + `aria-pressed`, estrella se rellena de `orange-600` cuando favorita. Disabled (sin click, con title tooltip) si se alcanzó el tope. Hidden si el usuario es anónimo. En `src/components/favorites/FavoriteButton.tsx`.
- [x] T074 [P] [US4] Tests de `FavoriteButton` (6: hidden en anónimo, agregar render, quitar render, click → insert + toast success, disabled al tope con tooltip, toast error en error del backend) en `src/components/favorites/FavoriteButton.test.tsx`.
- [x] T075 [P] [US4] `FavoriteCard` con badge de nivel, 3 contaminantes (reusa `PollutantCell`), timestamp, botón "Ver tendencias" (selecciona station + navigate /) y `Trash2` para quitar. En `src/components/favorites/FavoriteCard.tsx`.
- [x] T076 [P] [US4] Tests de `FavoriteCard` (4: render normal, branch sin-datos, remove → toast + store update, ver-tendencias → setSelectedStationId + navigate) en `src/components/favorites/FavoriteCard.test.tsx`.
- [x] T076b [US4] `PollutantCell` extraído a `src/components/ui/PollutantCell.tsx` y reusado en `StationPopup` y `FavoriteCard` — single source of truth para "label + valor + unidad" de un contaminante.
- [x] T077 [US4] `FavoritesList` con grid responsive (`sm:grid-cols-2`) y empty state ("Aún no tienes favoritos…" con icono estrella) en `src/components/favorites/FavoritesList.tsx`.
- [x] T078 [US4] `FavoritesPage` envuelta en `<AuthGate>`. Subcomponente `FavoritesContent` combina `useStations` + `useFavorites`, filtra y ordena por `favorites` (DESC `created_at` desde el fetch), muestra contador "N de 10 estaciones marcadas". En `src/pages/FavoritesPage.tsx`.
- [x] T079 [US4] `FavoriteButton` integrado en `StationPopup` (junto al botón "Ver tendencias", se oculta solo cuando es anónimo) y en `StationPanel` header (junto al botón cerrar). En `src/components/map/StationPopup.tsx` y `src/components/dashboard/StationPanel.tsx`.
- [x] T080 [US4] Ruta `/favoritos` ya estaba montada en `App.tsx` (Phase 2 T025). FavoritesPage ahora renderiza contenido real en lugar del stub.

**Checkpoint**: Favoritos completos. Sólo falta US5.

---

## Phase 7: User Story 5 - Configurar y recibir alertas (Priority: P5)

**Goal**: Usuario autenticado crea hasta 5 alertas (estación, contaminante, umbral, dirección). Una alerta dispara edge-triggered: una sola vez al cruzar el umbral; se re-arma cuando una medición posterior no cumple la condición. Toast en sesión activa; badge + toast resumen al volver. Historial de las últimas 20 entradas.

**Independent Test**: Logueado, crear "PM2.5 > 30 en Estación X" → insertar manualmente una lectura PM2.5 = 42 para Estación X → ver toast y entrada en historial; insertar otra PM2.5 = 50 sin que la condición se haya re-armado → ver que NO se dispara; insertar PM2.5 = 10 → la alerta se re-arma; insertar PM2.5 = 42 otra vez → vuelve a disparar.

### Database

- [ ] T081 [US5] Create migration `supabase/migrations/0004_alerts.sql` with `pollutant` and `alert_direction` ENUMs, `alerts` table, `is_armed` column, indexes, RLS policies, and `enforce_alerts_limit` trigger (BEFORE INSERT, max 5)
- [ ] T082 [US5] Create migration `supabase/migrations/0005_alert_history.sql` with `alert_history` table (including `seen` column and partial index `alert_history_unseen_idx`), RLS policies (select/update own), and add table to realtime publication
- [ ] T083 [US5] Create migration `supabase/migrations/0007_alert_trigger.sql` with the `evaluate_alerts()` PL/pgSQL function (SECURITY DEFINER, edge-triggered state machine on `is_armed`) and the `readings_evaluate_alerts_trigger` AFTER INSERT trigger
- [ ] T084 [US5] Create migration `supabase/migrations/0009_history_rotation_trigger.sql` with `rotate_alert_history()` function and AFTER INSERT trigger that keeps only 20 entries per user
- [ ] T085 [US5] Apply migrations and regenerate types: `supabase db reset && supabase gen types typescript --local > src/types/database.ts`
- [ ] T086 [US5] Manual DB-level verification: insert a sequence of readings via `psql` simulating arm/disarm cycles; confirm `alerts.is_armed` transitions and `alert_history` rows match expectations (documented test plan in `specs/001-air-quality-dashboard/quickstart.md`)

### Hooks

- [ ] T087 [P] [US5] Implement `useAlerts()` hook (list, create, delete; map limit-reached error to "Máximo 5 alertas. Elimina una existente para crear otra.") in `src/hooks/useAlerts.ts`
- [ ] T088 [P] [US5] Write integration tests for `useAlerts` (CRUD + limit error path) in `src/hooks/useAlerts.test.ts`
- [ ] T089 [P] [US5] Implement `useAlertHistory()` hook (initial fetch, mark-seen mutation, realtime subscription to own rows) in `src/hooks/useAlertHistory.ts`
- [ ] T090 [P] [US5] Write integration tests for `useAlertHistory` covering fetch, mark-seen, and realtime INSERT handling in `src/hooks/useAlertHistory.test.ts`

### Store

- [ ] T091 [P] [US5] Implement `alertStore` (Zustand) with `unseenCount`, `history[]`, `incrementUnseen(row)`, `markAllSeen()` in `src/stores/alertStore.ts`
- [ ] T092 [P] [US5] Write unit tests for `alertStore` state transitions in `src/stores/alertStore.test.ts`

### Components

- [ ] T093 [P] [US5] Implement `AlertForm` (station picker filtered to user's favorites + free search, pollutant select, threshold input, direction toggle, submit) in `src/components/alerts/AlertForm.tsx`
- [ ] T094 [P] [US5] Write integration test for `AlertForm` covering valid submit and limit-reached error in `src/components/alerts/AlertForm.test.tsx`
- [ ] T095 [P] [US5] Implement `AlertList` (active alerts with delete button, empty state with "Crea tu primera alerta") in `src/components/alerts/AlertList.tsx`
- [ ] T096 [P] [US5] Write component test for `AlertList` covering render, delete, empty branches in `src/components/alerts/AlertList.test.tsx`
- [ ] T097 [P] [US5] Implement `AlertHistory` (20 most recent triggers, descending; marks all as seen on mount via `useAlertHistory.markAllSeen()`) in `src/components/alerts/AlertHistory.tsx`
- [ ] T098 [P] [US5] Write component test for `AlertHistory` covering render, mark-seen on mount, empty branch in `src/components/alerts/AlertHistory.test.tsx`
- [ ] T099 [P] [US5] Implement `AlertBadge` (red circle with `unseenCount` in `Header`; hidden when 0) in `src/components/alerts/AlertBadge.tsx`
- [ ] T100 [P] [US5] Write component test for `AlertBadge` covering visible/hidden states in `src/components/alerts/AlertBadge.test.tsx`
- [ ] T101 [US5] Implement `AlertsPage` (tabs "Mis alertas" / "Historial" + "Nueva alerta" button opening `AlertForm` in a dialog) wrapped in `AuthGate` in `src/pages/AlertsPage.tsx`
- [ ] T102 [US5] Wire `Header` to render `AlertBadge` linked to `/alertas` (only when authenticated) in `src/components/layout/Header.tsx`
- [ ] T103 [US5] Bootstrap session-start summary toast: in `App.tsx`, after `authStore` becomes authenticated, query unseen count once and if > 0 emit a single `toast.info("Tienes N alertas nuevas")` in `src/App.tsx`
- [ ] T104 [US5] Wire realtime INSERT on `alert_history` (via `useAlertHistory`) to emit per-trigger `toast.info(...)` while app is open in `src/hooks/useAlertHistory.ts`
- [ ] T105 [US5] Mount `/alertas` route to `AlertsPage` in `src/App.tsx`

**Checkpoint**: Todas las historias completas. App es feature-complete contra el spec.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Pulir lo que cruza historias y dejar el portafolio listo para mostrar.

- [ ] T106 [P] Verify responsiveness at 360 px for `HomePage` (mapa + popup), `StationPanel` (charts), `LoginPage`, `RegisterPage`, `FavoritesPage`, `AlertsPage`; fix any horizontal scroll or overlap in the relevant component files
- [ ] T107 [P] Add `ReconnectingIndicator` component reflecting Realtime channel status (CONNECTING / DISCONNECTED) in `src/components/layout/ReconnectingIndicator.tsx`
- [ ] T108 [P] Wire `ReconnectingIndicator` into `Header` using channel status exposed by the realtime hooks in `src/components/layout/Header.tsx`
- [ ] T109 [P] Manual test of the "no data yet" first-boot path: empty DB → confirm map shows all-gray markers + banner; documented in `specs/001-air-quality-dashboard/quickstart.md`
- [ ] T110 [P] Schedule the `ingest-openaq` Edge Function in Supabase Cloud at `*/15 * * * *` via `supabase functions schedule create ingest-openaq --cron "*/15 * * * *"` (one-off ops step)
- [ ] T111 [P] Deploy to Vercel with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configured in project env vars (one-off ops step)
- [ ] T112 [P] Run a coverage report (`npm run test:coverage`) and confirm thresholds pass on `src/hooks/`, `src/utils/`, `src/stores/`. Fix any shortfalls by adding missing tests in the corresponding `.test.ts(x)` files
- [ ] T113 [P] Write `README.md` at repo root with project pitch (in Spanish summary, English body), screenshots of map + panel + alerts, setup steps cross-linking `specs/001-air-quality-dashboard/quickstart.md`, and tech stack badges
- [ ] T114 [P] Capture 3 screenshots (`docs/screenshots/map.png`, `dashboard.png`, `alerts.png`) for the README
- [ ] T115 Run the full Quality Gates checklist from constitution (build / typecheck / lint / tests + coverage / security review / architectural review / UX review) and resolve any failures
- [ ] T116 Final pass: open the deployed Vercel URL, walk through US1→US5 as a user (no DevTools), confirm Spanish copy is correct and tones are consistent, record a 60-second screencast for the portfolio

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: no dependencies — starts immediately.
- **Phase 2 (Foundational)**: depends on Phase 1. BLOCKS all user stories.
- **Phase 3 (US1)**: depends on Phase 2.
- **Phase 4 (US2)**: depends on Phase 2; reuses `StationMarker`/`StationPopup` from US1 (T056 modifies a US1 file, so US2 should start after T044 is done in practice, even though phases are formally independent).
- **Phase 5 (US3)**: depends on Phase 2. Independent of US1/US2 functionally.
- **Phase 6 (US4)**: depends on Phase 2 + Phase 5 (needs auth) + US1 (FavoriteButton inserted into `StationPopup`).
- **Phase 7 (US5)**: depends on Phase 2 + Phase 5. Trigger-based; independent from US1/US2/US4 at the DB level, but `AlertBadge` lives in the same `Header` that US3 edits.
- **Phase 8 (Polish)**: depends on the user stories you choose to ship. Polish tasks are mostly per-story-independent.

### Within each user story

- Hooks/store before components that use them.
- Tests written alongside the code being shipped (constitution VI).
- Wire-up tasks (those that edit shared files like `App.tsx` or `Header.tsx`) cannot be parallel with each other.

### Parallel opportunities

- All [P] tasks in Phase 1 (T002–T010) run in parallel.
- All [P] tasks in Phase 2's "Frontend foundation" group (T016–T024, T027) run in parallel; database tasks T011–T014 are sequential (they share migration ordering).
- Inside each user story, all [P] tasks can be split across hands (hooks, store, individual components).
- US1 → US2 → US3 → US4 → US5 is the natural priority sequence; but US3 (auth) can be developed in parallel with US1+US2 by a second developer since it doesn't touch the map.

---

## Implementation Strategy

### MVP-First (recommended)

1. Complete Phase 1 (Setup) — Day 1.
2. Complete Phase 2 (Foundational) — Days 1–3 (includes deploying the ingestion to local Supabase).
3. Complete Phase 3 (US1) — Days 3–5. **STOP and validate**: a recruiter visiting the URL gets the wow with no login.
4. Deploy MVP to Vercel + Supabase Cloud, schedule cron. **This is shippable.**

### Incremental delivery (10–12 day plan per user input)

| Days  | Phase                           | Outcome                                                  |
| ----- | ------------------------------- | -------------------------------------------------------- |
| 1     | Phase 1 (Setup) + start Phase 2 | Project skeleton + tooling.                              |
| 2–3   | Phase 2 (Foundational)          | Public DB schema, ingestion live, app shell.             |
| 3–5   | Phase 3 (US1)                   | Map + popup + colors. MVP shippable.                     |
| 5–6   | Phase 4 (US2)                   | Realtime trends.                                         |
| 6–7   | Phase 5 (US3)                   | Auth.                                                    |
| 7–8   | Phase 6 (US4)                   | Favoritos.                                               |
| 8–11  | Phase 7 (US5)                   | Alertas (más complejo: trigger + state machine + tests). |
| 11–12 | Phase 8 (Polish)                | Responsive sweep, README + screenshots, deploy.          |

### Parallel team strategy (no aplica — eres solo)

Listada en plan.md por completitud; ignorable para un solo desarrollador.

---

## Notes

- Tests (`.test.ts` / `.test.tsx`) viven **co-localizados** con el archivo que prueban, por la constitución VI. No hay carpeta `tests/` separada.
- Migraciones SQL no se modifican una vez aplicadas en remoto; cambios se hacen vía migraciones nuevas con timestamp posterior.
- Cada wave (Setup / Foundational / cada US / Polish) termina con un commit convencional (`feat:`, `fix:`, `chore:`).
- El pre-commit hook bloquea commits que rompen ESLint/Prettier/tests-afectados; no usar `--no-verify`.
- Si una historia opcional (US4 o US5) se descarta para llegar a tiempo, el MVP que se mantiene (US1+US2+US3) sigue siendo coherente y demostrable.
