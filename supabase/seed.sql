-- seed.sql
-- Datos sintéticos para desarrollo: 12 estaciones de Chile + 24 h de lecturas
-- horarias por estación. NO es seed automático en `supabase db push`; córrelo
-- manualmente desde Studio (SQL Editor) o `psql` apuntando a la BD remota.
--
-- Idempotente: usa ON CONFLICT en ambas tablas. Re-correrlo agrega readings
-- nuevas en los huecos del rolling window de 24 h (las viejas se conservan).
-- Borra las filas sembradas cuando conectes la ingesta real de OpenAQ:
--   DELETE FROM readings  WHERE station_id BETWEEN 1 AND 12;
--   DELETE FROM stations  WHERE id         BETWEEN 1 AND 12;

INSERT INTO stations (id, name, latitude, longitude, country_code, city) VALUES
    (1,  'Parque O''Higgins',     -33.4642, -70.6614, 'CL', 'Santiago'),
    (2,  'Las Condes',            -33.4150, -70.5828, 'CL', 'Santiago'),
    (3,  'Plaza Independencia',   -36.8270, -73.0498, 'CL', 'Concepción'),
    (4,  'Plaza Sotomayor',       -33.0367, -71.6248, 'CL', 'Valparaíso'),
    (5,  'Padre Las Casas',       -38.7600, -72.6010, 'CL', 'Temuco'),
    (6,  'Cerrillos',             -33.5040, -70.7110, 'CL', 'Santiago'),
    (7,  'Puente Alto',           -33.6110, -70.5780, 'CL', 'Santiago'),
    (8,  'La Florida',            -33.5470, -70.5500, 'CL', 'Santiago'),
    (9,  'Rancagua centro',       -34.1708, -70.7444, 'CL', 'Rancagua'),
    (10, 'Talca centro',          -35.4264, -71.6554, 'CL', 'Talca'),
    (11, 'Chillán centro',        -36.6066, -72.1034, 'CL', 'Chillán'),
    (12, 'Coyhaique',             -45.5712, -72.0680, 'CL', 'Coyhaique')
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
    SELECT 1  AS station_id, generate_series(0, 23) AS hours_ago, 42 AS base_pm25,  85 AS base_pm10, 70 AS base_o3
    UNION ALL SELECT 2,  generate_series(0, 23), 18,  40, 55
    UNION ALL SELECT 3,  generate_series(0, 23), 22,  50, 45
    UNION ALL SELECT 4,  generate_series(0, 23),  8,  20, 30
    UNION ALL SELECT 5,  generate_series(0, 23), 65, 160, 80
    UNION ALL SELECT 6,  generate_series(0, 23), 35,  70, 60
    UNION ALL SELECT 7,  generate_series(0, 23), 45,  90, 65
    UNION ALL SELECT 8,  generate_series(0, 23), 20,  45, 50
    UNION ALL SELECT 9,  generate_series(0, 23), 28,  60, 55
    UNION ALL SELECT 10, generate_series(0, 23), 32,  70, 60
    UNION ALL SELECT 11, generate_series(0, 23), 40,  80, 70
    UNION ALL SELECT 12, generate_series(0, 23), 70, 170, 90
) s
ON CONFLICT (station_id, measured_at) DO NOTHING;
