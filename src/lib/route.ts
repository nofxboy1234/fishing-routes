import type { Coordinate } from './coordinates'

const EARTH_RADIUS_KM = 6371.0088

const CARDINALS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
] as const

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function distanceKm(from: Coordinate, to: Coordinate): number {
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)
  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLon = toRadians(to.lon - from.lon)

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2

  const centralAngle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return EARTH_RADIUS_KM * centralAngle
}

export function initialBearing(from: Coordinate, to: Coordinate): number {
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)
  const deltaLon = toRadians(to.lon - from.lon)

  const y = Math.sin(deltaLon) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon)

  return (Math.atan2(y, x) * 180) / Math.PI
}

export function bearingCardinal(bearing: number): string {
  const normalized = ((bearing % 360) + 360) % 360
  return CARDINALS[Math.round(normalized / 22.5) % CARDINALS.length]
}
