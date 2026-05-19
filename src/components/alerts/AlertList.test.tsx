import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  deleteResult: { error: null } as { error: { message: string } | null },
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  function makeBuilder() {
    let op: 'select' | 'insert' | 'delete' = 'select'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {}
    builder.select = () => {
      op = 'select'
      return builder
    }
    builder.insert = () => {
      op = 'insert'
      return builder
    }
    builder.delete = () => {
      op = 'delete'
      return builder
    }
    builder.eq = () => builder
    builder.order = () => builder
    builder.limit = () => builder
    builder.then = (resolve: (val: unknown) => void) => {
      if (op === 'delete') resolve(mocks.deleteResult)
      else resolve({ data: [], error: null })
    }
    return builder
  }
  return {
    supabase: {
      from: () => makeBuilder(),
    },
  }
})

vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError, info: vi.fn() },
}))

import { AlertList } from '@/components/alerts/AlertList'
import { useAlertStore, type AlertRow } from '@/stores/alertStore'
import { useAuthStore } from '@/stores/authStore'
import type { StationWithLatest } from '@/types/domain'

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

function mkAlert(overrides: Partial<AlertRow> = {}): AlertRow {
  return {
    id: 'a1',
    user_id: 'user-1',
    station_id: 1,
    pollutant: 'pm25',
    threshold: 35,
    direction: 'greater_than',
    is_armed: true,
    created_at: '2026-05-19T12:00:00Z',
    ...overrides,
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
  mocks.deleteResult = { error: null }
  mocks.toastSuccess.mockReset()
  mocks.toastError.mockReset()
})

describe('AlertList', () => {
  it('renders the empty state when there are no alerts', () => {
    render(<AlertList stationsById={{}} />)
    expect(screen.getByText('Aún no tienes alertas')).toBeInTheDocument()
  })

  it('renders each alert with its station, threshold and arm state', () => {
    useAlertStore.setState({
      alerts: [
        mkAlert({ id: 'a1', station_id: 1, is_armed: true, threshold: 35 }),
        mkAlert({ id: 'a2', station_id: 2, is_armed: false, threshold: 100, pollutant: 'o3' }),
      ],
      loadedForUserId: 'user-1',
    })
    render(
      <AlertList
        stationsById={{
          1: mkStation(1, 'Parque'),
          2: mkStation(2, 'Las Condes'),
        }}
      />,
    )
    expect(screen.getByText(/PM2\.5 > 35/)).toBeInTheDocument()
    expect(screen.getByText('Parque')).toBeInTheDocument()
    expect(screen.getByText('Armada')).toBeInTheDocument()
    expect(screen.getByText(/O₃ > 100/)).toBeInTheDocument()
    expect(screen.getByText('Las Condes')).toBeInTheDocument()
    expect(screen.getByText('Esperando re-arme')).toBeInTheDocument()
  })

  it('deletes the alert and shows a success toast on Trash click', async () => {
    const user = userEvent.setup()
    useAlertStore.setState({
      alerts: [mkAlert({ id: 'a1' })],
      loadedForUserId: 'user-1',
    })
    render(<AlertList stationsById={{ 1: mkStation(1, 'Parque') }} />)
    await user.click(screen.getByRole('button', { name: 'Eliminar alerta' }))
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('Alerta eliminada.'))
    expect(useAlertStore.getState().alerts).toEqual([])
  })
})
