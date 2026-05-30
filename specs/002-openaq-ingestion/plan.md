# Implementation Plan: Ingesta real de calidad del aire (OpenAQ)

**Branch**: `002-openaq-ingestion` (en `main` por el modelo de branch del proyecto) | **Date**: 2026-05-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-openaq-ingestion/spec.md`

## Summary

Reemplazar el seed sintético por datos reales de calidad del aire de la red chilena (OpenAQ v3), ingestados del lado del servidor cada 15 minutos, **sin tocar el frontend ni el esquema de datos**. Tres piezas en Supabase Edge Functions (Deno): un cliente compartido tipado de OpenAQ v3, una función `seed-stations` de carga única del catálogo, y una función `ingest-openaq` programada cada 15 min que toma el snapshot por estación, descarta mediciones rancias/ inválidas (regla R-fresh por contaminante), pivotea long→wide y hace upsert idempotente en `readings`. Más una migración de limpieza del seed sintético y el agendado del cron. La capa de tiempo real existente propaga las nuevas lecturas al mapa automáticamente.

## Technical Context

**Language/Version**: TypeScript sobre **Deno** (runtime de Supabase Edge Functions).

**Primary Dependencies**: `@supabase/supabase-js` (cliente con `service_role`), API REST de **OpenAQ v3** (`https://api.openaq.org/v3`), librería estándar de Deno. Cero dependencias nuevas en el frontend.

**Storage**: PostgreSQL existente (Supabase Cloud) — tablas `stations` y `readings` reutilizadas **sin cambios de esquema**. Única operación DDL/DML nueva: una migración de datos que borra el seed sintético (ids 1–13).

**Testing**: `deno test` sobre la lógica pura (normalización long→wide, validación de rango, regla de frescura, mapeo sensor→contaminante) con `fetch` mockeado. No se golpea la API real ni la BD en tests.

**Target Platform**: Supabase Edge Functions (Deno Deploy) + cron de Supabase Cloud.

**Project Type**: Backend serverless aditivo a la web app existente — vive en `supabase/functions/`, no toca `src/`.

**Performance Goals**: cada ciclo de ingesta completa dentro de la ventana de 15 min; ~112 peticiones por ciclo a `/locations/{id}/latest` con throttling para no superar el rate limit del free tier (~60 req/min).

**Constraints**: idempotencia (re-ejecutar un ciclo no duplica filas); tolerancia a fallos del proveedor (un ciclo fallido no rompe nada, el siguiente recupera); el frontend nunca llama OpenAQ; `service_role` y `OPENAQ_API_KEY` solo del lado del servidor.

**Scale/Scope**: ~150 estaciones chilenas (~112 frescas), 3 contaminantes (pm10=1, pm25=2, o3=3), ciclo cada 15 min.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio                                   | Cumplimiento                                                                                                                                                                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Type Safety & Code Quality**           | ✅ TypeScript estricto en Deno; tipos literales del payload de OpenAQ en `_shared/openaq.ts`; nombres `snake_case` en SQL.                                                                                                    |
| **II. Architectural Boundaries**            | ✅ **Este feature ES la frontera**: la ingesta de OpenAQ vive solo en Edge Functions; el frontend sigue leyendo únicamente de Supabase.                                                                                       |
| **III. Security by Default**                | ✅ `OPENAQ_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY` solo en el entorno de la Edge Function, nunca en el cliente. RLS de `stations`/`readings` ya habilitada; las escrituras pasan por `service_role` (correcto).                |
| **IV. User-Visible Quality**                | ✅ N/A directo (sin cambios de UI); el feature mejora la calidad de datos que ya consume la UI (estados loading/error/empty existentes intactos).                                                                             |
| **V. Conventional Workflow & Modular Code** | ✅ Commits convencionales; un módulo compartido + una función por carpeta.                                                                                                                                                    |
| **VI. Testing Discipline**                  | ✅ Tests Deno co-localizados sobre la lógica pura, `fetch` mockeado. El gate de coverage de Vitest (70% sobre `src/**`) no aplica a `supabase/functions/**` (es Deno), pero la disciplina de tests se cumple con `deno test`. |

**Veredicto**: sin violaciones. Complexity Tracking vacío.

## Project Structure

### Documentation (this feature)

```text
specs/002-openaq-ingestion/
├── plan.md              # Este archivo
├── research.md          # Phase 0: decisiones (rate-limit, frescura, cron, migración)
├── data-model.md        # Phase 1: reuso de esquema + migración de limpieza
├── quickstart.md        # Phase 1: pasos de despliegue y verificación
├── contracts/
│   └── ingestion.md     # Phase 1: contrato resuelto (referencia + deltas del 001)
└── tasks.md             # Phase 2 output (/speckit-tasks — NO lo crea /speckit-plan)
```

### Source Code (repository root)

```text
supabase/
├── functions/
│   ├── _shared/
│   │   ├── openaq.ts            # cliente v3: tipos, fetchLocations, fetchLocationLatest,
│   │   │                        #   PARAM_ID, isInvalidReading, isStale, normalize long→wide
│   │   └── openaq.test.ts       # deno test de la lógica pura (fetch mockeado)
│   ├── seed-stations/
│   │   └── index.ts             # carga única: /locations?parameters_id=1,2,3&bbox=Chile → upsert stations
│   └── ingest-openaq/
│       └── index.ts             # cron */15: por estación fresca → /locations/{id}/latest →
│                                #   filtrar R-fresh/inválidos → wide → upsert readings
└── migrations/
    └── 0013_remove_synthetic_seed.sql   # DELETE stations/readings ids 1–13 (cascade)

# src/ NO se toca (FR-012). frontend, esquema y realtime intactos.
```

**Structure Decision**: backend serverless aditivo. Todo el código nuevo vive bajo `supabase/functions/` (Deno) + una migración de datos. El frontend (`src/`) y el esquema de tablas quedan sin cambios; la única migración es borrado de datos sintéticos, no DDL.

## Complexity Tracking

> Sin violaciones de la Constitución → tabla vacía.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| —         | —          | —                                    |
