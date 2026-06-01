# Research — Feature 003 (Suite E2E con Playwright)

Decisiones técnicas que resuelven el Technical Context del plan. Formato:
**Decisión / Razón / Alternativas descartadas**.

## 1. App bajo prueba: `vite preview` (build de producción) vs `vite dev`

- **Decisión**: Playwright levanta la app con `vite preview` sobre el **build de producción** (`npm run build && npm run preview`), vía la opción `webServer` de `playwright.config.ts` (puerto fijo, `reuseExistingServer` en local).
- **Razón**: el E2E debe validar el artefacto que realmente se despliega (env vars horneadas en build time — ver aprendizaje del deploy en NOTES.md). `vite dev` usa HMR y transform on-the-fly, que no refleja el bundle real.
- **Alternativas descartadas**: (a) `vite dev` — no prueba el build; (b) apuntar a producción desplegada — más lento/frágil y ensucia prod sin control (descartado ya en la spec, FR-012).

## 2. Entorno y secrets

- **Decisión**: la app usa `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (mismas de prod). Los helpers de setup/teardown usan `SUPABASE_SERVICE_ROLE_KEY`, leída **solo en el proceso de Node de Playwright** (de `.env.local` en local, de GitHub Secrets en CI). Nunca se pasa al navegador ni se hornea en el bundle.
- **Razón**: Constitución III. El navegador solo ve la `anon` key (como siempre); las operaciones privilegiadas (crear/borrar usuarios, inyectar lecturas) ocurren server-side en el runner.
- **Alternativas descartadas**: exponer service*role como `VITE*\*` (la hornearía Vite en el bundle → fuga total). Prohibido.

## 3. Usuarios de prueba: efímeros vía `auth.admin`

- **Decisión**: para los flujos autenticados (US3/US4) se crea un usuario confirmado al vuelo con `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })`, email único por corrida (p. ej. `e2e-<runId>@airvision.test`). En teardown se borra con `auth.admin.deleteUser(id)` (cascada elimina favoritos/alertas por las FK/RLS). El **flujo de registro UI (US2)** sí ejercita `/registro` de verdad con un email único, y se limpia igual por admin.
- **Razón**: crear usuarios confirmados por admin evita depender del correo de verificación y es rápido y determinista. US2 mantiene la cobertura real del formulario de registro.
- **Punto a verificar (precondición de US2)**: si el proyecto Supabase tiene **"Confirm email" activado**, el registro vía UI no podrá iniciar sesión hasta confirmar. Mitigación: para US2, confirmar el usuario recién registrado por admin (`updateUserById({ email_confirm: true })`) inmediatamente después del submit, o desactivar la confirmación de email en el proyecto de pruebas. Se decide en tasks tras inspeccionar el setting real; default recomendado: **confirmar por admin** para no tocar la config global del proyecto.
- **Alternativas descartadas**: (a) reutilizar un usuario fijo compartido — rompe independencia/limpieza (FR-006/FR-007); (b) buzón de correo real (mailosaur, etc.) — sobreingeniería para portafolio.

## 4. Disparo de alerta (US4): inyección de lectura con `service_role`

- **Decisión**: un helper `injectThresholdReading(stationId, pollutant, value)` inserta vía `service_role` una fila en `readings` con `measured_at = now()` y un valor que cruza el umbral de la alerta creada en el test; tras las aserciones, un teardown borra esa fila por su clave `(station_id, measured_at)`.
- **Razón**: el navegador no puede escribir en `readings` (RLS: solo `service_role`). El trigger `evaluate_alerts()` existente dispara la alerta dentro del INSERT, y Realtime propaga el toast/badge — exactamente el camino de producción. Cumple FR-010/FR-013.
- **Detalle**: usar una **estación existente** y un `measured_at` único de la corrida para poder borrar sin tocar datos reales; el COALESCE-upsert no aplica aquí (insert directo con timestamp nuevo).
- **Alternativas descartadas**: (a) Edge Function de prueba dedicada — más superficie en backend (FR-013 opción B, descartada en la spec); (b) esperar a que el cron real produzca un cruce — no determinista.

## 5. Localizadores: web-first por rol/texto, sin `data-testid`

- **Decisión**: usar `getByRole`, `getByLabel`, `getByText`, `getByPlaceholder` (estrategia recomendada por Playwright). Solo si un elemento crítico (p. ej. un marcador del mapa Leaflet) no es localizable de forma estable se añade un `data-testid` mínimo y se documenta como excepción.
- **Razón**: localizadores accesibles son robustos y no acoplan los tests a detalles internos; evitan tocar `src/` (asunción de la spec). Como bonus, ejercitan la accesibilidad.
- **Riesgo conocido**: los marcadores de Leaflet se renderizan en SVG/canvas y pueden ser difíciles de localizar por rol. Mitigación: localizar por el contenedor del mapa y los popups (que sí tienen texto), o añadir un `data-testid` acotado al marcador/popup si es imprescindible.
- **Alternativas descartadas**: sembrar `data-testid` por todos lados — acopla y ensucia `src/` innecesariamente.

## 6. Estabilidad (anti-flakiness)

- **Decisión**: aserciones web-first con auto-espera (`expect(locator).toBeVisible()`, etc.), **cero `waitForTimeout` fijos**; `retries: process.env.CI ? 1 : 0`; `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`. Para el toast/badge de US4 (Realtime), esperar por la condición visible con timeout generoso (p. ej. 15 s) y fallar con mensaje claro si no llega (edge case de la spec).
- **Razón**: cumple SC-004 (10 corridas estables) y SC-003 (fallo accionable con traza, FR-009).
- **Alternativas descartadas**: sleeps fijos — fuente clásica de flakiness.

## 7. Integración en CI (US5)

- **Decisión**: añadir un job `e2e` a `.github/workflows/ci.yml` (separado del job `quality`): `actions/setup-node@20`, `npm ci`, `npx playwright install --with-deps chromium` (con caché de browsers), `npm run build`, `npm run test:e2e`. Env desde GitHub Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Subir `playwright-report/` y `test-results/` como artefactos con `actions/upload-artifact` (`if: always()`). El job es **check requerido** para merge a `main`.
- **Razón**: cumple FR-008/US5. Caché de browsers acelera; artefactos dan diagnósticos (FR-009).
- **Nota de seguridad**: `SUPABASE_SERVICE_ROLE_KEY` como GitHub Secret cifrado es aceptable; nunca se imprime en logs ni llega al navegador. Los secrets no están disponibles en PRs desde forks — como el repo es de un solo autor, no aplica el caso fork.
- **Alternativas descartadas**: correr E2E en el job `quality` existente — mezcla responsabilidades y alarga el feedback de lint/typecheck/unit.

## 8. Scripts y dependencias

- **Decisión**: añadir devDep `@playwright/test` (última estable) y scripts `"test:e2e": "playwright test"`, `"test:e2e:ui": "playwright test --ui"`. `playwright.config.ts` vive en `e2e/` (o raíz apuntando a `e2e/specs`); se decide en tasks, default `e2e/`. Añadir `playwright-report/`, `test-results/`, `e2e/.auth/` a `.gitignore`.
- **Razón**: convención Playwright; mantiene el `package.json` limpio y los artefactos fuera de git.
- **Alternativas descartadas**: `@playwright/experimental-ct` (component testing) — fuera de alcance; aquí queremos E2E real de navegador.

## 9. Alcance de navegadores y viewport

- **Decisión**: **Chromium** como único proyecto obligatorio; viewport de escritorio por defecto. Cross-browser (Firefox/WebKit) y 360px quedan opcionales (no bloquean), alineado con las asunciones de la spec.
- **Razón**: portafolio; el coste/beneficio de cross-browser no se justifica y la verificación responsive ya se hizo en Phase 8 del 001.
- **Alternativas descartadas**: matriz completa de navegadores — triplica el tiempo de CI sin valor proporcional aquí.
