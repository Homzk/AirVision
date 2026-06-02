import L from 'leaflet'
import { useMemo, useState } from 'react'
import { Marker, Popup, useMap, useMapEvents } from 'react-leaflet'

import { useSupercluster, type MapViewState } from '@/hooks/useSupercluster'
import { useDashboardStore } from '@/stores/dashboardStore'
import type { StationWithLatest } from '@/types/domain'

import { StationMarker } from './StationMarker'
import { StationPopup } from './StationPopup'

interface StationClusterLayerProps {
  stations: StationWithLatest[]
}

const MAX_CLUSTER_ZOOM = 16

function readView(map: L.Map): MapViewState {
  const b = map.getBounds()
  return {
    zoom: map.getZoom(),
    bounds: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()],
  }
}

/** A round badge showing how many stations a cluster contains. Inline styles
 *  so Tailwind's purge never strips it (the HTML lives outside the React tree). */
function clusterIcon(count: number) {
  return L.divIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:9999px;background:rgba(37,99,235,0.85);color:#fff;font-weight:600;font-size:13px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3)">${count}</div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  })
}

/**
 * Renders the (already filtered) stations as Supercluster output: grouped
 * stations become a count badge that zooms in on click; individual stations
 * keep the regular StationMarker + popup. Recomputes on pan/zoom and whenever
 * the filtered set changes.
 */
export function StationClusterLayer({ stations }: StationClusterLayerProps) {
  const map = useMap()
  const [view, setView] = useState<MapViewState>(() => readView(map))
  useMapEvents({
    moveend: () => setView(readView(map)),
    zoomend: () => setView(readView(map)),
  })

  const setSelectedStationId = useDashboardStore((s) => s.setSelectedStationId)

  const stationById = useMemo(() => new Map(stations.map((s) => [s.id, s])), [stations])
  const points = useMemo(
    () => stations.map((s) => ({ lat: s.latitude, lng: s.longitude, stationId: s.id })),
    [stations],
  )
  const { clusters, getLeafCoords } = useSupercluster(points, view)

  return (
    <>
      {clusters.map((item) => {
        if (item.type === 'cluster') {
          return (
            <Marker
              key={`cluster-${item.clusterId}`}
              position={[item.lat, item.lng]}
              icon={clusterIcon(item.count)}
              eventHandlers={{
                // Frame every station in the cluster at once instead of a fixed zoom step.
                click: () => {
                  const leaves = getLeafCoords(item.clusterId)
                  if (leaves.length === 0) return
                  const bounds = L.latLngBounds(
                    leaves.map((c) => [c.lat, c.lng] as [number, number]),
                  )
                  map.fitBounds(bounds, { padding: [60, 60], maxZoom: MAX_CLUSTER_ZOOM })
                },
              }}
            />
          )
        }
        const station = stationById.get(item.stationId)
        if (!station) return null
        return (
          <StationMarker key={`leaf-${station.id}`} station={station}>
            <Popup>
              <StationPopup station={station} onOpenTrends={setSelectedStationId} />
            </Popup>
          </StationMarker>
        )
      })}
    </>
  )
}
