import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Bike,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  ExternalLink,
  FileText,
  Home,
  Image as ImageIcon,
  Info,
  Landmark,
  Layers,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Tag,
  ThumbsUp,
  Upload,
  User,
  Users,
  WashingMachine,
  Wrench,
  X,
} from 'lucide-react'
import ShopAddressGoogleMap from '../../components/ShopAddressGoogleMap.jsx'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import CustomerLayout, { readCustomerUserSession } from '../../layout/customerlayout.jsx'
import { resolveProfilePsgcLabels, formatReadableShopAddress } from '../../lib/psgcResolve'
import { SERVICE_TYPES, CatalogServiceCard, CATEGORIES, staffAssignedLabel } from './findServices.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

const MESSAGE_RECIPIENT_STORAGE_KEY = 'epaayos_message_recipient'

function storeShopRecipientForMessages(detail) {
  const ownerId = detail?.shopOwnerId
  if (!ownerId) return
  try {
    sessionStorage.setItem(
      MESSAGE_RECIPIENT_STORAGE_KEY,
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

/**
 * Sample completed jobs: customer, work done, completion date/time.
 */
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

function formatShopOwnerJoinedAt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function noOfTechnicianMechanicLabel(category) {
  return String(category || '').toLowerCase() === 'vehicle' ? 'No. of mechanics' : 'No. of technicians'
}

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

function OwnerThumb({ src, ownerName, className = 'h-9 w-9' }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(src) && !imageFailed
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-none border border-slate-200 bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-white shadow-2xs ${className}`}
    >
      {showImage ? (
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
      ) : (
        <span className="text-xs font-bold text-white">{initialsFromName(ownerName) || '?'}</span>
      )}
    </span>
  )
}

function serviceTypeBadge(type) {
  const label = SERVICE_TYPES.find((x) => x.value === type)?.label ?? '—'
  return (
    <Badge
      variant="outline"
      className="rounded-none border border-slate-200 bg-slate-100/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#081F5C]"
    >
      {label}
    </Badge>
  )
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
  if (normalized === 'vehicle')
    return 'rounded-none bg-linear-to-r from-sky-600 to-blue-700 text-white font-bold px-2.5 py-0.5 text-[10px] uppercase tracking-wider'
  if (normalized === 'gadget')
    return 'rounded-none bg-linear-to-r from-violet-600 to-fuchsia-600 text-white font-bold px-2.5 py-0.5 text-[10px] uppercase tracking-wider'
  if (normalized === 'appliance')
    return 'rounded-none bg-linear-to-r from-emerald-600 to-teal-600 text-white font-bold px-2.5 py-0.5 text-[10px] uppercase tracking-wider'
  if (normalized === 'others')
    return 'rounded-none bg-linear-to-r from-amber-600 to-orange-600 text-white font-bold px-2.5 py-0.5 text-[10px] uppercase tracking-wider'
  return 'rounded-none bg-linear-to-r from-slate-600 to-slate-800 text-white font-bold px-2.5 py-0.5 text-[10px] uppercase tracking-wider'
}

function shouldShowProviderNote(value) {
  const t = String(value ?? '').trim()
  if (!t) return false
  const lower = t.toLowerCase()
  if (lower === 'n/a' || lower === 'na' || lower === 'n.a.' || lower === 'n.a' || lower === 'none' || lower === 'null')
    return false
  if (/^[-—–]+$/.test(t)) return false
  return true
}

const selectShell =
  'h-9 w-full appearance-none rounded-none border border-slate-200 bg-white px-3 py-1.5 pr-8 text-xs sm:text-sm font-medium shadow-[0_2px_5px_rgba(15,23,42,0.1)] outline-none focus-visible:ring-1 focus-visible:ring-[#081F5C] focus-visible:border-[#081F5C] transition-all hover:border-slate-300'

export default function CustomerViewShop({ anchorServiceId }) {
  const [user, setUser] = useState(readCustomerUserSession)

  const [detail, setDetail] = useState(null)
  const [shopServices, setShopServices] = useState([])
  const [shopContext, setShopContext] = useState(null)
  const [detailLoading, setDetailLoading] = useState(true)
  const [detailError, setDetailError] = useState('')

  const [mapAddressParts, setMapAddressParts] = useState(null)
  const [mapPartsResolving, setMapPartsResolving] = useState(false)
  const [readableShopAddress, setReadableShopAddress] = useState('')
  const [shopAddressResolving, setShopAddressResolving] = useState(false)

  const [readableShopAddresses, setReadableShopAddresses] = useState({})
  const [shopAddressesResolving, setShopAddressesResolving] = useState(false)

  const [mapUserLocation, setMapUserLocation] = useState(null)
  const [mapLocationLoading, setMapLocationLoading] = useState(false)
  const [mapLocationError, setMapLocationError] = useState('')

  const [listQuery, setListQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('__')
  const [serviceTypeFilter, setServiceTypeFilter] = useState('__')
  const [sortBy, setSortBy] = useState('rating')

  const [serviceReviews, setServiceReviews] = useState([])
  const [serviceReviewFilter, setServiceReviewFilter] = useState('all')

  const completedWorksScrollRef = useRef(null)
  const [completedWorksCanScrollLeft, setCompletedWorksCanScrollLeft] = useState(false)
  const [completedWorksCanScrollRight, setCompletedWorksCanScrollRight] = useState(true)
  const isInteractingWithWorksRef = useRef(false)
  const interactionTimeoutRef = useRef(null)

  const scrollCompletedWorks = (direction) => {
    const el = completedWorksScrollRef.current
    if (!el) return
    isInteractingWithWorksRef.current = true
    if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current)
    interactionTimeoutRef.current = setTimeout(() => {
      isInteractingWithWorksRef.current = false
    }, 6000)

    const card = el.firstElementChild
    const cardWidth = card ? card.getBoundingClientRect().width + 12 : 300
    el.scrollBy({ left: direction === 'left' ? -cardWidth : cardWidth, behavior: 'smooth' })
  }

  // Auto-slide completed works
  useEffect(() => {
    const el = completedWorksScrollRef.current
    if (!el) return

    const updateScrollButtons = () => {
      if (!el) return
      setCompletedWorksCanScrollLeft(el.scrollLeft > 8)
      setCompletedWorksCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
    }

    updateScrollButtons()
    el.addEventListener('scroll', updateScrollButtons, { passive: true })

    const pauseAutoScroll = () => {
      isInteractingWithWorksRef.current = true
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current)
      interactionTimeoutRef.current = setTimeout(() => {
        isInteractingWithWorksRef.current = false
      }, 5000)
    }

    el.addEventListener('touchstart', pauseAutoScroll, { passive: true })
    el.addEventListener('touchmove', pauseAutoScroll, { passive: true })
    el.addEventListener('pointerdown', pauseAutoScroll, { passive: true })
    el.addEventListener('wheel', pauseAutoScroll, { passive: true })
    el.addEventListener('mouseenter', pauseAutoScroll, { passive: true })

    const interval = setInterval(() => {
      if (isInteractingWithWorksRef.current || !el) return
      const card = el.firstElementChild
      const cardWidth = card ? card.getBoundingClientRect().width + 12 : 300

      if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 16) {
        el.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        el.scrollBy({ left: cardWidth, behavior: 'smooth' })
      }
    }, 4500)

    return () => {
      clearInterval(interval)
      if (interactionTimeoutRef.current) clearTimeout(interactionTimeoutRef.current)
      if (el) {
        el.removeEventListener('scroll', updateScrollButtons)
        el.removeEventListener('touchstart', pauseAutoScroll)
        el.removeEventListener('touchmove', pauseAutoScroll)
        el.removeEventListener('pointerdown', pauseAutoScroll)
        el.removeEventListener('wheel', pauseAutoScroll)
        el.removeEventListener('mouseenter', pauseAutoScroll)
      }
    }
  }, [detail])

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
          throw new Error(errBody?.message || 'Could not load shop details.')
        }
        const data = errBody
        const list = Array.isArray(data?.services) ? data.services : []
        const focusId = data?.focusServiceId ? String(data.focusServiceId) : anchorServiceId
        const focus =
          list.find((s) => s && String(s.id) === focusId) ||
          list.find((s) => s && String(s.id) === String(anchorServiceId))
        if (!focus) {
          throw new Error('Shop service not found or no longer available.')
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
          setDetailError(e?.message || 'Could not load shop details.')
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
      setReadableShopAddress('')
      setShopAddressResolving(false)
      return
    }
    let cancelled = false
    setMapPartsResolving(true)
    setShopAddressResolving(true)
    ;(async () => {
      try {
        const [labels, line] = await Promise.all([
          resolveProfilePsgcLabels({
            shopRegion: detail.shopRegion,
            shopProvince: detail.shopProvince,
            shopCityMunicipality: detail.shopCityMunicipality,
            shopBarangay: detail.shopBarangay,
          }),
          formatReadableShopAddress({
            shopDetailedAddress: detail.shopDetailedAddress,
            shopBarangay: detail.shopBarangay,
            shopCityMunicipality: detail.shopCityMunicipality,
            shopProvince: detail.shopProvince,
            shopRegion: detail.shopRegion,
          }),
        ])
        if (cancelled) return
        setMapAddressParts({
          detailedAddress: detail.shopDetailedAddress?.trim() || '',
          barangay:
            labels.shopBarangay ||
            (detail.shopBarangay && !/^\d+$/.test(String(detail.shopBarangay).trim())
              ? String(detail.shopBarangay).trim()
              : ''),
          cityMunicipality:
            labels.shopCityMunicipality ||
            (detail.shopCityMunicipality && !/^\d+$/.test(String(detail.shopCityMunicipality).trim())
              ? String(detail.shopCityMunicipality).trim()
              : ''),
          province:
            labels.shopProvince ||
            (detail.shopProvince && !/^\d+$/.test(String(detail.shopProvince).trim())
              ? String(detail.shopProvince).trim()
              : ''),
          region:
            labels.shopRegion ||
            (detail.shopRegion && !/^\d+$/.test(String(detail.shopRegion).trim())
              ? String(detail.shopRegion).trim()
              : ''),
          landmark: detail.shopLandmark?.trim() || '',
        })
        const fallbackClean = detail.shopAddress
          ? String(detail.shopAddress)
              .split(',')
              .map((p) => p.trim())
              .filter((p) => !/^\d{4,}$/.test(p))
              .join(', ')
          : ''
        setReadableShopAddress(line && line !== '—' ? line : fallbackClean || detail.shopDetailedAddress || '—')
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
        const fallbackClean = detail.shopAddress
          ? String(detail.shopAddress)
              .split(',')
              .map((p) => p.trim())
              .filter((p) => !/^\d{4,}$/.test(p))
              .join(', ')
          : ''
        setReadableShopAddress(fallbackClean || detail.shopDetailedAddress || '—')
      } finally {
        if (!cancelled) {
          setMapPartsResolving(false)
          setShopAddressResolving(false)
        }
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

  const readBrowserLocation = ({ onSuccess, onError, onFinish }) => {
    if (!navigator.geolocation) {
      onError?.('Location is not supported in this browser.')
      onFinish?.()
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSuccess?.(pos.coords.latitude, pos.coords.longitude)
        onFinish?.()
      },
      (err) => {
        let msg = 'Could not read your location.'
        if (err?.code === 1) {
          msg = 'Location permission was denied. Allow location in your browser settings.'
        } else if (err?.code === 2) {
          msg = 'Location unavailable. Try again.'
        } else if (err?.code === 3) {
          msg = 'Location request timed out. Try again.'
        }
        onError?.(msg)
        onFinish?.()
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60_000 },
    )
  }

  const captureMapUserLocation = () => {
    setMapLocationError('')
    setMapLocationLoading(true)
    readBrowserLocation({
      onSuccess: (lat, lng) => {
        setMapUserLocation({ lat, lng })
      },
      onError: (msg) => setMapLocationError(msg),
      onFinish: () => setMapLocationLoading(false),
    })
  }

  const clearMapUserLocation = () => {
    setMapUserLocation(null)
    setMapLocationError('')
  }

  const headerMapSecondaryPin = useMemo(() => {
    if (
      mapUserLocation &&
      typeof mapUserLocation.lat === 'number' &&
      Number.isFinite(mapUserLocation.lat) &&
      typeof mapUserLocation.lng === 'number' &&
      Number.isFinite(mapUserLocation.lng)
    ) {
      return {
        lat: mapUserLocation.lat,
        lng: mapUserLocation.lng,
        label: 'Your location',
      }
    }
    return null
  }, [mapUserLocation])

  const displayShopAddress = useMemo(() => {
    if (readableShopAddress && readableShopAddress !== '—') return readableShopAddress
    if (shopAddressResolving || mapPartsResolving) return 'Resolving address…'
    if (mapAddressParts) {
      const { detailedAddress, barangay, cityMunicipality, province, region } = mapAddressParts
      const cleanBrgy = barangay && !/^\d+$/.test(barangay.trim()) ? barangay.trim() : ''
      const cleanCity = cityMunicipality && !/^\d+$/.test(cityMunicipality.trim()) ? cityMunicipality.trim() : ''
      const cleanProv = province && !/^\d+$/.test(province.trim()) ? province.trim() : ''
      const cleanReg = region && !/^\d+$/.test(region.trim()) ? region.trim() : ''
      const geoParts = [cleanBrgy, cleanCity, cleanProv, cleanReg].filter(Boolean)
      const geoLine = geoParts.join(', ')
      const street = detailedAddress?.trim() || ''
      if (street && geoLine) return `${street}, ${geoLine}`
      if (street) return street
      if (geoLine) return geoLine
    }
    const raw = detail?.shopAddress?.trim() || ''
    if (raw) {
      const parts = raw
        .split(',')
        .map((p) => p.trim())
        .filter((p) => !/^\d{4,}$/.test(p))
      if (parts.length > 0) return parts.join(', ')
    }
    return detail?.shopDetailedAddress?.trim() || '—'
  }, [readableShopAddress, shopAddressResolving, mapPartsResolving, mapAddressParts, detail])

  const googleMapsSearchUrl = useMemo(() => {
    if (!detail) return ''
    const addressStr =
      displayShopAddress !== '—' && displayShopAddress !== 'Resolving address…'
        ? displayShopAddress
        : detail.shopDetailedAddress?.trim() || ''
    const parts = [detail.shopName?.trim(), addressStr, 'Philippines'].filter(Boolean)
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`
  }, [detail, displayShopAddress])

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
      const addrLine = (item.shopOwnerId && readableShopAddresses[item.shopOwnerId]) || item.shopAddress || ''
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
    const shop = Number(shopContext?.shopAverageRating || detail?.shopRating)
    if (detail && Number.isFinite(shop) && shop > 0) return Math.min(5, Math.max(0, shop))
    if (!serviceReviewsList.length) return 0
    const sum = serviceReviewsList.reduce((acc, r) => acc + reviewRatingValue(r), 0)
    return sum / serviceReviewsList.length
  }, [shopContext?.shopAverageRating, detail?.shopRating, serviceReviewsList])

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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider">Loading system user session…</p>
      </div>
    )
  }

  const CategoryIcon = detail ? categoryIcon(detail.category) : Store

  return (
    <CustomerLayout activePage="view-shop">
      {/* Main Page Container with Dedicated Mobile Responsive Spacing */}
      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 space-y-4 sm:space-y-5 pb-24 sm:pb-6 overflow-x-hidden min-w-0">
        {detailLoading ? (
          <div className="flex min-h-[380px] flex-col items-center justify-center rounded-none border border-dashed border-slate-300 bg-white p-6 text-center shadow-[0_3px_8px_rgba(15,23,42,0.14)]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#081F5C]" />
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-900">Loading shop profile…</p>
            <p className="mt-1 max-w-md text-xs text-slate-500 font-medium">
              Fetching shop details, verified service catalog, location map, and reviews.
            </p>
          </div>
        ) : detailError ? (
          <div className="rounded-none border border-rose-300 bg-rose-50 p-6 text-center text-xs font-medium text-rose-900 shadow-[0_3px_8px_rgba(15,23,42,0.14)]">
            <p className="text-sm font-bold text-rose-800">{detailError}</p>
            <p className="mt-1 text-xs text-rose-600">The requested shop might be unavailable or removed.</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 rounded-none border-rose-300 text-xs font-bold uppercase tracking-wider hover:bg-rose-100"
              onClick={() => {
                window.location.hash = '#/customer/find-services'
              }}
            >
              Back to Find Services
            </Button>
          </div>
        ) : detail ? (
          <div className="space-y-4 sm:space-y-5">
            {/* 1. MAP HERO CONTAINER WITH FULLY RESPONSIVE MOBILE LAYOUT */}
            <div className="relative overflow-hidden rounded-none border border-slate-800 bg-white shadow-lg w-full flex flex-col">
              {/* MOBILE ONLY: Dedicated Top Shop Location Info Card (Unblocks Map on Mobile Screens) */}
              <div className="sm:hidden border-b border-slate-200 bg-white p-3 space-y-2.5">
                {/* Shop Name & Owner Header */}
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <OwnerThumb
                      src={resolveOwnerThumbSrc(detail)}
                      ownerName={detail.shopOwner?.trim() || detail.shopName?.trim() || ''}
                      className="h-10 w-10 border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-extrabold leading-tight text-slate-900 truncate flex items-center gap-1.5">
                        <span className="truncate">{detail.shopName?.trim() || 'Shop Profile'}</span>
                        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      </h3>
                      <p className="text-xs font-medium text-slate-500 truncate mt-0.5">
                        Owner: <span className="font-bold text-slate-800">{detail.shopOwner?.trim() || '—'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Message Shop button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 rounded-none border-slate-300 text-xs font-bold text-[#081F5C] px-3 hover:bg-slate-50 uppercase tracking-wider"
                    onClick={() => {
                      storeShopRecipientForMessages(detail)
                      window.location.hash = '#/customer/messages'
                    }}
                  >
                    <MessageCircle className="h-3.5 w-3.5 mr-1" />
                    Message
                  </Button>
                </div>

                {/* Address & Landmark Info */}
                <div className="border-t border-slate-100 pt-2 space-y-1.5 text-xs">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#081F5C]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shop Address</p>
                      <p className="font-medium text-slate-800 leading-snug text-xs mt-0.5 break-words">
                        {displayShopAddress}
                      </p>
                    </div>
                  </div>

                  {detail.shopLandmark?.trim() ? (
                    <div className="flex items-start gap-2 pt-1.5 border-t border-slate-50">
                      <Landmark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Landmark</p>
                        <p className="font-medium text-slate-800 leading-snug text-xs mt-0.5 truncate">
                          {detail.shopLandmark.trim()}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Map Canvas */}
              <div className="relative isolate z-0 h-[260px] xs:h-[285px] sm:h-[300px] w-full bg-slate-100">
                {mapPartsResolving ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-[#081F5C]" />
                    <span>Resolving map location…</span>
                  </div>
                ) : (
                  <div className="relative h-full w-full">
                    <ShopAddressGoogleMap
                      addressParts={mapAddressParts}
                      mapTitle={detail.shopName?.trim() ? `${detail.shopName.trim()} — shop location` : 'Shop location'}
                      showHeading={false}
                      flush
                      secondaryPin={headerMapSecondaryPin}
                      showRouteLine={Boolean(headerMapSecondaryPin)}
                      emptyAddressHint="This shop has not added enough address detail to show a map pin. Use the written address below."
                    />

                    {/* DESKTOP ONLY: Unified Floating Shop Details Container inside Map */}
                    <div className="hidden sm:block pointer-events-auto absolute top-3 left-3 z-20 max-w-xs rounded-none border border-slate-200/90 bg-white/95 p-3 shadow-[0_4px_14px_rgba(15,23,42,0.18)] backdrop-blur-md transition-all space-y-2">
                      {/* Shop Name & Owner Header */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <OwnerThumb
                          src={resolveOwnerThumbSrc(detail)}
                          ownerName={detail.shopOwner?.trim() || detail.shopName?.trim() || ''}
                          className="h-8.5 w-8.5 border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-extrabold leading-tight text-slate-900 truncate flex items-center gap-1">
                            <span className="truncate">{detail.shopName?.trim() || 'Shop Profile'}</span>
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          </h3>
                          <p className="text-[10px] font-semibold text-slate-500 truncate">
                            Owner: <span className="font-bold text-slate-800">{detail.shopOwner?.trim() || '—'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Address & Landmark Info */}
                      <div className="border-t border-slate-200/80 pt-2 space-y-1.5 text-xs">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#081F5C]" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Shop Address</p>
                            <p className="font-semibold text-slate-800 leading-snug text-[11px] line-clamp-2">
                              {displayShopAddress}
                            </p>
                          </div>
                        </div>

                        {detail.shopLandmark?.trim() ? (
                          <div className="flex items-start gap-1.5 pt-1 border-t border-slate-100">
                            <Landmark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Landmark</p>
                              <p className="font-semibold text-slate-800 leading-snug text-[11px] truncate">
                                {detail.shopLandmark.trim()}
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modern Bottom Bar with GPS & Navigation Controls */}
              <div className="relative overflow-hidden border-t border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-3 py-2.5 sm:px-3.5 sm:py-2.5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shadow-inner">
                <div className="pointer-events-none absolute -top-12 -right-12 size-36 rounded-full bg-indigo-600/20 blur-2xl" />

                <div className="relative z-10 flex items-center gap-2 min-w-0">
                  <div className="flex h-7 w-7 sm:h-6.5 sm:w-6.5 shrink-0 items-center justify-center rounded-none bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-white shadow-2xs">
                    <Navigation className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs sm:text-[11px] font-bold tracking-wide text-slate-200 block truncate">
                      {headerMapSecondaryPin
                        ? 'GPS Route active from your current location'
                        : 'Interactive Map & GPS Navigation'}
                    </span>
                    <span className="text-[10px] sm:text-[9.5px] text-slate-400 block truncate">
                      {headerMapSecondaryPin
                        ? 'Showing driving path to shop location'
                        : 'Pan or pinch-to-zoom to explore nearby areas'}
                    </span>
                  </div>
                </div>

                <div className="relative z-10 flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap xs:flex-nowrap">
                  {headerMapSecondaryPin ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-9 sm:h-7.5 flex-1 sm:flex-none rounded-none bg-white/10 hover:bg-white/20 px-3 text-xs sm:text-[10px] font-bold text-white transition-all border border-white/15"
                      onClick={clearMapUserLocation}
                    >
                      Clear route
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    size="sm"
                    className="h-9 sm:h-7.5 flex-1 sm:flex-none justify-center gap-1.5 rounded-none bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] hover:from-[#081F5C] hover:to-[#1d5ec4] text-white text-xs sm:text-[10px] font-bold uppercase tracking-wider shadow-md transition-all border border-blue-400/30"
                    disabled={mapLocationLoading}
                    onClick={captureMapUserLocation}
                  >
                    <Navigation
                      className={`h-3.5 w-3.5 shrink-0 ${mapLocationLoading ? 'animate-spin' : ''}`}
                      aria-hidden
                    />
                    <span className="truncate">
                      {mapLocationLoading
                        ? 'Locating…'
                        : headerMapSecondaryPin
                          ? 'Update GPS'
                          : 'Route from my location'}
                    </span>
                  </Button>

                  {googleMapsSearchUrl ? (
                    <a
                      href={googleMapsSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-9 sm:h-7.5 inline-flex items-center justify-center gap-1.5 rounded-none bg-white/10 hover:bg-white/20 px-3 text-xs sm:text-[10px] font-bold text-white transition-all border border-white/15 shrink-0"
                      title="Open in Google Maps application"
                    >
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      <span>Google Maps</span>
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            {/* 2. DUAL-COLUMN HERO SECTION: Left Shop Profile Card + Right Key Stats Rows Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
              {/* LEFT COLUMN: Shop Details Primary Card */}
              <div className="lg:col-span-8 flex flex-col justify-between rounded-none border border-slate-200 bg-white p-3.5 sm:p-5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] space-y-3.5 sm:space-y-4">
                <div className="space-y-3 sm:space-y-4">
                  {/* Badges Bar */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-1.5">
                    <Badge className={categoryBadgeClass(detail.category)}>{detail.category || 'General Repair'}</Badge>
                    {serviceTypeBadge(detail.type)}
                    <span className="inline-flex items-center gap-1 rounded-none border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs sm:text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Verified Shop Partner
                    </span>
                    <Badge
                      variant="outline"
                      className="rounded-none border border-slate-200 bg-slate-100/90 px-2 py-0.5 text-xs sm:text-[9px] font-bold uppercase tracking-wider text-[#081F5C]"
                    >
                      <CalendarCheck className="mr-1 h-3.5 w-3.5 text-[#081F5C]" aria-hidden />
                      {shopContext?.totalCompletedBookings != null
                        ? shopContext.totalCompletedBookings
                        : detail.completedJobs ?? 0}{' '}
                      bookings completed
                    </Badge>
                  </div>

                  {/* Title & Shop Owner Header */}
                  <div>
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-none bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-white shadow-2xs">
                        <Store className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-xl lg:text-2xl font-black uppercase tracking-wide text-slate-900 leading-snug break-words">
                          {detail.shopName?.trim() || 'Shop Profile'}
                        </h1>
                        <p className="text-xs sm:text-[11px] font-bold text-[#081F5C] mt-1 truncate">
                          Shop Owner:{' '}
                          <span className="text-slate-800">{detail.shopOwner?.trim() || 'Registered Provider'}</span>
                          {detail.shopOperatingHours?.trim() ? ` · Hours: ${detail.shopOperatingHours.trim()}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick specs grid */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-2.5 border-t border-b border-slate-100 py-2.5 sm:py-2.5 text-xs">
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">
                        Overall Rating
                      </p>
                      <p className="flex items-center gap-1 font-bold text-slate-900 mt-1 text-xs sm:text-xs truncate">
                        <Star className="h-3.5 w-3.5 sm:h-3 sm:w-3 fill-amber-300 text-amber-400 shrink-0" />
                        <span className="truncate">
                          {(() => {
                            const shopAvg = Number(shopContext?.shopAverageRating) || 0
                            const svc = Number(detail.shopRating) || 0
                            if (shopAvg > 0) return `${shopAvg.toFixed(1)} / 5.0`
                            if (svc > 0) return `${svc.toFixed(1)} / 5.0`
                            return 'Unrated'
                          })()}
                        </span>
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">
                        Active Services
                      </p>
                      <p className="font-bold text-slate-900 truncate mt-1 text-xs sm:text-xs">
                        {shopServices.length} Listing{shopServices.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">
                        Staff Team
                      </p>
                      <p className="font-bold text-slate-900 mt-1 text-xs sm:text-xs truncate">
                        {(detail.staff ?? []).length}{' '}
                        {noOfTechnicianMechanicLabel(detail.category).toLowerCase().replace('no. of ', '')}
                      </p>
                    </div>
                  </div>

                  {/* Assigned Staff Preview */}
                  <div>
                    <p className="text-[10.5px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Shop Technicians &amp; Mechanics
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {(detail.staff ?? []).length ? (
                        <>
                          <div className="inline-flex items-center gap-1">
                            {(detail.staff ?? []).slice(0, 6).map((name, idx) => (
                              <span
                                key={`${String(name)}-${idx}`}
                                title={String(name)}
                                className="inline-flex h-7 w-7 sm:h-7 sm:w-7 items-center justify-center rounded-none border border-white bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-[10px] font-bold text-white shadow-2xs ring-1 ring-black/5"
                              >
                                {initialsFromName(name)}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs sm:text-[11px] font-semibold text-slate-600">
                            {staffAssignedLabel(detail.category, (detail.staff ?? []).length)}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs sm:text-[11px] font-medium text-slate-500">
                          Operated and managed directly by shop owner.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Primary CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-3 sm:pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    aria-label="Message this shop"
                    className="h-11 sm:h-10 w-full sm:flex-1 gap-2 rounded-none bg-linear-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-4 sm:px-5 text-xs sm:text-xs font-bold uppercase tracking-wider text-white shadow-[0_2px_6px_rgba(8,31,92,0.4)] hover:shadow-[0_4px_10px_rgba(8,31,92,0.55)] hover:opacity-95 transition-all"
                    onClick={() => {
                      storeShopRecipientForMessages(detail)
                      window.location.hash = '#/customer/messages'
                    }}
                  >
                    <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                    <span>Message Shop</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Browse services at this shop"
                    className="h-11 sm:h-10 w-full sm:w-auto gap-2 rounded-none border border-slate-300 bg-white px-4 text-xs sm:text-xs font-bold uppercase tracking-wider text-[#081F5C] hover:bg-slate-100 hover:border-[#081F5C] transition-all shadow-2xs"
                    onClick={() => {
                      document.getElementById('customer-view-shop-services')?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      })
                    }}
                  >
                    <ChevronDown className="h-4 w-4 shrink-0 text-[#081F5C]" />
                    <span>Browse Services ({shopServices.length})</span>
                  </Button>
                </div>
              </div>

              {/* RIGHT COLUMN: Key Statistics Cards */}
              <div
                id="customer-shop-summary-table"
                className="lg:col-span-4 grid grid-cols-2 lg:flex lg:flex-col justify-between gap-2.5 sm:gap-2.5"
                role="region"
                aria-label="Shop key statistics"
              >
                {/* Card 1: Total Services */}
                <div className="relative flex-1 overflow-hidden rounded-none border border-blue-200/80 bg-linear-to-r from-blue-500/10 via-blue-50/50 to-white p-3 sm:p-3.5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-300 hover:border-[#081F5C] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)]">
                  <div className="flex items-center justify-between gap-2 sm:gap-2.5">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-none bg-[#081F5C] text-white shadow-2xs">
                        <Layers className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">
                          Total Services
                        </p>
                        <p className="text-xs sm:text-sm font-extrabold text-slate-900 tabular-nums truncate mt-0.5">
                          {shopContext?.activeServiceCount != null ? shopContext.activeServiceCount : shopServices.length}{' '}
                          Active
                        </p>
                      </div>
                    </div>
                    <span className="hidden sm:inline-flex shrink-0 rounded-none bg-blue-100/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#081F5C] border border-blue-300">
                      Catalog
                    </span>
                  </div>
                </div>

                {/* Card 2: Operating Hours */}
                <div className="relative flex-1 overflow-hidden rounded-none border border-emerald-200/80 bg-linear-to-r from-emerald-500/10 via-emerald-50/50 to-white p-3 sm:p-3.5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-300 hover:border-[#081F5C] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)]">
                  <div className="flex items-center justify-between gap-2 sm:gap-2.5">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-none bg-emerald-600 text-white shadow-2xs">
                        <Clock className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">
                          Operating Hours
                        </p>
                        <p
                          className="text-xs sm:text-xs font-bold text-slate-900 truncate mt-0.5"
                          title={detail.shopOperatingHours?.trim() || 'Mon - Sat'}
                        >
                          {detail.shopOperatingHours?.trim() ? detail.shopOperatingHours.trim() : 'Mon - Sat'}
                        </p>
                      </div>
                    </div>
                    <span className="hidden sm:inline-flex shrink-0 rounded-none bg-emerald-100/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-900 border border-emerald-300">
                      Schedule
                    </span>
                  </div>
                </div>

                {/* Card 3: Shop Rating */}
                <div className="relative flex-1 overflow-hidden rounded-none border border-amber-200/80 bg-linear-to-r from-amber-500/10 via-amber-50/50 to-white p-3 sm:p-3.5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-300 hover:border-[#081F5C] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)]">
                  <div className="flex items-center justify-between gap-2 sm:gap-2.5">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-none bg-amber-500 text-white shadow-2xs">
                        <Star className="h-4 w-4 sm:h-4.5 sm:w-4.5 fill-white text-white" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">
                          Shop Rating
                        </p>
                        <p className="text-xs sm:text-sm font-extrabold text-slate-900 tabular-nums truncate mt-0.5">
                          {(() => {
                            const shopAvg = Number(shopContext?.shopAverageRating) || 0
                            const svc = Number(detail.shopRating) || 0
                            if (shopAvg > 0) return `${shopAvg.toFixed(1)} / 5.0`
                            if (svc > 0) return `${svc.toFixed(1)} / 5.0`
                            return 'Unrated'
                          })()}
                        </p>
                      </div>
                    </div>
                    <span className="hidden sm:inline-flex shrink-0 rounded-none bg-amber-100/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-900 border border-amber-300">
                      Verified
                    </span>
                  </div>
                </div>

                {/* Card 4: Date Joined */}
                <div className="relative flex-1 overflow-hidden rounded-none border border-indigo-200/80 bg-linear-to-r from-indigo-500/10 via-indigo-50/50 to-white p-3 sm:p-3.5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-300 hover:border-[#081F5C] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)]">
                  <div className="flex items-center justify-between gap-2 sm:gap-2.5">
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <span className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-none bg-indigo-600 text-white shadow-2xs">
                        <CalendarDays className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">
                          Date Joined
                        </p>
                        <p className="text-xs sm:text-xs font-bold text-slate-900 truncate mt-0.5">
                          {formatShopOwnerJoinedAt(detail.shopOwnerJoinedAt)}
                        </p>
                      </div>
                    </div>
                    <span className="hidden sm:inline-flex shrink-0 rounded-none bg-indigo-100/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-indigo-900 border border-indigo-300">
                      Partner
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. FULL WIDTH SHOP ABOUT & REPAIR SPECIALIZATION CARD */}
            <div className="w-full rounded-none border border-slate-200 bg-white p-3.5 sm:p-5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] space-y-3.5 sm:space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Store className="h-4 w-4 text-[#081F5C]" /> About the Shop &amp; Repair Specialization
                </h2>
                {detail.businessType ? (
                  <span className="inline-flex items-center gap-1 rounded-none border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    <Building2 className="h-3 w-3 text-[#081F5C]" />
                    {detail.businessType}
                  </span>
                ) : null}
              </div>

              {/* Shop Description / Bio */}
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  {detail.shopDescription?.trim() ||
                    detail.description ||
                    `${detail.shopName?.trim() || 'This shop'} is a registered service provider specializing in professional diagnostic and repair services. Book standard in-shop visits or home service appointments with experienced technicians.`}
                </p>
              </div>

              {/* Repair Services & Specializations Offered from shopInfo */}
              {Array.isArray(detail.repairServicesOffered) && detail.repairServicesOffered.length > 0 ? (
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <p className="text-[10.5px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-[#081F5C]" />
                    Repair Services &amp; Specializations Offered
                  </p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {detail.repairServicesOffered.map((specialty, sIdx) => (
                      <span
                        key={`specialty-${sIdx}`}
                        className="inline-flex items-center gap-1.5 rounded-none border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 text-xs sm:text-[11px] font-bold text-indigo-950 shadow-2xs"
                      >
                        <CheckCircle2 className="h-3 w-3 text-indigo-600 shrink-0" />
                        <span>{specialty}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Operational & Business Profile Grid (from shopInfo) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-2 border-t border-slate-100">
                {/* 1. Experience / Years */}
                <div className="bg-slate-50 p-2.5 sm:p-3 border border-slate-200 space-y-1">
                  <p className="text-[10px] sm:text-[9.5px] font-bold uppercase tracking-wider text-slate-400 truncate">
                    Experience
                  </p>
                  <p className="text-xs sm:text-xs font-bold text-slate-900 truncate">
                    {detail.yearsOfOperation != null && Number(detail.yearsOfOperation) > 0
                      ? `${detail.yearsOfOperation} Year${Number(detail.yearsOfOperation) === 1 ? '' : 's'} in Operation`
                      : 'Verified Provider'}
                  </p>
                </div>

                {/* 2. Service Scope / Mode */}
                <div className="bg-slate-50 p-2.5 sm:p-3 border border-slate-200 space-y-1">
                  <p className="text-[10px] sm:text-[9.5px] font-bold uppercase tracking-wider text-slate-400 truncate">
                    Service Scope
                  </p>
                  <p className="text-xs sm:text-xs font-bold text-slate-900 truncate">
                    {SERVICE_TYPES.find((x) => x.value === detail.type)?.label ||
                      (detail.serviceType ? String(detail.serviceType) : 'Shop Visit & Home Service')}
                  </p>
                </div>

                {/* 3. Days of Operation */}
                <div className="bg-slate-50 p-2.5 sm:p-3 border border-slate-200 space-y-1">
                  <p className="text-[10px] sm:text-[9.5px] font-bold uppercase tracking-wider text-slate-400 truncate">
                    Working Days
                  </p>
                  <p
                    className="text-xs sm:text-xs font-bold text-slate-900 truncate"
                    title={
                      Array.isArray(detail.daysOfOperation) && detail.daysOfOperation.length > 0
                        ? detail.daysOfOperation.join(', ')
                        : 'Monday - Saturday'
                    }
                  >
                    {Array.isArray(detail.daysOfOperation) && detail.daysOfOperation.length > 0
                      ? detail.daysOfOperation.length === 7
                        ? 'All Week (Mon - Sun)'
                        : detail.daysOfOperation.length >= 5 &&
                            detail.daysOfOperation.includes('Monday') &&
                            detail.daysOfOperation.includes('Friday')
                          ? `Mon - ${detail.daysOfOperation.includes('Sunday') ? 'Sun' : detail.daysOfOperation.includes('Saturday') ? 'Sat' : 'Fri'}`
                          : detail.daysOfOperation.join(', ')
                      : 'Mon - Sat'}
                  </p>
                </div>

                {/* 4. Operating Hours */}
                <div className="bg-slate-50 p-2.5 sm:p-3 border border-slate-200 space-y-1">
                  <p className="text-[10px] sm:text-[9.5px] font-bold uppercase tracking-wider text-slate-400 truncate">
                    Hours
                  </p>
                  <p
                    className="text-xs sm:text-xs font-bold text-slate-900 truncate"
                    title={detail.shopOperatingHours?.trim() || 'Standard Hours'}
                  >
                    {detail.shopOperatingHours?.trim() ? detail.shopOperatingHours.trim() : '08:00 AM - 05:00 PM'}
                  </p>
                </div>
              </div>

              {detail && shouldShowProviderNote(detail.requirements) ? (
                <div className="mt-2 rounded-none border border-amber-300 bg-amber-50 p-3 sm:p-3 text-xs sm:text-xs text-amber-900 font-medium">
                  <span className="font-bold uppercase tracking-wider text-amber-950">Shop Policies &amp; Note: </span>
                  {String(detail.requirements).trim()}
                </div>
              ) : null}
            </div>

            {/* 4. SHOP SERVICES CATALOG SECTION */}
            <section
              id="customer-view-shop-services"
              className="space-y-3.5 sm:space-y-4 scroll-mt-20 border-t border-slate-200 pt-3"
            >
              {/* Header Title and Filters Bar */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div>
                    <h2 className="flex items-center gap-2 text-base sm:text-lg font-black uppercase tracking-wide text-slate-900">
                      <Layers className="h-5 w-5 text-[#081F5C]" /> Services Offered by this Shop
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      {shopServices.length === 0
                        ? 'No active services listed from this shop yet.'
                        : `Showing ${filteredShopServices.length} of ${shopServices.length} active service${shopServices.length === 1 ? '' : 's'}`}
                      {shopContext?.totalCompletedBookings != null && shopServices.length > 0
                        ? ` · ${shopContext.totalCompletedBookings} verified completed booking${shopContext.totalCompletedBookings === 1 ? '' : 's'}`
                        : ''}
                    </p>
                  </div>
                </div>

                {/* Filter & Search Bar */}
                {shopServices.length > 0 ? (
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 w-full">
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 flex-1 min-w-0">
                      <div className="relative flex-1 sm:flex-initial sm:min-w-[150px]">
                        <select
                          className={`${selectShell} ${categoryFilter === '__' ? 'text-slate-400' : 'text-slate-900'}`}
                          value={categoryFilter}
                          onChange={(e) => setCategoryFilter(e.target.value)}
                          aria-label="Filter by category"
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
                        <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      </div>

                      <div className="relative flex-1 sm:flex-initial sm:min-w-[150px]">
                        <select
                          className={`${selectShell} ${serviceTypeFilter === '__' ? 'text-slate-400' : 'text-slate-900'}`}
                          value={serviceTypeFilter}
                          onChange={(e) => setServiceTypeFilter(e.target.value)}
                          aria-label="Filter by service type"
                        >
                          <option value="__" disabled hidden>
                            Service Mode
                          </option>
                          <option value="">All Modes</option>
                          {SERVICE_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <Home className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      </div>

                      <div className="relative flex-1 sm:flex-initial sm:min-w-[160px]">
                        <select
                          className={selectShell}
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value)}
                          aria-label="Sort listings"
                        >
                          <option value="rating">Sort: Top rated</option>
                          <option value="jobs">Sort: Most jobs completed</option>
                          <option value="price-low">Sort: Lowest price first</option>
                        </select>
                        <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    <div className="relative w-full lg:max-w-xs shrink-0">
                      <Input
                        className="h-9 w-full rounded-none border border-slate-200 bg-white pr-10 pl-3 text-xs sm:text-sm font-medium shadow-[0_2px_5px_rgba(15,23,42,0.1)] outline-none focus-visible:ring-1 focus-visible:ring-[#081F5C] focus-visible:border-[#081F5C]"
                        placeholder="Search services..."
                        value={listQuery}
                        onChange={(e) => setListQuery(e.target.value)}
                        aria-label="Search services from this shop"
                      />
                      <Button
                        type="button"
                        size="icon-sm"
                        className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-none bg-linear-to-r from-[#04133d] to-[#081F5C] p-0 text-white shadow-2xs hover:opacity-95"
                        aria-label="Search"
                        tabIndex={-1}
                      >
                        <Search className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Service Cards Grid */}
              {shopServices.length === 0 ? (
                <div className="flex min-h-[140px] flex-col items-center justify-center rounded-none border border-dashed border-slate-300 bg-white p-6 text-center shadow-[0_3px_8px_rgba(15,23,42,0.14)]">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700">No Services Listed Yet</p>
                  <p className="mt-1 text-xs text-slate-500">
                    This shop has not published any active repair services yet.
                  </p>
                </div>
              ) : filteredShopServices.length === 0 ? (
                <div className="flex min-h-[140px] flex-col items-center justify-center rounded-none border border-dashed border-slate-300 bg-white p-6 text-center shadow-[0_3px_8px_rgba(15,23,42,0.14)]">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700">No Matching Services</p>
                  <p className="mt-1 text-xs text-slate-500">Try adjusting your category filter, mode, or search keywords.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 rounded-none text-xs font-bold uppercase tracking-wider border-slate-300"
                    onClick={() => {
                      setListQuery('')
                      setCategoryFilter('__')
                      setServiceTypeFilter('__')
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3.5 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
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

            {/* 5. TWO-COLUMN GRID: BOOKING PROCESS GUIDE (LEFT) + INQUIRIES & DIRECT CHAT (RIGHT) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 items-stretch">
              {/* How Booking Works Checklist Card */}
              <div className="rounded-none border border-slate-200 bg-white p-3.5 sm:p-5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] space-y-3 sm:space-y-3 flex flex-col justify-between">
                <h3 className="text-xs sm:text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> How to Book Services at this Shop
                </h3>
                <ol className="space-y-2.5 sm:space-y-2.5 text-xs font-medium text-slate-700 flex-1">
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 sm:h-4.5 sm:w-4.5 shrink-0 items-center justify-center bg-[#081F5C] text-[10px] sm:text-[9px] font-bold text-white">
                      1
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 text-xs sm:text-xs">Browse &amp; Select Service</p>
                      <p className="text-xs sm:text-[11px] text-slate-500 leading-snug mt-0.5">
                        Pick a service listing above and click "Book Service" to get started.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 sm:h-4.5 sm:w-4.5 shrink-0 items-center justify-center bg-[#081F5C] text-[10px] sm:text-[9px] font-bold text-white">
                      2
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 text-xs sm:text-xs">Choose Preferred Schedule</p>
                      <p className="text-xs sm:text-[11px] text-slate-500 leading-snug mt-0.5">
                        Select date, time, and service location (in-shop visit or home service).
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 sm:h-4.5 sm:w-4.5 shrink-0 items-center justify-center bg-[#081F5C] text-[10px] sm:text-[9px] font-bold text-white">
                      3
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 text-xs sm:text-xs">Fast Provider Confirmation</p>
                      <p className="text-xs sm:text-[11px] text-slate-500 leading-snug mt-0.5">
                        The shop will review and accept your booking request with real-time status updates.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="flex h-5 w-5 sm:h-4.5 sm:w-4.5 shrink-0 items-center justify-center bg-[#081F5C] text-[10px] sm:text-[9px] font-bold text-white">
                      4
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 text-xs sm:text-xs">Professional Repair &amp; Handoff</p>
                      <p className="text-xs sm:text-[11px] text-slate-500 leading-snug mt-0.5">
                        Expert repair by assigned technicians/mechanics with proof of completed work.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>

              {/* Direct Inquiry Card */}
              <div className="rounded-none border border-slate-200 bg-white p-3.5 sm:p-5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] space-y-3 sm:space-y-3 text-center flex flex-col justify-center items-center">
                <div className="flex h-10 w-10 sm:h-10 sm:w-10 items-center justify-center bg-[#081F5C]/10 text-[#081F5C]">
                  <MessageCircle className="h-5 w-5 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">
                    Have custom inquiries or quotes?
                  </p>
                  <p className="text-xs sm:text-[11px] font-medium text-slate-500 leading-relaxed max-w-sm mt-1">
                    Directly message <span className="font-bold text-slate-800">{detail.shopName?.trim() || 'the shop'}</span>{' '}
                    to discuss parts availability, diagnostic questions, or schedule arrangements.
                  </p>
                </div>
                <Button
                  type="button"
                  className="w-full sm:max-w-xs h-11 sm:h-9.5 rounded-none bg-linear-to-r from-[#04133d] to-[#081F5C] text-xs font-bold uppercase tracking-wider text-white shadow-[0_2px_6px_rgba(8,31,92,0.4)] hover:shadow-[0_4px_10px_rgba(8,31,92,0.55)] transition-all"
                  onClick={() => {
                    storeShopRecipientForMessages(detail)
                    window.location.hash = '#/customer/messages'
                  }}
                >
                  <MessageCircle className="mr-1.5 h-4 w-4" /> Message Shop Now
                </Button>
              </div>
            </div>

            {/* 6. FULL WIDTH COMPLETED WORKS SHOWCASE */}
            <section aria-labelledby="view-shop-completed-works-heading" className="w-full space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                <div className="min-w-0 flex-1">
                  <h2
                    id="view-shop-completed-works-heading"
                    className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900"
                  >
                    <ClipboardList className="h-4 w-4 text-[#081F5C] shrink-0" aria-hidden />
                    <span className="truncate">Completed Works Showcase</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
                    Sample verified finished repair jobs
                  </p>
                </div>

                {/* Left & Right Smooth Slide Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    aria-label="Previous work"
                    title="Previous"
                    disabled={!completedWorksCanScrollLeft}
                    onClick={() => scrollCompletedWorks('left')}
                    className="flex h-8 w-8 items-center justify-center rounded-none border border-slate-300 bg-white text-slate-700 hover:bg-[#081F5C] hover:text-white hover:border-[#081F5C] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next work"
                    title="Next"
                    disabled={!completedWorksCanScrollRight}
                    onClick={() => scrollCompletedWorks('right')}
                    className="flex h-8 w-8 items-center justify-center rounded-none border border-slate-300 bg-white text-slate-700 hover:bg-[#081F5C] hover:text-white hover:border-[#081F5C] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Touch-pan and snap-smooth horizontal scroll area */}
              <div
                ref={completedWorksScrollRef}
                className="flex flex-nowrap gap-3 sm:gap-3.5 overflow-x-auto overscroll-x-contain pb-3 pt-1 scroll-smooth snap-x snap-mandatory touch-pan-x [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="list"
                aria-label="Completed work entries"
              >
                {MOCK_COMPLETED_WORKS.map((job) => {
                  const { time, date } = formatCompletedWorkDateTime(job.completedAt)
                  return (
                    <article
                      key={job.id}
                      role="listitem"
                      className="w-[82vw] max-w-[290px] xs:w-[300px] sm:w-[340px] sm:max-w-none shrink-0 snap-start rounded-none border border-slate-200 bg-white p-3.5 sm:p-4 shadow-[0_3px_8px_rgba(15,23,42,0.12)] transition-all duration-200 hover:border-[#081F5C] hover:shadow-[0_6px_16px_rgba(8,31,92,0.18)] flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-none bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-bold text-white shadow-2xs"
                            aria-hidden
                          >
                            {initialsFromName(job.customerName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-slate-900">{job.customerName}</p>
                            <p className="text-[10.5px] sm:text-xs font-medium text-slate-500">Verified Customer</p>
                          </div>
                        </div>

                        <div className="mt-2.5 border-t border-slate-100 pt-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Work completed
                          </p>
                          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-800 line-clamp-3 sm:line-clamp-none">
                            {job.whatWasFixed}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs tabular-nums">
                        <span className="shrink-0 font-bold text-[#081F5C]">{time}</span>
                        <span className="min-w-0 text-right font-semibold text-slate-500">{date}</span>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            {/* 7. BOTTOM FULL WIDTH: CUSTOMER REVIEWS & RATINGS SECTION */}
            <section aria-labelledby="view-shop-service-reviews-heading" className="w-full space-y-2.5 sm:space-y-2.5">
              <div className="w-full rounded-none border border-slate-200 bg-white p-3.5 sm:p-5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] space-y-3 sm:space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 sm:pb-3">
                  <h2
                    id="view-shop-service-reviews-heading"
                    className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900"
                  >
                    <Star className="h-4 w-4 fill-amber-300 text-amber-400" aria-hidden />
                    Customer Reviews &amp; Ratings
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.hash = '#/customer/reviews-ratings'
                    }}
                    className="text-xs sm:text-[11px] font-bold uppercase tracking-wider text-[#081F5C] hover:underline"
                  >
                    View all ›
                  </button>
                </div>

                {/* Overall Rating Score Header */}
                <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 sm:p-3.5 border border-slate-200">
                  <div className="text-3xl sm:text-3xl font-black text-slate-900 tabular-nums">
                    {hasServiceRatings ? serviceRatingAverage.toFixed(1) : '0.0'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1" aria-hidden>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 sm:h-4 sm:w-4 ${
                            i < Math.floor(hasServiceRatings ? serviceRatingAverage : 0)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs sm:text-[11px] font-semibold text-slate-600">
                      Based on {serviceRatingCount} customer review{serviceRatingCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                {/* Filters Bar */}
                {serviceReviewsList.length > 0 ? (
                  <div className="flex flex-nowrap overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap gap-1.5 sm:gap-1.5 pt-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <button
                      type="button"
                      onClick={() => setServiceReviewFilter('all')}
                      className={`shrink-0 whitespace-nowrap px-3 sm:px-2.5 py-1.5 sm:py-1 text-xs sm:text-[11px] font-bold uppercase tracking-wider rounded-none transition-all ${
                        serviceReviewFilter === 'all'
                          ? 'border border-[#081F5C] bg-[#081F5C] text-white shadow-2xs'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-[#081F5C] hover:bg-slate-50'
                      }`}
                    >
                      All ({serviceRatingCount})
                    </button>
                    {[5, 4, 3, 2, 1].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setServiceReviewFilter(String(star))}
                        className={`shrink-0 whitespace-nowrap px-3 sm:px-2.5 py-1.5 sm:py-1 text-xs sm:text-[11px] font-bold uppercase tracking-wider rounded-none transition-all ${
                          serviceReviewFilter === String(star)
                            ? 'border border-[#081F5C] bg-[#081F5C] text-white shadow-2xs'
                            : 'border border-slate-200 bg-white text-slate-700 hover:border-[#081F5C] hover:bg-slate-50'
                        }`}
                      >
                        {star} ★ ({serviceReviewStats.stars[star] || 0})
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setServiceReviewFilter('comments')}
                      className={`shrink-0 whitespace-nowrap px-3 sm:px-2.5 py-1.5 sm:py-1 text-xs sm:text-[11px] font-bold uppercase tracking-wider rounded-none transition-all ${
                        serviceReviewFilter === 'comments'
                          ? 'border border-[#081F5C] bg-[#081F5C] text-white shadow-2xs'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-[#081F5C] hover:bg-slate-50'
                      }`}
                    >
                      With comments ({serviceReviewStats.withComments})
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceReviewFilter('media')}
                      className={`shrink-0 whitespace-nowrap px-3 sm:px-2.5 py-1.5 sm:py-1 text-xs sm:text-[11px] font-bold uppercase tracking-wider rounded-none transition-all ${
                        serviceReviewFilter === 'media'
                          ? 'border border-[#081F5C] bg-[#081F5C] text-white shadow-2xs'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-[#081F5C] hover:bg-slate-50'
                      }`}
                    >
                      With photos ({serviceReviewStats.withMedia})
                    </button>
                  </div>
                ) : null}

                {/* Review Cards List */}
                <div className="border-t border-slate-100 pt-3">
                  {filteredServiceReviews.length > 0 ? (
                    <ul className="divide-y divide-slate-100">
                      {filteredServiceReviews.map((review) => {
                        const normalizedRating = Math.max(0, Math.min(5, Math.round(reviewRatingValue(review))))
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
                          <li key={review.id} className="flex gap-3 sm:gap-3 py-3.5 sm:py-3.5 first:pt-0">
                            <div
                              className="flex h-8 w-8 sm:h-8.5 sm:w-8.5 shrink-0 items-center justify-center rounded-none bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-bold text-white shadow-2xs"
                              aria-hidden
                            >
                              {initialsFromName(displayName)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1 xs:gap-2">
                                <p className="text-xs sm:text-xs font-bold text-slate-900 truncate">{displayName}</p>
                                <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 shrink-0">
                                  {dateStr}
                                </span>
                              </div>
                              <div
                                className="mt-1 flex items-center gap-0.5"
                                aria-label={`${normalizedRating} out of 5 stars`}
                              >
                                {[0, 1, 2, 3, 4].map((i) => (
                                  <Star
                                    key={i}
                                    className={`h-3.5 w-3.5 ${
                                      i < normalizedRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              {typeof review.comment === 'string' && review.comment.trim().length > 0 ? (
                                <p className="mt-1.5 text-xs sm:text-xs font-medium leading-relaxed text-slate-700">
                                  {review.comment}
                                </p>
                              ) : null}
                              {Array.isArray(review.images) && review.images.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {review.images.map((imgUrl, imgIdx) => (
                                    <div
                                      key={imgIdx}
                                      className="h-12 w-12 sm:h-14 sm:w-14 overflow-hidden rounded-none border border-[#081F5C] bg-slate-100 shadow-2xs"
                                    >
                                      <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                              {typeof review.shopResponse === 'string' && review.shopResponse.trim().length > 0 ? (
                                <div className="mt-2 rounded-none border border-slate-200 bg-slate-50 p-2.5">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#081F5C]">
                                    Shop Response
                                  </p>
                                  <p className="mt-1 text-xs text-slate-700">{review.shopResponse.trim()}</p>
                                </div>
                              ) : null}
                              <div className="mt-2">
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900 transition-colors"
                                >
                                  <ThumbsUp className="h-3 w-3" /> Helpful
                                </button>
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-500 font-medium">
                      No customer reviews yet for this shop.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </main>
    </CustomerLayout>
  )
}
