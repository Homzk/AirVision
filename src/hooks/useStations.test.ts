import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

interface MockData {
  stationsData: unknown[]
  stationsError: { message: string } | null
  latestData: unknown[]
  latestError: { message: string } | null
}

const mocks = vi.hoisted<MockData>(() => ({
  stationsData: [],
  stationsError: null,
  latestData: [],
  latestError: null,
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => {
        if (table === 'stations') {
          return Promise.resolve({ data: mocks.stationsData, error: mocks.stationsError })
        }
        return Promise.resolve({ data: mocks.latestData, error: mocks.latestError })
      },
    }),
  },
}))

import { useStations } from '@/hooks/useStations'

beforeEach(() => {
  mocks.stationsData = []
  mocks.stationsError = null
  mocks.latestData = []
  mocks.latestError = null
})

describe('useStations', () => {
  it('returns an empty list when the DB has no stations', async () => {
    const { result } = renderHook(() => useStations())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.stations).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('merges latest readings into the corresponding stations', async () => {
    mocks.stationsData = [
      {
        id: 1,
        name: 'A',
        latitude: -33,
        longitude: -70,
        country_code: 'CL',
        city: 'Santiago',
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 2,
        name: 'B',
        latitude: -36,
        longitude: -73,
        country_code: 'CL',
        city: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    ]
    mocks.latestData = [
      { station_id: 1, measured_at: '2026-05-19T12:00:00Z', pm25: 22, pm10: 50, o3: 60 },
    ]

    const { result } = renderHook(() => useStations())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.stations).toHaveLength(2)
    expect(result.current.stations[0]?.id).toBe(1)
    expect(result.current.stations[0]?.latest?.pm25).toBe(22)
    expect(result.current.stations[1]?.id).toBe(2)
    expect(result.current.stations[1]?.latest).toBeNull()
  })

  it('treats a latest row with null measured_at as no reading', async () => {
    mocks.stationsData = [
      {
        id: 1,
        name: 'A',
        latitude: -33,
        longitude: -70,
        country_code: 'CL',
        city: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    ]
    mocks.latestData = [{ station_id: 1, measured_at: null, pm25: null, pm10: null, o3: null }]
    const { result } = renderHook(() => useStations())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.stations[0]?.latest).toBeNull()
  })

  it('surfaces an error from the stations query', async () => {
    mocks.stationsError = { message: 'permission denied for table stations' }
    const { result } = renderHook(() => useStations())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error?.message).toBe('permission denied for table stations')
    expect(result.current.stations).toEqual([])
  })

  it('surfaces an error from the latest readings query', async () => {
    mocks.latestError = { message: 'view unavailable' }
    const { result } = renderHook(() => useStations())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error?.message).toBe('view unavailable')
  })

  it('refresh re-runs both queries and updates state', async () => {
    mocks.stationsData = [
      {
        id: 1,
        name: 'A',
        latitude: -33,
        longitude: -70,
        country_code: 'CL',
        city: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    ]
    const { result } = renderHook(() => useStations())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.stations).toHaveLength(1)

    mocks.stationsData = []
    await result.current.refresh()
    await waitFor(() => expect(result.current.stations).toEqual([]))
  })
})
