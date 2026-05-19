import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { StationReadingPoint } from '@/hooks/useStationReadings'
import type { Pollutant } from '@/lib/airQuality'
import { POLLUTANT_LABELS, POLLUTANT_UNITS } from '@/utils/constants'
import { formatReadingTime } from '@/utils/date'

interface PollutantChartProps {
  pollutant: Pollutant
  data: StationReadingPoint[]
}

export function PollutantChart({ pollutant, data }: PollutantChartProps) {
  if (data.length === 0) {
    return <EmptyChart>Sin datos para {POLLUTANT_LABELS[pollutant]} en este rango.</EmptyChart>
  }

  const hasAnyValue = data.some((d) => d[pollutant] !== null)
  if (!hasAnyValue) {
    return <EmptyChart>Sin cobertura de {POLLUTANT_LABELS[pollutant]} en este rango.</EmptyChart>
  }

  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-sm font-medium text-foreground">{POLLUTANT_LABELS[pollutant]}</h4>
        <span className="text-xs text-muted-foreground">{POLLUTANT_UNITS[pollutant]}</span>
      </div>
      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="measured_at"
              tickFormatter={(iso: string) => formatReadingTime(iso)}
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickMargin={4}
              minTickGap={32}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickMargin={4}
              width={32}
              allowDecimals={false}
            />
            <Tooltip
              labelFormatter={(iso) => formatReadingTime(iso as string)}
              formatter={(value: number) => [
                `${value.toFixed(0)} ${POLLUTANT_UNITS[pollutant]}`,
                POLLUTANT_LABELS[pollutant],
              ]}
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            />
            <Line
              type="monotone"
              dataKey={pollutant}
              stroke="hsl(var(--ring))"
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-card/50 p-4 text-center text-xs text-muted-foreground">
      {children}
    </div>
  )
}
