import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({}),
      insert: () => ({}),
      delete: () => ({}),
      update: () => ({}),
      eq: () => ({}),
      order: () => ({}),
      limit: () => ({}),
    }),
  },
}))

import { mapCreateAlertError, useAlertStore, type AlertHistoryRow } from '@/stores/alertStore'

function mkHistoryRow(overrides: Partial<AlertHistoryRow> = {}): AlertHistoryRow {
  return {
    id: 'h-1',
    alert_id: 'a-1',
    user_id: 'user-1',
    reading_id: 1,
    triggered_value: 42,
    triggered_at: '2026-05-19T12:00:00Z',
    seen: false,
    ...overrides,
  }
}

beforeEach(() => {
  useAlertStore.setState({
    alerts: [],
    history: [],
    unseenCount: 0,
    loadedForUserId: null,
    isLoading: false,
    error: null,
  })
})

describe('alertStore', () => {
  it('starts empty', () => {
    const s = useAlertStore.getState()
    expect(s.alerts).toEqual([])
    expect(s.history).toEqual([])
    expect(s.unseenCount).toBe(0)
  })

  it('applyTriggerInsert prepends and increments unseen', () => {
    useAlertStore.getState().applyTriggerInsert(mkHistoryRow({ id: 'h-2' }))
    const s = useAlertStore.getState()
    expect(s.history).toHaveLength(1)
    expect(s.history[0]?.id).toBe('h-2')
    expect(s.unseenCount).toBe(1)
  })

  it('applyTriggerInsert does not increment unseen when row.seen=true', () => {
    useAlertStore.getState().applyTriggerInsert(mkHistoryRow({ seen: true }))
    expect(useAlertStore.getState().unseenCount).toBe(0)
  })

  it('applyTriggerInsert keeps at most 20 entries', () => {
    for (let i = 0; i < 25; i++) {
      useAlertStore.getState().applyTriggerInsert(mkHistoryRow({ id: `h-${i}` }))
    }
    expect(useAlertStore.getState().history).toHaveLength(20)
    expect(useAlertStore.getState().history[0]?.id).toBe('h-24')
  })

  it('reset clears all alert-related state', () => {
    useAlertStore.setState({
      alerts: [
        { id: 'a' } as unknown as ReturnType<typeof useAlertStore.getState>['alerts'][number],
      ],
      history: [mkHistoryRow()],
      unseenCount: 3,
      loadedForUserId: 'user-1',
      isLoading: true,
      error: new Error('boom'),
    })
    useAlertStore.getState().reset()
    expect(useAlertStore.getState()).toMatchObject({
      alerts: [],
      history: [],
      unseenCount: 0,
      loadedForUserId: null,
      isLoading: false,
      error: null,
    })
  })

  it('mapCreateAlertError maps trigger limit message to Spanish', () => {
    expect(mapCreateAlertError('Máximo 5 alertas por usuario')).toMatch(/Máximo 5 alertas/i)
    expect(mapCreateAlertError('something obscure')).toMatch(/Inténtalo de nuevo/i)
  })
})
