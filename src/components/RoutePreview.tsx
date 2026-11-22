import type { Coordinate } from '../lib/coordinates'
import { formatDd } from '../lib/coordinates'
import { bearingCardinal, distanceNm, initialBearing } from '../lib/route'

interface RoutePreviewProps {
  start: Coordinate | null
  end: Coordinate | null
  routeName: string
  startFormat: string
  endFormat: string
}

interface PlotPoint {
  x: number
  y: number
}

const VIEW_WIDTH = 640
const VIEW_HEIGHT = 388
const HORIZONTAL_PADDING = 118
const VERTICAL_PADDING = 88

function projectRoute(
  start: Coordinate,
  end: Coordinate,
): { start: PlotPoint; end: PlotPoint } {
  const midpointLatitude = (start.lat + end.lat) / 2
  const longitudeScale = Math.max(
    Math.cos((midpointLatitude * Math.PI) / 180),
    0.2,
  )

  const projectedStartX = start.lon * longitudeScale
  const projectedEndX = end.lon * longitudeScale
  const deltaX = projectedEndX - projectedStartX
  const deltaY = end.lat - start.lat

  const spanX = Math.max(Math.abs(deltaX), 0.007 * longitudeScale)
  const spanY = Math.max(Math.abs(deltaY), 0.007)
  const scale = Math.min(
    (VIEW_WIDTH - HORIZONTAL_PADDING * 2) / spanX,
    (VIEW_HEIGHT - VERTICAL_PADDING * 2) / spanY,
  )

  const midpointX = (projectedStartX + projectedEndX) / 2
  const midpointY = (start.lat + end.lat) / 2

  return {
    start: {
      x: VIEW_WIDTH / 2 + (projectedStartX - midpointX) * scale,
      y: VIEW_HEIGHT / 2 - (start.lat - midpointY) * scale,
    },
    end: {
      x: VIEW_WIDTH / 2 + (projectedEndX - midpointX) * scale,
      y: VIEW_HEIGHT / 2 - (end.lat - midpointY) * scale,
    },
  }
}

function RouteLine({
  start,
  end,
}: {
  start: PlotPoint
  end: PlotPoint
}) {
  const midpointX = (start.x + end.x) / 2
  const midpointY = (start.y + end.y) / 2
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const length = Math.hypot(deltaX, deltaY) || 1
  const curve = Math.min(length * 0.1, 26)
  const controlX = midpointX + (-deltaY / length) * curve
  const controlY = midpointY + (deltaX / length) * curve
  const path = `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`

  return (
    <g aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke="#f2b08f"
        strokeWidth="12"
        strokeLinecap="round"
        opacity="0.09"
      />
      <path
        d={path}
        fill="none"
        stroke="#f5eee1"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="2 9"
        className="route-line"
      />
      <g
        transform={`translate(${midpointX + (-deltaY / length) * 26}, ${
          midpointY + (deltaX / length) * 26
        })`}
      >
        <rect
          x="-22"
          y="-9"
          width="44"
          height="18"
          rx="9"
          fill="#0b302c"
          stroke="#6b897a"
          strokeOpacity="0.6"
        />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          className="chart-route-label"
        >
          ROUTE
        </text>
      </g>
    </g>
  )
}

function Marker({
  point,
  label,
  tone,
}: {
  point: PlotPoint
  label: string
  tone: 'start' | 'end'
}) {
  const isStart = tone === 'start'
  const color = isStart ? '#f0714c' : '#e9c86b'
  const labelOnRight = point.x < VIEW_WIDTH - 80
  const labelX = labelOnRight ? point.x + 24 : point.x - 24
  const textAnchor = labelOnRight ? 'start' : 'end'

  return (
    <g aria-hidden="true">
      <circle
        cx={point.x}
        cy={point.y}
        r="27"
        fill={color}
        opacity="0.1"
        className={isStart ? 'marker-halo marker-halo--start' : 'marker-halo'}
      />
      <circle
        cx={point.x}
        cy={point.y}
        r="12"
        fill={color}
        stroke="#f7f1e6"
        strokeWidth="2.5"
      />
      <text
        x={point.x}
        y={point.y + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        className="chart-marker-letter"
      >
        {isStart ? 'A' : 'B'}
      </text>
      <text
        x={labelX}
        y={point.y - 2}
        textAnchor={textAnchor}
        className="chart-marker-kicker"
      >
        {isStart ? 'START' : 'FINISH'}
      </text>
      <text
        x={labelX}
        y={point.y + 12}
        textAnchor={textAnchor}
        className="chart-marker-coord"
      >
        {label}
      </text>
    </g>
  )
}

export default function RoutePreview({
  start,
  end,
  routeName,
  startFormat,
  endFormat,
}: RoutePreviewProps) {
  const hasRoute = Boolean(start && end)
  const points = start && end ? projectRoute(start, end) : null
  const distance = start && end ? distanceNm(start, end) : null
  const bearing = start && end ? initialBearing(start, end) : null
  const displayName = routeName.trim() || 'Untitled route'

  return (
    <section className="chart-card" aria-labelledby="chart-title">
      <div className="chart-card__header">
        <div>
          <p className="kicker kicker--light">
            <span className="kicker__line kicker__line--light" aria-hidden="true" />
            Chart preview
          </p>
          <h2 id="chart-title">{displayName}</h2>
        </div>
        <span className="live-badge">
          <span className="live-badge__dot" />
          {hasRoute ? 'Plot ready' : 'Awaiting marks'}
        </span>
      </div>

      <div className="chart-canvas">
        <svg
          className="chart-svg"
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          role="img"
          aria-label={
            hasRoute && start && end
              ? `Route preview from ${formatDd(start.lat)}, ${formatDd(start.lon)} to ${formatDd(end.lat)}, ${formatDd(end.lon)}`
              : 'Route chart awaiting valid start and end coordinates'
          }
        >
          <defs>
            <pattern
              id="chart-grid"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 32 0 H 0 V 32"
                fill="none"
                stroke="#adc8b9"
                strokeOpacity="0.09"
                strokeWidth="1"
              />
            </pattern>
            <radialGradient id="chart-glow" cx="50%" cy="42%" r="70%">
              <stop offset="0%" stopColor="#155046" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#082925" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="chart-route" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f5eee1" />
              <stop offset="100%" stopColor="#c3d7c7" />
            </linearGradient>
          </defs>

          <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="#0a2d29" />
          <rect
            width={VIEW_WIDTH}
            height={VIEW_HEIGHT}
            fill="url(#chart-glow)"
          />
          <rect
            width={VIEW_WIDTH}
            height={VIEW_HEIGHT}
            fill="url(#chart-grid)"
          />

          <g
            fill="none"
            stroke="#b8d0c0"
            strokeWidth="1"
            opacity="0.13"
            aria-hidden="true"
          >
            <path d="M-70 300 C 40 235, 145 245, 228 188 S 405 110, 720 140" />
            <path d="M-50 335 C 70 267, 171 274, 250 219 S 432 145, 740 172" />
            <path d="M-24 372 C 100 302, 201 302, 281 252 S 460 183, 760 206" />
            <path d="M-90 240 C 30 183, 124 198, 205 143 S 390 72, 700 100" />
            <path d="M-80 98 C 20 58, 86 54, 162 74 S 312 125, 407 82 S 546 24, 720 50" />
            <ellipse cx="110" cy="86" rx="94" ry="54" />
            <ellipse cx="110" cy="86" rx="132" ry="78" />
            <ellipse cx="110" cy="86" rx="171" ry="103" />
            <ellipse cx="567" cy="314" rx="90" ry="57" />
            <ellipse cx="567" cy="314" rx="128" ry="82" />
            <ellipse cx="567" cy="314" rx="168" ry="108" />
          </g>

          <g
            fill="#aec6b8"
            opacity="0.25"
            aria-hidden="true"
            className="chart-soundings"
          >
            <text x="40" y="62">
              24
            </text>
            <text x="302" y="332">
              18
            </text>
            <text x="212" y="58">
              · 32
            </text>
            <text x="552" y="159">
              · 41
            </text>
            <text x="486" y="86">
              12
            </text>
          </g>

          <g aria-hidden="true" className="chart-scale">
            <path
              d="M 38 348 H 128 M 38 343 V 353 M 128 343 V 353 M 83 345 V 351"
              stroke="#c0d4c5"
              strokeOpacity="0.5"
              fill="none"
            />
            <text x="38" y="332">
              0
            </text>
            <text x="128" y="332" textAnchor="end">
              2 nm
            </text>
          </g>

          <g
            transform={`translate(${VIEW_WIDTH - 62} 326)`}
            opacity="0.65"
            aria-hidden="true"
          >
            <circle r="22" fill="none" stroke="#c4d7c8" strokeWidth="1" />
            <path
              d="M 0 -18 L 4.5 0 L 0 18 L -4.5 0 Z"
              fill="#c4d7c8"
              opacity="0.85"
            />
            <path d="M -18 0 L 0 4 L 18 0 L 0 -4 Z" fill="#c4d7c8" opacity="0.35" />
            <text
              y="-28"
              textAnchor="middle"
              className="chart-compass-label"
            >
              N
            </text>
          </g>

          {points && start && end && (
            <>
              <RouteLine start={points.start} end={points.end} />
              <Marker
                point={points.start}
                label={`${formatDd(start.lat)} / ${formatDd(start.lon)}`}
                tone="start"
              />
              <Marker
                point={points.end}
                label={`${formatDd(end.lat)} / ${formatDd(end.lon)}`}
                tone="end"
              />
            </>
          )}

          {!hasRoute && (
            <g>
              <circle
                cx={VIEW_WIDTH / 2}
                cy={VIEW_HEIGHT / 2 - 18}
                r="34"
                fill="none"
                stroke="#e9c86b"
                strokeOpacity="0.5"
                strokeDasharray="3 6"
              />
              <path
                d={`M ${VIEW_WIDTH / 2 - 11} ${VIEW_HEIGHT / 2 - 24} L ${VIEW_WIDTH / 2 + 9} ${VIEW_HEIGHT / 2 - 34} L ${VIEW_WIDTH / 2 + 1} ${VIEW_HEIGHT / 2 - 13} L ${VIEW_WIDTH / 2 + 7} ${VIEW_HEIGHT / 2 - 2}`}
                fill="none"
                stroke="#e9c86b"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
              <text
                x={VIEW_WIDTH / 2}
                y={VIEW_HEIGHT / 2 + 42}
                textAnchor="middle"
                className="chart-empty-title"
              >
                Waiting for two marks
              </text>
              <text
                x={VIEW_WIDTH / 2}
                y={VIEW_HEIGHT / 2 + 60}
                textAnchor="middle"
                className="chart-empty-copy"
              >
                Valid start and end coordinates will plot here.
              </text>
            </g>
          )}

          <text
            x="38"
            y={VIEW_HEIGHT - 24}
            className="chart-watermark"
            aria-hidden="true"
          >
            TIDELINE / CHART 07
          </text>
        </svg>
      </div>

      <div className="chart-stats">
        <div className="chart-stat">
          <span className="chart-stat__label">Distance</span>
          <strong>
            {distance === null ? '—' : distance.toFixed(1)}
            <small>nm</small>
          </strong>
        </div>
        <div className="chart-stat">
          <span className="chart-stat__label">Bearing</span>
          <strong>
            {bearing === null ? '—' : `${Math.round((bearing + 360) % 360)}°`}
            <small>{bearing === null ? '' : bearingCardinal(bearing)}</small>
          </strong>
        </div>
        <div className="chart-stat">
          <span className="chart-stat__label">Input mix</span>
          <strong className="chart-stat__formats">
            {startFormat}
            <span aria-hidden="true">/</span>
            {endFormat}
          </strong>
        </div>
      </div>
    </section>
  )
}
