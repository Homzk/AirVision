-- 0013_remove_synthetic_seed.sql
-- Limpieza del seed sintético del feature 001 (ids 1–13). Los location_id
-- reales de OpenAQ son enteros chicos (25, 26, 45…) que conviven con los
-- sintéticos; sin esta limpieza el mapa mostraría estaciones duplicadas/falsas.
--
-- readings.station_id REFERENCES stations(id) ON DELETE CASCADE, así que las
-- lecturas sintéticas se borran solas. Idempotente: no borra nada si ya se fue.
--
-- Orden recomendado (ver specs/002-openaq-ingestion/quickstart.md):
--   seed-stations → primer ciclo de ingest-openaq → aplicar esta migración.

DELETE FROM stations WHERE id BETWEEN 1 AND 13;
