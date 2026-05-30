# Research — Feature 002 (Ingesta OpenAQ)

**Date**: 2026-05-30
**Método**: exploración directa de la API real de OpenAQ v3 con API key válida (no de la documentación).

---

## D1 — Estrategia de obtención de mediciones (rate-limit)

**Decisión**: **per-location** — iterar las estaciones frescas y llamar `GET /v3/locations/{id}/latest` por cada una, con throttling para no superar el rate limit del free tier.

**Evidencia / Rationale**:

- OpenAQ v3 **NO tiene** un endpoint global de mediciones por bbox+parámetro (el contrato original lo asumía; no existe).
- Existe un endpoint bulk `GET /v3/parameters/{id}/latest`, pero **ignora el parámetro `bbox`**: probado con y sin bbox de Chile, ambos devuelven `meta.found = 25568` (sensores **globales** de PM2.5). Filtrar Chile sería descargar ~25.568 × 3 contaminantes (~77 páginas de 1000) para quedarse con ~112 estaciones → desperdicio masivo de ancho de banda.
- `/locations/{id}/latest` devuelve el snapshot completo de una estación (sus 6 sensores) en una petición pequeña. ~112 estaciones frescas = ~112 peticiones por ciclo.
- Coste: 112 req/ciclo × 4 ciclos/h = 448 req/h. Con throttling a <60 req/min, un ciclo termina en ~2 min, holgadamente dentro de la ventana de 15 min y de los límites típicos del free tier.

**Alternativas rechazadas**:

- _Bulk `/parameters/{id}/latest` + filtro cliente_: menos peticiones (~77) pero descarga el mundo entero; ignora bbox. Rechazado por volumen de datos y complejidad.
- _Endpoint `/measurements?bbox=&parameter=` (contrato original)_: **no existe** en v3.

> **Confirmar en implementación**: el límite exacto del free tier de OpenAQ (documentado ~60 req/min); ajustar el throttle del loop en consecuencia. Cachear la lista de `location_id` frescos (resultado de `seed-stations`) para no re-descubrir estaciones cada ciclo.

---

## D2 — Umbral de frescura (regla R-fresh)

**Decisión**: descartar toda medición cuyo `datetime.utc` sea **más antiguo que 3 horas** respecto a `now()`, evaluado **por sensor/contaminante**.

**Rationale**:

- La red reporta a cadencia **horaria** (los `measurements` traen `period.interval = "01:00:00"`). En la exploración, Parque O'Higgins tenía PM2.5 de hace ~2 h respecto al `now` observado → 3 h da margen para lag de reporte sin dejar pasar datos viejos.
- El objetivo real de R-fresh es atrapar **sensores muertos**, que están años atrasados (ej. O₃ de 2021, SO₂ de 2017 en la misma estación activa). Para eso 3 h vs 6 h es indiferente; 3 h es conservador y suficiente.
- Es **por contaminante**: en una estación, PM2.5/PM10 pueden estar frescos y O₃ muerto. Filtrar por estación entera perdería datos buenos o dejaría pasar O₃ rancio.

**Alternativas**: 1 h (demasiado estricto, perdería lecturas con lag normal); 6 h (válido, más laxo). 3 h queda como default configurable vía env var.

---

## D3 — Mapeo sensor → contaminante

**Decisión**: usar el catálogo de sensores de cada `location` (campo `sensors[].parameter`) para mapear `sensorsId → pollutant`, y la constante `PARAM_ID = { pm10: 1, pm25: 2, o3: 3 }`.

**Evidencia**: IDs reales confirmados vía `/v3/parameters`: **pm10=1, pm25=2, o3=3** (variante µg/m³ _mass_). Ojo: O₃ también existe como ppm (id 10) y ppb (id 32) — NO usar esas. El payload de `/locations/{id}/latest` trae `sensorsId` (no el parámetro), por eso hay que cruzar contra el catálogo de sensores de la estación.

---

## D4 — Migración / limpieza del seed sintético

**Decisión**: migración SQL única `0013_remove_synthetic_seed.sql` que borra `stations` (y por cascade sus `readings`) con id entre 1 y 13.

**Rationale**:

- Los `location_id` reales de OpenAQ son enteros chicos (25, 26, 45…) que **conviven** con los ids sintéticos 1–13 → sin limpieza, el mapa mostraría estaciones duplicadas/falsas.
- `readings.station_id` tiene FK `ON DELETE CASCADE`, así que `DELETE FROM stations WHERE id BETWEEN 1 AND 13` arrastra sus lecturas. Idempotente (no borra nada si ya están).
- Una migración (run-once, tracked por `supabase db push`) es el vehículo correcto para una limpieza de datos reproducible, sin DDL de esquema (cumple FR-012).

**Orden de operaciones**: `seed-stations` (cargar reales) → `ingest-openaq` primer ciclo (poblar readings reales) → aplicar `0013` (borrar sintéticas). Documentado en `quickstart.md`.

---

## D5 — Agendado del cron \*/15

**Decisión**: programar `ingest-openaq` cada 15 min vía el **cron de Supabase Cloud** (dashboard → Edge Functions → Schedules, o `pg_cron` + `pg_net` invocando la URL de la función con el `service_role`).

**Rationale**: es la vía soportada en Supabase Cloud para invocar Edge Functions periódicamente. `seed-stations` NO se agenda (es one-shot, invocación manual). Paso de ops documentado en `quickstart.md`; no es código del repo.

---

## D6 — Testing en Deno

**Decisión**: `deno test` sobre la lógica pura de `_shared/openaq.ts` con `fetch` mockeado (stubbing global). Cubrir: normalización long→wide, `isInvalidReading` (negativo/outlier), `isStale` (frescura), mapeo `sensorsId→pollutant`, y la paginación del cliente.

**Rationale**: consistente con la Constitución VI (tests junto al código, sin red real). El I/O (HTTP, supabase upsert) se mantiene fino y se prueba la lógica determinista. El gate de coverage de Vitest no aplica a Deno, pero la disciplina sí.
