import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  navigate: vi.fn(),
  toastInfo: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: mocks.signUp,
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mocks.navigate }
})

vi.mock('sonner', () => ({
  toast: {
    info: mocks.toastInfo,
    success: mocks.toastSuccess,
    error: vi.fn(),
  },
}))

import { RegisterForm } from '@/components/auth/RegisterForm'
import { useAuthStore } from '@/stores/authStore'

beforeEach(() => {
  useAuthStore.setState({ status: 'anonymous', user: null, session: null })
  mocks.signUp.mockReset()
  mocks.navigate.mockReset()
  mocks.toastInfo.mockReset()
  mocks.toastSuccess.mockReset()
})

describe('RegisterForm', () => {
  it('renders email, password, and confirmation fields', () => {
    render(<RegisterForm />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument()
  })

  it('rejects passwords shorter than 8 characters without calling signUp', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)
    await user.type(screen.getByLabelText('Email'), 'a@b.com')
    await user.type(screen.getByLabelText('Contraseña'), 'short')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'short')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/al menos 8 caracteres/i)
    expect(mocks.signUp).not.toHaveBeenCalled()
  })

  it('rejects mismatched passwords', async () => {
    const user = userEvent.setup()
    render(<RegisterForm />)
    await user.type(screen.getByLabelText('Email'), 'a@b.com')
    await user.type(screen.getByLabelText('Contraseña'), 'pwd12345')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'pwd99999')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/no coinciden/i)
    expect(mocks.signUp).not.toHaveBeenCalled()
  })

  it('navigates home and shows a success toast when a session is returned', async () => {
    const user = userEvent.setup()
    mocks.signUp.mockResolvedValue({
      data: { session: { access_token: 't' }, user: { id: 'u1' } },
      error: null,
    })
    render(<RegisterForm />)
    await user.type(screen.getByLabelText('Email'), 'a@b.com')
    await user.type(screen.getByLabelText('Contraseña'), 'pwd12345')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'pwd12345')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/'))
    expect(mocks.toastSuccess).toHaveBeenCalled()
  })

  it('redirects to /login with an info toast when email confirmation is required', async () => {
    const user = userEvent.setup()
    mocks.signUp.mockResolvedValue({
      data: { session: null, user: { id: 'u1' } },
      error: null,
    })
    render(<RegisterForm />)
    await user.type(screen.getByLabelText('Email'), 'a@b.com')
    await user.type(screen.getByLabelText('Contraseña'), 'pwd12345')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'pwd12345')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/login'))
    expect(mocks.toastInfo).toHaveBeenCalled()
  })

  it('maps an "already registered" backend error to Spanish', async () => {
    const user = userEvent.setup()
    mocks.signUp.mockResolvedValue({
      data: {},
      error: { message: 'User already registered' },
    })
    render(<RegisterForm />)
    await user.type(screen.getByLabelText('Email'), 'a@b.com')
    await user.type(screen.getByLabelText('Contraseña'), 'pwd12345')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'pwd12345')
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/ya está registrado/i))
  })
})
