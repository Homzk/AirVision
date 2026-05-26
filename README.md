# AirVision 🌎

**Dashboard de calidad del aire de Chile en tiempo real: mapa interactivo, tendencias históricas y alertas personalizadas.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%C2%B7%20Auth%20%C2%B7%20Realtime-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Vitest-2.1-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Coverage](https://img.shields.io/badge/coverage-97.5%25%20líneas-success)](#tests)
[![License](https://img.shields.io/badge/license-MIT-blue)](#licencia)

---

## Descripción

**AirVision** es un dashboard web que muestra la calidad del aire de estaciones de monitoreo en Chile. Sobre un mapa de Chile, cada estación aparece coloreada según su lectura más reciente (clasificación _worst-of_ entre PM2.5, PM10 y O₃, contra los umbrales de la OMS). El usuario puede abrir una estación para ver sus tendencias temporales, marcar estaciones como favoritas y configurar alertas que se disparan cuando un contaminante cruza un umbral definido.

Es un **proyecto de portafolio** construido para demostrar prácticas profesionales de ingeniería fullstack: TypeScript en modo estricto, una capa de datos encapsulada en hooks, Row Level Security en cada tabla, suscripciones en tiempo real, y una suite de tests con cobertura sobre la lógica de negocio. No es un experimento de fin de semana: cada feature se diseñó con **Spec-Driven Development** (ver [sección dedicada](#spec-driven-development)) antes de escribir una línea de código.

El problema que resuelve es concreto: la información de calidad del aire suele estar dispersa en portales gubernamentales poco amigables. AirVision la centraliza en una interfaz en español, responsive y con actualización en vivo, donde un vecino de Santiago, Concepción o Temuco puede ver de un vistazo si el aire de su comuna está en niveles saludables.

## Demo

<!-- TODO(T114): screenshot principal del dashboard (mapa con popups) -->

> _Screenshots en camino (tarea T114). Mientras tanto, ver la sección [Features](#features) para el detalle de cada pantalla._

## Features

Las cinco historias de usuario del MVP están implementadas, probadas y en `main`.

### 🗺️ US1 — Mapa interactivo de calidad del aire

- Mapa de Chile con [Leaflet](https://leafletjs.com/) (`react-leaflet`) y tiles de OpenStreetMap.
- Cada estación es un marcador coloreado según su nivel _worst-of_: se toma el peor entre PM2.5, PM10 y O₃ clasificados contra los umbrales de la OMS.
- Popup por estación con los tres contaminantes, sus unidades, badge de nivel y timestamp relativo ("hace 2 h").
- Sin login: un visitante anónimo ve el mapa completo de inmediato.
- Manejo explícito de los tres estados (cargando, error con reintento, sin datos) con copy en español.

### 📈 US2 — Tendencias temporales por estación

- Panel deslizable (slide-over en desktop, bottom sheet en móvil) con tres gráficos de línea ([Recharts](https://recharts.org/)): PM2.5, PM10 y O₃.
- Selector de rango **6h / 24h / 7d** que re-consulta y redibuja.
- **Realtime por estación**: al insertarse una nueva lectura en la base, el gráfico añade el punto sin recargar la página, vía canales de Supabase Realtime filtrados por `station_id`.

### 🔐 US3 — Cuenta e inicio de sesión

- Registro y login con email + contraseña mediante **Supabase Auth**.
- Sesión persistente entre recargas (bootstrap con `getSession` + `onAuthStateChange`).
- Errores de autenticación mapeados a mensajes en español.
- Rutas protegidas (`/favoritos`, `/alertas`) mediante un componente `AuthGate`.

### ⭐ US4 — Estaciones favoritas

- Marcar/desmarcar estaciones como favoritas desde el popup del mapa o el panel de tendencias.
- **Tope de 10 favoritos por usuario**, garantizado con un trigger PL/pgSQL `BEFORE INSERT` (defensa server-side, no solo validación de cliente).
- Página `/favoritos` con grid responsive y la última lectura de cada estación marcada.

### 🔔 US5 — Alertas personalizadas

- Crear hasta 5 alertas (estación + contaminante + umbral + dirección "mayor/menor que").
- Alertas **edge-triggered**: cada alerta dispara **una sola vez** al cruzar el umbral y se **re-arma** cuando una medición posterior deja de cumplir la condición. Implementado como máquina de estado dentro de un trigger `AFTER INSERT` en `readings` (`evaluate_alerts()`).
- Historial de las **últimas 20** activaciones (rotación automática vía trigger).
- Badge de no leídas en el header + toasts en tiempo real cuando una alerta dispara con la sesión activa.

## Stack técnico

| Capa              | Tecnología                                                                           |
| ----------------- | ------------------------------------------------------------------------------------ |
| **Frontend**      | React 18.3 · Vite 5.4 · TypeScript 5.6 (modo estricto) · React Router 6.27           |
| **UI / estilos**  | Tailwind CSS 3.4 · lucide-react (íconos) · sonner (toasts)                           |
| **Visualización** | Recharts 2.13 (gráficos) · Leaflet 1.9 / react-leaflet 4.2 (mapa)                    |
| **Estado**        | Zustand 5.0 (estado compartido) · React hooks (estado local)                         |
| **Backend**       | Supabase — PostgreSQL · Auth · Realtime · Edge Functions (Deno) · Row Level Security |
| **Testing**       | Vitest 2.1 · React Testing Library 16 · @vitest/coverage-v8                          |
| **Calidad**       | ESLint 9 (flat config) · Prettier 3 · Husky 9 + lint-staged · GitHub Actions CI      |
| **Deploy**        | Vercel (frontend) · Supabase Cloud (backend)                                         |

## Arquitectura

El principio rector es una **frontera arquitectónica estricta**: el frontend **nunca llama a APIs externas** directamente. La única fuente de datos del cliente es Supabase; la ingesta de datos externos (OpenAQ) vive exclusivamente en Edge Functions del lado del servidor.

```
   ┌──────────────────┐     supabase-js (anon key)      ┌─────────────────────────────┐
   │   React + Vite   │  ◄──────────────────────────►   │           Supabase          │
   │    (navegador)   │   REST + Realtime + Auth        │  Postgres · Auth · RLS      │
   └──────────────────┘                                 │  Realtime · Edge Functions  │
            ▲                                            └──────────────┬──────────────┘
            │  nunca llama APIs externas                                │ service_role
            │  (Constitución, Principio II)                             ▼  (solo server-side)
            │                                            ┌─────────────────────────────┐
            └─ toda query Supabase vive en src/hooks/    │   Edge Function (Deno)      │
               los componentes nunca importan el cliente │   ingest-openaq  */15 min   │ ──► OpenAQ v3
                                                         └─────────────────────────────┘
```

Decisiones clave que se reflejan en el código:

- **La capa de datos vive en `src/hooks/`.** Ningún componente importa el cliente Supabase: lo consume a través de hooks (`useStations`, `useStationReadings`, `useFavorites`, `useAlerts`…). Esto mantiene el árbol de render puro y testeable.
- **Row Level Security en todas las tablas.** Las tablas públicas (`stations`, `readings`) permiten solo `SELECT` anónimo; las tablas de usuario (`user_favorites`, `alerts`, `alert_history`) están restringidas por `auth.uid() = user_id`.
- **El `service_role` key nunca toca el bundle del cliente** — solo se usaría dentro de Edge Functions.
- **Lógica de negocio en la base de datos** donde corresponde: los topes (10 favoritos, 5 alertas), la evaluación edge-triggered de alertas y la rotación del historial son triggers PL/pgSQL, no validaciones de cliente fácilmente evadibles.

### Modelo de datos

| Objeto                    | Tipo  | Rol                                                                        |
| ------------------------- | ----- | -------------------------------------------------------------------------- |
| `stations`                | tabla | Estaciones de monitoreo (nombre, lat/lon, comuna). Lectura pública.        |
| `readings`                | tabla | Lecturas horarias (PM2.5/PM10/O₃, formato ancho). `UNIQUE(station, time)`. |
| `latest_station_readings` | vista | Última lectura por estación (`DISTINCT ON`, `security_invoker`).           |
| `user_favorites`          | tabla | Favoritos por usuario, PK compuesta, tope 10 vía trigger.                  |
| `alerts`                  | tabla | Alertas configuradas, con `is_armed` para el edge-trigger, tope 5.         |
| `alert_history`           | tabla | Activaciones de alertas, rotación a 20 vía trigger.                        |

`readings` y `alert_history` están publicadas en `supabase_realtime` para las suscripciones en vivo.

## Setup local

Requiere **Node 20+**, **npm 10+** y la **Supabase CLI**. Guía detallada (y troubleshooting) en [`SETUP.md`](./SETUP.md).

```bash
# 1. Clonar e instalar dependencias (respeta el lockfile)
git clone https://github.com/Homzk/AirVision.git
cd AirVision
npm ci

# 2. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (anon key legacy, JWT "eyJ…")
```

```bash
# 3. Vincular el proyecto a Supabase Cloud
supabase login
supabase link --project-ref <tu-project-ref>

# 4. Aplicar las migraciones a la base remota
supabase db push
```

```sql
-- 5. Sembrar datos de prueba (Supabase Studio → SQL Editor)
--    Pegar el contenido de supabase/seed.sql y ejecutar.
--    Crea 12 estaciones de Chile + 24 h de lecturas horarias. Idempotente.
```

```bash
# 6. Arrancar la app
npm run dev          # Vite en http://localhost:5173
```

> Solo dos variables de entorno son obligatorias para correr la app: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Las de OpenAQ están diferidas (ver [Roadmap](#roadmap)).

## Tests

La disciplina de testing es un principio de la constitución del proyecto: tests **co-localizados** con el archivo que prueban, escritos en el mismo cambio que el código.

```bash
npm run test           # Vitest en modo watch
npm run test:run       # corre una vez y sale
npm run test:coverage  # corre con reporte de cobertura
```

**Métricas actuales:**

- ✅ **161 tests** pasando
- 📊 **97.5% de cobertura de líneas** · **90.8% de ramas**
- 🎯 Umbral mínimo (_gate_) configurado: **70% líneas / 65% ramas** sobre `src/hooks/`, `src/utils/`, `src/stores/` y `src/lib/`

Los tests cubren la lógica pura (clasificación de niveles contra umbrales OMS, formateo de fechas), los stores de Zustand (transiciones de estado), los hooks con Supabase mockeado (`vi.mock()`, sin red real) y los componentes de formulario y visualización. Tests E2E con Playwright están fuera del alcance del MVP por decisión de la constitución.

## Spec-Driven Development

AirVision se construyó con **[Spec Kit](https://github.com/github/spec-kit)**, un flujo de _Spec-Driven Development_ donde la especificación, el plan técnico y la lista de tareas se redactan **antes** de implementar. Todo el diseño del feature vive versionado en el repo:

```
specs/001-air-quality-dashboard/
├── spec.md            # Qué se construye y por qué (historias de usuario, criterios)
├── plan.md            # Stack, estructura, decisiones técnicas
├── research.md        # Investigación previa (OpenAQ, umbrales OMS, etc.)
├── data-model.md      # Esquema de tablas, RLS, triggers
├── contracts/         # Contratos de RPC, Edge Functions y canales Realtime
├── quickstart.md      # Guía de validación manual
└── tasks.md           # 116 tareas trazables (T001…T116), una por commit-scope
```

El proyecto se rige además por una **constitución** ([`.specify/memory/constitution.md`](./.specify/memory/constitution.md)) con principios no negociables: type safety, fronteras arquitectónicas, seguridad por defecto (RLS), calidad de UX, workflow convencional y disciplina de testing. Cada decisión de diseño es trazable hasta su task y su principio. Este enfoque es lo que diferencia a AirVision de un proyecto de portafolio improvisado.

## Roadmap

**Pendiente — Phase 8 (Polish):**

- Verificación responsive a 360px en las seis pantallas principales.
- `ReconnectingIndicator` en el header reflejando el estado de los canales Realtime.
- Deploy a Vercel con variables de entorno configuradas.

**Diferido — feature 002 (post-MVP):**

- **Ingesta real desde OpenAQ v3.** Hoy la app corre con un seed sintético de 12 estaciones de Chile. La arquitectura ya contempla la ingesta (Edge Functions `seed-stations` e `ingest-openaq` programadas cada 15 min con `ON CONFLICT DO UPDATE`), que se conectará sin tocar el frontend cuando se disponga de una `OPENAQ_API_KEY`.
- Tests E2E con Playwright (register/login, navegación del mapa, favoritos, alertas).

## Licencia

Distribuido bajo la licencia **MIT**. Ver [`LICENSE`](./LICENSE) para más detalles.

## Autor

Desarrollado por [**Homzk**](https://github.com/Homzk) como proyecto de portafolio fullstack.
