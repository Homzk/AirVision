import { useCallback, useEffect, useState } from 'react'

import { supabase } from '@/lib/supabase'
import type { LatestReadingRow, StationWithLatest } from '@/types/domain'

interface UseStationsResult {
  stations: StationWithLatest[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

/**
 * Trae todas las estaciones + su última lectura. Hace dos queries en paralelo
 * (`stations` y `latest_station_readings`) y une los resultados client-side.
 * Esto evita confiar en embedded joins de PostgREST sobre vistas y permite
 * mostrar estaciones que aún no tienen lecturas (`latest: null`).
 */
export function useStations(): UseStationsResult {
  const [stations, setStations] = useState<StationWithLatest[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [stationsRes, latestRes] = await Promise.all([
      supabase
        .from('stations')
        .select('id, name, latitude, longitude, country_code, city, created_at'),
      supabase.from('latest_station_readings').select('*'),
    ])

    if (stationsRes.error) {
      setError(new Error(stationsRes.error.message))
      setLoading(false)
      return
    }
    if (latestRes.error) {
      setError(new Error(latestRes.error.message))
      setLoading(false)
      return
    }

    const latestByStation = new Map<number, LatestReadingRow>()
    for (const row of latestRes.data ?? []) {
      if (row.station_id !== null) latestByStation.set(row.station_id, row)
    }

    const merged: StationWithLatest[] = (stationsRes.data ?? []).map((s) => {
      const row = latestByStation.get(s.id)
      return {
        ...s,
        latest:
          row && row.measured_at !== null
            ? {
                measured_at: row.measured_at,
                pm25: row.pm25,
                pm10: row.pm10,
                o3: row.o3,
              }
            : null,
      }
    })

    setStations(merged)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { stations, isLoading, error, refresh }
}
