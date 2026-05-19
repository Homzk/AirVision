import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

interface MockState {
  insertResult: { error: { message: string; code?: string } | null }
  deleteResult: { error: { message: string } | null }
  capturedInsert: { user_id: string; station_id: number } | null
}

const mocks = vi.hoisted<MockState>(() => ({
  insertResult: { error: null },
  deleteResult: { error: null },
  capturedInsert: null,
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
    builder.insert = (payload: { user_id: string; station_id: number }) => {
      op = 'insert'
      mocks.capturedInsert = payload
      return builder
    }
    builder.delete = () => {
      op = 'delete'
      return builder
    }
    builder.eq = () => builder
    builder.order = () => builder
    builder.then = (resolve: (val: unknown) => void) => {
      if (op === 'insert') resolve(mocks.insertResult)
      else if (op === 'delete') resolve(mocks.deleteResult)
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

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { success: toastMocks.success, error: toastMocks.error, info: vi.fn() },
}))

import { FavoriteButton } from '@/components/favorites/FavoriteButton'
import { useAuthStore } from '@/stores/authStore'
import { useFavoritesStore } from '@/stores/favoritesStore'

function setAuthenticated() {
  useAuthStore.setState({
    status: 'authenticated',
    user: { id: 'user-1', email: 'a@b.com' } as User,
    session: null,
  })
}

beforeEach(() => {
  useAuthStore.setState({ status: 'anonymous', user: null, session: null })
  useFavoritesStore.setState({
    favorites: new Set(),
    loadedForUserId: 'user-1',
    isLoading: false,
    error: null,
  })
  mocks.insertResult = { error: null }
  mocks.deleteResult = { error: null }
  mocks.capturedInsert = null
  toastMocks.success.mockReset()
  toastMocks.error.mockReset()
})

describe('FavoriteButton', () => {
  it('renders nothing when the user is anonymous', () => {
    const { container } = render(<FavoriteButton stationId={1} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders an "agregar" star when authenticated and not a favorite', () => {
    setAuthenticated()
    render(<FavoriteButton stationId={1} />)
    const button = screen.getByRole('button', { name: 'Agregar a favoritos' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).not.toBeDisabled()
  })

  it('renders a "quitar" star when the station is already a favorite', () => {
    setAuthenticated()
    useFavoritesStore.setState({
      favorites: new Set([1]),
      loadedForUserId: 'user-1',
    })
    render(<FavoriteButton stationId={1} />)
    const button = screen.getByRole('button', { name: 'Quitar de favoritos' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
  })

  it('adds the favorite on click and shows a success toast', async () => {
    const user = userEvent.setup()
    setAuthenticated()
    render(<FavoriteButton stationId={42} />)
    await user.click(screen.getByRole('button', { name: 'Agregar a favoritos' }))
    await waitFor(() => expect(mocks.capturedInsert).toEqual({ user_id: 'user-1', station_id: 42 }))
    expect(toastMocks.success).toHaveBeenCalledWith('Agregada a favoritos.')
  })

  it('disables the button when the user already has 10 favorites and tries a new one', () => {
    setAuthenticated()
    useFavoritesStore.setState({
      favorites: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
      loadedForUserId: 'user-1',
    })
    render(<FavoriteButton stationId={42} />)
    const button = screen.getByRole('button', { name: 'Agregar a favoritos' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', expect.stringMatching(/Máximo 10 favoritos/))
  })

  it('shows an error toast when add() fails on the backend', async () => {
    const user = userEvent.setup()
    setAuthenticated()
    mocks.insertResult = {
      error: { message: 'Máximo 10 estaciones favoritas por usuario', code: '23514' },
    }
    render(<FavoriteButton stationId={42} />)
    await user.click(screen.getByRole('button', { name: 'Agregar a favoritos' }))
    await waitFor(() =>
      expect(toastMocks.error).toHaveBeenCalledWith(expect.stringMatching(/máximo de 10/i)),
    )
  })
})
