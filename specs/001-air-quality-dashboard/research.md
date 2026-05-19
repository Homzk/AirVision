# Research & Technology Decisions

**Feature**: 001-air-quality-dashboard
**Date**: 2026-05-18

Resuelve toda incertidumbre técnica que pudiera quedar tras el spec.
Cada decisión sigue el formato Decision / Rationale / Alternatives.

---

## R1. Esquema de la tabla `readings`: ancho vs. largo

- **Decision**: Wide format — una fila por `(station_id, measured_at)`
  con tres columnas nullable: `pm25`, `pm10`, `o3`. `UNIQUE (station_id,
measured_at)`. El upsert es `INSERT ... ON CONFLICT (station_id,
measured_at) DO UPDATE SET pm25 = COALESCE(EXCLUDED.pm25,
readings.pm25), pm10 = COALESCE(...), o3 = COALESCE(...)` para permitir
  rellenos incrementales si OpenAQ devuelve contaminantes en respuestas
  separadas.
- **Rationale**: Coincide con la clave de upsert que el usuario fijó
  (`station_id + measured_at`). 3× menos filas que el formato largo, lo
  que abarata el storage de retención (30 días) y mantiene los queries
  de rango (`WHERE station_id = $1 AND measured_at >= now() - interval
'7 days'`) en planes simples. Los payloads de Realtime acarrean los
  tres contaminantes en un solo evento, lo que reduce ruido en el cliente
  y simplifica la evaluación del trigger de alertas.
- **Alternatives considered**:
  - _Long format_ (una fila por contaminante): rechazado — exige incluir
    `pollutant` en la clave única, lo que el usuario explícitamente no
    pidió, y multiplica filas/eventos sin beneficio para este modelo.
  - _JSONB con todos los contaminantes_: rechazado — pierde tipos, índices
    parciales y validaciones; sobre-ingeniería para 3 columnas fijas.

## R2. Estrategia de ingesta OpenAQ v3

- **Decision**: Edge Function `ingest-openaq` programada cron `_/15 _ \*
  - \*`. Consulta `GET /v3/measurements` filtrado por:
  * `parameter` ∈ `{pm25, pm10, o3}` (tres llamadas paralelas, una por
    parámetro, porque OpenAQ no permite OR en `parameter`).
  * `date_from = now() - 30 minutes` (ventana 2× la cadencia del cron
    para evitar perder lecturas por jitter).
  * `bbox` = bounding box de Chile aproximada (`-75.7,-56.0,-66.5,-17.5`).
  * `limit=1000`, paginar con `page` hasta agotar.
    Normaliza payload a filas `(station_id, measured_at, pm25/pm10/o3)`,
    agrupando por `(station_id, measured_at)` antes de upsertar. Implementa
    backoff exponencial (1s, 2s, 4s) con máx. 3 reintentos; si todos
    fallan, registra error y termina con exit 0 (la siguiente ejecución
    recupera la ventana de 30 min). Falla cero → no rompe la app
    (FR-032).
- **Rationale**: La ventana de 30 min con upsert idempotente sobre la
  clave `(station_id, measured_at)` da redundancia gratis: si un ciclo
  falla, el siguiente cubre lo perdido. Filtrar por bbox da flexibilidad
  para incluir países vecinos sin recompilación.
- **Alternatives considered**:
  - _`country=CL`_: más limpio pero acopla a "sólo Chile". Bbox permite
    expandir según cobertura sin tocar código.
  - _Ventana exacta de 15 min_: rechazado — un retraso de OpenAQ o un
    fallo transitorio perdería lecturas; la ventana de 30 min cuesta
    casi nada (upsert idempotente).
  - _Webhook push de OpenAQ_: no soportado por la API; descartado.

## R3. Seed inicial de estaciones

- **Decision**: Edge Function separada `seed-stations` que llama
  `GET /v3/locations?bbox=...&parameter=pm25,pm10,o3&limit=1000` y
  upserta a la tabla `stations` por `id` (OpenAQ location_id). Idempotente:
  re-ejecutar reagrega lo que falte y actualiza nombre/ciudad si
  cambiaron. Invocación manual una vez en despliegue:
  `supabase functions invoke seed-stations`.
- **Rationale**: El catálogo cambia raramente. Una función dedicada
  evita ensuciar el `ingest-openaq` con responsabilidad doble.
- **Alternatives considered**:
  - _Seed automático en cada ingesta_: rechazado — fricción innecesaria
    para 15 min ciclos; la lista cambia mensualmente como mucho.
  - _SQL estático con `INSERT INTO stations VALUES (...)`_: rechazado —
    se desactualiza, y hardcodear 50 IDs es tedio.

## R4. Evaluación de alertas: trigger PL/pgSQL vs Edge Function

- **Decision**: `AFTER INSERT ON readings FOR EACH ROW EXECUTE FUNCTION
evaluate_alerts()`. La función PL/pgSQL itera las `alerts` cuyo
  `station_id = NEW.station_id`, evalúa la condición contra el valor
  del contaminante correspondiente en la fila nueva, y aplica la máquina
  de estados edge-triggered: si `is_armed AND condition_met` →
  `INSERT INTO alert_history` + `UPDATE alerts SET is_armed = false`; si
  `NOT is_armed AND NOT condition_met` → `UPDATE alerts SET is_armed =
true` (sin notificación). Todo en una transacción con el insert
  original.
- **Rationale**: Atomicidad transaccional elimina toda carrera entre
  ingesta y evaluación. El upsert idempotente (R1) garantiza que sólo
  filas genuinamente nuevas disparan el trigger, sin doble-fuego. Cero
  latencia de red: el trigger corre dentro del mismo `INSERT`. Es la
  manera más simple y robusta para una escala de pocos cientos de
  alertas activas.
- **Alternatives considered**:
  - _Edge Function dispatcher_: la ingesta inserta y luego llama a otra
    función que evalúa. Rechazado — añade latencia, requiere coordinación
    transaccional cross-service, y abre carreras (ingesta termina antes
    de que el dispatcher corra; un segundo ciclo de cron puede ver la
    misma fila dos veces).
  - _Cron de evaluación periódico_: rechazado — desacopla del momento de
    la inserción y empeora la frescura (SC-002).

## R5. Suscripciones Realtime

- **Decision**: Dos canales globales por sesión:
  1. `realtime:public:readings` — todos los `INSERT` en `readings`. El
     frontend filtra en cliente según la estación abierta y el conjunto
     de favoritos.
  2. `realtime:public:alert_history:user_id=eq.<uid>` — sólo entradas
     del usuario autenticado (RLS + filtro de canal). Cada INSERT
     dispara un toast y aumenta el badge de `alertStore`.
     La actualización del mapa usa el primer canal; el `alertStore`
     consume el segundo.
- **Rationale**: Volumen estimado < 5 inserts/min en `readings` y < 1
  alerta/min para un usuario típico. Un canal global es más barato que
  N canales por estación. RLS sobre `alert_history` garantiza que el
  cliente sólo recibe sus propias filas aunque la suscripción sea
  "global" lógicamente.
- **Alternatives considered**:
  - _Canal por estación abierta_: overhead innecesario; el `unsubscribe`
    al cambiar de estación añade complejidad sin ganancia.
  - _Polling con `setInterval`_: rechazado — viola SC-002 (≤ 5 s) salvo
    con intervalos agresivos que castigan batería en mobile.

## R6. Cálculo del nivel de calidad ("worst-of" + color)

- **Decision**: Cómputo en el cliente, en `src/lib/airQuality.ts`. Una
  función `computeLevel(reading: { pm25, pm10, o3 }): Level` aplica los
  umbrales OMS por contaminante (cada contaminante se mapea a `good |
moderate | unhealthy | hazardous`) y devuelve el peor. `Level → color`
  vive en `constants.ts`. Si los tres contaminantes son `null` o la
  fila tiene > 24 h, devuelve `'no_data'` (gris).
- **Rationale**: Color es lógica de presentación. Mantener thresholds
  en TS permite testear con Vitest (constitución VI: unit tests sobre
  lógica pura) y cambiar umbrales sin migraciones.
- **Alternatives considered**:
  - _Columna generada en SQL (`level TEXT GENERATED ALWAYS AS ... STORED`)_:
    rechazado — los umbrales en SQL no se versionan junto al código del
    frontend; cualquier ajuste exige migración + redeploy coordinados.

## R7. Query de "última lectura por estación" para el mapa

- **Decision**: Vista regular (no materializada) `latest_station_readings`:
  ```sql
  CREATE VIEW latest_station_readings AS
  SELECT DISTINCT ON (station_id)
    station_id, measured_at, pm25, pm10, o3
  FROM readings
  ORDER BY station_id, measured_at DESC;
  ```
  El índice `(station_id, measured_at DESC)` sobre `readings` hace que
  `DISTINCT ON` resuelva con índice-only scan por grupo.
- **Rationale**: Para ≈ 50 estaciones × 30 días de histórico, la vista
  responde en milisegundos. Materializar (con refresco programado) es
  innecesario en MVP; si la escala crece, se promueve sin tocar al
  cliente.
- **Alternatives considered**:
  - _Vista materializada con `REFRESH CONCURRENTLY` post-ingesta_:
    aplazado a una optimización futura si SC-001 se ve comprometido.

## R8. Límite de 5 alertas / 20 entradas de historial

- **Decision**: Dos triggers BEFORE:
  - `enforce_alerts_limit` BEFORE INSERT ON `alerts`: `SELECT
COUNT(*) FROM alerts WHERE user_id = NEW.user_id`; si ≥ 5,
    `RAISE EXCEPTION USING ERRCODE = 'check_violation', MESSAGE =
'Máximo 5 alertas por usuario'`.
  - `rotate_alert_history` AFTER INSERT ON `alert_history`: borra las
    filas del `user_id` cuyo rank por `triggered_at DESC` excede 20.
- **Rationale**: Hacerlo en BD impide saltarse el límite vía RPC
  alternativos o bugs del frontend. Mantiene el spec FR-021 / FR-023
  enforcement-as-data.
- **Alternatives considered**:
  - _Validar sólo en el cliente_: rechazado por la razón obvia.

## R9. Autenticación

- **Decision**: Supabase Auth con provider email + password.
  `signUp({ email, password })` + `signInWithPassword(...)`. Confirmación
  de email **desactivada** en config del proyecto (UX de portafolio sin
  fricción). Sesión persistida por el cliente Supabase en
  `localStorage` (default). `onAuthStateChange` propaga al `authStore`.
- **Rationale**: Es el flujo más simple compatible con FR-010..FR-014.
  Sin verificación de email se evita configurar SMTP — apropiado para
  una demo de portafolio.
- **Alternatives considered**:
  - _Magic link_: requiere SMTP; demasiada fricción para una demo
    pública.
  - _OAuth (Google/GitHub)_: fuera de alcance según spec (Assumptions).
- **Sesión / inactividad** (Q5 no formalizada en clarify): se acepta el
  default de Supabase JS — la sesión renueva el token automáticamente
  mientras el `refresh_token` siga vigente (default 1 semana). Se
  documenta este comportamiento en `quickstart.md`.

## R10. Coverage gating

- **Decision**: `vitest.config.ts` configura `coverage.provider = 'v8'`
  con `thresholds.lines = 70` y `thresholds.include = ['src/hooks/**',
'src/utils/**', 'src/stores/**']`. CI corre `vitest run --coverage` y
  falla si los thresholds no se cumplen.
- **Rationale**: Cumple el gate 4 de la constitución sin esfuerzo
  extra; native a Vitest.
- **Alternatives considered**:
  - _c8/Istanbul plugin_: v8 es el provider por defecto y más rápido.

## R11. Toasts y badge de alertas no vistas

- **Decision**: Librería `sonner` (recomendada por shadcn/ui). El
  `alertStore` (Zustand) mantiene:
  - `unseenCount: number` — derivado de `alert_history WHERE seen =
false AND user_id = me`.
  - `lastSessionStartedAt: Date` — set en `useAuth` al iniciar sesión.
    Al cargar la app autenticada, el hook `useAlertHistory` cuenta los no
    vistos y, si `unseenCount > 0`, dispara UN único toast resumen
    ("Tienes N alertas nuevas desde tu última visita"). Mientras la app
    está abierta, cada INSERT a `alert_history` recibido por Realtime
    dispara su propio toast individual.
- **Rationale**: Cumple FR-024 + FR-025 sin duplicar lógica.
- **Alternatives considered**:
  - _`react-hot-toast`_: válido pero `sonner` integra mejor con shadcn.

## R12. Clustering en el mapa

- **Decision**: NO clustering en MVP. Renderizar los ~50 marcadores
  directamente.
- **Rationale**: A esa escala Leaflet renderiza < 16 ms; clustering
  añade UX confusa (clicks de "abrir cluster") y dependencias extra
  (`react-leaflet-cluster`). Si la escala crece, se introduce como
  feature aparte.

## R13. Bundling y deploy

- **Decision**: Vite build → `dist/`. Deploy a Vercel via integración
  GitHub: cada push a `main` despliega producción; cada PR despliega
  preview. Variables de entorno (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`) en el dashboard de Vercel. Edge Functions
  deployadas vía `supabase functions deploy ingest-openaq seed-stations`.
  Schedule del cron via `supabase functions schedule` o vía Cron Jobs
  configurados en el dashboard de Supabase.
- **Rationale**: Stock Vercel + Supabase. Cero infra propia.
- **Alternatives considered**:
  - _Cron en GitHub Actions invocando la función_: válido como fallback
    si el scheduler nativo de Supabase no funciona en la región.

---

## Open items deferred to /speckit-tasks

- **Q5 sin formalizar** (timeout exacto de sesión): aceptamos el default
  de Supabase (refresh automático hasta que el refresh_token caduque).
  Si la review post-MVP exige un timeout más corto, es un cambio
  aislado en `useAuth`.
- **Q4 sin formalizar** (política de duplicados): zanjado vía constraint
  `UNIQUE (station_id, measured_at)` + `ON CONFLICT DO UPDATE COALESCE`.
  Documentado en R1 + R2.
