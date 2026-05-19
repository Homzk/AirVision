import { useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import type { Reading } from '@/types/domain'
import type { TimeRange } from '@/utils/constants'
import { rangeToSince } from '@/utils/date'

export interface StationReadingPoint {
  measured_at: string
  pm25: number | null
  pm10: number | null
  o3: number | null
}

interface UseStationReadingsResult {
  readings: StationReadingPoint[]
  isLoading: boolean
  error: Error | null
}

/**
 * Trae las lecturas de una estación dentro del rango temporal y se mantiene
 * actualizado vía Realtime. Cuando `stationId` es null el hook queda en
 * reposo (sin fetch ni subscripción).
 */
export function useStationReadings(
  stationId: number | null,
  range: TimeRange,
): UseStationReadingsResult {
  const [readings, setReadings] = useState<StationReadingPoint[]>([])
  const [isLoading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (stationId === null) {
      setReadings([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const sinceDate = rangeToSince(range)
    const sinceIso = sinceDate.toISOString()
    const sinceMs = sinceDate.getTime()

    void (async () => {
      const { data, error: qError } = await supabase
        .from('readings')
        .select('measured_at, pm25, pm10, o3')
        .eq('station_id', stationId)
        .gte('measured_at', sinceIso)
        .order('measured_at', { ascending: true })

      if (cancelled) return
      if (qError) {
        setError(new Error(qError.message))
        setReadings([])
        setLoading(false)
        return
      }
      setReadings(data ?? [])
      setLoading(false)
    })()

    const channel = supabase
      .channel(`readings:station:${stationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'readings',
          filter: `station_id=eq.${stationId}`,
        },
        (payload) => {
          const r = payload.new as Reading
          if (new Date(r.measured_at).getTime() < sinceMs) return
          setReadings((prev) => {
            if (prev.length > 0 && prev[prev.length - 1]?.measured_at === r.measured_at) {
              return prev
            }
            return [
              ...prev,
              {
                measured_at: r.measured_at,
                pm25: r.pm25,
                pm10: r.pm10,
                o3: r.o3,
              },
            ]
          })
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [stationId, range])

  return { readings, isLoading, error }
}
