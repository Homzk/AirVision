import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  onCb: null as ((payload: { new: unknown }) => void) | null,
  subscribeCb: null as ((status: string) => void) | null,
  channelFn: vi.fn(),
  removeChannelFn: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  const channel: Record<string, unknown> = {}
  channel.on = vi.fn(
    (_event: string, _config: unknown, cb: (payload: { new: unknown }) => void) => {
      mocks.onCb = cb
      return channel
    },
  )
  channel.subscribe = vi.fn((cb: (status: string) => void) => {
    mocks.subscribeCb = cb
    return channel
  })
  mocks.channelFn.mockReturnValue(channel)
  return {
    supabase: {
      channel: mocks.channelFn,
      removeChannel: mocks.removeChannelFn,
    },
  }
})

import { useReadingsRealtime } from '@/hooks/useReadingsRealtime'

beforeEach(() => {
  mocks.channelFn.mockClear()
  mocks.removeChannelFn.mockClear()
  mocks.onCb = null
  mocks.subscribeCb = null
})

describe('useReadingsRealtime', () => {
  it('opens the readings:inserts channel on mount', () => {
    renderHook(() => useReadingsRealtime(() => {}))
    expect(mocks.channelFn).toHaveBeenCalledWith('readings:inserts')
  })

  it('removes the channel on unmount', () => {
    const { unmount } = renderHook(() => useReadingsRealtime(() => {}))
    unmount()
    expect(mocks.removeChannelFn).toHaveBeenCalledTimes(1)
  })

  it('invokes the callback with payload.new', () => {
    const cb = vi.fn()
    renderHook(() => useReadingsRealtime(cb))
    expect(mocks.onCb).toBeTypeOf('function')
    const reading = {
      id: 1,
      station_id: 2,
      measured_at: '2026-05-19T12:00:00Z',
      pm25: null,
      pm10: null,
      o3: 50,
      inserted_at: '2026-05-19T12:00:00Z',
    }
    mocks.onCb?.({ new: reading })
    expect(cb).toHaveBeenCalledWith(reading)
  })

  it('keeps the same channel even if the callback identity changes', () => {
    const { rerender } = renderHook(({ cb }: { cb: () => void }) => useReadingsRealtime(cb), {
      initialProps: { cb: vi.fn() },
    })
    rerender({ cb: vi.fn() })
    expect(mocks.channelFn).toHaveBeenCalledTimes(1)
  })

  it('starts in CONNECTING and transitions to CONNECTED on SUBSCRIBED', () => {
    const { result } = renderHook(() => useReadingsRealtime(() => {}))
    expect(result.current.status).toBe('CONNECTING')
    act(() => mocks.subscribeCb?.('SUBSCRIBED'))
    expect(result.current.status).toBe('CONNECTED')
  })

  it('maps CHANNEL_ERROR / TIMED_OUT / CLOSED to DISCONNECTED', () => {
    const { result } = renderHook(() => useReadingsRealtime(() => {}))
    act(() => mocks.subscribeCb?.('CHANNEL_ERROR'))
    expect(result.current.status).toBe('DISCONNECTED')
    act(() => mocks.subscribeCb?.('TIMED_OUT'))
    expect(result.current.status).toBe('DISCONNECTED')
    act(() => mocks.subscribeCb?.('CLOSED'))
    expect(result.current.status).toBe('DISCONNECTED')
  })

  it('falls back to CONNECTING for unrecognized status codes', () => {
    const { result } = renderHook(() => useReadingsRealtime(() => {}))
    act(() => mocks.subscribeCb?.('SUBSCRIBED'))
    expect(result.current.status).toBe('CONNECTED')
    act(() => mocks.subscribeCb?.('JOINING'))
    expect(result.current.status).toBe('CONNECTING')
  })
})
