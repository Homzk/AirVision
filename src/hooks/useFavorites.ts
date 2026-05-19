import { useCallback, useEffect } from 'react'

import { useAuthStore } from '@/stores/authStore'
import { MAX_FAVORITES, useFavoritesStore } from '@/stores/favoritesStore'

interface UseFavoritesResult {
  favorites: number[]
  isLoading: boolean
  error: Error | null
  isFavorite: (stationId: number) => boolean
  canAddMore: boolean
  add: (stationId: number) => Promise<{ error: string | null }>
  remove: (stationId: number) => Promise<{ error: string | null }>
}

/**
 * Wrapper sobre `favoritesStore` que dispara `load` cuando hay sesión y
 * resetea cuando el usuario cierra sesión. Las llamadas a load() están
 * de-duplicadas por `loadedForUserId` dentro del store.
 */
export function useFavorites(): UseFavoritesResult {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const status = useAuthStore((s) => s.status)
  const favorites = useFavoritesStore((s) => s.favorites)
  const isLoading = useFavoritesStore((s) => s.isLoading)
  const error = useFavoritesStore((s) => s.error)
  const load = useFavoritesStore((s) => s.load)
  const reset = useFavoritesStore((s) => s.reset)
  const storeAdd = useFavoritesStore((s) => s.add)
  const storeRemove = useFavoritesStore((s) => s.remove)

  useEffect(() => {
    if (status === 'authenticated' && userId) {
      void load(userId)
    } else if (status === 'anonymous') {
      reset()
    }
  }, [status, userId, load, reset])

  const isFavorite = useCallback((stationId: number) => favorites.has(stationId), [favorites])

  const add = useCallback(
    async (stationId: number) => {
      if (!userId) return { error: 'Debes iniciar sesión.' }
      return storeAdd(userId, stationId)
    },
    [userId, storeAdd],
  )

  const remove = useCallback(
    async (stationId: number) => {
      if (!userId) return { error: 'Debes iniciar sesión.' }
      return storeRemove(userId, stationId)
    },
    [userId, storeRemove],
  )

  return {
    favorites: Array.from(favorites),
    isLoading,
    error,
    isFavorite,
    canAddMore: favorites.size < MAX_FAVORITES,
    add,
    remove,
  }
}
