-- 0018_grant_service_role_readings_write.sql
-- Completa los privilegios de escritura del service_role sobre `readings`.
-- 0015 otorgó SELECT/INSERT/UPDATE en la TABLA, pero un INSERT directo necesita
-- además USAGE sobre la secuencia de la PK (`readings_id_seq`), y la suite E2E
-- (feature 003) requiere DELETE para limpiar la lectura que inyecta al probar el
-- disparo de alertas (SC-006, huella cero). La ingesta 002 nunca lo destapó
-- porque escribe vía el RPC `ingest_readings` (SECURITY DEFINER, owner postgres),
-- que no ejercita estos grants directos.
--
-- service_role es la clave server-side todopoderosa (ya bypassa RLS); concederle
-- estos privilegios sobre `readings` es coherente con su rol de ingesta.

GRANT USAGE ON SEQUENCE public.readings_id_seq TO service_role;
GRANT DELETE ON public.readings TO service_role;
