import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import {
  Bell,
  Bike,
  Home,
  LogOut,
  MapPin,
  Search,
  Settings,
  SlidersHorizontal,
  Smartphone,
  Star,
  Store,
  UserRound,
  WashingMachine,
  Wrench,
} from 'lucide-react'
import logoEpaayos from '../../assets/epaayosLOGO.png'
import { formatMunicipalityBarangayLabel, formatReadableShopAddress } from '../../lib/psgcResolve'
import {
  NotificationBellIndicator,
  useCustomerNotificationUnreadCount,
} from '../../components/notifications/NotificationFeed.jsx'
import { useLogoutConfirmation } from '../../hooks/useLogoutConfirmation.jsx'

const CATEGORIES = ['Appliance', 'Gadget', 'Vehicle', 'Others']
export const SERVICE_TYPES = [
  { value: 'home', label: 'Home service' },
  { value: 'in-shop', label: 'In-shop' },
  { value: 'both', label: 'Both Home service and in-shop' },
]

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

function catalogAuthHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const selectShell =
  'h-9 w-full appearance-none rounded-lg border-none ring-0 bg-white/95 px-3 py-2 pr-8 text-xs sm:text-sm shadow-[0_3px_10px_rgba(15,23,42,0.12)] outline-none focus-visible:ring-2 focus-visible:ring-[#081F5C]/20'

function serviceTypeBadge(type) {
  const label = SERVICE_TYPES.find((x) => x.value === type)?.label ?? 'N/A'
  return (
    <Badge variant="outline" className="border-[#081F5C]/15 bg-white/90 text-[11px] font-medium text-[#081F5C]">
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
  if (normalized === 'others') return 'bg-linear-to-r from-amber-500 to-orange-500 text-white'
  return 'bg-linear-to-r from-slate-600 to-slate-700 text-white'
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

/** Mock data — palitan kapag may API nang para sa top independent / top shop services. */
const MOCK_TOP_INDEPENDENT_SERVICES = [
  {
    id: 'mock-ind-1',
    serviceName: 'Mobile phone LCD & battery replacement',
    providerName: 'Marcus Reyes',
    category: 'Gadget',
    rating: 4.9,
    jobs: 156,
  },
  {
    id: 'mock-ind-2',
    serviceName: 'Laptop board-level diagnostics',
    providerName: 'Anna Lim',
    category: 'Gadget',
    rating: 4.85,
    jobs: 98,
  },
  {
    id: 'mock-ind-3',
    serviceName: 'Home aircon cleaning & refill',
    providerName: 'Rico Santos',
    category: 'Appliance',
    rating: 4.95,
    jobs: 412,
  },
  {
    id: 'mock-ind-4',
    serviceName: 'Motorcycle tune-up & oil change',
    providerName: 'Jay Cruz',
    category: 'Vehicle',
    rating: 4.8,
    jobs: 267,
  },
  {
    id: 'mock-ind-5',
    serviceName: 'Washing machine motor repair',
    providerName: 'Ben Torres',
    category: 'Appliance',
    rating: 4.75,
    jobs: 89,
  },
  {
    id: 'mock-ind-6',
    serviceName: 'Small appliance wiring & safety check',
    providerName: 'Kim Navarro',
    category: 'Others',
    rating: 4.7,
    jobs: 54,
  },
]

const MOCK_TOP_SHOP_SERVICES = [
  {
    id: 'mock-shop-1',
    serviceName: 'Full vehicle computer diagnostics',
    shopName: 'Taytay Auto Care Hub',
    category: 'Vehicle',
    rating: 4.9,
    jobs: 520,
  },
  {
    id: 'mock-shop-2',
    serviceName: 'Brake pad replacement (all wheels)',
    shopName: 'GearShift Motors',
    category: 'Vehicle',
    rating: 4.85,
    jobs: 380,
  },
  {
    id: 'mock-shop-3',
    serviceName: 'Refrigerator compressor service',
    shopName: 'CoolFix Appliance Center',
    category: 'Appliance',
    rating: 4.8,
    jobs: 210,
  },
  {
    id: 'mock-shop-4',
    serviceName: 'Smartphone water damage recovery',
    shopName: 'ByteLine Gadget Clinic',
    category: 'Gadget',
    rating: 4.95,
    jobs: 640,
  },
  {
    id: 'mock-shop-5',
    serviceName: 'Periodic maintenance package',
    shopName: 'Highway 88 Garage',
    category: 'Vehicle',
    rating: 4.75,
    jobs: 295,
  },
  {
    id: 'mock-shop-6',
    serviceName: 'Microwave & oven repair',
    shopName: 'HomeTech Service Bay',
    category: 'Appliance',
    rating: 4.88,
    jobs: 175,
  },
]

/** Isang listahan: independent + shop owner, pinaka-mataas na rating sa unahan (tie: mas maraming jobs). */
const MOCK_TOP_SERVICES_SORTED = [
  ...MOCK_TOP_INDEPENDENT_SERVICES.map((row) => ({ ...row, kind: 'independent' })),
  ...MOCK_TOP_SHOP_SERVICES.map((row) => ({ ...row, kind: 'shop' })),
].sort((a, b) => {
  const rd = Number(b.rating) - Number(a.rating)
  if (rd !== 0) return rd
  return Number(b.jobs) - Number(a.jobs)
})

function MockTopServiceCard({ item }) {
  const CategoryIcon = categoryIcon(item.category)
  const isIndependent = item.kind === 'independent'
  return (
    <Card
      className="w-[272px] shrink-0 overflow-hidden border border-[#081F5C]/12 bg-white/95 shadow-[0_3px_12px_rgba(15,23,42,0.08)] transition-shadow hover:shadow-[0_8px_20px_rgba(15,23,42,0.12)]"
      aria-hidden
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#081F5C]/10 text-[#081F5C]">
              <CategoryIcon className="h-4 w-4" />
            </span>
            <Badge
              className={
                isIndependent
                  ? 'border-violet-300/50 bg-violet-100 text-violet-900'
                  : 'border-sky-300/50 bg-sky-100 text-sky-900'
              }
            >
              {isIndependent ? 'Independent' : 'Shop owner'}
            </Badge>
          </div>
          <div
            className="flex shrink-0 items-center gap-0.5 rounded-full border border-amber-300/60 bg-amber-50 px-1.5 py-0.5"
            aria-label={`Rating ${item.rating}`}
          >
            <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
            <span className="text-[11px] font-semibold tabular-nums text-gray-900">{item.rating.toFixed(2)}</span>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 text-sm font-semibold leading-snug text-gray-900">{item.serviceName}</p>
        <p className="mt-2 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {isIndependent ? (
            <>
              <UserRound className="h-3.5 w-3.5 shrink-0 text-[#081F5C]/80" />
              <span className="truncate">{item.providerName}</span>
            </>
          ) : (
            <>
              <Store className="h-3.5 w-3.5 shrink-0 text-[#081F5C]/80" />
              <span className="truncate">{item.shopName}</span>
            </>
          )}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {item.category}
          </Badge>
          <span className="text-[11px] text-muted-foreground">{item.jobs} completed jobs</span>
        </div>
      </CardContent>
    </Card>
  )
}

function TopServicesMarqueeRow({ items }) {
  const loop = useMemo(() => [...items, ...items], [items])
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#081F5C]/10 bg-linear-to-b from-white/90 to-slate-50/80 py-3 shadow-inner">
      <div className="find-services-marquee-track flex w-max gap-4 px-1">
        {loop.map((item, i) => (
          <MockTopServiceCard key={`${item.id}-${i}`} item={item} />
        ))}
      </div>
    </div>
  )
}

function CustomerFindServices() {
  const [user, setUser] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileMenuRef = useRef(null)
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
    const raw = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!token || !raw) {
      window.location.hash = '#/login'
      return
    }
    try {
      const parsed = JSON.parse(raw)
      if (parsed.role !== 'customer') {
        window.location.hash = '#/login'
        return
      }
      setUser(parsed)
    } catch {
      window.location.hash = '#/login'
    }
  }, [])

  useEffect(() => {
    if (!user) return
    loadCatalog()
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

  useEffect(() => {
    if (!profileOpen) return
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileOpen])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.hash = '#/'
  }

  const { requestLogout, LogoutDialog } = useLogoutConfirmation(handleLogout)

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

  const { unreadCount: customerNotifUnread } = useCustomerNotificationUnreadCount(user)

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-sky-50 via-violet-50 to-indigo-100">
        <p className="text-gray-600 text-sm">Loading…</p>
      </div>
    )
  }

  const showCatalogSkeleton = catalogLoading && catalogServices.length === 0

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-50 via-violet-50 to-indigo-100">
      <header className="sticky top-0 z-20 border-b border-blue-100/80 bg-white/90 backdrop-blur-md shadow-[0_2px_14px_rgba(8,31,92,0.06)]">
        <div className="w-full px-10 sm:px-14 md:px-20 py-3 flex items-center gap-4">
          <div className="flex items-center gap-5 shrink-0">
            <button
              type="button"
              className="flex items-center"
              aria-label="E-Paayos customer find services"
              onClick={() => { window.location.hash = '#/customer/dashboard' }}
            >
              <img
                src={logoEpaayos}
                alt="E-PAAYOS"
                className="h-9 w-auto max-h-11 max-w-[min(62vw,220px)] object-contain object-left sm:h-10"
                decoding="async"
              />
            </button>
          </div>

          <nav className="flex-1 flex justify-center">
            <div className="flex items-center gap-9 md:gap-11">
              <button
                type="button"
                className="text-sm font-semibold text-blue-900/80 hover:text-blue-700 transition-colors"
                onClick={() => { window.location.hash = '#/customer/dashboard' }}
              >
                Home
              </button>
              <button
                type="button"
                className="text-sm font-semibold text-blue-900 transition-colors"
                onClick={() => { window.location.hash = '#/customer/find-services' }}
              >
                Find Services
              </button>
              <button
                type="button"
                className="text-sm font-semibold text-blue-900/80 hover:text-blue-700 transition-colors"
                onClick={() => { window.location.hash = '#/customer/my-bookings' }}
              >
                My Bookings
              </button>
              <button
                type="button"
                className="text-sm font-semibold text-blue-900/80 hover:text-blue-700 transition-colors"
                onClick={() => { window.location.hash = '#/customer/messages' }}
              >
                Messages
              </button>
            </div>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              aria-label="Notification"
              onClick={() => { window.location.hash = '#/customer/notification' }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#081F5C] transition-colors hover:bg-[#081F5C]/8"
            >
              <NotificationBellIndicator unreadCount={customerNotifUnread}>
                <Bell className="h-5 w-5" />
              </NotificationBellIndicator>
            </button>

            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                aria-label="Profile menu"
                onClick={() => setProfileOpen((prev) => !prev)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  profileOpen ? 'bg-[#081F5C]/8 text-[#081F5C]' : 'bg-transparent text-[#081F5C] hover:bg-[#081F5C]/8'
                }`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-sm font-semibold leading-none text-white">
                  {(user.fullName || user.email || 'C').charAt(0).toUpperCase()}
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-md border border-border/80 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false)
                      window.location.hash = '#/customer/reviews-ratings'
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Star className="h-4 w-4" />
                    <span className="whitespace-nowrap">Reviews &amp; Ratings</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false)
                      window.location.hash = '#/customer/account-settings'
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Account Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false)
                      requestLogout()
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="w-full px-6 sm:px-10 md:px-14 lg:px-20 pt-4 pb-5 space-y-4">
        <style>{`
          @keyframes findServicesMarqueeLeft {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
          .find-services-marquee-track {
            animation: findServicesMarqueeLeft 120s linear infinite;
          }
          .find-services-marquee-track:hover {
            animation-play-state: paused;
          }
          @media (prefers-reduced-motion: reduce) {
            .find-services-marquee-track {
              animation: none !important;
            }
          }
        `}</style>

        <section className="space-y-2" aria-label="Top services preview (sample data)">
          <div>
            <h2 className="text-base font-semibold text-[#081F5C] md:text-lg">
              Top services — Independent technicians &amp; shop owners
            </h2>
          </div>
          <TopServicesMarqueeRow items={MOCK_TOP_SERVICES_SORTED} />
        </section>

        <section className="space-y-3">
          <div className="mb-1 flex min-w-0 w-full max-w-full flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 w-full max-w-full flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-nowrap">
              <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[200px]">
              <select
                className={`${selectShell} ${categoryFilter === '__' ? 'text-neutral-500' : 'text-neutral-900'}`}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
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
                className={`${selectShell} ${locationFilter === '__' ? 'text-neutral-500' : 'text-neutral-900'}`}
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              >
                <option value="__" disabled hidden>
                  Location
                </option>
                <option value="">All locations</option>
                {locationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <MapPin className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              </div>

              <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[200px]">
              <select className={selectShell} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
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
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search services"
                />
                <Button
                  type="button"
                  size="icon-sm"
                  className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-md bg-linear-to-r from-[#081F5C] to-[#1447a6] p-0 shadow-sm hover:opacity-95"
                  aria-label="Search"
                >
                  <Search className="h-4 w-4 text-white" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base md:text-lg font-semibold text-[#081F5C]">Available Shop Services</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {showCatalogSkeleton
                  ? 'Loading…'
                  : `Result: ${filteredShops.length} service${filteredShops.length === 1 ? '' : 's'} found`}
              </p>
            </div>
            {catalogError ? (
              <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => loadCatalog()}>
                Retry load
              </Button>
            ) : null}
          </div>

          {catalogError ? (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950">
              {catalogError}
            </div>
          ) : null}

          {showCatalogSkeleton ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#081F5C]/20 bg-white/60 px-6 text-center shadow-sm">
              <p className="text-sm font-medium text-foreground">Loading services…</p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">Kinukuha ang active listings mula sa mga shop.</p>
            </div>
          ) : filteredShops.length === 0 ? (
            <div className="flex min-h-[150px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#081F5C]/20 bg-slate-50/70 px-6 text-center shadow-sm">
              <p className="text-sm font-medium text-foreground">
                {catalogServices.length === 0 ? 'Walang active na services sa ngayon' : 'No matching shops or services'}
              </p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                {catalogServices.length === 0
                  ? 'Kapag nag-list na ang mga shop owner ng active services, lalabas ang mga iyon dito.'
                  : 'Subukan i-adjust ang search keyword, location, o iba pang filters para makakita ng available shops.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredShops.map((item) => (
                <Card
                  key={item.id}
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
                  className="cursor-pointer overflow-hidden rounded-2xl border-none ring-0 bg-white/95 shadow-[0_3px_10px_rgba(15,23,42,0.12)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:bg-slate-50/95 hover:shadow-[0_12px_24px_rgba(15,23,42,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#081F5C]/40"
                >
                  <CardHeader className="space-y-2 pb-2">
                    {(() => {
                      const CategoryIcon = categoryIcon(item.category)
                      return (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-2.5">
                        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#081F5C]/12 text-[#081F5C]">
                          <CategoryIcon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate text-[15px] sm:text-base">{item.shopName}</CardTitle>
                          <div className="mt-1 w-full min-w-0">
                            <div className="inline-flex max-w-full min-w-0 items-center gap-1.5 overflow-hidden">
                              <CardDescription className="min-w-0 shrink truncate text-xs sm:text-sm leading-tight">
                                Owner: {item.shopOwner ?? '—'}
                              </CardDescription>
                              <div
                                className="flex shrink-0 items-center gap-1 rounded-full border border-yellow-400 bg-yellow-100 px-1.5 py-0.5"
                                aria-label={`Rating ${item.shopRating.toFixed(1)} out of 5`}
                              >
                                <Star className="h-3 w-3 shrink-0 fill-current text-yellow-500" />
                                <span className="text-[11px] font-medium leading-none text-gray-900 tabular-nums sm:text-xs">
                                  {item.shopRating.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Badge className={categoryBadgeClass(item.category)}>
                        {item.category}
                      </Badge>
                    </div>
                      )
                    })()}
                    <div className="flex flex-wrap items-center gap-2">{serviceTypeBadge(item.type)}</div>
                    <div className="space-y-1 pt-2 mt-1 border-t border-[#081F5C]/10">
                      <p className="text-xs font-semibold text-[#081F5C] sm:text-sm truncate">{item.serviceName}</p>
                      <p className="text-xs text-muted-foreground sm:text-sm line-clamp-2 leading-snug">
                        {item.subcategory?.trim() ? item.subcategory.trim() : '—'}
                      </p>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="space-y-1.5 text-xs sm:text-sm">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0 text-[#081F5C]" />
                        <span>
                          {item.shopOwnerId && Object.prototype.hasOwnProperty.call(readableShopAddresses, item.shopOwnerId)
                            ? readableShopAddresses[item.shopOwnerId]
                            : shopAddressesResolving
                              ? 'Loading address…'
                              : item.shopAddress}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Wrench className="h-4 w-4 text-[#081F5C]" />
                        <span>{item.completedJobs} completed jobs</span>
                      </div>
                    </div>

                    <div className="pt-3">
                      <p className="text-xs font-medium text-foreground sm:text-sm">{staffRoleHeading(item.category)}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="inline-flex items-center gap-1.5">
                          {(item.staff ?? []).slice(0, 4).map((name) => (
                            <span
                              key={name}
                              title={name}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-[10px] font-semibold text-white shadow-sm ring-1 ring-black/5"
                            >
                              {initialsFromName(name)}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {staffAssignedLabel(item.category, (item.staff ?? []).length)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

      </main>
      {LogoutDialog}
    </div>
  )
}

export default CustomerFindServices
