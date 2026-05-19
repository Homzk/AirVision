import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('shows a "marcar como leídas" button only when there are unseen entries', () => {
    useAlertStore.setState({
      alerts: [mkAlert()],
      history: [mkHistory({ seen: true })],
      unseenCount: 0,
    })
    const { rerender } = render(<AlertHistory stationsById={{ 1: mkStation(1, 'Parque') }} />)
    expect(
      screen.queryByRole('button', { name: /marcar todas como leídas/i }),
    ).not.toBeInTheDocument()

    useAlertStore.setState({ history: [mkHistory({ seen: false })], unseenCount: 1 })
    rerender(<AlertHistory stationsById={{ 1: mkStation(1, 'Parque') }} />)
    expect(screen.getByRole('button', { name: /marcar todas como leídas/i })).toBeInTheDocument()
  })

  it('clears unseen count when the button is clicked', async () => {
    const user = userEvent.setup()
    useAlertStore.setState({
      alerts: [mkAlert()],
      history: [mkHistory({ seen: false })],
      unseenCount: 1,
    })
    render(<AlertHistory stationsById={{ 1: mkStation(1, 'Parque') }} />)
    await user.click(screen.getByRole('button', { name: /marcar todas como leídas/i }))
    await waitFor(() => expect(useAlertStore.getState().unseenCount).toBe(0))
  })

  it('shows an unread dot next to entries that are still unseen', () => {
    useAlertStore.setState({
      alerts: [mkAlert()],
      history: [mkHistory({ id: 'unread', seen: false }), mkHistory({ id: 'read', seen: true })],
      unseenCount: 1,
    })
    render(<AlertHistory stationsById={{ 1: mkStation(1, 'Parque') }} />)
    expect(screen.getByLabelText('No leída')).toBeInTheDocument()
    expect(screen.getAllByLabelText('No leída')).toHaveLength(1)
  })
})
