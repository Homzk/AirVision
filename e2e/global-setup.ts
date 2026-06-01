import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

import { getAdminClient } from './fixtures/supabase-admin'

/** Valida temprano que el entorno del runner tiene las credenciales necesarias. */
async function globalSetup(): Promise<void> {
  getAdminClient() // lanza con mensaje accionable si falta alguna env
}

export default globalSetup
