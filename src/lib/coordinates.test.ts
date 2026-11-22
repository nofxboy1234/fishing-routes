import { describe, expect, it } from 'vitest'
import {
  formatDd,
  parseCoordinate,
  parseWaypoint,
  type ParseResult,
} from './coordinates'

function valueOf(result: ParseResult): number {
  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.value
}

describe('automatic format detection', () => {
  it('detects a lone signed decimal as DD', () => {
    expect(parseCoordinate('-29.960267', 'lat')).toMatchObject({
      ok: true,
      value: -29.960267,
      format: 'dd',
      decimals: 6,
    })
    expect(parseCoordinate('31.016500', 'lon')).toMatchObject({
      ok: true,
      value: 31.0165,
      format: 'dd',
      decimals: 6,
    })
  })

  it('detects degree and minute notation as DDM', () => {
    expect(parseCoordinate('29° 56.1432′ S', 'lat')).toMatchObject({
      ok: true,
      value: expect.closeTo(-(29 + 56.1432 / 60), 10),
      format: 'ddm',
      decimals: 6,
    })
    expect(parseCoordinate('31 00.5788 E', 'lon')).toMatchObject({
      ok: true,
      value: expect.closeTo(31 + 0.5788 / 60, 10),
      format: 'ddm',
      decimals: 6,
    })
  })

  it('preserves extra DD precision above six decimals', () => {
    expect(parseCoordinate('-29.9357194', 'lat')).toMatchObject({
      ok: true,
      decimals: 7,
    })
    expect(parseCoordinate('31.009646412', 'lon')).toMatchObject({
      ok: true,
      decimals: 9,
    })
  })

  it('detects mixed formats independently inside a waypoint', () => {
    const waypoint = parseWaypoint('-29.9357194', '31° 00.5788′ E')
    expect(waypoint.lat.ok).toBe(true)
    expect(waypoint.lon.ok).toBe(true)
    if (waypoint.lat.ok && waypoint.lon.ok) {
      expect(waypoint.lat.format).toBe('dd')
      expect(waypoint.lon.format).toBe('ddm')
    }
  })
})

describe('parseCoordinate - decimal degrees', () => {
  it('accepts a comma as the decimal separator', () => {
    expect(valueOf(parseCoordinate('-29,5', 'lat'))).toBeCloseTo(-29.5)
  })

  it('accepts coordinate boundary values', () => {
    expect(valueOf(parseCoordinate('90', 'lat'))).toBe(90)
    expect(valueOf(parseCoordinate('-180', 'lon'))).toBe(-180)
  })

  it('rejects out-of-range and malformed values', () => {
    expect(parseCoordinate('91', 'lat').ok).toBe(false)
    expect(parseCoordinate('-180.1', 'lon').ok).toBe(false)
    expect(parseCoordinate('south', 'lat').ok).toBe(false)
  })

  it('requires a value', () => {
    expect(parseCoordinate('   ', 'lat')).toMatchObject({
      ok: false,
      error: 'Enter a latitude.',
    })
  })
})

describe('parseCoordinate - degrees and decimal minutes', () => {
  it('supports leading hemispheres, signs, and compact notation', () => {
    expect(valueOf(parseCoordinate('S 29 56.1432', 'lat'))).toBeCloseTo(
      -29.93572,
      8,
    )
    expect(valueOf(parseCoordinate('-29 56.1432', 'lat'))).toBeCloseTo(
      -29.93572,
      8,
    )
    expect(valueOf(parseCoordinate('+31 00.5788', 'lon'))).toBeCloseTo(
      31.0096466667,
      8,
    )
    expect(valueOf(parseCoordinate('29°56.1432′S', 'lat'))).toBeCloseTo(
      -29.93572,
      8,
    )
    expect(valueOf(parseCoordinate('31:00.5788E', 'lon'))).toBeCloseTo(
      31.0096466667,
      8,
    )
  })

  it('accepts a whitespace-separated DDM value', () => {
    expect(parseCoordinate('29 56.1432 S', 'lat')).toMatchObject({
      ok: true,
      format: 'ddm',
    })
  })

  it('rejects invalid minute values and malformed input', () => {
    expect(parseCoordinate('29 75.000 S', 'lat').ok).toBe(false)
    expect(parseCoordinate('29 60 S', 'lat').ok).toBe(false)
    expect(parseCoordinate('29.5 10 S', 'lat').ok).toBe(false)
    expect(parseCoordinate('29 56 10 S', 'lat').ok).toBe(false)
    expect(parseCoordinate('29 S', 'lat').ok).toBe(false)
  })

  it('rejects hemisphere and sign conflicts', () => {
    expect(parseCoordinate('-29 56.1432 N', 'lat')).toMatchObject({
      ok: false,
      error: 'A minus sign conflicts with the N hemisphere.',
    })
    expect(parseCoordinate('29 56.1432 E', 'lat').ok).toBe(false)
    expect(parseCoordinate('31 00.5788 N', 'lon').ok).toBe(false)
  })

  it('rejects out-of-range DDM values', () => {
    expect(parseCoordinate('91 0 N', 'lat').ok).toBe(false)
    expect(parseCoordinate('180 1 E', 'lon').ok).toBe(false)
  })
})

describe('coordinate formatting', () => {
  it('formats DD values to at least six decimal places', () => {
    expect(formatDd(-29.9357194)).toBe('-29.935719')
    expect(formatDd(31.0165)).toBe('31.016500')
    expect(formatDd(-0)).toBe('0.000000')
  })

  it('formats DD values with preserved and bounded precision', () => {
    expect(formatDd(-29.9357194, 7)).toBe('-29.9357194')
    expect(formatDd(31.0096464, 9)).toBe('31.009646400')
    expect(formatDd(1.2345678912, 12)).toBe('1.234567891')
  })
})
