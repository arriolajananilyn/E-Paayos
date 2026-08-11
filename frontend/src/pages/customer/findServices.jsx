import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import {
  Bike,
  Home,
  MapPin,
  Search,
  SlidersHorizontal,
  Smartphone,
  Star,
  Store,
  UserRound,
  WashingMachine,
  Wrench,
} from 'lucide-react'
import vehiclesTopBanner from '../../assets/vehicles.png'
import applianceTopBanner from '../../assets/applience.png'
import gadgetsTopBanner from '../../assets/gadgets.png'
import { formatMunicipalityBarangayLabel, formatReadableShopAddress } from '../../lib/psgcResolve'
import CustomerLayout, { readCustomerUserSession } from '../../layout/customerlayout.jsx'

export const CATEGORIES = ['Appliance', 'Gadget', 'Vehicle', 'Others']
export const SERVICE_TYPES = [
  { value: 'home', label: 'Home service' },
  { value: 'in-shop', label: 'In-shop' },
  { value: 'both', label: 'Both Home service and in-shop' },
]

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

function resolveCatalogShopPhotoUrl(raw) {
  if (!raw || typeof raw !== 'string') return ''
  const s = raw.trim()
  if (!s) return ''
  if (s.startsWith('data:') || s.startsWith('http://') || s.startsWith('https://')) return s
  if (s.startsWith('/uploads/')) return `${API_URL}${s}`
  return s
}

function catalogAuthHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const selectShell =
  'h-9 w-full appearance-none rounded-none border border-slate-200 bg-white px-3 py-2 pr-8 text-xs sm:text-sm shadow-[0_2px_5px_rgba(15,23,42,0.14)] outline-none focus-visible:ring-1 focus-visible:ring-[#081F5C] focus-visible:border-[#081F5C] transition-all hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)] hover:border-slate-300'

function serviceTypeBadge(type) {
  const label = SERVICE_TYPES.find((x) => x.value === type)?.label ?? 'N/A'
  return (
    <Badge variant="outline" className="rounded-none border border-slate-200 bg-slate-100/90 text-[10px] font-bold uppercase tracking-wider text-[#081F5C]">
      {label}
    </Badge>
  )
}

function initialsFromName(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return `${first}${second}`.toUpperCase()
}

function categoryIcon(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return Bike
  if (normalized === 'gadget') return Smartphone
  if (normalized === 'appliance') return WashingMachine
  return Wrench
}

function categoryBadgeClass(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return 'bg-linear-to-r from-sky-600 to-blue-700 text-white'
  if (normalized === 'gadget') return 'bg-linear-to-r from-violet-600 to-fuchsia-600 text-white'
  if (normalized === 'appliance') return 'bg-linear-to-r from-emerald-600 to-teal-600 text-white'
  if (normalized === 'others') return 'bg-linear-to-r from-amber-600 to-orange-600 text-white'
  return 'bg-linear-to-r from-slate-600 to-slate-800 text-white'
}

function categoryTopBannerImage(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return vehiclesTopBanner
  if (normalized === 'appliance') return applianceTopBanner
  if (normalized === 'gadget') return gadgetsTopBanner
  return ''
}

function ServiceOwnerThumb({ src, ownerName, IconComponent }) {
  const [imageFailed, setImageFailed] = useState(false)
  const canShowImage = Boolean(src) && !imageFailed
  return (
    <span className="inline-flex h-9 w-9 shrink-0 overflow-hidden rounded-none border border-white/40 bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-white shadow-2xs">
      {canShowImage ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[#081F5C]/55 text-xs font-bold text-white">
          {initialsFromName(ownerName) || <IconComponent className="h-5 w-5" />}
        </span>
      )}
    </span>
  )
}

function formatLaborPriceRange(min, max) {
  const minNum = Number(min)
  const maxNum = Number(max)
  if (!Number.isFinite(minNum) || !Number.isFinite(maxNum) || minNum < 0 || maxNum < 0) return '—'
  return `PHP ${minNum.toLocaleString()} - PHP ${maxNum.toLocaleString()}`
}

/** Single listing card — shared with View Shop page grid. */
export function CatalogServiceCard({ item, readableShopAddresses, shopAddressesResolving }) {
  const isOnCallProviderService = item.shopOwnerRole === 'oncall-mechanic-technician'
  const displayedStaff =
    isOnCallProviderService && String(item.shopOwner || '').trim()
      ? [String(item.shopOwner).trim()]
      : item.staff ?? []
  const shopThumb =
    resolveCatalogShopPhotoUrl(item.shopPlacePhoto) ||
    resolveCatalogShopPhotoUrl(item.shopOwnerProfileImage) ||
    resolveCatalogShopPhotoUrl(item.shopOwnerSelfieImage)
  const topBannerImage = categoryTopBannerImage(item.category)
  const ratingNum = Number(item.shopRating)
  const ratingLabel = Number.isFinite(ratingNum) ? ratingNum.toFixed(1) : '—'

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => {
        window.location.hash = `#/customer/shop/${encodeURIComponent(item.id)}`
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          window.location.hash = `#/customer/shop/${encodeURIComponent(item.id)}`
        }
      }}
      className="cursor-pointer gap-0 overflow-hidden rounded-none border border-slate-200 py-0 ring-0 bg-white shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-300 hover:border-[#081F5C] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#081F5C]"
    >
      <div
        className="relative h-24 w-full bg-[#04133d] bg-cover bg-center"
        style={
          topBannerImage
            ? {
                backgroundImage: `linear-gradient(to right, rgba(4,19,61,0.85), rgba(8,31,92,0.35)), url(${topBannerImage})`,
              }
            : undefined
        }
      >
        {(() => {
          const CategoryIcon = categoryIcon(item.category)
          return (
            <div className="absolute inset-0 flex flex-col p-2.5">
              <div className="relative flex min-w-0 flex-1 items-start gap-2 pr-20">
                <ServiceOwnerThumb
                  src={shopThumb}
                  ownerName={item.shopOwner ?? item.shopName ?? ''}
                  IconComponent={CategoryIcon}
                />
                <div className="min-w-0 flex-1">
                  <CardTitle className="truncate text-sm font-bold text-white drop-shadow-xs">{item.shopName}</CardTitle>
                  <div className="mt-0.5 flex min-w-0 items-center gap-1.5 overflow-hidden">
                    <CardDescription className="min-w-0 shrink truncate text-[11px] leading-tight text-white/90 font-medium">
                      Owner: {item.shopOwner ?? '—'}
                    </CardDescription>
                    <div
                      className="flex shrink-0 items-center gap-1 rounded-none border border-white/30 bg-black/40 px-2 py-0.5 backdrop-blur-sm"
                      aria-label={`Rating ${ratingLabel} out of 5`}
                    >
                      <Star className="h-3 w-3 shrink-0 fill-amber-300 text-amber-200" />
                      <span className="text-[11px] font-bold leading-none text-white tabular-nums">{ratingLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-auto flex shrink-0 flex-wrap items-center gap-2 pt-1">{serviceTypeBadge(item.type)}</div>
              <Badge className={`absolute right-2.5 top-2.5 shrink-0 rounded-none border-0 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${categoryBadgeClass(item.category)}`}>
                {item.category}
              </Badge>
            </div>
          )
        })()}
      </div>
      <CardHeader className="space-y-1.5 pb-2 pt-3">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-900 sm:text-sm truncate">{item.serviceName}</p>
          <p className="text-xs text-slate-500 sm:text-sm line-clamp-2 leading-snug font-medium">
            {item.subcategory?.trim() ? item.subcategory.trim() : '—'}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-4">
        <div className="space-y-1.5 text-xs sm:text-sm">
          <div className="flex items-center gap-1.5 text-slate-600">
            <MapPin className="h-4 w-4 shrink-0 text-[#081F5C]" />
            <span className="truncate">
              {item.shopOwnerId && Object.prototype.hasOwnProperty.call(readableShopAddresses, item.shopOwnerId)
                ? readableShopAddresses[item.shopOwnerId]
                : shopAddressesResolving
                  ? 'Loading address…'
                  : item.shopAddress}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <Wrench className="h-4 w-4 shrink-0 text-[#081F5C]" />
            <span>{item.completedJobs} completed jobs</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="inline-flex h-4 w-4 items-center justify-center text-[10px] font-bold text-[#081F5C]">
              PHP
            </span>
            <span className="font-semibold text-slate-800">Labor price: {formatLaborPriceRange(item.laborRatingMin, item.laborRatingMax)}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-900">{staffRoleHeading(item.category)}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5">
              {displayedStaff.slice(0, 4).map((name) => (
                <span
                  key={name}
                  title={name}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-none border border-white bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-[10px] font-bold text-white shadow-2xs ring-1 ring-black/5"
                >
                  {initialsFromName(name)}
                </span>
              ))}
            </div>
            <span className="text-xs font-medium text-slate-500">{staffAssignedLabel(item.category, displayedStaff.length)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/** Stable key for grouping/filtering listings by shop location (PSGC chain or fallback per owner). */
function itemLocationKey(item) {
  const parts = [item.shopRegion, item.shopProvince, item.shopCityMunicipality, item.shopBarangay]
    .map((x) => (x == null ? '' : String(x).trim()))
    .filter(Boolean)
  if (parts.length) return `psgc:${parts.join('\x1f')}`
  const owner = item.shopOwnerId != null && item.shopOwnerId !== '' ? String(item.shopOwnerId) : String(item.id ?? '')
  return `addr:${owner}`
}

/** Placeholder before async "Municipality, Barangay" labels resolve (plain-text fields only). */
function locationFilterLabelPlaceholder(item) {
  const m = String(item.shopCityMunicipality ?? '').trim()
  const b = String(item.shopBarangay ?? '').trim()
  const mOk = m && !/^\d+$/.test(m)
  const bOk = b && !/^\d+$/.test(b)
  if (mOk && bOk) return `${m}, ${b}`
  if (mOk) return m
  if (bOk) return b
  return 'Unknown location'
}

/** Vehicle category: mechanics. Gadget, appliance, and others: technicians. */
export function staffRoleHeading(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return 'Mechanics'
  return 'Technicians'
}

export function staffAssignedLabel(category, count) {
  const n = Math.max(0, Number(count) || 0)
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') {
    return `${n} ${n === 1 ? 'mechanic' : 'mechanics'} assigned`
  }
  return `${n} ${n === 1 ? 'technician' : 'technicians'} assigned`
}

/** gap-4 between duplicate segments (must match stride math in marquee). */
const TOP_MARQUEE_SEGMENT_GAP_PX = 16
const TOP_MARQUEE_MIN_CARDS = 8
const TOP_MARQUEE_SPEED_PX_PER_SEC = 20
const TOP_MARQUEE_RESUME_MS = 2800
/** Clamp frame delta so long frames do not visibly “jump”; keeps motion perceptually even. */
const TOP_MARQUEE_DT_MIN_MS = 8
const TOP_MARQUEE_DT_MAX_MS = 32
/** Low‑pass smoothing on per‑frame travel (tau ms); softens jitter from irregular rAF timings. */
const TOP_MARQUEE_DELTA_SMOOTH_TAU_MS = 105

function buildTopMarqueeSegment(entries, minCards) {
  if (!entries.length) return []
  const target = Math.max(minCards, entries.length)
  const out = []
  for (let i = 0; i < target; i++) {
    out.push(entries[i % entries.length])
  }
  return out
}

function heroImageForCatalogRow(row) {
  const thumb =
    resolveCatalogShopPhotoUrl(row.shopPlacePhoto) ||
    resolveCatalogShopPhotoUrl(row.shopOwnerProfileImage) ||
    resolveCatalogShopPhotoUrl(row.shopOwnerSelfieImage)
  if (thumb) return thumb
  const banner = categoryTopBannerImage(row.category)
  return typeof banner === 'string' && banner ? banner : ''
}

function TopPreviewServiceCard({ catalogRow, kind, locationLine }) {
  const isIndependent = kind === 'independent'
  const ownerLabel = isIndependent ? 'Business owner' : 'Shop owner'
  const imageSrc = heroImageForCatalogRow(catalogRow)
  const rating = Number(catalogRow.shopRating) || 0
  const jobs = Math.max(0, Number(catalogRow.completedJobs) || 0)

  const go = () => {
    window.location.hash = `#/customer/shop/${encodeURIComponent(catalogRow.id)}`
  }

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          go()
        }
      }}
      className="w-[min(100%,280px)] shrink-0 cursor-pointer gap-2 overflow-hidden rounded-none border border-slate-200 bg-white p-0 shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-300 hover:border-[#081F5C] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#081F5C]"
    >
      <div className="relative aspect-5/2 w-full overflow-hidden bg-slate-100">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full min-h-16 w-full items-center justify-center bg-linear-to-br from-slate-100 to-slate-200">
            <Store className="h-9 w-9 text-slate-400" aria-hidden />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/60 to-transparent" aria-hidden />
        <Badge
          className={
            isIndependent
              ? 'absolute left-2.5 top-2.5 rounded-none border border-violet-400/40 bg-violet-600/95 text-[9px] font-bold uppercase tracking-wider text-white shadow-2xs backdrop-blur-sm'
              : 'absolute left-2.5 top-2.5 rounded-none border border-sky-400/40 bg-[#081F5C]/95 text-[9px] font-bold uppercase tracking-wider text-white shadow-2xs backdrop-blur-sm'
          }
        >
          {isIndependent ? 'On-call' : 'Shop'}
        </Badge>
        <div
          className="absolute right-2.5 top-2.5 flex items-center gap-0.5 rounded-none border border-white/30 bg-black/40 px-2 py-0.5 backdrop-blur-sm"
          aria-label={`Rating ${rating}`}
        >
          <Star className="h-3 w-3 shrink-0 fill-amber-300 text-amber-200" />
          <span className="text-[11px] font-bold tabular-nums text-white">{rating.toFixed(2)}</span>
        </div>
      </div>
      <CardContent className="space-y-1.5 px-3 pb-3 pt-1">
        <div className="min-w-0 space-y-1">
          <CardTitle title={catalogRow.shopName} className="mt-0 truncate text-[14px] font-bold leading-tight tracking-wide text-slate-900 uppercase">
            {catalogRow.shopName}
          </CardTitle>
          <p className="flex min-w-0 items-center gap-1.5 text-xs leading-snug text-slate-600">
            <UserRound className="h-3.5 w-3.5 shrink-0 text-[#081F5C]/70" aria-hidden />
            <span className="min-w-0 truncate" title={`${ownerLabel}: ${catalogRow.shopOwner || '—'}`}>
              <span className="font-semibold text-slate-700">{ownerLabel}: </span>
              <span className="text-slate-800">{catalogRow.shopOwner || '—'}</span>
            </span>
          </p>
          <p className="flex min-w-0 items-center gap-1.5 text-xs leading-snug text-slate-600">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#081F5C]/70" aria-hidden />
            <span className="min-w-0 truncate text-slate-700" title={locationLine || '—'}>
              {locationLine || '—'}
            </span>
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
          <Badge className={`${categoryBadgeClass(catalogRow.category)} shrink-0 rounded-none border-0 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider`}>
            {catalogRow.category}
          </Badge>
          <span className="text-[11px] font-medium tabular-nums text-slate-600 truncate">
            <span className="font-bold text-slate-900">{jobs}</span> completed jobs
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function TopServicesMarqueeRow({ marqueeEntries, catalogLoading, reducedMotion }) {
  const scrollRef = useRef(null)
  const segmentRef = useRef(null)
  const resumeTimerRef = useRef(null)
  const lastFrameRef = useRef(0)
  /** Matches scrollLeft visually; fractional value reduces integer stepping when the browser supports it. */
  const scrollVirtualRef = useRef(0)
  /** Smoothed displacement per frame toward targetDelta (EWMA pole ~ TOP_MARQUEE_DELTA_SMOOTH_TAU_MS). */
  const scrollDeltaLpRef = useRef(0)
  const [segmentStride, setSegmentStride] = useState(0)
  const [userInteracting, setUserInteracting] = useState(false)

  const segment = useMemo(
    () => buildTopMarqueeSegment(marqueeEntries, TOP_MARQUEE_MIN_CARDS),
    [marqueeEntries],
  )

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
      resumeTimerRef.current = null
    }
  }, [])

  const scheduleResumeInteraction = useCallback(() => {
    clearResumeTimer()
    resumeTimerRef.current = setTimeout(() => {
      setUserInteracting(false)
      resumeTimerRef.current = null
    }, TOP_MARQUEE_RESUME_MS)
  }, [clearResumeTimer])

  useEffect(() => () => clearResumeTimer(), [clearResumeTimer])

  useLayoutEffect(() => {
    const seg = segmentRef.current
    if (!seg) return
    const measure = () => {
      const w = seg.offsetWidth
      setSegmentStride(w > 0 ? w + TOP_MARQUEE_SEGMENT_GAP_PX : 0)
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(seg)
    return () => ro?.disconnect()
  }, [segment])

  /** After manual swipe / pause, DOM scroll wins so auto-scroll doesn’t snap. Stride tweaks are folded in tick. */
  useEffect(() => {
    const el = scrollRef.current
    if (userInteracting || !el) return
    scrollVirtualRef.current = el.scrollLeft
    scrollDeltaLpRef.current = 0
  }, [userInteracting])

  useEffect(() => {
    if (reducedMotion || !segment.length || segmentStride <= 0) return
    const el = scrollRef.current
    if (!el) return
    lastFrameRef.current = performance.now()
    let rafId = 0

    const tick = (now) => {
      let dtMs = now - lastFrameRef.current
      lastFrameRef.current = now
      if (!Number.isFinite(dtMs)) dtMs = TOP_MARQUEE_DT_MIN_MS
      dtMs = Math.min(TOP_MARQUEE_DT_MAX_MS, Math.max(TOP_MARQUEE_DT_MIN_MS, dtMs))

      if (!userInteracting && document.visibilityState === 'visible') {
        const targetDelta = (TOP_MARQUEE_SPEED_PX_PER_SEC * dtMs) / 1000
        const beta = Math.exp(-dtMs / TOP_MARQUEE_DELTA_SMOOTH_TAU_MS)
        scrollDeltaLpRef.current =
          scrollDeltaLpRef.current * beta + targetDelta * (1 - beta)

        let next = scrollVirtualRef.current + scrollDeltaLpRef.current
        const stride = segmentStride
        if (stride > 0 && next >= stride) {
          next -= stride * Math.floor(next / stride)
        }
        scrollVirtualRef.current = next
        el.scrollLeft = next
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [reducedMotion, segment.length, segmentStride, userInteracting])

  if (catalogLoading && !marqueeEntries.length) {
    return (
      <div className="relative overflow-hidden w-full py-1">
        <div className="flex gap-4 overflow-x-auto px-1 py-1.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-46 w-[min(100%,280px)] shrink-0 animate-pulse rounded-none bg-slate-200"
              aria-hidden
            />
          ))}
        </div>
      </div>
    )
  }

  if (!marqueeEntries.length) {
    return (
      <div className="rounded-none border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-xs font-medium text-slate-500 shadow-2xs">
        No listings here yet. When shops and on-call mechanics publish services, they will scroll in this strip.
      </div>
    )
  }

  return (
    <div className="relative w-full py-1">
      <div
        ref={scrollRef}
        role="region"
        aria-label="Top services, auto-scrolling. Scroll horizontally to browse manually."
        tabIndex={0}
        className="touch-pan-x overflow-x-auto overflow-y-hidden px-1 py-1.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden contain-[layout_style]"
        onPointerDown={() => {
          clearResumeTimer()
          const el = scrollRef.current
          if (el) scrollVirtualRef.current = el.scrollLeft
          scrollDeltaLpRef.current = 0
          setUserInteracting(true)
        }}
        onPointerUp={scheduleResumeInteraction}
        onPointerCancel={scheduleResumeInteraction}
        onPointerLeave={(e) => {
          if (e.buttons === 0) scheduleResumeInteraction()
        }}
        onWheel={() => {
          const el = scrollRef.current
          if (el) scrollVirtualRef.current = el.scrollLeft
          scrollDeltaLpRef.current = 0
          setUserInteracting(true)
          scheduleResumeInteraction()
        }}
      >
        <div className="inline-flex w-max gap-4 [transform:translateZ(0)]">
          <div ref={segmentRef} className="flex shrink-0 gap-4">
            {segment.map((entry, i) => (
              <TopPreviewServiceCard
                key={`a-${entry.row.id}-${i}`}
                catalogRow={entry.row}
                kind={entry.kind}
                locationLine={entry.locationLine}
              />
            ))}
          </div>
          <div className="flex shrink-0 gap-4" aria-hidden>
            {segment.map((entry, i) => (
              <TopPreviewServiceCard
                key={`b-${entry.row.id}-${i}`}
                catalogRow={entry.row}
                kind={entry.kind}
                locationLine={entry.locationLine}
              />
            ))}
          </div>
        </div>
      </div>
      {reducedMotion ? (
        <p className="mt-2 px-2 text-center text-[11px] font-medium text-slate-500">
          Auto-scroll is off for reduced motion. Swipe or drag the row to browse.
        </p>
      ) : null}
    </div>
  )
}

function CustomerFindServices() {
  const [user, setUser] = useState(readCustomerUserSession)
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('__')
  const [serviceTypeFilter, setServiceTypeFilter] = useState('__')
  const [locationFilter, setLocationFilter] = useState('__')
  const [sortBy, setSortBy] = useState('rating')
  const [catalogServices, setCatalogServices] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  /** Resolved PSGC → readable address per shop owner (customer cards). */
  const [readableShopAddresses, setReadableShopAddresses] = useState({})
  const [shopAddressesResolving, setShopAddressesResolving] = useState(false)
  /** Location filter: "Municipality, Barangay" per itemLocationKey. */
  const [locationFilterLabels, setLocationFilterLabels] = useState({})
  const [marqueeReducedMotion, setMarqueeReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return false
  })

  const loadCatalog = useCallback(async () => {
    setCatalogError('')
    const token = localStorage.getItem('token')
    if (!token) {
      setCatalogServices([])
      setCatalogLoading(false)
      return
    }
    setCatalogLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/catalog/shop-services`, {
        headers: catalogAuthHeaders(),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.message || 'Could not load services.')
      }
      const data = await res.json()
      setCatalogServices(Array.isArray(data) ? data : [])
    } catch (e) {
      setCatalogError(e?.message || 'Could not load services.')
      setCatalogServices([])
    } finally {
      setCatalogLoading(false)
    }
  }, [])


  useEffect(() => {
    if (!user) return
    loadCatalog()
  }, [user, loadCatalog])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setMarqueeReducedMotion(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const addressResolveGen = useRef(0)
  useEffect(() => {
    const gen = ++addressResolveGen.current
    if (!catalogServices.length) {
      setReadableShopAddresses({})
      setShopAddressesResolving(false)
      return
    }

    const geoByOwner = new Map()
    for (const row of catalogServices) {
      const oid = row.shopOwnerId
      if (!oid || geoByOwner.has(oid)) continue
      geoByOwner.set(oid, {
        geo: {
          shopRegion: row.shopRegion,
          shopProvince: row.shopProvince,
          shopCityMunicipality: row.shopCityMunicipality,
          shopBarangay: row.shopBarangay,
          shopDetailedAddress: row.shopDetailedAddress,
        },
        fallbackAddress: row.shopAddress || '—',
      })
    }

    setShopAddressesResolving(true)
    ;(async () => {
      const entries = await Promise.all(
        [...geoByOwner.entries()].map(async ([id, { geo, fallbackAddress }]) => {
          try {
            const line = await formatReadableShopAddress(geo)
            const ok = line && line !== '—'
            return [id, ok ? line : fallbackAddress]
          } catch {
            return [id, fallbackAddress]
          }
        }),
      )
      if (gen !== addressResolveGen.current) return
      setReadableShopAddresses(Object.fromEntries(entries))
      setShopAddressesResolving(false)
    })()
  }, [catalogServices])

  const filterLocationLabelGen = useRef(0)
  useEffect(() => {
    const gen = ++filterLocationLabelGen.current
    if (!catalogServices.length) {
      setLocationFilterLabels({})
      return
    }
    const firstByKey = new Map()
    for (const item of catalogServices) {
      const key = itemLocationKey(item)
      if (!firstByKey.has(key)) firstByKey.set(key, item)
    }
    ;(async () => {
      const entries = await Promise.all(
        [...firstByKey.entries()].map(async ([key, item]) => {
          let label = await formatMunicipalityBarangayLabel(item)
          if (!label || label === '—') label = locationFilterLabelPlaceholder(item)
          return [key, label]
        }),
      )
      if (gen !== filterLocationLabelGen.current) return
      setLocationFilterLabels(Object.fromEntries(entries))
    })()
  }, [catalogServices])

  const locationOptions = useMemo(() => {
    const byKey = new Map()
    for (const item of catalogServices) {
      const key = itemLocationKey(item)
      if (byKey.has(key)) continue
      const label = locationFilterLabels[key] ?? locationFilterLabelPlaceholder(item)
      byKey.set(key, label)
    }
    return [...byKey.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
  }, [catalogServices, locationFilterLabels])

  useEffect(() => {
    if (locationFilter === '__' || locationFilter === '') return
    const valid = new Set(locationOptions.map((o) => o.value))
    if (!valid.has(locationFilter)) setLocationFilter('__')
  }, [locationOptions, locationFilter])


  const filteredShops = useMemo(() => {
    const category = categoryFilter === '__' ? '' : categoryFilter
    const serviceType = serviceTypeFilter === '__' ? '' : serviceTypeFilter
    const location = locationFilter === '__' ? '' : locationFilter
    const normalizedQuery = query.trim().toLowerCase()

    const base = catalogServices.filter((item) => {
      if (category && item.category !== category) return false
      if (serviceType && item.type !== serviceType) return false
      if (location && itemLocationKey(item) !== location) return false
      if (!normalizedQuery) return true

      const sub = String(item.subcategory ?? '')
        .toLowerCase()
        .trim()
      const addrLine =
        (item.shopOwnerId && readableShopAddresses[item.shopOwnerId]) || item.shopAddress || ''
      return (
        item.serviceName.toLowerCase().includes(normalizedQuery) ||
        item.shopName.toLowerCase().includes(normalizedQuery) ||
        String(item.shopOwner ?? '')
          .toLowerCase()
          .includes(normalizedQuery) ||
        addrLine.toLowerCase().includes(normalizedQuery) ||
        item.category.toLowerCase().includes(normalizedQuery) ||
        (sub && sub.includes(normalizedQuery))
      )
    })

    const sorted = [...base]
    switch (sortBy) {
      case 'jobs':
        sorted.sort((a, b) => b.completedJobs - a.completedJobs)
        break
      case 'price-low':
        sorted.sort((a, b) => a.priceFrom - b.priceFrom)
        break
      case 'rating':
      default:
        sorted.sort((a, b) => b.shopRating - a.shopRating)
        break
    }
    return sorted
  }, [catalogServices, categoryFilter, locationFilter, query, serviceTypeFilter, sortBy, readableShopAddresses])

  const topMarqueeEntries = useMemo(() => {
    const byOwner = new Map()
    for (const row of catalogServices) {
      const oid = row.shopOwnerId
      if (!oid) continue
      const prev = byOwner.get(oid)
      const r = Number(row.shopRating) || 0
      const pr = prev ? Number(prev.shopRating) || 0 : -1
      const j = Number(row.completedJobs) || 0
      const pj = prev ? Number(prev.completedJobs) || 0 : -1
      if (!prev || r > pr || (r === pr && j > pj)) {
        byOwner.set(oid, row)
      }
    }

    const rows = [...byOwner.values()].sort((a, b) => {
      const rd = Number(b.shopRating) - Number(a.shopRating)
      if (rd !== 0) return rd
      return Number(b.completedJobs) - Number(a.completedJobs)
    })

    return rows.map((row) => {
      const oid = row.shopOwnerId
      const locationLine =
        (oid && readableShopAddresses[oid]) || row.shopAddress || locationFilterLabelPlaceholder(row)
      const onCallLike =
        row.shopOwnerRole === 'oncall-mechanic-technician' ||
        row.shopOwnerRole === 'independent-mechanic-technician'
      return {
        row,
        kind: onCallLike ? 'independent' : 'shop',
        locationLine,
      }
    })
  }, [catalogServices, readableShopAddresses])


  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600 text-sm font-medium">Loading…</p>
      </div>
    )
  }

  const showCatalogSkeleton = catalogLoading && catalogServices.length === 0

  return (
    <CustomerLayout activePage="find-services">

      <main className="w-full px-6 sm:px-10 md:px-16 pt-6 pb-8 space-y-6 max-w-[1440px] mx-auto">
        <section className="space-y-2.5" aria-label="Top on-call mechanics, technicians, and shop owners by rating">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 md:text-base">
              Top Services — On-Call Mechanic/Technician &amp; Shop Owners
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 font-medium">
              From live listings — scroll sideways or drag; the strip keeps looping.
            </p>
          </div>
          <TopServicesMarqueeRow
            marqueeEntries={topMarqueeEntries}
            catalogLoading={showCatalogSkeleton}
            reducedMotion={marqueeReducedMotion}
          />
        </section>

        <section className="space-y-3">
          <div className="flex min-w-0 w-full max-w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 w-full max-w-full flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-nowrap">
              <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[200px]">
              <select
                className={`${selectShell} ${categoryFilter === '__' ? 'text-slate-400 font-medium' : 'text-slate-900 font-semibold'}`}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="__" disabled hidden>
                  Category
                </option>
                <option value="">All Categories</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[200px]">
              <select
                className={`${selectShell} ${serviceTypeFilter === '__' ? 'text-slate-400 font-medium' : 'text-slate-900 font-semibold'}`}
                value={serviceTypeFilter}
                onChange={(e) => setServiceTypeFilter(e.target.value)}
              >
                <option value="__" disabled hidden>
                  Service Type
                </option>
                <option value="">All Service Types</option>
                {SERVICE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <Home className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[200px]">
              <select
                className={`${selectShell} ${locationFilter === '__' ? 'text-slate-400 font-medium' : 'text-slate-900 font-semibold'}`}
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              >
                <option value="__" disabled hidden>
                  Location
                </option>
                <option value="">All Locations</option>
                {locationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <MapPin className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[200px]">
              <select className={`${selectShell} font-semibold text-slate-900`} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="rating">Sort: Top Rated</option>
                <option value="jobs">Sort: Most Completed Jobs</option>
                <option value="price-low">Sort: Lowest Starting Price</option>
              </select>
              <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="relative min-w-0 w-full max-w-full lg:max-w-md lg:flex-1">
              <div className="relative w-full min-w-0 max-w-full">
                <Input
                  className="h-9 w-full min-w-0 rounded-none border border-slate-200 bg-white pr-12 pl-4 text-xs sm:text-sm shadow-[0_2px_5px_rgba(15,23,42,0.14)] focus-visible:ring-1 focus-visible:ring-[#081F5C] focus-visible:border-[#081F5C] transition-all hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)] hover:border-slate-300"
                  placeholder="Search services or shops..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search services"
                />
                <Button
                  type="button"
                  size="icon-sm"
                  className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-none bg-linear-to-r from-[#04133d] to-[#081F5C] p-0 shadow-[0_2px_6px_rgba(8,31,92,0.4)] hover:shadow-[0_4px_10px_rgba(8,31,92,0.55)] hover:opacity-95 transition-all"
                  aria-label="Search"
                >
                  <Search className="h-4 w-4 text-white" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 md:text-base">Available Shop Services</h2>
              <p className="text-xs text-slate-500 font-medium">
                {showCatalogSkeleton
                  ? 'Loading…'
                  : `Result: ${filteredShops.length} service${filteredShops.length === 1 ? '' : 's'} found`}
              </p>
            </div>
            {catalogError ? (
              <Button type="button" variant="outline" size="sm" className="rounded-none border-rose-300 text-xs font-bold uppercase tracking-wider" onClick={() => loadCatalog()}>
                Retry load
              </Button>
            ) : null}
          </div>

          {catalogError ? (
            <div className="rounded-none border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
              {catalogError}
            </div>
          ) : null}

          {showCatalogSkeleton ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-none border border-dashed border-slate-300 bg-white px-6 text-center shadow-2xs">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900">Loading services…</p>
              <p className="mt-1 max-w-md text-xs text-slate-500">Fetching active listings from shops.</p>
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="flex min-h-[150px] flex-col items-center justify-center rounded-none border border-dashed border-slate-300 bg-white px-6 text-center shadow-2xs">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900">
                {catalogServices.length === 0 ? 'No active services yet' : 'No matching shops or services'}
              </p>
              <p className="mt-1 max-w-md text-xs text-slate-500">
                {catalogServices.length === 0
                  ? 'Once shop owners publish active services, they will appear here.'
                  : 'Try adjusting your search, location, or other filters to find available shops.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredShops.map((item) => (
                <CatalogServiceCard
                  key={item.id}
                  item={item}
                  readableShopAddresses={readableShopAddresses}
                  shopAddressesResolving={shopAddressesResolving}
                />
              ))}
            </div>
          )}
        </section>

      </main>
    </CustomerLayout>
  )
}

export default CustomerFindServices
