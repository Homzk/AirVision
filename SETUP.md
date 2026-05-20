# AirVision — Setup en máquina nueva

Guía paso a paso para retomar el proyecto en un equipo distinto (ej: pasar del desktop al notebook).

## Requisitos

| Herramienta        | Versión mínima            | Notas                                                                        |
| ------------------ | ------------------------- | ---------------------------------------------------------------------------- |
| Node.js            | 20 LTS (o 22 LTS)         | Vite 5 + Vitest 2 funcionan con 18+, pero el lockfile se generó con 22.      |
| npm                | 10+                       | Viene con Node 20+.                                                          |
| Supabase CLI       | 1.x                       | `npm i -g supabase` o `winget install Supabase.CLI` en Windows.              |
| Git                | cualquier versión moderna |                                                                              |
| Cuenta de Supabase | —                         | Con acceso al proyecto AirVision (mismo project-ref que el equipo anterior). |

Verificá con `node -v`, `npm -v`, `supabase --version`.

## 1. Clonar e instalar

```powershell
git clone https://github.com/Homzk/AirVision.git
cd AirVision
npm ci                 # respeta el lockfile (más reproducible que `npm install`)
```

`npm ci` instala las ~489 dependencias y prepara el hook de Husky.

## 2. Configurar `.env.local`

```powershell
copy .env.example .env.local
```

Editá `.env.local` con los valores reales. Solo dos son obligatorios para correr la app:

| Variable                 | De dónde sacarla                                                                                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase Studio → Project Settings → API → "Project URL". Algo como `https://abcdefgh.supabase.co`.                                                                         |
| `VITE_SUPABASE_ANON_KEY` | Supabase Studio → Project Settings → API → "Project API keys" → **`anon` `public`** (JWT que empieza con `eyJ…`). NO uses la "publishable key" nueva — ver Troubleshooting. |

Las otras variables (`OPENAQ_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) son para Edge Functions de OpenAQ que están diferidas a feature 002 — déjalas vacías por ahora.

> `.env.local` está en `.gitignore` (Constitución III, secret hygiene). Nunca commitearlo.

## 3. Vincular el proyecto a Supabase Cloud

```powershell
supabase login                              # abre el navegador para autenticar
supabase link --project-ref <project-ref>   # <project-ref> es la cadena de 20 chars del subdominio de Project URL
```

El `<project-ref>` es la parte antes de `.supabase.co` en tu Project URL. Por ejemplo, si `VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co`, el ref es `abcdefghijklmnop`.

Esto crea `supabase/.temp/project-ref` (ya gitignored). A partir de ahora `supabase db push` y `supabase gen types typescript --linked` apuntan a la BD remota.

## 4. Verificar el estado de la BD

```powershell
supabase db push       # debería decir "Remote database is up to date" si ya están las 13 migraciones aplicadas
```

Si por algún motivo querés regenerar los tipos desde cero (recomendado al primer arranque para confirmar que todo está en orden):

```powershell
supabase gen types typescript --linked | Out-File -Encoding utf8 src/types/database.ts
```

**Importante**: usar `| Out-File -Encoding utf8` y NO `>` directo. PowerShell 5.1 escribe UTF-16 con redirect simple, lo cual rompe TypeScript, ESLint, grep y Vite. Documentado en la memoria persistente del proyecto.

## 5. Correr la app

```powershell
npm run dev            # arranca Vite en http://localhost:5173
```

En otra terminal podés correr cualquiera de estos:

```powershell
npm run test           # vitest en modo watch
npm run test:run       # corre una vez y sale
npm run test:coverage  # corre con coverage report
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint flat config
npm run build          # production build (tsc -b && vite build)
```

## 6. Datos de prueba

Si el `/` muestra el banner "Aún no se han recibido mediciones", la BD está vacía. Corré el seed manualmente:

1. Supabase Studio → SQL Editor → New Query
2. Pegá el contenido de `supabase/seed.sql`
3. Run

Quedan creadas 12 estaciones + 24 lecturas horarias por estación. El seed es idempotente — re-correrlo es seguro.

## Troubleshooting conocido

### "permission denied for table X" al hacer UPDATE/INSERT/DELETE desde el cliente

La RLS policy permite la operación a nivel fila pero falta un `GRANT` a nivel rol. Pasó con `alert_history` y se resolvió con la migración `0012_alert_history_grants.sql`. Si aparece en otras tablas, agregá una migración nueva con:

```sql
GRANT <UPDATE|INSERT|DELETE> [(columna1, columna2)] ON <tabla> TO authenticated;
```

Preferí column-scoped cuando aplique (defense in depth).

### "Invalid JWT" o "Invalid API key" al hacer fetch desde el cliente

Probablemente estás usando una **publishable key nueva** en `VITE_SUPABASE_ANON_KEY` en lugar de la **legacy anon key**. Las nuevas (las que empiezan con `sb_publishable_…`) tienen formato distinto y supabase-js v2.45 no las soporta en todos los flujos. Usá la legacy (JWT largo que empieza con `eyJ…`).

En el dashboard de Supabase: Project Settings → API → Project API keys → **`anon` `public`**, no las "API keys (new)".

### `supabase db push` falla con "must use --include-all"

Si añadiste una migración local con número MENOR al más alto que ya está en la BD remota, Supabase te pedirá `--include-all`:

```powershell
supabase db push --include-all
```

Esto es seguro porque las migraciones ya aplicadas no se re-corren (Supabase trackea cuáles aplicó).

### `supabase gen types` produce un archivo ilegible

Si abrís `src/types/database.ts` y ves espacios entre todos los caracteres (`e x p o r t   t y p e`), es UTF-16. Re-encodealo en UTF-8 sin BOM:

```powershell
$path = "src\types\database.ts"
$content = Get-Content -Path $path -Encoding Unicode -Raw
[System.IO.File]::WriteAllText((Resolve-Path $path).Path, $content, (New-Object System.Text.UTF8Encoding $false))
```

O regeneralo bien desde el inicio con `| Out-File -Encoding utf8`.

### Husky no corre el pre-commit hook

```powershell
npm run prepare        # re-inicializa husky
```

Si seguís sin hooks, revisá que `.husky/pre-commit` exista y tenga permisos de ejecución (en Windows no aplica, en mac/Linux `chmod +x .husky/pre-commit`).

## Resumen de comandos del día a día

```powershell
npm run dev                                      # Vite dev server
supabase db push                                 # aplicar migraciones nuevas a Cloud
supabase gen types typescript --linked | Out-File -Encoding utf8 src/types/database.ts
npm run test                                     # vitest watch
git push origin main                             # subir commits
```
