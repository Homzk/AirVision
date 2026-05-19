-- 0009_history_rotation_trigger.sql
-- Mantiene `alert_history` acotado a las 20 entradas más recientes por
-- usuario. Corre AFTER INSERT (después de que evaluate_alerts añadió la
-- fila nueva) y borra cualquier entrada del mismo usuario más allá de la
-- posición 20.
--
-- SECURITY DEFINER porque la RLS de alert_history no expone DELETE al
-- cliente. search_path = public por higiene.

CREATE FUNCTION rotate_alert_history() RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM alert_history
    WHERE id IN (
        SELECT id FROM alert_history
        WHERE user_id = NEW.user_id
        ORDER BY triggered_at DESC
        OFFSET 20
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER alert_history_rotate_trigger
AFTER INSERT ON alert_history
FOR EACH ROW EXECUTE FUNCTION rotate_alert_history();
