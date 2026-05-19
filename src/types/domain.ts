import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']
type Views = Database['public']['Views']

export type Station = Tables['stations']['Row']
export type Reading = Tables['readings']['Row']
export type LatestReadingRow = Views['latest_station_readings']['Row']

export interface LatestReading {
  measured_at: string
  pm25: number | null
  pm10: number | null
  o3: number | null
}

export interface StationWithLatest extends Station {
  latest: LatestReading | null
}
