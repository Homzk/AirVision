import { beforeEach, describe, expect, it } from 'vitest'

import { useFiltersStore } from '@/stores/filtersStore'

beforeEach(() => {
  useFiltersStore.getState().reset()
})

describe('filtersStore', () => {
  it('starts with sensible defaults', () => {
    const s = useFiltersStore.getState()
    expect(s.searchTerm).toBe('')
    expect(s.showNoData).toBe(false)
    expect(s.selectedLevels).toEqual([])
    expect(s.nearMe).toEqual({ active: false, coords: null })
    expect(s.flyToTarget).toBeNull()
  })

  it('setSearchTerm stores the term', () => {
    useFiltersStore.getState().setSearchTerm('tocopilla')
    expect(useFiltersStore.getState().searchTerm).toBe('tocopilla')
  })

  it('setShowNoData toggles back to the initial value', () => {
    useFiltersStore.getState().setShowNoData(true)
    expect(useFiltersStore.getState().showNoData).toBe(true)
    useFiltersStore.getState().setShowNoData(false)
    expect(useFiltersStore.getState().showNoData).toBe(false)
  })

  it('toggleLevel adds then removes a level; clearLevels empties', () => {
    const { toggleLevel } = useFiltersStore.getState()
    toggleLevel('unhealthy')
    expect(useFiltersStore.getState().selectedLevels).toEqual(['unhealthy'])
    toggleLevel('hazardous')
    expect(useFiltersStore.getState().selectedLevels).toEqual(['unhealthy', 'hazardous'])
    toggleLevel('unhealthy')
    expect(useFiltersStore.getState().selectedLevels).toEqual(['hazardous'])
    useFiltersStore.getState().clearLevels()
    expect(useFiltersStore.getState().selectedLevels).toEqual([])
  })

  it('setNearMe activates with coords; clearNearMe resets', () => {
    useFiltersStore.getState().setNearMe({ lat: -33.45, lng: -70.66 })
    expect(useFiltersStore.getState().nearMe).toEqual({
      active: true,
      coords: { lat: -33.45, lng: -70.66 },
    })
    useFiltersStore.getState().clearNearMe()
    expect(useFiltersStore.getState().nearMe).toEqual({ active: false, coords: null })
  })

  it('requestFlyTo sets a target; consumeFlyTo clears it (single shot)', () => {
    useFiltersStore.getState().requestFlyTo({ lat: -22.09, lng: -70.2, stationId: 1 })
    expect(useFiltersStore.getState().flyToTarget).toEqual({
      lat: -22.09,
      lng: -70.2,
      stationId: 1,
    })
    useFiltersStore.getState().consumeFlyTo()
    expect(useFiltersStore.getState().flyToTarget).toBeNull()
  })

  it('reset restores all defaults', () => {
    const s = useFiltersStore.getState()
    s.setSearchTerm('x')
    s.setShowNoData(true)
    s.toggleLevel('good')
    s.setNearMe({ lat: 1, lng: 2 })
    s.requestFlyTo({ lat: 1, lng: 2, stationId: 9 })

    useFiltersStore.getState().reset()

    const after = useFiltersStore.getState()
    expect(after.searchTerm).toBe('')
    expect(after.showNoData).toBe(false)
    expect(after.selectedLevels).toEqual([])
    expect(after.nearMe).toEqual({ active: false, coords: null })
    expect(after.flyToTarget).toBeNull()
  })
})
