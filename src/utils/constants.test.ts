import { describe, expect, it } from 'vitest'

import {
  DEFAULT_MAP_VIEW,
  POLLUTANT_LABELS,
  POLLUTANT_UNITS,
  TIME_RANGE_LABELS,
  TIME_RANGES,
} from '@/utils/constants'

describe('constants', () => {
  it('labels the three pollutants in Spanish-compatible notation', () => {
    expect(POLLUTANT_LABELS).toEqual({ pm25: 'PM2.5', pm10: 'PM10', o3: 'O₃' })
  })

  it('uses µg/m³ as the unit for the three pollutants', () => {
    expect(POLLUTANT_UNITS.pm25).toBe('µg/m³')
    expect(POLLUTANT_UNITS.pm10).toBe('µg/m³')
    expect(POLLUTANT_UNITS.o3).toBe('µg/m³')
  })

  it('centers the default map view inside Chile bounds', () => {
    const [lat, lon] = DEFAULT_MAP_VIEW.center
    expect(lat).toBeGreaterThanOrEqual(DEFAULT_MAP_VIEW.bounds.south)
    expect(lat).toBeLessThanOrEqual(DEFAULT_MAP_VIEW.bounds.north)
    expect(lon).toBeGreaterThanOrEqual(DEFAULT_MAP_VIEW.bounds.west)
    expect(lon).toBeLessThanOrEqual(DEFAULT_MAP_VIEW.bounds.east)
  })

  it('exposes the three time ranges with matching labels', () => {
    expect(TIME_RANGES).toEqual(['6h', '24h', '7d'])
    for (const range of TIME_RANGES) {
      expect(TIME_RANGE_LABELS[range]).toBeDefined()
    }
  })
})
