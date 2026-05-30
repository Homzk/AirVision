import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { ReconnectingIndicator } from '@/components/layout/ReconnectingIndicator'
import { useRealtimeStore } from '@/stores/realtimeStore'

beforeEach(() => {
  useRealtimeStore.setState({ status: 'CONNECTED' })
})

afterEach(() => {
  useRealtimeStore.setState({ status: 'CONNECTED' })
})

describe('ReconnectingIndicator', () => {
  it('renders nothing when CONNECTED', () => {
    const { container } = render(<ReconnectingIndicator />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows "Conectando…" when CONNECTING', () => {
    useRealtimeStore.setState({ status: 'CONNECTING' })
    render(<ReconnectingIndicator />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Conectando…')
    expect(status).toHaveAttribute('title', expect.stringContaining('Conectando'))
  })

  it('shows "Sin conexión" when DISCONNECTED', () => {
    useRealtimeStore.setState({ status: 'DISCONNECTED' })
    render(<ReconnectingIndicator />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Sin conexión')
    expect(status).toHaveAttribute('title', expect.stringContaining('Sin conexión'))
  })
})
