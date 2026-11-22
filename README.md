# Tideline — Fishing Route GPX Builder

A small Vite + React app for turning two waypoints into a downloadable GPX 1.1
route. Type a coordinate in **Decimal Degrees (DD)** or **Degrees and Decimal
Minutes (DDM)** — the format is detected automatically for every field, so DD
and DDM can be mixed freely.

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

Each latitude and longitude field detects its own format. There are no format
switches to manage.

| Format | Latitude example        | Longitude example       |
| ------ | ----------------------- | ----------------------- |
| DD     | `-29.9357194`           | `31.0096464`            |
| DDM    | `29° 56.1432′ S`        | `31° 00.5788′ E`        |

DDM also accepts a leading hemisphere (`S 29 56.1432`), signed degrees
(`-29 56.1432`), or compact notation (`29°56.1432′S`). South and west
coordinates are always converted to negative decimal degrees.

Both values are validated against their geographic range and normalized to
standard decimal degrees. Six decimal places are used as the minimum output
precision, and extra precision from the input is preserved—for example, the
default start coordinates are written as `-29.9357194` and `31.0096464`.

## GPX output

The downloaded `.gpx` file follows the supplied Apexmove template:

- the converted **end** coordinates populate the `<wpt>` and the final `<trkpt>`;
- the converted **start** coordinates populate the first `<trkpt>` at their
  original six-plus-decimal precision;
- the route name populates `<trk><name>`;
- route names are XML-escaped and the filename is derived from the route name.

The filename is a URL-safe slug of the route name, for example
`Fishing Spot Route` → `fishing-spot-route.gpx`.

All parsing, conversion, preview generation, and downloading happen in the
browser. No data is sent to a server.
