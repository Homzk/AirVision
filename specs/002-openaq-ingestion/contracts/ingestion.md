# Contracts — Feature 002 (Ingesta OpenAQ)

El **contrato técnico detallado** de las Edge Functions (endpoints, shapes,
flow, failure modes, exports del módulo compartido) ya fue validado contra la
API real y vive en:

➡️ [`specs/001-air-quality-dashboard/contracts/edge-functions.md`](../../001-air-quality-dashboard/contracts/edge-functions.md)

Este documento consolida las **decisiones resueltas en Phase 0** (ver
[`research.md`](../research.md)) que cierran los puntos abiertos del contrato.

---

## Decisiones que cierran el contrato

| Punto abierto en el contrato                       | Decisión (research.md)                                                                                                                                                |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ¿Cómo obtener mediciones sin `/measurements?bbox`? | **D1**: per-location `GET /locations/{id}/latest`, ~112/ciclo, con throttling <60 req/min. El bulk `/parameters/{id}/latest` se descarta (ignora bbox, 25k globales). |
| Umbral de frescura (R-fresh)                       | **D2**: **3 h**, evaluado por contaminante; configurable vía env var.                                                                                                 |
| Limpieza del seed sintético                        | **D4**: migración `0013_remove_synthetic_seed.sql` (`DELETE … id BETWEEN 1 AND 13`, cascade).                                                                         |
| Agendado del cron                                  | **D5**: cron de Supabase Cloud (dashboard o `pg_cron`+`pg_net`) para `ingest-openaq` `*/15 * * * *`; `seed-stations` queda manual.                                    |

## Interfaces del módulo compartido `_shared/openaq.ts` (ajustadas a v3 real)

```ts
export const PARAM_ID = { pm10: 1, pm25: 2, o3: 3 } as const
export type Pollutant = keyof typeof PARAM_ID

export interface OpenAQLocation {
  id: number; name: string; locality: string | null
  coordinates: { latitude: number; longitude: number }
  country: { code: string }
  datetimeLast: { utc: string } | null
  sensors: { id: number; parameter: { id: number; name: string; units: string } }[]
}
export interface OpenAQLatest {
  sensorsId: number; value: number
  datetime: { utc: string }; locationsId: number
}

export async function* fetchLocations(bbox: string): AsyncIterable<OpenAQLocation>
export async function fetchLocationLatest(locationId: number): Promise<OpenAQLatest[]>
export function isInvalidReading(p: Pollutant, value: number): boolean   // negativo u outlier
export function isStale(measuredAtUtc: string, maxAgeHours?: number): boolean  // R-fresh, default 3h
```

## Contrato de comportamiento (resumen, autoritativo en el contrato del 001)

- **`seed-stations`** (manual, one-shot): `fetchLocations(bboxChile)` con `?parameters_id=1,2,3` → normalizar → upsert `stations` `ON CONFLICT (id)`. Devuelve `{ ok, summary:{ stations_upserted } }`.
- **`ingest-openaq`** (cron \*/15): por cada `station_id` fresco → `fetchLocationLatest(id)` → mapear `sensorsId→pollutant` → descartar `isInvalidReading` y `isStale` → normalizar long→wide → upsert `readings` `ON CONFLICT (station_id, measured_at) DO UPDATE COALESCE`. Devuelve `{ ok, summary:{ rows_upserted, skipped_stale, skipped_invalid, errors } }`. **Siempre 200** aunque OpenAQ falle (un ciclo perdido lo recupera el siguiente).
