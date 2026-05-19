-- 0001_stations.sql
-- Catálogo de estaciones de monitoreo (identidad heredada de OpenAQ location_id).

CREATE TABLE stations (
    id              BIGINT PRIMARY KEY,
    name            TEXT NOT NULL,
    latitude        DOUBLE PRECISION NOT NULL,
    longitude       DOUBLE PRECISION NOT NULL,
    country_code    TEXT NOT NULL,
    city            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT stations_lat_chk CHECK (latitude  BETWEEN -90  AND 90),
    CONSTRAINT stations_lon_chk CHECK (longitude BETWEEN -180 AND 180)
);

CREATE INDEX stations_country_idx ON stations (country_code);

ALTER TABLE stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY stations_select_public ON stations
    FOR SELECT TO anon, authenticated USING (true);
