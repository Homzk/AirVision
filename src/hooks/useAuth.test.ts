import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

interface MockSession {
  access_token: string
  user: { id: string; email: string }
}

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
  authChangeCb: null as ((event: string, session: MockSession | null) => void) | null,
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'

beforeEach(() => {
  useAuthStore.setState({ status: 'loading', user: null, session: null })
  mocks.getSession.mockReset()
  mocks.onAuthStateChange.mockReset()
  mocks.unsubscribe.mockReset()
  mocks.authChangeCb = null

  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null })
  mocks.onAuthStateChange.mockImplementation((cb) => {
    mocks.authChangeCb = cb
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } }
  })
})

describe('useAuth', () => {
  it('bootstraps with anonymous status when there is no session', async () => {
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.status).toBe('anonymous'))
    expect(mocks.getSession).toHaveBeenCalledTimes(1)
    expect(mocks.onAuthStateChange).toHaveBeenCalledTimes(1)
  })

  it('bootstraps with authenticated status when there is a stored session', async () => {
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 't', user: { id: 'u1', email: 'a@b.com' } } },
      error: null,
    })
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.status).toBe('authenticated'))
    expect(result.current.user?.email).toBe('a@b.com')
  })

  it('reacts to a later SIGNED_IN event from onAuthStateChange', async () => {
    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.status).toBe('anonymous'))

    act(() =>
      mocks.authChangeCb?.('SIGNED_IN', {
        access_token: 't',
        user: { id: 'u1', email: 'late@example.com' },
      }),
    )
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(useAuthStore.getState().user?.email).toBe('late@example.com')
  })

  it('unsubscribes from auth state changes on unmount', async () => {
    const { unmount, result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.status).toBe('anonymous'))
    unmount()
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('exposes the store actions', () => {
    const { result } = renderHook(() => useAuth())
    expect(typeof result.current.signIn).toBe('function')
    expect(typeof result.current.signUp).toBe('function')
    expect(typeof result.current.signOut).toBe('function')
  })
})
