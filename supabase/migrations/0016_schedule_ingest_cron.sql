-- 0016_schedule_ingest_cron.sql
-- T013 (feature 002): agenda la ingesta automática cada 15 min.
--
-- Cierra la deuda #6 de NOTES.md: hasta ahora `ingest-openaq` solo corría a
-- mano (1ª corrida manual). Este cron la invoca por HTTP cada 15 minutos vía
-- pg_net, de modo que `readings` se repone sola y el realtime del mapa refleja
-- datos frescos sin intervención. `seed-stations` NO se agenda (catálogo = one-shot).
--
-- La anon key (formato JWT `eyJ…`, role:"anon") solo pasa el gateway de Edge
-- Functions; por dentro la función usa el `service_role` de su secret. La anon
-- key ya es pública (se hornea en el bundle del cliente), así que vive aquí sin
-- riesgo. Ver decisión `feedback-legacy-supabase-keys` y quickstart §6.
--
-- Idempotente: `cron.schedule(jobname, ...)` hace upsert por nombre (pg_cron ≥1.4),
-- así que re-aplicar la migración solo actualiza el job existente.

create extension if not exists pg_cron;
create extension if not exists pg_net;

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
    body := '{}'::jsonb
  )
  $$
);
