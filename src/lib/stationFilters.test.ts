import { describe, expect, it } from 'vitest'

import type { StationFilters } from '@/lib/stationFilters'
import {
  applyFilters,
  haversineKm,
  matchesQuery,
  normalize,
  sortByProximity,
  stationLevel,
} from '@/lib/stationFilters'
import type { LatestReading, StationWithLatest } from '@/types/domain'

function makeStation(
  fields: Pick<StationWithLatest, 'id' | 'name' | 'latitude' | 'longitude'> &
    Partial<Pick<StationWithLatest, 'city' | 'latest'>>,
): StationWithLatest {
  return {
    country_code: 'CL',
    created_at: '2026-01-01T00:00:00Z',
    city: null,
    latest: null,
    ...fields,
  }
}

function reading(pm25: number): LatestReading {
  return { measured_at: '2026-06-02T12:00:00Z', pm25, pm10: null, o3: null }
}

// Fixtures with known worst-of levels (pm25 thresholds: moderate>=15, unhealthy>=25, hazardous>=50).
const tocopilla = makeStation({
  id: 1,
  name: 'Tocopilla',
  city: 'Tocopilla',
  latitude: -22.09,
  longitude: -70.2,
  latest: reading(10), // good
})
const lasCondes = makeStation({
  id: 2,
  name: 'Las Condes',
  city: 'Santiago',
  latitude: -33.41,
  longitude: -70.57,
  latest: reading(30), // unhealthy
})
const puertoMontt = makeStation({
  id: 3,
  name: 'Puerto Montt',
  city: 'Puerto Montt',
  latitude: -41.47,
  longitude: -72.94,
  latest: null, // no_data
})
const valparaiso = makeStation({
  id: 4,
  name: 'Valparaíso Centro',
  city: 'Valparaíso',
  latitude: -33.05,
  longitude: -71.62,
  latest: reading(60), // hazardous
})

const ALL = [tocopilla, lasCondes, puertoMontt, valparaiso]

const baseFilters: StationFilters = {
  searchTerm: '',
  showNoData: false,
  selectedLevels: [],
  nearMe: { active: false, coords: null },
}

describe('normalize', () => {
  it('strips accents and lowercases', () => {
    expect(normalize('Valparaíso')).toBe('valparaiso')
    expect(normalize('TOCOPILLA')).toBe('tocopilla')
    expect(normalize('Ñuñoa')).toBe('nunoa')
  })
})

describe('stationLevel', () => {
  it('returns the worst-of level, or no_data without a reading', () => {
    expect(stationLevel(tocopilla)).toBe('good')
    expect(stationLevel(lasCondes)).toBe('unhealthy')
    expect(stationLevel(valparaiso)).toBe('hazardous')
    expect(stationLevel(puertoMontt)).toBe('no_data')
  })
})

describe('matchesQuery', () => {
  it('matches by name and city, ignoring case and accents', () => {
    expect(matchesQuery(tocopilla, 'tocopilla')).toBe(true)
    expect(matchesQuery(valparaiso, 'valpara')).toBe(true) // accent-insensitive
    expect(matchesQuery(lasCondes, 'santiago')).toBe(true) // matches city
    expect(matchesQuery(tocopilla, 'temuco')).toBe(false)
  })

  it('treats queries shorter than the minimum as a match (inactive search)', () => {
    expect(matchesQuery(tocopilla, 'x')).toBe(true)
    expect(matchesQuery(tocopilla, '')).toBe(true)
  })
})

describe('applyFilters', () => {
  it('hides stations without recent data by default', () => {
    const { visible, total, shownCount } = applyFilters(ALL, baseFilters)
    expect(visible.map((s) => s.id)).not.toContain(puertoMontt.id)
    expect(total).toBe(4)
    expect(shownCount).toBe(3)
  })

  it('shows no-data stations when showNoData is true', () => {
    const result = applyFilters(ALL, { ...baseFilters, showNoData: true })
    expect(result.shownCount).toBe(4)
    expect(result.visible.map((s) => s.id)).toContain(puertoMontt.id)
  })

  it('filters by level with OR across the selected levels', () => {
    const result = applyFilters(ALL, {
      ...baseFilters,
      selectedLevels: ['unhealthy', 'hazardous'],
    })
    expect(result.visible.map((s) => s.id).sort()).toEqual([lasCondes.id, valparaiso.id])
  })

  it('combines search and level filters with AND', () => {
    const result = applyFilters(ALL, {
      ...baseFilters,
      searchTerm: 'valpara',
      selectedLevels: ['hazardous'],
    })
    expect(result.visible.map((s) => s.id)).toEqual([valparaiso.id])
  })

  it('reports zero results when no station matches', () => {
    const result = applyFilters(ALL, { ...baseFilters, searchTerm: 'inexistente' })
    expect(result.shownCount).toBe(0)
    expect(result.total).toBe(4)
  })

  it('orders by proximity when nearMe is active, without removing stations', () => {
    const santiago = { lat: -33.45, lng: -70.66 }
    const result = applyFilters(ALL, {
      ...baseFilters,
      showNoData: true,
      nearMe: { active: true, coords: santiago },
    })
    expect(result.shownCount).toBe(4)
    expect(result.visible[0]?.id).toBe(lasCondes.id) // nearest to Santiago
  })
})

describe('haversineKm', () => {
  it('computes Santiago<->Valparaíso at roughly 100 km', () => {
    const d = haversineKm({ lat: -33.45, lng: -70.66 }, { lat: -33.05, lng: -71.62 })
    expect(d).toBeGreaterThan(85)
    expect(d).toBeLessThan(120)
  })

  it('is zero for identical points', () => {
    expect(haversineKm({ lat: -33, lng: -70 }, { lat: -33, lng: -70 })).toBeCloseTo(0)
  })
})

describe('sortByProximity', () => {
  it('sorts ascending by distance and does not mutate the input', () => {
    const santiago = { lat: -33.45, lng: -70.66 }
    const input = [...ALL]
    const sorted = sortByProximity(input, santiago)

    const distances = sorted.map((s) =>
      haversineKm(santiago, { lat: s.latitude, lng: s.longitude }),
    )
    const ascending = [...distances].sort((a, b) => a - b)
    expect(distances).toEqual(ascending)
    expect(sorted[0]?.id).toBe(lasCondes.id)
    expect(input).toEqual(ALL) // original order untouched
  })
})
