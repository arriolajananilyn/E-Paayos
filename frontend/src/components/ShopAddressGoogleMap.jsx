import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { MapPinned } from 'lucide-react'

/** Vite + Leaflet default icon paths */
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search'
const OSRM_ROUTE = 'https://router.project-osrm.org/route/v1/driving'
const GEOCODE_DEBOUNCE_MS = 550
/** Nominatim usage: spread requests (~1/s max for heavy use; safe gap for a few fallbacks). */
const BETWEEN_TRY_MS = 650

const ROUTE_LINE_STYLE = {
  color: '#1447a6',
  weight: 6,
  opacity: 0.92,
  lineCap: 'round',
  lineJoin: 'round',
}

const ROUTE_FALLBACK_LINE_STYLE = {
  color: '#64748b',
  weight: 4,
  opacity: 0.65,
  dashArray: '8 10',
  lineCap: 'round',
  lineJoin: 'round',
}

const PH = 'Philippines'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function isLikelyPhilippines(lat, lon) {
  return lat >= 4.2 && lat <= 21.3 && lon >= 116.4 && lon <= 127.2
}

function normalizeQuery(s) {
  return String(s)
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/^[\s,]+|[\s,]+$/g, '')
    .trim()
}

function hasAddressParts(p) {
  if (!p) return false
  return !!(
    p.detailedAddress?.trim() ||
    p.barangay?.trim() ||
    p.cityMunicipality?.trim() ||
    p.province?.trim() ||
    p.region?.trim()
  )
}

/** Geocode queries tried in sequence — most specific first, then broader fallbacks. */
function buildGeocodeCandidates(parts) {
  const d = parts.detailedAddress?.trim() || ''
  const b = parts.barangay?.trim() || ''
  const c = parts.cityMunicipality?.trim() || ''
  const p = parts.province?.trim() || ''
  const r = parts.region?.trim() || ''
  const l = parts.landmark?.trim() || ''

  const isNcrLabel = /ncr|national capital|metro manila/i.test(r) || /ncr|national capital|metro manila/i.test(p)
  const metro = 'Metro Manila'

  const raw = []
  const push = (arr) => {
    const q = normalizeQuery(arr.filter(Boolean).join(', '))
    if (q && !raw.includes(q)) raw.push(q)
  }

  push([d, b, c, p, PH])
  push([d, b, c, PH])
  push([d, c, p, PH])
  push([b, c, p, PH])
  push([l, c, p, PH])
  push([l, b, c, PH])
  push([b, c, PH])
  push([c, p, PH])
  push([c, PH])
  push([p, PH])

  if (isNcrLabel && c) {
    push([d, b, c, metro, PH])
    push([b, c, metro, PH])
    push([d, c, metro, PH])
    push([c, metro, PH])
  }

  // Last fallback: omit "Philippines" (different OSM indexing)
  push([d, b, c, p])
  push([b, c, p])
  push([c, p])

  /** Cap query count for Nominatim rate guidance and shorter waits. */
  return raw.slice(0, 10)
}

/** Lower zoom when only a broader query matched. */
function zoomForCandidateIndex(index) {
  if (index <= 1) return 17
  if (index <= 4) return 16
  if (index <= 7) return 14
  return 12
}

async function nominatimSearch(query, { useCountryFilter }) {
  const params = new URLSearchParams({
    format: 'json',
    q: query,
    limit: '5',
    addressdetails: '1',
  })
  if (useCountryFilter) params.set('countrycodes', 'ph')

  const res = await fetch(`${NOMINATIM_SEARCH}?${params}`, {
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`Geocoding unavailable (${res.status})`)
  const data = await res.json()
  if (!Array.isArray(data) || !data.length) return null

  for (const row of data) {
    const lat = parseFloat(row.lat)
    const lng = parseFloat(row.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    if (useCountryFilter) {
      return { lat, lng, label: row.display_name || query }
    }
    if (isLikelyPhilippines(lat, lng)) {
      return { lat, lng, label: row.display_name || query }
    }
  }
  return null
}

async function geocodeWithFallbacks(candidates) {
  for (let i = 0; i < candidates.length; i++) {
    if (i > 0) await sleep(BETWEEN_TRY_MS)
    const q = candidates[i]
    let hit = await nominatimSearch(q, { useCountryFilter: true })
    if (!hit && i >= 2) {
      await sleep(400)
      hit = await nominatimSearch(q, { useCountryFilter: false })
    }
    if (hit) {
      return { ...hit, candidateIndex: i, zoom: zoomForCandidateIndex(i) }
    }
  }
  return null
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatRouteDistance(meters) {
  const m = Number(meters)
  if (!Number.isFinite(m) || m <= 0) return '—'
  if (m < 1000) return `${Math.round(m)} m`
  return `${(m / 1000).toFixed(1)} km`
}

function formatRouteDuration(seconds) {
  const s = Number(seconds)
  if (!Number.isFinite(s) || s <= 0) return '—'
  const mins = Math.max(1, Math.round(s / 60))
  if (mins < 60) return `~${mins} min`
  const h = Math.floor(mins / 60)
  const rem = mins % 60
  return rem ? `~${h} h ${rem} min` : `~${h} h`
}

/** OSRM driving route: origin → destination (OpenStreetMap road network). */
async function fetchOsrmRoute(origin, destination) {
  const { lat: oLat, lng: oLng } = origin
  const { lat: dLat, lng: dLng } = destination
  const url = `${OSRM_ROUTE}/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Routing unavailable (${res.status})`)
  const data = await res.json()
  if (data?.code !== 'Ok' || !Array.isArray(data.routes) || !data.routes.length) {
    throw new Error('No driving route found between these points.')
  }
  const route = data.routes[0]
  const coords = route?.geometry?.coordinates
  if (!Array.isArray(coords) || coords.length < 2) {
    throw new Error('Route geometry missing.')
  }
  const latLngs = coords.map(([lng, lat]) => [lat, lng])
  return {
    latLngs,
    distanceM: route.distance,
    durationS: route.duration,
    approximate: false,
  }
}

function buildStraightLineRoute(origin, destination) {
  const km = haversineKm(origin.lat, origin.lng, destination.lat, destination.lng)
  return {
    latLngs: [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ],
    distanceM: km * 1000,
    durationS: null,
    approximate: true,
  }
}

/**
 * Embedded map (OpenStreetMap) + pin — no API key.
 * `addressParts`: structured PSGC labels + detailed line for clearer geocoding fallbacks.
 * `showHeading`: when false, only the map + status (for embedding as a page header band).
 * `flush`: full-width map frame only — no card border/padding; optional caption under map hidden.
 * `secondaryPin`: optional `{ lat, lng, label? }` (e.g. customer GPS) — second marker + optional route line.
 * `showRouteLine`: when true and `secondaryPin` is set, draw OSRM driving route (OpenStreetMap) between pins.
 */
export default function ShopAddressGoogleMap({
  addressParts = null,
  mapTitle = 'Shop location',
  showHeading = true,
  emptyAddressHint = null,
  flush = false,
  secondaryPin = null,
  showRouteLine = false,
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const secondaryMarkerRef = useRef(null)
  const routePolylineRef = useRef(null)
  const lastShopViewRef = useRef(null)
  const routeRequestIdRef = useRef(0)
  const requestIdRef = useRef(0)
  const [status, setStatus] = useState('idle')
  const [resolvedLabel, setResolvedLabel] = useState('')
  const [approximate, setApproximate] = useState(false)
  const [googleDirectionsUrl, setGoogleDirectionsUrl] = useState('')
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeInfo, setRouteInfo] = useState(null)
  const [routeError, setRouteError] = useState('')

  const secondaryKey = useMemo(() => {
    if (
      !secondaryPin ||
      typeof secondaryPin.lat !== 'number' ||
      !Number.isFinite(secondaryPin.lat) ||
      typeof secondaryPin.lng !== 'number' ||
      !Number.isFinite(secondaryPin.lng)
    ) {
      return ''
    }
    return `${secondaryPin.lat},${secondaryPin.lng},${secondaryPin.label ?? ''}`
  }, [secondaryPin])

  const candidates = useMemo(() => {
    if (!hasAddressParts(addressParts)) return []
    return buildGeocodeCandidates(addressParts)
  }, [addressParts])

  const candidateKey = candidates.join('|')

  useEffect(() => {
    if (!candidates.length) {
      requestIdRef.current += 1
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      markerRef.current = null
      secondaryMarkerRef.current = null
      routePolylineRef.current = null
      lastShopViewRef.current = null
      queueMicrotask(() => {
        setStatus('empty')
        setResolvedLabel('')
        setApproximate(false)
        setGoogleDirectionsUrl('')
        setRouteLoading(false)
        setRouteInfo(null)
        setRouteError('')
      })
      return undefined
    }

    queueMicrotask(() => {
      setStatus('loading')
      setResolvedLabel('')
      setApproximate(false)
    })

    const timer = window.setTimeout(() => {
      const id = (requestIdRef.current += 1)

      void (async () => {
        try {
          const hit = await geocodeWithFallbacks(candidates)
          if (id !== requestIdRef.current) return

          if (!hit || Number.isNaN(hit.lat) || Number.isNaN(hit.lng)) {
            if (mapRef.current) {
              mapRef.current.remove()
              mapRef.current = null
            }
            markerRef.current = null
            secondaryMarkerRef.current = null
            routePolylineRef.current = null
            lastShopViewRef.current = null
            setStatus('zero-results')
            return
          }

          setResolvedLabel(hit.label)
          setApproximate(hit.candidateIndex >= 5)
          setStatus('ready')

          const el = containerRef.current
          if (!el || id !== requestIdRef.current) return

          const center = [hit.lat, hit.lng]
          const z = hit.zoom ?? 16

          if (!mapRef.current) {
            mapRef.current = L.map(el, {
              scrollWheelZoom: true,
              zoomControl: false,
              attributionControl: false,
            }).setView(center, z)
            L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '',
            }).addTo(mapRef.current)
            markerRef.current = L.marker(center)
              .addTo(mapRef.current)
              .bindPopup(`<strong>${escapeHtml(mapTitle)}</strong><br/>${escapeHtml(hit.label)}`)
          } else {
            mapRef.current.setView(center, z)
            if (markerRef.current) {
              markerRef.current.setLatLng(center)
              markerRef.current.setPopupContent(
                `<strong>${escapeHtml(mapTitle)}</strong><br/>${escapeHtml(hit.label)}`,
              )
            } else {
              markerRef.current = L.marker(center)
                .addTo(mapRef.current)
                .bindPopup(`<strong>${escapeHtml(mapTitle)}</strong><br/>${escapeHtml(hit.label)}`)
            }
          }

          lastShopViewRef.current = { lat: hit.lat, lng: hit.lng, zoom: z }

          requestAnimationFrame(() => {
            mapRef.current?.invalidateSize()
          })
        } catch {
          if (id !== requestIdRef.current) return
          if (mapRef.current) {
            mapRef.current.remove()
            mapRef.current = null
          }
          markerRef.current = null
          secondaryMarkerRef.current = null
          routePolylineRef.current = null
          lastShopViewRef.current = null
          setStatus('error')
        }
      })()
    }, GEOCODE_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [candidateKey, mapTitle])

  useEffect(() => {
    if (!mapRef.current) {
      setGoogleDirectionsUrl('')
      setRouteLoading(false)
      setRouteInfo(null)
      setRouteError('')
      return undefined
    }

    const map = mapRef.current

    const clearRouteLayer = () => {
      if (routePolylineRef.current) {
        try {
          map.removeLayer(routePolylineRef.current)
        } catch {
          /* layer may already be removed */
        }
        routePolylineRef.current = null
      }
    }

    const clearSecondaryLayer = () => {
      if (secondaryMarkerRef.current) {
        try {
          map.removeLayer(secondaryMarkerRef.current)
        } catch {
          /* layer may already be removed */
        }
        secondaryMarkerRef.current = null
      }
      clearRouteLayer()
    }

    if (status !== 'ready') {
      setGoogleDirectionsUrl('')
      setRouteLoading(false)
      setRouteInfo(null)
      setRouteError('')
      clearSecondaryLayer()
      return undefined
    }

    const pin = secondaryPin
    const hasPin =
      pin &&
      typeof pin.lat === 'number' &&
      Number.isFinite(pin.lat) &&
      typeof pin.lng === 'number' &&
      Number.isFinite(pin.lng)

    if (!hasPin) {
      routeRequestIdRef.current += 1
      clearSecondaryLayer()
      setGoogleDirectionsUrl('')
      setRouteLoading(false)
      setRouteInfo(null)
      setRouteError('')
      const lv = lastShopViewRef.current
      if (lv && markerRef.current) {
        map.setView([lv.lat, lv.lng], lv.zoom)
        requestAnimationFrame(() => map.invalidateSize())
      }
      return undefined
    }

    clearSecondaryLayer()

    const popupLabel = pin.label || 'Your location'
    const secMarker = L.circleMarker([pin.lat, pin.lng], {
      radius: 10,
      color: '#0369a1',
      weight: 2,
      fillColor: '#0ea5e9',
      fillOpacity: 0.88,
    }).addTo(map)
    secMarker.bindPopup(
      `<strong>${escapeHtml(popupLabel)}</strong><br/><span style="font-size:11px">Your current location</span>`,
    )
    secondaryMarkerRef.current = secMarker

    const shopLL = markerRef.current?.getLatLng?.()
    const userPoint = { lat: pin.lat, lng: pin.lng }

    if (shopLL) {
      setGoogleDirectionsUrl(
        `https://www.google.com/maps/dir/${pin.lat},${pin.lng}/${shopLL.lat},${shopLL.lng}`,
      )
    } else {
      setGoogleDirectionsUrl(`https://www.google.com/maps?q=${pin.lat},${pin.lng}`)
      map.setView([pin.lat, pin.lng], 15)
      requestAnimationFrame(() => map.invalidateSize())
      return undefined
    }

    const shopPoint = { lat: shopLL.lat, lng: shopLL.lng }

    if (!showRouteLine) {
      setRouteLoading(false)
      setRouteInfo(null)
      setRouteError('')
      const bounds = L.latLngBounds(shopLL, L.latLng(pin.lat, pin.lng))
      map.fitBounds(bounds.pad(0.14))
      requestAnimationFrame(() => map.invalidateSize())
      return undefined
    }

    const routeId = (routeRequestIdRef.current += 1)
    setRouteLoading(true)
    setRouteInfo(null)
    setRouteError('')

    void (async () => {
      let routeResult = null
      try {
        routeResult = await fetchOsrmRoute(userPoint, shopPoint)
      } catch {
        if (routeId !== routeRequestIdRef.current) return
        routeResult = buildStraightLineRoute(userPoint, shopPoint)
        setRouteError('Road route unavailable — showing straight-line distance.')
      }

      if (routeId !== routeRequestIdRef.current || !mapRef.current) return

      const activeMap = mapRef.current
      clearRouteLayer()

      const lineStyle = routeResult.approximate ? ROUTE_FALLBACK_LINE_STYLE : ROUTE_LINE_STYLE
      routePolylineRef.current = L.polyline(routeResult.latLngs, lineStyle).addTo(activeMap)

      const bounds = routePolylineRef.current.getBounds()
      activeMap.fitBounds(bounds.pad(0.12))

      setRouteInfo({
        distanceLabel: formatRouteDistance(routeResult.distanceM),
        durationLabel: routeResult.durationS != null ? formatRouteDuration(routeResult.durationS) : null,
        approximate: routeResult.approximate,
      })
      setRouteLoading(false)
      requestAnimationFrame(() => activeMap.invalidateSize())
    })()

    return () => {
      routeRequestIdRef.current += 1
    }
  }, [status, secondaryKey, candidateKey, showRouteLine])

  useEffect(() => {
    return () => {
      requestIdRef.current += 1
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      markerRef.current = null
      secondaryMarkerRef.current = null
      routePolylineRef.current = null
    }
  }, [])

  const showMapArea = candidates.length > 0

  const rootClass = flush
    ? 'flex h-full min-h-0 w-full flex-col'
    : showHeading
      ? 'space-y-3 rounded-lg border border-border/80 bg-muted/30 p-4'
      : 'w-full space-y-2'

  const mapFrameClass = flush
    ? 'relative min-h-[280px] w-full flex-1 basis-0 overflow-hidden [&_.leaflet-bottom.leaflet-right]:mb-2 [&_.leaflet-bottom.leaflet-right]:mr-2 [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:font-sans'
    : 'relative h-[min(420px,55vh)] min-h-[280px] w-full overflow-hidden rounded-md border border-border bg-muted [&_.leaflet-bottom.leaflet-right]:mb-2 [&_.leaflet-bottom.leaflet-right]:mr-2 [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:font-sans'

  return (
    <div className={rootClass}>
      {showHeading ? (
        <div className="flex items-start gap-2">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#081F5C]/10">
            <MapPinned className="h-4 w-4 text-[#081F5C]" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Shop location on the map</p>
            <p className="text-xs text-muted-foreground">
              OpenStreetMap with optional driving route (OSRM). Tap a marker for details.
            </p>
          </div>
        </div>
      ) : null}

      {!showMapArea ? (
        <p className="text-sm text-muted-foreground">
          {emptyAddressHint ??
            'Enter your shop address and detailed address for the map and pin to appear.'}
        </p>
      ) : null}

      {showMapArea ? (
        <div className={mapFrameClass} role="region" aria-label={mapTitle}>
          <div ref={containerRef} className="absolute inset-0 z-0" />
          {status === 'loading' || status === 'idle' ? (
            <div className="absolute inset-0 z-500 flex items-center justify-center bg-muted/95 text-sm text-muted-foreground">
              Looking up the location on the map (this may take a few seconds)…
            </div>
          ) : null}
          {status === 'error' ? (
            <div className="absolute inset-0 z-500 flex items-center justify-center bg-background/95 p-4 text-center text-sm text-destructive">
              Could not get the location right now. Try again later or check your internet connection.
            </div>
          ) : null}
          {status === 'zero-results' ? (
            <div className="absolute inset-0 z-500 flex flex-col items-center justify-center gap-2 bg-background/95 p-4 text-center text-sm text-muted-foreground">
              <p>
                No exact match in the map database for this combination. Try: (1) add a full street and barangay in the
                detailed address, (2) confirm the correct city/municipality and barangay in the selectors.
              </p>
              <p className="text-xs text-muted-foreground/90">
                The free map is sometimes less detailed than Google; results improve with a clear street or nearby place
                name.
              </p>
            </div>
          ) : null}
          {routeLoading ? (
            <div
              className="pointer-events-none absolute bottom-3 left-1/2 z-500 -translate-x-1/2 rounded-full border border-[#081F5C]/15 bg-white/95 px-3 py-1.5 text-[11px] font-medium text-[#081F5C] shadow-sm dark:border-white/10 dark:bg-[#020818]/95 dark:text-sky-200"
              role="status"
              aria-live="polite"
            >
              Calculating route…
            </div>
          ) : null}
        </div>
      ) : null}

      {flush && (routeInfo || googleDirectionsUrl || routeError) ? (
        <div className="pointer-events-auto shrink-0 space-y-1 border-t border-[#081F5C]/15 bg-white/92 px-3 py-2 text-center dark:border-white/10 dark:bg-[#020818]/92">
          {routeInfo ? (
            <p className="text-[11px] font-semibold text-[#081F5C] dark:text-sky-200">
              {routeInfo.distanceLabel}
              {routeInfo.durationLabel ? ` · ${routeInfo.durationLabel}` : ''}
              {routeInfo.approximate ? ' · straight line' : ' · driving route'}
              <span className="font-normal text-muted-foreground"> · OpenStreetMap</span>
            </p>
          ) : null}
          {routeError ? (
            <p className="text-[10px] text-amber-800 dark:text-amber-200/90">{routeError}</p>
          ) : null}
          {googleDirectionsUrl ? (
            <a
              href={googleDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-[#081F5C] underline-offset-2 hover:underline dark:text-sky-300"
            >
              Also open in Google Maps
            </a>
          ) : null}
        </div>
      ) : null}

      {showMapArea && status === 'ready' && resolvedLabel && !flush ? (
        <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Resolved on map: </span>
            {resolvedLabel}
          </p>
          {approximate ? (
            <p className="text-amber-800 dark:text-amber-200/90">
              Note: this is an approximate location (broader search). It is more accurate with a specific street and
              building in the detailed address.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
