import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('recharts', () => ({
  LineChart: ({ children, data }: { children?: ReactNode; data?: unknown[] }) => (
    <div data-testid="line-chart" data-points={String(data?.length ?? 0)}>
      {children}
    </div>
  ),
  Line: ({ dataKey, stroke }: { dataKey?: string; stroke?: string }) => (
    <div data-testid="line" data-key={dataKey} data-stroke={stroke} />
  ),
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  ResponsiveContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

import { PollutantChart } from '@/components/dashboard/PollutantChart'

describe('PollutantChart', () => {
  it('renders the empty-range message when there is no data at all', () => {
    render(<PollutantChart pollutant="pm25" data={[]} />)
    expect(screen.getByText(/Sin datos para PM2\.5/)).toBeInTheDocument()
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument()
  })

  it('renders the "no coverage" message when every value for the pollutant is null', () => {
    render(
      <PollutantChart
        pollutant="o3"
        data={[
          { measured_at: '2026-05-19T12:00:00Z', pm25: 22, pm10: 50, o3: null },
          { measured_at: '2026-05-19T13:00:00Z', pm25: 24, pm10: 52, o3: null },
        ]}
      />,
    )
    expect(screen.getByText(/Sin cobertura de O₃/)).toBeInTheDocument()
    expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument()
  })

  it('renders the chart with the pollutant dataKey when there are values', () => {
    render(
      <PollutantChart
        pollutant="pm25"
        data={[
          { measured_at: '2026-05-19T12:00:00Z', pm25: 22, pm10: 50, o3: 30 },
          { measured_at: '2026-05-19T13:00:00Z', pm25: 24, pm10: 52, o3: 35 },
        ]}
      />,
    )
    const chart = screen.getByTestId('line-chart')
    expect(chart.dataset.points).toBe('2')
    expect(screen.getByTestId('line').dataset.key).toBe('pm25')
  })
})
