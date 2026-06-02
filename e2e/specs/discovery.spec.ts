import { expect, test } from '@playwright/test'

// US1/US2/US3 — Descubrimiento: búsqueda, toggle de sin-datos y filtro por nivel.
// Corre contra datos reales en vivo, así que las aserciones se apoyan en el
// contador y los estados (no en estaciones concretas, cuyos nombres varían).

/** Extrae el "mostrando X" del texto del contador. */
function shownFrom(text: string | null): number {
  const m = text?.match(/Mostrando\s+(\d+)\s+de\s+(\d+)/)
  return m ? Number(m[1]) : 0
}

test.describe('US-discovery - Búsqueda y filtrado', () => {
  test('el contador es visible y el toggle de sin-datos no reduce lo mostrado', async ({
    page,
  }) => {
    await page.goto('/')

    const counter = page.getByText(/Mostrando \d+ de \d+ estaciones/)
    await expect(counter).toBeVisible()
    const before = shownFrom(await counter.textContent())

    // Mostrar también las estaciones sin datos recientes: el conteo no baja.
    await page.getByRole('checkbox', { name: /sin datos recientes/i }).check()
    await expect(counter).toBeVisible()
    const after = shownFrom(await counter.textContent())
    expect(after).toBeGreaterThanOrEqual(before)
  })

  test('filtrar por un nivel no aumenta lo mostrado y se puede limpiar', async ({ page }) => {
    await page.goto('/')
    const counter = page.getByText(/Mostrando \d+ de \d+ estaciones/)
    await expect(counter).toBeVisible()
    const before = shownFrom(await counter.textContent())

    const chip = page.getByRole('button', { name: 'Buena' })
    await chip.click()
    // Filtrar por un solo nivel nunca muestra más estaciones que sin filtro.
    const filtered = shownFrom(await counter.textContent())
    expect(filtered).toBeLessThanOrEqual(before)

    // Quitar el filtro restaura el conteo original.
    await chip.click()
    expect(shownFrom(await counter.textContent())).toBe(before)
  })

  test('una búsqueda sin coincidencias muestra el copy "sin resultados"', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('combobox', { name: /buscar estación o comuna/i }).fill('zzzznotacity')
    await expect(page.getByText(/sin resultados/i)).toBeVisible()
  })
})
