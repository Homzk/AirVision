# Implementation Plan: Suite de Tests End-to-End (Playwright)

**Branch**: `003-e2e-playwright-tests` (en `main` por el modelo de branch del proyecto) | **Date**: 2026-06-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-e2e-playwright-tests/spec.md`

## Summary

Añadir una suite de pruebas end-to-end con **Playwright** que ejercita la app real en un navegador (Chromium) contra el **build de producción servido en local** (`vite preview`), apuntando al **Supabase Cloud existente**. Cubre los cuatro flujos sancionados por la Constitución (mapa público, cuenta, favoritos, alertas) más su ejecución como **gate en GitHub Actions**. Los flujos autenticados usan **usuarios efímeros** creados y confirmados vía la API admin de Supabase (`service_role`, solo en el proceso de test de Node, nunca en el navegador) y limpiados en teardown. El disparo de alerta (US4) se provoca **inyectando una lectura que cruza el umbral con `service_role` fuera del navegador**, lectura que también se elimina al terminar. La feature **no cambia comportamiento de producto ni esquema**: solo añade tooling de pruebas, helpers aislados y un job de CI.

## Technical Context

**Language/Version**: TypeScript 5.6 (modo estricto), Node 20 — mismo toolchain del proyecto.

**Primary Dependencies**: `@playwright/test` (nuevo devDependency, Chromium). Reutiliza `@supabase/supabase-js` (ya instalado) en los helpers de setup/teardown con `service_role`. Cero dependencias nuevas en el bundle de la app.

**Storage**: PostgreSQL existente (Supabase Cloud) — **sin cambios de esquema**. La suite solo crea/borra datos transitorios: usuarios efímeros (vía `auth.admin`) y, para US4, una fila temporal en `readings`.

**Testing**: `@playwright/test` como runner E2E, separado de Vitest (que sigue cubriendo unit/integration). Localizadores web-first por rol/etiqueta/texto (sin `data-testid` salvo excepción acotada), aserciones con auto-espera (sin sleeps fijos).

**Target Platform**: navegador de escritorio (Chromium) sobre la app servida por `vite preview`; corre en local y en GitHub Actions (ubuntu-latest).

**Project Type**: web app existente; esta feature añade una capa de pruebas E2E en un directorio nuevo `e2e/` en la raíz del repo. `src/` no cambia (salvo, como mucho, algún `data-testid` puntual si un elemento crítico no es localizable por rol/texto).

**Performance Goals**: suite completa < 10 min en CI (SC-002); sin flakiness (SC-004: 10 corridas verdes seguidas) gracias a aserciones web-first y 1 retry en CI con traza.

**Constraints**: corre contra la BD de producción → huella mínima y limpieza estricta (usuarios y lecturas inyectadas se borran). `service_role` solo en el proceso de test / secrets de CI, nunca en el navegador ni en el repo (Constitución III). UI en español → aserciones contra copys en español (Constitución IV).

**Scale/Scope**: 5 historias (US1–US5), ~4–6 archivos `*.spec.ts`, 1 `playwright.config.ts`, helpers de auth e inyección, 1 job nuevo de CI.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio                                   | Cumplimiento                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **I. Type Safety & Code Quality**           | ✅ Specs y helpers en TS estricto; ESLint/Prettier aplican al directorio `e2e/`.                                                                                                                                                                                                                                         |
| **II. Architectural Boundaries**            | ✅ La app bajo prueba sigue hablando solo con Supabase. La inyección de datos privilegiada vive en el proceso de test de Node (setup), no en el navegador ni en `src/`.                                                                                                                                                  |
| **III. Security by Default**                | ✅ `SUPABASE_SERVICE_ROLE_KEY` solo en el runner de tests y en GitHub Secrets; nunca en el bundle ni commiteada. La app sigue usando la `anon` key. RLS intacta.                                                                                                                                                         |
| **IV. User-Visible Quality**                | ✅ Sin cambios de UI; las pruebas **verifican** los estados en español (loading/error/empty) y los flujos pulidos.                                                                                                                                                                                                       |
| **V. Conventional Workflow & Modular Code** | ✅ Commits convencionales; un spec por flujo, helpers reutilizables, config única.                                                                                                                                                                                                                                       |
| **VI. Testing Discipline**                  | ✅ **Esta feature ES la capa E2E que la Constitución difirió** ("post-MVP feature… register/login, map navigation, adding a favorite, creating an alert"). El MVP ya está cerrado, así que se permite añadir el tooling E2E. El gate de coverage de Vitest (70% sobre `src/`) no se ve afectado: E2E es una capa aparte. |

**Veredicto**: sin violaciones. Complexity Tracking vacío.

## Project Structure

### Documentation (this feature)

```text
specs/003-e2e-playwright-tests/
├── plan.md              # Este archivo
├── research.md          # Phase 0: decisiones (preview vs dev, usuarios efímeros, inyección, CI, flakiness)
├── data-model.md        # Phase 1: entidades de prueba (usuario efímero, lectura inyectada, artefactos) — sin DDL
├── quickstart.md        # Phase 1: cómo correr la suite en local y en CI
├── contracts/
│   └── e2e-contracts.md # Phase 1: contratos de helpers (setup/teardown, auth, inyección) y de cada flujo
└── tasks.md             # Phase 2 output (/speckit-tasks — NO lo crea /speckit-plan)
```

### Source Code (repository root)

```text
e2e/                                 # NUEVO — toda la suite E2E
├── playwright.config.ts             # config: webServer (vite preview), Chromium, baseURL, retries, trace
├── global-setup.ts                  # arranque: valida env, prepara datos base si hace falta
├── fixtures/
│   ├── auth.ts                      # crea/borra usuarios efímeros confirmados (auth.admin, service_role)
│   ├── supabase-admin.ts            # cliente service_role solo-test (Node, jamás en navegador)
│   └── readings.ts                  # inyecta/borra la lectura que cruza el umbral (US4)
└── specs/
    ├── map.spec.ts                  # US1: mapa público + popup de estación
    ├── auth.spec.ts                 # US2: registro / login / sesión / logout
    ├── favorites.spec.ts            # US3: marcar / ver / desmarcar / tope
    └── alerts.spec.ts               # US4: crear alerta → inyectar lectura → ver activación → marcar leída

playwright.config.ts                 # (alternativa: en raíz; se decide en research → vive en e2e/)
.github/workflows/ci.yml             # MODIFICADO — añade el job `e2e` (US5)
package.json                         # MODIFICADO — scripts test:e2e / test:e2e:ui + devDep @playwright/test
.gitignore                           # MODIFICADO — ignora playwright-report/, test-results/, .auth/

# src/ NO cambia comportamiento. Excepción acotada posible: añadir algún data-testid
# si un elemento crítico no es localizable por rol/texto (documentado en research).
```

**Structure Decision**: capa de pruebas aditiva en `e2e/` (raíz), separada de los tests Vitest co-localizados en `src/`. La separación es la norma de Playwright y mantiene intacto el gate de coverage unitario. Los helpers que usan `service_role` viven solo en el proceso de test de Node.

## Complexity Tracking

> Sin violaciones de la Constitución → tabla vacía.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| —         | —          | —                                    |
