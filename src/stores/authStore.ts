import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'

import { supabase } from '@/lib/supabase'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface SignUpResult {
  error: string | null
  needsConfirmation: boolean
}

export interface SignInResult {
  error: string | null
}

interface AuthState {
  status: AuthStatus
  user: User | null
  session: Session | null
  setSession: (session: Session | null) => void
  signUp: (email: string, password: string) => Promise<SignUpResult>
  signIn: (email: string, password: string) => Promise<SignInResult>
  signOut: () => Promise<void>
}

/**
 * Mapea los mensajes de error en inglés de Supabase Auth a mensajes legibles
 * en español. Hace match por substring porque Supabase no expone códigos
 * estables (los mensajes pueden cambiar entre versiones).
 */
export function mapAuthError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return 'Email o contraseña incorrectos.'
  }
  if (lower.includes('already registered') || lower.includes('user already')) {
    return 'Este email ya está registrado.'
  }
  if (lower.includes('password') && lower.includes('characters')) {
    return 'La contraseña debe tener al menos 8 caracteres.'
  }
  if (lower.includes('email') && (lower.includes('invalid') || lower.includes('not valid'))) {
    return 'Email inválido.'
  }
  if (lower.includes('rate limit')) {
    return 'Demasiados intentos. Espera unos minutos.'
  }
  return 'Error de autenticación. Inténtalo de nuevo.'
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  session: null,

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      status: session ? 'authenticated' : 'anonymous',
    }),

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: mapAuthError(error.message), needsConfirmation: false }
    return { error: null, needsConfirmation: data.session === null }
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: mapAuthError(error.message) }
    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
  },
}))
