import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { ClusterPoint } from '@/hooks/useSupercluster'
import { useSupercluster } from '@/hooks/useSupercluster'

// Two points very close together near Santiago, one far south (Puerto Montt).
const points: ClusterPoint[] = [
  { lat: -33.4, lng: -70.6, stationId: 1 },
  { lat: -33.41, lng: -70.61, stationId: 2 },
  { lat: -41.47, lng: -72.94, stationId: 3 },
]

// Bounds covering continental Chile: [west, south, east, north].
const chileBounds: [number, number, number, number] = [-76, -56, -66, -17]

describe('useSupercluster', () => {
  it('returns nothing without bounds', () => {
    const { result } = renderHook(() => useSupercluster(points, { zoom: 5, bounds: null }))
    expect(result.current.clusters).toEqual([])
  })

  it('groups nearby points into a cluster at low zoom', () => {
    const { result } = renderHook(() => useSupercluster(points, { zoom: 4, bounds: chileBounds }))
    const clusters = result.current.clusters.filter((c) => c.type === 'cluster')
    expect(clusters.length).toBeGreaterThanOrEqual(1)
    // The two Santiago points should be grouped together.
    const totalClustered = clusters.reduce(
      (sum, c) => sum + (c.type === 'cluster' ? c.count : 0),
      0,
    )
    expect(totalClustered).toBeGreaterThanOrEqual(2)
  })

  it('returns individual leaves at high zoom', () => {
    const { result } = renderHook(() => useSupercluster(points, { zoom: 16, bounds: chileBounds }))
    const leaves = result.current.clusters.filter((c) => c.type === 'leaf')
    expect(leaves).toHaveLength(3)
  })

  it('getLeafCoords returns every station inside a cluster', () => {
    const { result } = renderHook(() => useSupercluster(points, { zoom: 4, bounds: chileBounds }))
    const cluster = result.current.clusters.find((c) => c.type === 'cluster')
    expect(cluster).toBeDefined()
    if (cluster?.type === 'cluster') {
      const leaves = result.current.getLeafCoords(cluster.clusterId)
      expect(leaves.length).toBe(cluster.count)
      expect(leaves.length).toBeGreaterThanOrEqual(2)
    }
  })
})
