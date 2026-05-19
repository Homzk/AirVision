import type { TimeRange } from '@/utils/constants'

const RANGE_HOURS: Record<TimeRange, number> = {
  '6h': 6,
  '24h': 24,
  '7d': 24 * 7,
}

/** Convierte un rango legible en el `since` ISO que se pasa a `.gte()`. */
export function rangeToSince(range: TimeRange, now: Date = new Date()): Date {
  return new Date(now.getTime() - RANGE_HOURS[range] * 60 * 60 * 1000)
}

const timeFormatter = new Intl.DateTimeFormat('es-CL', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const dateTimeFormatter = new Intl.DateTimeFormat('es-CL', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/**
 * "14:32" si la fecha es del día actual, "24 may, 14:32" en otro caso.
 */
export function formatReadingTime(input: string | Date, now: Date = new Date()): string {
  const d = input instanceof Date ? input : new Date(input)
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  return (sameDay ? timeFormatter : dateTimeFormatter).format(d)
}

const relativeFormatter = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })

/** "hace 5 min" / "hace 2 h" / "hace 3 d". Usa Intl en español. */
export function formatRelative(input: string | Date, now: Date = new Date()): string {
  const d = input instanceof Date ? input : new Date(input)
  const diffMs = d.getTime() - now.getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (Math.abs(diffMin) < 60) return relativeFormatter.format(diffMin, 'minute')
  const diffH = Math.round(diffMs / (60 * 60 * 1000))
  if (Math.abs(diffH) < 48) return relativeFormatter.format(diffH, 'hour')
  const diffD = Math.round(diffMs / (24 * 60 * 60 * 1000))
  return relativeFormatter.format(diffD, 'day')
}
