import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MapController } from '@/components/map/MapController'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useFiltersStore } from '@/stores/filtersStore'

// Stub react-leaflet's useMap with a fake map exposing a flyTo spy.
const { flyTo } = vi.hoisted(() => ({ flyTo: vi.fn() }))
vi.mock('react-leaflet', () => ({
  useMap: () => ({ flyTo }),
}))

beforeEach(() => {
  flyTo.mockClear()
  useFiltersStore.getState().reset()
  useDashboardStore.getState().setSelectedStationId(null)
})

describe('MapController', () => {
  it('does nothing without a fly-to target', () => {
    render(<MapController />)
    expect(flyTo).not.toHaveBeenCalled()
  })

  it('flies to the target, opens its detail and consumes the request', () => {
    render(<MapController />)

    act(() => {
      useFiltersStore.getState().requestFlyTo({ lat: -33.4, lng: -70.6, stationId: 7 })
    })

    expect(flyTo).toHaveBeenCalledWith([-33.4, -70.6], expect.any(Number))
    expect(useDashboardStore.getState().selectedStationId).toBe(7)
    expect(useFiltersStore.getState().flyToTarget).toBeNull() // consumed
  })

  it('flies to a coordinate without selecting a station (stationId null)', () => {
    render(<MapController />)

    act(() => {
      useFiltersStore.getState().requestFlyTo({ lat: -33, lng: -71, stationId: null })
    })

    expect(flyTo).toHaveBeenCalledWith([-33, -71], expect.any(Number))
    expect(useDashboardStore.getState().selectedStationId).toBeNull()
    expect(useFiltersStore.getState().flyToTarget).toBeNull()
  })
})
