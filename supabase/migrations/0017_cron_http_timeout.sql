-- 0017_cron_http_timeout.sql
-- Ajuste del cron `ingest-openaq-15min` (creado en 0016): el `net.http_post`
-- de pg_net usa un timeout de respuesta por defecto de 5 s, pero un ciclo de
-- ingesta tarda ~80 s (≈107 estaciones frescas × throttle). Aunque la Edge
-- Function corre hasta completarse independientemente del cliente, subimos el
-- timeout a 180 s para que pg_net espere la respuesta real (200) y la registre
-- en `net._http_response` en vez de marcar un timeout espurio.
--
-- `cron.schedule(jobname, ...)` hace upsert por nombre, así que esto reemplaza
-- la definición del job sin duplicarlo. No se edita 0016 (ya aplicada): un
-- `db push` no re-ejecuta migraciones del historial, por eso el cambio va aquí.

select cron.schedule(
  'ingest-openaq-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://dlaplwhyudwmjyvbyfya.supabase.co/functions/v1/ingest-openaq',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsYXBsd2h5dWR3bWp5dmJ5ZnlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxOTI2MTIsImV4cCI6MjA5NDc2ODYxMn0.HlCCWxyZ0MPZ6HIxplgtTj7W0KRel5QDqPNDJfFlR3M',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 180000
  )
  $$
);
