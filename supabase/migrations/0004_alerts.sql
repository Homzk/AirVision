-- 0004_alerts.sql
-- Reglas de alerta por usuario. La máquina de estado edge-triggered vive en
-- `is_armed`: empieza true, se apaga al disparar (cond_met) y se re-arma
-- cuando una medición posterior no cumple la condición. Tope 5 vía trigger.

CREATE TYPE pollutant AS ENUM ('pm25', 'pm10', 'o3');
CREATE TYPE alert_direction AS ENUM ('greater_than', 'less_than');

CREATE TABLE alerts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    station_id  BIGINT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    pollutant   pollutant NOT NULL,
    threshold   DOUBLE PRECISION NOT NULL CHECK (threshold >= 0),
    direction   alert_direction NOT NULL,
    is_armed    BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX alerts_user_idx    ON alerts (user_id, created_at DESC);
CREATE INDEX alerts_station_idx ON alerts (station_id);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY alerts_select_own ON alerts
    FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY alerts_insert_own ON alerts
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY alerts_update_own ON alerts
    FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY alerts_delete_own ON alerts
    FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Límite de 5 alertas por usuario.
CREATE FUNCTION enforce_alerts_limit() RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM alerts WHERE user_id = NEW.user_id) >= 5 THEN
        RAISE EXCEPTION 'Máximo 5 alertas por usuario'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER alerts_limit_trigger
BEFORE INSERT ON alerts
FOR EACH ROW EXECUTE FUNCTION enforce_alerts_limit();
