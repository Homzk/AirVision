import { renderHook, waitFor } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

interface MockState {
  selectData: Array<{ station_id: number }>
  selectError: { message: string } | null
  insertResult: { error: { message: string; code?: string } | null }
  deleteResult: { error: { message: string } | null }
  capturedInsert: { user_id: string; station_id: number } | null
  capturedDeleteFilters: Array<[string, unknown]>
}

const mocks = vi.hoisted<MockState>(() => ({
  selectData: [],
  selectError: null,
  insertResult: { error: null },
  deleteResult: { error: null },
  capturedInsert: null,
  capturedDeleteFilters: [],
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
      mocks.capturedDeleteFilters = []
      return builder
    }
    builder.eq = (field: string, value: unknown) => {
      if (op === 'delete') mocks.capturedDeleteFilters.push([field, value])
      return builder
    }
    builder.order = () => builder
    builder.then = (resolve: (val: unknown) => void) => {
      if (op === 'insert') resolve(mocks.insertResult)
      else if (op === 'delete') resolve(mocks.deleteResult)
      else resolve({ data: mocks.selectData, error: mocks.selectError })
    }
    return builder
  }
  return {
    supabase: {
      from: () => makeBuilder(),
    },
  }
})

import { useFavorites } from '@/hooks/useFavorites'
import { useAuthStore } from '@/stores/authStore'
import { useFavoritesStore } from '@/stores/favoritesStore'

function setAuthenticated(userId = 'user-1') {
  useAuthStore.setState({
    status: 'authenticated',
    user: { id: userId, email: 'a@b.com' } as User,
    session: null,
  })
}

beforeEach(() => {
  useAuthStore.setState({ status: 'anonymous', user: null, session: null })
  useFavoritesStore.setState({
    favorites: new Set(),
    loadedForUserId: null,
    isLoading: false,
    error: null,
  })
  mocks.selectData = []
  mocks.selectError = null
  mocks.insertResult = { error: null }
  mocks.deleteResult = { error: null }
  mocks.capturedInsert = null
  mocks.capturedDeleteFilters = []
})

describe('useFavorites', () => {
  it('stays empty and idle when the user is anonymous', async () => {
    const { result } = renderHook(() => useFavorites())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.favorites).toEqual([])
    expect(result.current.canAddMore).toBe(true)
  })

  it('loads favorites for the authenticated user', async () => {
    mocks.selectData = [{ station_id: 1 }, { station_id: 3 }]
    setAuthenticated()
    const { result } = renderHook(() => useFavorites())
    await waitFor(() => expect(result.current.favorites).toHaveLength(2))
    expect(result.current.isFavorite(1)).toBe(true)
    expect(result.current.isFavorite(3)).toBe(true)
    expect(result.current.isFavorite(2)).toBe(false)
  })

  it('add() inserts and updates the store', async () => {
    setAuthenticated()
    const { result } = renderHook(() => useFavorites())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const res = await result.current.add(42)
    expect(res.error).toBeNull()
    expect(mocks.capturedInsert).toEqual({ user_id: 'user-1', station_id: 42 })
    expect(useFavoritesStore.getState().favorites.has(42)).toBe(true)
  })

  it('add() refuses locally when the limit of 10 is reached', async () => {
    setAuthenticated()
    useFavoritesStore.setState({
      favorites: new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
      loadedForUserId: 'user-1',
    })
    const { result } = renderHook(() => useFavorites())
    await waitFor(() => expect(result.current.canAddMore).toBe(false))

    const res = await result.current.add(11)
    expect(res.error).toMatch(/máximo de 10/i)
    expect(mocks.capturedInsert).toBeNull()
  })

  it('add() maps a trigger limit error from the backend to Spanish', async () => {
    setAuthenticated()
    mocks.insertResult = {
      error: { message: 'Máximo 10 estaciones favoritas por usuario', code: '23514' },
    }
    const { result } = renderHook(() => useFavorites())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const res = await result.current.add(42)
    expect(res.error).toMatch(/máximo de 10/i)
    expect(useFavoritesStore.getState().favorites.has(42)).toBe(false)
  })

  it('add() treats a duplicate 23505 as a silent success', async () => {
    setAuthenticated()
    mocks.insertResult = {
      error: { message: 'duplicate key value', code: '23505' },
    }
    const { result } = renderHook(() => useFavorites())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const res = await result.current.add(42)
    expect(res.error).toBeNull()
    expect(useFavoritesStore.getState().favorites.has(42)).toBe(true)
  })

  it('remove() deletes and updates the store', async () => {
    mocks.selectData = [{ station_id: 5 }]
    setAuthenticated()
    const { result } = renderHook(() => useFavorites())
    await waitFor(() => expect(result.current.favorites).toHaveLength(1))

    const res = await result.current.remove(5)
    expect(res.error).toBeNull()
    expect(mocks.capturedDeleteFilters).toEqual([
      ['user_id', 'user-1'],
      ['station_id', 5],
    ])
    expect(useFavoritesStore.getState().favorites.has(5)).toBe(false)
  })

  it('resets favorites when the user signs out', async () => {
    mocks.selectData = [{ station_id: 1 }]
    setAuthenticated()
    const { result, rerender } = renderHook(() => useFavorites())
    await waitFor(() => expect(result.current.favorites).toHaveLength(1))

    useAuthStore.setState({ status: 'anonymous', user: null, session: null })
    rerender()
    await waitFor(() => expect(result.current.favorites).toEqual([]))
  })
})
