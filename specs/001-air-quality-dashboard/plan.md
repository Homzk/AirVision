# Implementation Plan: Dashboard de Calidad del Aire en Tiempo Real

**Branch**: `001-air-quality-dashboard` | **Date**: 2026-05-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-air-quality-dashboard/spec.md`

## Summary

AirVision MVP: dashboard web público en español que muestra la calidad
del aire en estaciones de Chile sobre un mapa interactivo, con paneles
de tendencias en tiempo real, autenticación email+password y dos
funciones para usuarios registrados — favoritos y alertas configurables
edge-triggered. La arquitectura replica un sistema IoT real:
**OpenAQ v3 = sensores/gateway**, **Edge Function programada cada 15 min
= ingesta**, **Supabase (PostgreSQL + Auth + Realtime) = backend
central**, **React + Vite = app de visualización**. La evaluación de
alertas vive en un trigger PL/pgSQL sobre `readings` para mantener la
semántica edge-triggered transaccional. Plazo objetivo: 10–12 días de
trabajo.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Deno (Edge Functions),
PostgreSQL 15 (Supabase), Node 20 (frontend tooling).

**Primary Dependencies**: React 18, Vite 5, Tailwind CSS 3, shadcn/ui,
Recharts, Leaflet + `react-leaflet`, Zustand, `@supabase/supabase-js`,
`sonner` (toasts), Vitest + `@vitest/coverage-v8` + React Testing Library,
ESLint + Prettier, Husky + lint-staged.

**Storage**: PostgreSQL via Supabase Cloud, 5 tablas (`stations`,
`readings`, `user_favorites`, `alerts`, `alert_history`). Retención de
`readings` ≥ 30 días. RLS habilitado en todas.

**Testing**: Vitest + React Testing Library; tests co-localizados con
sufijo `.test.ts(x)`. Coverage mínima 70% en `src/hooks/`, `src/utils/`,
`src/stores/`. Playwright fuera de alcance MVP (constitución VI).

**Target Platform**: Navegadores modernos (Chrome/Firefox/Safari/Edge
últimas 2 versiones). Mobile-first ≥ 360 px. Vercel hospeda el frontend;
Supabase Cloud hospeda DB + Auth + Realtime + Edge Functions.

**Project Type**: Web application (frontend SPA + backend-as-a-service).

**Performance Goals**: Color del marcador identificable en ≤ 10 s tras
carga (SC-001); nuevo punto en gráfico en ≤ 5 s desde inserción (SC-002);
add/remove favorito en ≤ 3 s (SC-004); frescura de datos ≤ 20 min
(SC-005). Tiempos de bundle: First Contentful Paint < 2 s en 4G.

**Constraints**: Frontend NUNCA llama OpenAQ directamente
(constitución II). `service_role` NUNCA en el cliente (constitución III).
RLS obligatorio (constitución III). UI 100% en español (constitución IV).
Operable a 360 px sin scroll horizontal (constitución IV + FR-035).

**Scale/Scope**: Portfolio demo. ~50 estaciones de Chile reportando
OpenAQ; ~30 mediciones/estación/día → ~45k filas de `readings` por mes,
manejable sin clustering ni particionado. Decenas de usuarios
registrados (escala personal/demo). 5 alertas × N usuarios ≤ algunos
cientos → trigger PL/pgSQL es viable.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle                                           | Status  | Evidence                                                                                                                                                                                                                                                                                                                                     |
| --- | --------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | Type Safety & Code Quality                          | ✅ PASS | TypeScript estricto en frontend; Deno (TS) en Edge Functions. ESLint + Prettier configurados (Phase 1 setup). Naming conventions definidas en data-model (snake_case en BD) y en estructura de carpetas (PascalCase componentes, useDescriptiveName hooks).                                                                                  |
| II  | Architectural Boundaries (Frontend ↛ External APIs) | ✅ PASS | Frontend sólo consume Supabase (`@supabase/supabase-js`). La única invocación a OpenAQ vive en Edge Functions (`supabase/functions/ingest-openaq/`, `seed-stations/`). Todos los accesos a Supabase encapsulados en hooks (`useStations`, `useReadings`, `useFavorites`, `useAlerts`, `useAuth`).                                            |
| III | Security by Default (RLS & Secret Hygiene)          | ✅ PASS | RLS habilitado en las 5 tablas (políticas en `0006_rls_policies.sql`). `stations` y `readings` SELECT público; `user_favorites`, `alerts`, `alert_history` gated por `auth.uid() = user_id`. Writes a tablas públicas y a `alert_history` (vía trigger) sólo desde `service_role`. `.env*` en `.gitignore`; `.env.example` con placeholders. |
| IV  | User-Visible Quality (Portfolio-Grade UX)           | ✅ PASS | UI en español; loading/error/empty states son FR-034. 360 px verificado (FR-035). Tailwind + shadcn/ui. README con screenshots y setup (tarea de Polish).                                                                                                                                                                                    |
| V   | Conventional Workflow & Modular Code                | ✅ PASS | Commits convencionales (`feat:`, `fix:`, etc.). Branch ya creada (`001-air-quality-dashboard`). Cada componente en su archivo. Supabase queries encapsulados en hooks (no en componentes).                                                                                                                                                   |
| VI  | Testing Discipline                                  | ✅ PASS | Vitest + RTL configurados desde Phase 1. Tests co-localizados. Coverage gate ≥ 70% en `src/hooks/`, `src/utils/`, `src/stores/` configurado en `vitest.config.ts`. Husky + lint-staged corre `vitest related` en pre-commit. GitHub Actions corre `vitest --run --coverage` en cada PR. Playwright diferido.                                 |

**Quality Gates (`Development Workflow & Quality Gates`)**: todos los
gates 1–7 quedarán cubiertos por la CI de GitHub Actions y por revisión
manual (security/architectural/UX checks listados como ítems de Polish).

**Resultado**: Sin violaciones. La sección "Complexity Tracking" queda
vacía.

## Project Structure

### Documentation (this feature)

```text
specs/001-air-quality-dashboard/
├── plan.md              # This file
├── research.md          # Phase 0 output (technology decisions, alternatives)
├── data-model.md        # Phase 1 output (5-table schema, RLS, trigger)
├── quickstart.md        # Phase 1 output (dev setup, deploy)
├── contracts/
│   ├── edge-functions.md       # ingest-openaq + seed-stations contracts
│   ├── realtime-channels.md    # Realtime topics & payload shapes
│   └── database-rpc.md         # SQL helpers exposed to the client
├── checklists/
│   └── requirements.md  # Spec quality checklist (passed)
└── tasks.md             # Phase 2 output (NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── auth/                    # LoginForm.tsx, RegisterForm.tsx, AuthGate.tsx
│   ├── map/                     # MapView.tsx, StationMarker.tsx, StationPopup.tsx, MapLegend.tsx
│   ├── dashboard/               # StationPanel.tsx, ChartPanel.tsx, PollutantChart.tsx, RangeSelector.tsx
│   ├── favorites/               # FavoritesPage.tsx, FavoritesList.tsx, FavoriteCard.tsx, FavoriteButton.tsx
│   ├── alerts/                  # AlertsPage.tsx, AlertForm.tsx, AlertList.tsx, AlertHistory.tsx, AlertBadge.tsx
│   ├── layout/                  # AppShell.tsx, Header.tsx, MobileNav.tsx
│   └── ui/                      # shadcn primitives (Button, Dialog, Input, Toast)
├── hooks/
│   ├── useAuth.ts               # session + signUp/signIn/signOut
│   ├── useStations.ts           # list stations + latest reading per station
│   ├── useStationReadings.ts    # time-range query for a single station
│   ├── useReadingsRealtime.ts   # subscribe to readings inserts
│   ├── useFavorites.ts          # CRUD favorites
│   ├── useAlerts.ts             # CRUD alerts
│   └── useAlertHistory.ts       # list + mark-seen + realtime
├── stores/
│   ├── authStore.ts             # Zustand: current user, session
│   ├── dashboardStore.ts        # Zustand: selected station, time range
│   └── alertStore.ts            # Zustand: unseen count, toast queue
├── lib/
│   ├── supabase.ts              # createClient(anon)
│   └── airQuality.ts            # OMS thresholds, worst-of, level/color helpers
├── utils/
│   ├── date.ts                  # formatters, range → timestamp
│   └── constants.ts             # pollutant labels, units, default map view
├── pages/
│   ├── HomePage.tsx             # map + side panel
│   ├── FavoritesPage.tsx
│   ├── AlertsPage.tsx
│   ├── LoginPage.tsx
│   └── RegisterPage.tsx
├── types/
│   └── database.ts              # generated by `supabase gen types`
├── App.tsx
├── main.tsx
└── index.css                    # Tailwind directives + custom CSS vars

supabase/
├── migrations/
│   ├── 0001_stations.sql
│   ├── 0002_readings.sql
│   ├── 0003_user_favorites.sql
│   ├── 0004_alerts.sql
│   ├── 0005_alert_history.sql
│   ├── 0006_rls_policies.sql
│   ├── 0007_alert_trigger.sql
│   ├── 0008_alert_limits_trigger.sql
│   ├── 0009_history_rotation_trigger.sql
│   ├── 0010_latest_reading_view.sql
│   └── 0011_realtime_publication.sql
├── functions/
│   ├── ingest-openaq/index.ts   # scheduled cron, every 15 min
│   ├── seed-stations/index.ts   # one-shot bootstrap
│   └── _shared/openaq.ts        # OpenAQ client + types
└── config.toml

.github/workflows/
└── ci.yml                       # lint, type-check, vitest --coverage

.husky/
└── pre-commit                   # runs lint-staged

.env.example
.gitignore                       # includes .env*
package.json
vite.config.ts
vitest.config.ts                 # coverage thresholds for hooks/utils/stores
tsconfig.json
tailwind.config.ts
components.json                  # shadcn/ui config
postcss.config.cjs
README.md
```

**Structure Decision**: Web application con frontend SPA bajo `src/` y
backend-as-a-service en `supabase/` (migraciones + Edge Functions). Esta
estructura no es la "web app" clásica del template (`backend/` +
`frontend/`) porque Supabase es backend-as-a-service: no escribimos un
servidor propio, escribimos migraciones SQL y funciones Edge aisladas.
Mantener `supabase/` como hermana de `src/` (no anidada) facilita
ejecutar `supabase db push` y `supabase functions deploy` desde la
raíz, y deja claro qué se ejecuta del lado del navegador vs. del lado
del servidor de Supabase.

## Complexity Tracking

> Sin violaciones de la constitución. Sección intencionalmente vacía.
