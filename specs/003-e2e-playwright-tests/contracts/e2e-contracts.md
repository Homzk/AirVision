# Contracts — Feature 003 (Suite E2E)

Los "contratos" de esta feature son (a) las **interfaces de los helpers** de
prueba y (b) el **contrato de cada flujo** (qué debe garantizar cada spec). No
hay API HTTP nueva; estos contratos guían la implementación en `/speckit-tasks`.

---

## A. Helpers (proceso de test de Node — `service_role`, nunca en el navegador)

### `supabase-admin.ts`

```ts
// Cliente Supabase con service_role, SOLO en el runner de tests.
// Lee SUPABASE_SERVICE_ROLE_KEY del entorno del proceso Node (no VITE_*).
export function getAdminClient(): SupabaseClient
```

**Contrato**: lanza un error claro si falta `SUPABASE_SERVICE_ROLE_KEY` o
`VITE_SUPABASE_URL`. Nunca se importa desde código bajo `src/`.

### `auth.ts`

```ts
export interface EphemeralUser {
  id: string
  email: string
  password: string
}

// Crea un usuario confirmado y único para la corrida.
export async function createEphemeralUser(): Promise<EphemeralUser>

// Borra el usuario (cascada limpia favoritos/alertas/historial).
export async function deleteEphemeralUser(id: string): Promise<void>

// Helper de UI: inicia sesión en el navegador con un EphemeralUser.
export async function loginAs(page: Page, user: EphemeralUser): Promise<void>
```

**Contrato**: `createEphemeralUser` produce email único (`e2e-<runId>-<n>@airvision.test`)
y `email_confirm: true`. `deleteEphemeralUser` es idempotente (no falla si ya no existe).

### `readings.ts`

```ts
export interface InjectedReading {
  stationId: number
  measuredAt: string
}

// Inserta una lectura que cruza el umbral, con measured_at único. Devuelve la
// clave para poder borrarla luego.
export async function injectThresholdReading(
  stationId: number,
  pollutant: 'pm25' | 'pm10' | 'o3',
  value: number,
): Promise<InjectedReading>

// Borra exactamente la fila inyectada por (station_id, measured_at).
export async function deleteInjectedReading(r: InjectedReading): Promise<void>
```

**Contrato**: la inserción usa `now()` único; el borrado afecta solo esa fila y
nunca toca la serie real de la estación.

---

## B. Contrato por flujo (specs)

Cada spec es **independiente** (FR-006): crea su propio estado en `beforeEach`/
setup y lo limpia en `afterEach`/teardown. Orden de pruebas irrelevante.

### `map.spec.ts` — US1 (anónimo, sin usuario)

| Debe garantizar                  | Aserción observable                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| El mapa carga con estaciones     | `/` renderiza el contenedor del mapa y ≥1 marcador.                                   |
| El detalle muestra contaminantes | Abrir una estación → visibles contaminante(s), unidad, badge de nivel y timestamp.    |
| Estado sin datos                 | Una estación sin lecturas recientes muestra el copy "sin datos recientes" en español. |

### `auth.spec.ts` — US2

| Debe garantizar      | Aserción observable                                                          |
| -------------------- | ---------------------------------------------------------------------------- |
| Registro             | `/registro` con email único → queda autenticado (acceso a rutas protegidas). |
| Login + persistencia | Login OK; tras `reload()` la sesión persiste (no re-pide credenciales).      |
| Logout               | Cerrar sesión → pierde acceso a rutas protegidas.                            |
| Error en español     | Credenciales inválidas → mensaje de error en español visible.                |

### `favorites.spec.ts` — US3 (usuario efímero autenticado)

| Debe garantizar | Aserción observable                                                                     |
| --------------- | --------------------------------------------------------------------------------------- |
| Marcar          | Marcar estación como favorita → aparece en `/favoritos`.                                |
| Desmarcar       | Desmarcar → desaparece de `/favoritos`.                                                 |
| Tope            | Al alcanzar el tope, intentar agregar uno más → mensaje claro en español, no se agrega. |

### `alerts.spec.ts` — US4 (usuario efímero + inyección)

| Debe garantizar | Aserción observable                                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Crear           | Crear alerta (estación + contaminante + umbral + dirección) → queda visible.                                                            |
| Disparo         | `injectThresholdReading(...)` → aparece toast en vivo y/o badge de no leídas + entrada en historial (timeout generoso, sin sleep fijo). |
| Marcar leída    | Marcar como leídas → el badge se actualiza.                                                                                             |

---

## C. Contrato de CI (US5)

| Debe garantizar           | Verificación                                                                     |
| ------------------------- | -------------------------------------------------------------------------------- |
| La suite corre en push/PR | Job `e2e` en `.github/workflows/ci.yml` ejecuta `playwright test`.               |
| Un fallo bloquea merge    | El job es check requerido para `main`; en rojo bloquea la fusión.                |
| Diagnóstico accionable    | `playwright-report/` y `test-results/` subidos como artefactos (`if: always()`). |

---

## D. Configuración (`playwright.config.ts`)

| Aspecto       | Valor                                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| `webServer`   | `npm run build && npm run preview` (o `preview` si ya hay build), puerto fijo, `reuseExistingServer: !CI`. |
| `use.baseURL` | la URL del `vite preview`.                                                                                 |
| `projects`    | Chromium (obligatorio).                                                                                    |
| `retries`     | `CI ? 1 : 0`.                                                                                              |
| `trace`       | `on-first-retry`. `screenshot: only-on-failure`. `video: retain-on-failure`.                               |
| `globalSetup` | valida env; (opcional) prepara datos base.                                                                 |
