import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  insertResult: { data: null, error: null } as {
    data: unknown
    error: { message: string; code?: string } | null
  },
  capturedInsert: null as {
    user_id: string
    station_id: number
    pollutant: string
    threshold: number
    direction: string
  } | null,
  stationsData: [
    {
      id: 1,
      name: "Parque O'Higgins",
      latitude: -33,
      longitude: -70,
      country_code: 'CL',
      city: 'Santiago',
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Las Condes',
      latitude: -33,
      longitude: -70,
      country_code: 'CL',
      city: 'Santiago',
      created_at: '2026-01-01T00:00:00Z',
    },
  ] as Array<{
    id: number
    name: string
    latitude: number
    longitude: number
    country_code: string
    city: string | null
    created_at: string
  }>,
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/lib/supabase', () => {
  function makeBuilder(table: string) {
    let op: 'select' | 'insert' | 'delete' = 'select'
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
    builder.delete = () => {
      op = 'delete'
      return builder
    }
    builder.eq = () => builder
    builder.order = () => builder
    builder.limit = () => builder
    builder.single = () => Promise.resolve(mocks.insertResult)
    builder.then = (resolve: (val: unknown) => void) => {
      if (op === 'insert' || op === 'delete') resolve({ error: null })
      else if (table === 'stations') resolve({ data: mocks.stationsData, error: null })
      else resolve({ data: [], error: null })
    }
    return builder
  }
  return {
    supabase: {
      from: (table: string) => makeBuilder(table),
    },
  }
})

vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError, info: vi.fn() },
}))

import { AlertForm } from '@/components/alerts/AlertForm'
import { useAlertStore } from '@/stores/alertStore'
import { useAuthStore } from '@/stores/authStore'
import { useFavoritesStore } from '@/stores/favoritesStore'

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
  useFavoritesStore.setState({
    favorites: new Set([1]),
    loadedForUserId: 'user-1',
    isLoading: false,
    error: null,
  })
  mocks.insertResult = { data: null, error: null }
  mocks.capturedInsert = null
  mocks.toastSuccess.mockReset()
  mocks.toastError.mockReset()
})

describe('AlertForm', () => {
  it('renders all the form fields', async () => {
    render(<AlertForm onClose={() => {}} />)
    await waitFor(() => expect(screen.getByLabelText('Estación')).toBeInTheDocument())
    expect(screen.getByLabelText('Contaminante')).toBeInTheDocument()
    expect(screen.getByLabelText('Condición')).toBeInTheDocument()
    expect(screen.getByLabelText(/Umbral/)).toBeInTheDocument()
  })

  it('refuses to submit without a selected station', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<AlertForm onClose={onClose} />)
    await waitFor(() => expect(screen.getByLabelText('Estación')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /crear alerta/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/Selecciona una estación/i)
    expect(mocks.capturedInsert).toBeNull()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('creates the alert, toasts and closes on success', async () => {
    const user = userEvent.setup()
    mocks.insertResult = {
      data: {
        id: 'new',
        user_id: 'user-1',
        station_id: 1,
        pollutant: 'pm25',
        threshold: 35,
        direction: 'greater_than',
        is_armed: true,
      },
      error: null,
    }
    const onClose = vi.fn()
    render(<AlertForm onClose={onClose} />)
    await waitFor(() => expect(screen.getByLabelText('Estación')).toBeInTheDocument())
    await user.selectOptions(screen.getByLabelText('Estación'), '1')
    await user.click(screen.getByRole('button', { name: /crear alerta/i }))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(mocks.capturedInsert).toMatchObject({
      user_id: 'user-1',
      station_id: 1,
      pollutant: 'pm25',
      threshold: 35,
      direction: 'greater_than',
    })
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Alerta creada.')
  })

  it('shows the Spanish limit error when the backend trigger fires', async () => {
    const user = userEvent.setup()
    mocks.insertResult = {
      data: null,
      error: { message: 'Máximo 5 alertas por usuario', code: '23514' },
    }
    render(<AlertForm onClose={() => {}} />)
    await waitFor(() => expect(screen.getByLabelText('Estación')).toBeInTheDocument())
    await user.selectOptions(screen.getByLabelText('Estación'), '1')
    await user.click(screen.getByRole('button', { name: /crear alerta/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Máximo 5 alertas/i))
  })
})
