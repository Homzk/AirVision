# Quality Gates — AirVision (T115)

**Fecha de la corrida**: 2026-05-30
**Constitución**: v1.1.0 (`.specify/memory/constitution.md`, §Development Workflow & Quality Gates)
**Veredicto global**: ✅ **PASS** (7/7 gates)

Verificación de los siete gates obligatorios antes de merge a `main`. Cada
gate se corrió localmente; los resultados son reproducibles con los comandos
indicados.

## 1. Build — ✅ PASS

- `npm run build` → exit 0 (`tsc -b && vite build`), construido en ~8 s.
- Salida en `dist/`: `index.js` 1021 kB / 291 kB gzip, `index.css` 33 kB / 11 kB.
- Único warning: chunk > 500 kB (deuda técnica conocida de bundle, no es error). Candidato a code-split (ver `NOTES.md`).

## 2. Type-check — ✅ PASS

- `npm run typecheck` (`tsc --noEmit`) → exit 0, **cero errores**.
- TypeScript en modo estricto (`strict`, `noImplicitAny`, `strictNullChecks`); sin `any` en código de aplicación.

## 3. Lint / Format — ✅ PASS

- `npm run lint` (`eslint .`) → exit 0, sin warnings ni errores.
- `npx prettier --check .` → exit 0 (`All matched files use Prettier code style!`).
- **Resuelto en esta corrida**: `prettier --check .` marcaba 58 archivos. Causa raíz: **CRLF vs LF** (Windows + git `autocrlf`) en archivos que nunca pasaron por el pipeline de lint-staged — no eran problemas de estilo reales. Fix durable: se añadió `"endOfLine": "auto"` a `.prettierrc` para que Prettier respete el EOL de la plataforma de forma consistente (evita falsos fallos en cada checkout en Windows). Además, el tooling vendado de Spec Kit (`.specify/`, `.claude/`) se añadió a `.prettierignore` por no ser código de la aplicación.

## 4. Tests + Coverage — ✅ PASS

- `npx vitest run` → **166 tests** en 27 archivos, 0 fallos.
- `npm run test:coverage` → **97.25% líneas / 90.36% ramas** sobre `src/{hooks,utils,stores,lib}/**`.
- Umbral configurado (`vitest.config.ts`): lines/functions/statements 70, branches 65 → se superan holgadamente.
- Tests co-localizados (Principio VI); cada implementación de esta sesión llegó con sus tests en el mismo cambio.

## 5. Security review — ✅ PASS

- **RLS habilitada en las 5 tablas**: `stations`, `readings`, `user_favorites`, `alerts`, `alert_history` (confirmado por grep `ENABLE ROW LEVEL SECURITY` en `supabase/migrations/`).
- **`service_role` nunca en el cliente**: grep `service_role|SERVICE_ROLE` en `src/` → 0 coincidencias; auditoría previa del bundle `dist/` (T111) confirmó que la única key embebida es la `anon` (`role:"anon"` decodificada del JWT).
- **Higiene de secretos**: `.env*` en `.gitignore` (solo `.env.example` trackeado); `.env.local` confirmado sin trackear.

## 6. Architectural review — ✅ PASS

- **Ningún componente importa el cliente Supabase**: grep `from '@/lib/supabase'` en `src/components/` → 0 coincidencias. Toda query/mutación/Realtime vive en `src/hooks/` (Principio II).
- **El frontend nunca llama APIs externas**: grep `openaq|fetch(|axios` en `src/` → 0 coincidencias. La ingesta de OpenAQ está reservada a Edge Functions (diferida a feature 002).

## 7. UX review — ✅ PASS

- **Tres estados explícitos** (cargando / error / vacío) con copy en español vía `LoadingState`, `ErrorState` (con reintento) y `EmptyState`, presentes en `HomePage`, `FavoritesPage`, `AlertsPage` y los paneles de datos.
- **Responsive a 360px** verificado y endurecido (T106): sin scroll horizontal ni overlap; `min-w-0` + `break-words` en filas flex con texto variable.
- UI en Tailwind + lucide; gráficos en Recharts; mapa en Leaflet/`react-leaflet`. `README.md` mantenido con overview, setup y screenshots (T113/T114).

---

## Notas / deuda conocida (no bloquea gates)

- **Bundle 1 MB** — candidato a code-split de `StationPanel` (lazy del chart).
- **Sin ingesta automática en prod** (deuda #6, verificada) — los `readings` solo se reponen re-sembrando `seed.sql`; ver escenario de datos rancios en `quickstart.md`.
- **CI** (GitHub Actions) corre lint + type-check + `vitest --run` con coverage en cada push/PR; Prettier se enforce vía pre-commit (lint-staged) sobre archivos staged.
