import { render, screen, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {}
      builder.select = () => builder
      builder.update = () => builder
      builder.eq = () => builder
      builder.then = (resolve: (val: unknown) => void) => resolve({ error: null })
      return builder
    },
  },
}))

import { AlertHistory } from '@/components/alerts/AlertHistory'
import { useAlertStore, type AlertHistoryRow, type AlertRow } from '@/stores/alertStore'
import { useAuthStore } from '@/stores/authStore'
import type { StationWithLatest } from '@/types/domain'

function mkAlert(overrides: Partial<AlertRow> = {}): AlertRow {
  return {
    id: 'a1',
    user_id: 'user-1',
    station_id: 1,
    pollutant: 'pm25',
    threshold: 35,
    direction: 'greater_than',
    is_armed: false,
    created_at: '2026-05-19T12:00:00Z',
    ...overrides,
  }
}

function mkHistory(overrides: Partial<AlertHistoryRow> = {}): AlertHistoryRow {
  return {
    id: 'h1',
    alert_id: 'a1',
    user_id: 'user-1',
    reading_id: 1,
    triggered_value: 42,
    triggered_at: new Date(Date.now() - 60_000).toISOString(),
    seen: false,
    ...overrides,
  }
}

function mkStation(id: number, name: string): StationWithLatest {
  return {
    id,
    name,
    latitude: -33,
    longitude: -70,
    country_code: 'CL',
    city: null,
    created_at: '2026-01-01T00:00:00Z',
    latest: null,
  }
}

beforeEach(() => {
  useAuthStore.setState({
    status: 'authenticated',
    user: { id: 'user-1', email: 'a@b.com' } as User,
    session: null,
  })
  useAlertStore.setState({
    alerts: [],
    history: [],
    unseenCount: 0,
    loadedForUserId: 'user-1',
    isLoading: false,
    error: null,
  })
})

describe('AlertHistory', () => {
  it('renders the empty state when there is no history', () => {
    render(<AlertHistory stationsById={{}} />)
    expect(screen.getByText('Sin disparos todavía')).toBeInTheDocument()
  })

  it('renders each entry with station, pollutant value and threshold', () => {
    useAlertStore.setState({
      alerts: [mkAlert()],
      history: [mkHistory({ triggered_value: 42 })],
      unseenCount: 1,
    })
    render(<AlertHistory stationsById={{ 1: mkStation(1, 'Parque') }} />)
    expect(screen.getByText('Parque')).toBeInTheDocument()
    expect(screen.getByText(/PM2\.5 llegó a 42 µg\/m³.*> 35/)).toBeInTheDocument()
  })

  it('marks all entries as seen on mount when there are unseen ones', async () => {
    useAlertStore.setState({
      alerts: [mkAlert()],
      history: [mkHistory()],
      unseenCount: 1,
    })
    render(<AlertHistory stationsById={{ 1: mkStation(1, 'Parque') }} />)
    await waitFor(() => expect(useAlertStore.getState().unseenCount).toBe(0))
  })
})
