# Edge Function Contracts

**Feature**: 001-air-quality-dashboard
**Runtime**: Deno (Supabase Edge Functions)
**Location**: `supabase/functions/`

Estas funciones corren del lado de Supabase Cloud, NUNCA son invocadas
desde el navegador. El frontend no las conoce.

> **⚠️ Actualizado tras explorar la API real de OpenAQ v3 (2026-05-30).**
> El diseño original asumía un endpoint global `/v3/measurements?bbox=&parameter=`
> que **no existe** en v3. Esta versión refleja la API real. IDs de parámetro
> confirmados (variante µg/m³ _mass_): **`pm10=1`, `pm25=2`, `o3=3`** (O₃ también
> existe como ppm=10 / ppb=32 — NO usar esas). Cobertura real: ~150 estaciones
> chilenas con sensor PM2.5, ~112 con lecturas frescas (vs. 13 sintéticas).

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

> **No hay endpoint global de mediciones en v3.** Las mediciones son
> por-sensor (`/sensors/{id}/measurements`, que además ordena de más viejo a
> más nuevo) o por-location (`/locations/{id}/latest`, snapshot actual). La
> estrategia de ingesta usa el snapshot por-location.

```
1. now      := nowUtc()
2. maxAge   := 3 hours            # umbral de frescura (R-fresh)
3. stations := SELECT id FROM stations            # ids = OpenAQ location_id
     (o cachear los location_id frescos que devolvió seed-stations)
4. for each location_id in stations:
     GET https://api.openaq.org/v3/locations/<location_id>/latest
       header X-API-Key: $OPENAQ_API_KEY
       (3 reintentos con backoff exponencial 1s/2s/4s ante 429 o 5xx)
     respuesta: results[] de { sensorsId, value, datetime:{utc} }
5. map sensorsId → pollutant usando el catálogo de sensores
   (sensors[].parameter.name de /locations/<id>, paramId ∈ {1:pm10, 2:pm25, 3:o3})
6. normalize → 1 fila por (station_id, measured_at=datetime.utc) en formato ancho
   { station_id, measured_at, pm25?, pm10?, o3? }
7. validate (descartar + log):
   - value < 0                                   → inválido
   - value > 10 × hazardous_threshold(pollutant) → outlier
   - (now - measured_at) > maxAge                → RANCIO (sensor muerto) ⟵ NUEVO
8. upsert batch a `readings` vía supabase-js con service_role
   ON CONFLICT (station_id, measured_at) DO UPDATE COALESCE
9. log summary: { rows_upserted, skipped_invalid, skipped_stale, errors }
10. return 200 { ok: true, summary }
```

> **R-fresh (regla nueva, descubierta explorando)**: en una misma estación
> activa, unos sensores reportan hoy y otros llevan **años** muertos. Ejemplo
> real (Parque O'Higgins, location 25): PM2.5/PM10 frescos (hoy), pero O₃ con
> última lectura en **2021** y SO₂ en **2017**. `/latest` devuelve el último
> valor _de la historia_ sin filtrar fecha → hay que descartar por antigüedad
> **por contaminante**, no por estación, o el dashboard mostraría O₃ de 2021
> como actual.

> **Coste/rate-limit (punto abierto para `/speckit-plan`)**: ~112 locations
> frescas × 1 request cada 15 min. Evaluar si existe un `/latest` bulk por
> parámetro o paginar `/parameters/{id}/latest`; si no, throttlear el loop.

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
       ?parameters_id=1,2,3              # pm10, pm25, o3 (NO ?parameter=nombre)
       &bbox=-75.7,-56.0,-66.5,-17.5
       &limit=1000
       &page=<page>
2. normalize cada result → { id, name, latitude:coordinates.latitude,
     longitude:coordinates.longitude, country_code:country.code, city:locality }
   (opcional: descartar las que no tengan datetimeLast reciente)
3. upsert a `stations` ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, ...
4. log summary
5. return 200 { ok: true, summary }
```

> **Limpieza del seed sintético (paso de migración, una vez)**: los
> `location_id` reales son enteros chicos (25, 26, 45…) que **conviven** con
> los ids sintéticos `1–13`. Antes/después de la primera ingesta real hay que
> borrar las filas sembradas para no mostrar estaciones duplicadas/falsas:
> `DELETE FROM readings WHERE station_id BETWEEN 1 AND 13;`
> `DELETE FROM stations WHERE id BETWEEN 1 AND 13;`

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

Exports (ajustados a v3 real):

- `const PARAM_ID = { pm10: 1, pm25: 2, o3: 3 } as const` — y su inverso `ID_TO_POLLUTANT`.
- `type OpenAQLocation` — `{ id, name, locality, coordinates:{latitude,longitude}, country:{code}, datetimeLast:{utc}, sensors:{ id, parameter:{ id, name, units } }[] }`.
- `type OpenAQLatest` — `{ sensorsId, value, datetime:{utc}, locationsId }` (shape de `/locations/{id}/latest`).
- `async function* fetchLocations(bbox): AsyncIterable<OpenAQLocation>` — paginación automática (`?parameters_id=1,2,3`).
- `async function fetchLocationLatest(id): Promise<OpenAQLatest[]>` — con reintentos/backoff.
- `function isInvalidReading(p: pollutant, v: number): boolean` — valor negativo u outlier (R1).
- `function isStale(measuredAtUtc: string, maxAgeHours = 3): boolean` — regla R-fresh (sensor muerto).
