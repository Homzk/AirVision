---
description: 'Task list for AirVision feature 002 — Ingesta real de calidad del aire (OpenAQ)'
---

# Tasks: Ingesta real de calidad del aire (OpenAQ)

**Input**: Design documents from `/specs/002-openaq-ingestion/`

**Prerequisites**: plan.md (✅), spec.md (✅), research.md (✅), data-model.md (✅), contracts/ (✅), quickstart.md (✅)

**Tests**: **MANDATORY** — la constitución (`.specify/memory/constitution.md`, Principio VI) exige tests junto al código. Para este feature (Deno) son tests `deno test` sobre la lógica pura de `_shared/openaq.ts` con `fetch` mockeado; no se golpea la API real ni la BD.

**Organization**: Tareas agrupadas por historia de usuario. Las 3 historias comparten las Edge Functions, por eso el módulo compartido `_shared/openaq.ts` (con toda la lógica pura) vive en Foundational y bloquea a `seed-stations` y `ingest-openaq`.

> **Estado de implementación (2026-06-01)**: **FEATURE COMPLETA — 21/21 tareas**. Todo el **código** está escrito y **verificado con Deno 2.8.1**: `deno test` **11/11 en verde**, `deno check` (ambas funciones type-chequean con todo el árbol de `supabase-js`), `deno fmt --check` limpio. El cron `*/15` está **agendado y verificado en vivo** (migraciones `0016`/`0017`); `ingest-openaq` escribió 102 readings reales en la corrida de verificación. **Añadidos fuera del plan original**: (1) migración `0014_ingest_readings_fn.sql` — RPC para el upsert `COALESCE` (FR-006), porque `supabase-js .upsert()` sobrescribe NULLs y borraría valores parciales; (2) migración `0016_schedule_ingest_cron.sql` + `0017_cron_http_timeout.sql` — el cron vía `pg_cron`+`pg_net` (T013); (3) **fix de drift de catálogo**: `ingest-openaq` filtra las estaciones a las presentes en `stations` para evitar que estaciones nuevas de OpenAQ aborten el batch upsert por FK violation; (4) `console.log` del summary para observabilidad del cron (T020).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (otro archivo, sin dependencias incompletas)
- **[Story]**: US1 / US2 / US3 — Setup, Foundational y Polish no llevan etiqueta de historia
- Cada tarea incluye su ruta de archivo exacta

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Estructura de las Edge Functions y tooling de Deno.

- [x] T001 Crear la estructura de carpetas de funciones (reemplaza el stub `_shared/.gitkeep`): `supabase/functions/_shared/`, `supabase/functions/seed-stations/`, `supabase/functions/ingest-openaq/`
- [x] T002 [P] Configurar Deno para las funciones en `supabase/functions/deno.json` (tasks `test`/`fmt`/`lint`, imports de `@supabase/supabase-js` y `std`)
- [x] T003 [P] Verificar que `.env.example` ya documenta `OPENAQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (existen desde Phase 1 del 001); no agregar secrets reales

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Módulo compartido `_shared/openaq.ts` con TODA la lógica pura (cliente, validación, frescura, normalización). Lo consumen ambas funciones.

**⚠️ CRITICAL**: Ninguna historia puede implementarse hasta completar esta fase.

- [x] T004 Definir tipos y constantes del payload v3 en `supabase/functions/_shared/openaq.ts`: `PARAM_ID = { pm10:1, pm25:2, o3:3 }`, tipo `Pollutant`, interfaces `OpenAQLocation` y `OpenAQLatest`
- [x] T005 Implementar el cliente HTTP en `supabase/functions/_shared/openaq.ts`: header `X-API-Key`, reintentos con backoff exponencial 1s/2s/4s ante 429/5xx, paginación automática — `fetchLocations(bbox)` (async iterable) y `fetchLocationLatest(locationId)`
- [x] T006 Implementar validación y frescura en `supabase/functions/_shared/openaq.ts`: `isInvalidReading(pollutant, value)` (negativo o > 10× umbral hazardous) e `isStale(measuredAtUtc, maxAgeHours=3)` (regla R-fresh)
- [x] T007 Implementar la normalización long→wide en `supabase/functions/_shared/openaq.ts`: `normalizeLatest(locationId, latest[], sensorCatalog)` que agrupa por `(locationsId, datetime.utc)`, mapea `sensorsId→pollutant`, descarta inválidos y rancios, y emite filas `{ station_id, measured_at, pm25?, pm10?, o3? }`
- [x] T008 Tests Deno de la lógica pura en `supabase/functions/_shared/openaq.test.ts` (`fetch` mockeado): paginación, retry/backoff, `isInvalidReading`, `isStale` (límite de frescura), mapeo sensor→contaminante, y `normalizeLatest` (cobertura parcial, sensor muerto descartado, duplicado por (estación,instante))

**Checkpoint**: módulo compartido listo y probado → las dos funciones pueden construirse.

---

## Phase 3: User Story 1 - Ver estaciones reales en el mapa (Priority: P1) 🎯 MVP

**Goal**: Poblar el catálogo `stations` con la red chilena real y eliminar el seed sintético, de modo que el mapa muestre >100 estaciones reales y ninguna falsa.

**Independent Test**: invocar `seed-stations`, aplicar la migración de limpieza, y confirmar en Studio ~150 estaciones `country_code='CL'` y 0 estaciones con id 1–13.

- [x] T009 [US1] Implementar la Edge Function `seed-stations` en `supabase/functions/seed-stations/index.ts`: `fetchLocations(bboxChile)` con `?parameters_id=1,2,3` → mapear a `stations` (id=`location.id`, name, city=`locality`, lat/lon=`coordinates`, country_code=`country.code`) → upsert `ON CONFLICT (id) DO UPDATE` con `service_role` → responder `{ ok, summary:{ stations_upserted } }`
- [x] T010 [US1] Crear la migración de limpieza en `supabase/migrations/0013_remove_synthetic_seed.sql`: `DELETE FROM stations WHERE id BETWEEN 1 AND 13;` (arrastra `readings` por `ON DELETE CASCADE`; idempotente)
- [x] T011 [US1] Verificación (quickstart §2–§5): desplegar e invocar `seed-stations`, aplicar `0013` con `supabase db push`, confirmar ~150 estaciones CL reales y 0 sintéticas en el mapa

**Checkpoint**: el mapa muestra la red real sin estaciones falsas (US1 demostrable).

---

## Phase 4: User Story 2 - Datos que se actualizan solos (Priority: P1)

**Goal**: Ingerir mediciones reales cada 15 min de forma automática, poblando `readings` sin intervención manual; el realtime existente refresca el mapa.

**Independent Test**: invocar `ingest-openaq` y ver `readings` nuevas; esperar un ciclo del cron y confirmar que `max(measured_at)` avanza solo; con el mapa abierto, los marcadores se repintan en vivo.

- [x] T012 [US2] Implementar la Edge Function `ingest-openaq` en `supabase/functions/ingest-openaq/index.ts`: cargar los `station_id` (SELECT de `stations`) → por cada uno `fetchLocationLatest(id)` con throttling (<60 req/min) → `normalizeLatest` → upsert batch a `readings` `ON CONFLICT (station_id, measured_at) DO UPDATE COALESCE` con `service_role` → responder `{ ok, summary }`. Siempre 200 aunque OpenAQ falle
- [x] T013 [US2] Agendar el cron `*/15 * * * *` para `ingest-openaq` en Supabase Cloud (dashboard → Schedules, o `pg_cron` + `pg_net`); `seed-stations` NO se agenda — paso de ops documentado en quickstart §6 — **HECHO** vía migración `0016_schedule_ingest_cron.sql` (`pg_cron`+`pg_net`), aplicada con `supabase db push` el 2026-06-01
- [x] T014 [US2] Verificación (quickstart §4, §7): invocar `ingest-openaq` (summary con `rows_upserted>0`), esperar >15 min y confirmar que entran lecturas solas, y que el marcador se actualiza en vivo sin recargar

**Checkpoint**: datos reales fluyen automáticamente; resuelve la deuda #6 (US1 + US2 operativas).

---

## Phase 5: User Story 3 - Datos confiables, nunca rancios ni absurdos (Priority: P2)

**Goal**: Garantizar que `ingest-openaq` aplica la frescura por-contaminante y el descarte de inválidos, de modo que un sensor muerto no surfacee valores de hace años y ningún valor imposible se almacene.

**Independent Test**: una estación con O₃ inactivo muestra PM2.5/PM10 actuales y O₃ "sin datos recientes" (no un valor de 2021); ningún valor negativo/absurdo llega a `readings`.

- [x] T015 [US3] Cablear en `supabase/functions/ingest-openaq/index.ts` el filtrado vía `isStale` e `isInvalidReading` (ya aplicados dentro de `normalizeLatest`) y exponer los conteos `skipped_stale` y `skipped_invalid` en el `summary` (FR-010)
- [x] T016 [US3] Extender los tests Deno en `supabase/functions/_shared/openaq.test.ts` con los casos foco de US3: sensor muerto (O₃ con `datetime` de 2021) descartado mientras PM2.5/PM10 frescos pasan; valor negativo y outlier descartados; reporte parcial que conserva el valor previo (semántica COALESCE a nivel de fila normalizada)
- [x] T017 [US3] Verificación (quickstart §7): tomar una estación con O₃ inactivo y confirmar PM2.5/PM10 actuales + O₃ sin datos recientes; confirmar `skipped_stale>0` en el summary del primer ciclo

**Checkpoint**: las tres historias operativas; la calidad de datos está garantizada.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: cerrar deuda, documentación y validación end-to-end.

- [x] T018 [P] Resolver la deuda #6 en `NOTES.md` (ya hay ingesta automática) y mover la "Ingesta real desde OpenAQ" del bloque _Diferido_ al estado hecho en el Roadmap de `README.md`, una vez el cron esté en vivo
- [x] T019 [P] Actualizar `specs/001-air-quality-dashboard/quickstart.md`: el escenario de datos rancios deja de ser el estado estacionario en prod (ahora se repone solo)
- [x] T020 Confirmar observabilidad (FR-010): el `summary { rows_upserted, skipped_stale, skipped_invalid, errors, duration_ms }` queda en los logs de la función — `console.log(JSON.stringify({event:'ingest-openaq', ...summary}))` añadido y redeployado (necesario porque el cron invoca por `pg_net` y nadie lee el body)
- [x] T021 Ejecutar la validación end-to-end de `quickstart.md` (7 pasos) y confirmar SC-001…SC-006 — **VERIFICADO 2026-06-01**: invoke real escribió `rows_upserted: 102`, `skipped_stale: 52`; `max(measured_at)` avanzó de `2026-05-31T02:00` a `2026-06-01T17:00`. **Bug encontrado y corregido**: la drift del catálogo de OpenAQ (estaciones nuevas no presentes en `stations`) provocaba un FK violation que abortaba el batch entero (`rows_upserted: 0`); `ingest-openaq` ahora filtra `freshStationIds` contra la tabla `stations`. Throttle bajado a 350 ms (500 ms excedía el wall-clock con ~107 estaciones frescas).

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: sin dependencias.
- **Phase 2 (Foundational)**: depende de Setup. **BLOQUEA** todas las historias (ambas funciones importan `_shared/openaq.ts`).
- **Phase 3 (US1)**: depende de Foundational. Entrega el catálogo real (MVP del feature).
- **Phase 4 (US2)**: depende de Foundational. Independiente de US1 a nivel de código, pero la verificación tiene más sentido con el catálogo real ya cargado (US1).
- **Phase 5 (US3)**: depende de US2 (afina el comportamiento de `ingest-openaq`); la lógica que aplica (`isStale`/`isInvalidReading`) ya existe desde Foundational.
- **Phase 6 (Polish)**: depende de tener el cron en vivo.

### Within each phase

- En Foundational, T004→T005→T006→T007 editan el MISMO archivo (`_shared/openaq.ts`) → **secuenciales**; T008 (tests) después.
- Hooks/lógica antes que las funciones que la usan; tests junto al código (Constitución VI).

### Parallel opportunities

- Setup: T002 y T003 en paralelo.
- Tras Foundational, `seed-stations` (US1) e `ingest-openaq` (US2) son archivos distintos → pueden trabajarse en paralelo.
- Polish: T018 y T019 en paralelo.

---

## Implementation Strategy

### MVP-First

1. Phase 1 (Setup) + Phase 2 (Foundational con su test) — el módulo compartido es el núcleo.
2. Phase 3 (US1): catálogo real + limpieza del seed. **STOP y validar**: el mapa muestra estaciones reales.
3. Phase 4 (US2): ingesta automática + cron. Resuelve la deuda #6. Feature shippable.
4. Phase 5 (US3): garantías de calidad. Phase 6: pulido.

### Notas

- Tests (`*.test.ts`) co-localizados con Deno (`deno test`), no en carpeta aparte (Constitución VI).
- `src/` NO se toca (FR-012): cero cambios de frontend y de esquema (salvo la migración de datos `0013`).
- Migraciones aplicadas no se editan; cambios vía migración nueva.
- Cada wave termina con un commit convencional; no usar `--no-verify`.
- Secrets (`OPENAQ_API_KEY`, `SERVICE_ROLE`) solo del lado del servidor; nunca en el cliente (Constitución III).
