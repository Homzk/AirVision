import { create } from 'zustand'

import type { Level } from '@/lib/airQuality'
import type { Coords } from '@/lib/stationFilters'

/** Imperative target for the map to fly to (a searched station or the user). */
export interface FlyToTarget {
  lat: number
  lng: number
  stationId: number | null
}

interface FiltersState {
  searchTerm: string
  showNoData: boolean
  selectedLevels: Level[]
  nearMe: { active: boolean; coords: Coords | null }
  flyToTarget: FlyToTarget | null

  setSearchTerm: (term: string) => void
  setShowNoData: (show: boolean) => void
  toggleLevel: (level: Level) => void
  clearLevels: () => void
  setNearMe: (coords: Coords) => void
  clearNearMe: () => void
  requestFlyTo: (target: FlyToTarget) => void
  consumeFlyTo: () => void
  reset: () => void
}

/** Fresh default state. A factory (not a shared constant) so resets never reuse object references. */
function initialState() {
  return {
    searchTerm: '',
    showNoData: false,
    selectedLevels: [] as Level[],
    nearMe: { active: false, coords: null as Coords | null },
    flyToTarget: null as FlyToTarget | null,
  }
}

/**
 * Shared, ephemeral state for map discovery (search + filters + proximity).
 * Not persisted. The visible-station view is derived from this via
 * `applyFilters` in `src/lib/stationFilters.ts` — it is never stored here.
 */
export const useFiltersStore = create<FiltersState>((set) => ({
  ...initialState(),

  setSearchTerm: (term) => set({ searchTerm: term }),

  setShowNoData: (show) => set({ showNoData: show }),

  toggleLevel: (level) =>
    set((state) => ({
      selectedLevels: state.selectedLevels.includes(level)
        ? state.selectedLevels.filter((l) => l !== level)
        : [...state.selectedLevels, level],
    })),

  clearLevels: () => set({ selectedLevels: [] }),

  setNearMe: (coords) => set({ nearMe: { active: true, coords } }),

  clearNearMe: () => set({ nearMe: { active: false, coords: null } }),

  requestFlyTo: (target) => set({ flyToTarget: target }),

  consumeFlyTo: () => set({ flyToTarget: null }),

  reset: () => set(initialState()),
}))
