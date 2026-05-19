import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
    },
  },
}))

import { mapAuthError, useAuthStore } from '@/stores/authStore'

beforeEach(() => {
  useAuthStore.setState({ status: 'loading', user: null, session: null })
  mocks.signUp.mockReset()
  mocks.signInWithPassword.mockReset()
  mocks.signOut.mockReset()
})

describe('authStore', () => {
  it('starts in loading status', () => {
    const s = useAuthStore.getState()
    expect(s.status).toBe('loading')
    expect(s.user).toBeNull()
    expect(s.session).toBeNull()
  })

  it('setSession(null) transitions to anonymous', () => {
    useAuthStore.getState().setSession(null)
    expect(useAuthStore.getState().status).toBe('anonymous')
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('setSession(session) transitions to authenticated and stores the user', () => {
    const user = { id: 'u1', email: 'test@example.com' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useAuthStore.getState().setSession({ user, access_token: 't' } as any)
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(useAuthStore.getState().user?.email).toBe('test@example.com')
  })

  it('signIn forwards credentials and returns null error on success', async () => {
    mocks.signInWithPassword.mockResolvedValue({ data: {}, error: null })
    const result = await useAuthStore.getState().signIn('a@b.com', 'pwd12345')
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pwd12345',
    })
    expect(result.error).toBeNull()
  })

  it('signIn maps "Invalid login credentials" to a Spanish message', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'Invalid login credentials' },
    })
    const result = await useAuthStore.getState().signIn('a@b.com', 'bad')
    expect(result.error).toBe('Email o contraseña incorrectos.')
  })

  it('signUp returns needsConfirmation=true when no session is returned', async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null, user: { id: 'u1' } }, error: null })
    const result = await useAuthStore.getState().signUp('a@b.com', 'pwd12345')
    expect(result).toEqual({ error: null, needsConfirmation: true })
  })

  it('signUp returns needsConfirmation=false when a session is created (email confirm off)', async () => {
    mocks.signUp.mockResolvedValue({
      data: { session: { access_token: 't' }, user: { id: 'u1' } },
      error: null,
    })
    const result = await useAuthStore.getState().signUp('a@b.com', 'pwd12345')
    expect(result).toEqual({ error: null, needsConfirmation: false })
  })

  it('signUp maps "already registered" error to Spanish', async () => {
    mocks.signUp.mockResolvedValue({
      data: {},
      error: { message: 'User already registered' },
    })
    const result = await useAuthStore.getState().signUp('a@b.com', 'pwd12345')
    expect(result.error).toBe('Este email ya está registrado.')
  })

  it('signOut delegates to supabase.auth.signOut', async () => {
    mocks.signOut.mockResolvedValue({})
    await useAuthStore.getState().signOut()
    expect(mocks.signOut).toHaveBeenCalledTimes(1)
  })

  it('mapAuthError covers known error patterns', () => {
    expect(mapAuthError('Invalid login credentials')).toMatch(/incorrectos/)
    expect(mapAuthError('User already registered')).toMatch(/ya está registrado/)
    expect(mapAuthError('Password should be at least 6 characters')).toMatch(/8 caracteres/)
    expect(mapAuthError('Email not valid')).toMatch(/Email inválido/)
    expect(mapAuthError('rate limit exceeded')).toMatch(/Demasiados intentos/)
    expect(mapAuthError('Something obscure went wrong')).toMatch(/Inténtalo de nuevo/)
  })
})
