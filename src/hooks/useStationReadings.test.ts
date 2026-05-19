import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

interface MockState {
  data: unknown[]
  error: { message: string } | null
  onInsert: ((payload: { new: unknown }) => void) | null
  channelName: string | null
  channelFilter: string | undefined
  removeChannel: ReturnType<typeof vi.fn>
}

const mocks = vi.hoisted<MockState>(() => ({
  data: [],
  error: null,
  onInsert: null,
  channelName: null,
  channelFilter: undefined,
  removeChannel: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const builder = {
    select: () => builder,
    eq: () => builder,
    gte: () => builder,
    order: () => Promise.resolve({ data: mocks.data, error: mocks.error }),
  }
  const channel = {
    on: (_event: string, config: { filter?: string }, cb: (payload: { new: unknown }) => void) => {
      mocks.onInsert = cb
      mocks.channelFilter = config.filter
      return channel
    },
    subscribe: () => channel,
  }
  return {
    supabase: {
      from: () => builder,
      channel: (name: string) => {
        mocks.channelName = name
        return channel
      },
      removeChannel: mocks.removeChannel,
    },
  }
})

import { useStationReadings } from '@/hooks/useStationReadings'

beforeEach(() => {
  mocks.data = []
  mocks.error = null
  mocks.onInsert = null
  mocks.channelName = null
  mocks.channelFilter = undefined
  mocks.removeChannel.mockClear()
})

describe('useStationReadings', () => {
  it('stays idle when stationId is null', async () => {
    const { result } = renderHook(() => useStationReadings(null, '24h'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.readings).toEqual([])
    expect(result.current.error).toBeNull()
    expect(mocks.channelName).toBeNull()
  })

  it('fetches readings and opens a station-scoped channel', async () => {
    mocks.data = [
      { measured_at: '2026-05-19T12:00:00Z', pm25: 12, pm10: 30, o3: 40 },
      { measured_at: '2026-05-19T13:00:00Z', pm25: 14, pm10: 32, o3: 45 },
    ]
    const { result } = renderHook(() => useStationReadings(7, '24h'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.readings).toHaveLength(2)
    expect(mocks.channelName).toBe('readings:station:7')
    expect(mocks.channelFilter).toBe('station_id=eq.7')
  })

  it('surfaces a query error', async () => {
    mocks.error = { message: 'permission denied' }
    const { result } = renderHook(() => useStationReadings(7, '24h'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error?.message).toBe('permission denied')
    expect(result.current.readings).toEqual([])
  })

  it('appends a realtime insert that falls within the range', async () => {
    mocks.data = []
    const { result } = renderHook(() => useStationReadings(7, '24h'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mocks.onInsert).toBeTypeOf('function')

    const nowIso = new Date().toISOString()
    act(() =>
      mocks.onInsert?.({
        new: {
          id: 100,
          station_id: 7,
          measured_at: nowIso,
          pm25: 21,
          pm10: 50,
          o3: 60,
          inserted_at: nowIso,
        },
      }),
    )

    await waitFor(() => expect(result.current.readings).toHaveLength(1))
    expect(result.current.readings[0]?.pm25).toBe(21)
  })

  it('ignores a realtime insert older than the range start', async () => {
    mocks.data = []
    const { result } = renderHook(() => useStationReadings(7, '6h'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() =>
      mocks.onInsert?.({
        new: {
          id: 100,
          station_id: 7,
          measured_at: '2000-01-01T00:00:00Z',
          pm25: 99,
          pm10: 99,
          o3: 99,
          inserted_at: '2000-01-01T00:00:00Z',
        },
      }),
    )

    expect(result.current.readings).toEqual([])
  })

  it('removes the channel on unmount', async () => {
    const { result, unmount } = renderHook(() => useStationReadings(7, '24h'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    unmount()
    expect(mocks.removeChannel).toHaveBeenCalledTimes(1)
  })

  it('re-fetches when range changes', async () => {
    mocks.data = [{ measured_at: '2026-05-19T12:00:00Z', pm25: 1, pm10: 2, o3: 3 }]
    const { result, rerender } = renderHook(
      ({ range }: { range: '6h' | '24h' | '7d' }) => useStationReadings(7, range),
      { initialProps: { range: '24h' } },
    )
    await waitFor(() => expect(result.current.readings).toHaveLength(1))

    mocks.data = []
    rerender({ range: '6h' })
    await waitFor(() => expect(result.current.readings).toEqual([]))
  })
})
