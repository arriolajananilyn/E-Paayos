import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import {
  Bell,
  Bike,
  Calendar,
  ChevronDown,
  FileText,
  Home,
  Loader2,
  LogOut,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Settings,
  Smartphone,
  Star,
  User,
  WashingMachine,
  Wrench,
} from 'lucide-react'
import logoEpaayos from '../../assets/epaayosLOGO.png'
import {
  NotificationBellIndicator,
  useCustomerNotificationUnreadCount,
} from '../../components/notifications/NotificationFeed.jsx'
import { useLogoutConfirmation } from '../../hooks/useLogoutConfirmation.jsx'
import { SERVICE_TYPES } from './findServices.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

/**
 * Tabs match E-Paayos booking workflow (see `bookingModel.js`: pending → confirmed → working → completed, or cancelled).
 */
const BOOKING_TABS = ['All bookings', 'Pending', 'Confirmed', 'Working', 'Completed', 'Cancelled']

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/** Normalizes `GET /api/catalog/bookings` rows for this page. */
function mapBookingFromApi(row) {
  if (!row || !row.id) return null
  return {
    id: String(row.id),
    ref: String(row.ref || ''),
    shopServiceId: String(row.shopServiceId || ''),
    serviceName: row.serviceName || 'Service',
    shopName: row.shopName || 'Shop',
    category: row.category || '',
    subcategory: row.subcategory || '',
    listingType: row.listingType || 'in-shop',
    serviceMode: row.serviceMode === 'home' ? 'home' : 'in-shop',
    contactName: row.contactName || '',
    contactPhone: row.contactPhone || '',
    date: row.date || '',
    preferredTime: row.preferredTime || '',
    serviceAddress: row.serviceAddress || '',
    issuePhotos: Array.isArray(row.issuePhotos) ? row.issuePhotos.filter(Boolean) : [],
    problemDescription: row.problemDescription || '',
    notes: row.notes || '',
    status: String(row.status || 'pending').toLowerCase(),
    rejectionReason: row.rejectionReason || '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function resolveIssuePhotoSrc(src) {
  const value = String(src ?? '').trim()
  if (!value) return ''
  if (/^(data:|blob:)/i.test(value)) return value
  if (value.startsWith('/uploads/')) return `${API_URL}${value}`
  if (/^https?:\/\//i.test(value)) {
    // Best-effort remap legacy localhost URLs to configured API base.
    try {
      const parsed = new URL(value)
      const host = (parsed.hostname || '').toLowerCase()
      if (host === 'localhost' || host === '127.0.0.1') {
        const api = new URL(API_URL)
        parsed.protocol = api.protocol
        parsed.host = api.host
        return parsed.toString()
      }
    } catch {
      // ignore
    }
    return value
  }
  return value
}

function IssuePhotoThumb({ src, label, size = 'sm' }) {
  const [failed, setFailed] = useState(false)
  const resolvedSrc = resolveIssuePhotoSrc(src)
  const boxClass = size === 'lg' ? 'h-20 w-20' : 'h-16 w-16'

  return (
    <a href={resolvedSrc || '#'} target="_blank" rel="noopener noreferrer" className="group block" title={label}>
      <div
        className={`relative ${boxClass} overflow-hidden rounded-md border border-[#081F5C]/20 bg-slate-100 dark:border-white/15 dark:bg-slate-800/60`}
      >
        {!failed ? (
          <img
            src={resolvedSrc}
            alt={label}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.05]"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-medium text-slate-600 dark:text-slate-300">
            No preview
          </div>
        )}
      </div>
    </a>
  )
}

const selectShell =
  'h-9 w-full appearance-none rounded-lg border border-[#081F5C]/15 bg-white/95 px-3 py-2 pr-8 text-xs sm:text-sm shadow-sm outline-none focus-visible:border-[#1447a6]/50 focus-visible:ring-2 focus-visible:ring-[#081F5C]/20 dark:border-white/10 dark:bg-[#04133d]/30'

function statusBadge(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'completed') {
    return (
      <Badge className="shrink-0 border border-emerald-500/30 bg-emerald-500/10 text-[11px] font-medium text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200">
        Completed
      </Badge>
    )
  }
  if (s === 'cancelled' || s === 'canceled') {
    return (
      <Badge className="shrink-0 border border-rose-500/30 bg-rose-500/10 text-[11px] font-medium text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200">
        Cancelled
      </Badge>
    )
  }
  if (s === 'confirmed') {
    return (
      <Badge className="shrink-0 border border-sky-500/30 bg-sky-500/10 text-[11px] font-medium text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-200">
        Confirmed
      </Badge>
    )
  }
  if (s === 'working') {
    return (
      <Badge className="shrink-0 border border-violet-500/35 bg-violet-500/12 text-[11px] font-medium text-violet-900 dark:border-violet-400/40 dark:bg-violet-950/40 dark:text-violet-200">
        Working
      </Badge>
    )
  }
  return (
    <Badge className="shrink-0 border border-amber-500/30 bg-amber-500/10 text-[11px] font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200">
      Pending
    </Badge>
  )
}

function bookingProgressHint(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'pending') return 'Waiting for the shop to accept this request.'
  if (s === 'confirmed') return 'The shop confirmed your booking — they will start when ready.'
  if (s === 'working') return 'Your service is in progress.'
  if (s === 'completed') return 'This job is completed.'
  if (s === 'cancelled' || s === 'canceled') return 'This request was cancelled.'
  return ''
}

function bookingMatchesTab(activeTab, b) {
  if (activeTab === 'All bookings') return true
  const s = String(b.status || '').toLowerCase()
  if (activeTab === 'Pending') return s === 'pending'
  if (activeTab === 'Confirmed') return s === 'confirmed'
  if (activeTab === 'Working') return s === 'working'
  if (activeTab === 'Completed') return s === 'completed'
  if (activeTab === 'Cancelled') return s === 'cancelled' || s === 'canceled'
  return true
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

/** How the customer chose to receive service (matches booking form). */
function serviceModeBadge(mode) {
  const label = SERVICE_TYPES.find((x) => x.value === mode)?.label ?? '—'
  return (
    <Badge variant="outline" className="border-[#081F5C]/15 bg-white/90 text-[11px] font-medium text-[#081F5C] dark:border-white/10 dark:bg-white/5 dark:text-blue-100">
      {label}
    </Badge>
  )
}

/** Catalog listing type on Service Details (home / in-shop / both). */
function listingTypeBadge(listingType) {
  const label = SERVICE_TYPES.find((x) => x.value === listingType)?.label ?? '—'
  return (
    <Badge variant="outline" className="border-[#081F5C]/12 bg-slate-50/90 text-[10px] font-medium text-muted-foreground dark:border-white/10 dark:bg-white/5">
      Listing: {label}
    </Badge>
  )
}

function formatPreferredTime12h(hm) {
  const s = String(hm ?? '').trim()
  const m = s.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
  if (!m) return s || '—'
  let h = parseInt(m[1], 10)
  const mins = m[2]
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${mins} ${ap}`
}

function formatPreferredDateLong(ymd) {
  const str = String(ymd ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return str || '—'
  const d = new Date(`${str}T12:00:00`)
  if (Number.isNaN(d.getTime())) return str
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

function formatSubmittedLine(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${date} · ${time}`
}

function parseBookingDate(b) {
  const d = `${b.date}T12:00:00`
  const t = Date.parse(d)
  return Number.isFinite(t) ? t : 0
}

function parseDateOnly(str) {
  if (!str || typeof str !== 'string') return null
  const [y, m, d] = str.split('-').map(Number)
  if (!y || !m || !d) return null
  const dt = new Date(y, m - 1, d)
  return Number.isFinite(dt.getTime()) ? dt : null
}

function bookingMatchesDateFilter(b, dateFilter) {
  if (dateFilter === 'All') return true
  const bookingDate = parseDateOnly(b.date)
  if (!bookingDate) return true
  const now = new Date()
  const startOfDay = (d) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
  }
  const endOfDay = (d) => {
    const x = new Date(d)
    x.setHours(23, 59, 59, 999)
    return x
  }
  const startOfWeek = (d) => {
    const dt = new Date(d)
    const day = (dt.getDay() + 6) % 7
    dt.setHours(0, 0, 0, 0)
    dt.setDate(dt.getDate() - day)
    return dt
  }
  const endOfWeek = (d) => {
    const s = startOfWeek(d)
    const e = new Date(s)
    e.setDate(s.getDate() + 7)
    return e
  }
  const startOfMonth = (d) => {
    const dt = new Date(d.getFullYear(), d.getMonth(), 1)
    dt.setHours(0, 0, 0, 0)
    return dt
  }
  const endOfMonth = (d) => {
    const dt = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    dt.setHours(0, 0, 0, 0)
    return dt
  }

  if (dateFilter === 'Today') {
    return bookingDate >= startOfDay(now) && bookingDate <= endOfDay(now)
  }
  if (dateFilter === 'Yesterday') {
    const y = new Date(now)
    y.setDate(now.getDate() - 1)
    return bookingDate >= startOfDay(y) && bookingDate <= endOfDay(y)
  }
  if (dateFilter === 'This Week') {
    return bookingDate >= startOfWeek(now) && bookingDate < endOfWeek(now)
  }
  if (dateFilter === 'Last Week') {
    const last = new Date(now)
    last.setDate(now.getDate() - 7)
    return bookingDate >= startOfWeek(last) && bookingDate < endOfWeek(last)
  }
  if (dateFilter === 'This Month') {
    return bookingDate >= startOfMonth(now) && bookingDate < endOfMonth(now)
  }
  if (dateFilter === 'Last Month') {
    const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return bookingDate >= startOfMonth(lastM) && bookingDate < endOfMonth(lastM)
  }
  return true
}

function BookingsSearchBar({ value, onChange }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="relative h-9 w-full min-w-0 shrink-0">
        <Input
          className="h-9 w-full min-w-0 rounded-lg border-[#081F5C]/15 bg-white/95 pr-12 pl-4 text-sm shadow-sm focus-visible:border-[#1447a6]/45 focus-visible:ring-[#081F5C]/15 dark:border-white/10 dark:bg-[#04133d]/25"
          placeholder="Search by service, shop, or reference…"
          value={value}
          onChange={onChange}
          aria-label="Search bookings"
        />
        <Button
          type="button"
          size="icon-sm"
          className="pointer-events-none absolute top-1/2 right-1.5 z-10 h-7 w-7 -translate-y-1/2 rounded-md bg-linear-to-r from-[#081F5C] to-[#1447a6] p-0 shadow-sm"
          aria-hidden
          tabIndex={-1}
        >
          <Search className="h-4 w-4 text-white" />
        </Button>
      </div>
    </div>
  )
}

function CustomerMyBookings() {
  const [user, setUser] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileMenuRef = useRef(null)

  const [activeTab, setActiveTab] = useState('All bookings')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('All')
  const [sortBy, setSortBy] = useState('soonest')
  const [q, setQ] = useState('')
  const [viewing, setViewing] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  const loadBookings = useCallback(async () => {
    setListError('')
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        window.location.hash = '#/login'
        return
      }
      const res = await fetch(`${API_URL}/api/catalog/bookings`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || 'Could not load your bookings.')
      }
      const raw = Array.isArray(data?.bookings) ? data.bookings : []
      setBookings(raw.map(mapBookingFromApi).filter(Boolean))
    } catch (e) {
      setBookings([])
      setListError(e?.message || 'Could not load bookings.')
    } finally {
      setLoading(false)
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
    void loadBookings()
  }, [user, loadBookings])

  useEffect(() => {
    if (!user) return
    const onFocus = () => {
      void loadBookings()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [user, loadBookings])

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

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()

    const base = bookings.filter((b) => {
      if (!bookingMatchesTab(activeTab, b)) return false
      if (categoryFilter && String(b.category || '').trim().toLowerCase() !== categoryFilter.trim().toLowerCase()) return false
      if (!bookingMatchesDateFilter(b, dateFilter)) return false
      if (!query) return true
      const hay =
        `${b.serviceName} ${b.shopName} ${b.ref} ${b.category} ${b.subcategory ?? ''} ${b.problemDescription} ${b.notes} ${b.contactName} ${b.contactPhone} ${b.rejectionReason ?? ''}`.toLowerCase()
      return hay.includes(query)
    })

    const sorted = [...base]
    switch (sortBy) {
      case 'newest-request':
        sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        break
      case 'last-updated':
        sorted.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
        break
      case 'soonest':
      default:
        sorted.sort((a, b) => parseBookingDate(a) - parseBookingDate(b))
        break
    }
    return sorted
  }, [bookings, activeTab, categoryFilter, dateFilter, q, sortBy])

  const { unreadCount: customerNotifUnread } = useCustomerNotificationUnreadCount(user)

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-sky-50 via-violet-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-sky-50/40 to-indigo-100/80 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="sticky top-0 z-20 border-b border-[#081F5C]/10 bg-white/90 backdrop-blur-md shadow-[0_2px_14px_rgba(8,31,92,0.06)] dark:border-white/10 dark:bg-slate-950/85">
        <div className="w-full px-10 sm:px-14 md:px-20 py-3 flex items-center gap-4">
          <div className="flex items-center gap-5 shrink-0">
            <button
              type="button"
              className="flex items-center"
              aria-label="E-Paayos customer my bookings"
              onClick={() => {
                sessionStorage.setItem('customerDashboardMenu', 'home')
                window.location.hash = '#/customer/dashboard'
              }}
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
                className="text-sm font-semibold text-[#081F5C]/80 hover:text-[#081F5C] transition-colors dark:text-blue-200/85 dark:hover:text-blue-100"
                onClick={() => {
                  sessionStorage.setItem('customerDashboardMenu', 'home')
                  window.location.hash = '#/customer/dashboard'
                }}
              >
                Home
              </button>
              <button
                type="button"
                className="text-sm font-semibold text-[#081F5C]/80 hover:text-[#081F5C] transition-colors dark:text-blue-200/85 dark:hover:text-blue-100"
                onClick={() => {
                  window.location.hash = '#/customer/find-services'
                }}
              >
                Find Services
              </button>
              <span className="text-sm font-semibold text-[#081F5C] dark:text-blue-100">My Bookings</span>
              <button
                type="button"
                className="text-sm font-semibold text-[#081F5C]/80 hover:text-[#081F5C] transition-colors dark:text-blue-200/85 dark:hover:text-blue-100"
                onClick={() => {
                  window.location.hash = '#/customer/messages'
                }}
              >
                Messages
              </button>
            </div>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              aria-label="Notification"
              onClick={() => {
                window.location.hash = '#/customer/notification'
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#081F5C] transition-colors hover:bg-[#081F5C]/8 dark:text-blue-200 dark:hover:bg-white/10"
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
                  profileOpen ? 'bg-[#081F5C]/8 text-[#081F5C] dark:bg-white/10' : 'bg-transparent text-[#081F5C] hover:bg-[#081F5C]/8 dark:text-blue-200 dark:hover:bg-white/10'
                }`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-sm font-semibold leading-none text-white">
                  {(user.fullName || user.email || 'C').charAt(0).toUpperCase()}
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-md border border-border/80 bg-white shadow-lg dark:bg-slate-900 dark:border-white/10">
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

      <main className="w-full min-w-0 overflow-x-hidden px-6 sm:px-10 md:px-14 lg:px-20 pt-4 pb-5 space-y-4">
        {listError ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span>{listError}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadBookings()} disabled={loading}>
              Retry
            </Button>
          </div>
        ) : null}

        <div
          className="mb-1 flex w-full items-stretch overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 shadow-sm sm:overflow-visible dark:border-white/10 dark:bg-slate-900/90"
          role="tablist"
          aria-label="Booking status"
        >
          {BOOKING_TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={activeTab === t}
              onClick={() => setActiveTab(t)}
              className={`flex-none whitespace-nowrap rounded-md px-3 py-2 text-center text-xs transition-colors sm:flex-1 sm:px-4 sm:text-sm ${
                activeTab === t
                  ? 'bg-linear-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] text-white shadow-sm ring-1 ring-[#081F5C]/25 dark:from-[#04133d] dark:via-[#081F5C] dark:to-[#2a63cc]'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mb-1 flex min-w-0 w-full max-w-full flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative min-w-[200px]">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pr-8 pl-3 text-sm text-gray-500 shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"
                aria-label="Filter by category"
              >
                <option value="">All categories</option>
                <option value="Appliance">Appliance</option>
                <option value="Gadget">Gadget</option>
                <option value="Vehicle">Vehicle</option>
                <option value="Others">Others</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3 w-3 -translate-y-1/2 text-gray-500" />
            </div>
            <div className="relative min-w-[200px]">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="h-9 w-full appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pr-8 pl-3 text-sm text-gray-500 shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-white/10 dark:bg-slate-900 dark:text-slate-300"
                aria-label="Filter by date"
              >
                <option value="All">All dates</option>
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="This Week">This week</option>
                <option value="Last Week">Last week</option>
                <option value="This Month">This month</option>
                <option value="Last Month">Last month</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3 w-3 -translate-y-1/2 text-gray-500" />
            </div>
            <div className="relative min-w-[200px]">
              <select
                className={`${selectShell} h-9 py-1.5! text-sm text-neutral-900 dark:text-neutral-100`}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort bookings"
              >
                <option value="soonest">Sort: Soonest date</option>
                <option value="newest-request">Sort: Newest request</option>
                <option value="last-updated">Sort: Last updated (status changes)</option>
              </select>
              <Calendar className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>
          <div className="w-full min-w-60 sm:w-1/2 sm:max-w-md sm:flex-1">
            <BookingsSearchBar value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        <div className="min-w-0 max-w-full space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[#081F5C] dark:text-slate-50">Your booking requests</p>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                {loading
                  ? 'Loading your requests from the server…'
                  : bookings.length === 0
                    ? 'Book a service from Service Details — your requests appear here for you and the shop (Service requests).'
                    : filtered.length === bookings.length
                      ? `Showing all ${bookings.length} request${bookings.length === 1 ? '' : 's'}.`
                      : `Showing ${filtered.length} of ${bookings.length} requests.`}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 border-[#081F5C]/15 text-xs text-[#081F5C] sm:text-sm dark:border-white/10 dark:text-blue-100"
                onClick={() => void loadBookings()}
                disabled={loading}
              >
                <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
                Refresh
              </Button>
              <Button
                type="button"
                onClick={() => {
                  window.location.hash = '#/customer/find-services'
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-linear-to-r from-[#081F5C] to-[#1447a6] px-3 py-2 text-xs font-medium text-white shadow-sm hover:opacity-95 sm:text-sm"
              >
                <Search className="h-4 w-4" />
                Find services
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center dark:border-white/15 dark:bg-[#020818]">
              <Loader2 className="h-8 w-8 animate-spin text-[#081F5C] dark:text-blue-300" aria-hidden />
              <p className="mt-3 text-sm font-medium text-foreground">Loading bookings…</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">Same data your shop sees under Service requests.</p>
            </div>
          ) : bookings.length === 0 ? (
            listError ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Use <span className="font-medium text-foreground">Retry</span> above to load your list.</p>
            ) : (
              <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm ring-1 ring-black/2 dark:border-white/15 dark:bg-[#020818] dark:ring-white/5">
                <p className="text-sm font-medium text-foreground">No booking requests yet</p>
                <p className="mt-1 max-w-md text-xs text-muted-foreground">
                  Use <span className="font-medium text-foreground">Book Now</span> on a service page — your request will show here and on the shop&apos;s Service requests page.
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    window.location.hash = '#/customer/find-services'
                  }}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-linear-to-r from-[#081F5C] to-[#1447a6] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-95"
                >
                  Browse services
                </Button>
              </div>
            )
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm ring-1 ring-black/2 dark:border-white/15 dark:bg-[#020818] dark:ring-white/5">
              <p className="text-sm font-medium text-foreground">No bookings match</p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">Try clearing filters or search, or book a new service.</p>
              <Button
                type="button"
                onClick={() => {
                  setActiveTab('All bookings')
                  setCategoryFilter('')
                  setDateFilter('All')
                  setQ('')
                  window.location.hash = '#/customer/find-services'
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-linear-to-r from-[#081F5C] to-[#1447a6] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-95"
              >
                Browse services
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((b) => {
                const CategoryIcon = categoryIcon(b.category)
                return (
                  <Card
                    key={b.id}
                    className="gap-0 overflow-hidden rounded-2xl border border-[#081F5C]/10 bg-white/95 py-0 shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:border-[#1447a6]/30 hover:shadow-md dark:border-white/10 dark:bg-[#020818]/95 dark:ring-white/5"
                  >
                    <CardContent className="space-y-2 px-3 py-3 sm:space-y-2.5 sm:px-4 sm:py-3.5">
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3">
                          <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#081F5C]/12 text-[#081F5C] sm:h-11 sm:w-11 dark:bg-[#081F5C]/20 dark:text-sky-200">
                            <CategoryIcon className="h-5 w-5" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <p className="min-w-0 truncate text-base font-semibold leading-snug text-foreground sm:text-lg">{b.serviceName}</p>
                              <div className="shrink-0">{statusBadge(b.status)}</div>
                            </div>
                            <p className="mt-0.5 truncate text-sm font-semibold text-[#04133d] dark:text-slate-100">{b.shopName}</p>
                            {b.subcategory?.trim() ? (
                              <p className="text-sm text-muted-foreground">{b.subcategory.trim()}</p>
                            ) : null}
                            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1.5 sm:gap-x-2 sm:gap-y-2">
                              <Badge className={categoryBadgeClass(b.category)}>{b.category || '—'}</Badge>
                              {serviceModeBadge(b.serviceMode)}
                              {listingTypeBadge(b.listingType)}
                              <Badge
                                variant="outline"
                                className="border-[#081F5C]/15 bg-white/90 font-mono text-[10px] text-[#081F5C] dark:border-white/10 dark:bg-white/5 dark:text-blue-100"
                              >
                                {b.ref}
                              </Badge>
                            </div>
                            {bookingProgressHint(b.status) ? (
                              <p className="mt-2 border-l-2 border-[#081F5C]/20 pl-2.5 text-xs leading-snug text-muted-foreground dark:border-sky-500/25">
                                {bookingProgressHint(b.status)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="shrink-0 text-right" title={formatSubmittedLine(b.createdAt)}>
                          <p className="text-xs leading-tight sm:text-sm">
                            <span className="font-semibold text-muted-foreground">Submitted: </span>
                            <span className="whitespace-nowrap font-normal tabular-nums text-foreground/90">
                              {formatSubmittedLine(b.createdAt)}
                            </span>
                          </p>
                        </div>
                      </div>

                      <p className="flex gap-2.5 text-sm leading-relaxed text-foreground">
                        <FileText
                          className="mt-0.5 h-4 w-4 shrink-0 text-[#081F5C]/65 dark:text-sky-300/75"
                          aria-hidden
                        />
                        <span className="min-w-0 line-clamp-3">{b.problemDescription || '—'}</span>
                      </p>
                      {Array.isArray(b.issuePhotos) && b.issuePhotos.length > 0 ? (
                        <div className="pl-7">
                          <p className="mb-1.5 text-xs font-semibold text-[#081F5C] dark:text-slate-100">
                            Uploaded issue photo{b.issuePhotos.length === 1 ? '' : 's'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {b.issuePhotos.slice(0, 6).map((src, photoIndex) => (
                              <IssuePhotoThumb key={`${b.id}-photo-${photoIndex}`} src={src} label={`Issue photo ${photoIndex + 1}`} />
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {b.notes?.trim() ? (
                        <p className="pl-7 text-xs leading-snug text-muted-foreground">
                          <span className="font-medium text-foreground/80">Additional notes:</span> {b.notes.trim()}
                        </p>
                      ) : null}

                      <div className="border-t border-[#081F5C]/10 pt-2.5 dark:border-white/10">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                          <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
                            <User className="h-3.5 w-3.5 shrink-0 text-[#081F5C]/65 dark:text-sky-300/75" aria-hidden />
                            <span className="truncate font-medium text-foreground">{b.contactName}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 tabular-nums text-muted-foreground">
                            <Phone className="h-3.5 w-3.5 shrink-0 text-[#081F5C]/65 dark:text-sky-300/75" aria-hidden />
                            {b.contactPhone}
                          </span>
                        </div>
                      </div>

                      <div className="-mx-3 flex flex-col gap-3 border-t border-dashed border-[#081F5C]/12 bg-slate-50/50 px-3 py-3 dark:border-white/10 dark:bg-white/4 sm:-mx-4 sm:px-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 text-xs text-muted-foreground sm:text-sm">
                          <span className="inline-flex items-center gap-2 font-medium text-foreground">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-[#081F5C]/10 dark:bg-slate-900 dark:ring-white/10">
                              <Calendar className="h-4 w-4 text-[#081F5C] dark:text-blue-200" aria-hidden />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[11px] font-normal text-muted-foreground sm:text-xs">Preferred schedule</span>
                              <span className="text-sm tabular-nums sm:text-[15px]">
                                {formatPreferredDateLong(b.date)}{' '}
                                <span className="text-muted-foreground">·</span> {formatPreferredTime12h(b.preferredTime)}
                              </span>
                            </span>
                          </span>
                          {b.serviceMode === 'home' && b.serviceAddress?.trim() ? (
                            <span className="inline-flex min-w-0 max-w-full items-start gap-1.5 sm:max-w-[50%]">
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#081F5C]/60 dark:text-blue-300/70" aria-hidden />
                              <span className="line-clamp-2 text-[11px] leading-snug sm:text-xs">{b.serviceAddress.trim()}</span>
                            </span>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {String(b.status).toLowerCase() === 'completed' ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                className="h-9 gap-1.5 rounded-lg bg-linear-to-r from-[#081F5C] to-[#1447a6] px-3 text-xs text-white shadow-sm hover:opacity-95 sm:text-sm"
                                onClick={() => {
                                  window.location.hash = '#/customer/messages'
                                }}
                              >
                                <MessageCircle className="h-3.5 w-3.5 shrink-0 opacity-95" aria-hidden />
                                Message
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 gap-1.5 rounded-lg border-amber-400/35 bg-linear-to-r from-amber-400 via-yellow-400 to-orange-400 px-3 text-xs text-amber-950 shadow-sm transition-all hover:from-amber-400/90 hover:via-yellow-400/90 hover:to-orange-400/90 focus-visible:ring-2 focus-visible:ring-amber-300/45 dark:border-amber-300/30 dark:from-amber-500 dark:via-yellow-500 dark:to-orange-500 dark:text-amber-950 sm:text-sm"
                                onClick={() => {
                                  window.location.hash = '#/customer/reviews-ratings'
                                }}
                              >
                                <Star className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                Rate Service
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-lg border-[#081F5C]/15 bg-white/90 px-3 text-xs text-[#081F5C] shadow-sm hover:bg-white disabled:pointer-events-none disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-blue-100 sm:text-sm"
                                disabled={!b.shopServiceId?.trim()}
                                onClick={() => {
                                  if (!b.shopServiceId?.trim()) return
                                  window.location.hash = `#/customer/shop/${encodeURIComponent(b.shopServiceId)}`
                                }}
                              >
                                View service
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-lg border-[#081F5C]/15 bg-white/80 px-3 text-xs text-[#081F5C] shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-blue-100 sm:text-sm"
                                onClick={() => setViewing(b)}
                              >
                                Details
                              </Button>
                            </>
                          )}
                          {String(b.status).toLowerCase() !== 'completed' ? (
                            <Button
                              type="button"
                              size="sm"
                              className="h-9 gap-1.5 rounded-lg bg-linear-to-r from-[#081F5C] to-[#1447a6] px-3 text-xs text-white shadow-sm hover:opacity-95 sm:text-sm"
                              onClick={() => {
                                window.location.hash = '#/customer/messages'
                              }}
                            >
                              <MessageCircle className="h-3.5 w-3.5 shrink-0 opacity-95" aria-hidden />
                              Message
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="flex max-h-[calc(100vh-3.5rem)] flex-col gap-4 overflow-hidden sm:max-w-lg" showCloseButton>
          {viewing ? (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle className="pr-6">{viewing.serviceName}</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{viewing.shopName}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-mono text-xs">{viewing.ref}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {statusBadge(viewing.status)}
                      <Badge className={categoryBadgeClass(viewing.category)}>{viewing.category || '—'}</Badge>
                      {serviceModeBadge(viewing.serviceMode)}
                      {listingTypeBadge(viewing.listingType)}
                    </div>
                    {bookingProgressHint(viewing.status) ? (
                      <p className="text-xs leading-snug text-muted-foreground">{bookingProgressHint(viewing.status)}</p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-[#081F5C]/10 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/4">
                    <p className="text-xs font-medium text-muted-foreground">Preferred schedule</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatPreferredDateLong(viewing.date)}{' '}
                      <span className="font-normal text-muted-foreground">at</span> {formatPreferredTime12h(viewing.preferredTime)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#081F5C]/10 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs font-medium text-muted-foreground">Contact on booking</p>
                    <p className="mt-1 text-sm text-foreground">
                      {viewing.contactName} <span className="text-muted-foreground">·</span>{' '}
                      <span className="tabular-nums">{viewing.contactPhone}</span>
                    </p>
                  </div>

                  {viewing.serviceMode === 'home' && viewing.serviceAddress?.trim() ? (
                    <div className="rounded-2xl border border-[#081F5C]/10 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                      <p className="text-xs font-medium text-muted-foreground">Service address</p>
                      <p className="mt-1 flex items-start gap-2 text-sm text-foreground">
                        <Home className="mt-0.5 h-4 w-4 shrink-0 text-[#081F5C]/70 dark:text-blue-300/80" aria-hidden />
                        <span className="whitespace-pre-wrap">{viewing.serviceAddress.trim()}</span>
                      </p>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-[#081F5C]/10 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs font-medium text-muted-foreground">Issue / service description</p>
                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-foreground">{viewing.problemDescription}</p>
                    {Array.isArray(viewing.issuePhotos) && viewing.issuePhotos.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-[#081F5C] dark:text-slate-100">
                          Uploaded issue photo{viewing.issuePhotos.length === 1 ? '' : 's'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {viewing.issuePhotos.slice(0, 6).map((src, photoIndex) => (
                            <IssuePhotoThumb
                              key={`${viewing.id}-details-photo-${photoIndex}`}
                              src={src}
                              label={`Issue photo ${photoIndex + 1}`}
                              size="lg"
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {viewing.notes?.trim() ? (
                    <div className="rounded-2xl border border-[#081F5C]/10 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                      <p className="text-xs font-medium text-muted-foreground">Additional notes</p>
                      <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-foreground">{viewing.notes.trim()}</p>
                    </div>
                  ) : null}

                  {String(viewing.status).toLowerCase() === 'cancelled' && viewing.rejectionReason?.trim() ? (
                    <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-4 dark:border-rose-500/30 dark:bg-rose-950/20">
                      <p className="text-xs font-medium text-rose-800 dark:text-rose-200">Message from the shop</p>
                      <p className="mt-1 text-sm text-rose-900 dark:text-rose-100">{viewing.rejectionReason.trim()}</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <DialogFooter className="shrink-0 gap-2 sm:gap-3">
                <Button type="button" variant="outline" onClick={() => setViewing(null)}>
                  Close
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setViewing(null)
                    window.location.hash = '#/customer/find-services'
                  }}
                >
                  Find services
                </Button>
                <Button
                  type="button"
                  className="bg-linear-to-r from-[#081F5C] to-[#1447a6] hover:opacity-95"
                  disabled={!viewing.shopServiceId?.trim()}
                  onClick={() => {
                    const id = viewing.shopServiceId
                    if (!id?.trim()) return
                    setViewing(null)
                    window.location.hash = `#/customer/shop/${encodeURIComponent(id)}`
                  }}
                >
                  Open service
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      {LogoutDialog}
    </div>
  )
}

export default CustomerMyBookings
