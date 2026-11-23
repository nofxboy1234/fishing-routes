import { describe, expect, it } from 'vitest'
import {
  formatDd,
  formatDdmParts,
  parseCoordinate,
  parseCoordinatePair,
  parseDdCoordinate,
  parseDdmParts,
  parseGpxStudioCoordinatePair,
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

describe('parseCoordinatePair', () => {
  it('splits a pasted latitude and longitude pair', () => {
    expect(parseCoordinatePair('-29.865207, 31.064148')).toEqual({
      lat: '-29.865207',
      lon: '31.064148',
    })
  })

  it('accepts the space-separated format copied from gpx.studio', () => {
    expect(parseCoordinatePair('-29.935797 31.009616')).toEqual({
      lat: '-29.935797',
      lon: '31.009616',
    })
  })

  it('handles surrounding parentheses and extra whitespace', () => {
    expect(parseCoordinatePair('  (-29.865207, 31.064148)  ')).toEqual({
      lat: '-29.865207',
      lon: '31.064148',
    })
  })

  it('supports mixed DD and DDM sides', () => {
    expect(
      parseCoordinatePair('-29.865207, 31° 03.8489′ E'),
    ).toEqual({
      lat: '-29.865207',
      lon: '31° 03.8489′ E',
    })
  })

  it('rejects a single coordinate or an invalid pair', () => {
    expect(parseCoordinatePair('-29.865207')).toBeNull()
    expect(parseCoordinatePair('-29.865207, 999')).toBeNull()
    expect(parseCoordinatePair('north, east')).toBeNull()
    expect(parseCoordinatePair('-29.865207,')).toBeNull()
  })
})

describe('explicit DD parsing', () => {
  it('accepts only decimal degrees', () => {
    expect(parseDdCoordinate('-29.9357194', 'lat')).toMatchObject({
      ok: true,
      value: -29.9357194,
      format: 'dd',
      decimals: 7,
    })
    expect(parseDdCoordinate('29 56.1432 S', 'lat').ok).toBe(false)
    expect(parseDdCoordinate('29° 56.1432′ S', 'lat').ok).toBe(false)
  })
})

describe('split DDM parsing', () => {
  it('combines positive degrees and minutes with hemispheres', () => {
    expect(parseDdmParts('29', '56.143164', 'lat', 'S')).toMatchObject({
      ok: true,
      value: expect.closeTo(-29.9357194, 9),
      format: 'ddm',
      decimals: 7,
    })
    expect(parseDdmParts('31', '0.578784', 'lon', 'E')).toMatchObject({
      ok: true,
      value: expect.closeTo(31.0096464, 9),
      format: 'ddm',
      decimals: 7,
    })
    expect(valueOf(parseDdmParts('29', '56.143164', 'lat', 'N'))).toBeCloseTo(
      29.9357194,
      9,
    )
    expect(valueOf(parseDdmParts('31', '0.578784', 'lon', 'W'))).toBeCloseTo(
      -31.0096464,
      9,
    )
  })

  it('rejects invalid degree, minute, and hemisphere inputs', () => {
    expect(parseDdmParts('29.5', '10', 'lat', 'S').ok).toBe(false)
    expect(parseDdmParts('91', '0', 'lat', 'S').ok).toBe(false)
    expect(parseDdmParts('29', '60', 'lat', 'S').ok).toBe(false)
    expect(parseDdmParts('', '10', 'lat', 'S').ok).toBe(false)
    expect(parseDdmParts('29', '', 'lat', 'S').ok).toBe(false)
    expect(parseDdmParts('-29', '0', 'lat', 'S').ok).toBe(false)
    expect(parseDdmParts('29', '0', 'lat', 'E').ok).toBe(false)
  })
})

describe('split DDM formatting', () => {
  it('converts decimal degrees into positive degrees, minutes, and hemisphere', () => {
    expect(formatDdmParts(-29.9357194, 'lat')).toEqual({
      degrees: '29',
      minutes: '56.143164',
      hemisphere: 'S',
    })
    expect(formatDdmParts(31.0096464, 'lon')).toEqual({
      degrees: '31',
      minutes: '0.578784',
      hemisphere: 'E',
    })
    expect(formatDdmParts(-29.960267, 'lat')).toEqual({
      degrees: '29',
      minutes: '57.61602',
      hemisphere: 'S',
    })
    expect(formatDdmParts(31.0165, 'lon')).toEqual({
      degrees: '31',
      minutes: '0.99',
      hemisphere: 'E',
    })
  })

  it('preserves the hemisphere for values below one degree', () => {
    expect(formatDdmParts(-0.5, 'lat')).toEqual({
      degrees: '0',
      minutes: '30',
      hemisphere: 'S',
    })
    expect(formatDdmParts(-0.5, 'lon')).toEqual({
      degrees: '0',
      minutes: '30',
      hemisphere: 'W',
    })
  })
})

describe('parseGpxStudioCoordinatePair', () => {
  it('parses the space-separated DD format copied from gpx.studio', () => {
    expect(parseGpxStudioCoordinatePair('-29.935797 31.009616')).toEqual({
      ok: true,
      pair: { lat: '-29.935797', lon: '31.009616' },
    })
  })

  it('also accepts a comma-separated DD pair', () => {
    expect(parseGpxStudioCoordinatePair('-29.935797, 31.009616')).toEqual({
      ok: true,
      pair: { lat: '-29.935797', lon: '31.009616' },
    })
  })

  it('rejects DDM notation because gpx.studio copies DD', () => {
    expect(
      parseGpxStudioCoordinatePair('29° 56.14782′ S 31° 00.57696′ E').ok,
    ).toBe(false)
  })

  it('gives specific errors for empty, malformed, and out-of-range input', () => {
    expect(parseGpxStudioCoordinatePair('')).toMatchObject({
      ok: false,
      error: 'Clipboard is empty. Copy a point from gpx.studio first.',
    })
    expect(parseGpxStudioCoordinatePair('not coordinates').ok).toBe(false)
    expect(parseGpxStudioCoordinatePair('-29.935797 999').ok).toBe(false)
  })
})
