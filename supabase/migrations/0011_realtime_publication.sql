-- 0011_realtime_publication.sql
-- Habilita Realtime para INSERTs en readings (mapa + paneles se actualizan en vivo).
-- Idempotente: no falla si la tabla ya está en la publicación.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'readings'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE readings;
    END IF;
END
$$;
