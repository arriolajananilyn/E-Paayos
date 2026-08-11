import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  Package,
  Loader2,
  MessageCircleMore,
  Star,
  Store,
  Truck,
  User,
  Wrench,
} from 'lucide-react'
import vehiclesBanner from '../../assets/vehicles.png'
import applianceBanner from '../../assets/applience.png'
import gadgetsBanner from '../../assets/gadgets.png'
import CustomerLayout, { readCustomerUserSession } from '../../layout/customerlayout.jsx'
import { CatalogServiceCard } from './findServices.jsx'
import { formatReadableShopAddress } from '../../lib/psgcResolve'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

const STAT_CARD_GRADIENT = {
  services: 'bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6]',
  active: 'bg-linear-to-br from-emerald-600 via-teal-600 to-emerald-800',
  inactive: 'bg-linear-to-br from-slate-700 via-slate-800 to-slate-900',
  booked: 'bg-linear-to-br from-sky-600 via-blue-600 to-indigo-700',
}

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

function ShopProfileAvatar({ shop, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false)
  const photoUrl = resolveShopPhotoUrl(shop)
  const canShowImage = Boolean(photoUrl) && !imageFailed

  return (
    <div
      className={`relative h-11 w-11 shrink-0 overflow-hidden rounded-none border-2 border-white bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] shadow-2xs ring-1 ring-[#081F5C]/15 ${className}`}
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
        <span className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
          {initialsFromShopName(shop?.shopName)}
        </span>
      )}
    </div>
  )
}

function FeaturedShopCardSkeleton() {
  return (
    <div className="w-[230px] max-w-[230px] shrink-0 animate-pulse overflow-hidden rounded-none border border-slate-200 bg-white shadow-[0_3px_8px_rgba(15,23,42,0.14)]">
      <div className="h-44 w-full bg-slate-200" />
      <div className="w-full min-w-0 px-3 pb-3.5">
        <div className="-mt-6 flex items-end gap-2">
          <div className="h-11 w-11 shrink-0 rounded-none bg-slate-300 ring-2 ring-white" />
          <div className="min-w-0 flex-1 space-y-2 pb-0.5">
            <div className="h-3.5 w-full rounded-none bg-slate-200" />
          </div>
        </div>
        <div className="mt-2.5 h-2.5 w-full rounded-none bg-slate-100" />
        <div className="mt-2 space-y-1.5">
          <div className="h-2.5 w-3/4 rounded-none bg-slate-100" />
          <div className="h-2.5 w-1/2 rounded-none bg-slate-100" />
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
  const isOnCall = shop.shopOwnerRole === 'oncall-mechanic-technician' || shop.shopOwnerRole === 'independent-mechanic-technician'
  const addressDisplay = readableShopAddress || shop.shopAddress || '—'

  const go = () => {
    window.location.hash = `#/customer/shop/${encodeURIComponent(shop.id)}`
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
      className="group w-[230px] max-w-[230px] shrink-0 cursor-pointer overflow-hidden rounded-none border border-slate-200 bg-white shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-300 hover:border-[#081F5C] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#081F5C]"
    >
      <div className="relative h-44 w-full overflow-hidden bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6]">
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
            <Store className="h-10 w-10 text-white/35" aria-hidden />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#04133d]/80 via-[#081F5C]/15 to-transparent" aria-hidden />

        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-1.5 p-2.5">
          <Badge
            className={`shrink-0 rounded-none border-0 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${categoryBadgeClass(shop.category)}`}
          >
            {shop.category}
          </Badge>
          <div
            className="flex shrink-0 items-center gap-1 rounded-none border border-white/30 bg-black/40 px-2 py-0.5 backdrop-blur-sm"
            aria-label={`Rating ${ratingLabel} out of 5`}
          >
            <Star className="h-3 w-3 shrink-0 fill-amber-300 text-amber-200" />
            <span className="text-[11px] font-bold leading-none text-white tabular-nums">{ratingLabel}</span>
          </div>
        </div>

        <Badge
          className={`absolute bottom-2.5 left-2.5 rounded-none px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-2xs backdrop-blur-sm ${
            isOnCall
              ? 'border border-violet-400/40 bg-violet-600/95 text-white'
              : 'border border-sky-400/40 bg-[#081F5C]/95 text-white'
          }`}
        >
          {isOnCall ? 'On-call' : 'Shop'}
        </Badge>
      </div>

      <div className="w-full min-w-0 px-3 pb-3.5">
        <div className="-mt-6 flex items-end gap-2">
          <ShopProfileAvatar shop={shop} />
          <div className="min-w-0 flex-1 pb-0.5">
            <h3 title={shop.shopName} className="line-clamp-2 text-[13px] font-bold leading-snug text-slate-900 uppercase tracking-wide">
              {shop.shopName}
            </h3>
          </div>
        </div>

        <p
          title={addressDisplay}
          className="mt-2.5 flex min-w-0 items-start gap-1 text-[11px] leading-snug text-slate-600"
        >
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#081F5C]" aria-hidden />
          <span className="min-w-0 line-clamp-2 break-words font-medium">{addressDisplay}</span>
        </p>

        <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-slate-100 pt-2">
          <span className="text-[11px] font-medium text-slate-600 truncate">
            <span className="font-bold text-slate-900 tabular-nums">{shop.completedJobs}</span> jobs
          </span>
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider text-[#081F5C] transition-colors group-hover:text-[#1447a6]">
            View shop
            <ChevronRight className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </article>
  )
}

function statusBadge(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'completed') {
    return <Badge className="rounded-none border border-emerald-500/30 bg-emerald-50 text-emerald-900 uppercase text-[10px] tracking-wider font-bold">Completed</Badge>
  }
  if (s === 'working') {
    return <Badge className="rounded-none border border-violet-500/35 bg-violet-50 text-violet-900 uppercase text-[10px] tracking-wider font-bold">Working</Badge>
  }
  if (s === 'confirmed') {
    return <Badge className="rounded-none border border-sky-500/35 bg-sky-50 text-sky-900 uppercase text-[10px] tracking-wider font-bold">Confirmed</Badge>
  }
  if (s === 'cancelled' || s === 'canceled') {
    return <Badge className="rounded-none border border-rose-500/30 bg-rose-50 text-rose-900 uppercase text-[10px] tracking-wider font-bold">Cancelled</Badge>
  }
  return <Badge className="rounded-none border border-amber-500/35 bg-amber-50 text-amber-900 uppercase text-[10px] tracking-wider font-bold">Pending</Badge>
}

function StatGradientCard({ label, value, icon: Icon, variant, helper }) {
  const gradient = STAT_CARD_GRADIENT[variant] ?? STAT_CARD_GRADIENT.services
  return (
    <div
      className={`relative min-h-[112px] min-w-0 overflow-hidden rounded-none border border-white/20 p-5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-300 hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)] hover:-translate-y-0.5 hover:border-white/40 sm:min-h-[128px] sm:p-6 ${gradient}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/10 to-transparent" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">{label}</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-white tabular-nums sm:text-3xl">{value}</p>
          {helper ? <p className="mt-1 line-clamp-1 text-[11px] font-medium text-white/75">{helper}</p> : null}
        </div>
        <div className="shrink-0 rounded-none border border-white/30 bg-white/15 p-3 backdrop-blur-sm shadow-2xs">
          <Icon className="h-5 w-5 text-white" aria-hidden />
        </div>
      </div>
    </div>
  )
}

function quickActionIconTone(tone) {
  return (
    {
      blue: 'from-[#04133d] to-[#081F5C]',
      purple: 'from-violet-600 to-purple-700',
      emerald: 'from-emerald-600 to-teal-700',
      amber: 'from-amber-500 to-orange-600',
      slate: 'from-slate-600 to-slate-800',
    }[tone] || 'from-[#04133d] to-[#081F5C]'
  )
}

function CustomerDashboard() {
  const [user, setUser] = useState(readCustomerUserSession)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [catalogServices, setCatalogServices] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [readableShopAddresses, setReadableShopAddresses] = useState({})
  const [shopAddressesResolving, setShopAddressesResolving] = useState(false)

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

  const recentBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => Date.parse(b.date || '') - Date.parse(a.date || ''))
      .slice(0, 4)
  }, [bookings])

  const kpiCards = useMemo(() => {
    return [
      { label: 'Total Bookings', value: stats.total, icon: Package, variant: 'services', helper: 'All requests created' },
      { label: 'Pending Requests', value: stats.pending, icon: Clock3, variant: 'inactive', helper: 'Waiting for shop response' },
      { label: 'Active Services', value: stats.active, icon: Wrench, variant: 'booked', helper: 'Confirmed or in progress' },
      { label: 'Completed Jobs', value: stats.completed, icon: Truck, variant: 'active', helper: 'Successfully finished' },
    ]
  }, [stats])

  const featuredServices = useMemo(() => {
    let list = [...catalogServices]
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
    return list.sort((a, b) => (b.shopRating || 0) - (a.shopRating || 0)).slice(0, 6)
  }, [catalogServices, searchQuery])

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

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.hash = `#/customer/find-services?q=${encodeURIComponent(searchQuery.trim())}`
    } else {
      window.location.hash = '#/customer/find-services'
    }
  }



  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600 text-sm font-medium">Loading…</p>
      </div>
    )
  }

  return (
    <CustomerLayout activePage="home">

      <main className="w-full px-6 sm:px-10 md:px-16 pt-6 pb-8 space-y-7 max-w-[1440px] mx-auto">
        {(listError || catalogError) ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-none border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800 shadow-2xs">
            <span>{listError || catalogError}</span>
            <Button type="button" variant="outline" size="sm" className="rounded-none border-rose-300 hover:bg-rose-100 text-rose-800 font-bold uppercase tracking-wider text-xs" onClick={() => { void loadBookings(); void loadCatalog() }} disabled={loading || catalogLoading}>
              Retry
            </Button>
          </div>
        ) : null}

        {/* KPI Cards Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {kpiCards.map(({ label, value, icon, variant, helper }) => (
            <StatGradientCard
              key={label}
              label={label}
              value={loading ? '—' : value}
              icon={icon}
              variant={variant}
              helper={helper}
            />
          ))}
        </section>

        {/* Featured Shops Section */}
        <section className="space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 md:text-base">Featured Shops</h2>
              <p className="text-xs text-slate-500 font-medium">Top rated repair shops &amp; on-call specialists</p>
            </div>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#081F5C] transition-colors hover:text-[#1447a6]"
              onClick={() => { window.location.hash = '#/customer/find-services' }}
            >
              View all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-3.5 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {catalogLoading
              ? Array.from({ length: 4 }).map((_, i) => <FeaturedShopCardSkeleton key={`shop-skeleton-${i}`} />)
              : featuredShops.map((shop) => (
                  <FeaturedShopCard
                    key={shop.shopOwnerId || shop.id}
                    shop={shop}
                    readableShopAddress={readableShopAddresses[shop.shopOwnerId]}
                  />
                ))}
          </div>
        </section>

        {/* Featured Services Section */}
        <section className="space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 md:text-base">Featured Services</h2>
              <p className="text-xs text-slate-500 font-medium">Popular services offered by verified mechanics &amp; technicians</p>
            </div>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#081F5C] transition-colors hover:text-[#1447a6]"
              onClick={() => { window.location.hash = '#/customer/find-services' }}
            >
              Browse all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {catalogLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`service-skel-${i}`} className="h-56 w-full animate-pulse rounded-none border border-slate-200 bg-white shadow-[0_3px_8px_rgba(15,23,42,0.14)]" />
              ))}
            </div>
          ) : featuredServices.length === 0 ? (
            <div className="flex min-h-[140px] flex-col items-center justify-center rounded-none border border-dashed border-slate-300 bg-white px-6 text-center shadow-2xs">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900">No matching services found</p>
              <p className="mt-1 max-w-md text-xs text-slate-500">Try searching for a different keyword or browse all services.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {featuredServices.map((service) => (
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

        {/* Activity & Quick Actions Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="rounded-none border-slate-200 bg-white shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-300 hover:border-slate-300">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 md:text-base">Recent Booking Activity</CardTitle>
                <CardDescription className="text-xs text-slate-500 font-medium">Latest requests from your account</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-none border-slate-300 text-xs font-bold uppercase tracking-wider hover:border-[#081F5C] hover:text-[#081F5C] shadow-2xs"
                onClick={() => void loadBookings()}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Refresh'}
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="py-8 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Loading bookings...</div>
              ) : recentBookings.length === 0 ? (
                <div className="rounded-none border border-dashed border-slate-300 p-6 text-center text-xs font-medium text-slate-600 shadow-2xs">
                  You don&apos;t have any booking requests yet. Start by browsing Find Services.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="rounded-none border border-slate-200 bg-white p-3.5 shadow-2xs transition-all hover:border-[#081F5C] hover:shadow-[0_4px_12px_rgba(8,31,92,0.14)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900 truncate uppercase tracking-wide">{booking.serviceName}</p>
                        {statusBadge(booking.status)}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 truncate font-medium">{booking.shopName} · {booking.ref || 'No reference'}</p>
                      <p className="text-xs text-slate-500 mt-1 font-medium">Schedule: {formatDateShort(booking.date)} {booking.preferredTime ? `· ${booking.preferredTime}` : ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-none border-slate-200 bg-white shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-300 hover:border-slate-300">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 md:text-base">Quick Actions</CardTitle>
              <CardDescription className="text-xs text-slate-500 font-medium">Common tasks for customer role</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-2.5">
              {[
                { label: 'Find Services', desc: 'Browse shops and service offers', icon: Store, to: '#/customer/find-services', tone: 'blue' },
                { label: 'My Bookings', desc: 'Track request status and schedule', icon: CalendarDays, to: '#/customer/my-bookings', tone: 'purple' },
                { label: 'Messages', desc: 'Chat with shops and mechanics', icon: MessageCircleMore, to: '#/customer/messages', tone: 'emerald' },
                { label: 'Reviews & Ratings', desc: 'Rate completed service requests', icon: Star, to: '#/customer/reviews-ratings', tone: 'amber' },
                { label: 'Account Settings', desc: 'Update profile and account details', icon: User, to: '#/customer/account-settings', tone: 'slate' },
              ].map((action) => (
                <button
                  type="button"
                  key={action.label}
                  onClick={() => { window.location.hash = action.to }}
                  className="w-full flex items-center justify-between rounded-none border border-slate-200 bg-white px-3.5 py-2.5 text-left shadow-2xs hover:shadow-[0_4px_12px_rgba(8,31,92,0.14)] hover:border-[#081F5C] transition-all group"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className={`h-9 w-9 rounded-none bg-linear-to-r ${quickActionIconTone(action.tone)} grid place-items-center text-white shrink-0 shadow-2xs`}>
                      <action.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-900 truncate group-hover:text-[#081F5C] transition-colors">{action.label}</span>
                      <span className="block text-xs text-slate-500 truncate font-medium">{action.desc}</span>
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-[#081F5C] group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>
    </CustomerLayout>
  )
}

export default CustomerDashboard
