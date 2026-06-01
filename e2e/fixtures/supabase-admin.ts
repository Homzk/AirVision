import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase con `service_role`, **solo para el proceso de test de Node**.
 * Jamás se importa desde `src/` ni llega al navegador (Constitución, Principio III).
 * Lo usan los helpers de setup/teardown: crear/borrar usuarios efímeros e
 * inyectar/borrar lecturas para el test de alertas.
 */
export function getAdminClient(): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('Falta VITE_SUPABASE_URL en el entorno del runner E2E.')
  if (!key) {
    throw new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del runner E2E (en local: .env.local; en CI: GitHub Secrets).',
    )
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Dominio de los emails de prueba; usado también por el teardown de limpieza. */
export const TEST_EMAIL_DOMAIN = 'airvision.test'
