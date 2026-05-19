import { beforeEach, describe, expect, it } from 'vitest'

import { useDashboardStore } from '@/stores/dashboardStore'
import type { Reading, StationWithLatest } from '@/types/domain'

function mkStation(id: number, latest: StationWithLatest['latest'] = null): StationWithLatest {
  return {
    id,
    name: `Estación ${id}`,
    latitude: -33,
    longitude: -70,
    country_code: 'CL',
    city: null,
    created_at: '2026-01-01T00:00:00Z',
    latest,
  }
}

function mkReading(overrides: Partial<Reading> = {}): Reading {
  return {
    id: 1,
    station_id: 1,
    measured_at: '2026-05-19T12:00:00Z',
    pm25: 10,
    pm10: 30,
    o3: 50,
    inserted_at: '2026-05-19T12:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  useDashboardStore.setState({ selectedStationId: null, stationsById: {}, range: '24h' })
})

describe('dashboardStore', () => {
  it('starts empty', () => {
    const s = useDashboardStore.getState()
    expect(s.selectedStationId).toBeNull()
    expect(s.stationsById).toEqual({})
  })

  it('setStations indexes stations by id', () => {
    useDashboardStore.getState().setStations([mkStation(1), mkStation(2)])
    const state = useDashboardStore.getState()
    expect(Object.keys(state.stationsById)).toEqual(['1', '2'])
    expect(state.stationsById[1]?.name).toBe('Estación 1')
  })

  it('setStations replaces any previous snapshot', () => {
    useDashboardStore.getState().setStations([mkStation(1), mkStation(2)])
    useDashboardStore.getState().setStations([mkStation(3)])
    expect(Object.keys(useDashboardStore.getState().stationsById)).toEqual(['3'])
  })

  it('applyNewReading updates latest when reading is newer', () => {
    useDashboardStore.getState().setStations([
      mkStation(1, {
        measured_at: '2026-05-19T10:00:00Z',
        pm25: 5,
        pm10: 10,
        o3: 20,
      }),
    ])
    useDashboardStore
      .getState()
      .applyNewReading(mkReading({ station_id: 1, pm25: 22, measured_at: '2026-05-19T12:00:00Z' }))
    const latest = useDashboardStore.getState().stationsById[1]?.latest
    expect(latest?.pm25).toBe(22)
    expect(latest?.measured_at).toBe('2026-05-19T12:00:00Z')
  })

  it('applyNewReading ignores older readings', () => {
    useDashboardStore.getState().setStations([
      mkStation(1, {
        measured_at: '2026-05-19T12:00:00Z',
        pm25: 5,
        pm10: 10,
        o3: 20,
      }),
    ])
    useDashboardStore
      .getState()
      .applyNewReading(mkReading({ station_id: 1, pm25: 999, measured_at: '2026-05-19T10:00:00Z' }))
    expect(useDashboardStore.getState().stationsById[1]?.latest?.pm25).toBe(5)
  })

  it('applyNewReading no-ops for an unknown station', () => {
    useDashboardStore.getState().setStations([mkStation(1)])
    useDashboardStore.getState().applyNewReading(mkReading({ station_id: 999 }))
    expect(useDashboardStore.getState().stationsById[999]).toBeUndefined()
  })

  it('applyNewReading accepts the first reading when latest was null', () => {
    useDashboardStore.getState().setStations([mkStation(1, null)])
    useDashboardStore.getState().applyNewReading(mkReading({ station_id: 1, pm25: 42 }))
    expect(useDashboardStore.getState().stationsById[1]?.latest?.pm25).toBe(42)
  })

  it('setSelectedStationId stores and clears the selection', () => {
    useDashboardStore.getState().setSelectedStationId(42)
    expect(useDashboardStore.getState().selectedStationId).toBe(42)
    useDashboardStore.getState().setSelectedStationId(null)
    expect(useDashboardStore.getState().selectedStationId).toBeNull()
  })

  it('starts with the 24h time range by default', () => {
    expect(useDashboardStore.getState().range).toBe('24h')
  })

  it('setRange updates the active range', () => {
    useDashboardStore.getState().setRange('7d')
    expect(useDashboardStore.getState().range).toBe('7d')
    useDashboardStore.getState().setRange('6h')
    expect(useDashboardStore.getState().range).toBe('6h')
  })
})
