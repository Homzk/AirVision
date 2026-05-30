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

## 3. Carga inicial del catálogo (one-shot)

```bash
supabase functions invoke seed-stations
# Esperado: { ok:true, summary:{ stations_upserted: ~150 } }
```

Verificar en Studio: `SELECT count(*) FROM stations WHERE country_code='CL';` → ~150.

## 4. Primer ciclo de ingesta manual (para poblar readings antes del cron)

```bash
supabase functions invoke ingest-openaq
# Esperado: { ok:true, summary:{ rows_upserted: >0, skipped_stale: >0, ... } }
```

`skipped_stale > 0` es **buena señal**: confirma que la regla R-fresh está
descartando sensores muertos (ej. O₃ de 2021).

## 5. Limpiar el seed sintético

```bash
supabase db push   # aplica 0013_remove_synthetic_seed.sql (borra stations/readings ids 1–13)
```

Verificar: `SELECT count(*) FROM stations WHERE id BETWEEN 1 AND 13;` → 0.

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

- **`invoke` devuelve 401 de OpenAQ**: la `OPENAQ_API_KEY` no está seteada o es inválida (debe ser de ~64 chars).
- **`rows_upserted: 0` y `skipped_stale` alto**: todas las lecturas vinieron rancias; revisar el umbral de frescura o si la red está reportando.
- **Rate limit (429) en logs**: bajar la concurrencia/aumentar el throttle del loop en `ingest-openaq`.
- **El mapa sigue mostrando estaciones sintéticas**: falta aplicar `0013` (paso 5).
