import { useEffect, useMemo } from 'react'
import { MapContainer, Popup, TileLayer } from 'react-leaflet'

import { useReadingsRealtime } from '@/hooks/useReadingsRealtime'
import { useDashboardStore } from '@/stores/dashboardStore'
import type { StationWithLatest } from '@/types/domain'
import { DEFAULT_MAP_VIEW } from '@/utils/constants'

import { MapLegend } from './MapLegend'
import { StationMarker } from './StationMarker'
import { StationPopup } from './StationPopup'

interface MapViewProps {
  stations: StationWithLatest[]
}

export function MapView({ stations }: MapViewProps) {
  const setStations = useDashboardStore((s) => s.setStations)
  const stationsById = useDashboardStore((s) => s.stationsById)
  const applyNewReading = useDashboardStore((s) => s.applyNewReading)
  const setSelectedStationId = useDashboardStore((s) => s.setSelectedStationId)

  useEffect(() => {
    setStations(stations)
  }, [stations, setStations])

  useReadingsRealtime(applyNewReading)

  const liveStations = useMemo(() => Object.values(stationsById), [stationsById])

  return (
    <div className="relative h-[calc(100vh-3.5rem-4rem)] w-full md:h-[calc(100vh-3.5rem)]">
      <MapContainer
        center={DEFAULT_MAP_VIEW.center}
        zoom={DEFAULT_MAP_VIEW.zoom}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
        />
        {liveStations.map((station) => (
          <StationMarker key={station.id} station={station} onSelect={setSelectedStationId}>
            <Popup>
              <StationPopup station={station} onOpenTrends={setSelectedStationId} />
            </Popup>
          </StationMarker>
        ))}
      </MapContainer>
      <MapLegend />
    </div>
  )
}
