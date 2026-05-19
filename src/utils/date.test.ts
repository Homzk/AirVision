import { describe, expect, it } from 'vitest'

import { formatReadingTime, formatRelative, rangeToSince } from '@/utils/date'

describe('rangeToSince', () => {
  const now = new Date('2026-05-19T12:00:00Z')

  it('subtracts 6 hours for 6h', () => {
    expect(rangeToSince('6h', now).toISOString()).toBe('2026-05-19T06:00:00.000Z')
  })

  it('subtracts 24 hours for 24h', () => {
    expect(rangeToSince('24h', now).toISOString()).toBe('2026-05-18T12:00:00.000Z')
  })

  it('subtracts 7 days for 7d', () => {
    expect(rangeToSince('7d', now).toISOString()).toBe('2026-05-12T12:00:00.000Z')
  })

  it('defaults `now` to current time when omitted', () => {
    const before = Date.now()
    const since = rangeToSince('24h').getTime()
    const after = Date.now()
    const delta = 24 * 60 * 60 * 1000
    expect(since).toBeGreaterThanOrEqual(before - delta)
    expect(since).toBeLessThanOrEqual(after - delta)
  })
})

describe('formatReadingTime', () => {
  it('shows only HH:mm when the reading is from the same local day', () => {
    const now = new Date(2026, 4, 19, 15, 30)
    const earlier = new Date(2026, 4, 19, 9, 5)
    expect(formatReadingTime(earlier, now)).toMatch(/09:05/)
  })

  it('shows day + month + time when the reading is from a different day', () => {
    const now = new Date(2026, 4, 19, 15, 30)
    const yesterday = new Date(2026, 4, 18, 20, 0)
    const out = formatReadingTime(yesterday, now)
    expect(out).toMatch(/may/i)
    expect(out).toMatch(/20:00/)
  })

  it('accepts an ISO string as input', () => {
    const now = new Date(2026, 4, 19, 15, 30)
    const iso = new Date(2026, 4, 19, 10, 15).toISOString()
    expect(formatReadingTime(iso, now)).toMatch(/10:15/)
  })
})

describe('formatRelative', () => {
  const now = new Date('2026-05-19T12:00:00Z')

  it('uses minutes when delta is sub-hour', () => {
    const fiveMinAgo = new Date('2026-05-19T11:55:00Z')
    expect(formatRelative(fiveMinAgo, now)).toMatch(/minuto/)
  })

  it('uses hours when delta is between 1 and 47 hours', () => {
    const threeHoursAgo = new Date('2026-05-19T09:00:00Z')
    expect(formatRelative(threeHoursAgo, now)).toMatch(/hora/)
  })

  it('uses days when delta is 48+ hours', () => {
    const threeDaysAgo = new Date('2026-05-16T12:00:00Z')
    expect(formatRelative(threeDaysAgo, now)).toMatch(/día|días/)
  })
})
