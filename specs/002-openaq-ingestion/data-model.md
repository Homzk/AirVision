# Data Model — Feature 002 (Ingesta OpenAQ)

**Date**: 2026-05-30
**Resumen**: **sin cambios de esquema**. Se reutilizan `stations` y `readings` del feature 001 tal cual. La única operación de datos nueva es una migración que borra el seed sintético. El "modelo" de este feature es el **mapeo del payload de OpenAQ v3 a esas tablas**, que vive en código (no en la BD).

---

## Tablas reutilizadas (sin cambios)

### `stations` (existente)

| Columna          | Origen en OpenAQ v3 (`/v3/locations`)      |
| ---------------- | ------------------------------------------ |
| `id` (BIGINT PK) | `location.id` (el `location_id` de OpenAQ) |
| `name`           | `location.name`                            |
| `latitude`       | `location.coordinates.latitude`            |
| `longitude`      | `location.coordinates.longitude`           |
| `country_code`   | `location.country.code` (`"CL"`)           |
| `city`           | `location.locality`                        |

Upsert: `ON CONFLICT (id) DO UPDATE SET name=…, latitude=…, …` (idempotente; solo actualiza metadatos si cambian).

### `readings` (existente)

| Columna                | Origen en OpenAQ v3 (`/v3/locations/{id}/latest`)                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------- |
| `station_id`           | `result.locationsId`                                                                                      |
| `measured_at`          | `result.datetime.utc`                                                                                     |
| `pm25` / `pm10` / `o3` | `result.value`, ubicado en la columna según `sensorsId → parameter` (catálogo de sensores de la estación) |

Upsert idempotente (igual que el contrato de ingesta del 001):

```sql
INSERT INTO readings (station_id, measured_at, pm25, pm10, o3)
VALUES (...)
ON CONFLICT (station_id, measured_at) DO UPDATE
SET pm25 = COALESCE(EXCLUDED.pm25, readings.pm25),
    pm10 = COALESCE(EXCLUDED.pm10, readings.pm10),
    o3   = COALESCE(EXCLUDED.o3,   readings.o3);
```

El `COALESCE` implementa la fusión de reportes parciales (FR-006): si una estación reporta solo PM2.5 en un ciclo, no borra el PM10/O₃ guardados antes.

---

## Migración nueva: `0013_remove_synthetic_seed.sql`

Única DML del feature. Borra las 13 estaciones sintéticas (y sus lecturas por cascade):

```sql
-- Limpieza del seed sintético del feature 001: los location_id reales de
-- OpenAQ (25, 26, 45…) conviven con los ids 1–13 sembrados a mano.
-- readings.station_id REFERENCES stations(id) ON DELETE CASCADE → las
-- lecturas sintéticas se borran solas. Idempotente.
DELETE FROM stations WHERE id BETWEEN 1 AND 13;
```

> No hay cambios de DDL: ni columnas, ni índices, ni RLS, ni triggers nuevos. La publicación de tiempo real de `readings` sigue activa y propaga las inserciones de `ingest-openaq` al frontend sin cambios.

---

## Transformación clave: long → wide (en código, no en BD)

OpenAQ entrega mediciones en **formato largo** (una por sensor). El dashboard usa **formato ancho** (una fila por estación+instante con 3 columnas). La normalización agrupa por `(locationsId, datetime.utc)` y coloca cada `value` en su columna según el contaminante del sensor:

```
/locations/25/latest →
  { sensorsId:1044(pm25), value:67, datetime:"...20:00Z" }   ┐
  { sensorsId:1047(pm10), value:158, datetime:"...20:00Z" }  ├─► { station_id:25, measured_at:"...20:00Z",
  { sensorsId:114(o3),   value:0.59, datetime:"...2021..." } ┘        pm25:67, pm10:158, o3:NULL(rancio) }
```

(El O₃ del ejemplo se descarta por R-fresh: su `datetime` es de 2021 → más viejo que el umbral de 3 h → queda `NULL`.)
