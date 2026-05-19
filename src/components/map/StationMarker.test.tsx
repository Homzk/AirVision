import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

interface CircleMarkerProps {
  center: [number, number]
  radius: number
  pathOptions?: { fillColor?: string; color?: string; fillOpacity?: number; weight?: number }
  eventHandlers?: { click?: () => void }
  children?: ReactNode
}

vi.mock('react-leaflet', () => ({
  CircleMarker: ({ center, radius, pathOptions, eventHandlers, children }: CircleMarkerProps) => (
    <button
      type="button"
      data-testid="circle-marker"
      data-color={pathOptions?.fillColor}
      data-center={JSON.stringify(center)}
      data-radius={radius}
      onClick={() => eventHandlers?.click?.()}
    >
      {children}
    </button>
  ),
}))

import { StationMarker } from '@/components/map/StationMarker'
import type { StationWithLatest } from '@/types/domain'

function mkStation(latest: StationWithLatest['latest'] = null): StationWithLatest {
  return {
    id: 1,
    name: 'X',
    latitude: -33.5,
    longitude: -70.6,
    country_code: 'CL',
    city: null,
    created_at: '2026-01-01T00:00:00Z',
    latest,
  }
}

describe('StationMarker', () => {
  it('renders the marker at the station coordinates', () => {
    render(<StationMarker station={mkStation()} onSelect={() => {}} />)
    const marker = screen.getByTestId('circle-marker')
    expect(marker.dataset.center).toBe('[-33.5,-70.6]')
    expect(marker.dataset.radius).toBe('10')
  })

  it('uses the no_data color when latest is null', () => {
    render(<StationMarker station={mkStation()} onSelect={() => {}} />)
    expect(screen.getByTestId('circle-marker').dataset.color).toBe('#9ca3af')
  })

  it('uses the worst-of color when readings are present', () => {
    const station = mkStation({
      measured_at: '2026-05-19T12:00:00Z',
      pm25: 80, // hazardous
      pm10: 100, // unhealthy
      o3: 50, // good
    })
    render(<StationMarker station={station} onSelect={() => {}} />)
    expect(screen.getByTestId('circle-marker').dataset.color).toBe('#ef4444')
  })

  it('calls onSelect with the station id on click', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<StationMarker station={mkStation()} onSelect={onSelect} />)
    await user.click(screen.getByTestId('circle-marker'))
    expect(onSelect).toHaveBeenCalledWith(1)
  })
})
