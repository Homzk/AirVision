import { useEffect } from 'react'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

/**
 * Bootstrap del estado de autenticación: lee la sesión inicial desde Supabase
 * y se suscribe a cambios. Debe llamarse UNA sola vez en el árbol (en `App`).
 * Otros componentes leen el estado directamente con `useAuthStore`.
 */
export function useAuth() {
  const setSession = useAuthStore((s) => s.setSession)
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const signUp = useAuthStore((s) => s.signUp)
  const signIn = useAuthStore((s) => s.signIn)
  const signOut = useAuthStore((s) => s.signOut)

  useEffect(() => {
    let mounted = true

    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [setSession])

  return { status, user, signUp, signIn, signOut }
}
