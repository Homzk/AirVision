#!/usr/bin/env bash
# Invoca una Edge Function desplegada por HTTP (la CLI no tiene `functions invoke`).
# Uso:  bash scripts/invoke-function.sh seed-stations
#       bash scripts/invoke-function.sh ingest-openaq
#
# Se ubica solo (no importa el cwd) y lee VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
# de .env.local. La anon key solo pasa el gateway; la función usa service_role.
set -euo pipefail

fn="${1:?uso: bash scripts/invoke-function.sh <seed-stations|ingest-openaq>}"

# Raíz del repo = carpeta padre de este script.
cd "$(dirname "$0")/.."

if [ ! -f .env.local ]; then
  echo "ERROR: no encuentro .env.local en $(pwd)" >&2
  exit 1
fi

clean() { grep "^$1=" .env.local | cut -d= -f2- | tr -d '"'"'"'\r' | xargs; }
url="$(clean VITE_SUPABASE_URL)"
anon="$(clean VITE_SUPABASE_ANON_KEY)"

echo ">> POST ${url}/functions/v1/${fn}"
curl -sS -i -X POST "${url}/functions/v1/${fn}" -H "Authorization: Bearer ${anon}"
echo
