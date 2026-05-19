# Quickstart — AirVision Dev Setup

**Feature**: 001-air-quality-dashboard
**Audience**: Desarrollador local levantando el proyecto por primera vez.

## Prerrequisitos

- **Node.js** 20 LTS o superior.
- **pnpm** o **npm** (los ejemplos usan `npm`).
- **Supabase CLI** ≥ 1.190 (`npm i -g supabase` o `scoop install supabase`).
- **Docker** corriendo (para `supabase start` local).
- Una **API key gratuita de OpenAQ** — obtenerla en
  https://openaq.org/account.

## 1. Clonar e instalar dependencias

```bash
git clone <repo-url> airvision
cd airvision
git checkout 001-air-quality-dashboard
npm install
```

## 2. Variables de entorno

Copiar la plantilla:

```bash
cp .env.example .env.local
```

Editar `.env.local`:

```dotenv
# Frontend (Vite)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon key impreso por `supabase start`>

# Edge Functions (server-side only)
OPENAQ_API_KEY=<tu api key de OpenAQ>
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service_role key impreso por `supabase start`>
```

`.env.local` está en `.gitignore` y nunca se commitea.

## 3. Levantar Supabase local

```bash
supabase start
```

La primera vez tarda 2–3 minutos descargando imágenes Docker. Imprime
las URLs y claves (`anon` y `service_role`); copiarlas al `.env.local`.

Aplicar migraciones:

```bash
supabase db push
# (en local, equivalente a `supabase db reset` + replay de migraciones)
```

## 4. Seed inicial de estaciones

```bash
supabase functions serve seed-stations &
curl -X POST http://127.0.0.1:54321/functions/v1/seed-stations \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Deja ~50 estaciones de Chile en `stations`. La tabla `readings` queda
vacía hasta el primer ciclo de ingesta.

## 5. Primer ciclo de ingesta (manual en dev)

```bash
supabase functions serve ingest-openaq &
curl -X POST http://127.0.0.1:54321/functions/v1/ingest-openaq \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Tras unos segundos, hay mediciones recientes para mostrar.

## 6. Generar tipos TypeScript

```bash
supabase gen types typescript --local > src/types/database.ts
```

## 7. Arrancar el frontend

```bash
npm run dev
```

Abre http://localhost:5173. El mapa de Chile debería mostrar marcadores
coloreados según las lecturas que acabas de ingestar.

## 8. Crear una cuenta y probar favoritos/alertas

1. Click en "Registrarse".
2. Email + password (≥ 8 caracteres). Sin verificación de email en local.
3. Click en una estación → "Agregar a favoritos" → ver en la sección Favoritos.
4. Sección "Alertas" → "Nueva alerta" → estación, contaminante, umbral, dirección.

Para gatillar una alerta manualmente, insertar una medición con
`service_role`:

```sql
INSERT INTO readings (station_id, measured_at, pm25)
VALUES (<station_id_de_la_alerta>, now(), <valor_que_cruce_el_umbral>);
```

Debe aparecer un toast y la entrada en el historial.

## Comandos útiles

| Comando                                 | Descripción                                                 |
| --------------------------------------- | ----------------------------------------------------------- |
| `npm run dev`                           | Servidor Vite con HMR.                                      |
| `npm run build`                         | Build de producción a `dist/`.                              |
| `npm run preview`                       | Sirve `dist/` localmente.                                   |
| `npm run lint`                          | ESLint sobre `src/`.                                        |
| `npm run typecheck`                     | `tsc --noEmit`.                                             |
| `npm run test`                          | Vitest interactivo.                                         |
| `npm run test:coverage`                 | Vitest con coverage; falla si < 70 % en hooks/utils/stores. |
| `supabase db reset`                     | Recrea la BD local desde migraciones (drop + replay).       |
| `supabase functions serve <name>`       | Sirve una Edge Function localmente.                         |
| `supabase functions deploy <name>`      | Sube la función a Supabase Cloud.                           |
| `supabase gen types typescript --local` | Regenera tipos tras una migración.                          |

## Setup de cron en Supabase Cloud (no local)

Una vez deployado:

```bash
supabase functions deploy ingest-openaq
supabase functions schedule create ingest-openaq --cron "*/15 * * * *"
```

Verificar con `supabase functions schedule list`.

## Troubleshooting

- **El mapa carga pero está vacío**: ejecutar pasos 4 y 5. Sin
  estaciones ni lecturas no hay nada que pintar.
- **El gráfico no se actualiza**: revisar consola del navegador para
  errores de Realtime; verificar que `readings` está en la publicación
  con `SELECT * FROM pg_publication_tables`.
- **El toast de alerta no aparece**: verificar que el trigger
  `readings_evaluate_alerts_trigger` está activo (`\d+ readings` en
  `psql`). Confirmar que `alert_history` también está en la
  publicación realtime.
- **`MAXIMO 5 alertas por usuario` en una creación legítima**:
  contar `SELECT count(*) FROM alerts WHERE user_id = ...`. El límite
  es global por usuario, no por estación.
