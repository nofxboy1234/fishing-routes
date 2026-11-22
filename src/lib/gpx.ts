import { formatDd, type RouteCoordinate } from './coordinates'

export interface GpxInput {
  start: RouteCoordinate
  end: RouteCoordinate
  routeName: string
}

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}

export function escapeXml(value: string): string {
  const validXmlCharacters = Array.from(value)
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0
      return (
        code === 0x09 ||
        code === 0x0a ||
        code === 0x0d ||
        (code >= 0x20 && code <= 0xd7ff) ||
        (code >= 0xe000 && code <= 0xfffd) ||
        code >= 0x10000
      )
    })
    .join('')

  return validXmlCharacters.replace(
    /[&<>"']/g,
    (character) => XML_ESCAPES[character],
  )
}

/**
 * Builds the GPX 1.1 document from the converted decimal-degree values.
 * The track and waypoint names are intentionally XML-escaped.
 */
export function buildGpx({ start, end, routeName }: GpxInput): string {
  const name = escapeXml(routeName.trim())
  const startLat = formatDd(start.lat, start.latDecimals)
  const startLon = formatDd(start.lon, start.lonDecimals)
  const endLat = formatDd(end.lat, end.latDecimals)
  const endLon = formatDd(end.lon, end.lonDecimals)

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Custom Apexmove Route">
  <wpt lat="${endLat}" lon="${endLon}">
    <name>Fishing Spot</name>
  </wpt>
  <trk>
    <name>${name}</name>
    <trkseg>
      <trkpt lat="${startLat}" lon="${startLon}"/>
      <trkpt lat="${endLat}" lon="${endLon}"/>
    </trkseg>
  </trk>
</gpx>
`
}

export function gpxFilename(routeName: string): string {
  const slug = routeName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug || 'fishing-route'}.gpx`
}

export function downloadGpx(content: string, filename: string): void {
  const blob = new Blob([content], {
    type: 'application/gpx+xml;charset=utf-8',
  })
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}
