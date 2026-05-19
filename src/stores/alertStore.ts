import { create } from 'zustand'

import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export const MAX_ALERTS = 5
export const MAX_HISTORY = 20

type Tables = Database['public']['Tables']
export type AlertRow = Tables['alerts']['Row']
export type AlertHistoryRow = Tables['alert_history']['Row']
export type Direction = Database['public']['Enums']['alert_direction']
export type AlertPollutant = Database['public']['Enums']['pollutant']

export interface CreateAlertInput {
  station_id: number
  pollutant: AlertPollutant
  threshold: number
  direction: Direction
}

interface MutationResult {
  error: string | null
}

interface AlertState {
  alerts: AlertRow[]
  history: AlertHistoryRow[]
  unseenCount: number
  loadedForUserId: string | null
  isLoading: boolean
  error: Error | null
  loadAll: (userId: string) => Promise<void>
  createAlert: (userId: string, input: CreateAlertInput) => Promise<MutationResult>
  deleteAlert: (id: string) => Promise<MutationResult>
  markAllSeen: (userId: string) => Promise<void>
  applyTriggerInsert: (row: AlertHistoryRow) => void
  reset: () => void
}

export function mapCreateAlertError(message: string): string {
  if (message.toLowerCase().includes('máximo')) {
    return 'Máximo 5 alertas. Elimina una existente para crear otra.'
  }
  return 'No se pudo crear la alerta. Inténtalo de nuevo.'
}

export const useAlertStore = create<AlertState>((set, get) => ({
  alerts: [],
  history: [],
  unseenCount: 0,
  loadedForUserId: null,
  isLoading: false,
  error: null,

  loadAll: async (userId) => {
    if (get().loadedForUserId === userId) return
    set({ isLoading: true, error: null })
    const [alertsRes, historyRes] = await Promise.all([
      supabase
        .from('alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('alert_history')
        .select('*')
        .eq('user_id', userId)
        .order('triggered_at', { ascending: false })
        .limit(MAX_HISTORY),
    ])
    if (alertsRes.error) {
      set({ isLoading: false, error: new Error(alertsRes.error.message) })
      return
    }
    if (historyRes.error) {
      set({ isLoading: false, error: new Error(historyRes.error.message) })
      return
    }
    const history = historyRes.data ?? []
    set({
      alerts: alertsRes.data ?? [],
      history,
      unseenCount: history.filter((h) => !h.seen).length,
      loadedForUserId: userId,
      isLoading: false,
    })
  },

  createAlert: async (userId, input) => {
    if (get().alerts.length >= MAX_ALERTS) {
      return { error: 'Máximo 5 alertas. Elimina una existente para crear otra.' }
    }
    const { data, error } = await supabase
      .from('alerts')
      .insert({ user_id: userId, ...input })
      .select()
      .single()
    if (error) {
      return { error: mapCreateAlertError(error.message) }
    }
    set((state) => ({ alerts: [data as AlertRow, ...state.alerts] }))
    return { error: null }
  },

  deleteAlert: async (id) => {
    const { error } = await supabase.from('alerts').delete().eq('id', id)
    if (error) {
      return { error: 'No se pudo eliminar la alerta. Inténtalo de nuevo.' }
    }
    set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) }))
    return { error: null }
  },

  markAllSeen: async (userId) => {
    if (get().unseenCount === 0) return
    const { error } = await supabase
      .from('alert_history')
      .update({ seen: true })
      .eq('user_id', userId)
      .eq('seen', false)
    if (error) return
    set((state) => ({
      history: state.history.map((h) => ({ ...h, seen: true })),
      unseenCount: 0,
    }))
  },

  applyTriggerInsert: (row) => {
    set((state) => {
      const next = [row, ...state.history].slice(0, MAX_HISTORY)
      return {
        history: next,
        unseenCount: state.unseenCount + (row.seen ? 0 : 1),
      }
    })
  },

  reset: () => {
    set({
      alerts: [],
      history: [],
      unseenCount: 0,
      loadedForUserId: null,
      isLoading: false,
      error: null,
    })
  },
}))
