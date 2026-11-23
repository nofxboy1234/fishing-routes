export type CoordinateFormat = 'dd' | 'ddm'
export type Axis = 'lat' | 'lon'

export interface Coordinate {
  lat: number
  lon: number
}

export interface RouteCoordinate extends Coordinate {
  latDecimals: number
  lonDecimals: number
}

export type ParseResult =
  | {
      ok: true
      value: number
      format: CoordinateFormat
      decimals: number
    }
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
const MIN_DECIMALS = 6
const MAX_DECIMALS = 9

function fail(message: string): ParseResult {
  return { ok: false, error: message }
}

function normalizeZero(value: number): number {
  return Object.is(value, -0) ? 0 : value
}

function clampDecimals(decimals: number): number {
  return Math.min(MAX_DECIMALS, Math.max(MIN_DECIMALS, decimals))
}

function countDecimalPlaces(value: string): number {
  const fraction = value.split('.')[1]
  return fraction ? fraction.length : 0
}

function validateRange(
  value: number,
  axis: Axis,
  format: CoordinateFormat,
  decimals: number,
): ParseResult {
  const config = AXIS_CONFIG[axis]
  if (!Number.isFinite(value)) {
    return fail(`Enter a valid ${config.label.toLowerCase()}.`)
  }

  if (Math.abs(value) > config.max) {
    return fail(
      `${config.label} must be between -${config.max} and ${config.max}.`,
    )
  }

  return {
    ok: true,
    value: normalizeZero(value),
    format,
    decimals: clampDecimals(decimals),
  }
}

/**
 * Parses a coordinate without asking for a format. A lone signed decimal
 * number is read as DD; everything else is treated as DDM.
 */
export function parseCoordinate(raw: string, axis: Axis): ParseResult {
  const config = AXIS_CONFIG[axis]
  const text = raw.trim()

  if (!text) {
    return fail(`Enter a ${config.label.toLowerCase()}.`)
  }

  const normalized = text.replace(',', '.')

  if (DECIMAL_RE.test(normalized)) {
    return parseDdCoordinate(text, axis)
  }

  return parseDdm(text, axis)
}

export function parseDdCoordinate(raw: string, axis: Axis): ParseResult {
  const config = AXIS_CONFIG[axis]
  const text = raw.trim()

  if (!text) {
    return fail(`Enter a ${config.label.toLowerCase()}.`)
  }

  const normalized = text.replace(',', '.')
  if (!DECIMAL_RE.test(normalized)) {
    return fail(`Use decimal degrees, like ${config.ddExample}.`)
  }

  return validateRange(
    Number(normalized),
    axis,
    'dd',
    Math.max(MIN_DECIMALS, countDecimalPlaces(normalized)),
  )
}

function ddmDecimals(minutePart: string): number {
  return Math.min(
    MAX_DECIMALS,
    Math.max(MIN_DECIMALS, countDecimalPlaces(minutePart) + 1),
  )
}

export function parseDdmParts(
  degreesRaw: string,
  minutesRaw: string,
  axis: Axis,
): ParseResult {
  const config = AXIS_CONFIG[axis]
  const degreeText = degreesRaw.trim()
  const minuteText = minutesRaw.trim()

  if (!degreeText) {
    return fail(`Enter ${config.label.toLowerCase()} degrees.`)
  }

  if (!/^[+-]?\d+$/.test(degreeText)) {
    return fail('Degrees must be a whole number.')
  }

  if (!minuteText) {
    return fail('Enter minutes.')
  }

  if (!NUMBER_RE.test(minuteText)) {
    return fail('Minutes must be a number.')
  }

  const degrees = Number(degreeText)
  const minutes = Number(minuteText)

  if (Math.abs(degrees) > config.max) {
    return fail(
      `${config.label} degrees must be between -${config.max} and ${config.max}.`,
    )
  }

  if (minutes < 0 || minutes >= 60) {
    return fail('Minutes must be at least 0 and less than 60.')
  }

  const value = Math.abs(degrees) + minutes / 60
  if (value > config.max) {
    return fail(
      `${config.label} must be between -${config.max} and ${config.max}.`,
    )
  }

  const negative = degreeText.startsWith('-')

  return {
    ok: true,
    value: normalizeZero(negative ? -value : value),
    format: 'ddm',
    decimals: ddmDecimals(minuteText),
  }
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
      `Enter DD or DDM coordinates, like ${config.ddExample} or ${config.ddmExample}.`,
    )
  }

  const [degreePart, minutePart] = parts
  if (!NUMBER_RE.test(degreePart) || !NUMBER_RE.test(minutePart)) {
    return fail(
      `Enter DD or DDM coordinates, like ${config.ddExample} or ${config.ddmExample}.`,
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
    format: 'ddm',
    decimals: ddmDecimals(minutePart),
  }
}

/**
 * Formats a decimal degree value as standard DD. Six decimals is the minimum
 * and precision from the input is preserved up to nine decimals.
 */
export function formatDd(value: number, decimals = MIN_DECIMALS): string {
  return normalizeZero(value).toFixed(clampDecimals(decimals))
}

export function formatDdmParts(value: number): {
  degrees: string
  minutes: string
} {
  const absolute = Math.abs(value)
  let degrees = Math.floor(absolute)
  let minutes = Math.round((absolute - degrees) * 60 * 1_000_000) / 1_000_000

  if (minutes >= 60) {
    degrees += 1
    minutes = 0
  }

  const minuteText =
    minutes.toFixed(6).replace(/0+$/, '').replace(/\.$/, '') || '0'
  const degreeText =
    value < 0 && degrees === 0 ? '-0' : String(value < 0 ? -degrees : degrees)

  return { degrees: degreeText, minutes: minuteText }
}

export function parseWaypoint(
  latInput: string,
  lonInput: string,
): { lat: ParseResult; lon: ParseResult } {
  return {
    lat: parseCoordinate(latInput, 'lat'),
    lon: parseCoordinate(lonInput, 'lon'),
  }
}

/**
 * Splits a pasted coordinate pair such as "-29.865207, 31.064148" into the
 * two raw field values. Returns null when the text is not a valid pair, so a
 * normal paste can continue unchanged.
 */
export function parseCoordinatePair(
  raw: string,
): { lat: string; lon: string } | null {
  const text = raw.trim().replace(/^\(\s*/, '').replace(/\s*\)$/, '')
  const parts = text.split(',')

  if (parts.length !== 2) {
    return null
  }

  const latitude = parts[0].trim()
  const longitude = parts[1].trim()

  if (!latitude || !longitude) {
    return null
  }

  if (
    !parseCoordinate(latitude, 'lat').ok ||
    !parseCoordinate(longitude, 'lon').ok
  ) {
    return null
  }

  return { lat: latitude, lon: longitude }
}
