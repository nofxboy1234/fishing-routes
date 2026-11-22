import { useEffect, useRef, useState, type FormEvent } from 'react'
import RoutePreview from './components/RoutePreview'
import {
  formatDd,
  parseWaypoint,
  type ParseResult,
  type RouteCoordinate,
} from './lib/coordinates'
import { buildGpx, downloadGpx, gpxFilename } from './lib/gpx'
import './App.css'

type WaypointKey = 'start' | 'end'
type FieldKey = 'lat' | 'lon'

interface WaypointDraft {
  lat: string
  lon: string
}

type WaypointDrafts = Record<WaypointKey, WaypointDraft>
type ParsedWaypoints = Record<
  WaypointKey,
  Record<FieldKey, ParseResult>
>

const ROUTE_NAME_LIMIT = 80

const SAMPLE_ROUTE = {
  routeName: 'Fishing Spot Route',
  start: {
    lat: '-29.9357194',
    lon: '31.0096464',
  },
  end: {
    lat: '-29.960267',
    lon: '31.016500',
  },
}

function cloneSampleWaypoints(): WaypointDrafts {
  return {
    start: { ...SAMPLE_ROUTE.start },
    end: { ...SAMPLE_ROUTE.end },
  }
}

function validCoordinate(
  parsed: Record<FieldKey, ParseResult>,
): RouteCoordinate | null {
  if (parsed.lat.ok && parsed.lon.ok) {
    return {
      lat: parsed.lat.value,
      lon: parsed.lon.value,
      latDecimals: parsed.lat.decimals,
      lonDecimals: parsed.lon.decimals,
    }
  }
  return null
}

function detectedFormatLabel(
  parsed: Record<FieldKey, ParseResult>,
): string {
  if (!parsed.lat.ok || !parsed.lon.ok) {
    return '—'
  }

  return parsed.lat.format === parsed.lon.format
    ? parsed.lat.format.toUpperCase()
    : 'DD+DDM'
}

function CompassMark() {
  return (
    <svg
      className="brand-mark"
      viewBox="0 0 44 44"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="22" cy="22" r="20.5" fill="none" stroke="currentColor" />
      <circle cx="22" cy="22" r="14" fill="none" stroke="currentColor" opacity=".32" />
      <path
        d="M22 5.5 25.6 18.4 38.5 22 25.6 25.6 22 38.5 18.4 25.6 5.5 22 18.4 18.4Z"
        fill="currentColor"
      />
      <circle cx="22" cy="22" r="2.4" fill="var(--paper)" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4 16.5v2.25A2.25 2.25 0 0 0 6.25 21h11.5A2.25 2.25 0 0 0 20 18.75V16.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function CopyIcon({ copied }: { copied: boolean }) {
  if (copied) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="m5 12.5 4.2 4.2L19 7"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect
        x="8"
        y="8"
        width="11"
        height="12"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 5v5h5M5.2 15a7 7 0 1 0 .2-6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <rect
        x="4.5"
        y="8.5"
        width="11"
        height="8"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M7 8.5V6.8a3 3 0 1 1 6 0v1.7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  )
}

function App() {
  const [routeName, setRouteName] = useState(SAMPLE_ROUTE.routeName)
  const [waypoints, setWaypoints] = useState<WaypointDrafts>(
    cloneSampleWaypoints,
  )
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  )
  const copyTimer = useRef<number | null>(null)

  const parsed: ParsedWaypoints = {
    start: parseWaypoint(waypoints.start.lat, waypoints.start.lon),
    end: parseWaypoint(waypoints.end.lat, waypoints.end.lon),
  }

  const startCoordinate = validCoordinate(parsed.start)
  const endCoordinate = validCoordinate(parsed.end)
  const trimmedRouteName = routeName.trim()
  const nameError =
    trimmedRouteName.length === 0 ? 'Give this route a name.' : null
  const canExport = Boolean(startCoordinate && endCoordinate && !nameError)

  const previewGpx =
    canExport && startCoordinate && endCoordinate
      ? buildGpx({
          start: startCoordinate,
          end: endCoordinate,
          routeName: trimmedRouteName,
        })
      : ''

  const filename = gpxFilename(trimmedRouteName || 'fishing-route')

  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) {
        window.clearTimeout(copyTimer.current)
      }
    }
  }, [])

  function updateWaypoint(
    waypoint: WaypointKey,
    field: FieldKey,
    value: string,
  ) {
    setWaypoints((current) => ({
      ...current,
      [waypoint]: {
        ...current[waypoint],
        [field]: value,
      },
    }))
    setCopyState('idle')
  }

  function fieldError(
    waypoint: WaypointKey,
    field: FieldKey,
  ): string | null {
    const result = parsed[waypoint][field]
    return result.ok ? null : result.error
  }

  function resetSample() {
    setRouteName(SAMPLE_ROUTE.routeName)
    setWaypoints(cloneSampleWaypoints())
    setCopyState('idle')
  }

  function handleDownload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canExport || !startCoordinate || !endCoordinate || !previewGpx) {
      return
    }

    downloadGpx(previewGpx, filename)
  }

  async function handleCopy() {
    if (!previewGpx) {
      return
    }

    try {
      await navigator.clipboard.writeText(previewGpx)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }

    if (copyTimer.current !== null) {
      window.clearTimeout(copyTimer.current)
    }
    copyTimer.current = window.setTimeout(() => setCopyState('idle'), 2000)
  }

  function renderConversion(waypoint: WaypointKey) {
    const latitude = parsed[waypoint].lat
    const longitude = parsed[waypoint].lon
    const ready = latitude.ok && longitude.ok

    return (
      <div
        className={`conversion ${ready ? 'conversion--ready' : ''}`}
        aria-live="polite"
      >
        <span className="conversion__label">
          <span className="conversion__dot" aria-hidden="true" />
          Standard DD
        </span>
        <span className="conversion__value">
          {latitude.ok && longitude.ok ? (
            <>
              {formatDd(latitude.value, latitude.decimals)}
              <span className="conversion__divider"> / </span>
              {formatDd(longitude.value, longitude.decimals)}
            </>
          ) : (
            '— / —'
          )}
        </span>
      </div>
    )
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="brand" aria-label="Tideline route builder">
          <CompassMark />
          <span className="brand__words">
            <span className="brand__name">Tideline</span>
            <span className="brand__tag">Route builder</span>
          </span>
        </div>
        <div className="site-header__meta">
          <span className="header-note">
            <LockIcon />
            Everything stays in your browser
          </span>
          <span className="version-badge">
            GPX <strong>1.1</strong>
          </span>
        </div>
      </header>

      <main>
        <section className="intro" aria-labelledby="page-title">
          <div className="intro__heading">
            <p className="kicker">
              <span className="kicker__line" aria-hidden="true" />
              Coordinate → course
            </p>
            <h1 id="page-title">
              Chart the <em>next drop.</em>
            </h1>
          </div>
          <div className="intro__aside">
            <p>
              Turn two marks into an import-ready GPX route. Type decimal
              degrees or degrees and decimal minutes into any field—Tideline
              detects the format, converts, plots, and packages the file.
            </p>
            <div className="intro__tags" aria-label="Supported input features">
              <span>Auto-detect</span>
              <span>DD + DDM</span>
              <span>No upload</span>
            </div>
          </div>
        </section>

        <div className="workspace">
          <form
            className="route-panel"
            onSubmit={handleDownload}
            noValidate
            aria-labelledby="route-panel-title"
          >
            <div className="panel-heading">
              <div>
                <p className="kicker">
                  <span className="kicker__step">01</span>
                  Route brief
                </p>
                <h2 id="route-panel-title">Plot your course</h2>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={resetSample}
              >
                <ResetIcon />
                Reset sample
              </button>
            </div>

            <div className="field route-name-field">
              <div className="field__topline">
                <label htmlFor="route-name">Route name</label>
                <span className="field__meta">Shown in the GPX track</span>
              </div>
              <input
                id="route-name"
                name="routeName"
                type="text"
                value={routeName}
                onChange={(event) => {
                  setRouteName(event.target.value)
                  setCopyState('idle')
                }}
                maxLength={ROUTE_NAME_LIMIT}
                placeholder="Fishing Spot Route"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={Boolean(nameError)}
                aria-describedby={nameError ? 'route-name-error' : undefined}
              />
              {nameError && (
                <p className="field-error" id="route-name-error" role="alert">
                  {nameError}
                </p>
              )}
            </div>

            {(['start', 'end'] as const).map((waypoint) => {
              const draft = waypoints[waypoint]
              const isStart = waypoint === 'start'
              const heading = isStart ? 'Start waypoint' : 'End waypoint'
              const message =
                'DD or DDM is detected automatically. South and west can be signed with a minus, or written with N/S/E/W.'
              const latitudePlaceholder = '-29.9357194'
              const longitudePlaceholder = '31.0096464'
              const latError = fieldError(waypoint, 'lat')
              const lonError = fieldError(waypoint, 'lon')
              const latFormat = parsed[waypoint].lat
              const lonFormat = parsed[waypoint].lon
              const latHintId = `${waypoint}-lat-hint`
              const lonHintId = `${waypoint}-lon-hint`

              return (
                <section
                  className={`waypoint-card waypoint-card--${waypoint}`}
                  key={waypoint}
                  aria-labelledby={`${waypoint}-heading`}
                >
                  <div className="waypoint-head">
                    <div className="waypoint-title">
                      <span
                        className={`waypoint-marker waypoint-marker--${waypoint}`}
                        aria-hidden="true"
                      >
                        {isStart ? 'A' : 'B'}
                      </span>
                      <div>
                        <span className="waypoint-index">
                          {isStart ? 'Waypoint 01' : 'Waypoint 02'}
                        </span>
                        <h3 id={`${waypoint}-heading`}>{heading}</h3>
                      </div>
                    </div>

                    <span
                      className="auto-badge"
                      title="Coordinate formats are detected automatically"
                    >
                      <span className="auto-badge__dot" aria-hidden="true" />
                      Auto-detect
                    </span>
                  </div>

                  <div className="coordinate-grid">
                    <div className="field">
                      <div className="field__topline">
                        <label htmlFor={`${waypoint}-lat`}>Latitude</label>
                        <span
                          className={`field__meta${latFormat.ok ? ' field__meta--detected' : ''}`}
                        >
                          {latFormat.ok
                            ? latFormat.format.toUpperCase()
                            : 'DD or DDM'}
                        </span>
                      </div>
                      <input
                        id={`${waypoint}-lat`}
                        name={`${waypoint}Latitude`}
                        type="text"
                        inputMode="text"
                        value={draft.lat}
                        onChange={(event) =>
                          updateWaypoint(waypoint, 'lat', event.target.value)
                        }
                        placeholder={latitudePlaceholder}
                        autoComplete="off"
                        spellCheck={false}
                        autoCapitalize="none"
                        aria-invalid={Boolean(latError)}
                        aria-describedby={`${latHintId}${latError ? ` ${waypoint}-lat-error` : ''}`}
                      />
                      <p className="sr-only" id={latHintId}>
                        Latitude. Enter DD (for example -29.9357194) or DDM (for
                        example 29° 56.1432′ S). {message}
                      </p>
                      {latError && (
                        <p
                          className="field-error"
                          id={`${waypoint}-lat-error`}
                          role="alert"
                        >
                          {latError}
                        </p>
                      )}
                    </div>

                    <div className="field">
                      <div className="field__topline">
                        <label htmlFor={`${waypoint}-lon`}>Longitude</label>
                        <span
                          className={`field__meta${lonFormat.ok ? ' field__meta--detected' : ''}`}
                        >
                          {lonFormat.ok
                            ? lonFormat.format.toUpperCase()
                            : 'DD or DDM'}
                        </span>
                      </div>
                      <input
                        id={`${waypoint}-lon`}
                        name={`${waypoint}Longitude`}
                        type="text"
                        inputMode="text"
                        value={draft.lon}
                        onChange={(event) =>
                          updateWaypoint(waypoint, 'lon', event.target.value)
                        }
                        placeholder={longitudePlaceholder}
                        autoComplete="off"
                        spellCheck={false}
                        autoCapitalize="none"
                        aria-invalid={Boolean(lonError)}
                        aria-describedby={`${lonHintId}${lonError ? ` ${waypoint}-lon-error` : ''}`}
                      />
                      <p className="sr-only" id={lonHintId}>
                        Longitude. Enter DD (for example 31.0096464) or DDM (for
                        example 31° 00.5788′ E). {message}
                      </p>
                      {lonError && (
                        <p
                          className="field-error"
                          id={`${waypoint}-lon-error`}
                          role="alert"
                        >
                          {lonError}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="waypoint-meta">
                    <p className="waypoint-hint">
                      <span aria-hidden="true">↳</span>
                      {message}
                    </p>
                    {renderConversion(waypoint)}
                  </div>
                </section>
              )
            })}

            <div className="export-zone">
              <div className="export-status" aria-live="polite">
                <span
                  className={`status-dot ${canExport ? 'status-dot--ready' : ''}`}
                  aria-hidden="true"
                />
                <div>
                  <strong>
                    {canExport ? 'Ready for the file' : 'Route incomplete'}
                  </strong>
                  <span>
                    {canExport
                      ? 'GPX 1.1 · precision preserved'
                      : 'Check both waypoints to unlock export.'}
                  </span>
                </div>
              </div>
              <button
                className="download-button"
                type="submit"
                disabled={!canExport}
              >
                <DownloadIcon />
                <span>Download GPX</span>
              </button>
            </div>
          </form>

          <aside className="preview-column" aria-label="Route preview and file">
            <RoutePreview
              start={startCoordinate}
              end={endCoordinate}
              routeName={routeName}
              startFormat={detectedFormatLabel(parsed.start)}
              endFormat={detectedFormatLabel(parsed.end)}
            />

            <section className="gpx-panel" aria-labelledby="gpx-title">
              <div className="panel-heading panel-heading--compact">
                <div>
                  <p className="kicker">
                    <span className="kicker__step">02</span>
                    File preview
                  </p>
                  <h2 id="gpx-title">Ready to import</h2>
                </div>
                <button
                  type="button"
                  className={`copy-button ${copyState === 'copied' ? 'is-copied' : ''}`}
                  onClick={handleCopy}
                  disabled={!previewGpx}
                >
                  <CopyIcon copied={copyState === 'copied'} />
                  {copyState === 'copied'
                    ? 'Copied'
                    : copyState === 'failed'
                      ? 'Try again'
                      : 'Copy GPX'}
                </button>
              </div>

              <div className="code-frame">
                <div className="code-toolbar" aria-hidden="true">
                  <span className="code-filename">
                    <span className="code-filename__dot" />
                    {filename}
                  </span>
                  <span>GPX · UTF-8</span>
                </div>
                <pre className="code-block" aria-label="GPX file preview">
                  <code>
                    {previewGpx ||
                      'Add valid start and end coordinates to build the GPX preview.'}
                  </code>
                </pre>
              </div>
              <p className="gpx-note">
                Coordinates are written as standard decimal degrees with at
                least six decimal places. Extra input precision is preserved.
              </p>
            </section>
          </aside>
        </div>
      </main>

      <footer className="site-footer">
        <span>Made for the next mark.</span>
        <span className="site-footer__detail">
          DD + DDM <i aria-hidden="true">·</i> GPX 1.1{' '}
          <i aria-hidden="true">·</i> Local only
        </span>
      </footer>
    </div>
  )
}

export default App
