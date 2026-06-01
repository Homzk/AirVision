import { expect, test } from '@playwright/test'

import {
  createEphemeralUser,
  deleteEphemeralUser,
  loginAs,
  type EphemeralUser,
} from '../fixtures/auth'
import {
  deleteInjectedReading,
  firstStationId,
  injectThresholdReading,
  type InjectedReading,
} from '../fixtures/readings'

// US4 — Alertas (usuario efímero + inyección de lectura con service_role).
test.describe('US4 - Alertas', () => {
  let user: EphemeralUser
  let stationId: number
  let injected: InjectedReading | null = null

  test.beforeEach(async () => {
    user = await createEphemeralUser()
    stationId = await firstStationId()
    injected = null
  })
  test.afterEach(async () => {
    if (injected) await deleteInjectedReading(injected)
    if (user) await deleteEphemeralUser(user.id)
  })

  test('crear alerta, dispararla con una lectura y marcarla como leída', async ({ page }) => {
    await loginAs(page, user)
    await page.goto('/alertas')

    // Crear la alerta: PM2.5 > 35.
    await page.getByRole('button', { name: 'Nueva alerta' }).click()
    const dialog = page.getByRole('dialog', { name: 'Crear alerta' })
    await dialog.locator('#alert-station').selectOption(String(stationId))
    await dialog.locator('#alert-pollutant').selectOption('pm25')
    await dialog.locator('#alert-direction').selectOption('greater_than')
    await dialog.locator('#alert-threshold').fill('35')
    await dialog.getByRole('button', { name: 'Crear alerta' }).click()

    // La alerta aparece en "Mis alertas".
    await expect(page.getByText(/PM2\.5 > 35/)).toBeVisible()

    // Disparar: inyectar una lectura que cruza el umbral (fuera del navegador).
    injected = await injectThresholdReading(stationId, 'pm25', 300)

    // Recargar para leer el estado de no-leídas de forma determinista.
    await page.reload()
    // Badge de no leídas en el header (aria-label "N alerta(s) nueva(s)" — la
    // palabra "nueva" lo distingue del link de navegación "Alertas").
    const badge = page.getByRole('link', { name: /nuevas?/i })
    await expect(badge).toBeVisible()

    // El disparo aparece en el historial.
    await page.getByRole('tab', { name: 'Historial' }).click()
    await expect(page.getByText(/PM2\.5 llegó a/)).toBeVisible()

    // Marcar como leídas → el badge desaparece.
    await page.getByRole('button', { name: 'Marcar todas como leídas' }).click()
    await expect(badge).toBeHidden()
  })
})
