import { render, screen } from '@testing-library/react'
import type { User } from '@supabase/supabase-js'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { AlertBadge } from '@/components/alerts/AlertBadge'
import { useAlertStore } from '@/stores/alertStore'
import { useAuthStore } from '@/stores/authStore'

beforeEach(() => {
  useAuthStore.setState({ status: 'anonymous', user: null, session: null })
  useAlertStore.setState({
    alerts: [],
    history: [],
    unseenCount: 0,
    loadedForUserId: null,
    isLoading: false,
    error: null,
  })
})

function renderBadge() {
  return render(
    <MemoryRouter>
      <AlertBadge />
    </MemoryRouter>,
  )
}

describe('AlertBadge', () => {
  it('renders nothing when the user is anonymous', () => {
    const { container } = renderBadge()
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when authenticated but unseenCount is 0', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: { id: 'u', email: 'a@b.com' } as User,
      session: null,
    })
    const { container } = renderBadge()
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the count when there are unseen alerts', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: { id: 'u', email: 'a@b.com' } as User,
      session: null,
    })
    useAlertStore.setState({ unseenCount: 3 })
    renderBadge()
    const link = screen.getByRole('link', { name: /3 alertas nuevas/ })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/alertas')
  })

  it('uses singular Spanish when count is 1', () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: { id: 'u', email: 'a@b.com' } as User,
      session: null,
    })
    useAlertStore.setState({ unseenCount: 1 })
    renderBadge()
    expect(screen.getByRole('link', { name: /1 alerta nueva/ })).toBeInTheDocument()
  })
})
