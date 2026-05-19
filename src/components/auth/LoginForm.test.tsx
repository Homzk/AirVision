import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mocks.navigate }
})

import { LoginForm } from '@/components/auth/LoginForm'
import { useAuthStore } from '@/stores/authStore'

beforeEach(() => {
  useAuthStore.setState({ status: 'anonymous', user: null, session: null })
  mocks.signInWithPassword.mockReset()
  mocks.navigate.mockReset()
})

describe('LoginForm', () => {
  it('renders email and password fields and a submit button', () => {
    render(<LoginForm />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument()
  })

  it('signs in and navigates home on success', async () => {
    const user = userEvent.setup()
    mocks.signInWithPassword.mockResolvedValue({ data: {}, error: null })
    render(<LoginForm />)
    await user.type(screen.getByLabelText('Email'), 'a@b.com')
    await user.type(screen.getByLabelText('Contraseña'), 'pwd12345')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    await waitFor(() =>
      expect(mocks.signInWithPassword).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: 'pwd12345',
      }),
    )
    expect(mocks.navigate).toHaveBeenCalledWith('/')
  })

  it('shows the Spanish error when credentials are invalid', async () => {
    const user = userEvent.setup()
    mocks.signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'Invalid login credentials' },
    })
    render(<LoginForm />)
    await user.type(screen.getByLabelText('Email'), 'a@b.com')
    await user.type(screen.getByLabelText('Contraseña'), 'wrongpwd')
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/Email o contraseña incorrectos/),
    )
    expect(mocks.navigate).not.toHaveBeenCalled()
  })
})
