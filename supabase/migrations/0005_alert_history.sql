-- 0005_alert_history.sql
-- Disparos registrados por `evaluate_alerts()` (migración 0007). Una fila
-- por disparo, con denormalización de `user_id` para que RLS y el filtro
-- de Realtime puedan operar sin joins.

CREATE TABLE alert_history (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id          UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reading_id        BIGINT NOT NULL REFERENCES readings(id) ON DELETE CASCADE,
    triggered_value   DOUBLE PRECISION NOT NULL,
    triggered_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    seen              BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX alert_history_user_idx   ON alert_history (user_id, triggered_at DESC);
CREATE INDEX alert_history_alert_idx  ON alert_history (alert_id);
CREATE INDEX alert_history_unseen_idx ON alert_history (user_id) WHERE seen = false;

ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY alert_history_select_own ON alert_history
    FOR SELECT TO authenticated USING (user_id = auth.uid());

-- UPDATE solo para marcar `seen = true`; no exponemos DELETE ni INSERT al cliente.
-- INSERTs vienen del trigger en `readings` (SECURITY DEFINER, 0007).
-- DELETE viene del trigger de rotación a 20 entradas (0009).
CREATE POLICY alert_history_update_own ON alert_history
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Realtime: agrega alert_history a la publicación supabase_realtime de forma idempotente.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'alert_history'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE alert_history;
    END IF;
END
$$;
