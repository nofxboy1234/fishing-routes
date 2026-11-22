import { describe, expect, it } from 'vitest'
import { buildGpx, escapeXml, gpxFilename } from './gpx'

const route = {
  start: { lat: -29.9357194, lon: 31.0096464 },
  end: { lat: -29.960267, lon: 31.0165 },
  routeName: 'Fishing Spot Route',
}

describe('buildGpx', () => {
  it('substitutes converted DD coordinates and the route name into the template', () => {
    expect(buildGpx(route)).toBe(`<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Custom Apexmove Route">
  <wpt lat="-29.960267" lon="31.016500">
    <name>Fishing Spot</name>
  </wpt>
  <trk>
    <name>Fishing Spot Route</name>
    <trkseg>
      <trkpt lat="-29.935719" lon="31.009646"/>
      <trkpt lat="-29.960267" lon="31.016500"/>
    </trkseg>
  </trk>
</gpx>
`)
  })

  it('trims the route name and escapes XML-sensitive characters', () => {
    const gpx = buildGpx({
      ...route,
      routeName: '  Rock & Roll <Run> "2026"  ',
    })

    expect(gpx).toContain('<name>Rock &amp; Roll &lt;Run&gt; &quot;2026&quot;</name>')
    expect(gpx).not.toContain('Rock & Roll')
  })

  it('strips characters that are not valid in XML 1.0', () => {
    expect(escapeXml('Reef\u0000Run\u0007')).toBe('ReefRun')
    expect(escapeXml('A & B')).toBe('A &amp; B')
  })
})

describe('gpxFilename', () => {
  it('creates a safe .gpx filename from the route name', () => {
    expect(gpxFilename('Fishing Spot Route')).toBe('fishing-spot-route.gpx')
    expect(gpxFilename('  Café / Reef #2  ')).toBe('cafe-reef-2.gpx')
  })

  it('falls back to a default filename', () => {
    expect(gpxFilename('')).toBe('fishing-route.gpx')
    expect(gpxFilename('!!!')).toBe('fishing-route.gpx')
  })
})
