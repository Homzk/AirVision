# Quickstart: Búsqueda y filtrado de estaciones en el mapa

**Feature**: 004-station-search-filters · **Date**: 2026-06-02

Cómo validar la feature en local. No requiere configuración nueva (sin BD, sin secretos adicionales): basta el `.env.local` ya existente para el frontend.

## Requisitos

- Node 22+ (ver `.nvmrc`), `npm ci` hecho.
- `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (los del proyecto).
- Dependencia nueva instalada: `npm i supercluster` (+ `@types/supercluster` si hiciera falta).

## Arrancar

```bash
npm run dev        # Vite en http://localhost:5173
```

## Validación manual (mapea a Success Criteria)

1. **Buscador (US1 / SC-001)**: en el mapa, escribe "Tocopilla" en el buscador → aparecen sugerencias; elige una → el mapa vuela a la estación y abre su popup. Borra el texto → vuelve el set según los demás filtros. Prueba con teclado (flechas + Enter).
2. **Sin datos + contador (US2 / SC-002)**: al cargar, solo se ven estaciones con datos y el contador dice "Mostrando X de Y…". Activa "mostrar sin datos recientes" → aparecen marcadores grises distinguibles y el contador sube. Desactiva → vuelven a ocultarse.
3. **Filtro por nivel (US3 / SC-003)**: selecciona el chip "Mala"/"Muy mala" → solo quedan esas estaciones; el contador cuadra. Activa varios niveles (OR). Limpia → se restablece.
4. **Combinación + vacío (SC-003/SC-005)**: combina búsqueda + nivel que no coincidan → se muestra el mensaje en español "ninguna estación coincide" (no una pantalla en blanco).
5. **Clustering (US4 / SC-004)**: aleja el zoom a nivel país → estaciones cercanas agrupadas en burbujas con conteo; acerca → se separan en marcadores. Con filtros activos, los conteos de cluster reflejan solo lo visible.
6. **Cerca de mí (US5 / SC-006)**: pulsa "estaciones cerca de mí" y concede el permiso → el mapa se centra en tu posición y prioriza las cercanas. Repite denegando el permiso → mensaje de fallback en español, sin romper la página.
7. **Responsive (Constitución IV)**: repite 1–4 a 360px de ancho (DevTools) — los controles siguen usables.

## Tests

```bash
npm run test:run        # unit/integration (incluye stationFilters, filtersStore, useGeolocation, useSupercluster)
npm run test:coverage   # debe mantener ≥70% líneas en src/lib, src/stores, src/hooks
npm run test:e2e        # incluye e2e/specs/discovery.spec.ts (búsqueda + filtros + contador)
```

## Criterios de aceptación de la corrida

- `npm run build`, `typecheck`, `lint` en verde.
- Vitest sin specs en rojo; cobertura sobre el gate.
- `discovery.spec.ts` en verde contra la app levantada.
- Sin regresiones en los specs E2E previos (map/auth/favorites/alerts).
