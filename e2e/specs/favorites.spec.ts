import { expect, test } from '@playwright/test'

import {
  authedClient,
  createEphemeralUser,
  deleteEphemeralUser,
  loginAs,
  type EphemeralUser,
} from '../fixtures/auth'
import { getAdminClient } from '../fixtures/supabase-admin'

// US3 — Favoritos (usuario efímero autenticado).
test.describe('US3 - Favoritos', () => {
  let user: EphemeralUser

  test.beforeEach(async () => {
    user = await createEphemeralUser()
  })
  test.afterEach(async () => {
    if (user) await deleteEphemeralUser(user.id)
  })

  test('marcar una estación como favorita y luego desmarcarla', async ({ page }) => {
    await loginAs(page, user)
    await page.goto('/')

    // Abrir el popup de una estación y marcarla como favorita (force: marcadores solapados).
    await page.locator('path.leaflet-interactive').first().click({ force: true })
    const popup = page.locator('.leaflet-popup')
    await expect(popup).toBeVisible()
    await popup.getByRole('button', { name: 'Agregar a favoritos' }).click()
    // Esperar a que el alta se confirme (la estrella pasa a "Quitar") antes de
    // navegar, para no abortar la petición en vuelo.
    await expect(popup.getByRole('button', { name: 'Quitar de favoritos' })).toBeVisible()

    // Aparece en /favoritos.
    await page.goto('/favoritos')
    await expect(page.getByText(/1 de 10 estaciones marcadas/)).toBeVisible()

    // Desmarcar desde la card → vuelve al estado vacío.
    await page.getByRole('button', { name: 'Quitar de favoritos' }).first().click()
    await expect(page.getByText('Marca estaciones desde el mapa para verlas aquí.')).toBeVisible()
  })

  test('el tope de 10 favoritos se respeta', async ({ page }) => {
    // Sembrar 10 favoritos por el camino legítimo: sesión autenticada del propio
    // usuario (RLS de authenticated), sin requerir grants de service_role en
    // user_favorites. Las estaciones se leen con el admin (stations es público).
    const admin = getAdminClient()
    const { data: stations, error } = await admin
      .from('stations')
      .select('id')
      .order('id')
      .limit(10)
    if (error || !stations?.length)
      throw new Error(`No hay estaciones para sembrar: ${error?.message}`)
    const asUser = await authedClient(user)
    const rows = stations.map((s) => ({ user_id: user.id, station_id: s.id as number }))
    const { error: insErr } = await asUser.from('user_favorites').insert(rows)
    if (insErr) throw new Error(`No se pudieron sembrar favoritos: ${insErr.message}`)

    await loginAs(page, user)
    await page.goto('/favoritos')

    // El tope queda reflejado: 10 de 10 marcadas (no se pueden agregar más).
    await expect(page.getByText(/10 de 10 estaciones marcadas/)).toBeVisible()
  })
})
