# Quickstart — Feature 002 (Ingesta OpenAQ)

Pasos para desplegar la ingesta real y verificarla. Requiere la **Supabase CLI**
linkeada al proyecto y una **`OPENAQ_API_KEY`** válida (free tier, openaq.org/account).

## 1. Secrets de las Edge Functions (server-side)

Nunca en el cliente. Setear en Supabase Cloud:

```bash
supabase secrets set OPENAQ_API_KEY=<tu_key_de_64_chars>
# SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase automáticamente
# a las Edge Functions; no hace falta setearlos a mano.
```

## 2. Desplegar las funciones

```bash
supabase functions deploy seed-stations
supabase functions deploy ingest-openaq
```

> **Nota**: la Supabase CLI **no tiene** `functions invoke`. Las Edge Functions
> se invocan por **HTTP** a su URL. La anon key (`VITE_SUPABASE_ANON_KEY`, formato
> `eyJ…`) solo pasa el gateway; por dentro la función usa el `service_role` del
> secret. En PowerShell:
>
> ```powershell
> $anon = "<tu VITE_SUPABASE_ANON_KEY, eyJ...>"
> $base = "https://<project-ref>.supabase.co/functions/v1"
> ```

## 3. Carga inicial del catálogo (one-shot)

Se hace **antes** de `db push` para que el mapa nunca quede vacío (las sintéticas
siguen visibles hasta el paso 4).

```powershell
Invoke-RestMethod -Method POST -Uri "$base/seed-stations" -Headers @{ Authorization = "Bearer $anon" }
# Esperado: { ok:true, summary:{ stations_upserted: ~150 } }
```

Verificar en Studio: `SELECT count(*) FROM stations WHERE country_code='CL';` → ~150.

## 4. Aplicar migraciones (OBLIGATORIO antes del ingest)

```bash
supabase db push
# 0013_remove_synthetic_seed.sql  → borra stations/readings ids 1–13 (seed sintético)
# 0014_ingest_readings_fn.sql     → crea el RPC ingest_readings (upsert COALESCE)
```

El RPC `0014` es **imprescindible** para el paso 5: `ingest-openaq` lo invoca.
Verificar: `SELECT count(*) FROM stations WHERE id BETWEEN 1 AND 13;` → 0.

## 5. Primer ciclo de ingesta (para poblar readings antes del cron)

```powershell
Invoke-RestMethod -Method POST -Uri "$base/ingest-openaq" -Headers @{ Authorization = "Bearer $anon" }
# Esperado: { ok:true, summary:{ rows_upserted: >0, skipped_stale: >0, ... } }
```

`skipped_stale > 0` es **buena señal**: la regla R-fresh descarta sensores muertos
(ej. O₃ de 2021).

> **Si da timeout**: el throttle default (~1.1 s × ~112 estaciones ≈ 2 min) puede
> superar el wall-clock de la función. Bajarlo sin redeploy:
> `supabase secrets set INGEST_THROTTLE_MS=350` (≈ 40 s, sigue bajo el rate limit).

## 6. Agendar el cron \*/15

En **Supabase Dashboard → Edge Functions → `ingest-openaq` → Schedules**, crear
un schedule `*/15 * * * *` (o vía `pg_cron` + `pg_net` invocando la URL de la
función con el `service_role`). `seed-stations` NO se agenda.

## 7. Verificación end-to-end

- **Catálogo real**: abrir la app → el mapa muestra >100 estaciones chilenas reales (US1, SC-001). Ninguna estación sintética (SC-004).
- **Frescura automática**: esperar un ciclo (>15 min) → `SELECT max(measured_at) FROM readings;` debe avanzar solo (US2, SC-002).
- **Datos confiables**: abrir una estación con O₃ inactivo → PM2.5/PM10 actuales, O₃ "sin datos recientes" (no un valor antiguo) (US3, SC-003).
- **Tiempo real**: con el mapa abierto, al entrar un ciclo nuevo los marcadores se repintan sin recargar (sin cambios de frontend, SC-006).

## Troubleshooting

- **401 al hacer el POST (gateway)**: falta o es inválido el header `Authorization: Bearer <anon>`; usar la `VITE_SUPABASE_ANON_KEY` (`eyJ…`).
- **La función responde error 500 con "OpenAQ 401"**: la `OPENAQ_API_KEY` (secret) no está seteada o es inválida (debe ser de ~64 chars).
- **Timeout / la función se corta**: bajar `INGEST_THROTTLE_MS` (ver paso 5).
- **`rows_upserted: 0` y `skipped_stale` alto**: todas las lecturas vinieron rancias; revisar el umbral de frescura o si la red está reportando.
- **Rate limit (429) en logs**: subir `INGEST_THROTTLE_MS` para espaciar las llamadas.
- **El mapa sigue mostrando estaciones sintéticas**: falta aplicar `0013` (paso 4).
