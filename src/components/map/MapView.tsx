import { useEffect, useMemo } from 'react'
import { MapContainer, Popup, TileLayer } from 'react-leaflet'

import { useReadingsRealtime } from '@/hooks/useReadingsRealtime'
import { applyFilters } from '@/lib/stationFilters'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useFiltersStore } from '@/stores/filtersStore'
import { useRealtimeStore } from '@/stores/realtimeStore'
import type { StationWithLatest } from '@/types/domain'
import { DEFAULT_MAP_VIEW } from '@/utils/constants'

import { MapController } from './MapController'
import { MapFilters } from './MapFilters'
import { MapLegend } from './MapLegend'
import { StationCounter } from './StationCounter'
import { StationMarker } from './StationMarker'
import { StationPopup } from './StationPopup'
import { StationSearch } from './StationSearch'

interface MapViewProps {
  stations: StationWithLatest[]
}

export function MapView({ stations }: MapViewProps) {
  const setStations = useDashboardStore((s) => s.setStations)
  const stationsById = useDashboardStore((s) => s.stationsById)
  const applyNewReading = useDashboardStore((s) => s.applyNewReading)
  const setSelectedStationId = useDashboardStore((s) => s.setSelectedStationId)

  const setRealtimeStatus = useRealtimeStore((s) => s.setStatus)

  const searchTerm = useFiltersStore((s) => s.searchTerm)
  const showNoData = useFiltersStore((s) => s.showNoData)
  const selectedLevels = useFiltersStore((s) => s.selectedLevels)
  const nearMe = useFiltersStore((s) => s.nearMe)

  useEffect(() => {
    setStations(stations)
  }, [stations, setStations])

  const { status: realtimeStatus } = useReadingsRealtime(applyNewReading)

  // Publica el estado del canal para que el indicador del header lo refleje,
  // y lo restaura a CONNECTED al salir del mapa (el canal se cierra al desmontar).
  useEffect(() => {
    setRealtimeStatus(realtimeStatus)
  }, [realtimeStatus, setRealtimeStatus])

  useEffect(() => {
    return () => setRealtimeStatus('CONNECTED')
  }, [setRealtimeStatus])

  const liveStations = useMemo(() => Object.values(stationsById), [stationsById])

  // Only the stations that pass the active filters are rendered on the map.
  const visibleStations = useMemo(
    () => applyFilters(liveStations, { searchTerm, showNoData, selectedLevels, nearMe }).visible,
    [liveStations, searchTerm, showNoData, selectedLevels, nearMe],
  )

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
        <MapController />
        {visibleStations.map((station) => (
          <StationMarker key={station.id} station={station}>
            <Popup>
              <StationPopup station={station} onOpenTrends={setSelectedStationId} />
            </Popup>
          </StationMarker>
        ))}
      </MapContainer>
      <div className="pointer-events-auto absolute left-4 top-4 z-[1000]">
        <StationSearch />
      </div>
      <div className="pointer-events-auto absolute right-4 top-4 z-[1000] max-w-[calc(100vw-2rem)]">
        <MapFilters />
      </div>
      <div className="pointer-events-auto absolute bottom-4 left-4 z-[1000]">
        <StationCounter />
      </div>
      <MapLegend />
    </div>
  )
}
