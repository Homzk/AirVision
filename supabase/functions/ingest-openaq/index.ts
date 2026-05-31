// Edge Function `ingest-openaq` (cron */15 * * * *).
// Por cada estación chilena fresca: toma el snapshot /latest, descarta
// mediciones rancias (R-fresh) e inválidas, pivotea long→wide y hace upsert
// idempotente con COALESCE en `readings` (vía RPC ingest_readings).
//
//   supabase functions deploy ingest-openaq
//   # agendar */15 en Supabase Cloud (dashboard Schedules o pg_cron+pg_net)
//
// Siempre responde 200 aunque OpenAQ falle: un ciclo perdido lo recupera el
// siguiente. Secrets server-side: OPENAQ_API_KEY, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from 'jsr:@supabase/supabase-js@2'

import {
  BBOX_CHILE,
  errMsg,
  fetchLocationLatest,
  fetchLocations,
  isStale,
  type NormalizedReading,
  normalizeLatest,
  type Pollutant,
  sensorCatalogOf,
  sleep,
} from '../_shared/openaq.ts'

const MAX_AGE_HOURS = Number(Deno.env.get('INGEST_MAX_AGE_HOURS') ?? '3')
// Throttle entre llamadas /latest para no superar el rate limit del free tier
// (~60 req/min). 1100 ms ⇒ <55 req/min; ~112 estaciones ⇒ ~2 min por ciclo.
const THROTTLE_MS = Number(Deno.env.get('INGEST_THROTTLE_MS') ?? '1100')

Deno.serve(async () => {
  const start = Date.now()
  const now = new Date()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const summary = {
    duration_ms: 0,
    stations_polled: 0,
    rows_upserted: 0,
    skipped_stale: 0,
    skipped_invalid: 0,
    errors: [] as string[],
  }

  try {
    // 1. Un barrido de /locations da (a) el catálogo global sensorsId→pollutant
    //    —que /latest no incluye— y (b) la lista de estaciones frescas.
    const sensorCatalog = new Map<number, Pollutant>()
    const freshStationIds: number[] = []
    for await (const loc of fetchLocations(BBOX_CHILE)) {
      for (const [sid, p] of sensorCatalogOf(loc)) sensorCatalog.set(sid, p)
      if (loc.datetimeLast && !isStale(loc.datetimeLast.utc, now, MAX_AGE_HOURS)) {
        freshStationIds.push(loc.id)
      }
    }

    // 2. Snapshot por estación fresca (throttled) → normalizar.
    const rows: NormalizedReading[] = []
    for (const id of freshStationIds) {
      try {
        const latest = await fetchLocationLatest(id)
        const { reading, skippedStale, skippedInvalid } = normalizeLatest(
          id,
          latest,
          sensorCatalog,
          now,
          MAX_AGE_HOURS,
        )
        summary.skipped_stale += skippedStale
        summary.skipped_invalid += skippedInvalid
        if (reading) rows.push(reading)
      } catch (e) {
        summary.errors.push(`${id}: ${errMsg(e)}`)
      }
      summary.stations_polled++
      await sleep(THROTTLE_MS)
    }

    // 3. Upsert idempotente con COALESCE (RPC) en un solo viaje.
    if (rows.length > 0) {
      const { data, error } = await supabase.rpc('ingest_readings', { _rows: rows })
      if (error) throw error
      summary.rows_upserted = typeof data === 'number' ? data : rows.length
    }
  } catch (e) {
    summary.errors.push(errMsg(e))
  }

  summary.duration_ms = Date.now() - start
  // Siempre 200: el cron del próximo ciclo recupera cualquier ventana perdida.
  return Response.json({ ok: summary.errors.length === 0, summary })
})
