import { create } from 'zustand'

import { supabase } from '@/lib/supabase'

export const MAX_FAVORITES = 10

interface MutationResult {
  error: string | null
}

interface FavoritesState {
  favorites: Set<number>
  loadedForUserId: string | null
  isLoading: boolean
  error: Error | null
  load: (userId: string) => Promise<void>
  add: (userId: string, stationId: number) => Promise<MutationResult>
  remove: (userId: string, stationId: number) => Promise<MutationResult>
  reset: () => void
}

/**
 * Mapea errores del backend al insertar un favorito. El trigger
 * `enforce_favorites_limit` levanta una excepción con el texto en español.
 */
function mapInsertError(message: string): string {
  if (message.toLowerCase().includes('máximo')) {
    return 'Has alcanzado el máximo de 10 estaciones favoritas.'
  }
  return 'No se pudo agregar a favoritos. Inténtalo de nuevo.'
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: new Set(),
  loadedForUserId: null,
  isLoading: false,
  error: null,

  load: async (userId) => {
    if (get().loadedForUserId === userId) return
    set({ isLoading: true, error: null })
    const { data, error } = await supabase
      .from('user_favorites')
      .select('station_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) {
      set({ isLoading: false, error: new Error(error.message) })
      return
    }
    set({
      favorites: new Set((data ?? []).map((r) => r.station_id)),
      loadedForUserId: userId,
      isLoading: false,
    })
  },

  add: async (userId, stationId) => {
    if (get().favorites.has(stationId)) return { error: null }
    if (get().favorites.size >= MAX_FAVORITES) {
      return { error: 'Has alcanzado el máximo de 10 estaciones favoritas.' }
    }
    const { error } = await supabase
      .from('user_favorites')
      .insert({ user_id: userId, station_id: stationId })
    if (error) {
      if (error.code === '23505') {
        set((state) => {
          const next = new Set(state.favorites)
          next.add(stationId)
          return { favorites: next }
        })
        return { error: null }
      }
      return { error: mapInsertError(error.message) }
    }
    set((state) => {
      const next = new Set(state.favorites)
      next.add(stationId)
      return { favorites: next }
    })
    return { error: null }
  },

  remove: async (userId, stationId) => {
    if (!get().favorites.has(stationId)) return { error: null }
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('station_id', stationId)
    if (error) {
      return { error: 'No se pudo eliminar de favoritos. Inténtalo de nuevo.' }
    }
    set((state) => {
      const next = new Set(state.favorites)
      next.delete(stationId)
      return { favorites: next }
    })
    return { error: null }
  },

  reset: () => {
    set({ favorites: new Set(), loadedForUserId: null, isLoading: false, error: null })
  },
}))
