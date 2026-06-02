import { computeWorstLevel, type Level } from '@/lib/airQuality'
import type { StationWithLatest } from '@/types/domain'

/** A geographic coordinate used for proximity sorting. */
export interface Coords {
  lat: number
  lng: number
}

/** Active filter criteria. Mirrors the shape held by the filters store. */
export interface StationFilters {
  searchTerm: string
  showNoData: boolean
  selectedLevels: Level[]
  nearMe: { active: boolean; coords: Coords | null }
}

/** Derived view: the visible stations plus the counts behind "X de Y". */
export interface VisibleResult {
  visible: StationWithLatest[]
  total: number
  shownCount: number
}

/** Minimum characters before the search term filters anything. */
export const MIN_QUERY_LENGTH = 2

// Combining diacritical marks (U+0300-U+036F), stripped after NFD decomposition.
// Built from an ASCII escape so the source stays free of literal combining chars.
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g')

/**
 * Lowercase and strip diacritics so search is case- and accent-insensitive:
 * "Nuñoa" -> "nunoa", "Valparaíso" -> "valparaiso". Chilean users type without
 * accents, so this avoids false negatives.
 */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(DIACRITICS, '').toLocaleLowerCase('es')
}

/** Worst-of air-quality level for a station, or 'no_data' when it has no recent reading. */
export function stationLevel(station: StationWithLatest): Level {
  return station.latest ? computeWorstLevel(station.latest) : 'no_data'
}

/**
 * True if the station's name or city contains the normalized query. A query
 * shorter than MIN_QUERY_LENGTH matches everything (the search is inactive).
 */
export function matchesQuery(station: StationWithLatest, query: string): boolean {
  const q = normalize(query.trim())
  if (q.length < MIN_QUERY_LENGTH) return true
  return [station.name, station.city ?? ''].some((field) => normalize(field).includes(q))
}

/**
 * Apply all active filters to the station set and report the counts.
 *
 * Filter types combine with AND (search AND level AND no-data); within the
 * level filter, multiple selected levels combine with OR. Proximity (nearMe)
 * only reorders the result — it never removes stations.
 */
export function applyFilters(
  stations: StationWithLatest[],
  filters: StationFilters,
): VisibleResult {
  const { searchTerm, showNoData, selectedLevels, nearMe } = filters
  const hasQuery = normalize(searchTerm.trim()).length >= MIN_QUERY_LENGTH
  const hasLevelFilter = selectedLevels.length > 0

  let visible = stations.filter((station) => {
    // Rule 1: hide stations without recent data unless explicitly shown.
    if (!showNoData && station.latest === null) return false
    // Rule 2: level filter — OR across the selected levels.
    if (hasLevelFilter && !selectedLevels.includes(stationLevel(station))) return false
    // Rule 3: search by name/city.
    if (hasQuery && !matchesQuery(station, searchTerm)) return false
    return true
  })

  // Rule 5: proximity sorts, it does not filter.
  if (nearMe.active && nearMe.coords) {
    visible = sortByProximity(visible, nearMe.coords)
  }

  return { visible, total: stations.length, shownCount: visible.length }
}

const EARTH_RADIUS_KM = 6371

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/** Great-circle distance in kilometres between two coordinates (haversine formula). */
export function haversineKm(a: Coords, b: Coords): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

/** Stations sorted ascending by distance to `coords`. Does not mutate the input. */
export function sortByProximity(
  stations: StationWithLatest[],
  coords: Coords,
): StationWithLatest[] {
  return [...stations].sort(
    (a, b) =>
      haversineKm(coords, { lat: a.latitude, lng: a.longitude }) -
      haversineKm(coords, { lat: b.latitude, lng: b.longitude }),
  )
}
