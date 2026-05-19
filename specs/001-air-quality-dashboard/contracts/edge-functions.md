# Edge Function Contracts

**Feature**: 001-air-quality-dashboard
**Runtime**: Deno (Supabase Edge Functions)
**Location**: `supabase/functions/`

Estas funciones corren del lado de Supabase Cloud, NUNCA son invocadas
desde el navegador. El frontend no las conoce.

---

## `ingest-openaq`

**Invocación**: Cron programado cada 15 minutos
(`*/15 * * * *`), configurado en el dashboard de Supabase o vía
`supabase functions schedule create`.

**Trigger manual** (debugging): `supabase functions invoke ingest-openaq`

### Input

Ninguno (cron-driven). Lee:

- `OPENAQ_API_KEY` (env var, secret)
- `SUPABASE_URL` (env var)
- `SUPABASE_SERVICE_ROLE_KEY` (env var, secret — sólo visible a la Edge Function)

### Flow

```
1. now := nowUtc()
2. since := now - 30 minutes
3. for pollutant in [pm25, pm10, o3]:
     for page in 1..N until empty:
       GET https://api.openaq.org/v3/measurements
         ?parameter=<pollutant>
         &date_from=<since>
         &date_to=<now>
         &bbox=-75.7,-56.0,-66.5,-17.5
         &limit=1000
         &page=<page>
       header X-API-Key: $OPENAQ_API_KEY
       (3 reintentos con backoff exponencial 1s/2s/4s ante 429 o 5xx)
4. normalize → array de { station_id, measured_at, pm25?, pm10?, o3? }
   agrupando por (station_id, measured_at)
5. validate:
   - value < 0 → discard, log
   - value > 10 × hazardous_threshold(pollutant) → discard, log
6. upsert batch a `readings` vía supabase-js con service_role
   ON CONFLICT (station_id, measured_at) DO UPDATE COALESCE
7. log summary: { ingested, skipped, errors }
8. return 200 { ok: true, summary }
```

### Output

`200 OK` siempre que la función ejecute (incluso si OpenAQ falla y no se
ingesta nada). El cuerpo es informacional, no consumido por nadie:

```json
{
  "ok": true,
  "summary": {
    "duration_ms": 8432,
    "openaq_calls": 12,
    "rows_received": 487,
    "rows_upserted": 102,
    "rows_skipped_invalid": 3,
    "rows_skipped_duplicate": 382,
    "errors": []
  }
}
```

### Failure modes

| Modo                                | Acción                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| OpenAQ 429 (rate limit)             | Backoff exponencial; si los 3 reintentos fallan, registrar en logs y continuar con el siguiente contaminante. |
| OpenAQ 5xx                          | Idem 429.                                                                                                     |
| OpenAQ payload con shape inesperado | Saltar la fila, registrar en logs.                                                                            |
| Supabase insert error               | Re-throw; el siguiente ciclo recupera la ventana de 30 min.                                                   |

### Test plan

Tests unitarios en Deno (`deno test`) sobre la lógica pura de
normalización y validación. La invocación a OpenAQ se mockea con
`fetch`-stubbing.

---

## `seed-stations`

**Invocación**: Manual, una vez por entorno.
`supabase functions invoke seed-stations`

### Input

Ninguno. Lee `OPENAQ_API_KEY` y `SUPABASE_SERVICE_ROLE_KEY` del entorno.

### Flow

```
1. for page in 1..N until empty:
     GET https://api.openaq.org/v3/locations
       ?parameter=pm25,pm10,o3
       &bbox=-75.7,-56.0,-66.5,-17.5
       &limit=1000
       &page=<page>
2. normalize → array de { id, name, latitude, longitude, country_code, city }
3. upsert a `stations` ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, ...
4. log summary
5. return 200 { ok: true, summary }
```

### Output

```json
{
  "ok": true,
  "summary": {
    "duration_ms": 1812,
    "openaq_calls": 1,
    "stations_received": 47,
    "stations_upserted": 47
  }
}
```

### Idempotencia

Re-ejecutar es seguro. El upsert por PK (`id` = OpenAQ location_id)
sólo actualiza metadatos si cambian.

### Test plan

Idénticos en estructura a los de `ingest-openaq`: lógica pura testeada;
fetch mockeado.

---

## Shared module: `_shared/openaq.ts`

Helper compartido. Define los tipos del payload de OpenAQ v3 y el
cliente fetch con manejo de paginación y reintentos.

Exports:

- `type OpenAQMeasurement = { ... }` — shape literal de la API.
- `type OpenAQLocation = { ... }`
- `async function fetchMeasurements(params): AsyncIterable<OpenAQMeasurement>` — paginación automática.
- `async function fetchLocations(params): AsyncIterable<OpenAQLocation>`
- `function isInvalidReading(p: pollutant, v: number): boolean` — aplica reglas de validación (R1).
