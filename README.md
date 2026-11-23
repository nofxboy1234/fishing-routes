# Tideline — Fishing Route GPX Builder

A small Vite + React app for turning two waypoints into a downloadable GPX 1.1
route. Each waypoint can use **Decimal Degrees (DD)** or **Degrees and Decimal
Minutes (DDM)**. DDM is the default, with separate degree and minute fields.
Coordinates are converted to DD in the background for the GPX file.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite (normally <http://localhost:5173/fishing-routes/>).

### Scripts

| Command           | Description                              |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Start the Vite development server        |
| `npm run build`   | Type-check and build for production      |
| `npm run preview` | Preview the production build             |
| `npm test`        | Run the Vitest unit tests                |
| `npm run lint`    | Run Oxlint                               |

## Coordinate formats

Use the **DD / DDM** switch on each waypoint to choose its input format. DDM is
selected by default.

| Format | Latitude entry                               | Longitude entry                             |
| ------ | -------------------------------------------- | ------------------------------------------- |
| DD     | `-29.9357194`                                | `31.0096464`                                |
| DDM    | Degrees `-29`, minutes `56.143164`           | Degrees `31`, minutes `0.578784`            |

In DDM mode, degrees and minutes have their own fields—no degree or minute
symbols are needed. Make the degrees negative for south or west. Switching
between DD and DDM converts the values already entered.

To fill both latitude and longitude at once, paste a coordinate pair such as
`-29.865207, 31.064148` into any coordinate field. Parentheses and DDM pairs are
supported too.

All coordinates are validated against their geographic range and converted to
standard decimal degrees for the GPX file. Six decimal places are used as the
minimum output precision, and extra precision is preserved—for example, the
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

All parsing, conversion, route preview, and downloading happen in the browser.
No data is sent to a server.
