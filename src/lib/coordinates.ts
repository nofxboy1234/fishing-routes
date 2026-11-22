export type CoordinateFormat = 'dd' | 'ddm'
export type Axis = 'lat' | 'lon'

export interface Coordinate {
  lat: number
  lon: number
}

export type ParseResult =
  | { ok: true; value: number }
  | { ok: false; error: string }

const AXIS_CONFIG = {
  lat: {
    label: 'Latitude',
    max: 90,
    hemispheres: ['N', 'S'] as const,
    ddExample: '-29.935719',
    ddmExample: '29° 56.1432′ S',
  },
  lon: {
    label: 'Longitude',
    max: 180,
    hemispheres: ['E', 'W'] as const,
    ddExample: '31.009646',
    ddmExample: '31° 00.5788′ E',
  },
}

const DECIMAL_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/
const NUMBER_RE = /^(?:\d+(?:\.\d*)?|\.\d+)$/

function fail(message: string): ParseResult {
  return { ok: false, error: message }
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value
}

function validateRange(value: number, axis: Axis): ParseResult {
  const config = AXIS_CONFIG[axis]
  if (!Number.isFinite(value)) {
    return fail(`Enter a valid ${config.label.toLowerCase()}.`)
  }

  if (Math.abs(value) > config.max) {
    return fail(
      `${config.label} must be between -${config.max} and ${config.max}.`,
    )
  }

  return { ok: true, value: normalizeZero(value) }
}

export function parseCoordinate(
  raw: string,
  axis: Axis,
  format: CoordinateFormat,
): ParseResult {
  const config = AXIS_CONFIG[axis]
  const text = raw.trim()

  if (!text) {
    return fail(`Enter a ${config.label.toLowerCase()}.`)
  }

  if (format === 'dd') {
    const normalized = text.replace(',', '.')
    if (!DECIMAL_RE.test(normalized)) {
      return fail(
        `Use decimal degrees, like ${config.ddExample} (not degrees and minutes).`,
      )
    }

    return validateRange(Number(normalized), axis)
  }

  return parseDdm(text, axis)
}

function parseDdm(raw: string, axis: Axis): ParseResult {
  const config = AXIS_CONFIG[axis]
  let text = raw.trim()
  let hemisphere = ''

  const leadingDirection = text.match(/^([NSEW])\s*/i)
  if (leadingDirection) {
    hemisphere = leadingDirection[1].toUpperCase()
    text = text.slice(leadingDirection[0].length)
  }

  const trailingDirection = text.match(/\s*([NSEW])\s*$/i)
  if (trailingDirection) {
    const direction = trailingDirection[1].toUpperCase()
    if (hemisphere && hemisphere !== direction) {
      return fail('The hemisphere letters do not match.')
    }
    hemisphere = direction
    text = text.slice(0, trailingDirection.index).trim()
  }

  let negative = false
  const sign = text.match(/^([+-])\s*/)
  if (sign) {
    negative = sign[1] === '-'
    text = text.slice(sign[0].length)
  }

  const normalized = text
    .replace(/[°º]/g, ' ')
    .replace(/\b(?:deg|degrees?)\b/gi, ' ')
    .replace(/['’′]/g, ' ')
    .replace(/\b(?:min|minutes?)\b/gi, ' ')
    .replace(/:/g, ' ')
    .trim()

  const parts = normalized.split(/\s+/)
  if (parts.length !== 2) {
    return fail(
      `Enter degrees and decimal minutes, like ${config.ddmExample}.`,
    )
  }

  const [degreePart, minutePart] = parts
  if (!NUMBER_RE.test(degreePart) || !NUMBER_RE.test(minutePart)) {
    return fail(
      `Enter degrees and decimal minutes, like ${config.ddmExample}.`,
    )
  }

  const degrees = Number(degreePart)
  const minutes = Number(minutePart)

  if (!Number.isInteger(degrees)) {
    return fail('Degrees must be a whole number in DDM format.')
  }

  if (minutes < 0 || minutes >= 60) {
    return fail('Minutes must be at least 0 and less than 60.')
  }

  if (hemisphere && !config.hemispheres.some((item) => item === hemisphere)) {
    return fail(
      `Use ${config.hemispheres.join(' or ')} for ${config.label.toLowerCase()}.`,
    )
  }

  if (hemisphere) {
    const hemisphereIsNegative = hemisphere === 'S' || hemisphere === 'W'
    if (negative && !hemisphereIsNegative) {
      return fail(
        `A minus sign conflicts with the ${hemisphere} hemisphere.`,
      )
    }
    negative = hemisphereIsNegative
  }

  const value = degrees + minutes / 60
  if (value > config.max) {
    return fail(
      `${config.label} must be between -${config.max} and ${config.max}.`,
    )
  }

  return {
    ok: true,
    value: normalizeZero(negative ? -value : value),
  }
}

/**
 * Converts a decimal degree value into a fixable, standard DD string.
 * GPX coordinates are emitted at six decimal places.
 */
export function formatDd(value: number): string {
  return normalizeZero(value).toFixed(6)
}

/**
 * Formats a decimal degree value as degrees and decimal minutes, including
 * the hemisphere. This is used when someone switches a waypoint to DDM.
 */
export function formatDdm(value: number, axis: Axis): string {
  const absolute = Math.abs(value)
  let degrees = Math.floor(absolute)
  let minutes = Math.round((absolute - degrees) * 60 * 10_000) / 10_000

  if (minutes >= 60) {
    degrees += 1
    minutes = 0
  }

  const hemisphere =
    axis === 'lat'
      ? value < 0
        ? 'S'
        : 'N'
      : value < 0
        ? 'W'
        : 'E'

  return `${degrees}° ${minutes.toFixed(4).padStart(7, '0')}′ ${hemisphere}`
}

export function formatCoordinate(
  value: number,
  axis: Axis,
  format: CoordinateFormat,
): string {
  return format === 'dd' ? formatDd(value) : formatDdm(value, axis)
}

export function parseWaypoint(
  latInput: string,
  lonInput: string,
  format: CoordinateFormat,
): { lat: ParseResult; lon: ParseResult } {
  return {
    lat: parseCoordinate(latInput, 'lat', format),
    lon: parseCoordinate(lonInput, 'lon', format),
  }
}
