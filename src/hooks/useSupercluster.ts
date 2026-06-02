import { useMemo } from 'react'
import Supercluster from 'supercluster'

/** A station reduced to the minimum needed for clustering. */
export interface ClusterPoint {
  lat: number
  lng: number
  stationId: number
}

/** Current map view: integer-ish zoom and bounds as [west, south, east, north]. */
export interface MapViewState {
  zoom: number
  bounds: [number, number, number, number] | null
}

export type ClusterResult =
  | { type: 'cluster'; lat: number; lng: number; count: number; clusterId: number }
  | { type: 'leaf'; lat: number; lng: number; stationId: number }

type PointProps = { stationId: number }

/**
 * Clusters the given (already filtered) points for the current map view using
 * Supercluster. The clustering is a pure function of points + zoom + bounds,
 * so the component layer stays declarative and reacts to filters automatically.
 */
export function useSupercluster(points: ClusterPoint[], view: MapViewState): ClusterResult[] {
  const index = useMemo(() => {
    const sc = new Supercluster<PointProps>({ radius: 60, maxZoom: 16 })
    sc.load(
      points.map((p) => ({
        type: 'Feature' as const,
        properties: { stationId: p.stationId },
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      })),
    )
    return sc
  }, [points])

  return useMemo(() => {
    if (!view.bounds) return []
    return index.getClusters(view.bounds, Math.round(view.zoom)).map((feature) => {
      const [lng = 0, lat = 0] = feature.geometry.coordinates
      if ('cluster' in feature.properties && feature.properties.cluster) {
        return {
          type: 'cluster' as const,
          lat,
          lng,
          count: feature.properties.point_count,
          clusterId: feature.properties.cluster_id,
        }
      }
      return { type: 'leaf' as const, lat, lng, stationId: feature.properties.stationId }
    })
  }, [index, view.bounds, view.zoom])
}
