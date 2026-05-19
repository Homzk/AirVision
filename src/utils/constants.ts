import type { Pollutant } from '@/lib/airQuality'

export const POLLUTANT_LABELS: Record<Pollutant, string> = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  o3: 'O₃',
}

export const POLLUTANT_UNITS: Record<Pollutant, string> = {
  pm25: 'µg/m³',
  pm10: 'µg/m³',
  o3: 'µg/m³',
}

/** Vista por defecto del mapa: centrada aproximadamente en Chile continental. */
export const DEFAULT_MAP_VIEW = {
  center: [-35.6751, -71.543] as [number, number],
  zoom: 5,
  bounds: {
    south: -56,
    north: -17,
    west: -76,
    east: -66,
  },
} as const

export type TimeRange = '6h' | '24h' | '7d'

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '6h': '6 h',
  '24h': '24 h',
  '7d': '7 d',
}

export const TIME_RANGES: readonly TimeRange[] = ['6h', '24h', '7d'] as const
