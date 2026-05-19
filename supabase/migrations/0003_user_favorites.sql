-- 0003_user_favorites.sql
-- Relación N:N entre auth.users y stations. La PK compuesta evita duplicados
-- y un trigger BEFORE INSERT impone el límite de 10 favoritos por usuario.

CREATE TABLE user_favorites (
    user_id     UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    station_id  BIGINT NOT NULL REFERENCES stations(id)   ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, station_id)
);

CREATE INDEX user_favorites_user_idx ON user_favorites (user_id, created_at DESC);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_favorites_select_own ON user_favorites
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY user_favorites_insert_own ON user_favorites
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY user_favorites_delete_own ON user_favorites
    FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Límite de 10 favoritos por usuario.
-- La función corre con el rol del usuario que inserta: la RLS sobre
-- user_favorites garantiza que el COUNT solo ve filas propias y coincide
-- con NEW.user_id (= auth.uid() forzado por user_favorites_insert_own).
CREATE FUNCTION enforce_favorites_limit() RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM user_favorites WHERE user_id = NEW.user_id) >= 10 THEN
        RAISE EXCEPTION 'Máximo 10 estaciones favoritas por usuario'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_favorites_limit_trigger
BEFORE INSERT ON user_favorites
FOR EACH ROW EXECUTE FUNCTION enforce_favorites_limit();
