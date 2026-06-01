# AirVision — Session notes

**Última actualización**: 2026-06-01
**Branch**: `main` (todos los commits empujados a `origin/main`)

## ▶ PRÓXIMA SESIÓN (retomar aquí)

**Feature 002 (ingesta real OpenAQ) COMPLETA** — el cron `*/15` ya está agendado
(migración `0016_schedule_ingest_cron.sql`, aplicada con `supabase db push`). Solo
queda la **verificación en vivo del cron (T021)**: esperar un ciclo (>15 min) y
confirmar que `select max(measured_at) from readings;` avanza solo, y revisar los
logs de la función en el dashboard (la línea `{"event":"ingest-openaq",...}` del
summary, T020). Queries útiles para el cron en Studio SQL Editor:
`select jobname, schedule, active from cron.job;` y
`select status, start_time from cron.job_run_details order by start_time desc limit 3;`.

**Estado en vivo** (https://air-vision-xi.vercel.app/): **169 estaciones reales** de
Chile cargadas; el cron `*/15` ya repone los `readings` solo (verificación 2026-06-01:
`rows_upserted: 102`, `max(measured_at)` avanzó a `2026-06-01T17:00`). Secrets en
Supabase: `OPENAQ_API_KEY`, `INGEST_THROTTLE_MS=350` (bajado de 500: con ~107
estaciones frescas, 500 ms excedía el wall-clock de la función y el batch upsert nunca
corría). Las 5 migraciones de la ingesta (0013 limpieza seed, 0014 RPC, 0015 grants,
**0016 cron**, **0017 timeout pg_net 180 s**) aplicadas. `deno test` 11/11. Helper de invocación:
`bash scripts/invoke-function.sh <fn>` (la CLI no tiene `functions invoke` → HTTP; ojo:
una invocación síncrona da 504 a los ~150 s por el wall-clock del gateway, pero el cron
usa `pg_net` async y la función corre hasta completarse).

## Estado actual

`001-air-quality-dashboard` **completo y desplegado** (Phase 8 incluida: responsive,
ReconnectingIndicator, deploy Vercel, screenshots, Quality Gates 7/7). 166 tests front.

`002-openaq-ingestion` **implementado y verificado en producción** (código Deno + 3
migraciones + 11 tests Deno); solo pendiente agendar el cron (ver arriba).

Cuerpo del feature `001-air-quality-dashboard`:

- **US1** Mapa interactivo con marcadores coloreados por worst-of (PM2.5/PM10/O₃) — ✅
- **US2** Tendencias temporales con `RangeSelector` 6h/24h/7d + realtime per-station — ✅
- **US3** Registro, login y sesión persistente (Supabase Auth) — ✅
- **US4** Favoritos con tope 10 por usuario y trigger PL/pgSQL — ✅
- **US5** Alertas edge-triggered (trigger `evaluate_alerts()`), historial rotado a 20, badge en header, toasts realtime, "marcar como leídas" — ✅

**Métricas**: 161 tests pasando, coverage 97.51% líneas / 90.76% branches (gate 70/65), build 1.0 MB / 287 kB gzip. 10 commits sobre el cuerpo del feature más los de Phase 1/2 y rebrand.

## Decisiones tomadas en /speckit-clarify

Estas decisiones quedaron grabadas en `specs/001-air-quality-dashboard/spec.md` y guían el resto del código:

- **Alertas edge-triggered**: cada alerta tiene `is_armed` (default `true`). Dispara una sola vez al cruzar el umbral y se re-arma cuando una medición posterior no cumple la condición. Implementado en `0007_alert_trigger.sql` como máquina de estado dentro de la transacción del INSERT en `readings`.
- **No modelar estaciones inactivas**: la tabla `stations` no tiene columna de ciclo de vida (`active`, `decommissioned_at`, etc). Una estación que deja de reportar simplemente queda con `latest_station_readings` vieja; la UI muestra "Sin datos recientes".
- **Upsert idempotente por `(station_id, measured_at)`**: la tabla `readings` tiene `UNIQUE (station_id, measured_at)` y el patrón de ingesta usa `ON CONFLICT DO UPDATE COALESCE` para mergear campos parciales (algunas estaciones reportan solo PM2.5, otras los tres). El patrón está documentado en `data-model.md` y se usará cuando se reactive OpenAQ.
- **Arquitectura híbrida IoT-style**: OpenAQ v3 = sensores/gateway → Edge Function programada cada 15 min = ingesta → Supabase (Postgres + Auth + Realtime) = backend central → React + Vite = app de visualización. El frontend NUNCA habla con OpenAQ directamente (Constitución II); Edge Functions son la única puerta de entrada a datos externos.
- **Legacy API keys de Supabase**: usamos `VITE_SUPABASE_ANON_KEY` (formato JWT legado, `eyJ…`), no las nuevas publishable/secret keys que Supabase introdujo en 2025. La razón: el supabase-js v2 que tenemos instalado y el CLI funcionan con legacy; cambiar a las nuevas no aporta nada al portafolio y rompería el flujo.

## Configuración actual

- **Producción (en vivo)**: https://air-vision-xi.vercel.app/ — Vercel + Supabase Cloud, público (verificado en incógnito), con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` configuradas en Vercel. **Ojo**: la URL de deployment con hash (`air-vision-<hash>-…vercel.app`) devuelve 401 a anónimos (Deployment Protection) y cambia en cada deploy — usar siempre el dominio estable `air-vision-xi`. Recordar que un cambio de env var en Vercel exige redeploy (Vite hornea en build time, ver Aprendizajes del deploy).
- **Supabase Cloud** (sin Docker local) — todas las migraciones se aplican con `supabase db push` contra la BD remota.
- **Tipos generados con `supabase gen types typescript --linked`** y pipeados por `Out-File -Encoding utf8` para evitar el bug de UTF-16 de PowerShell 5.1 (ver memoria `feedback-pwsh-utf8-redirect`).
- **Datos sintéticos en `supabase/seed.sql`**: 12 estaciones de Chile (Santiago x4, Valparaíso, Concepción, Rancagua, Talca, Chillán, Temuco, Coyhaique, Puente Alto) + 24 lecturas horarias por estación con bases variadas para mostrar toda la paleta de niveles. El seed es idempotente (`ON CONFLICT DO NOTHING`).
- **Ingesta OpenAQ COMPLETA (feature 002, cron en vivo 2026-06-01)**: `supabase/functions/_shared/openaq.ts` + `seed-stations` + `ingest-openaq` desplegadas y verificadas en vivo; el cron `*/15` (migraciones `0016`/`0017`) repone los `readings` solo. El seed sintético (`seed.sql`) quedó obsoleto: la migración `0013` borró las estaciones 1–13 y ahora hay 169 estaciones reales de Chile (SINCA). Detalle en `specs/002-openaq-ingestion/`.
  - **IDs de parámetro OpenAQ v3**: pm10=1, pm25=2, o3=3 (variante µg/m³ mass; O₃ también existe como ppm=10/ppb=32 — NO usar). Mediciones por `/locations/{id}/latest` (NO existe `/measurements?bbox`). Regla **R-fresh**: descartar lecturas >3h por-contaminante (sensores muertos devuelven valores de años atrás en `/latest`).
  - **Drift del catálogo OpenAQ (bug encontrado en la verificación T021)**: OpenAQ agrega estaciones entre corridas de `seed-stations`. `ingest-openaq` armaba su lista de polling desde el barrido `/locations` en vivo, así que intentaba escribir readings de estaciones aún no presentes en `stations` → FK violation `readings_station_id_fkey` que, al ser el upsert un batch único en el RPC `ingest_readings`, abortaba TODO el ciclo (`rows_upserted: 0`, silencioso). **Fix**: `ingest-openaq` ahora filtra `freshStationIds` contra `SELECT id FROM stations`. Las estaciones nuevas entran al re-ejecutar `seed-stations`.

## Deuda técnica conocida

1. **GRANTs olvidados en migraciones** — `0012_alert_history_grants.sql` (hotfix `alert_history`) y, **confirmado en feature 002**, `0015_grant_service_role.sql`: el `service_role` no tenía INSERT/UPDATE en `stations`/`readings` (la ingesta real dio `42501 permission denied for table stations`; el seed sintético nunca lo destapó porque se cargaba desde Studio como owner). **0015 lo resolvió para `stations` y `readings`.** **Pendiente aún**: auditar `user_favorites` y `alerts` (esas funcionan por anon/authenticated + RLS, pero conviene verificar `information_schema.table_privileges` por si dependen de defaults de Supabase Cloud).

2. **Numeración inconsistente de migraciones** — el orden histórico es `0001, 0002, 0003, 0004, 0005, 0007, 0009, 0010, 0011, 0012` con huecos en `0006`/`0008` (que en `data-model.md` originalmente eran `0006_rls_policies` y `0008_alert_limits_trigger`, ambos inlinados dentro de las migraciones de tabla). Esto funciona pero no es elegante. **Considerar migrar a timestamps** (`20260519143000_...`) que es la convención por defecto de la CLI de Supabase, en una refactorización futura. No bloquea nada.

3. **Bundle size 1 MB** — el chunk principal (`index-*.js`) llega a ~1006 kB / 287 kB gzip por Recharts (~250 kB) + Leaflet (~150 kB). Code-splitting de `StationPanel` (lazy loading del chart) y de la página de favoritos bajaría el primer paint significativamente. Candidato a Phase 8 (T-extra).

4. **Tests de Recharts mockeados** — `PollutantChart.test.tsx` mockea `react-leaflet` y `recharts` enteros porque jsdom no calcula layout SVG. Cubre data flow y branches de mensaje, pero no validación visual. Aceptable para portfolio.

5. **`useStationReadings` doble suscripción Realtime** — `MapView` mantiene un canal `readings:inserts` global (todas las estaciones) y `useStationReadings` abre un segundo canal `readings:station:${id}` filtrado al abrir el panel. Es redundante pero correcto. Refactor a un solo canal con dispatch interno queda en backlog.

6. ~~**No hay ingesta automática en prod**~~ **RESUELTO Y CERRADO (feature 002, cron en vivo 2026-06-01)** — las Edge Functions `seed-stations` e `ingest-openaq` están desplegadas y funcionando, y el cron `*/15 * * * *` ya está agendado vía la migración `0016_schedule_ingest_cron.sql` (`pg_cron` + `pg_net` → `net.http_post` a la URL de la función con header `Authorization: Bearer <anon>`). La ingesta ahora se refresca sola; el escenario T109 de datos rancios dejó de ser el estado estacionario en prod (solo posible de forma transitoria si el cron se pausa o un ciclo falla).

## Aprendizajes del deploy (T111)

- **La env var de producción exige la _legacy anon key_ (formato `eyJ…`, JWT), NO la nueva `sb_publishable_…`.** Es la misma decisión que la memoria `feedback-legacy-supabase-keys`: el `supabase-js` v2 instalado funciona con la key legada. En Vercel, `VITE_SUPABASE_ANON_KEY` debe ser el JWT `eyJ…` con `role:"anon"`.
- **Vite hornea las env vars en _build time_, no en runtime.** Las `VITE_*` se inlinean dentro del bundle durante `vite build`. Consecuencia operativa: **cualquier cambio de variable de entorno en Vercel NO surte efecto hasta un redeploy** — no basta con editar la variable en el dashboard y recargar la página. Tras tocar `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY` hay que disparar un nuevo deploy.

## Phase 8 Polish — ✅ COMPLETADA (histórico)

Todas estas tareas ya están hechas (T106–T116, con T116 omitido por decisión). Se deja el listado como registro:

1. **T113 + T114 README + screenshots** — primero porque el commit final es el README. Screenshots: `/` (mapa con popups), `/alertas` (panel con dialog abierto), `/favoritos` (cards). Mobile screenshots opcionales.
2. **T106 sweep responsive 360px** — abrir DevTools en 360 px y revisar las 6 pantallas: `/`, popup, `StationPanel` (slide-over mobile), `/favoritos`, `/alertas`, `/login`, `/registro`. Arreglar cualquier scroll horizontal u overlap.
3. **T111 Deploy a Vercel** — `vercel` CLI, env vars `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el proyecto. Verificar que `vercel.json` no haga falta (Vite es zero-config en Vercel).
4. **T115 Quality Gates checklist de la constitución** — build/typecheck/lint/tests/coverage (ya pasan), security review (RLS habilitada en todas las tablas, anon key en cliente OK), architectural review (frontend no llama OpenAQ — sí ✅), UX review en español.
5. **T107 + T108 `ReconnectingIndicator`** — componente sutil en el header que refleje el `status` de `useReadingsRealtime`. Aparece solo en `CONNECTING`/`DISCONNECTED`, color muted. Pequeño, ~30 líneas.
6. **T112 Coverage report formal** — ya pasamos el gate (97.5%), pero correr `npm run test:coverage` una vez más y guardar el HTML en `coverage/` (gitignored) por si el reviewer pregunta.
7. **T109 Manual test "DB vacía"** — documentar en `quickstart.md` el flujo "TRUNCATE stations; abrir /" → confirmar banner "Aún no se han recibido mediciones".
8. **T116 Screencast 60s walkthrough US1→US5** — opcional, last step. Solo si queda tiempo.

**Bonus / nice-to-have** (no son tasks del plan):

- Code-split lazy de `StationPanel` para bajar el bundle inicial.
- Auditoría GRANTs explícitos en una migración `0013_explicit_grants.sql`.
- `useStations` con `select '*, stations!inner(...)'` embedido si PostgREST cooperara con la vista (intentar de nuevo) — bajaría de 2 queries paralelas a 1.

## Variables de entorno necesarias en `.env.local`

Solo dos están activamente consumidas por el código:

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Las siguientes están en `.env.example` para cuando se reactive OpenAQ (feature 002), por ahora ignorables:

```
OPENAQ_API_KEY          # backend, Edge Function ingest-openaq
SUPABASE_URL            # backend, mismo valor que VITE_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY  # backend, NUNCA en el cliente
```
