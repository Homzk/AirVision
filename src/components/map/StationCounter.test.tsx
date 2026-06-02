import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { StationCounter } from '@/components/map/StationCounter'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useFiltersStore } from '@/stores/filtersStore'
import type { StationWithLatest } from '@/types/domain'

function makeStation(id: number, name: string, withData: boolean): StationWithLatest {
  return {
    id,
    name,
    city: name,
    latitude: -33 - id,
    longitude: -70,
    country_code: 'CL',
    created_at: '2026-01-01T00:00:00Z',
    latest: withData
      ? { measured_at: '2026-06-02T12:00:00Z', pm25: 10, pm10: null, o3: null }
      : null,
  }
}

beforeEach(() => {
  useFiltersStore.getState().reset()
  useDashboardStore
    .getState()
    .setStations([
      makeStation(1, 'Tocopilla', true),
      makeStation(2, 'Las Condes', true),
      makeStation(3, 'Puerto Montt', false),
    ])
})

describe('StationCounter', () => {
  it('counts only stations with data by default', () => {
    render(<StationCounter />)
    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 2 de 3 estaciones')
  })

  it('counts all stations when no-data ones are shown', () => {
    useFiltersStore.getState().setShowNoData(true)
    render(<StationCounter />)
    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 3 de 3 estaciones')
  })

  it('shows the empty state when nothing matches', () => {
    useFiltersStore.getState().setSearchTerm('inexistente')
    render(<StationCounter />)
    expect(screen.getByRole('status')).toHaveTextContent(/ninguna estación coincide/i)
  })

  it('combines no-data + level filters with AND (T012)', () => {
    // Show no-data too, but restrict to "good": the no-data station is excluded
    // by the level filter, so only the two stations with data remain.
    useFiltersStore.getState().setShowNoData(true)
    useFiltersStore.getState().toggleLevel('good')
    render(<StationCounter />)
    expect(screen.getByRole('status')).toHaveTextContent('Mostrando 2 de 3 estaciones')
  })

  it('shows the empty state when the level filter excludes everything (T012)', () => {
    useFiltersStore.getState().toggleLevel('hazardous') // no fixture is hazardous
    render(<StationCounter />)
    expect(screen.getByRole('status')).toHaveTextContent(/ninguna estación coincide/i)
  })
})
