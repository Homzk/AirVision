import { assertEquals, assertExists } from '@std/assert'

import {
  fetchLocationLatest,
  fetchLocations,
  isInvalidReading,
  isStale,
  normalizeLatest,
  type OpenAQLatest,
  type OpenAQLocation,
  type Pollutant,
  sensorCatalogOf,
} from './openaq.ts'

const NOW = new Date('2026-05-30T22:00:00Z')

// --- Helper: mockear globalThis.fetch con una cola de respuestas ---------
function withFetch(
  handler: (url: string) => { status?: number; body: unknown },
  fn: () => Promise<void>,
): () => Promise<void> {
  return async () => {
    const original = globalThis.fetch
    globalThis.fetch = (input: string | URL | Request): Promise<Response> => {
      const url = typeof input === 'string' ? input : input.toString()
      const { status = 200, body } = handler(url)
      return Promise.resolve(
        new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
      )
    }
    try {
      await fn()
    } finally {
      globalThis.fetch = original
    }
  }
}

// --- isInvalidReading -----------------------------------------------------
Deno.test('isInvalidReading: descarta negativos, NaN y outliers > 10x hazardous', () => {
  assertEquals(isInvalidReading('pm25', -1), true)
  assertEquals(isInvalidReading('pm25', NaN), true)
  assertEquals(isInvalidReading('pm25', 501), true) // 10 * 50
  assertEquals(isInvalidReading('pm10', 1501), true) // 10 * 150
  assertEquals(isInvalidReading('o3', 1801), true) // 10 * 180
  assertEquals(isInvalidReading('pm25', 0), false)
  assertEquals(isInvalidReading('pm25', 67), false)
  assertEquals(isInvalidReading('pm10', 158), false)
})

// --- isStale --------------------------------------------------------------
Deno.test('isStale: fresco dentro del umbral, rancio fuera, fecha inválida = rancio', () => {
  assertEquals(isStale('2026-05-30T20:00:00Z', NOW), false) // 2 h < 3 h
  assertEquals(isStale('2026-05-30T19:30:00Z', NOW), false) // 2.5 h
  assertEquals(isStale('2026-05-30T18:30:00Z', NOW), true) // 3.5 h > 3 h
  assertEquals(isStale('2021-08-20T20:00:00Z', NOW), true) // sensor muerto
  assertEquals(isStale('no-es-fecha', NOW), true)
  assertEquals(isStale('2026-05-30T20:00:00Z', NOW, 1), true) // umbral 1 h
})

// --- sensorCatalogOf ------------------------------------------------------
Deno.test('sensorCatalogOf: mapea pm25/pm10/o3 e ignora no2/co/so2', () => {
  const loc = {
    sensors: [
      { id: 1044, parameter: { id: 2, name: 'pm25', units: 'µg/m³' } },
      { id: 1047, parameter: { id: 1, name: 'pm10', units: 'µg/m³' } },
      { id: 114, parameter: { id: 3, name: 'o3', units: 'µg/m³' } },
      { id: 1045, parameter: { id: 4, name: 'co', units: 'µg/m³' } },
      { id: 1046, parameter: { id: 5, name: 'no2', units: 'µg/m³' } },
    ],
  } as OpenAQLocation
  const cat = sensorCatalogOf(loc)
  assertEquals(cat.size, 3)
  assertEquals(cat.get(1044), 'pm25')
  assertEquals(cat.get(1047), 'pm10')
  assertEquals(cat.get(114), 'o3')
  assertEquals(cat.get(1045), undefined)
})

// --- normalizeLatest ------------------------------------------------------
const CATALOG = new Map<number, Pollutant>([
  [1044, 'pm25'],
  [1047, 'pm10'],
  [114, 'o3'],
])

function latest(partial: Partial<OpenAQLatest> & { sensorsId: number; value: number; utc: string }): OpenAQLatest {
  return {
    sensorsId: partial.sensorsId,
    value: partial.value,
    datetime: { utc: partial.utc },
    locationsId: 25,
  }
}

Deno.test('normalizeLatest: 3 contaminantes frescos → fila ancha completa', () => {
  const r = normalizeLatest(25, [
    latest({ sensorsId: 1044, value: 67, utc: '2026-05-30T20:00:00Z' }),
    latest({ sensorsId: 1047, value: 158, utc: '2026-05-30T20:00:00Z' }),
    latest({ sensorsId: 114, value: 40, utc: '2026-05-30T20:00:00Z' }),
  ], CATALOG, NOW)
  assertExists(r.reading)
  assertEquals(r.reading, { station_id: 25, measured_at: '2026-05-30T20:00:00Z', pm25: 67, pm10: 158, o3: 40 })
  assertEquals(r.skippedStale, 0)
  assertEquals(r.skippedInvalid, 0)
})

Deno.test('normalizeLatest: sensor O₃ muerto (2021) se descarta, pm25/pm10 pasan', () => {
  const r = normalizeLatest(25, [
    latest({ sensorsId: 1044, value: 67, utc: '2026-05-30T20:00:00Z' }),
    latest({ sensorsId: 1047, value: 158, utc: '2026-05-30T20:00:00Z' }),
    latest({ sensorsId: 114, value: 0.59, utc: '2021-08-20T20:00:00Z' }), // dead
  ], CATALOG, NOW)
  assertEquals(r.reading?.pm25, 67)
  assertEquals(r.reading?.pm10, 158)
  assertEquals(r.reading?.o3, null) // descartado por frescura
  assertEquals(r.skippedStale, 1)
})

Deno.test('normalizeLatest: valor negativo/outlier descartado', () => {
  const r = normalizeLatest(25, [
    latest({ sensorsId: 1044, value: -5, utc: '2026-05-30T20:00:00Z' }),
    latest({ sensorsId: 1047, value: 99999, utc: '2026-05-30T20:00:00Z' }),
    latest({ sensorsId: 114, value: 40, utc: '2026-05-30T20:00:00Z' }),
  ], CATALOG, NOW)
  assertEquals(r.reading?.pm25, null)
  assertEquals(r.reading?.pm10, null)
  assertEquals(r.reading?.o3, 40)
  assertEquals(r.skippedInvalid, 2)
})

Deno.test('normalizeLatest: cobertura parcial (solo pm25) → resto null', () => {
  const r = normalizeLatest(25, [
    latest({ sensorsId: 1044, value: 30, utc: '2026-05-30T20:00:00Z' }),
  ], CATALOG, NOW)
  assertEquals(r.reading, { station_id: 25, measured_at: '2026-05-30T20:00:00Z', pm25: 30, pm10: null, o3: null })
})

Deno.test('normalizeLatest: todos rancios → reading null', () => {
  const r = normalizeLatest(25, [
    latest({ sensorsId: 1044, value: 30, utc: '2020-01-01T00:00:00Z' }),
    latest({ sensorsId: 1047, value: 60, utc: '2019-01-01T00:00:00Z' }),
  ], CATALOG, NOW)
  assertEquals(r.reading, null)
  assertEquals(r.skippedStale, 2)
})

// --- cliente HTTP ---------------------------------------------------------
Deno.test('fetchLocationLatest: parsea results', withFetch(
  () => ({ body: { results: [{ sensorsId: 1044, value: 67, datetime: { utc: 'x' }, locationsId: 25 }] } }),
  async () => {
    const res = await fetchLocationLatest(25)
    assertEquals(res.length, 1)
    assertEquals(res[0].sensorsId, 1044)
  },
))

Deno.test('fetchLocations: pagina hasta recibir menos de 1000', withFetch(
  (url) => {
    const page = Number(new URL(url).searchParams.get('page'))
    // página 1: 1000 resultados; página 2: 1 resultado → corta
    const n = page === 1 ? 1000 : 1
    const results = Array.from({ length: n }, (_, i) => ({ id: page * 1000 + i, sensors: [] }))
    return { body: { results } }
  },
  async () => {
    let count = 0
    for await (const _ of fetchLocations()) count++
    assertEquals(count, 1001)
  },
))

Deno.test('fetchJson: reintenta ante 429 y luego tiene éxito', withFetch(
  (() => {
    let calls = 0
    return () => {
      calls++
      return calls === 1 ? { status: 429, body: {} } : { body: { results: [] } }
    }
  })(),
  async () => {
    const res = await fetchLocationLatest(25) // no lanza → el retry funcionó
    assertEquals(res.length, 0)
  },
))
