import { useState, type ClipboardEvent, type FormEvent } from 'react'
import RoutePreview from './components/RoutePreview'
import {
  formatDd,
  formatDdmParts,
  parseCoordinate,
  parseCoordinatePair,
  parseDdCoordinate,
  parseDdmParts,
  type CoordinateFormat,
  type ParseResult,
  type RouteCoordinate,
} from './lib/coordinates'
import { buildGpx, downloadGpx, gpxFilename } from './lib/gpx'
import './App.css'

type WaypointKey = 'start' | 'end'
type FieldKey = 'lat' | 'lon'

interface DdDraft {
  lat: string
  lon: string
}

interface DdmDraft {
  latDegrees: string
  latMinutes: string
  lonDegrees: string
  lonMinutes: string
}

type DdmFieldKey = keyof DdmDraft

interface WaypointDraft {
  format: CoordinateFormat
  dd: DdDraft
  ddm: DdmDraft
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

function createWaypointDraft(lat: string, lon: string): WaypointDraft {
  const latitudeParts = formatDdmParts(Number(lat))
  const longitudeParts = formatDdmParts(Number(lon))

  return {
    format: 'ddm',
    dd: { lat, lon },
    ddm: {
      latDegrees: latitudeParts.degrees,
      latMinutes: latitudeParts.minutes,
      lonDegrees: longitudeParts.degrees,
      lonMinutes: longitudeParts.minutes,
    },
  }
}

function cloneSampleWaypoints(): WaypointDrafts {
  return {
    start: createWaypointDraft(SAMPLE_ROUTE.start.lat, SAMPLE_ROUTE.start.lon),
    end: createWaypointDraft(SAMPLE_ROUTE.end.lat, SAMPLE_ROUTE.end.lon),
  }
}

function parseWaypointDraft(
  draft: WaypointDraft,
): Record<FieldKey, ParseResult> {
  if (draft.format === 'dd') {
    return {
      lat: parseDdCoordinate(draft.dd.lat, 'lat'),
      lon: parseDdCoordinate(draft.dd.lon, 'lon'),
    }
  }

  return {
    lat: parseDdmParts(
      draft.ddm.latDegrees,
      draft.ddm.latMinutes,
      'lat',
    ),
    lon: parseDdmParts(
      draft.ddm.lonDegrees,
      draft.ddm.lonMinutes,
      'lon',
    ),
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
  const parsed: ParsedWaypoints = {
    start: parseWaypointDraft(waypoints.start),
    end: parseWaypointDraft(waypoints.end),
  }

  const startCoordinate = validCoordinate(parsed.start)
  const endCoordinate = validCoordinate(parsed.end)
  const trimmedRouteName = routeName.trim()
  const nameError =
    trimmedRouteName.length === 0 ? 'Give this route a name.' : null
  const canExport = Boolean(startCoordinate && endCoordinate && !nameError)

  const gpxContent =
    canExport && startCoordinate && endCoordinate
      ? buildGpx({
          start: startCoordinate,
          end: endCoordinate,
          routeName: trimmedRouteName,
        })
      : ''

  const filename = gpxFilename(trimmedRouteName || 'fishing-route')

  function updateDdField(
    waypoint: WaypointKey,
    field: FieldKey,
    value: string,
  ) {
    setWaypoints((current) => ({
      ...current,
      [waypoint]: {
        ...current[waypoint],
        dd: {
          ...current[waypoint].dd,
          [field]: value,
        },
      },
    }))
  }

  function updateDdmField(
    waypoint: WaypointKey,
    field: DdmFieldKey,
    value: string,
  ) {
    setWaypoints((current) => ({
      ...current,
      [waypoint]: {
        ...current[waypoint],
        ddm: {
          ...current[waypoint].ddm,
          [field]: value,
        },
      },
    }))
  }

  function changeFormat(
    waypoint: WaypointKey,
    nextFormat: CoordinateFormat,
  ) {
    setWaypoints((current) => {
      const draft = current[waypoint]
      if (draft.format === nextFormat) {
        return current
      }

      const currentParsed = parseWaypointDraft(draft)
      if (!currentParsed.lat.ok || !currentParsed.lon.ok) {
        return {
          ...current,
          [waypoint]: { ...draft, format: nextFormat },
        }
      }

      if (nextFormat === 'dd') {
        return {
          ...current,
          [waypoint]: {
            ...draft,
            format: 'dd',
            dd: {
              lat: formatDd(currentParsed.lat.value, currentParsed.lat.decimals),
              lon: formatDd(currentParsed.lon.value, currentParsed.lon.decimals),
            },
          },
        }
      }

      const latitudeParts = formatDdmParts(currentParsed.lat.value)
      const longitudeParts = formatDdmParts(currentParsed.lon.value)

      return {
        ...current,
        [waypoint]: {
          ...draft,
          format: 'ddm',
          ddm: {
            latDegrees: latitudeParts.degrees,
            latMinutes: latitudeParts.minutes,
            lonDegrees: longitudeParts.degrees,
            lonMinutes: longitudeParts.minutes,
          },
        },
      }
    })
  }

  function handleCoordinatePaste(
    event: ClipboardEvent<HTMLInputElement>,
    waypoint: WaypointKey,
  ) {
    const pair = parseCoordinatePair(event.clipboardData.getData('text'))
    if (!pair) {
      return
    }

    const latitude = parseCoordinate(pair.lat, 'lat')
    const longitude = parseCoordinate(pair.lon, 'lon')
    if (!latitude.ok || !longitude.ok) {
      return
    }

    event.preventDefault()
    const latitudeParts = formatDdmParts(latitude.value)
    const longitudeParts = formatDdmParts(longitude.value)

    setWaypoints((current) => ({
      ...current,
      [waypoint]: {
        ...current[waypoint],
        dd: {
          lat: formatDd(latitude.value, latitude.decimals),
          lon: formatDd(longitude.value, longitude.decimals),
        },
        ddm: {
          latDegrees: latitudeParts.degrees,
          latMinutes: latitudeParts.minutes,
          lonDegrees: longitudeParts.degrees,
          lonMinutes: longitudeParts.minutes,
        },
      },
    }))
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
  }

  function handleDownload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canExport || !startCoordinate || !endCoordinate || !gpxContent) {
      return
    }

    downloadGpx(gpxContent, filename)
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
              Turn two marks into an import-ready GPX route. Choose DD or DDM
              for each waypoint—DDM is the default and splits degrees and
              minutes into separate fields. Tideline converts to DD for the GPX
              file.
            </p>
            <div className="intro__tags" aria-label="Supported input features">
              <span>DDM default</span>
              <span>Converts to DD</span>
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
                draft.format === 'ddm'
                  ? 'Use signed degrees and decimal minutes. A minus makes the coordinate south or west. Paste a full pair into any field to fill both.'
                  : 'Use signed decimal degrees. Paste a full pair into either field to fill both.'
              const latError = fieldError(waypoint, 'lat')
              const lonError = fieldError(waypoint, 'lon')
              const latHintId = `${waypoint}-lat-hint`
              const lonHintId = `${waypoint}-lon-hint`
              const latAxisId = `${waypoint}-lat-axis`
              const lonAxisId = `${waypoint}-lon-axis`

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

                    <div
                      className="format-toggle"
                      role="group"
                      aria-label={`${heading} coordinate format`}
                    >
                      <button
                        type="button"
                        className={
                          draft.format === 'dd' ? 'is-active' : undefined
                        }
                        aria-pressed={draft.format === 'dd'}
                        onClick={() => changeFormat(waypoint, 'dd')}
                        title="Decimal degrees"
                      >
                        DD
                      </button>
                      <button
                        type="button"
                        className={
                          draft.format === 'ddm' ? 'is-active' : undefined
                        }
                        aria-pressed={draft.format === 'ddm'}
                        onClick={() => changeFormat(waypoint, 'ddm')}
                        title="Degrees and decimal minutes"
                      >
                        DDM
                      </button>
                    </div>
                  </div>

                  <div
                    className={`coordinate-grid${draft.format === 'ddm' ? ' coordinate-grid--ddm' : ''}`}
                  >
                    {draft.format === 'dd' ? (
                      <>
                        <div className="field">
                          <div className="field__topline">
                            <label htmlFor={`${waypoint}-lat`}>Latitude</label>
                            <span className="field__meta">DD</span>
                          </div>
                          <input
                            id={`${waypoint}-lat`}
                            name={`${waypoint}Latitude`}
                            type="text"
                            inputMode="text"
                            value={draft.dd.lat}
                            onChange={(event) =>
                              updateDdField(
                                waypoint,
                                'lat',
                                event.target.value,
                              )
                            }
                            onPaste={(event) =>
                              handleCoordinatePaste(event, waypoint)
                            }
                            placeholder="-29.9357194"
                            autoComplete="off"
                            spellCheck={false}
                            autoCapitalize="none"
                            aria-invalid={Boolean(latError)}
                            aria-describedby={`${latHintId}${latError ? ` ${waypoint}-lat-error` : ''}`}
                          />
                          <p className="sr-only" id={latHintId}>
                            Latitude in decimal degrees. {message}
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
                            <label htmlFor={`${waypoint}-lon`}>
                              Longitude
                            </label>
                            <span className="field__meta">DD</span>
                          </div>
                          <input
                            id={`${waypoint}-lon`}
                            name={`${waypoint}Longitude`}
                            type="text"
                            inputMode="text"
                            value={draft.dd.lon}
                            onChange={(event) =>
                              updateDdField(
                                waypoint,
                                'lon',
                                event.target.value,
                              )
                            }
                            onPaste={(event) =>
                              handleCoordinatePaste(event, waypoint)
                            }
                            placeholder="31.0096464"
                            autoComplete="off"
                            spellCheck={false}
                            autoCapitalize="none"
                            aria-invalid={Boolean(lonError)}
                            aria-describedby={`${lonHintId}${lonError ? ` ${waypoint}-lon-error` : ''}`}
                          />
                          <p className="sr-only" id={lonHintId}>
                            Longitude in decimal degrees. {message}
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
                      </>
                    ) : (
                      <>
                        <div
                          className="field field--ddm"
                          role="group"
                          aria-labelledby={latAxisId}
                        >
                          <div className="field__topline">
                            <span className="field__axis" id={latAxisId}>
                              Latitude
                            </span>
                            <span className="field__meta">DDM</span>
                          </div>
                          <div className="ddm-inputs">
                            <label className="ddm-part">
                              <span>Degrees</span>
                              <input
                                id={`${waypoint}-lat-degrees`}
                                name={`${waypoint}LatitudeDegrees`}
                                type="text"
                                inputMode="text"
                                value={draft.ddm.latDegrees}
                                onChange={(event) =>
                                  updateDdmField(
                                    waypoint,
                                    'latDegrees',
                                    event.target.value,
                                  )
                                }
                                onPaste={(event) =>
                                  handleCoordinatePaste(event, waypoint)
                                }
                                placeholder="-29"
                                autoComplete="off"
                                spellCheck={false}
                                autoCapitalize="none"
                                aria-label={`${heading} latitude degrees`}
                                aria-invalid={Boolean(latError)}
                                aria-describedby={`${latHintId}${latError ? ` ${waypoint}-lat-error` : ''}`}
                              />
                            </label>
                            <label className="ddm-part">
                              <span>Minutes</span>
                              <input
                                id={`${waypoint}-lat-minutes`}
                                name={`${waypoint}LatitudeMinutes`}
                                type="text"
                                inputMode="text"
                                value={draft.ddm.latMinutes}
                                onChange={(event) =>
                                  updateDdmField(
                                    waypoint,
                                    'latMinutes',
                                    event.target.value,
                                  )
                                }
                                onPaste={(event) =>
                                  handleCoordinatePaste(event, waypoint)
                                }
                                placeholder="56.143164"
                                autoComplete="off"
                                spellCheck={false}
                                autoCapitalize="none"
                                aria-label={`${heading} latitude minutes`}
                                aria-invalid={Boolean(latError)}
                                aria-describedby={`${latHintId}${latError ? ` ${waypoint}-lat-error` : ''}`}
                              />
                            </label>
                          </div>
                          <p className="sr-only" id={latHintId}>
                            Latitude degrees and decimal minutes. Use a minus
                            for south. {message}
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

                        <div
                          className="field field--ddm"
                          role="group"
                          aria-labelledby={lonAxisId}
                        >
                          <div className="field__topline">
                            <span className="field__axis" id={lonAxisId}>
                              Longitude
                            </span>
                            <span className="field__meta">DDM</span>
                          </div>
                          <div className="ddm-inputs">
                            <label className="ddm-part">
                              <span>Degrees</span>
                              <input
                                id={`${waypoint}-lon-degrees`}
                                name={`${waypoint}LongitudeDegrees`}
                                type="text"
                                inputMode="text"
                                value={draft.ddm.lonDegrees}
                                onChange={(event) =>
                                  updateDdmField(
                                    waypoint,
                                    'lonDegrees',
                                    event.target.value,
                                  )
                                }
                                onPaste={(event) =>
                                  handleCoordinatePaste(event, waypoint)
                                }
                                placeholder="31"
                                autoComplete="off"
                                spellCheck={false}
                                autoCapitalize="none"
                                aria-label={`${heading} longitude degrees`}
                                aria-invalid={Boolean(lonError)}
                                aria-describedby={`${lonHintId}${lonError ? ` ${waypoint}-lon-error` : ''}`}
                              />
                            </label>
                            <label className="ddm-part">
                              <span>Minutes</span>
                              <input
                                id={`${waypoint}-lon-minutes`}
                                name={`${waypoint}LongitudeMinutes`}
                                type="text"
                                inputMode="text"
                                value={draft.ddm.lonMinutes}
                                onChange={(event) =>
                                  updateDdmField(
                                    waypoint,
                                    'lonMinutes',
                                    event.target.value,
                                  )
                                }
                                onPaste={(event) =>
                                  handleCoordinatePaste(event, waypoint)
                                }
                                placeholder="0.578784"
                                autoComplete="off"
                                spellCheck={false}
                                autoCapitalize="none"
                                aria-label={`${heading} longitude minutes`}
                                aria-invalid={Boolean(lonError)}
                                aria-describedby={`${lonHintId}${lonError ? ` ${waypoint}-lon-error` : ''}`}
                              />
                            </label>
                          </div>
                          <p className="sr-only" id={lonHintId}>
                            Longitude degrees and decimal minutes. Use a minus
                            for west. {message}
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
                      </>
                    )}
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

          <aside className="preview-column" aria-label="Route preview">
            <RoutePreview
              start={startCoordinate}
              end={endCoordinate}
              routeName={routeName}
              startFormat={waypoints.start.format.toUpperCase()}
              endFormat={waypoints.end.format.toUpperCase()}
            />
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
