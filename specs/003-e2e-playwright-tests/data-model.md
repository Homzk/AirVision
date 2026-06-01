# Data Model — Feature 003 (Suite E2E)

> **No hay cambios de esquema.** Esta feature no crea, altera ni borra tablas,
> columnas, vistas, triggers ni políticas. Reutiliza el esquema del 001/002 tal
> cual. Lo que sigue son las **entidades del dominio de prueba**: datos
> transitorios que la suite crea y limpia dentro de cada corrida, y su ciclo de
> vida. Ninguna persiste más allá de la prueba.

## Entidades de prueba

### 1. Usuario efímero (`EphemeralTestUser`)

Cuenta creada al vuelo para los flujos autenticados (US2–US4).

| Atributo    | Descripción                                                              |
| ----------- | ------------------------------------------------------------------------ |
| `email`     | Único por corrida: `e2e-<runId>-<n>@airvision.test` (evita colisiones).  |
| `password`  | Generado/fijo de prueba (no secreto real).                               |
| `confirmed` | `true` — creado/confirmado vía `auth.admin` para no depender del correo. |
| `id`        | UUID devuelto por Supabase; se guarda para el borrado en teardown.       |

**Ciclo de vida**:

1. **Setup**: `auth.admin.createUser({ email, password, email_confirm: true })`
   (US3/US4). En US2 el usuario nace del formulario `/registro` real y se
   confirma por admin si el proyecto exige verificación de email.
2. **Uso**: la prueba inicia sesión y opera (favoritos/alertas).
3. **Teardown**: `auth.admin.deleteUser(id)`. Las filas dependientes en
   `user_favorites`, `alerts` y `alert_history` se eliminan por las FK/políticas
   asociadas al `user_id` (no quedan huérfanas).

**Invariante**: tras una corrida, `auth.users` no contiene ningún `*@airvision.test`
de esa corrida (verificable; soporta SC-006).

### 2. Lectura inyectada (`InjectedReading`) — solo US4

Fila temporal en `readings` que provoca el cruce de umbral de una alerta.

| Atributo       | Descripción                                                                |
| -------------- | -------------------------------------------------------------------------- |
| `station_id`   | Una estación **existente** (del catálogo real).                            |
| `measured_at`  | `now()` (timestamp único de la corrida → permite borrarla sin ambigüedad). |
| `pm25/pm10/o3` | Solo el contaminante de la alerta, con un valor que cruza el umbral.       |

**Ciclo de vida**:

1. **Setup del test de alertas**: crear la alerta (vía UI) → `injectThresholdReading(...)`
   inserta esta fila con `service_role` (fuera del navegador).
2. **Efecto**: el trigger `evaluate_alerts()` dispara la alerta en el INSERT;
   Realtime propaga el toast/badge y se escribe en `alert_history`.
3. **Teardown**: `DELETE FROM readings WHERE station_id=? AND measured_at=?`
   (la clave única identifica exactamente la fila inyectada). El `alert_history`
   generado se limpia al borrar el usuario (entidad 1).

**Invariante**: tras la corrida no queda ninguna lectura con ese `measured_at`
de prueba (no se altera la serie real de la estación; soporta SC-006).

### 3. Artefactos de ejecución (`RunArtifacts`)

Salidas de diagnóstico de una corrida (no tocan la BD).

| Artefacto           | Cuándo             | Dónde                          |
| ------------------- | ------------------ | ------------------------------ |
| Captura de pantalla | Solo en fallo      | `test-results/` (gitignored)   |
| Traza Playwright    | En el primer retry | `test-results/` (gitignored)   |
| Reporte HTML        | Siempre            | `playwright-report/` (ignored) |
| Video               | Retenido en fallo  | `test-results/` (gitignored)   |

En CI se suben como artefactos del workflow (`upload-artifact`, `if: always()`).
Soportan FR-009 / SC-003.

## Relación con el esquema existente (solo lectura/transitorio)

- `stations`, `readings`, `latest_station_readings`: **leídos** por la app durante
  US1; `readings` recibe la inserción/borrado transitorio de US4.
- `auth.users`: alta/baja transitoria de usuarios efímeros.
- `user_favorites`, `alerts`, `alert_history`: escritos por la app durante US3/US4
  bajo la sesión del usuario efímero (RLS normal) y limpiados al borrarlo.
