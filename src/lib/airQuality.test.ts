import { describe, expect, it } from 'vitest'

import {
  computeLevel,
  computeWorstLevel,
  levelToColor,
  levelToLabel,
  OMS_THRESHOLDS,
  POLLUTANTS,
  type Level,
} from '@/lib/airQuality'

describe('computeLevel', () => {
  it('returns no_data for null, undefined, NaN', () => {
    expect(computeLevel('pm25', null)).toBe('no_data')
    expect(computeLevel('pm25', undefined)).toBe('no_data')
    expect(computeLevel('pm25', Number.NaN)).toBe('no_data')
  })

  it.each([
    ['pm25', 0, 'good'],
    ['pm25', 14.9, 'good'],
    ['pm25', 15, 'moderate'],
    ['pm25', 24.9, 'moderate'],
    ['pm25', 25, 'unhealthy'],
    ['pm25', 49.9, 'unhealthy'],
    ['pm25', 50, 'hazardous'],
    ['pm25', 200, 'hazardous'],
    ['pm10', 44.9, 'good'],
    ['pm10', 45, 'moderate'],
    ['pm10', 75, 'unhealthy'],
    ['pm10', 150, 'hazardous'],
    ['o3', 59.9, 'good'],
    ['o3', 60, 'moderate'],
    ['o3', 100, 'unhealthy'],
    ['o3', 180, 'hazardous'],
  ] as const)('classifies %s=%f as %s', (pollutant, value, level) => {
    expect(computeLevel(pollutant, value)).toBe(level)
  })

  it('exposes thresholds for the 3 pollutants', () => {
    expect(POLLUTANTS).toEqual(['pm25', 'pm10', 'o3'])
    expect(Object.keys(OMS_THRESHOLDS).sort()).toEqual(['o3', 'pm10', 'pm25'])
  })
})

describe('computeWorstLevel', () => {
  it('returns no_data when reading object is empty', () => {
    expect(computeWorstLevel({})).toBe('no_data')
  })

  it('returns no_data when all three are null', () => {
    expect(computeWorstLevel({ pm25: null, pm10: null, o3: null })).toBe('no_data')
  })

  it('picks worst among present pollutants', () => {
    expect(computeWorstLevel({ pm25: 10, pm10: 100, o3: 30 })).toBe('unhealthy')
  })

  it('ignores nulls when computing the worst', () => {
    expect(computeWorstLevel({ pm25: null, pm10: null, o3: 70 })).toBe('moderate')
  })

  it('lets hazardous beat any other level', () => {
    expect(computeWorstLevel({ pm25: 80, pm10: 50, o3: 65 })).toBe('hazardous')
  })

  it('classifies low values across all three as good', () => {
    expect(computeWorstLevel({ pm25: 5, pm10: 20, o3: 30 })).toBe('good')
  })
})

describe('levelToColor / levelToLabel', () => {
  const levels: readonly Level[] = ['good', 'moderate', 'unhealthy', 'hazardous', 'no_data']

  it('returns distinct hex colors for each level', () => {
    const colors = levels.map(levelToColor)
    expect(new Set(colors).size).toBe(levels.length)
    for (const c of colors) expect(c).toMatch(/^#[0-9a-fA-F]{6}$/)
  })

  it('returns Spanish labels', () => {
    expect(levelToLabel('good')).toBe('Buena')
    expect(levelToLabel('moderate')).toBe('Moderada')
    expect(levelToLabel('unhealthy')).toBe('Mala')
    expect(levelToLabel('hazardous')).toBe('Muy mala')
    expect(levelToLabel('no_data')).toBe('Sin datos')
  })
})
