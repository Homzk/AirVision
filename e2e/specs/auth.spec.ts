import { expect, test } from '@playwright/test'

import { uniqueTestEmail } from '../fixtures/auth'

// US2 — Registro, login, persistencia de sesión y logout.
// (La limpieza de los usuarios creados aquí la garantiza el global-teardown,
//  que borra todos los `*@airvision.test`.)
test.describe('US2 - Cuenta', () => {
  test('registro autentica, la sesión persiste tras recarga y el logout funciona', async ({
    page,
  }) => {
    const email = uniqueTestEmail('e2e-reg')
    const password = 'E2e-passw0rd!'

    await page.goto('/registro')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Contraseña', { exact: true }).fill(password)
    await page.getByLabel('Confirmar contraseña').fill(password)
    await page.getByRole('button', { name: 'Crear cuenta' }).click()

    // Email autoconfirmado en el proyecto → queda autenticado de inmediato.
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()

    // Persistencia de sesión tras recargar.
    await page.reload()
    await expect(page.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible()

    // Logout → vuelve al estado anónimo.
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible()
  })

  test('credenciales inválidas muestran un mensaje de error en español', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(uniqueTestEmail('e2e-nologin'))
    await page.getByLabel('Contraseña', { exact: true }).fill('contraseña-incorrecta')
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()

    await expect(page.getByRole('alert')).toBeVisible()
  })
})
