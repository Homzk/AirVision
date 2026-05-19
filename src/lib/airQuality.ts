export type Pollutant = 'pm25' | 'pm10' | 'o3'

export const POLLUTANTS: readonly Pollutant[] = ['pm25', 'pm10', 'o3'] as const

export type Level = 'good' | 'moderate' | 'unhealthy' | 'hazardous' | 'no_data'

/**
 * Umbrales basados en las guías de calidad del aire de la OMS (2021),
 * adaptados a 4 categorías + estado sin datos para alimentar el mapa.
 * Unidades: µg/m³. Un valor cae en `level` si supera `thresholds[level]`
 * y no supera el siguiente.
 *
 * Referencias:
 * - PM2.5 24h: 15 (límite OMS); doblar para "unhealthy"; >50 hazardous.
 * - PM10 24h: 45 (límite OMS); 75 transición; 150 hazardous.
 * - O3 8h: 100 (límite OMS); intermedios derivados.
 */
const THRESHOLDS: Record<Pollutant, { moderate: number; unhealthy: number; hazardous: number }> = {
  pm25: { moderate: 15, unhealthy: 25, hazardous: 50 },
  pm10: { moderate: 45, unhealthy: 75, hazardous: 150 },
  o3: { moderate: 60, unhealthy: 100, hazardous: 180 },
}

/**
 * Colores duplicados intencionalmente con `tailwind.config.ts → theme.colors.airQuality`.
 * Mantener ambos sincronizados: este objeto se usa en JS (Leaflet markers, estilos
 * inline); las clases `bg-airQuality-*` se usan en componentes Tailwind.
 */
const LEVEL_COLORS: Record<Level, string> = {
  good: '#22c55e',
  moderate: '#eab308',
  unhealthy: '#f97316',
  hazardous: '#ef4444',
  no_data: '#9ca3af',
}

const LEVEL_LABELS: Record<Level, string> = {
  good: 'Buena',
  moderate: 'Moderada',
  unhealthy: 'Mala',
  hazardous: 'Muy mala',
  no_data: 'Sin datos',
}

/** Severidad ordinal para componer worst-of (mayor = peor). */
const LEVEL_RANK: Record<Level, number> = {
  no_data: -1,
  good: 0,
  moderate: 1,
  unhealthy: 2,
  hazardous: 3,
}

export function computeLevel(pollutant: Pollutant, value: number | null | undefined): Level {
  if (value === null || value === undefined || Number.isNaN(value)) return 'no_data'
  const t = THRESHOLDS[pollutant]
  if (value >= t.hazardous) return 'hazardous'
  if (value >= t.unhealthy) return 'unhealthy'
  if (value >= t.moderate) return 'moderate'
  return 'good'
}

export interface ReadingLike {
  pm25?: number | null
  pm10?: number | null
  o3?: number | null
}

/**
 * Worst-of-three: devuelve el nivel más severo entre los contaminantes con
 * lectura disponible. Si los tres son null/undefined, devuelve 'no_data'.
 */
export function computeWorstLevel(reading: ReadingLike): Level {
  let worst: Level = 'no_data'
  for (const pollutant of POLLUTANTS) {
    const level = computeLevel(pollutant, reading[pollutant])
    if (level === 'no_data') continue
    if (LEVEL_RANK[level] > LEVEL_RANK[worst]) worst = level
  }
  return worst
}

export function levelToColor(level: Level): string {
  return LEVEL_COLORS[level]
}

export function levelToLabel(level: Level): string {
  return LEVEL_LABELS[level]
}

export { THRESHOLDS as OMS_THRESHOLDS }
