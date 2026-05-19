-- 0010_latest_reading_view.sql
-- Última lectura por estación; alimenta el color del marcador en el mapa.
-- security_invoker=on hace que la vista respete la RLS de readings (público SELECT).

CREATE VIEW latest_station_readings
WITH (security_invoker = on) AS
SELECT DISTINCT ON (station_id)
    station_id,
    measured_at,
    pm25,
    pm10,
    o3
FROM readings
ORDER BY station_id, measured_at DESC;

GRANT SELECT ON latest_station_readings TO anon, authenticated;
