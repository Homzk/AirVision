import { getAdminClient } from './supabase-admin'

export type Pollutant = 'pm25' | 'pm10' | 'o3'

export interface InjectedReading {
  stationId: number
  measuredAt: string
}

/**
 * Inserta (con service_role, fuera del navegador) una lectura cuyo valor cruza el
 * umbral de una alerta, con `measured_at` único de la corrida. El trigger
 * `evaluate_alerts()` dispara la alerta dentro del INSERT y Realtime propaga el
 * badge/historial — el camino real de producción.
 */
export async function injectThresholdReading(
  stationId: number,
  pollutant: Pollutant,
  value: number,
): Promise<InjectedReading> {
  const admin = getAdminClient()
  const measuredAt = new Date().toISOString()
  const row: Record<string, unknown> = {
    station_id: stationId,
    measured_at: measuredAt,
    [pollutant]: value,
  }
  const { error } = await admin.from('readings').insert(row)
  if (error) throw new Error(`No se pudo inyectar la lectura de prueba: ${error.message}`)
  return { stationId, measuredAt }
}

/** Borra exactamente la fila inyectada (no toca la serie real de la estación). */
export async function deleteInjectedReading(r: InjectedReading): Promise<void> {
  const admin = getAdminClient()
  await admin
    .from('readings')
    .delete()
    .eq('station_id', r.stationId)
    .eq('measured_at', r.measuredAt)
}

/** Devuelve el id de la primera estación del catálogo (para tests de alertas). */
export async function firstStationId(): Promise<number> {
  const admin = getAdminClient()
  const { data, error } = await admin.from('stations').select('id').order('id').limit(1)
  if (error || !data?.length) throw new Error(`No hay estaciones para el test: ${error?.message}`)
  return data[0].id as number
}
