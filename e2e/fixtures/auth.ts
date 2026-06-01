import { expect, type Page } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { getAdminClient, TEST_EMAIL_DOMAIN } from './supabase-admin'

export interface EphemeralUser {
  id: string
  email: string
  password: string
}

const PASSWORD = 'E2e-passw0rd!'
let counter = 0

/** Email único por corrida para no colisionar entre tests ni entre ejecuciones. */
export function uniqueTestEmail(prefix = 'e2e'): string {
  const runId = process.env.E2E_RUN_ID ?? String(process.pid)
  return `${prefix}-${runId}-${counter++}-${Date.now()}@${TEST_EMAIL_DOMAIN}`
}

/** Crea un usuario confirmado (sin depender del correo) vía la API admin. */
export async function createEphemeralUser(): Promise<EphemeralUser> {
  const admin = getAdminClient()
  const email = uniqueTestEmail()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  if (error || !data.user) {
    throw new Error(`No se pudo crear el usuario efímero: ${error?.message ?? 'sin usuario'}`)
  }
  return { id: data.user.id, email, password: PASSWORD }
}

/** Borra el usuario (cascada FK limpia favoritos/alertas/historial). Idempotente. */
export async function deleteEphemeralUser(id: string): Promise<void> {
  const admin = getAdminClient()
  await admin.auth.admin.deleteUser(id)
}

/**
 * Cliente Supabase autenticado COMO el usuario (anon key + signInWithPassword),
 * para sembrar datos por el camino legítimo (RLS de `authenticated`), sin
 * depender de privilegios de service_role sobre tablas de usuario.
 */
export async function authedClient(user: EphemeralUser): Promise<SupabaseClient> {
  const url = process.env.VITE_SUPABASE_URL
  const anon = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Faltan VITE_SUPABASE_URL/ANON_KEY en el runner E2E.')
  const client = createClient(url, anon, { auth: { persistSession: false } })
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  })
  if (error) throw new Error(`No se pudo iniciar sesión para sembrar datos: ${error.message}`)
  return client
}

/** Inicia sesión por la UI y espera a que la sesión esté activa. */
export async function loginAs(page: Page, user: EphemeralUser): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(user.password)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()
}
