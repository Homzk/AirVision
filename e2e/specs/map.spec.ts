import { expect, test } from '@playwright/test'

// US1 — Mapa público (visitante anónimo, sin usuario).
test.describe('US1 - Mapa y datos públicos', () => {
  test('el mapa carga con marcadores de estaciones', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.leaflet-container')).toBeVisible()
    // Los CircleMarker de Leaflet se renderizan como <path class="leaflet-interactive">.
    const markers = page.locator('path.leaflet-interactive')
    await expect(markers.first()).toBeVisible()
    expect(await markers.count()).toBeGreaterThan(0)
  })

  test('el detalle de una estación muestra contaminantes o el estado sin datos', async ({
    page,
  }) => {
    await page.goto('/')
    // A zoom de país, los marcadores de Leaflet se solapan; con force basta con
    // abrir el popup de cualquiera de ellos (el test no depende de uno concreto).
    await page.locator('path.leaflet-interactive').first().click({ force: true })

    const popup = page.locator('.leaflet-popup')
    await expect(popup).toBeVisible()
    // El popup siempre ofrece "Ver tendencias".
    await expect(popup.getByRole('button', { name: 'Ver tendencias' })).toBeVisible()

    // Renderiza una de las dos ramas: lectura reciente o estado "sin datos".
    // (Contra datos reales en vivo no se puede garantizar una estación rancia,
    //  así que se valida el render correcto de cualquiera de las dos.)
    const hasReading = await popup
      .getByText('Última lectura:')
      .isVisible()
      .catch(() => false)
    const noData = await popup
      .getByText('Sin datos recientes')
      .isVisible()
      .catch(() => false)
    expect(hasReading || noData).toBeTruthy()
  })
})
