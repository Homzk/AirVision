import { create } from 'zustand'

import type { Reading, StationWithLatest } from '@/types/domain'

interface DashboardState {
  selectedStationId: number | null
  stationsById: Record<number, StationWithLatest>
  setStations: (stations: StationWithLatest[]) => void
  applyNewReading: (reading: Reading) => void
  setSelectedStationId: (id: number | null) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedStationId: null,
  stationsById: {},

  setStations: (stations) =>
    set(() => ({
      stationsById: Object.fromEntries(stations.map((s) => [s.id, s])),
    })),

  applyNewReading: (reading) =>
    set((state) => {
      const station = state.stationsById[reading.station_id]
      if (!station) return state
      const currentLatestAt = station.latest?.measured_at
      if (currentLatestAt && new Date(reading.measured_at) <= new Date(currentLatestAt)) {
        return state
      }
      return {
        stationsById: {
          ...state.stationsById,
          [reading.station_id]: {
            ...station,
            latest: {
              measured_at: reading.measured_at,
              pm25: reading.pm25,
              pm10: reading.pm10,
              o3: reading.o3,
            },
          },
        },
      }
    }),

  setSelectedStationId: (id) => set({ selectedStationId: id }),
}))
