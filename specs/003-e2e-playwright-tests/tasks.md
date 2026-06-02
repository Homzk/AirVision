---
description: 'Task list for AirVision feature 003 — Suite de Tests End-to-End (Playwright)'
---

# Tasks: Suite de Tests End-to-End (Playwright)

**Input**: Design documents from `/specs/003-e2e-playwright-tests/`

**Prerequisites**: plan.md (✅), spec.md (✅), research.md (✅), data-model.md (✅), contracts/ (✅), quickstart.md (✅)

**Tests**: En esta feature **los entregables SON las pruebas** (los archivos `e2e/specs/*.spec.ts`). No hay "tareas de test" separadas: cada historia de usuario entrega su spec E2E, que es a la vez el código y su verificación. Esto satisface inherentemente el Principio VI (tests junto al código). La suite E2E es independiente del gate de coverage de Vitest sobre `src/`, que no se ve afectado.

**Organization**: Tareas agrupadas por historia de usuario. Setup (Playwright + config) y Foundational (helpers con `service_role`) son prerequisitos compartidos. US1 (mapa anónimo) solo necesita Setup; US2/US3/US4 (flujos autenticados) necesitan los helpers de Foundational.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (otro archivo, sin dependencias incompletas)
- **[Story]**: US1 / US2 / US3 / US4 / US5 — Setup, Foundational y Polish no llevan etiqueta
- Cada tarea incluye su ruta de archivo exacta

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Instalar Playwright, configurar el runner y dejar la app levantándose sola para los tests.

- [x] T001 Añadir `@playwright/test` como devDependency y los scripts `"test:e2e": "playwright test"` y `"test:e2e:ui": "playwright test --ui"` en `package.json`
- [x] T002 Instalar el navegador de Playwright en local: `npx playwright install chromium` (en CI se hará con `--with-deps`); documentar en `quickstart.md` si cambia algo
- [x] T003 [P] Crear `e2e/playwright.config.ts`: `testDir: './specs'`, `webServer` que corre `npm run build && npm run preview` con puerto fijo y `reuseExistingServer: !process.env.CI`, `use.baseURL`, proyecto Chromium, `retries: process.env.CI ? 1 : 0`, `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`, `video: 'retain-on-failure'`
- [x] T004 [P] Actualizar `.gitignore` para ignorar `playwright-report/`, `test-results/` y `e2e/.auth/`
- [x] T005 [P] Hacer que ESLint/Prettier y TypeScript cubran `e2e/` (incluir el directorio en la flat config de ESLint y en el `tsconfig` correspondiente, en modo estricto)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Helpers que usan `service_role` **solo en el proceso de Node** (jamás en el navegador): cliente admin, gestión de usuarios efímeros e inyección de lecturas. Bloquean US2/US3/US4.

**⚠️ CRITICAL**: US2, US3 y US4 no pueden implementarse hasta completar esta fase. US1 (anónimo) NO depende de ella.

- [x] T006 Crear `e2e/fixtures/supabase-admin.ts`: cliente `@supabase/supabase-js` con `SUPABASE_SERVICE_ROLE_KEY` leída del entorno de Node; falla con error claro si faltan `SUPABASE_SERVICE_ROLE_KEY` o `VITE_SUPABASE_URL`. Nunca importable desde `src/`
- [x] T007 [P] Crear `e2e/fixtures/auth.ts`: `createEphemeralUser()` (email único `e2e-<runId>-<n>@airvision.test`, `email_confirm: true` vía `auth.admin.createUser`), `deleteEphemeralUser(id)` (idempotente), `loginAs(page, user)` (inicia sesión por la UI). Depende de T006
- [x] T008 [P] Crear `e2e/fixtures/readings.ts`: `injectThresholdReading(stationId, pollutant, value)` (INSERT con `measured_at=now()` único, service_role) y `deleteInjectedReading(r)` (borra por `(station_id, measured_at)`). Depende de T006
- [x] T009 Crear `e2e/global-setup.ts`: valida que las env requeridas existen y falla rápido con un mensaje accionable antes de arrancar la suite

**Checkpoint**: helpers listos → los flujos autenticados pueden construirse.

---

## Phase 3: User Story 1 - Ver el mapa y datos públicos (Priority: P1) 🎯 MVP

**Goal**: Una prueba E2E confirma que un visitante anónimo ve el mapa con estaciones y el detalle de una estación con sus contaminantes.

**Independent Test**: correr `e2e/specs/map.spec.ts` contra la app levantada y ver pasar los 3 escenarios; no requiere usuario ni helpers de Foundational.

- [x] T010 [US1] Escribir `e2e/specs/map.spec.ts` cubriendo los 3 escenarios de aceptación de US1: (1) `/` renderiza el mapa y ≥1 marcador; (2) abrir el detalle/popup de una estación muestra contaminante(s), unidad, badge de nivel y timestamp; (3) una estación sin lecturas recientes muestra el copy "sin datos recientes" en español. Localizadores web-first (rol/texto)
- [x] T011 [US1] ~~Añadir `data-testid` al marcador~~ **NO necesario**: los marcadores solapados se resolvieron con `click({ force: true })` sobre `path.leaflet-interactive`; `src/` no se tocó (se respeta la asunción de la spec).

**Checkpoint**: el flujo público del mapa queda protegido (MVP de la feature demostrable).

---

## Phase 4: User Story 2 - Registro, login y sesión (Priority: P1)

**Goal**: Una prueba E2E confirma registro, login, persistencia de sesión y logout, más el error en español ante credenciales inválidas.

**Independent Test**: correr `e2e/specs/auth.spec.ts`: registra una cuenta efímera, valida persistencia tras recarga, cierra sesión; limpia el usuario al final.

- [x] T012 [US2] Escribir `e2e/specs/auth.spec.ts` cubriendo los 4 escenarios de US2: registro (en `/registro`, email único) → autenticado; login + persistencia tras `reload()`; logout → pierde acceso a rutas protegidas; credenciales inválidas → mensaje de error en español. Usa `createEphemeralUser`/`deleteEphemeralUser` para email único y limpieza; si el proyecto exige confirmación de email, confirmar por admin tras el submit (ver `research.md §3`)

**Checkpoint**: el flujo de cuenta queda protegido.

---

## Phase 5: User Story 3 - Favoritos (Priority: P2)

**Goal**: Una prueba E2E confirma marcar/ver/desmarcar una estación favorita y el respeto del tope.

**Independent Test**: correr `e2e/specs/favorites.spec.ts` con un usuario efímero autenticado; marca, verifica en `/favoritos`, desmarca, y valida el rechazo al superar el tope.

- [x] T013 [US3] Escribir `e2e/specs/favorites.spec.ts` cubriendo los 3 escenarios de US3: marcar una estación → aparece en `/favoritos`; desmarcar → desaparece; alcanzar el tope → intentar agregar uno más se rechaza con mensaje en español. Usa `createEphemeralUser` + `loginAs` y limpia el usuario en teardown

**Checkpoint**: el flujo de favoritos queda protegido.

---

## Phase 6: User Story 4 - Alertas (Priority: P3)

**Goal**: Una prueba E2E confirma crear una alerta, provocar su disparo inyectando una lectura, ver la activación y marcarla como leída.

**Independent Test**: correr `e2e/specs/alerts.spec.ts`: crear alerta → `injectThresholdReading(...)` → ver toast/badge/historial → marcar leída; borra la lectura y el usuario en teardown.

- [x] T014 [US4] Escribir `e2e/specs/alerts.spec.ts` cubriendo los 3 escenarios de US4: crear alerta (estación + contaminante + umbral + dirección) → visible; `injectThresholdReading` cruza el umbral → aparece la activación (toast en vivo y/o badge de no leídas + entrada en historial, con espera por condición y timeout generoso, sin sleep fijo); marcar como leídas → el badge se actualiza. Usa `auth.ts` + `readings.ts`; teardown borra la lectura inyectada y el usuario

**Checkpoint**: las cuatro historias de flujo quedan protegidas de extremo a extremo.

---

## Phase 7: User Story 5 - La suite corre en CI como gate (Priority: P2)

**Goal**: La suite E2E se ejecuta automáticamente en GitHub Actions en cada push/PR y bloquea el merge a `main` ante un fallo.

**Independent Test**: abrir un PR con la suite integrada → el job `e2e` corre `playwright test`; romper un flujo a propósito → el check se pone en rojo y bloquea la fusión.

- [x] T015 [US5] Añadir un job `e2e` a `.github/workflows/ci.yml` (separado de `quality`): `actions/setup-node@20`, `npm ci`, `npx playwright install --with-deps chromium` (con caché), `npm run build`, `npm run test:e2e`; env desde GitHub Secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`); subir `playwright-report/` y `test-results/` con `actions/upload-artifact` (`if: always()`)
- [x] T016 [US5] **(HECHO)** Cargados los 3 GitHub Secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) en Settings → Secrets and variables → Actions; el job `e2e` corre en verde contra el cloud. Creado un ruleset `protect-main` (Active) que exige los checks `Lint, typecheck, test` y `E2E (Playwright)` para fusionar a `main`. Ajustes derivados al encender el job: runners a Node 22 (WebSocket nativo de Supabase Realtime) + `.nvmrc`; Vitest acotado a `src/**` y `.env.test` con placeholders dummy; actions a `@v6` (runtime Node 24).

**Checkpoint**: las regresiones de cualquier flujo cubierto se detectan automáticamente y bloquean el merge.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: estabilidad, documentación y validación end-to-end.

- [x] T017 [P] Actualizar `.env.example` para documentar que `SUPABASE_SERVICE_ROLE_KEY` también la consumen los helpers E2E en local (solo server-side, nunca en el bundle)
- [x] T018 [P] Actualizar la sección de tests del `README.md` (añadir la suite E2E con Playwright y el comando `npm run test:e2e`) y registrar la feature 003 en `NOTES.md`
- [x] T019 Verificar estabilidad (SC-004): corrida con `--repeat-each=3` → **21/21 en verde, 0 flaky** (~1.4 min). Aserciones web-first en toda la suite. (La corrida formal 10× queda como spot-check opcional del owner.)
- [x] T020 Ejecutar la validación end-to-end de `quickstart.md` y confirmar SC-001…SC-006 (incluida la huella cero: ningún usuario `*@airvision.test` ni lectura de prueba residual tras una corrida)

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: sin dependencias.
- **Phase 2 (Foundational)**: depende de Setup. **BLOQUEA** US2/US3/US4 (importan los helpers). US1 NO depende de esta fase.
- **Phase 3 (US1)**: depende solo de Setup (Phase 1). Es el MVP de la feature.
- **Phase 4 (US2)**, **Phase 5 (US3)**, **Phase 6 (US4)**: dependen de Foundational. US4 además necesita `readings.ts` (T008).
- **Phase 7 (US5)**: requiere que exista ≥1 spec; tiene más sentido tras US1–US4 para que el gate corra la suite completa, pero puede adelantarse (el job auto-descubre specs nuevos). T016 es ops del owner.
- **Phase 8 (Polish)**: depende de que las historias deseadas estén completas.

### Within each phase

- Setup: T003/T004/T005 en paralelo; T001 antes (instala la dependencia) y T002 tras T001.
- Foundational: T006 primero; T007 y T008 en paralelo después; T009 al final.
- Cada spec es un archivo distinto → las historias son independientes una vez cumplidas sus dependencias.

### Parallel opportunities

- Setup: T003, T004, T005 en paralelo.
- Foundational: T007 y T008 en paralelo (tras T006).
- Tras Foundational, US2/US3/US4 son archivos distintos → pueden trabajarse en paralelo; US1 puede ir en paralelo a Foundational (solo necesita Setup).
- Polish: T017 y T018 en paralelo.

---

## Implementation Strategy

### MVP First

1. **Phase 1 (Setup)** + **Phase 3 (US1)**: Playwright corriendo y el flujo público del mapa en verde. **STOP y validar**: la suite arranca la app y `map.spec.ts` pasa.
2. **Phase 2 (Foundational)** + **US2**: helpers + flujo de cuenta.
3. **US3** (favoritos) y **US4** (alertas).
4. **US5 (CI)**: cablear el gate en GitHub Actions. **Phase 8**: estabilidad y docs.

### Notas

- Localizadores web-first (rol/etiqueta/texto); `data-testid` solo como excepción acotada (T011).
- `service_role` solo en helpers de Node y GitHub Secrets; nunca en el navegador ni commiteada (Constitución III).
- Sin `waitForTimeout` fijos: aserciones con auto-espera para evitar flakiness (SC-004).
- Corre contra el Supabase de producción → limpieza estricta de usuarios y lecturas inyectadas (SC-006).
- Cada wave termina con un commit convencional; no usar `--no-verify`.
