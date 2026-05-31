-- 0015_grant_service_role.sql
-- El service_role (usado por las Edge Functions de ingesta) carecía de
-- privilegios de escritura sobre las tablas públicas: el error 42501
-- "permission denied for table stations" al invocar seed-stations.
--
-- Causa raíz (deuda #1 de NOTES.md): el seed sintético se cargó desde Studio
-- como owner, así que nunca se ejercitó la escritura vía service_role, y las
-- migraciones de tabla (0001/0002) nunca otorgaron GRANTs explícitos.
--
-- seed-stations escribe en `stations` directamente como service_role.
-- ingest-openaq escribe en `readings` vía el RPC ingest_readings (SECURITY
-- DEFINER, owner postgres), pero se otorga también readings por robustez.

GRANT SELECT, INSERT, UPDATE ON public.stations TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.readings TO service_role;
