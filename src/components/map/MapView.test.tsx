import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MapView } from '@/components/map/MapView'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useFiltersStore } from '@/stores/filtersStore'
import type { StationWithLatest } from '@/types/domain'

// Leaflet needs a real DOM/layout; stub the primitives to plain passthroughs.
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Popup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useMap: () => ({ flyTo: vi.fn() }),
}))

// The marker renders a Leaflet vector; stub it to a simple counter element.
vi.mock('@/components/map/StationMarker', () => ({
  StationMarker: ({ station }: { station: StationWithLatest }) => (
    <div data-testid="marker">{station.name}</div>
  ),
}))

// Avoid opening a real Supabase realtime channel in the test.
vi.mock('@/hooks/useReadingsRealtime', () => ({
  useReadingsRealtime: () => ({ status: 'CONNECTED' }),
}))

function makeStation(id: number, name: string, lat: number, lng: number): StationWithLatest {
  return {
    id,
    name,
    city: name,
    latitude: lat,
    longitude: lng,
    country_code: 'CL',
    created_at: '2026-01-01T00:00:00Z',
    latest: null,
  }
}

const stations = [
  makeStation(1, 'Tocopilla', -22.09, -70.2),
  makeStation(2, 'Las Condes', -33.41, -70.57),
]

beforeEach(() => {
  useFiltersStore.getState().reset()
  useDashboardStore.getState().setStations([])
  useDashboardStore.getState().setSelectedStationId(null)
})

describe('MapView', () => {
  it('renders the search combobox and one marker per station', async () => {
    render(<MapView stations={stations} />)

    expect(screen.getByRole('combobox', { name: /buscar estación o comuna/i })).toBeInTheDocument()
    expect(await screen.findAllByTestId('marker')).toHaveLength(2)
  })
})
