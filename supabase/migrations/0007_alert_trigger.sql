-- 0007_alert_trigger.sql
-- Núcleo de US5: evaluación edge-triggered de alertas dentro de la misma
-- transacción del INSERT en `readings`.
--
-- Para cada alerta cuya estación coincide con la del nuevo reading:
--   * extrae el valor del contaminante correspondiente; si es NULL, salta.
--   * evalúa la condición (greater_than | less_than vs threshold).
--   * si cond_met AND is_armed → registra disparo en alert_history y
--     desarma la alerta.
--   * si NOT cond_met AND NOT is_armed → re-arma (próximo cruce volverá a
--     disparar).
--
-- SECURITY DEFINER permite insertar en alert_history aunque la RLS de esa
-- tabla no exponga INSERT al cliente. search_path = public protege de
-- ataques por shadowing de nombres.

CREATE FUNCTION evaluate_alerts() RETURNS TRIGGER AS $$
DECLARE
    a         alerts%ROWTYPE;
    v         DOUBLE PRECISION;
    cond_met  BOOLEAN;
BEGIN
    FOR a IN SELECT * FROM alerts WHERE station_id = NEW.station_id LOOP
        v := CASE a.pollutant
                 WHEN 'pm25' THEN NEW.pm25
                 WHEN 'pm10' THEN NEW.pm10
                 WHEN 'o3'   THEN NEW.o3
             END;

        IF v IS NULL THEN
            CONTINUE;
        END IF;

        cond_met := (a.direction = 'greater_than' AND v >  a.threshold)
                 OR (a.direction = 'less_than'    AND v <  a.threshold);

        IF cond_met AND a.is_armed THEN
            INSERT INTO alert_history (alert_id, user_id, reading_id, triggered_value)
            VALUES (a.id, a.user_id, NEW.id, v);
            UPDATE alerts SET is_armed = false WHERE id = a.id;
        ELSIF (NOT cond_met) AND (NOT a.is_armed) THEN
            UPDATE alerts SET is_armed = true WHERE id = a.id;
        END IF;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER readings_evaluate_alerts_trigger
AFTER INSERT ON readings
FOR EACH ROW EXECUTE FUNCTION evaluate_alerts();
