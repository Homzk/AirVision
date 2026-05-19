import { act, renderHook, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

interface MockState {
  alertsData: unknown[]
  historyData: unknown[]
  onInsert: ((payload: { new: unknown }) => void) | null
  channelName: string | null
  channelFilter: string | undefined
  removeChannel: ReturnType<typeof vi.fn>
}

const mocks = vi.hoisted<MockState>(() => ({
  alertsData: [],
  historyData: [],
  onInsert: null,
  channelName: null,
  channelFilter: undefined,
  removeChannel: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  function makeBuilder(table: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {}
    builder.select = () => builder
    builder.eq = () => builder
    builder.order = () => builder
    builder.limit = () => builder
    builder.then = (resolve: (val: unknown) => void) => {
      if (table === 'alerts') resolve({ data: mocks.alertsData, error: null })
      else resolve({ data: mocks.historyData, error: null })
    }
    return builder
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
      from: (table: string) => makeBuilder(table),
      channel: (name: string) => {
        mocks.channelName = name
        return channel
      },
      removeChannel: mocks.removeChannel,
    },
  }
})

const toastMocks = vi.hoisted(() => ({
  info: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { info: toastMocks.info, success: toastMocks.success, error: toastMocks.error },
}))

import { useAlertHistory } from '@/hooks/useAlertHistory'
import { useAlertStore } from '@/stores/alertStore'
import { useAuthStore } from '@/stores/authStore'
import { useDashboardStore } from '@/stores/dashboardStore'

function setAuthenticated(userId = 'user-1') {
  useAuthStore.setState({
    status: 'authenticated',
    user: { id: userId, email: 'a@b.com' } as User,
    session: null,
  })
}

beforeEach(() => {
  useAuthStore.setState({ status: 'anonymous', user: null, session: null })
  useAlertStore.setState({
    alerts: [],
    history: [],
    unseenCount: 0,
    loadedForUserId: null,
    isLoading: false,
    error: null,
  })
  useDashboardStore.setState({ selectedStationId: null, stationsById: {}, range: '24h' })
  mocks.alertsData = []
  mocks.historyData = []
  mocks.onInsert = null
  mocks.channelName = null
  mocks.channelFilter = undefined
  mocks.removeChannel.mockClear()
  toastMocks.info.mockReset()
})

describe('useAlertHistory', () => {
  it('does nothing when the user is anonymous', async () => {
    renderHook(() => useAlertHistory())
    await waitFor(() => expect(useAlertStore.getState().loadedForUserId).toBeNull())
    expect(mocks.channelName).toBeNull()
  })

  it('opens a user-scoped channel and triggers load on authentication', async () => {
    setAuthenticated()
    renderHook(() => useAlertHistory())
    await waitFor(() => expect(useAlertStore.getState().loadedForUserId).toBe('user-1'))
    expect(mocks.channelName).toBe('alert_history:user:user-1')
    expect(mocks.channelFilter).toBe('user_id=eq.user-1')
  })

  it('toasts and applies the new row on realtime INSERT', async () => {
    mocks.alertsData = [
      {
        id: 'a1',
        user_id: 'user-1',
        station_id: 1,
        pollutant: 'pm25',
        threshold: 35,
        direction: 'greater_than',
        is_armed: false,
      },
    ]
    useDashboardStore.setState({
      stationsById: {
        1: {
          id: 1,
          name: "Parque O'Higgins",
          latitude: -33,
          longitude: -70,
          country_code: 'CL',
          city: 'Santiago',
          created_at: '2026-01-01T00:00:00Z',
          latest: null,
        },
      },
    })
    setAuthenticated()
    renderHook(() => useAlertHistory())
    await waitFor(() => expect(mocks.onInsert).toBeTypeOf('function'))

    act(() =>
      mocks.onInsert?.({
        new: {
          id: 'h-new',
          alert_id: 'a1',
          user_id: 'user-1',
          reading_id: 99,
          triggered_value: 42,
          triggered_at: '2026-05-19T12:00:00Z',
          seen: false,
        },
      }),
    )

    expect(useAlertStore.getState().history).toHaveLength(1)
    expect(useAlertStore.getState().unseenCount).toBe(1)
    expect(toastMocks.info).toHaveBeenCalledWith(
      expect.stringMatching(/Parque O'Higgins.*PM2\.5.*42 µg\/m³/),
    )
  })

  it('emits a generic toast when the matching alert is unknown', async () => {
    setAuthenticated()
    renderHook(() => useAlertHistory())
    await waitFor(() => expect(mocks.onInsert).toBeTypeOf('function'))

    act(() =>
      mocks.onInsert?.({
        new: {
          id: 'h-new',
          alert_id: 'unknown-id',
          user_id: 'user-1',
          reading_id: 99,
          triggered_value: 88,
          triggered_at: '2026-05-19T12:00:00Z',
          seen: false,
        },
      }),
    )

    expect(toastMocks.info).toHaveBeenCalledWith(expect.stringMatching(/se disparó.*88/))
  })

  it('removes the channel on unmount', async () => {
    setAuthenticated()
    const { unmount } = renderHook(() => useAlertHistory())
    await waitFor(() => expect(mocks.channelName).toBe('alert_history:user:user-1'))
    unmount()
    expect(mocks.removeChannel).toHaveBeenCalled()
  })
})
