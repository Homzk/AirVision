-- 0002_readings.sql
-- Mediciones en formato ancho (una fila por estación + timestamp).
-- Los tres contaminantes son nullable individualmente; al menos uno debe venir.

CREATE TABLE readings (
    id              BIGSERIAL PRIMARY KEY,
    station_id      BIGINT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    measured_at     TIMESTAMPTZ NOT NULL,
    pm25            DOUBLE PRECISION,
    pm10            DOUBLE PRECISION,
    o3              DOUBLE PRECISION,
    inserted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT readings_unique_measure UNIQUE (station_id, measured_at),
    CONSTRAINT readings_at_least_one   CHECK (pm25 IS NOT NULL OR pm10 IS NOT NULL OR o3 IS NOT NULL),
    CONSTRAINT readings_nonneg_pm25    CHECK (pm25 IS NULL OR pm25 >= 0),
    CONSTRAINT readings_nonneg_pm10    CHECK (pm10 IS NULL OR pm10 >= 0),
    CONSTRAINT readings_nonneg_o3      CHECK (o3   IS NULL OR o3   >= 0)
);

CREATE INDEX readings_station_time_idx ON readings (station_id, measured_at DESC);
CREATE INDEX readings_measured_at_idx  ON readings (measured_at DESC);

ALTER TABLE readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY readings_select_public ON readings
    FOR SELECT TO anon, authenticated USING (true);
