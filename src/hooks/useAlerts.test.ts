import { renderHook, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

interface MockState {
  alertsData: unknown[]
  alertsError: { message: string } | null
  historyData: unknown[]
  historyError: { message: string } | null
  insertResult: { data: unknown; error: { message: string; code?: string } | null }
  deleteResult: { error: { message: string } | null }
  capturedInsert: { user_id: string; station_id: number } | null
}

const mocks = vi.hoisted<MockState>(() => ({
  alertsData: [],
  alertsError: null,
  historyData: [],
  historyError: null,
  insertResult: { data: null, error: null },
  deleteResult: { error: null },
  capturedInsert: null,
}))

vi.mock('@/lib/supabase', () => {
  function makeBuilder(table: string) {
    let op: 'select' | 'insert' | 'delete' | 'update' = 'select'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {}
    builder.select = () => {
      op = 'select'
      return builder
    }
    builder.insert = (payload: unknown) => {
      op = 'insert'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mocks.capturedInsert = payload as any
      return builder
    }
    builder.update = () => {
      op = 'update'
      return builder
    }
    builder.delete = () => {
      op = 'delete'
      return builder
    }
    builder.eq = () => builder
    builder.order = () => builder
    builder.limit = () => builder
    builder.single = () => Promise.resolve(mocks.insertResult)
    builder.then = (resolve: (val: unknown) => void) => {
      if (op === 'delete') resolve(mocks.deleteResult)
      else if (op === 'update') resolve({ error: null })
      else if (table === 'alerts') resolve({ data: mocks.alertsData, error: mocks.alertsError })
      else resolve({ data: mocks.historyData, error: mocks.historyError })
    }
    return builder
  }
  return {
    supabase: {
      from: (table: string) => makeBuilder(table),
    },
  }
})

import { useAlerts } from '@/hooks/useAlerts'
import { useAlertStore } from '@/stores/alertStore'
import { useAuthStore } from '@/stores/authStore'

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
  mocks.alertsData = []
  mocks.alertsError = null
  mocks.historyData = []
  mocks.historyError = null
  mocks.insertResult = { data: null, error: null }
  mocks.deleteResult = { error: null }
  mocks.capturedInsert = null
})

describe('useAlerts', () => {
  it('stays empty when the user is anonymous', async () => {
    const { result } = renderHook(() => useAlerts())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.alerts).toEqual([])
    expect(result.current.canCreateMore).toBe(true)
  })

  it('loads alerts on auth and reflects them in the result', async () => {
    mocks.alertsData = [
      {
        id: 'a1',
        station_id: 1,
        pollutant: 'pm25',
        threshold: 35,
        direction: 'greater_than',
        is_armed: true,
      },
      {
        id: 'a2',
        station_id: 2,
        pollutant: 'pm10',
        threshold: 75,
        direction: 'greater_than',
        is_armed: false,
      },
    ]
    setAuthenticated()
    const { result } = renderHook(() => useAlerts())
    await waitFor(() => expect(result.current.alerts).toHaveLength(2))
    expect(result.current.alerts[0]?.id).toBe('a1')
  })

  it('createAlert inserts and stores the new alert', async () => {
    setAuthenticated()
    mocks.insertResult = {
      data: {
        id: 'new-1',
        station_id: 1,
        pollutant: 'pm25',
        threshold: 35,
        direction: 'greater_than',
        is_armed: true,
      },
      error: null,
    }
    const { result } = renderHook(() => useAlerts())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const res = await result.current.createAlert({
      station_id: 1,
      pollutant: 'pm25',
      threshold: 35,
      direction: 'greater_than',
    })
    expect(res.error).toBeNull()
    expect(mocks.capturedInsert).toMatchObject({ user_id: 'user-1', station_id: 1 })
    expect(useAlertStore.getState().alerts).toHaveLength(1)
  })

  it('createAlert refuses locally when the user already has 5 alerts', async () => {
    setAuthenticated()
    useAlertStore.setState({
      alerts: Array.from({ length: 5 }, (_, i) => ({ id: `a${i}` })) as ReturnType<
        typeof useAlertStore.getState
      >['alerts'],
      loadedForUserId: 'user-1',
    })
    const { result } = renderHook(() => useAlerts())
    await waitFor(() => expect(result.current.canCreateMore).toBe(false))

    const res = await result.current.createAlert({
      station_id: 1,
      pollutant: 'pm25',
      threshold: 35,
      direction: 'greater_than',
    })
    expect(res.error).toMatch(/Máximo 5 alertas/i)
    expect(mocks.capturedInsert).toBeNull()
  })

  it('createAlert maps a trigger-limit backend error to Spanish', async () => {
    setAuthenticated()
    mocks.insertResult = {
      data: null,
      error: { message: 'Máximo 5 alertas por usuario', code: '23514' },
    }
    const { result } = renderHook(() => useAlerts())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const res = await result.current.createAlert({
      station_id: 1,
      pollutant: 'pm25',
      threshold: 35,
      direction: 'greater_than',
    })
    expect(res.error).toMatch(/Máximo 5 alertas/i)
  })

  it('deleteAlert removes the alert from the store', async () => {
    setAuthenticated()
    useAlertStore.setState({
      alerts: [
        { id: 'a1' } as ReturnType<typeof useAlertStore.getState>['alerts'][number],
        { id: 'a2' } as ReturnType<typeof useAlertStore.getState>['alerts'][number],
      ],
      loadedForUserId: 'user-1',
    })
    const { result } = renderHook(() => useAlerts())
    await waitFor(() => expect(result.current.alerts).toHaveLength(2))

    const res = await result.current.deleteAlert('a1')
    expect(res.error).toBeNull()
    expect(useAlertStore.getState().alerts.map((a) => a.id)).toEqual(['a2'])
  })

  it('resets the store on sign-out', async () => {
    mocks.alertsData = [{ id: 'a1' }]
    setAuthenticated()
    const { result, rerender } = renderHook(() => useAlerts())
    await waitFor(() => expect(result.current.alerts).toHaveLength(1))

    useAuthStore.setState({ status: 'anonymous', user: null, session: null })
    rerender()
    await waitFor(() => expect(result.current.alerts).toEqual([]))
  })
})
