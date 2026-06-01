# Quickstart — Feature 003 (Suite E2E con Playwright)

Cómo correr la suite end-to-end en local y entender su ejecución en CI.

## Prerrequisitos

- Node 20+ y dependencias instaladas (`npm ci`).
- Navegador de Playwright: `npx playwright install chromium` (en CI, `--with-deps`).
- `.env.local` con:
  ```dotenv
  VITE_SUPABASE_URL=...            # mismo de prod
  VITE_SUPABASE_ANON_KEY=eyJ...    # anon key (la app)
  SUPABASE_SERVICE_ROLE_KEY=...    # SOLO para los helpers de setup/teardown (Node)
  ```
  > ⚠️ La `service_role` key la consume **solo el proceso de test** (crear/borrar
  > usuarios, inyectar lecturas). Nunca se hornea en el bundle ni se commitea.

## Correr en local

```bash
npm run test:e2e          # build + preview + corre la suite (headless, Chromium)
npm run test:e2e:ui       # modo UI interactivo de Playwright (debug)
npx playwright show-report   # abre el último reporte HTML
```

La config arranca la app con `vite preview` automáticamente (`webServer`), así que
no hace falta levantar nada a mano. En local `reuseExistingServer` reaprovecha un
preview ya abierto.

## Qué cubre

| Spec                | Historia | Flujo                                                           |
| ------------------- | -------- | --------------------------------------------------------------- |
| `map.spec.ts`       | US1      | mapa público + popup de estación (anónimo)                      |
| `auth.spec.ts`      | US2      | registro / login / persistencia / logout                        |
| `favorites.spec.ts` | US3      | marcar / ver / desmarcar / tope                                 |
| `alerts.spec.ts`    | US4      | crear alerta → inyectar lectura → ver activación → marcar leída |

## Aislamiento y limpieza (importante: corre contra prod)

- Cada flujo autenticado crea un **usuario efímero** (`e2e-<runId>-...@airvision.test`)
  y lo **borra** al terminar (cascada limpia favoritos/alertas/historial).
- US4 inserta una **lectura temporal** (`measured_at = now()` único) y la borra en
  teardown — no altera la serie real de la estación.
- **Verificación de huella cero** (SC-006): tras una corrida, no deben quedar
  usuarios `*@airvision.test` ni lecturas con el `measured_at` de prueba.

## En CI (GitHub Actions)

El workflow añade un job `e2e` que:

1. `npm ci` + `npx playwright install --with-deps chromium` (con caché).
2. `npm run build` y corre `npm run test:e2e` con las env desde **GitHub Secrets**
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
3. Sube `playwright-report/` y `test-results/` como artefactos (`if: always()`).

El job es **check requerido** para fusionar a `main`: si un flujo se rompe, el PR
queda bloqueado (US5).

## Validación end-to-end de la feature

- **SC-001**: los 4 specs (map/auth/favorites/alerts) pasan en verde.
- **SC-002**: la suite completa termina en < 10 min en CI.
- **SC-003**: romper un flujo a propósito → su spec falla (con traza/captura).
- **SC-004**: 10 corridas seguidas en verde, sin flakiness.
- **SC-005**: un colaborador corre todo con `npm run test:e2e` (un solo comando).
- **SC-006**: estado de la BD idéntico antes/después de una corrida.

## Troubleshooting

- **`Missing SUPABASE_SERVICE_ROLE_KEY`**: falta en `.env.local` (local) o en Secrets (CI).
- **Login falla tras registro (US2)**: el proyecto exige confirmación de email →
  el helper confirma por admin; revisar el setting de Auth si persiste.
- **Marcador del mapa no localizable**: usar el contenedor/popup por texto; si es
  imprescindible, añadir un `data-testid` acotado (excepción documentada en research §5).
- **Flaky en el toast de US4**: subir el timeout de espera de la condición; nunca
  usar `waitForTimeout` fijo.
- **Browsers faltan en CI**: confirmar `npx playwright install --with-deps chromium`.
