import type { ReactNode } from 'react'
import { CircleMarker } from 'react-leaflet'

import { computeWorstLevel, levelToColor } from '@/lib/airQuality'
import type { StationWithLatest } from '@/types/domain'

interface StationMarkerProps {
  station: StationWithLatest
  onSelect?: (id: number) => void
  children?: ReactNode
}

export function StationMarker({ station, onSelect, children }: StationMarkerProps) {
  const level = station.latest ? computeWorstLevel(station.latest) : 'no_data'
  const color = levelToColor(level)
  const isNoData = level === 'no_data'

  return (
    <CircleMarker
      center={[station.latitude, station.longitude]}
      // Stations without recent data are visually de-emphasised: smaller,
      // more transparent and with a dashed outline.
      radius={isNoData ? 6 : 10}
      pathOptions={{
        color: '#ffffff',
        weight: isNoData ? 1 : 2,
        fillColor: color,
        fillOpacity: isNoData ? 0.45 : 0.9,
        dashArray: isNoData ? '2 3' : undefined,
      }}
      eventHandlers={onSelect ? { click: () => onSelect(station.id) } : undefined}
    >
      {children}
    </CircleMarker>
  )
}
