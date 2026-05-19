-- 0012_alert_history_grants.sql
-- Hotfix de permisos para `alert_history`: el cliente debe poder marcar
-- entradas como vistas (UPDATE seen=true), pero los defaults del proyecto
-- no otorgaron UPDATE al rol `authenticated`, así que la policy
-- `alert_history_update_own` nunca llega a evaluarse y la API responde
-- "permission denied for table alert_history".
--
-- Otorgamos UPDATE solo sobre la columna `seen` (defense in depth): la
-- RLS limita a filas propias y este GRANT limita a una sola columna,
-- impidiendo que un cliente reescriba alert_id, reading_id o triggered_value
-- aunque encontrara cómo pasar la policy.

GRANT UPDATE (seen) ON alert_history TO authenticated;
