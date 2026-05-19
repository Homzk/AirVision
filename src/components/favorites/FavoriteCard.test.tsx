import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  deleteResult: { error: null } as { error: { message: string } | null },
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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mocks.navigate }
})

vi.mock('sonner', () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError, info: vi.fn() },
}))

import { FavoriteCard } from '@/components/favorites/FavoriteCard'
import { useAuthStore } from '@/stores/authStore'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useFavoritesStore } from '@/stores/favoritesStore'
import type { StationWithLatest } from '@/types/domain'

function mkStation(latest: StationWithLatest['latest']): StationWithLatest {
  return {
    id: 1,
    name: "Parque O'Higgins",
    latitude: -33.46,
    longitude: -70.66,
    country_code: 'CL',
    city: 'Santiago',
    created_at: '2026-01-01T00:00:00Z',
    latest,
  }
}

beforeEach(() => {
  useAuthStore.setState({
    status: 'authenticated',
    user: { id: 'user-1', email: 'a@b.com' } as User,
    session: null,
  })
  useFavoritesStore.setState({
    favorites: new Set([1]),
    loadedForUserId: 'user-1',
    isLoading: false,
    error: null,
  })
  useDashboardStore.setState({
    selectedStationId: null,
    stationsById: {},
    range: '24h',
  })
  mocks.navigate.mockReset()
  mocks.toastSuccess.mockReset()
  mocks.toastError.mockReset()
  mocks.deleteResult = { error: null }
})

describe('FavoriteCard', () => {
  it('renders name, city, level and the three pollutants when there is data', () => {
    render(
      <FavoriteCard
        station={mkStation({
          measured_at: '2026-05-19T12:00:00Z',
          pm25: 22,
          pm10: 50,
          o3: 70,
        })}
      />,
    )
    expect(screen.getByText("Parque O'Higgins")).toBeInTheDocument()
    expect(screen.getByText('Santiago')).toBeInTheDocument()
    expect(screen.getByText('PM2.5')).toBeInTheDocument()
    expect(screen.getByText(/22 µg\/m³/)).toBeInTheDocument()
  })

  it('renders "Sin datos recientes" when latest is null', () => {
    render(<FavoriteCard station={mkStation(null)} />)
    expect(screen.getByText('Sin datos recientes')).toBeInTheDocument()
    expect(screen.queryByText('PM2.5')).not.toBeInTheDocument()
  })

  it('removes the favorite and shows a success toast on Trash click', async () => {
    const user = userEvent.setup()
    render(<FavoriteCard station={mkStation(null)} />)
    await user.click(screen.getByRole('button', { name: 'Quitar de favoritos' }))
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledWith('Eliminada de favoritos.'))
    expect(useFavoritesStore.getState().favorites.has(1)).toBe(false)
  })

  it('opens trends by selecting the station and navigating to /', async () => {
    const user = userEvent.setup()
    render(
      <FavoriteCard
        station={mkStation({
          measured_at: '2026-05-19T12:00:00Z',
          pm25: 10,
          pm10: 20,
          o3: 30,
        })}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Ver tendencias' }))
    expect(useDashboardStore.getState().selectedStationId).toBe(1)
    expect(mocks.navigate).toHaveBeenCalledWith('/')
  })
})
