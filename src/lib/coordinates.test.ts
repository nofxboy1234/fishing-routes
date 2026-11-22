import { describe, expect, it } from 'vitest'
import {
  formatDd,
  formatDdm,
  parseCoordinate,
  type ParseResult,
} from './coordinates'

function valueOf(result: ParseResult): number {
  expect(result.ok).toBe(true)
  if (!result.ok) {
    throw new Error(result.error)
  }
  return result.value
}

describe('parseCoordinate - decimal degrees', () => {
  it('parses signed latitude and longitude values', () => {
    expect(valueOf(parseCoordinate('-29.960267', 'lat', 'dd'))).toBeCloseTo(
      -29.960267,
      10,
    )
    expect(valueOf(parseCoordinate('31.016500', 'lon', 'dd'))).toBeCloseTo(
      31.0165,
      10,
    )
  })

  it('accepts a comma as the decimal separator', () => {
    expect(valueOf(parseCoordinate('-29,5', 'lat', 'dd'))).toBeCloseTo(-29.5)
  })

  it('accepts coordinate boundary values', () => {
    expect(valueOf(parseCoordinate('90', 'lat', 'dd'))).toBe(90)
    expect(valueOf(parseCoordinate('-180', 'lon', 'dd'))).toBe(-180)
  })

  it('rejects out-of-range and malformed values', () => {
    expect(parseCoordinate('91', 'lat', 'dd').ok).toBe(false)
    expect(parseCoordinate('-180.1', 'lon', 'dd').ok).toBe(false)
    expect(parseCoordinate('29 56 S', 'lat', 'dd').ok).toBe(false)
    expect(parseCoordinate('south', 'lat', 'dd').ok).toBe(false)
  })

  it('requires a value', () => {
    expect(parseCoordinate('   ', 'lat', 'dd')).toMatchObject({
      ok: false,
      error: 'Enter a latitude.',
    })
  })
})

describe('parseCoordinate - degrees and decimal minutes', () => {
  it('converts a DDM latitude with a hemisphere to DD', () => {
    const value = valueOf(parseCoordinate('29° 56.1432′ S', 'lat', 'ddm'))
    expect(value).toBeCloseTo(-(29 + 56.1432 / 60), 10)
  })

  it('converts a DDM longitude with a hemisphere to DD', () => {
    const value = valueOf(parseCoordinate('31° 00.5788′ E', 'lon', 'ddm'))
    expect(value).toBeCloseTo(31 + 0.5788 / 60, 10)
  })

  it('supports leading hemispheres and signed DDM', () => {
    expect(valueOf(parseCoordinate('S 29 56.1432', 'lat', 'ddm'))).toBeCloseTo(
      -29.93572,
      8,
    )
    expect(valueOf(parseCoordinate('-29 56.1432', 'lat', 'ddm'))).toBeCloseTo(
      -29.93572,
      8,
    )
    expect(valueOf(parseCoordinate('+31 00.5788', 'lon', 'ddm'))).toBeCloseTo(
      31.0096466667,
      8,
    )
  })

  it('accepts compact notation without spaces', () => {
    expect(valueOf(parseCoordinate('29°56.1432′S', 'lat', 'ddm'))).toBeCloseTo(
      -29.93572,
      8,
    )
    expect(valueOf(parseCoordinate('31:00.5788E', 'lon', 'ddm'))).toBeCloseTo(
      31.0096466667,
      8,
    )
  })

  it('rejects invalid minute values and malformed input', () => {
    expect(parseCoordinate('29 75.000 S', 'lat', 'ddm').ok).toBe(false)
    expect(parseCoordinate('29 60 S', 'lat', 'ddm').ok).toBe(false)
    expect(parseCoordinate('29.5 10 S', 'lat', 'ddm').ok).toBe(false)
    expect(parseCoordinate('29 56 10 S', 'lat', 'ddm').ok).toBe(false)
    expect(parseCoordinate('29 S', 'lat', 'ddm').ok).toBe(false)
  })

  it('rejects hemisphere and sign conflicts', () => {
    expect(parseCoordinate('-29 56.1432 N', 'lat', 'ddm')).toMatchObject({
      ok: false,
      error: 'A minus sign conflicts with the N hemisphere.',
    })
    expect(parseCoordinate('29 56.1432 E', 'lat', 'ddm').ok).toBe(false)
    expect(parseCoordinate('31 00.5788 N', 'lon', 'ddm').ok).toBe(false)
  })

  it('rejects out-of-range DDM values', () => {
    expect(parseCoordinate('91 0 N', 'lat', 'ddm').ok).toBe(false)
    expect(parseCoordinate('180 1 E', 'lon', 'ddm').ok).toBe(false)
  })
})

describe('coordinate formatting', () => {
  it('formats DD values to six decimal places', () => {
    expect(formatDd(-29.9357194)).toBe('-29.935719')
    expect(formatDd(31.0165)).toBe('31.016500')
    expect(formatDd(-0)).toBe('0.000000')
  })

  it('formats GPX-ready DDM strings with padded minutes', () => {
    expect(formatDdm(-29.9357194, 'lat')).toBe('29° 56.1432′ S')
    expect(formatDdm(31.0096464, 'lon')).toBe('31° 00.5788′ E')
    expect(formatDdm(-31.5, 'lon')).toBe('31° 30.0000′ W')
  })

  it('round-trips formatted DDM within display precision', () => {
    const formatted = formatDdm(-29.9357194, 'lat')
    const parsed = parseCoordinate(formatted, 'lat', 'ddm')

    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.value).toBeCloseTo(-29.9357194, 5)
    }
  })
})
