import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import {
  Bell,
  Bike,
  CalendarDays,
  ChevronRight,
  Clock3,
  MapPin,
  Package,
  Loader2,
  LogOut,
  MessageCircleMore,
  Settings,
  Smartphone,
  Star,
  Store,
  Truck,
  User,
  WashingMachine,
  Wrench
} from 'lucide-react'
import logoEpaayos from '../../assets/epaayosLOGO.png'
import {
  NotificationBellIndicator,
  useCustomerNotificationUnreadCount,
} from '../../components/notifications/NotificationFeed.jsx'
import { useLogoutConfirmation } from '../../hooks/useLogoutConfirmation.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

const STAT_CARD_GRADIENT = {
  services: 'bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6]',
  active: 'bg-linear-to-br from-emerald-600 via-teal-600 to-emerald-800',
  inactive: 'bg-linear-to-br from-slate-600 via-slate-700 to-slate-900',
  booked: 'bg-linear-to-br from-sky-500 via-blue-500 to-indigo-600',
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

function mapServiceFromApi(row) {
  if (!row?.id) return null
  return {
    id: String(row.id),
    shopName: row.shopName || 'Shop',
    shopRating: Number(row.shopRating || 0),
    shopAddress: row.shopAddress || 'Address not specified',
    category: row.category || 'Others',
    serviceName: row.serviceName || 'Service',
    subcategory: row.subcategory || '',
    completedJobs: Number(row.completedJobs || 0),
    type: row.type || 'in-shop',
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

function categoryIconForService(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return Bike
  if (normalized === 'gadget') return Smartphone
  if (normalized === 'appliance') return WashingMachine
  return Wrench
}

function categoryIconShellClass(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return 'from-sky-600 to-blue-700'
  if (normalized === 'gadget') return 'from-violet-600 to-fuchsia-600'
  if (normalized === 'appliance') return 'from-emerald-600 to-teal-600'
  if (normalized === 'others') return 'from-amber-500 to-orange-500'
  return 'from-slate-600 to-slate-700'
}

function statusBadge(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'completed') {
    return <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-900">Completed</Badge>
  }
  if (s === 'working') {
    return <Badge className="border-violet-500/35 bg-violet-500/10 text-violet-900">Working</Badge>
  }
  if (s === 'confirmed') {
    return <Badge className="border-sky-500/35 bg-sky-500/10 text-sky-900">Confirmed</Badge>
  }
  if (s === 'cancelled' || s === 'canceled') {
    return <Badge className="border-rose-500/30 bg-rose-500/10 text-rose-900">Cancelled</Badge>
  }
  return <Badge className="border-amber-500/35 bg-amber-500/10 text-amber-900">Pending</Badge>
}

function StatGradientCard({ label, value, icon: Icon, variant, helper }) {
  const gradient = STAT_CARD_GRADIENT[variant] ?? STAT_CARD_GRADIENT.services
  return (
    <div
      className={`relative min-h-[112px] min-w-0 overflow-hidden rounded-2xl border border-white/15 p-5 shadow-md transition-shadow duration-300 hover:shadow-lg sm:min-h-[128px] sm:p-6 ${gradient}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/12 to-transparent" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-white/85">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-white tabular-nums sm:text-3xl">{value}</p>
          {helper ? <p className="mt-1 line-clamp-1 text-[11px] text-white/80">{helper}</p> : null}
        </div>
        <div className="shrink-0 rounded-xl border border-white/25 bg-white/15 p-3 shadow-inner backdrop-blur-sm">
          <Icon className="h-5 w-5 text-white" aria-hidden />
        </div>
      </div>
    </div>
  )
}

function quickActionIconTone(tone) {
  return (
    {
      blue: 'from-[#081F5C] to-[#1447a6]',
      purple: 'from-violet-600 to-purple-700',
      emerald: 'from-emerald-600 to-teal-700',
      amber: 'from-amber-500 to-orange-600',
      slate: 'from-slate-600 to-slate-800',
    }[tone] || 'from-[#081F5C] to-[#1447a6]'
  )
}

function CustomerDashboard() {
  const [user, setUser] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [catalogServices, setCatalogServices] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const profileMenuRef = useRef(null)

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
      const rows = Array.isArray(data) ? data : []
      setCatalogServices(rows.map(mapServiceFromApi).filter(Boolean))
    } catch (e) {
      setCatalogServices([])
      setCatalogError(e?.message || 'Could not load services.')
    } finally {
      setCatalogLoading(false)
    }
  }, [])

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
    void loadBookings()
  }, [user, loadBookings])

  useEffect(() => {
    if (!user) return
    void loadCatalog()
  }, [user, loadCatalog])

  const { unreadCount: customerNotifUnread } = useCustomerNotificationUnreadCount(user)

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
    return [...catalogServices]
      .sort((a, b) => (b.shopRating || 0) - (a.shopRating || 0))
      .slice(0, 6)
  }, [catalogServices])

  const featuredShops = useMemo(() => {
    const map = new Map()
    for (const s of catalogServices) {
      const key = s.shopName
      if (!key) continue
      const current = map.get(key)
      if (!current || s.shopRating > current.shopRating) {
        map.set(key, s)
      }
    }
    return [...map.values()].sort((a, b) => b.shopRating - a.shopRating).slice(0, 5)
  }, [catalogServices])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.hash = '#/'
  }

  const { requestLogout, LogoutDialog } = useLogoutConfirmation(handleLogout)

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-sky-50 via-violet-50 to-indigo-100">
        <p className="text-gray-600 text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-sky-50 via-violet-50 to-indigo-100">
      <header className="sticky top-0 z-20 border-b border-blue-100/80 bg-white/90 backdrop-blur-md shadow-[0_2px_14px_rgba(8,31,92,0.06)]">
        <div className="w-full px-10 sm:px-14 md:px-20 py-3 flex items-center gap-4">
          <div className="flex items-center gap-5 shrink-0">
            <button
              type="button"
              className="flex items-center"
              aria-label="E-Paayos customer dashboard"
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
                className="text-sm font-semibold text-blue-900 transition-colors"
                onClick={() => { window.location.hash = '#/customer/dashboard' }}
              >
                Home
              </button>
              <button
                type="button"
                className="text-sm font-semibold text-blue-900/80 hover:text-blue-700 transition-colors"
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

      <main className="w-full px-6 sm:px-10 md:px-14 lg:px-20 pt-4 pb-5 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Welcome back{user.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
          </h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            Here's what's happening with your service requests today.
          </p>
        </div>

        {(listError || catalogError) ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span>{listError || catalogError}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => { void loadBookings(); void loadCatalog() }} disabled={loading || catalogLoading}>
              Retry
            </Button>
          </div>
        ) : null}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Featured Shops</h2>
            <button type="button" className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1" onClick={() => { window.location.hash = '#/customer/find-services' }}>
              View all <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {(catalogLoading ? Array.from({ length: 4 }).map((_, i) => ({ id: `skeleton-${i}` })) : featuredShops).map((shop) => (
              <Card key={shop.id} className="min-w-[260px] border-gray-200/90 shadow-sm">
                <CardContent className="pt-5">
                  {catalogLoading ? (
                    <div className="animate-pulse flex gap-3">
                      <div className="h-12 w-12 shrink-0 rounded-xl bg-gray-200" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-4 rounded bg-gray-200" />
                        <div className="h-3 w-2/3 rounded bg-gray-200" />
                        <div className="h-3 w-1/2 rounded bg-gray-200" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-3">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-sm font-bold leading-none text-white shadow-inner ring-1 ring-white/20"
                          aria-hidden
                        >
                          {initialsFromShopName(shop.shopName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-gray-900 leading-snug line-clamp-2">{shop.shopName}</p>
                            <Badge className="shrink-0 border-yellow-300 bg-yellow-100 text-yellow-900">{shop.shopRating.toFixed(1)} ★</Badge>
                          </div>
                          <p className="mt-1 text-xs text-gray-500 truncate">{shop.category}</p>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-gray-600 line-clamp-2 inline-flex items-start gap-1.5">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {shop.shopAddress}
                      </p>
                      <p className="mt-2 text-xs text-gray-600">{shop.completedJobs} completed job(s)</p>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Featured Services</h2>
            <button type="button" className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1" onClick={() => { window.location.hash = '#/customer/find-services' }}>
              Browse <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {(catalogLoading ? Array.from({ length: 5 }).map((_, i) => ({ id: `service-skeleton-${i}` })) : featuredServices).map((service) => {
              const CategoryIcon = categoryIconForService(service.category)
              const iconShell = categoryIconShellClass(service.category)
              return (
              <Card key={service.id} className="min-w-[280px] border-gray-200/90 shadow-sm">
                <CardContent className="pt-5">
                  {catalogLoading ? (
                    <div className="animate-pulse flex gap-3">
                      <div className="h-11 w-11 shrink-0 rounded-xl bg-gray-200" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-4 rounded bg-gray-200" />
                        <div className="h-3 w-2/3 rounded bg-gray-200" />
                        <div className="h-3 w-1/2 rounded bg-gray-200" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ${iconShell} text-white shadow-inner ring-1 ring-white/25`}
                          aria-hidden
                        >
                          <CategoryIcon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 leading-snug line-clamp-2">{service.serviceName}</p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{service.shopName}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <Badge variant="outline">{service.category}</Badge>
                        <Badge className="border-yellow-300 bg-yellow-100 text-yellow-900">{service.shopRating.toFixed(1)} ★</Badge>
                      </div>
                      <p className="mt-2 text-xs text-gray-600 line-clamp-2">{service.subcategory || 'General service'}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        onClick={() => { window.location.hash = `#/customer/shop/${encodeURIComponent(service.id)}` }}
                      >
                        View Service
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-[#081F5C]/10 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Booking Activity</CardTitle>
                <CardDescription>Latest requests from your account</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => void loadBookings()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-sm text-gray-500">Loading bookings...</div>
              ) : recentBookings.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#081F5C]/20 p-6 text-center text-sm text-gray-600">
                  Wala ka pang booking request. Start ka sa Find Services.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentBookings.map((booking) => (
                    <div key={booking.id} className="rounded-lg border border-violet-200 bg-linear-to-r from-purple-50 to-blue-50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{booking.serviceName}</p>
                        {statusBadge(booking.status)}
                      </div>
                      <p className="text-xs text-gray-600 mt-1 truncate">{booking.shopName} · {booking.ref || 'No reference'}</p>
                      <p className="text-xs text-gray-500 mt-1">Schedule: {formatDateShort(booking.date)} {booking.preferredTime ? `· ${booking.preferredTime}` : ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-[#081F5C]/10 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <CardDescription>Common tasks for customer role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
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
                  className="w-full flex items-center justify-between rounded-xl border border-violet-200 bg-linear-to-r from-purple-50 to-blue-50 px-3 py-2.5 text-left hover:from-purple-100 hover:to-blue-100"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className={`h-9 w-9 rounded-lg bg-linear-to-r ${quickActionIconTone(action.tone)} grid place-items-center text-white`}>
                      <action.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-900 truncate">{action.label}</span>
                      <span className="block text-xs text-gray-600 truncate">{action.desc}</span>
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
      {LogoutDialog}
    </div>
  )
}

export default CustomerDashboard
