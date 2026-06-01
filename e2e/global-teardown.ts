import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

import { getAdminClient, TEST_EMAIL_DOMAIN } from './fixtures/supabase-admin'

/**
 * Red de seguridad para SC-006 (huella cero): borra TODOS los usuarios
 * `*@airvision.test` que pudieran haber quedado de cualquier corrida (incluido
 * el flujo de registro de US2, cuyo id no se conoce inline). La cascada FK
 * elimina sus favoritos/alertas/historial.
 */
async function globalTeardown(): Promise<void> {
  const admin = getAdminClient()
  let page = 1
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data?.users?.length) break
    const stale = data.users.filter((u) => u.email?.endsWith(`@${TEST_EMAIL_DOMAIN}`))
    for (const u of stale) {
      await admin.auth.admin.deleteUser(u.id)
    }
    if (data.users.length < 1000) break
    page += 1
  }
}

export default globalTeardown
