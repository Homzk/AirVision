import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StationClusterLayer } from '@/components/map/StationClusterLayer'
import { useDashboardStore } from '@/stores/dashboardStore'
import type { StationWithLatest } from '@/types/domain'

// Fake Leaflet map covering Chile at a low zoom, so nearby points cluster.
const fakeMap = {
  getZoom: () => 4,
  getBounds: () => ({
    getWest: () => -76,
    getSouth: () => -56,
    getEast: () => -66,
    getNorth: () => -17,
  }),
  flyTo: vi.fn(),
}

vi.mock('react-leaflet', () => ({
  useMap: () => fakeMap,
  useMapEvents: () => null,
  Marker: () => <div data-testid="cluster-marker" />,
  Popup: () => null,
}))

vi.mock('@/components/map/StationMarker', () => ({
  StationMarker: () => <div data-testid="leaf-marker" />,
}))

function makeStation(id: number, lat: number, lng: number): StationWithLatest {
  return {
    id,
    name: `Station ${id}`,
    city: null,
    latitude: lat,
    longitude: lng,
    country_code: 'CL',
    created_at: '2026-01-01T00:00:00Z',
    latest: { measured_at: '2026-06-02T12:00:00Z', pm25: 10, pm10: null, o3: null },
  }
}

beforeEach(() => {
  useDashboardStore.getState().setSelectedStationId(null)
})

describe('StationClusterLayer', () => {
  it('groups nearby stations into a cluster badge and leaves the far one individual', () => {
    const stations = [
      makeStation(1, -33.4, -70.6), // Santiago
      makeStation(2, -33.41, -70.61), // Santiago (near #1)
      makeStation(3, -41.47, -72.94), // Puerto Montt (far south)
    ]
    render(<StationClusterLayer stations={stations} />)

    // The two Santiago points cluster; Puerto Montt stays a leaf.
    expect(screen.getAllByTestId('cluster-marker').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByTestId('leaf-marker').length).toBeGreaterThanOrEqual(1)
  })
})
