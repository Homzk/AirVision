-- 0014_ingest_readings_fn.sql
-- Upsert idempotente con semántica COALESCE para la ingesta (FR-006).
-- supabase-js `.upsert()` sobrescribe TODAS las columnas (incluidos NULLs),
-- lo que borraría valores parciales previos. Esta función hace el
-- `ON CONFLICT DO UPDATE COALESCE` documentado en el contrato, en una sola
-- sentencia sobre un array JSON de filas. La invoca `ingest-openaq` con
-- service_role; no se expone a anon/authenticated.

CREATE OR REPLACE FUNCTION public.ingest_readings(_rows jsonb)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH upserted AS (
    INSERT INTO readings (station_id, measured_at, pm25, pm10, o3)
    SELECT (r->>'station_id')::bigint,
           (r->>'measured_at')::timestamptz,
           (r->>'pm25')::double precision,
           (r->>'pm10')::double precision,
           (r->>'o3')::double precision
    FROM jsonb_array_elements(_rows) AS r
    ON CONFLICT (station_id, measured_at) DO UPDATE
      SET pm25 = COALESCE(EXCLUDED.pm25, readings.pm25),
          pm10 = COALESCE(EXCLUDED.pm10, readings.pm10),
          o3   = COALESCE(EXCLUDED.o3,   readings.o3)
    RETURNING 1
  )
  SELECT count(*)::integer FROM upserted;
$$;

-- La ingesta corre con service_role; revocar el resto por higiene.
REVOKE ALL ON FUNCTION public.ingest_readings(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ingest_readings(jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_readings(jsonb) TO service_role;
