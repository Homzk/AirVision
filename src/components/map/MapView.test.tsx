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

// The cluster layer renders Leaflet markers; stub it to one element per station.
vi.mock('@/components/map/StationClusterLayer', () => ({
  StationClusterLayer: ({ stations }: { stations: StationWithLatest[] }) => (
    <>
      {stations.map((s) => (
        <div key={s.id} data-testid="marker">
          {s.name}
        </div>
      ))}
    </>
  ),
}))

// Avoid opening a real Supabase realtime channel in the test.
vi.mock('@/hooks/useReadingsRealtime', () => ({
  useReadingsRealtime: () => ({ status: 'CONNECTED' }),
}))

function makeStation(
  id: number,
  name: string,
  lat: number,
  lng: number,
  withData: boolean,
): StationWithLatest {
  return {
    id,
    name,
    city: name,
    latitude: lat,
    longitude: lng,
    country_code: 'CL',
    created_at: '2026-01-01T00:00:00Z',
    latest: withData
      ? { measured_at: '2026-06-02T12:00:00Z', pm25: 10, pm10: null, o3: null }
      : null,
  }
}

const stations = [
  makeStation(1, 'Tocopilla', -22.09, -70.2, true),
  makeStation(2, 'Las Condes', -33.41, -70.57, true),
  makeStation(3, 'Puerto Montt', -41.47, -72.94, false), // sin datos recientes
]

beforeEach(() => {
  useFiltersStore.getState().reset()
  useDashboardStore.getState().setStations([])
  useDashboardStore.getState().setSelectedStationId(null)
})

describe('MapView', () => {
  it('renders the search combobox and hides no-data stations by default', async () => {
    render(<MapView stations={stations} />)

    expect(screen.getByRole('combobox', { name: /buscar estación o comuna/i })).toBeInTheDocument()
    // Default showNoData=false: only the two stations with data render.
    expect(await screen.findAllByTestId('marker')).toHaveLength(2)
    expect(screen.queryByText('Puerto Montt')).not.toBeInTheDocument()
  })

  it('reveals no-data stations when showNoData is enabled', async () => {
    useFiltersStore.getState().setShowNoData(true)
    render(<MapView stations={stations} />)

    expect(await screen.findAllByTestId('marker')).toHaveLength(3)
    expect(screen.getByText('Puerto Montt')).toBeInTheDocument()
  })
})
