import { useStationReadings } from '@/hooks/useStationReadings'
import { POLLUTANTS } from '@/lib/airQuality'
import { useDashboardStore } from '@/stores/dashboardStore'

import { ErrorState } from '@/components/ui/ErrorState'
import { LoadingState } from '@/components/ui/LoadingState'

import { PollutantChart } from './PollutantChart'
import { RangeSelector } from './RangeSelector'

interface ChartPanelProps {
  stationId: number
}

export function ChartPanel({ stationId }: ChartPanelProps) {
  const range = useDashboardStore((s) => s.range)
  const { readings, isLoading, error } = useStationReadings(stationId, range)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Tendencias</h3>
        <RangeSelector />
      </div>
      {isLoading && <LoadingState message="Cargando mediciones…" />}
      {error && <ErrorState message={error.message} />}
      {!isLoading && !error && (
        <div className="space-y-3">
          {POLLUTANTS.map((p) => (
            <PollutantChart key={p} pollutant={p} data={readings} />
          ))}
        </div>
      )}
    </div>
  )
}
