# Tideline — Fishing Route GPX Builder

A small Vite + React app for turning two waypoints into a downloadable GPX 1.1
route. Each waypoint can be entered in **Decimal Degrees (DD)** or **Degrees and
Decimal Minutes (DDM)** — the two inputs can use different formats.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite (normally <http://localhost:5173>).

### Scripts

| Command           | Description                              |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Start the Vite development server        |
| `npm run build`   | Type-check and build for production      |
| `npm run preview` | Preview the production build             |
| `npm test`        | Run the Vitest unit tests                |
| `npm run lint`    | Run Oxlint                               |

## Coordinate formats

The **DD / DDM** switch on each waypoint controls how that waypoint is read.
Switching formats converts the values already in the fields.

| Format | Latitude example        | Longitude example       |
| ------ | ----------------------- | ----------------------- |
| DD     | `-29.935719`            | `31.009646`             |
| DDM    | `29° 56.1432′ S`        | `31° 00.5788′ E`        |

DDM also accepts a leading hemisphere (`S 29 56.1432`), signed degrees
(`-29 56.1432`), or compact notation (`29°56.1432′S`). South and west
coordinates are always converted to negative decimal degrees.

Both values are validated against their geographic range and normalized to
standard decimal degrees. The GPX document and download always use DD values
with six decimal places.

## GPX output

The downloaded `.gpx` file follows the supplied Apexmove template:

- the converted **end** coordinates populate the `<wpt>` and the final `<trkpt>`;
- the converted **start** coordinates populate the first `<trkpt>`;
- the route name populates `<trk><name>`;
- route names are XML-escaped and the filename is derived from the route name.

The filename is a URL-safe slug of the route name, for example
`Fishing Spot Route` → `fishing-spot-route.gpx`.

All parsing, conversion, preview generation, and downloading happen in the
browser. No data is sent to a server.
