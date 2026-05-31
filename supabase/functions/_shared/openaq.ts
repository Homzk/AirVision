// Cliente tipado de OpenAQ v3 + lógica pura de ingesta para AirVision.
// Validado contra la API real (2026-05-30). Contrato de referencia:
// specs/001-air-quality-dashboard/contracts/edge-functions.md
//
// Este módulo NO toca la base de datos: solo habla con OpenAQ y transforma
// el payload. El I/O de Supabase vive en las funciones que lo importan.

const BASE = 'https://api.openaq.org/v3'

/** IDs de parámetro reales de OpenAQ v3 (variante µg/m³ mass). */
export const PARAM_ID = { pm10: 1, pm25: 2, o3: 3 } as const
export type Pollutant = keyof typeof PARAM_ID

const PARAM_ID_TO_POLLUTANT: Record<number, Pollutant> = { 1: 'pm10', 2: 'pm25', 3: 'o3' }

/**
 * Umbrales "hazardous" (µg/m³) — duplicados de `src/lib/airQuality.ts`
 * (OMS_THRESHOLDS). Una lectura > 10× hazardous se considera outlier/sensor
 * roto y se descarta. Mantener sincronizado con el frontend.
 */
const HAZARDOUS: Record<Pollutant, number> = { pm25: 50, pm10: 150, o3: 180 }

/** Bounding box de Chile (min_lon,min_lat,max_lon,max_lat) para OpenAQ. */
export const BBOX_CHILE = '-75.7,-56.0,-66.5,-17.5'

export interface OpenAQLocation {
  id: number
  name: string
  locality: string | null
  coordinates: { latitude: number; longitude: number }
  country: { code: string }
  datetimeLast: { utc: string } | null
  sensors: { id: number; parameter: { id: number; name: string; units: string } }[]
}

export interface OpenAQLatest {
  sensorsId: number
  value: number
  datetime: { utc: string }
  locationsId: number
}

export interface NormalizedReading {
  station_id: number
  measured_at: string
  pm25: number | null
  pm10: number | null
  o3: number | null
}

export interface NormalizeResult {
  reading: NormalizedReading | null
  skippedStale: number
  skippedInvalid: number
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/** Serializa cualquier throw a string legible (los errores de supabase-js son objetos planos). */
export function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object') {
    try {
      return JSON.stringify(e)
    } catch {
      return String(e)
    }
  }
  return String(e)
}

function apiKey(): string {
  return Deno.env.get('OPENAQ_API_KEY') ?? ''
}

/**
 * GET con header X-API-Key y reintentos con backoff exponencial (1s/2s/4s)
 * ante 429 (rate limit) o 5xx. Otros errores HTTP lanzan inmediatamente.
 */
async function fetchJson(path: string, attempt = 0): Promise<{ results?: unknown[] }> {
  const res = await fetch(`${BASE}${path}`, { headers: { 'X-API-Key': apiKey() } })
  if ((res.status === 429 || res.status >= 500) && attempt < 3) {
    await sleep(1000 * 2 ** attempt)
    return fetchJson(path, attempt + 1)
  }
  if (!res.ok) throw new Error(`OpenAQ ${res.status} en ${path}`)
  return await res.json()
}

/** Itera todas las locations chilenas con sensor pm10/pm25/o3 (paginación auto). */
export async function* fetchLocations(bbox: string = BBOX_CHILE): AsyncIterable<OpenAQLocation> {
  for (let page = 1;; page++) {
    const data = await fetchJson(
      `/locations?parameters_id=1,2,3&bbox=${bbox}&limit=1000&page=${page}`,
    )
    const results = (data.results ?? []) as OpenAQLocation[]
    for (const loc of results) yield loc
    if (results.length < 1000) break
  }
}

/** Snapshot actual (último valor por sensor) de una estación. */
export async function fetchLocationLatest(locationId: number): Promise<OpenAQLatest[]> {
  const data = await fetchJson(`/locations/${locationId}/latest`)
  return (data.results ?? []) as OpenAQLatest[]
}

/** Mapa sensorsId → contaminante de una estación (ignora sensores no2/co/so2/…). */
export function sensorCatalogOf(location: OpenAQLocation): Map<number, Pollutant> {
  const m = new Map<number, Pollutant>()
  for (const s of location.sensors) {
    const p = PARAM_ID_TO_POLLUTANT[s.parameter.id]
    if (p) m.set(s.id, p)
  }
  return m
}

/** Una lectura es inválida si no es finita, es negativa, o supera 10× hazardous. */
export function isInvalidReading(pollutant: Pollutant, value: number): boolean {
  if (!Number.isFinite(value)) return true
  if (value < 0) return true
  return value > 10 * HAZARDOUS[pollutant]
}

/**
 * Regla R-fresh: una medición es rancia si su instante es más antiguo que
 * `maxAgeHours` respecto a `now`. Atrapa sensores muertos (que en /latest
 * devuelven su último valor histórico, ej. O₃ de 2021).
 */
export function isStale(measuredAtUtc: string, now: Date, maxAgeHours = 3): boolean {
  const t = Date.parse(measuredAtUtc)
  if (Number.isNaN(t)) return true
  const ageHours = (now.getTime() - t) / 3_600_000
  return ageHours > maxAgeHours
}

/**
 * Convierte el snapshot /latest (formato largo, una fila por sensor) en UNA
 * lectura ancha por estación, descartando contaminantes inválidos y rancios.
 * `measured_at` es el instante más reciente entre los contaminantes frescos.
 * Devuelve `reading: null` si no queda ningún contaminante válido y fresco.
 */
export function normalizeLatest(
  locationId: number,
  latest: OpenAQLatest[],
  sensorCatalog: Map<number, Pollutant>,
  now: Date,
  maxAgeHours = 3,
): NormalizeResult {
  const values: Record<Pollutant, number | null> = { pm25: null, pm10: null, o3: null }
  let measuredAt: string | null = null
  let skippedStale = 0
  let skippedInvalid = 0

  for (const m of latest) {
    const pollutant = sensorCatalog.get(m.sensorsId)
    if (!pollutant) continue // sensor de otro contaminante (no2/co/so2/…)
    if (isStale(m.datetime.utc, now, maxAgeHours)) {
      skippedStale++
      continue
    }
    if (isInvalidReading(pollutant, m.value)) {
      skippedInvalid++
      continue
    }
    values[pollutant] = m.value
    if (measuredAt === null || m.datetime.utc > measuredAt) measuredAt = m.datetime.utc
  }

  if (measuredAt === null) {
    return { reading: null, skippedStale, skippedInvalid }
  }
  return {
    reading: { station_id: locationId, measured_at: measuredAt, ...values },
    skippedStale,
    skippedInvalid,
  }
}
