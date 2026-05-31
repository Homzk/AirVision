// Edge Function `seed-stations` (carga única, invocación manual).
// Baja el catálogo de estaciones chilenas con sensores pm25/pm10/o3 desde
// OpenAQ v3 y lo upserta en `stations`. Idempotente.
//
//   supabase functions deploy seed-stations
//   supabase functions invoke seed-stations
//
// Secrets requeridos (server-side): OPENAQ_API_KEY, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY. NUNCA exponer service_role al cliente.

import { createClient } from '@supabase/supabase-js'

import { BBOX_CHILE, fetchLocations } from '../_shared/openaq.ts'

Deno.serve(async () => {
  const start = Date.now()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const rows: {
      id: number
      name: string
      latitude: number
      longitude: number
      country_code: string
      city: string | null
    }[] = []

    for await (const loc of fetchLocations(BBOX_CHILE)) {
      rows.push({
        id: loc.id,
        name: loc.name,
        latitude: loc.coordinates.latitude,
        longitude: loc.coordinates.longitude,
        country_code: loc.country.code,
        city: loc.locality,
      })
    }

    let upserted = 0
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500)
      const { error } = await supabase.from('stations').upsert(batch, { onConflict: 'id' })
      if (error) throw error
      upserted += batch.length
    }

    return Response.json({
      ok: true,
      summary: {
        duration_ms: Date.now() - start,
        stations_received: rows.length,
        stations_upserted: upserted,
      },
    })
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
})
