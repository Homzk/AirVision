# Data Model

**Feature**: 001-air-quality-dashboard
**Date**: 2026-05-18
**Database**: PostgreSQL 15 (Supabase Cloud)

5 tablas + 1 vista + 3 triggers + 3 ENUMs. Todas las tablas tienen RLS
habilitado. Convención: `snake_case` para tablas, columnas, índices y
funciones (constitución I).

---

## Tipos enumerados

```sql
CREATE TYPE pollutant AS ENUM ('pm25', 'pm10', 'o3');
CREATE TYPE alert_direction AS ENUM ('greater_than', 'less_than');
```

---

## Tabla 1: `stations`

Catálogo de estaciones de monitoreo. Identidad heredada de OpenAQ
(`location_id`).

```sql
CREATE TABLE stations (
    id              BIGINT PRIMARY KEY,                -- OpenAQ location_id
    name            TEXT NOT NULL,
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    country_code    TEXT NOT NULL,                     -- ISO 3166-1 alpha-2 ("CL")
    city            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT stations_lat_chk  CHECK (latitude  BETWEEN -90  AND 90),
    CONSTRAINT stations_lon_chk  CHECK (longitude BETWEEN -180 AND 180)
);

CREATE INDEX stations_country_idx ON stations (country_code);
```

**RLS**:

```sql
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
CREATE POLICY stations_select_public ON stations
    FOR SELECT TO anon, authenticated USING (true);
-- No policies for INSERT/UPDATE/DELETE → service_role only.
```

---

## Tabla 2: `readings`

Mediciones, formato ancho (una fila por estación + timestamp).

```sql
CREATE TABLE readings (
    id              BIGSERIAL PRIMARY KEY,
    station_id      BIGINT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    measured_at     TIMESTAMPTZ NOT NULL,
    pm25            DOUBLE PRECISION,
    pm10            DOUBLE PRECISION,
    o3              DOUBLE PRECISION,
    inserted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT readings_unique_measure UNIQUE (station_id, measured_at),
    CONSTRAINT readings_at_least_one CHECK (pm25 IS NOT NULL OR pm10 IS NOT NULL OR o3 IS NOT NULL),
    CONSTRAINT readings_nonneg_pm25 CHECK (pm25 IS NULL OR pm25 >= 0),
    CONSTRAINT readings_nonneg_pm10 CHECK (pm10 IS NULL OR pm10 >= 0),
    CONSTRAINT readings_nonneg_o3   CHECK (o3   IS NULL OR o3   >= 0)
);

CREATE INDEX readings_station_time_idx ON readings (station_id, measured_at DESC);
CREATE INDEX readings_measured_at_idx  ON readings (measured_at DESC);  -- para job de limpieza
```

**RLS**:

```sql
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY readings_select_public ON readings
    FOR SELECT TO anon, authenticated USING (true);
```

**Upsert idempotente** (Edge Function `ingest-openaq`):

```sql
INSERT INTO readings (station_id, measured_at, pm25, pm10, o3)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (station_id, measured_at) DO UPDATE
SET pm25 = COALESCE(EXCLUDED.pm25, readings.pm25),
    pm10 = COALESCE(EXCLUDED.pm10, readings.pm10),
    o3   = COALESCE(EXCLUDED.o3,   readings.o3);
```

**Retención**: Job manual (`pg_cron` o Supabase scheduled function)
elimina filas con `measured_at < now() - interval '40 days'`. Margen de
10 días sobre los 30 mínimos del MVP.

---

## Tabla 3: `user_favorites`

Relación N:N entre `auth.users` y `stations`, con clave compuesta.

```sql
CREATE TABLE user_favorites (
    user_id     UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    station_id  BIGINT NOT NULL REFERENCES stations(id)   ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, station_id)
);

CREATE INDEX user_favorites_user_idx ON user_favorites (user_id, created_at DESC);
```

**RLS**:

```sql
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_favorites_select_own ON user_favorites
    FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_favorites_insert_own ON user_favorites
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY user_favorites_delete_own ON user_favorites
    FOR DELETE TO authenticated USING (user_id = auth.uid());
```

**Límite de 10 favoritos por usuario** — trigger:

```sql
CREATE FUNCTION enforce_favorites_limit() RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM user_favorites WHERE user_id = NEW.user_id) >= 10 THEN
        RAISE EXCEPTION 'Máximo 10 estaciones favoritas por usuario'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_favorites_limit_trigger
BEFORE INSERT ON user_favorites
FOR EACH ROW EXECUTE FUNCTION enforce_favorites_limit();
```

---

## Tabla 4: `alerts`

Reglas de alerta por usuario. La máquina de estado edge-triggered vive
en `is_armed` (Q1).

```sql
CREATE TABLE alerts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    station_id  BIGINT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    pollutant   pollutant NOT NULL,
    threshold   DOUBLE PRECISION NOT NULL CHECK (threshold >= 0),
    direction   alert_direction NOT NULL,
    is_armed    BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX alerts_user_idx     ON alerts (user_id, created_at DESC);
CREATE INDEX alerts_station_idx  ON alerts (station_id);
```

**RLS**:

```sql
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY alerts_select_own ON alerts
    FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY alerts_insert_own ON alerts
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY alerts_update_own ON alerts
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY alerts_delete_own ON alerts
    FOR DELETE TO authenticated USING (user_id = auth.uid());
```

**Límite de 5 alertas por usuario** — trigger:

```sql
CREATE FUNCTION enforce_alerts_limit() RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM alerts WHERE user_id = NEW.user_id) >= 5 THEN
        RAISE EXCEPTION 'Máximo 5 alertas por usuario'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alerts_limit_trigger
BEFORE INSERT ON alerts
FOR EACH ROW EXECUTE FUNCTION enforce_alerts_limit();
```

---

## Tabla 5: `alert_history`

Disparos registrados por el trigger `evaluate_alerts`. El campo `seen`
implementa Q2.

```sql
CREATE TABLE alert_history (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id          UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- denormalizado para RLS y filtro Realtime
    reading_id        BIGINT NOT NULL REFERENCES readings(id) ON DELETE CASCADE,
    triggered_value   DOUBLE PRECISION NOT NULL,
    triggered_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    seen              BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX alert_history_user_idx ON alert_history (user_id, triggered_at DESC);
CREATE INDEX alert_history_alert_idx ON alert_history (alert_id);
CREATE INDEX alert_history_unseen_idx ON alert_history (user_id) WHERE seen = false;
```

**RLS**:

```sql
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY alert_history_select_own ON alert_history
    FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY alert_history_update_own ON alert_history
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- INSERT lo hace el trigger en SECURITY DEFINER; los clientes nunca insertan directamente.
-- DELETE no se expone a clientes (la rotación a 20 se hace en trigger).
```

**Rotación a 20 entradas por usuario** — trigger:

```sql
CREATE FUNCTION rotate_alert_history() RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM alert_history
    WHERE id IN (
        SELECT id FROM alert_history
        WHERE user_id = NEW.user_id
        ORDER BY triggered_at DESC
        OFFSET 20
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alert_history_rotate_trigger
AFTER INSERT ON alert_history
FOR EACH ROW EXECUTE FUNCTION rotate_alert_history();
```

---

## Trigger principal: evaluación de alertas

Implementa la semántica edge-triggered (Q1). Corre en la misma
transacción del INSERT en `readings`.

```sql
CREATE FUNCTION evaluate_alerts() RETURNS TRIGGER AS $$
DECLARE
    a            alerts%ROWTYPE;
    v            DOUBLE PRECISION;
    cond_met     BOOLEAN;
BEGIN
    FOR a IN SELECT * FROM alerts WHERE station_id = NEW.station_id LOOP
        v := CASE a.pollutant
                 WHEN 'pm25' THEN NEW.pm25
                 WHEN 'pm10' THEN NEW.pm10
                 WHEN 'o3'   THEN NEW.o3
             END;

        -- Sin lectura para ese contaminante en esta fila → no se evalúa.
        IF v IS NULL THEN
            CONTINUE;
        END IF;

        cond_met := (a.direction = 'greater_than' AND v >  a.threshold)
                 OR (a.direction = 'less_than'    AND v <  a.threshold);

        IF cond_met AND a.is_armed THEN
            INSERT INTO alert_history (alert_id, user_id, reading_id, triggered_value)
            VALUES (a.id, a.user_id, NEW.id, v);
            UPDATE alerts SET is_armed = false WHERE id = a.id;
        ELSIF (NOT cond_met) AND (NOT a.is_armed) THEN
            UPDATE alerts SET is_armed = true WHERE id = a.id;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER readings_evaluate_alerts_trigger
AFTER INSERT ON readings
FOR EACH ROW EXECUTE FUNCTION evaluate_alerts();
```

Nota: `SECURITY DEFINER` permite al trigger insertar en `alert_history`
sin que el rol que ejecuta el INSERT original tenga ese permiso. El
`search_path` de la función se fijará explícitamente para evitar
ataques de privilege escalation.

---

## Vista: `latest_station_readings`

Última fila por estación para el mapa.

```sql
CREATE VIEW latest_station_readings AS
SELECT DISTINCT ON (station_id)
    station_id,
    measured_at,
    pm25,
    pm10,
    o3
FROM readings
ORDER BY station_id, measured_at DESC;
```

La vista hereda los permisos SELECT de `readings` (público).

---

## Realtime publication

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE readings;
ALTER PUBLICATION supabase_realtime ADD TABLE alert_history;
```

---

## Resumen de relaciones (ASCII)

```text
auth.users (Supabase)  ──┐
                          │
                          ├─< user_favorites >── stations  ──< readings ──> (trigger) ──> alert_history
                          │                            ▲                                       ▲
                          ├─< alerts ──────────────────┘                                       │
                          │       ▲                                                             │
                          └───────┴─────────────────────────────────────────────────────────────┘
```

---

## Mapeo Entidad-spec → tabla

| Entidad del spec  | Tabla            | Notas                                             |
| ----------------- | ---------------- | ------------------------------------------------- |
| Estación          | `stations`       | Sin estado de ciclo de vida (Q3 → D)              |
| Lectura           | `readings`       | Wide format (Q4 implícito); pm25/pm10/o3 nullable |
| Usuario           | `auth.users`     | Provisto por Supabase Auth                        |
| Favorito          | `user_favorites` | Límite 10 por trigger                             |
| Alerta            | `alerts`         | `is_armed` implementa edge-trigger (Q1)           |
| Disparo de alerta | `alert_history`  | `seen` implementa el badge (Q2); rotación a 20    |
