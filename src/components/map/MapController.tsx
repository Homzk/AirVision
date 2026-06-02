import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

import { useDashboardStore } from '@/stores/dashboardStore'
import { useFiltersStore } from '@/stores/filtersStore'

/** Zoom level applied when flying to a chosen station or the user's location. */
const FLY_TO_ZOOM = 11

/**
 * Invisible bridge between the filters store and the imperative Leaflet map.
 * Lives inside <MapContainer>. When the store requests a `flyToTarget`
 * (from the search box or "near me"), it pans the map there, opens the
 * station detail (via `selectedStationId`) and consumes the one-shot request.
 */
export function MapController() {
  const map = useMap()
  const flyToTarget = useFiltersStore((s) => s.flyToTarget)
  const consumeFlyTo = useFiltersStore((s) => s.consumeFlyTo)
  const setSelectedStationId = useDashboardStore((s) => s.setSelectedStationId)

  useEffect(() => {
    if (!flyToTarget) return
    map.flyTo([flyToTarget.lat, flyToTarget.lng], FLY_TO_ZOOM)
    if (flyToTarget.stationId !== null) {
      setSelectedStationId(flyToTarget.stationId)
    }
    consumeFlyTo()
  }, [flyToTarget, map, setSelectedStationId, consumeFlyTo])

  return null
}
