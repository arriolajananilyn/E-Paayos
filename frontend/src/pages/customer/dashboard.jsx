import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar'
import { NativeSelect, NativeSelectOption } from '../../components/ui/native-select'
import {
  ArrowRight,
  Award,
  BadgeCheck,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Clock3,
  Headphones,
  MapPin,
  MessageSquare,
  Package,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Truck,
  Tv,
  Wrench,
} from 'lucide-react'
import vehiclesBanner from '../../assets/vehicles.png'
import applianceBanner from '../../assets/applience.png'
import gadgetsBanner from '../../assets/gadgets.png'
import CustomerLayout, { readCustomerUserSession } from '../../layout/customerlayout.jsx'
import { CatalogServiceCard } from './findServices.jsx'
import { formatReadableShopAddress } from '../../lib/psgcResolve'
import { cn } from '../../lib/utils'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function mapBookingFromApi(row) {
  if (!row || !row.id) return null
  return {
    id: String(row.id),
    ref: String(row.ref || ''),
    serviceName: row.serviceName || 'Service',
    shopName: row.shopName || 'Shop',
    status: String(row.status || 'pending').toLowerCase(),
    date: row.date || '',
    preferredTime: row.preferredTime || '',
  }
}

function formatDateShort(ymd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd || ''))) return ymd || '—'
  const d = new Date(`${ymd}T12:00:00`)
  if (Number.isNaN(d.getTime())) return ymd
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function initialsFromShopName(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return `${first}${second}`.toUpperCase()
}

function resolveCatalogShopPhotoUrl(raw) {
  if (!raw || typeof raw !== 'string') return ''
  const s = raw.trim()
  if (!s) return ''
  if (s.startsWith('data:') || s.startsWith('http://') || s.startsWith('https://')) return s
  if (s.startsWith('/uploads/')) return `${API_URL}${s}`
  return s
}

function resolveShopPhotoUrl(shop) {
  return (
    resolveCatalogShopPhotoUrl(shop?.shopPlacePhoto) ||
    resolveCatalogShopPhotoUrl(shop?.shopOwnerProfileImage) ||
    resolveCatalogShopPhotoUrl(shop?.shopOwnerSelfieImage) ||
    ''
  )
}

function categoryBannerImage(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return vehiclesBanner
  if (normalized === 'appliance') return applianceBanner
  if (normalized === 'gadget') return gadgetsBanner
  return ''
}

function categoryBadgeClass(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return 'bg-linear-to-r from-sky-600 to-blue-700 text-white'
  if (normalized === 'gadget') return 'bg-linear-to-r from-violet-600 to-fuchsia-600 text-white'
  if (normalized === 'appliance') return 'bg-linear-to-r from-emerald-600 to-teal-600 text-white'
  if (normalized === 'others') return 'bg-linear-to-r from-amber-600 to-orange-600 text-white'
  return 'bg-linear-to-r from-slate-600 to-slate-800 text-white'
}

function navigateHash(path) {
  if (!path) return
  if (path.startsWith('#')) {
    window.location.hash = path
  } else if (path.startsWith('/')) {
    window.location.hash = `#${path}`
  } else {
    window.location.hash = `#/${path}`
  }
}

function ImageWithFallback({ src, alt, className = '', fallbackSrc = vehiclesBanner, ...props }) {
  const [error, setError] = useState(false)
  const displaySrc = error || !src ? fallbackSrc : src

  return (
    <img
      src={displaySrc}
      alt={alt || ''}
      className={className}
      onError={() => setError(true)}
      {...props}
    />
  )
}

function ShopProfileAvatar({ shop, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false)
  const photoUrl = resolveShopPhotoUrl(shop)
  const canShowImage = Boolean(photoUrl) && !imageFailed

  return (
    <div
      className={cn(
        'relative h-9 w-9 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-none border-2 border-white bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] shadow-2xs ring-1 ring-[#081F5C]/15',
        className,
      )}
    >
      {canShowImage ? (
        <img
          src={photoUrl}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] sm:text-xs font-bold text-white">
          {initialsFromShopName(shop?.shopName)}
        </span>
      )}
    </div>
  )
}

function FeaturedShopCardSkeleton() {
  return (
    <div className="w-[185px] sm:w-[230px] max-w-[185px] sm:max-w-[230px] shrink-0 animate-pulse overflow-hidden rounded-none border border-slate-200 bg-white shadow-[0_3px_8px_rgba(15,23,42,0.14)]">
      <div className="h-32 sm:h-44 w-full bg-slate-200" />
      <div className="w-full min-w-0 px-2.5 sm:px-3 pb-3 sm:pb-3.5">
        <div className="-mt-5 sm:-mt-6 flex items-end gap-2">
          <div className="h-9 w-9 sm:h-11 sm:w-11 shrink-0 rounded-none bg-slate-300 ring-2 ring-white" />
          <div className="min-w-0 flex-1 space-y-1.5 pb-0.5">
            <div className="h-3 w-full rounded-none bg-slate-200" />
          </div>
        </div>
        <div className="mt-2 h-2 w-full rounded-none bg-slate-100" />
        <div className="mt-2 space-y-1">
          <div className="h-2 w-3/4 rounded-none bg-slate-100" />
          <div className="h-2 w-1/2 rounded-none bg-slate-100" />
        </div>
      </div>
    </div>
  )
}

function FeaturedShopCard({ shop, readableShopAddress }) {
  const [coverFailed, setCoverFailed] = useState(false)
  const photoUrl = resolveShopPhotoUrl(shop)
  const coverUrl = photoUrl && !coverFailed ? photoUrl : categoryBannerImage(shop.category)
  const ratingNum = Number(shop.shopRating || 0)
  const ratingLabel = Number.isFinite(ratingNum) ? ratingNum.toFixed(1) : '—'
  const isOnCall =
    shop.shopOwnerRole === 'oncall-mechanic-technician' ||
    shop.shopOwnerRole === 'independent-mechanic-technician'
  const addressDisplay = readableShopAddress || shop.shopAddress || '—'

  const go = () => {
    navigateHash(`#/customer/shop/${encodeURIComponent(shop.id)}`)
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          go()
        }
      }}
      className="group w-[185px] sm:w-[230px] max-w-[185px] sm:max-w-[230px] shrink-0 cursor-pointer overflow-hidden rounded-none border border-slate-200 bg-white shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-300 hover:border-[#081F5C] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#081F5C]"
    >
      <div className="relative h-32 sm:h-44 w-full overflow-hidden bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6]">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Store className="h-8 w-8 sm:h-10 sm:w-10 text-white/35" aria-hidden />
          </div>
        )}

        <div
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#04133d]/80 via-[#081F5C]/15 to-transparent"
          aria-hidden
        />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-1 p-2 sm:p-2.5">
          <Badge
            className={`shrink-0 rounded-none border-0 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider ${categoryBadgeClass(
              shop.category,
            )}`}
          >
            {shop.category}
          </Badge>
          <div
            className="flex shrink-0 items-center gap-0.5 sm:gap-1 rounded-none border border-white/30 bg-black/40 px-1.5 sm:px-2 py-0.5 backdrop-blur-sm"
            aria-label={`Rating ${ratingLabel} out of 5`}
          >
            <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 fill-amber-300 text-amber-200" />
            <span className="text-[10px] sm:text-[11px] font-bold leading-none text-white tabular-nums">
              {ratingLabel}
            </span>
          </div>
        </div>

        <Badge
          className={`absolute bottom-2 left-2 sm:bottom-2.5 sm:left-2.5 rounded-none px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider shadow-2xs backdrop-blur-sm ${
            isOnCall
              ? 'border border-violet-400/40 bg-violet-600/95 text-white'
              : 'border border-sky-400/40 bg-[#081F5C]/95 text-white'
          }`}
        >
          {isOnCall ? 'On-call' : 'Shop'}
        </Badge>
      </div>

      <div className="w-full min-w-0 px-2.5 sm:px-3 pb-3 sm:pb-3.5">
        <div className="-mt-5 sm:-mt-6 flex items-end gap-1.5 sm:gap-2">
          <ShopProfileAvatar shop={shop} className="h-9 w-9 sm:h-11 sm:w-11" />
          <div className="min-w-0 flex-1 pb-0.5">
            <h3
              title={shop.shopName}
              className="line-clamp-2 text-xs sm:text-[13px] font-bold leading-tight sm:leading-snug text-slate-900 uppercase tracking-wide"
            >
              {shop.shopName}
            </h3>
          </div>
        </div>

        <p
          title={addressDisplay}
          className="mt-2 sm:mt-2.5 flex min-w-0 items-start gap-1 text-[10px] sm:text-[11px] leading-tight sm:leading-snug text-slate-600"
        >
          <MapPin className="mt-0.5 h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0 text-[#081F5C]" aria-hidden />
          <span className="min-w-0 line-clamp-2 break-words font-medium">{addressDisplay}</span>
        </p>

        <div className="mt-2 sm:mt-2.5 flex items-center justify-between gap-1 border-t border-slate-100 pt-1.5 sm:pt-2">
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-600 truncate">
            <span className="font-bold text-slate-900 tabular-nums">{shop.completedJobs}</span> jobs
          </span>
          <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#081F5C] transition-colors group-hover:text-[#1447a6]">
            View
            <ChevronRight
              className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </div>
      </div>
    </article>
  )
}

const NAVY_BLUE_GRADIENT = 'from-[#04133d]/95 via-[#081F5C]/85 to-[#04133d]/70'

const HERO_SLIDES = [
  {
    badge: '⚡ E-PAAYOS EMERGENCY REPAIR',
    title: 'Fast & Verified Repair Services Direct Near You',
    description:
      'Connect with top-rated mechanics, electricians, and technicians across Vehicle, Appliance, and Gadget repairs.',
    perks: ['100% Verified Specialists', 'Upfront Transparent Pricing', 'On-Call & Home Service'],
    primaryCtaText: 'Book a Repair Now',
    primaryCtaLink: '#/customer/find-services',
    bgGradient: NAVY_BLUE_GRADIENT,
    imageUrl: vehiclesBanner,
  },
  {
    badge: '🚗 ON-CALL VEHICLE MECHANICS',
    title: 'Emergency Auto & Motorcycle Repair Support',
    description:
      'Roadside assistance, engine diagnostics, oil changes, brake service, and electrical repair from expert mechanics.',
    perks: ['Roadside Assistance', 'Certified Auto Techs', 'Quick Response Time'],
    primaryCtaText: 'Browse Vehicle Repair',
    primaryCtaLink: '#/customer/find-services?category=Vehicle',
    bgGradient: NAVY_BLUE_GRADIENT,
    imageUrl: vehiclesBanner,
  },
  {
    badge: '❄️ APPLIANCE & HOME CARE',
    title: 'Home Appliance Techs & Aircon Service',
    description:
      'Aircon cleaning & freon recharge, refrigerator repair, washing machine servicing, and home electronics.',
    perks: ['Same-Day Home Visits', 'Genuine Replacement Parts', 'Service Warranty'],
    primaryCtaText: 'Browse Appliance Techs',
    primaryCtaLink: '#/customer/find-services?category=Appliance',
    bgGradient: NAVY_BLUE_GRADIENT,
    imageUrl: applianceBanner,
  },
  {
    badge: '📱 GADGETS & IT REPAIR',
    title: 'Smartphones, Laptops & Electronics Care',
    description:
      'LCD screen replacement, battery upgrades, motherboard troubleshooting, and software recovery.',
    perks: ['Diagnostic Testing', 'Express Repair Turnaround', 'Data Safety Assured'],
    primaryCtaText: 'Browse Gadget Techs',
    primaryCtaLink: '#/customer/find-services?category=Gadget',
    bgGradient: NAVY_BLUE_GRADIENT,
    imageUrl: gadgetsBanner,
  },
]

const REPAIR_CATEGORIES = [
  { id: 'all', name: 'All Categories', count: '100+ Services', icon: Wrench, value: 'All' },
  { id: 'vehicle', name: 'Vehicle Repair', count: 'Auto & Motorcycle', icon: Car, value: 'Vehicle' },
  { id: 'appliance', name: 'Appliance Repair', count: 'Home & Aircon', icon: Tv, value: 'Appliance' },
  { id: 'gadget', name: 'Gadget Repair', count: 'Phones & Laptops', icon: Smartphone, value: 'Gadget' },
]

const TESTIMONIALS = [
  {
    id: '1',
    name: 'Roberto Santos',
    rating: 5,
    comment:
      'The on-call mechanic arrived within 25 minutes when my car stalled along Commonwealth. Super fast & professional service!',
    purchasedItem: 'Vehicle Roadside Service',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  },
  {
    id: '2',
    name: 'Maria Clara Cruz',
    rating: 5,
    comment:
      'Booked aircon cleaning and freon recharge. Technician was polite, thorough, and left my unit cold as new. Highly recommended!',
    purchasedItem: 'Appliance Maintenance',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
  },
  {
    id: '3',
    name: 'John Paul Mendoza',
    rating: 5,
    comment:
      'Had my laptop battery and SSD upgraded. Very transparent pricing with fast turnaround. E-Paayos is my go-to for repair needs.',
    purchasedItem: 'Gadget Repair & Upgrade',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  },
]

function CustomerDashboard() {
  const [user, setUser] = useState(readCustomerUserSession)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [catalogServices, setCatalogServices] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const searchQuery = ''
  const [readableShopAddresses, setReadableShopAddresses] = useState({})
  const [shopAddressesResolving, setShopAddressesResolving] = useState(false)
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All')
  const [activeTab, setActiveTab] = useState('all')

  const currentHero = HERO_SLIDES[currentSlideIndex]

  // Auto carousel slide timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  const loadBookings = useCallback(async () => {
    setLoading(true)
    setListError('')
    try {
      const res = await fetch(`${API_URL}/api/catalog/bookings`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Could not load dashboard data.')
      const rows = Array.isArray(data?.bookings) ? data.bookings : []
      setBookings(rows.map(mapBookingFromApi).filter(Boolean))
    } catch (e) {
      setBookings([])
      setListError(e?.message || 'Could not load dashboard data.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true)
    setCatalogError('')
    try {
      const res = await fetch(`${API_URL}/api/catalog/shop-services`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Could not load services.')
      setCatalogServices(Array.isArray(data) ? data : [])
    } catch (e) {
      setCatalogServices([])
      setCatalogError(e?.message || 'Could not load services.')
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    void loadBookings()
  }, [user, loadBookings])

  useEffect(() => {
    if (!user) return
    void loadCatalog()
  }, [user, loadCatalog])

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

  const stats = useMemo(() => {
    const total = bookings.length
    const pending = bookings.filter((b) => b.status === 'pending').length
    const active = bookings.filter((b) => b.status === 'confirmed' || b.status === 'working').length
    const completed = bookings.filter((b) => b.status === 'completed').length
    const cancelled = bookings.filter((b) => b.status === 'cancelled' || b.status === 'canceled').length
    return { total, pending, active, completed, cancelled }
  }, [bookings])

  const activeBooking = useMemo(() => {
    return (
      bookings.find((b) => b.status === 'confirmed' || b.status === 'working') ||
      bookings.find((b) => b.status === 'pending') ||
      bookings[0] ||
      null
    )
  }, [bookings])

  const featuredShops = useMemo(() => {
    const map = new Map()
    for (const s of catalogServices) {
      const key = s.shopOwnerId || s.shopName
      if (!key) continue
      const current = map.get(key)
      if (!current || s.shopRating > current.shopRating) {
        map.set(key, s)
      }
    }
    return [...map.values()].sort((a, b) => b.shopRating - a.shopRating).slice(0, 6)
  }, [catalogServices])

  const filteredServices = useMemo(() => {
    let list = [...catalogServices]

    if (activeCategoryFilter !== 'All') {
      list = list.filter(
        (s) => String(s.category ?? '').toLowerCase() === activeCategoryFilter.toLowerCase(),
      )
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(
        (s) =>
          s.serviceName?.toLowerCase().includes(q) ||
          s.shopName?.toLowerCase().includes(q) ||
          s.category?.toLowerCase().includes(q) ||
          s.subcategory?.toLowerCase().includes(q),
      )
    }

    if (activeTab === 'topRated') {
      list = list.filter((s) => (s.shopRating || 0) >= 4.0)
    } else if (activeTab === 'homeService') {
      list = list.filter((s) => s.type === 'home' || s.type === 'both')
    } else if (activeTab === 'onCall') {
      list = list.filter(
        (s) =>
          s.shopOwnerRole === 'oncall-mechanic-technician' ||
          s.shopOwnerRole === 'independent-mechanic-technician',
      )
    }

    return list.sort((a, b) => (b.shopRating || 0) - (a.shopRating || 0))
  }, [catalogServices, activeCategoryFilter, searchQuery, activeTab])

  const cardShadow = 'shadow-[0_4px_16px_rgba(15,23,42,0.08)] hover:shadow-[0_8px_24px_rgba(8,31,92,0.16)]'
  const controlShadow = 'shadow-2xs hover:shadow-xs'

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600 text-sm font-medium">Loading…</p>
      </div>
    )
  }

  return (
    <CustomerLayout activePage="home">
      <main className="w-full px-3.5 sm:px-10 md:px-16 pt-4 sm:pt-6 pb-6 sm:pb-8 space-y-4 sm:space-y-7 max-w-[1440px] mx-auto">
        {listError || catalogError ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-none border border-rose-300 bg-rose-50 px-3.5 py-2.5 sm:px-4 sm:py-3 text-[11px] sm:text-xs font-medium text-rose-800 shadow-2xs">
            <span className="min-w-0 break-words">{listError || catalogError}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-none border-rose-300 hover:bg-rose-100 text-rose-800 font-bold uppercase tracking-wider text-[10px] sm:text-xs px-2.5 py-1 sm:px-3 sm:py-1.5 shrink-0 cursor-pointer"
              onClick={() => {
                void loadBookings()
                void loadCatalog()
              }}
              disabled={loading || catalogLoading}
            >
              Retry
            </Button>
          </div>
        ) : null}

        {/* 1. ULTRA-MODERN SPACIOUS HERO BANNER (SMOOTH FADE CAROUSEL) */}
        <section className="relative overflow-hidden rounded-none bg-[#04133d] text-white shadow-[0_6px_24px_-6px_rgba(4,19,61,0.35)] min-h-[290px] sm:min-h-[320px] flex flex-col justify-between">
          {/* Background Images Cross-Fade */}
          {HERO_SLIDES.map((slide, idx) => (
            <div
              key={`hero-bg-${idx}`}
              className={cn(
                'absolute inset-0 z-0 transition-opacity duration-1000 ease-in-out',
                idx === currentSlideIndex ? 'opacity-40' : 'opacity-0 pointer-events-none',
              )}
            >
              <ImageWithFallback
                src={slide.imageUrl}
                alt={slide.title}
                className="h-full w-full object-cover transition-transform duration-1000 scale-105"
              />
            </div>
          ))}
          {/* Constant Navy Blue Gradient Overlays */}
          <div className="absolute inset-0 z-10 bg-linear-to-r from-[#04133d]/95 via-[#081F5C]/85 to-[#04133d]/70 pointer-events-none" />
          <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(8,31,92,0.4),transparent)] pointer-events-none" />

          {/* Content Body Stack with Fade Transition */}
          <div className="relative z-20 min-h-[290px] sm:min-h-[320px] flex flex-col justify-between p-4 sm:p-8">
            <div className="relative flex-1">
              {HERO_SLIDES.map((slide, idx) => {
                const isActive = idx === currentSlideIndex
                return (
                  <div
                    key={`hero-content-${idx}`}
                    className={cn(
                      'space-y-2.5 sm:space-y-4 max-w-2xl transition-all duration-700 ease-in-out',
                      isActive
                        ? 'relative opacity-100 translate-y-0 z-20 pointer-events-auto'
                        : 'absolute inset-x-0 top-0 opacity-0 -translate-y-2 z-10 pointer-events-none',
                    )}
                  >
                    {/* Glassmorphic Badge */}
                    <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-none bg-[#081F5C]/40 backdrop-blur-md px-2.5 py-0.5 sm:px-3 sm:py-1 text-sky-200 text-[10px] sm:text-xs font-semibold border border-sky-400/40 shadow-xs">
                      <Sparkles className="size-3 sm:size-3.5 text-sky-300 animate-pulse shrink-0" />
                      <span className="truncate">{slide.badge}</span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight text-white leading-tight">
                      {slide.title}
                    </h1>

                    {/* Subtitle */}
                    <p className="text-xs sm:text-sm md:text-base text-slate-200/90 leading-relaxed font-normal">
                      {slide.description}
                    </p>

                    {/* Value Perk Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-0.5 sm:pt-1">
                      {slide.perks.map((perk, pIdx) => (
                        <span
                          key={pIdx}
                          className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-xs border border-white/15 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-[11px] text-sky-100 font-medium"
                        >
                          <CheckCircle2 className="size-2.5 sm:size-3 text-sky-400 shrink-0" />
                          <span>{perk}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Action CTAs & Slide Indicators Controls */}
            <div className="relative z-30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-white/15">
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Button
                  type="button"
                  onClick={() => navigateHash(currentHero.primaryCtaLink)}
                  className="bg-[#081F5C] hover:bg-[#1447a6] text-white font-bold rounded-none text-xs sm:text-sm px-3 sm:px-5 py-2 sm:py-2.5 shadow-lg shadow-[#081F5C]/35 transition-transform hover:scale-[1.02] cursor-pointer justify-center"
                >
                  <span className="flex items-center gap-1.5 sm:gap-2 truncate">
                    <span className="truncate">{currentHero.primaryCtaText}</span>
                    <ArrowRight className="size-3.5 sm:size-4 shrink-0" />
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigateHash('#/customer/find-services')}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-xs font-semibold rounded-none text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5 cursor-pointer justify-center truncate"
                >
                  Browse Services
                </Button>
              </div>

              {/* Slide Navigation Controls */}
              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto self-auto sm:self-center">
                <div className="flex items-center gap-1.5">
                  {HERO_SLIDES.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={cn(
                        'h-1.5 rounded-none transition-all duration-500 cursor-pointer',
                        idx === currentSlideIndex
                          ? 'w-5 sm:w-6 bg-sky-400'
                          : 'w-2 bg-white/40 hover:bg-white/60',
                      )}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentSlideIndex((prev) =>
                        prev === 0 ? HERO_SLIDES.length - 1 : prev - 1,
                      )
                    }
                    className="size-6 sm:size-7 bg-white/10 hover:bg-white/20 text-white flex items-center justify-center rounded-none border border-white/20 cursor-pointer transition-colors"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="size-3.5 sm:size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentSlideIndex((prev) => (prev + 1) % HERO_SLIDES.length)
                    }
                    className="size-6 sm:size-7 bg-white/10 hover:bg-white/20 text-white flex items-center justify-center rounded-none border border-white/20 cursor-pointer transition-colors"
                    aria-label="Next slide"
                  >
                    <ChevronRight className="size-3.5 sm:size-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. FULLY MODERN GRADIENT BOOKING STATUS CARDS WITH FADED WATERMARK ICONS (2 COLUMNS ON MOBILE) */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Card 1: Pending Requests (Warm Amber/Orange Gradient) */}
          <div
            onClick={() => navigateHash('#/customer/my-bookings')}
            className="group relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-600 to-amber-900 p-2.5 sm:p-4 text-white shadow-lg shadow-amber-500/20 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-amber-500/35 border border-amber-300/40 rounded-none"
          >
            <div className="pointer-events-none absolute -right-3 -top-3 size-20 sm:size-28 bg-gradient-to-br from-amber-200/30 to-transparent rounded-full blur-xl group-hover:scale-125 transition-transform duration-500" />
            <Clock className="pointer-events-none absolute -right-1 -top-1 size-14 sm:size-22 text-white/20 stroke-[1.2] rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:text-white/30" />

            <div className="relative z-10 space-y-1.5 sm:space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-black/20 backdrop-blur-md border border-white/25 text-white rounded-none shadow-xs truncate max-w-[105px] sm:max-w-none">
                  <Clock className="size-2.5 sm:size-3 text-amber-300 shrink-0" />
                  <span className="truncate">Pending</span>
                </span>
                <div className="size-5 sm:size-6 rounded-none bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/30 text-white group-hover:bg-white group-hover:text-amber-600 transition-colors shadow-xs shrink-0">
                  <ChevronRight className="size-3 sm:size-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-1.5 sm:gap-2">
                  <span className="text-xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
                    {loading ? '—' : stats.pending}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-amber-100 bg-amber-950/40 px-1 sm:px-1.5 py-0.5 border border-amber-300/30 rounded-none uppercase tracking-wider">
                    Pending
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-amber-100/90 font-medium mt-0.5 leading-snug line-clamp-1 sm:line-clamp-none">
                  Awaiting shop review
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Active / In-Progress (Ocean Cyan/Blue/Indigo Gradient) */}
          <div
            onClick={() => navigateHash('#/customer/my-bookings')}
            className="group relative overflow-hidden bg-gradient-to-br from-[#081F5C] via-blue-600 to-slate-900 p-2.5 sm:p-4 text-white shadow-lg shadow-blue-500/20 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-500/35 border border-cyan-300/40 rounded-none"
          >
            <div className="pointer-events-none absolute -right-3 -top-3 size-20 sm:size-28 bg-gradient-to-br from-cyan-300/30 to-transparent rounded-full blur-xl group-hover:scale-125 transition-transform duration-500" />
            <Wrench className="pointer-events-none absolute -right-1 -top-1 size-14 sm:size-22 text-white/20 stroke-[1.2] -rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6 group-hover:text-white/30" />

            <div className="relative z-10 space-y-1.5 sm:space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-black/20 backdrop-blur-md border border-white/25 text-white rounded-none shadow-xs truncate max-w-[105px] sm:max-w-none">
                  <Wrench className="size-2.5 sm:size-3 text-cyan-300 shrink-0" />
                  <span className="truncate">Active</span>
                </span>
                <div className="size-5 sm:size-6 rounded-none bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/30 text-white group-hover:bg-white group-hover:text-blue-600 transition-colors shadow-xs shrink-0">
                  <ChevronRight className="size-3 sm:size-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-1.5 sm:gap-2">
                  <span className="text-xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
                    {loading ? '—' : stats.active}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-blue-100 bg-blue-950/40 px-1 sm:px-1.5 py-0.5 border border-blue-300/30 rounded-none uppercase tracking-wider">
                    Active
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-blue-100/90 font-medium mt-0.5 leading-snug line-clamp-1 sm:line-clamp-none">
                  Confirmed / Working
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Completed Jobs (Emerald Fresh Gradient) */}
          <div
            onClick={() => navigateHash('#/customer/my-bookings')}
            className="group relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-slate-950 p-2.5 sm:p-4 text-white shadow-lg shadow-emerald-500/20 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-500/35 border border-emerald-300/40 rounded-none"
          >
            <div className="pointer-events-none absolute -right-3 -top-3 size-20 sm:size-28 bg-gradient-to-br from-emerald-300/30 to-transparent rounded-full blur-xl group-hover:scale-125 transition-transform duration-500" />
            <CheckCircle2 className="pointer-events-none absolute -right-2 -top-2 size-14 sm:size-22 text-white/20 stroke-[1.2] rotate-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12 group-hover:text-white/30" />

            <div className="relative z-10 space-y-1.5 sm:space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-black/20 backdrop-blur-md border border-white/25 text-white rounded-none shadow-xs truncate max-w-[105px] sm:max-w-none">
                  <CheckCircle2 className="size-2.5 sm:size-3 text-emerald-300 shrink-0" />
                  <span className="truncate">Completed</span>
                </span>
                <div className="size-5 sm:size-6 rounded-none bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/30 text-white group-hover:bg-white group-hover:text-emerald-600 transition-colors shadow-xs shrink-0">
                  <ChevronRight className="size-3 sm:size-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-1.5 sm:gap-2">
                  <span className="text-xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
                    {loading ? '—' : stats.completed}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-emerald-100 bg-emerald-950/40 px-1 sm:px-1.5 py-0.5 border border-emerald-300/30 rounded-none uppercase tracking-wider">
                    Done
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-emerald-100/90 font-medium mt-0.5 leading-snug line-clamp-1 sm:line-clamp-none">
                  Finished & delivered
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: Total Requests (Royal Purple Gradient) */}
          <div
            onClick={() => navigateHash('#/customer/my-bookings')}
            className="group relative overflow-hidden bg-gradient-to-br from-purple-600 via-violet-700 to-slate-950 p-2.5 sm:p-4 text-white shadow-lg shadow-purple-500/20 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-purple-500/35 border border-purple-300/40 rounded-none"
          >
            <div className="pointer-events-none absolute -right-3 -top-3 size-20 sm:size-28 bg-gradient-to-br from-purple-300/30 to-transparent rounded-full blur-xl group-hover:scale-125 transition-transform duration-500" />
            <CalendarDays className="pointer-events-none absolute -right-1 -top-1 size-14 sm:size-22 text-white/20 stroke-[1.2] -rotate-6 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12 group-hover:text-white/30" />

            <div className="relative z-10 space-y-1.5 sm:space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-black/20 backdrop-blur-md border border-white/25 text-white rounded-none shadow-xs truncate max-w-[105px] sm:max-w-none">
                  <CalendarDays className="size-2.5 sm:size-3 text-purple-300 shrink-0" />
                  <span className="truncate">Total</span>
                </span>
                <div className="size-5 sm:size-6 rounded-none bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/30 text-white group-hover:bg-white group-hover:text-purple-600 transition-colors shadow-xs shrink-0">
                  <ChevronRight className="size-3 sm:size-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-1.5 sm:gap-2">
                  <span className="text-xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm">
                    {loading ? '—' : stats.total}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-purple-100 bg-purple-950/40 px-1 sm:px-1.5 py-0.5 border border-purple-300/30 rounded-none uppercase tracking-wider">
                    All Time
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-purple-100/90 font-medium mt-0.5 leading-snug line-clamp-1 sm:line-clamp-none">
                  Total repair bookings
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. ACTIVE REPAIR STATUS CARD */}
        <section className={cn('bg-white p-3.5 sm:p-5 rounded-none border border-slate-200/80', cardShadow)}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5 sm:gap-3">
              <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center bg-[#081F5C] text-white shadow-sm">
                <Wrench className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#081F5C] bg-blue-50 px-1.5 sm:px-2 py-0.5 border border-blue-200">
                    {activeBooking
                      ? activeBooking.status === 'confirmed' || activeBooking.status === 'working'
                        ? 'Active Repair'
                        : 'Latest Booking Status'
                      : 'E-Paayos Specialist Care'}
                  </span>
                  {activeBooking ? (
                    <span className="text-[11px] sm:text-xs text-slate-500 font-medium">
                      Ref #{activeBooking.ref || activeBooking.id}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-900 mt-1 leading-snug break-words">
                  {activeBooking
                    ? `${activeBooking.serviceName} at ${activeBooking.shopName} · Schedule: ${formatDateShort(activeBooking.date)} ${
                        activeBooking.preferredTime ? `(${activeBooking.preferredTime})` : ''
                      }`
                    : 'Need an urgent emergency repair or on-site service? Connect with verified specialists now.'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={() =>
                navigateHash(activeBooking ? '#/customer/my-bookings' : '#/customer/find-services')
              }
              className="w-full sm:w-auto bg-slate-900 hover:bg-[#081F5C] text-white font-semibold rounded-none text-xs px-4 py-2 shadow-xs shrink-0 cursor-pointer justify-center"
            >
              {activeBooking ? 'Track Booking Status' : 'Find Services'}
            </Button>
          </div>
        </section>

        {/* 4. CATEGORIES & FILTER CONTROLS */}
        <section className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div>
              <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">
                Explore Repair Categories
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">Filter specialized repair services & technicians</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-auto sm:min-w-[180px]">
                <NativeSelect
                  value={activeCategoryFilter}
                  onChange={(e) => setActiveCategoryFilter(e.target.value)}
                  className="w-full text-xs sm:text-sm"
                >
                  {REPAIR_CATEGORIES.map((cat) => (
                    <NativeSelectOption key={cat.id} value={cat.value}>
                      {cat.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>
          </div>

          {/* Category Cards Pills (2 columns on mobile, 4 on desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {REPAIR_CATEGORIES.map((cat) => {
              const CatIcon = cat.icon
              const isSelected = activeCategoryFilter === cat.value
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryFilter(cat.value)}
                  className={cn(
                    'flex items-center gap-2 sm:gap-2.5 p-2 sm:p-3 bg-white text-left transition-all duration-200 border cursor-pointer',
                    controlShadow,
                    isSelected
                      ? 'border-[#081F5C] bg-blue-50/60 text-[#081F5C]'
                      : 'border-slate-200/80 hover:border-blue-300 text-slate-700',
                  )}
                >
                  <div
                    className={cn(
                      'flex size-7 sm:size-8 shrink-0 items-center justify-center text-white',
                      isSelected ? 'bg-[#081F5C]' : 'bg-slate-800',
                    )}
                  >
                    <CatIcon className="size-3.5 sm:size-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[11px] sm:text-xs font-semibold truncate">{cat.name}</h3>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate">{cat.count}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* 5. FEATURED SHOPS CAROUSEL */}
        <section className="space-y-3 sm:space-y-3.5">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h2 className="text-xs sm:text-sm md:text-base font-bold uppercase tracking-wider text-slate-900">
                Featured Repair Shops & Mechanics
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                Top-rated service centers & on-call specialist technicians
              </p>
            </div>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#081F5C] transition-colors hover:text-[#1447a6] cursor-pointer"
              onClick={() => navigateHash('#/customer/find-services')}
            >
              <span>View all</span> <ChevronRight className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
            </button>
          </div>
          <div className="flex gap-2.5 sm:gap-3.5 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {catalogLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <FeaturedShopCardSkeleton key={`shop-skeleton-${i}`} />
                ))
              : featuredShops.map((shop) => (
                  <FeaturedShopCard
                    key={shop.shopOwnerId || shop.id}
                    shop={shop}
                    readableShopAddress={readableShopAddresses[shop.shopOwnerId]}
                  />
                ))}
          </div>
        </section>

        {/* 6. MAIN REPAIR SERVICES CATALOG SHOWCASE */}
        <section className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
            <div>
              <h2 className="text-base sm:text-xl font-bold text-slate-900 tracking-tight">
                Featured Repair Services
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                Popular repair offers direct from verified local shops
              </p>
            </div>

            {/* Tab Filter Controls */}
            <div className="flex overflow-x-auto sm:flex-wrap items-center gap-1 bg-slate-100 p-1 text-xs font-medium [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {[
                { id: 'all', label: 'All Services' },
                { id: 'topRated', label: '⭐ Top Rated' },
                { id: 'homeService', label: '🏠 Home Service' },
                { id: 'onCall', label: '⚡ On-Call' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'shrink-0 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold transition-colors rounded-none cursor-pointer whitespace-nowrap',
                    activeTab === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {catalogLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`service-skel-${i}`}
                  className="h-52 sm:h-56 w-full animate-pulse rounded-none border border-slate-200 bg-white shadow-2xs"
                />
              ))}
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="flex min-h-[140px] flex-col items-center justify-center rounded-none border border-dashed border-slate-300 bg-white px-4 sm:px-6 py-6 text-center shadow-2xs">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900">
                No matching services found
              </p>
              <p className="mt-1 max-w-md text-[11px] sm:text-xs text-slate-500">
                Try selecting a different category or clear active filter options.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {filteredServices.slice(0, 6).map((service) => (
                <CatalogServiceCard
                  key={service.id}
                  item={service}
                  readableShopAddresses={readableShopAddresses}
                  shopAddressesResolving={shopAddressesResolving}
                />
              ))}
            </div>
          )}
        </section>

        {/* 7. WHY CHOOSE E-PAAYOS GUARANTEE (2 COLUMNS ON MOBILE) */}
        <section
          className={cn(
            'bg-white p-4 sm:p-8 border border-slate-200/80 space-y-4 sm:space-y-6 rounded-none',
            cardShadow,
          )}
        >
          <div className="text-center max-w-xl mx-auto space-y-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#081F5C]">
              Direct Repair Specialist Network
            </span>
            <h2 className="text-base sm:text-2xl font-bold text-slate-900">
              Why Customers Trust E-Paayos Platform
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Connecting trusted local mechanics &amp; service technicians directly to your needs.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {[
              {
                icon: Wrench,
                title: 'Verified Network',
                desc: '100% verified repair shops & certified technicians.',
              },
              {
                icon: Truck,
                title: 'Fast On-Site Care',
                desc: 'Roadside assistance or quick home dispatch calls.',
              },
              {
                icon: ShieldCheck,
                title: 'Upfront Pricing',
                desc: 'Clear labor estimates with zero hidden extra charges.',
              },
              {
                icon: Award,
                title: 'Service Warranty',
                desc: 'Satisfaction guarantee & shop support protection.',
              },
            ].map((item, idx) => {
              const ItemIcon = item.icon
              return (
                <div
                  key={idx}
                  className="p-2.5 sm:p-4 bg-slate-50 border border-slate-100 text-center space-y-1.5 sm:space-y-2 flex flex-col items-center justify-start"
                >
                  <div className="size-8 sm:size-10 mx-auto bg-blue-100 text-[#081F5C] flex items-center justify-center font-bold shrink-0">
                    <ItemIcon className="size-4 sm:size-5" />
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1">{item.title}</h3>
                  <p className="text-[10px] sm:text-xs text-slate-600 leading-tight sm:leading-relaxed">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* 8. CUSTOMER REVIEWS (1-ROW HORIZONTALLY SCROLLABLE ON MOBILE, 3-COL GRID ON DESKTOP) */}
        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-xl font-bold text-slate-900">
                Customer Ratings &amp; Reviews
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">What verified repair clients say</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigateHash('#/customer/reviews-ratings')}
              className="text-[#081F5C] hover:text-[#1447a6] text-[11px] sm:text-xs font-semibold gap-0.5 sm:gap-1 cursor-pointer p-0 h-auto"
            >
              <span>View All</span> <ChevronRight className="size-3 sm:size-3.5" />
            </Button>
          </div>

          <div className="flex overflow-x-auto gap-3 pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:pb-0">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.id}
                className={cn(
                  'w-[270px] sm:w-[300px] md:w-auto shrink-0 md:shrink bg-white p-3.5 sm:p-4 border border-slate-200/80 space-y-2.5 sm:space-y-3 flex flex-col justify-between rounded-none',
                  cardShadow,
                )}
              >
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center gap-1 text-amber-400">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="size-3 sm:size-3.5 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-[11px] sm:text-xs text-slate-700 italic leading-relaxed">&quot;{t.comment}&quot;</p>
                </div>

                <div className="flex items-center gap-2 sm:gap-2.5 pt-2 border-t border-slate-100">
                  <Avatar className="size-7 sm:size-8 rounded-none border border-blue-200 shrink-0">
                    <AvatarImage src={t.avatar} alt={t.name} />
                    <AvatarFallback className="bg-[#081F5C] text-white font-bold text-[10px] sm:text-xs rounded-none">
                      {t.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h4 className="text-[11px] sm:text-xs font-bold text-slate-900 flex items-center gap-1 truncate">
                      <span className="truncate">{t.name}</span>
                      <BadgeCheck className="size-3 sm:size-3.5 text-blue-600 shrink-0" />
                    </h4>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 block truncate">{t.purchasedItem}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 9. E-PAAYOS CUSTOMER SUPPORT & CARE BANNER */}
        <section
          className={cn(
            'bg-slate-900 text-white p-4 sm:p-8 space-y-3.5 sm:space-y-4 rounded-none border border-slate-800',
            cardShadow,
          )}
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 text-sky-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-sky-500/10 px-2 sm:px-2.5 py-0.5 border border-sky-500/20">
                <Headphones className="size-3 sm:size-3.5" />
                <span>E-Paayos Support &amp; Customer Care</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white leading-snug">
                Need Help With Your Repair Booking or Shop Inquiries?
              </h2>
              <p className="text-[11px] sm:text-sm text-slate-300 leading-relaxed">
                Connect directly with shop owners, inquire about repair status updates, or chat with
                our platform customer care.
              </p>
            </div>

              <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-2 sm:gap-2.5 shrink-0 w-full sm:w-auto">
                <Button
                  type="button"
                  onClick={() => navigateHash('#/customer/messages')}
                  className="w-full sm:w-auto bg-[#081F5C] hover:bg-[#1447a6] text-[#ffffff] font-bold rounded-none text-xs px-3 sm:px-4 py-2.5 shadow-sm gap-1.5 cursor-pointer justify-center"
                >
                  <MessageSquare className="size-3.5 sm:size-4" />
                  <span>Support</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigateHash('#/customer/my-bookings')}
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border-white/20 font-semibold rounded-none text-xs px-3 sm:px-4 py-2.5 cursor-pointer justify-center"
                >
                  <Package className="size-3.5 sm:size-4 mr-1 sm:mr-1.5" />
                  <span>Bookings</span>
                </Button>
              </div>
            </div>
          </section>
        </main>
      </CustomerLayout>
    )
}

export default CustomerDashboard

