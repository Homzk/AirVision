import type { ReactNode } from 'react'
import { CircleMarker } from 'react-leaflet'

import { computeWorstLevel, levelToColor } from '@/lib/airQuality'
import type { StationWithLatest } from '@/types/domain'

interface StationMarkerProps {
  station: StationWithLatest
  onSelect: (id: number) => void
  children?: ReactNode
}

export function StationMarker({ station, onSelect, children }: StationMarkerProps) {
  const level = station.latest ? computeWorstLevel(station.latest) : 'no_data'
  const color = levelToColor(level)

  return (
    <CircleMarker
      center={[station.latitude, station.longitude]}
      radius={10}
      pathOptions={{
        color: '#ffffff',
        weight: 2,
        fillColor: color,
        fillOpacity: 0.9,
      }}
      eventHandlers={{
        click: () => onSelect(station.id),
      }}
    >
      {children}
    </CircleMarker>
  )
}
