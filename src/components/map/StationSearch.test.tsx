import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { StationSearch } from '@/components/map/StationSearch'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useFiltersStore } from '@/stores/filtersStore'
import type { StationWithLatest } from '@/types/domain'

function makeStation(
  fields: Pick<StationWithLatest, 'id' | 'name' | 'latitude' | 'longitude'> &
    Partial<Pick<StationWithLatest, 'city'>>,
): StationWithLatest {
  return {
    country_code: 'CL',
    created_at: '2026-01-01T00:00:00Z',
    city: null,
    latest: null,
    ...fields,
  }
}

const tocopilla = makeStation({
  id: 1,
  name: 'Tocopilla',
  city: 'Tocopilla',
  latitude: -22.09,
  longitude: -70.2,
})
const lasCondes = makeStation({
  id: 2,
  name: 'Las Condes',
  city: 'Santiago',
  latitude: -33.41,
  longitude: -70.57,
})
const valparaiso = makeStation({
  id: 3,
  name: 'Valparaíso Centro',
  city: 'Valparaíso',
  latitude: -33.05,
  longitude: -71.62,
})

beforeEach(() => {
  useFiltersStore.getState().reset()
  useDashboardStore.getState().setStations([tocopilla, lasCondes, valparaiso])
})

describe('StationSearch', () => {
  it('renders the combobox input', () => {
    render(<StationSearch />)
    expect(screen.getByRole('combobox', { name: /buscar estación o comuna/i })).toBeInTheDocument()
  })

  it('shows matching suggestions by name and by comuna', async () => {
    const user = userEvent.setup()
    render(<StationSearch />)

    await user.type(screen.getByRole('combobox'), 'santiago') // matches Las Condes via city
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveTextContent('Las Condes')
    expect(options[0]).toHaveTextContent('Santiago')
  })

  it('selecting a suggestion asks the map to fly there and fills the input', async () => {
    const user = userEvent.setup()
    render(<StationSearch />)

    await user.type(screen.getByRole('combobox'), 'tocopi')
    await user.click(screen.getByRole('option', { name: /tocopilla/i }))

    expect(useFiltersStore.getState().flyToTarget).toEqual({
      lat: tocopilla.latitude,
      lng: tocopilla.longitude,
      stationId: tocopilla.id,
    })
    expect(useFiltersStore.getState().searchTerm).toBe('Tocopilla')
  })

  it('shows an empty state in Spanish when nothing matches', async () => {
    const user = userEvent.setup()
    render(<StationSearch />)

    await user.type(screen.getByRole('combobox'), 'inexistente')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByRole('status')).toHaveTextContent(/sin resultados/i)
  })

  it('supports keyboard selection (ArrowDown + Enter)', async () => {
    const user = userEvent.setup()
    render(<StationSearch />)

    await user.type(screen.getByRole('combobox'), 'valpara')
    await user.keyboard('{ArrowDown}{Enter}')

    expect(useFiltersStore.getState().flyToTarget?.stationId).toBe(valparaiso.id)
  })
})
