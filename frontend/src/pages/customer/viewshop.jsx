import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Clock,
  Home,
  Landmark,
  Layers,
  MapPin,
  MessageCircle,
  Search,
  SlidersHorizontal,
  Star,
  Store,
  Tag,
  ThumbsUp,
  User,
  Users,
} from 'lucide-react'
import ShopAddressGoogleMap from '../../components/ShopAddressGoogleMap.jsx'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { CardContent } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import CustomerLayout, { readCustomerUserSession } from '../../layout/customerlayout.jsx'
import { resolveProfilePsgcLabels, formatReadableShopAddress } from '../../lib/psgcResolve'
import { SERVICE_TYPES, CatalogServiceCard, CATEGORIES } from './findServices.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

function goBackOrCustomerFallback() {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    window.history.back()
  } else {
    window.location.hash = '#/customer/find-services'
  }
}

const selectShell =
  'h-9 w-full appearance-none rounded-lg border-none ring-0 bg-white/95 px-3 py-2 pr-8 text-xs sm:text-sm shadow-[0_3px_10px_rgba(15,23,42,0.12)] outline-none focus-visible:ring-2 focus-visible:ring-[#081F5C]/20'

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function isLikelyMongoId(id) {
  return typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id)
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

function resolveOwnerThumbSrc(detail) {
  if (!detail || typeof detail !== 'object') return ''
  const candidates = [detail.shopPlacePhoto, detail.shopOwnerProfileImage, detail.shopOwnerSelfieImage]
  for (const raw of candidates) {
    const value = String(raw ?? '').trim()
    if (!value) continue
    if (/^(https?:\/\/|data:|blob:)/i.test(value)) return value
    if (value.startsWith('/uploads/')) return `${API_URL}${value}`
    return value
  }
  return ''
}

function OwnerThumb({ src, ownerName }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(src) && !imageFailed
  return (
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/70 text-slate-700 ring-1 ring-[#081F5C]/18 sm:h-9 sm:w-9 sm:rounded-xl dark:bg-white/45 dark:text-white dark:ring-[#1447a6]/35">
      {showImage ? (
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
      ) : (
        <span className="text-xs font-semibold">{initialsFromName(ownerName) || '?'}</span>
      )}
    </span>
  )
}

function serviceTypeBadge(type) {
  const label = SERVICE_TYPES.find((x) => x.value === type)?.label ?? '—'
  return (
    <Badge variant="outline" className="border-[#081F5C]/15 bg-white/90 text-[11px] font-medium text-[#081F5C] dark:border-white/10 dark:bg-white/5 dark:text-blue-100">
      {label}
    </Badge>
  )
}

function formatShopOwnerJoinedAt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Table row label: mechanics for vehicle, technicians otherwise */
function noOfTechnicianMechanicLabel(category) {
  return String(category || '').toLowerCase() === 'vehicle' ? 'No. of mechanics:' : 'No. of technicians:'
}

const SHOP_TABLE_ICON = 'h-3.5 w-3.5 shrink-0 text-[#081F5C]/75 dark:text-sky-300/85'
const SHOP_TABLE_ICON_ON_STRIP = 'h-3.5 w-3.5 shrink-0 text-zinc-600 dark:text-zinc-400'

function ShopTableLabel({ icon, children, variant = 'default' }) {
  const onStrip = variant === 'dark'
  const IconComponent = icon
  return (
    <span className="inline-flex items-center gap-1.5">
      <IconComponent className={onStrip ? SHOP_TABLE_ICON_ON_STRIP : SHOP_TABLE_ICON} aria-hidden />
      <span className={onStrip ? 'text-zinc-800 dark:text-zinc-200' : undefined}>{children}</span>
    </span>
  )
}

/** Sample completed jobs — replace when booking history is exposed per shop (same as service details). */
const MOCK_COMPLETED_WORKS = [
  {
    id: 'cw-1',
    customerName: 'Maria S. Reyes',
    whatWasFixed: 'Two-door refrigerator — compressor replacement and refrigerant recharge; leak tested OK.',
    completedAt: '2025-03-12T09:15:00',
  },
  {
    id: 'cw-2',
    customerName: 'John Paul L. Cruz',
    whatWasFixed: 'iPhone 12 — OLED + battery swap, calibration and water gasket check before handoff.',
    completedAt: '2025-03-18T14:45:00',
  },
  {
    id: 'cw-3',
    customerName: 'Angelo T. Mendoza',
    whatWasFixed: '125cc motorcycle — full tune-up, brake fluid flush, chain clean & tension.',
    completedAt: '2025-04-02T16:00:00',
  },
  {
    id: 'cw-4',
    customerName: 'Liezel Ann K. Bautista',
    whatWasFixed: 'Top-load washer — noisy spin traced to worn bearings; bearing kit installed.',
    completedAt: '2025-04-05T11:30:00',
  },
  {
    id: 'cw-5',
    customerName: 'Rico M. Villanueva',
    whatWasFixed: 'Window-type AC — deep clean, capacitor check, and pressure test.',
    completedAt: '2025-04-08T08:00:00',
  },
  {
    id: 'cw-6',
    customerName: 'Denise P. Ocampo',
    whatWasFixed: 'Laptop — SSD upgrade + OS reinstall, data migrated to new drive.',
    completedAt: '2025-04-10T13:20:00',
  },
]

function formatCompletedWorkDateTime(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return { time: '—', date: '—' }
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  const date = `${mm}/${dd}/${yyyy}`
  let h24 = d.getHours()
  const mins = String(d.getMinutes()).padStart(2, '0')
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  let h12 = h24 % 12
  if (h12 === 0) h12 = 12
  const time = `${h12}:${mins} ${ampm}`
  return { time, date }
}

function reviewRatingValue(review) {
  const n = Number(review?.overallRating ?? review?.rating ?? 0)
  return Number.isFinite(n) ? n : 0
}

function resolveReviewMediaSrc(src) {
  const value = String(src ?? '').trim()
  if (!value) return ''
  if (/^(https?:\/\/|data:|blob:)/i.test(value)) return value
  if (value.startsWith('/uploads/')) return `${API_URL}${value}`
  return value
}

export default function CustomerViewShop({ anchorServiceId }) {
  const [user, setUser] = useState(readCustomerUserSession)

  const [detail, setDetail] = useState(null)
  const [shopServices, setShopServices] = useState([])
  const [shopContext, setShopContext] = useState(null)
  const [detailLoading, setDetailLoading] = useState(true)
  const [detailError, setDetailError] = useState('')

  const [mapAddressParts, setMapAddressParts] = useState(null)
  const [mapPartsResolving, setMapPartsResolving] = useState(false)

  const [readableShopAddresses, setReadableShopAddresses] = useState({})
  const [shopAddressesResolving, setShopAddressesResolving] = useState(false)

  const [listQuery, setListQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('__')
  const [serviceTypeFilter, setServiceTypeFilter] = useState('__')
  const [sortBy, setSortBy] = useState('rating')

  const [serviceReviews, setServiceReviews] = useState([])
  const [serviceReviewFilter, setServiceReviewFilter] = useState('all')


  useEffect(() => {
    if (!user) return
    if (!anchorServiceId || !isLikelyMongoId(anchorServiceId)) {
      setDetail(null)
      setShopServices([])
      setShopContext(null)
      setDetailError('Invalid or missing shop link.')
      setDetailLoading(false)
      return
    }

    let cancelled = false
    setDetailLoading(true)
    setDetailError('')
    setDetail(null)
    setShopServices([])
    setShopContext(null)

    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/catalog/shop-services/context/${encodeURIComponent(anchorServiceId)}`, {
          headers: authHeaders(),
        })
        const errBody = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(errBody?.message || 'Could not load shop.')
        }
        const data = errBody
        const list = Array.isArray(data?.services) ? data.services : []
        const focusId = data?.focusServiceId ? String(data.focusServiceId) : anchorServiceId
        const focus =
          list.find((s) => s && String(s.id) === focusId) ||
          list.find((s) => s && String(s.id) === String(anchorServiceId))
        if (!focus) {
          throw new Error('Service not found or no longer available.')
        }
        const rated = list.filter((s) => Number(s?.shopRating) > 0)
        const shopAverageRating =
          rated.length > 0
            ? Math.round((rated.reduce((a, s) => a + Number(s.shopRating), 0) / rated.length) * 10) / 10
            : 0
        const derived = {
          activeServiceCount: list.length,
          totalCompletedBookings: list.reduce((a, s) => a + Math.max(0, Number(s?.completedJobs) || 0), 0),
          shopAverageRating,
        }
        const merged =
          data?.shopContext && typeof data.shopContext === 'object' ? { ...derived, ...data.shopContext } : derived
        if (!cancelled) {
          setDetail(focus)
          setShopServices(list)
          setShopContext(merged)
        }
      } catch (e) {
        if (!cancelled) {
          setDetailError(e?.message || 'Could not load shop.')
          setShopContext(null)
        }
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, anchorServiceId])

  useEffect(() => {
    if (!detail) {
      setMapAddressParts(null)
      setMapPartsResolving(false)
      return
    }
    let cancelled = false
    setMapPartsResolving(true)
    ;(async () => {
      try {
        const labels = await resolveProfilePsgcLabels({
          shopRegion: detail.shopRegion,
          shopProvince: detail.shopProvince,
          shopCityMunicipality: detail.shopCityMunicipality,
          shopBarangay: detail.shopBarangay,
        })
        if (cancelled) return
        setMapAddressParts({
          detailedAddress: detail.shopDetailedAddress?.trim() || '',
          barangay: labels.shopBarangay || '',
          cityMunicipality: labels.shopCityMunicipality || '',
          province: labels.shopProvince || '',
          region: labels.shopRegion || '',
          landmark: detail.shopLandmark?.trim() || '',
        })
      } catch {
        if (cancelled) return
        setMapAddressParts({
          detailedAddress: detail.shopDetailedAddress?.trim() || '',
          barangay: String(detail.shopBarangay || '').trim(),
          cityMunicipality: String(detail.shopCityMunicipality || '').trim(),
          province: String(detail.shopProvince || '').trim(),
          region: String(detail.shopRegion || '').trim(),
          landmark: detail.shopLandmark?.trim() || '',
        })
      } finally {
        if (!cancelled) setMapPartsResolving(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [detail])

  const addressResolveGen = useRef(0)
  useEffect(() => {
    const gen = ++addressResolveGen.current
    if (!shopServices.length) {
      setReadableShopAddresses({})
      setShopAddressesResolving(false)
      return
    }

    const first = shopServices[0]
    const oid = first?.shopOwnerId
    if (!oid) {
      setReadableShopAddresses({})
      setShopAddressesResolving(false)
      return
    }

    const geo = {
      shopRegion: first.shopRegion,
      shopProvince: first.shopProvince,
      shopCityMunicipality: first.shopCityMunicipality,
      shopBarangay: first.shopBarangay,
      shopDetailedAddress: first.shopDetailedAddress,
    }
    const fallbackAddress = first.shopAddress || '—'

    setShopAddressesResolving(true)
    ;(async () => {
      try {
        const line = await formatReadableShopAddress(geo)
        const ok = line && line !== '—'
        if (gen !== addressResolveGen.current) return
        setReadableShopAddresses({ [oid]: ok ? line : fallbackAddress })
      } catch {
        if (gen !== addressResolveGen.current) return
        setReadableShopAddresses({ [oid]: fallbackAddress })
      } finally {
        if (gen === addressResolveGen.current) setShopAddressesResolving(false)
      }
    })()
  }, [shopServices])


  const filteredShopServices = useMemo(() => {
    const category = categoryFilter === '__' ? '' : categoryFilter
    const serviceType = serviceTypeFilter === '__' ? '' : serviceTypeFilter
    const normalizedQuery = listQuery.trim().toLowerCase()

    const base = shopServices.filter((item) => {
      if (category && item.category !== category) return false
      if (serviceType && item.type !== serviceType) return false
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
  }, [shopServices, categoryFilter, serviceTypeFilter, sortBy, listQuery, readableShopAddresses])

  const serviceReviewsList = useMemo(
    () =>
      serviceReviews.map((rv) => ({
        ...rv,
        images: (rv.images || []).map(resolveReviewMediaSrc).filter(Boolean),
      })),
    [serviceReviews],
  )

  const serviceReviewStats = useMemo(() => {
    const base = { stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, withComments: 0, withMedia: 0 }
    if (!serviceReviewsList.length) return base
    for (const review of serviceReviewsList) {
      const rating = Math.round(reviewRatingValue(review))
      if (rating >= 1 && rating <= 5) base.stars[rating] += 1
      if (typeof review?.comment === 'string' && review.comment.trim().length > 0) base.withComments += 1
      if (Array.isArray(review?.images) && review.images.length > 0) base.withMedia += 1
    }
    return base
  }, [serviceReviewsList])

  const serviceRatingAverage = useMemo(() => {
    const shop = Number(detail?.shopRating)
    if (detail && Number.isFinite(shop) && shop > 0) return Math.min(5, Math.max(0, shop))
    if (!serviceReviewsList.length) return 0
    const sum = serviceReviewsList.reduce((acc, r) => acc + reviewRatingValue(r), 0)
    return sum / serviceReviewsList.length
  }, [detail?.shopRating, serviceReviewsList])

  const serviceRatingCount = useMemo(() => {
    if (serviceReviewsList.length) return serviceReviewsList.length
    return 0
  }, [serviceReviewsList])

  const filteredServiceReviews = useMemo(() => {
    let list = serviceReviewsList
    if (serviceReviewFilter === 'all') return list
    if (serviceReviewFilter === 'comments')
      return list.filter((r) => typeof r?.comment === 'string' && r.comment.trim().length > 0)
    if (serviceReviewFilter === 'media') return list.filter((r) => Array.isArray(r?.images) && r.images.length > 0)
    const star = Number(serviceReviewFilter)
    if (star >= 1 && star <= 5) {
      return list.filter((r) => Math.round(reviewRatingValue(r)) === star)
    }
    return list
  }, [serviceReviewsList, serviceReviewFilter])

  const hasServiceRatings = serviceRatingCount > 0 && serviceRatingAverage > 0

  useEffect(() => {
    setServiceReviewFilter('all')
  }, [anchorServiceId])

  useEffect(() => {
    if (!user || !anchorServiceId || !isLikelyMongoId(anchorServiceId)) {
      setServiceReviews([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/catalog/shop-services/${encodeURIComponent(anchorServiceId)}/reviews`, {
          headers: authHeaders(),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || 'Could not load reviews.')
        const list = Array.isArray(data?.reviews) ? data.reviews : []
        if (!cancelled) setServiceReviews(list)
      } catch {
        if (!cancelled) setServiceReviews([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, anchorServiceId])


  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-sky-50 via-violet-50 to-indigo-100">
        <p className="text-gray-600 text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <CustomerLayout activePage="find-services">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 py-6">
        <div className="mx-auto max-w-7xl px-1 sm:px-3">
          {detailLoading ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-[#081F5C]/20 bg-white/60 px-6 py-12 text-center shadow-sm">
              <p className="text-sm font-medium text-foreground">Loading shop…</p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">Fetching services for this shop.</p>
            </div>
          ) : detailError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
              <p>{detailError}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => {
                  window.location.hash = '#/customer/find-services'
                }}
              >
                Back to Find Services
              </Button>
            </div>
          ) : detail ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-0">
                <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2">
                  <div className="relative isolate z-0 w-full min-h-[max(300px,min(480px,58vh))] overflow-hidden rounded-none border-x-0 border-b-0 border-t-0 border-[#081F5C]/10 bg-white/90 shadow-sm ring-1 ring-inset ring-black/5 dark:border-white/10 dark:bg-[#020818]/90 dark:ring-white/5">
                    <div className="absolute inset-0 z-0 flex min-h-0 flex-col">
                      {mapPartsResolving ? (
                        <div
                          className="flex h-full min-h-[max(300px,min(480px,58vh))] w-full flex-1 items-center justify-center bg-slate-100/90 text-sm text-muted-foreground dark:bg-white/5"
                          role="status"
                          aria-live="polite"
                        >
                          Preparing map from shop address…
                        </div>
                      ) : (
                        <div className="flex min-h-0 flex-1 flex-col">
                          <ShopAddressGoogleMap
                            addressParts={mapAddressParts}
                            mapTitle={detail.shopName?.trim() ? `${detail.shopName.trim()} — shop location` : 'Shop location'}
                            showHeading={false}
                            flush
                            emptyAddressHint="This shop has not added enough address detail to show a map pin. Use the written address below."
                          />
                        </div>
                      )}
                    </div>

                    <div className="pointer-events-none absolute inset-y-2.5 left-0 right-0 z-10 sm:inset-y-4">
                      <div className="mx-auto flex h-full w-full max-w-7xl items-start px-1 sm:px-3">
                        <aside
                          className="pointer-events-none flex max-h-full w-[min(19rem,100%)] max-w-full flex-col self-start sm:w-[min(22rem,100%)]"
                          aria-label="Shop summary"
                        >
                          <div className="pointer-events-auto flex w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-[#081F5C]/40 bg-white/58 shadow-lg shadow-black/10 ring-1 ring-[#081F5C]/12 dark:border-[#1447a6]/55 dark:bg-white/40 dark:shadow-black/30 dark:ring-[#1447a6]/20">
                            <CardContent className="flex max-h-[min(32rem,72dvh)] flex-col gap-0 overflow-hidden border-0 bg-transparent p-0 text-shadow-[0_1px_2px_rgba(255,255,255,0.88)] shadow-none dark:text-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
                              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 pb-2 pt-3 sm:gap-4 sm:px-4 sm:pb-3 sm:pt-4">
                                <div>
                                  <p className="flex items-start gap-2 text-sm font-semibold leading-snug sm:text-base">
                                    <OwnerThumb
                                      src={resolveOwnerThumbSrc(detail)}
                                      ownerName={detail.shopOwner?.trim() || detail.shopName?.trim() || ''}
                                    />
                                    <span className="min-w-0 text-slate-900 dark:text-white">{detail.shopName?.trim() || '—'}</span>
                                  </p>
                                </div>

                                <div className="space-y-2.5 border-t border-dashed border-[#081F5C]/18 pt-2.5 dark:border-[#1447a6]/35 sm:space-y-3 sm:pt-3">
                                  <div className="flex gap-2 text-sm">
                                    <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600 sm:h-4 sm:w-4 dark:text-white/75" aria-hidden />
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600 sm:text-[11px] dark:text-white/65">
                                        Shop owner
                                      </p>
                                      <p className="text-xs font-medium text-slate-900 sm:text-sm dark:text-white">{detail.shopOwner?.trim() || '—'}</p>
                                    </div>
                                  </div>

                                  <div className="flex gap-2 text-sm">
                                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600 sm:h-4 sm:w-4 dark:text-white/75" aria-hidden />
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600 sm:text-[11px] dark:text-white/65">
                                        Address
                                      </p>
                                      <p className="text-xs leading-snug text-slate-900 sm:text-sm dark:text-white">{detail.shopAddress?.trim() || '—'}</p>
                                    </div>
                                  </div>

                                  {detail.shopLandmark?.trim() ? (
                                    <div className="flex gap-2 text-sm">
                                      <Landmark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600 sm:h-4 sm:w-4 dark:text-amber-200/90" aria-hidden />
                                      <div className="min-w-0">
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600 sm:text-[11px] dark:text-white/65">
                                          Landmark
                                        </p>
                                        <p className="text-xs leading-snug text-slate-900 sm:text-sm dark:text-white">{detail.shopLandmark.trim()}</p>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 border-t border-dashed border-[#081F5C]/18 pt-2.5 dark:border-[#1447a6]/35 sm:gap-2 sm:pt-3">
                                  {serviceTypeBadge(detail.type)}
                                  <Badge
                                    variant="outline"
                                    className="inline-flex items-center gap-1 border-[#081F5C]/30 bg-white/65 text-[10px] font-medium text-slate-800 sm:gap-1 sm:text-[11px] dark:border-[#1447a6]/45 dark:bg-white/35 dark:text-white"
                                  >
                                    <CalendarCheck className="h-2.5 w-2.5 shrink-0 opacity-90 sm:h-3 sm:w-3" aria-hidden />
                                    {shopContext?.totalCompletedBookings != null
                                      ? shopContext.totalCompletedBookings
                                      : detail.completedJobs ?? 0}{' '}
                                    bookings
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="inline-flex items-center gap-0.5 border-[#081F5C]/30 bg-white/65 text-[10px] font-medium text-slate-800 sm:gap-1 sm:text-[11px] dark:border-[#1447a6]/45 dark:bg-white/35 dark:text-white"
                                  >
                                    <Star className="h-2.5 w-2.5 shrink-0 text-slate-700 dark:text-amber-200/90 sm:h-3 sm:w-3" aria-hidden />
                                    {typeof detail.shopRating === 'number' && detail.shopRating > 0
                                      ? `${detail.shopRating.toFixed(1)} rating`
                                      : 'No ratings yet'}
                                  </Badge>
                                </div>
                              </div>

                              <div className="shrink-0 border-t border-dashed border-[#081F5C]/18 bg-white/40 px-3 py-2.5 dark:border-[#1447a6]/35 dark:bg-white/15 sm:px-4">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                                  <Button
                                    type="button"
                                    aria-label="Open messages to contact this shop"
                                    className="h-9 w-full flex-1 gap-2 rounded-lg bg-linear-to-r from-[#081F5C] to-[#1447a6] text-xs font-medium text-white shadow-sm hover:opacity-95 sm:h-10 sm:text-sm"
                                    onClick={() => {
                                      const ownerId = detail?.shopOwnerId
                                      if (ownerId) {
                                        try {
                                          sessionStorage.setItem(
                                            'epaayos_message_recipient',
                                            JSON.stringify({
                                              fullName: detail.shopName?.trim() || 'Shop',
                                              shopName: detail.shopName?.trim() || '',
                                              ownerName: detail.shopOwner?.trim() || '',
                                              role: 'Shop',
                                              isOnline: false,
                                              otherUserId: String(ownerId),
                                            }),
                                          )
                                        } catch {
                                          /* ignore */
                                        }
                                      }
                                      window.location.hash = '#/customer/messages'
                                    }}
                                  >
                                    <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                                    Message shop
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    aria-label="Scroll to shop services"
                                    className="h-9 w-full flex-1 gap-2 rounded-lg border-[#081F5C]/35 bg-white/90 text-xs font-medium text-[#081F5C] shadow-sm hover:bg-white sm:h-10 sm:text-sm dark:border-white/25 dark:bg-white/10 dark:text-white"
                                    onClick={() => {
                                      document.getElementById('customer-view-shop-services')?.scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'start',
                                      })
                                    }}
                                  >
                                    <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                                    Shop services
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </div>
                        </aside>
                      </div>
                    </div>
                  </div>
                </div>

              <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2">
                <div
                  id="customer-shop-summary-table"
                  className="overflow-x-auto rounded-none border-x-0 border-b border-t-0 border-zinc-400/45 bg-linear-to-r from-zinc-300 via-zinc-200 to-zinc-300 px-0 py-2 shadow-sm ring-1 ring-inset ring-zinc-400/30 dark:border-zinc-500/40 dark:bg-linear-to-r dark:from-zinc-700 dark:via-zinc-600 dark:to-zinc-700 dark:ring-zinc-500/25 sm:py-2.5"
                  role="region"
                  aria-label="Shop summary table"
                >
                  <div className="mx-auto w-full max-w-7xl pl-20 pr-1 sm:pl-28 sm:pr-3">
                    <table className="w-full min-w-[36rem] border-separate border-spacing-x-1 border-spacing-y-0 text-sm text-zinc-900 dark:text-zinc-100 sm:min-w-[42rem] sm:border-spacing-x-2 md:border-spacing-x-3">
                      <tbody>
                        <tr>
                          <td className="w-[24%] whitespace-nowrap py-1.5 align-top sm:py-2">
                            <ShopTableLabel icon={Layers} variant="dark">
                              No. of Services:
                            </ShopTableLabel>
                          </td>
                          <td className="w-[22%] py-1.5 align-top font-medium tabular-nums sm:py-2">
                            {shopContext?.activeServiceCount != null ? shopContext.activeServiceCount : '—'}
                          </td>
                          <td className="w-[24%] whitespace-nowrap border-l border-zinc-400/55 py-1.5 pl-6 align-top dark:border-zinc-500/50 sm:py-2 sm:pl-10 md:pl-14">
                            <ShopTableLabel icon={Clock} variant="dark">
                              Operating Hours:
                            </ShopTableLabel>
                          </td>
                          <td className="min-w-0 py-1.5 align-top font-medium wrap-break-word sm:py-2">
                            {detail.shopOperatingHours?.trim() ? detail.shopOperatingHours.trim() : '—'}
                          </td>
                        </tr>
                        <tr>
                          <td className="whitespace-nowrap py-1.5 align-top sm:py-2">
                            <ShopTableLabel icon={Tag} variant="dark">
                              Service Type:
                            </ShopTableLabel>
                          </td>
                          <td className="py-1.5 align-top font-medium sm:py-2">
                            {SERVICE_TYPES.find((x) => x.value === detail.type)?.label ?? '—'}
                          </td>
                          <td className="whitespace-nowrap border-l border-zinc-400/55 py-1.5 pl-6 align-top dark:border-zinc-500/50 sm:py-2 sm:pl-10 md:pl-14">
                            <ShopTableLabel icon={Star} variant="dark">
                              Ratings:
                            </ShopTableLabel>
                          </td>
                          <td className="min-w-0 py-1.5 align-top font-medium tabular-nums sm:py-2">
                            {(() => {
                              const shopAvg = Number(shopContext?.shopAverageRating) || 0
                              const svc = Number(detail.shopRating) || 0
                              if (shopAvg > 0) return `${shopAvg.toFixed(1)} / 5`
                              if (svc > 0) return `${svc.toFixed(1)} / 5`
                              return '—'
                            })()}
                          </td>
                        </tr>
                        <tr>
                          <td className="whitespace-nowrap py-1.5 align-top sm:py-2">
                            <ShopTableLabel icon={Users} variant="dark">
                              {noOfTechnicianMechanicLabel(detail.category)}
                            </ShopTableLabel>
                          </td>
                          <td className="py-1.5 align-top font-medium tabular-nums sm:py-2">
                            {(detail.staff ?? []).length}
                          </td>
                          <td className="whitespace-nowrap border-l border-zinc-400/55 py-1.5 pl-6 align-top dark:border-zinc-500/50 sm:py-2 sm:pl-10 md:pl-14">
                            <ShopTableLabel icon={CalendarDays} variant="dark">
                              Date Joined:
                            </ShopTableLabel>
                          </td>
                          <td className="min-w-0 py-1.5 align-top font-medium sm:py-2">
                            {formatShopOwnerJoinedAt(detail.shopOwnerJoinedAt)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

              <section id="customer-view-shop-services" className="space-y-3 scroll-mt-24">
                {shopServices.length > 0 ? (
                  <div className="mb-1 flex min-w-0 w-full max-w-full flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 w-full max-w-full flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-nowrap">
                      <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[200px]">
                        <select
                          className={`${selectShell} ${categoryFilter === '__' ? 'text-neutral-500' : 'text-neutral-900'}`}
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          aria-label="Filter by category"
                        >
                          <option value="__" disabled hidden>
                            Category
                          </option>
                          <option value="">All</option>
                          {CATEGORIES.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                        <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                      </div>

                      <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[200px]">
                        <select
                          className={`${selectShell} ${serviceTypeFilter === '__' ? 'text-neutral-500' : 'text-neutral-900'}`}
                          value={serviceTypeFilter}
                          onChange={(e) => setServiceTypeFilter(e.target.value)}
                          aria-label="Filter by service type"
                        >
                          <option value="__" disabled hidden>
                            Service type
                          </option>
                          <option value="">All</option>
                          {SERVICE_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <Home className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                      </div>

                      <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[200px]">
                        <select
                          className={selectShell}
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          aria-label="Sort listings"
                        >
                          <option value="rating">Sort: Top rated</option>
                          <option value="jobs">Sort: Most completed jobs</option>
                          <option value="price-low">Sort: Lowest starting price</option>
                        </select>
                        <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                      </div>
                    </div>

                    <div className="relative min-w-0 w-full max-w-full lg:max-w-lg lg:flex-1">
                      <div className="relative w-full min-w-0 max-w-full">
                        <Input
                          className="h-9 w-full min-w-0 rounded-lg border-none ring-0 bg-white/95 pr-12 pl-4 text-sm shadow-[0_3px_10px_rgba(15,23,42,0.12)] focus-visible:ring-2 focus-visible:ring-[#081F5C]/20"
                          placeholder="Search services or shops..."
                          value={listQuery}
                          onChange={(e) => setListQuery(e.target.value)}
                          aria-label="Search services at this shop"
                        />
                        <Button
                          type="button"
                          size="icon-sm"
                          className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-md bg-linear-to-r from-[#081F5C] to-[#1447a6] p-0 shadow-sm hover:opacity-95"
                          aria-label="Search"
                          tabIndex={-1}
                        >
                          <Search className="h-4 w-4 text-white" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div>
                  <h2 className="text-base font-semibold text-[#081F5C] md:text-lg">Services at this shop</h2>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    {shopServices.length === 0
                      ? 'No active listings from this shop yet.'
                      : `Total: ${shopServices.length} active listing${shopServices.length === 1 ? '' : 's'}`}
                    {shopContext?.totalCompletedBookings != null && shopServices.length > 0
                      ? ` · ${shopContext.totalCompletedBookings} completed booking${shopContext.totalCompletedBookings === 1 ? '' : 's'} (all services)`
                      : ''}
                  </p>
                </div>

                {shopServices.length === 0 ? (
                  <div className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#081F5C]/20 bg-white/60 px-6 text-center shadow-sm">
                    <p className="text-sm font-medium text-foreground">No services listed</p>
                  </div>
                ) : filteredShopServices.length === 0 ? (
                  <div className="flex min-h-[150px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#081F5C]/20 bg-slate-50/70 px-6 text-center shadow-sm">
                    <p className="text-sm font-medium text-foreground">No matching services</p>
                    <p className="mt-1 max-w-md text-xs text-muted-foreground">
                      Try adjusting your search or filters to see listings from this shop.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {filteredShopServices.map((item) => (
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

              <div className="space-y-4 pt-2">
                <section className="pt-2" aria-labelledby="view-shop-completed-works-heading">
                  <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2
                        id="view-shop-completed-works-heading"
                        className="flex items-center gap-2 text-base font-semibold tracking-tight text-[#081F5C] dark:text-slate-50 sm:text-lg"
                      >
                        <ClipboardList className="h-5 w-5 shrink-0 text-[#081F5C]/80 dark:text-sky-300/85" aria-hidden />
                        Completed works
                      </h2>
                    </div>
                  </div>
                  <div
                    className="flex flex-nowrap gap-4 overflow-x-auto overscroll-x-contain pt-0.5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth snap-x snap-mandatory [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
                    role="list"
                    aria-label="Completed work entries"
                  >
                    {MOCK_COMPLETED_WORKS.map((job) => {
                      const { time, date } = formatCompletedWorkDateTime(job.completedAt)
                      return (
                        <article
                          key={job.id}
                          role="listitem"
                          className="w-[min(420px,calc(100vw-3rem))] shrink-0 snap-start rounded-xl border border-[#081F5C]/12 bg-white/95 p-5 shadow-sm dark:border-white/10 dark:bg-[#020818]/90 sm:w-[min(440px,calc(100vw-4rem))] md:w-[460px]"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-bold text-white ring-2 ring-white/80 shadow-sm dark:ring-white/20"
                              aria-hidden
                            >
                              {initialsFromName(job.customerName)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">{job.customerName}</p>
                              <p className="text-[11px] text-muted-foreground">Customer</p>
                            </div>
                          </div>
                          <div className="mt-3 border-t border-dashed border-[#081F5C]/15 pt-3 dark:border-white/10">
                            <p className="text-[11px] font-normal leading-snug text-muted-foreground/80 dark:text-muted-foreground/70">
                              Work completed for customer
                            </p>
                            <p className="mt-2 text-sm font-normal leading-relaxed text-foreground">{job.whatWasFixed}</p>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3 border-t border-dashed border-[#081F5C]/15 pt-3 text-sm tabular-nums dark:border-white/10">
                            <span className="shrink-0 font-semibold text-[#04133d] dark:text-slate-100">{time}</span>
                            <span className="min-w-0 text-right font-medium text-muted-foreground">{date}</span>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </section>

                <section className="pt-2" aria-labelledby="view-shop-service-reviews-heading">
                  <div className="overflow-hidden rounded-2xl border border-[#081F5C]/10 bg-white/95 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-[#020818]/95">
                    <div className="px-4 py-4 sm:px-5 sm:py-5">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <h2
                          id="view-shop-service-reviews-heading"
                          className="flex items-center gap-2 text-lg font-semibold text-[#081F5C] dark:text-slate-100 sm:text-xl"
                        >
                          <Star className="h-5 w-5 shrink-0 fill-amber-400/30 text-amber-500 dark:fill-amber-400/20 dark:text-amber-300/90" aria-hidden />
                          Reviews &amp; Ratings
                        </h2>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              window.location.hash = '#/customer/reviews-ratings'
                            }}
                            className="text-sm font-medium text-[#1447a6] hover:text-[#081F5C] dark:text-sky-300 dark:hover:text-sky-200"
                          >
                            View all ›
                          </button>
                        </div>
                      </div>

                      <div className="mb-3 flex flex-wrap items-center gap-3">
                        <div className="text-xl font-bold text-foreground">
                          {hasServiceRatings ? `${serviceRatingAverage.toFixed(1)} out of 5` : 'No ratings yet'}
                        </div>
                        <div className="flex items-center" aria-hidden>
                          {[0, 1, 2, 3, 4].map((i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(hasServiceRatings ? serviceRatingAverage : 0)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-muted-foreground/35'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="hidden h-4 w-px bg-border sm:block" />
                        <span className="text-sm text-muted-foreground">
                          {hasServiceRatings
                            ? `${serviceRatingCount} Review${serviceRatingCount === 1 ? '' : 's'}`
                            : 'No reviews yet'}
                        </span>
                      </div>

                      {serviceReviewsList.length > 0 ? (
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => setServiceReviewFilter('all')}
                            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                              serviceReviewFilter === 'all'
                                ? 'border border-[#081F5C] bg-[#081F5C]/10 text-[#081F5C] dark:border-sky-400/60 dark:bg-sky-500/15 dark:text-sky-200'
                                : 'border border-[#081F5C]/20 text-muted-foreground hover:border-[#081F5C]/40 dark:border-white/15 dark:hover:border-white/25'
                            }`}
                          >
                            All ({serviceRatingCount})
                          </button>
                          {[5, 4, 3, 2, 1].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setServiceReviewFilter(String(star))}
                              className={`rounded px-2.5 py-1 text-xs transition-colors ${
                                serviceReviewFilter === String(star)
                                  ? 'border border-[#081F5C] bg-[#081F5C]/10 text-[#081F5C] dark:border-sky-400/60 dark:bg-sky-500/15 dark:text-sky-200'
                                  : 'border border-[#081F5C]/20 text-muted-foreground hover:border-[#081F5C]/40 dark:border-white/15 dark:hover:border-white/25'
                              }`}
                            >
                              {star} Star ({serviceReviewStats.stars[star] || 0})
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setServiceReviewFilter('comments')}
                            className={`rounded px-2.5 py-1 text-xs transition-colors ${
                              serviceReviewFilter === 'comments'
                                ? 'border border-[#081F5C] bg-[#081F5C]/10 text-[#081F5C] dark:border-sky-400/60 dark:bg-sky-500/15 dark:text-sky-200'
                                : 'border border-[#081F5C]/20 text-muted-foreground hover:border-[#081F5C]/40 dark:border-white/15 dark:hover:border-white/25'
                            }`}
                          >
                            With comments ({serviceReviewStats.withComments})
                          </button>
                          <button
                            type="button"
                            onClick={() => setServiceReviewFilter('media')}
                            className={`rounded px-2.5 py-1 text-xs transition-colors ${
                              serviceReviewFilter === 'media'
                                ? 'border border-[#081F5C] bg-[#081F5C]/10 text-[#081F5C] dark:border-sky-400/60 dark:bg-sky-500/15 dark:text-sky-200'
                                : 'border border-[#081F5C]/20 text-muted-foreground hover:border-[#081F5C]/40 dark:border-white/15 dark:hover:border-white/25'
                            }`}
                          >
                            With media ({serviceReviewStats.withMedia})
                          </button>
                        </div>
                      ) : null}

                      <div className="border-t border-[#081F5C]/10 pt-3 dark:border-white/10">
                        {filteredServiceReviews.length > 0 ? (
                          <ul className="divide-y divide-[#081F5C]/10 dark:divide-white/10">
                            {filteredServiceReviews.map((review) => {
                              const normalizedRating = Math.max(
                                0,
                                Math.min(5, Math.round(reviewRatingValue(review))),
                              )
                              const when = review.createdAt ? new Date(review.createdAt) : null
                              const dateStr =
                                when && !Number.isNaN(when.getTime())
                                  ? `${when.toLocaleDateString('en-CA')} ${when.toLocaleTimeString('en-GB', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}`
                                  : '—'
                              const displayName =
                                typeof review.customerName === 'string' && review.customerName.trim()
                                  ? review.customerName.trim()
                                  : 'Customer'
                              return (
                                <li key={review.id} className="flex gap-3 py-4 first:pt-0">
                                  <div
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-bold text-white"
                                    aria-hidden
                                  >
                                    {initialsFromName(displayName)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-foreground">{displayName}</p>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                      <div className="flex items-center" aria-label={`${normalizedRating} out of 5 stars`}>
                                        {[0, 1, 2, 3, 4].map((i) => (
                                          <Star
                                            key={i}
                                            className={`h-3 w-3 ${
                                              i < normalizedRating
                                                ? 'fill-amber-400 text-amber-400'
                                                : 'text-muted-foreground/35'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-xs text-muted-foreground">{dateStr}</span>
                                    </div>
                                    {typeof review.comment === 'string' && review.comment.trim().length > 0 ? (
                                      <p className="mt-2 text-sm leading-relaxed text-foreground">{review.comment.trim()}</p>
                                    ) : null}
                                    {Array.isArray(review.images) && review.images.length > 0 ? (
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {review.images.slice(0, 4).map((src, imgIndex) => (
                                          <div
                                            key={`${review.id}-img-${imgIndex}`}
                                            className="h-12 w-12 overflow-hidden rounded border border-[#081F5C]/10 dark:border-white/10"
                                          >
                                            <img
                                              src={src}
                                              alt=""
                                              className="h-full w-full object-cover"
                                              loading="lazy"
                                              onError={(e) => {
                                                e.currentTarget.style.display = 'none'
                                              }}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    ) : null}
                                    {typeof review.shopResponse === 'string' && review.shopResponse.trim().length > 0 ? (
                                      <div className="mt-2 rounded-md border border-[#081F5C]/10 bg-muted/40 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                                        <p className="text-xs font-medium text-muted-foreground">Shop response</p>
                                        <p className="mt-1 text-sm text-foreground">{review.shopResponse.trim()}</p>
                                      </div>
                                    ) : null}
                                    <div className="mt-2">
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                                      >
                                        <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
                                        Helpful?
                                      </button>
                                    </div>
                                  </div>
                                </li>
                              )
                            })}
                          </ul>
                        ) : serviceReviewsList.length > 0 ? (
                          <p className="py-4 text-center text-sm text-muted-foreground">No reviews match this filter.</p>
                        ) : (
                          <div className="py-6 text-center">
                            <p className="text-sm text-muted-foreground">No reviews yet</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Ratings will appear here after customers leave feedback.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </CustomerLayout>
  )
}
