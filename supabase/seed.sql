-- seed.sql
-- Datos sintéticos para desarrollo: 5 estaciones de Chile + 24 h de lecturas
-- horarias por estación. NO es seed automático en `supabase db push`; córrelo
-- manualmente desde Studio (SQL Editor) o `psql` apuntando a la BD remota.
--
-- Idempotente: usa ON CONFLICT en ambas tablas. Borra las filas sembradas
-- cuando conectes la ingesta real de OpenAQ:
--   DELETE FROM readings  WHERE station_id BETWEEN 1 AND 5;
--   DELETE FROM stations  WHERE id         BETWEEN 1 AND 5;

INSERT INTO stations (id, name, latitude, longitude, country_code, city) VALUES
    (1, 'Parque O''Higgins',     -33.4642, -70.6614, 'CL', 'Santiago'),
    (2, 'Las Condes',            -33.4150, -70.5828, 'CL', 'Santiago'),
    (3, 'Plaza Independencia',   -36.8270, -73.0498, 'CL', 'Concepción'),
    (4, 'Plaza Sotomayor',       -33.0367, -71.6248, 'CL', 'Valparaíso'),
    (5, 'Padre Las Casas',       -38.7600, -72.6010, 'CL', 'Temuco')
ON CONFLICT (id) DO NOTHING;

-- 24 lecturas por estación (una por hora, terminando en now()), con bases
-- distintas para que el mapa muestre toda la paleta de colores.
INSERT INTO readings (station_id, measured_at, pm25, pm10, o3)
SELECT
    s.station_id,
    date_trunc('hour', now()) - (s.hours_ago || ' hours')::interval AS measured_at,
    GREATEST(0, s.base_pm25 + (random() * 10 - 5))::double precision AS pm25,
    GREATEST(0, s.base_pm10 + (random() * 20 - 10))::double precision AS pm10,
    GREATEST(0, s.base_o3   + (random() * 15 - 7.5))::double precision AS o3
FROM (
    SELECT 1 AS station_id, generate_series(0, 23) AS hours_ago, 42 AS base_pm25,  85 AS base_pm10, 70 AS base_o3
    UNION ALL SELECT 2, generate_series(0, 23), 18,  40, 55
    UNION ALL SELECT 3, generate_series(0, 23), 22,  50, 45
    UNION ALL SELECT 4, generate_series(0, 23),  8,  20, 30
    UNION ALL SELECT 5, generate_series(0, 23), 65, 160, 80
) s
ON CONFLICT (station_id, measured_at) DO NOTHING;
