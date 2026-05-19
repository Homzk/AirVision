import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { StationPopup } from '@/components/map/StationPopup'
import type { StationWithLatest } from '@/types/domain'

function mkStation(latest: StationWithLatest['latest']): StationWithLatest {
  return {
    id: 1,
    name: "Parque O'Higgins",
    latitude: -33.46,
    longitude: -70.66,
    country_code: 'CL',
    city: 'Santiago',
    created_at: '2026-01-01T00:00:00Z',
    latest,
  }
}

describe('StationPopup', () => {
  it('renders station name, city, and the three pollutants', () => {
    render(
      <StationPopup
        station={mkStation({
          measured_at: '2026-05-19T12:00:00Z',
          pm25: 22,
          pm10: 50,
          o3: 70,
        })}
      />,
    )
    expect(screen.getByText("Parque O'Higgins")).toBeInTheDocument()
    expect(screen.getByText('Santiago')).toBeInTheDocument()
    expect(screen.getByText('PM2.5')).toBeInTheDocument()
    expect(screen.getByText('PM10')).toBeInTheDocument()
    expect(screen.getByText('O₃')).toBeInTheDocument()
    expect(screen.getByText(/22 µg\/m³/)).toBeInTheDocument()
    expect(screen.getByText(/50 µg\/m³/)).toBeInTheDocument()
    expect(screen.getByText(/70 µg\/m³/)).toBeInTheDocument()
  })

  it('shows em-dash for missing pollutant values', () => {
    render(
      <StationPopup
        station={mkStation({
          measured_at: '2026-05-19T12:00:00Z',
          pm25: null,
          pm10: 50,
          o3: null,
        })}
      />,
    )
    expect(screen.getAllByText('—')).toHaveLength(2)
  })

  it('renders "Sin datos recientes" when latest is null', () => {
    render(<StationPopup station={mkStation(null)} />)
    expect(screen.getByText('Sin datos recientes')).toBeInTheDocument()
    expect(screen.queryByText('PM2.5')).not.toBeInTheDocument()
  })

  it('calls onOpenTrends with the station id when the button is clicked', async () => {
    const user = userEvent.setup()
    const onOpenTrends = vi.fn()
    render(
      <StationPopup
        station={mkStation({
          measured_at: '2026-05-19T12:00:00Z',
          pm25: 10,
          pm10: 20,
          o3: 30,
        })}
        onOpenTrends={onOpenTrends}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Ver tendencias' }))
    expect(onOpenTrends).toHaveBeenCalledWith(1)
  })

  it('hides the "Ver tendencias" button when onOpenTrends is undefined', () => {
    render(<StationPopup station={mkStation(null)} />)
    expect(screen.queryByRole('button', { name: 'Ver tendencias' })).not.toBeInTheDocument()
  })
})
