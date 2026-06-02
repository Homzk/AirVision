import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { MapFilters } from '@/components/map/MapFilters'
import { useFiltersStore } from '@/stores/filtersStore'

beforeEach(() => {
  useFiltersStore.getState().reset()
})

describe('MapFilters', () => {
  it('renders the no-data toggle unchecked by default', () => {
    render(<MapFilters />)
    const toggle = screen.getByRole('checkbox', { name: /sin datos recientes/i })
    expect(toggle).not.toBeChecked()
  })

  it('toggling updates showNoData in the store', async () => {
    const user = userEvent.setup()
    render(<MapFilters />)
    const toggle = screen.getByRole('checkbox', { name: /sin datos recientes/i })

    await user.click(toggle)
    expect(useFiltersStore.getState().showNoData).toBe(true)
    expect(toggle).toBeChecked()

    await user.click(toggle)
    expect(useFiltersStore.getState().showNoData).toBe(false)
  })

  it('reflects the store state', () => {
    useFiltersStore.getState().setShowNoData(true)
    render(<MapFilters />)
    expect(screen.getByRole('checkbox', { name: /sin datos recientes/i })).toBeChecked()
  })
})
