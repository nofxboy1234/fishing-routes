import { describe, expect, it } from 'vitest'
import { bearingCardinal, distanceNm, initialBearing } from './route'

const start = { lat: -29.9357194, lon: 31.0096464 }
const end = { lat: -29.960267, lon: 31.0165 }

describe('route metrics', () => {
  it('calculates the haversine distance in nautical miles', () => {
    expect(distanceNm(start, end)).toBeCloseTo(1.5164, 3)
  })

  it('calculates the initial bearing', () => {
    expect(initialBearing(start, end)).toBeCloseTo(166.4, 1)
  })

  it('maps bearings to cardinal directions', () => {
    expect(bearingCardinal(0)).toBe('N')
    expect(bearingCardinal(90)).toBe('E')
    expect(bearingCardinal(166.4)).toBe('SSE')
    expect(bearingCardinal(350)).toBe('N')
    expect(bearingCardinal(-45)).toBe('NW')
  })

  it('returns zero distance for identical points', () => {
    expect(distanceNm(start, start)).toBe(0)
  })
})
