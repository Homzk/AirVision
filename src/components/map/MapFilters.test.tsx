import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MapFilters } from '@/components/map/MapFilters'
import type { GeoStatus } from '@/hooks/useGeolocation'
import type { Coords } from '@/lib/stationFilters'
import { useFiltersStore } from '@/stores/filtersStore'

// Controllable stub for the geolocation hook.
const geo = vi.hoisted(() => ({
  value: { status: 'idle' as GeoStatus, coords: null as Coords | null, request: vi.fn() },
}))
vi.mock('@/hooks/useGeolocation', () => ({ useGeolocation: () => geo.value }))

beforeEach(() => {
  useFiltersStore.getState().reset()
  geo.value = { status: 'idle', coords: null, request: vi.fn() }
})

describe('MapFilters', () => {
  it('renders the no-data toggle unchecked by default', () => {
    render(<MapFilters />)
    const toggle = screen.getByRole('checkbox', { name: /sin datos recientes/i })
    expect(toggle).not.toBeChecked()
  })

  it('toggling updates showNoData in the store', async () => {
    const user = userEvent.setup()
    render(<MapFilters />)
    const toggle = screen.getByRole('checkbox', { name: /sin datos recientes/i })

    await user.click(toggle)
    expect(useFiltersStore.getState().showNoData).toBe(true)
    expect(toggle).toBeChecked()

    await user.click(toggle)
    expect(useFiltersStore.getState().showNoData).toBe(false)
  })

  it('reflects the store state', () => {
    useFiltersStore.getState().setShowNoData(true)
    render(<MapFilters />)
    expect(screen.getByRole('checkbox', { name: /sin datos recientes/i })).toBeChecked()
  })

  it('renders the four level chips, unpressed by default', () => {
    render(<MapFilters />)
    for (const name of ['Buena', 'Moderada', 'Mala', 'Muy mala']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false')
    }
  })

  it('toggling a level chip adds then removes it (OR multi-select)', async () => {
    const user = userEvent.setup()
    render(<MapFilters />)
    const mala = screen.getByRole('button', { name: 'Mala' })

    await user.click(mala)
    expect(useFiltersStore.getState().selectedLevels).toEqual(['unhealthy'])
    expect(mala).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Muy mala' }))
    expect(useFiltersStore.getState().selectedLevels).toEqual(['unhealthy', 'hazardous'])

    await user.click(mala)
    expect(useFiltersStore.getState().selectedLevels).toEqual(['hazardous'])
  })

  it('triggers a geolocation request when the near-me button is clicked', async () => {
    const user = userEvent.setup()
    render(<MapFilters />)
    await user.click(screen.getByRole('button', { name: /cerca de mí/i }))
    expect(geo.value.request).toHaveBeenCalled()
  })

  it('activates near-me and flies to the user when location is granted', () => {
    geo.value = { status: 'granted', coords: { lat: -33.45, lng: -70.66 }, request: vi.fn() }
    render(<MapFilters />)
    expect(useFiltersStore.getState().nearMe).toEqual({
      active: true,
      coords: { lat: -33.45, lng: -70.66 },
    })
    expect(useFiltersStore.getState().flyToTarget).toEqual({
      lat: -33.45,
      lng: -70.66,
      stationId: null,
    })
  })

  it('shows a Spanish fallback message when location is denied', () => {
    geo.value = { status: 'denied', coords: null, request: vi.fn() }
    render(<MapFilters />)
    expect(screen.getByRole('alert')).toHaveTextContent(/no pudimos obtener tu ubicación/i)
  })
})
