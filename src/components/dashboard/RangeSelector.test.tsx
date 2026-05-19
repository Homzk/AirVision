import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { RangeSelector } from '@/components/dashboard/RangeSelector'
import { useDashboardStore } from '@/stores/dashboardStore'

beforeEach(() => {
  useDashboardStore.setState({ selectedStationId: null, stationsById: {}, range: '24h' })
})

describe('RangeSelector', () => {
  it('renders one button per range with labels', () => {
    render(<RangeSelector />)
    expect(screen.getByRole('button', { name: '6 h' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '24 h' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '7 d' })).toBeInTheDocument()
  })

  it('marks the current range as pressed', () => {
    render(<RangeSelector />)
    expect(screen.getByRole('button', { name: '24 h' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '6 h' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('updates the store when a different range is clicked', async () => {
    const user = userEvent.setup()
    render(<RangeSelector />)
    await user.click(screen.getByRole('button', { name: '7 d' }))
    expect(useDashboardStore.getState().range).toBe('7d')
  })
})
