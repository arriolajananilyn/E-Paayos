import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import IndependentMechanicLayout from './IndependentMechanicLayout.jsx'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import { useSidebar } from '../../../components/ui/sidebar.jsx'
import {
  Bike,
  CalendarCheck,
  CalendarClock,
  CheckCircle,
  History,
  Home,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Smartphone,
  Store,
  User,
  WashingMachine,
  Wrench,
} from 'lucide-react'
import { completionOutcomeLabel } from '../../mechanic/technician/mechanicBookingShared.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

const HISTORY_STAT_GRADIENT = {
  completed: 'bg-linear-to-br from-emerald-600 via-teal-600 to-emerald-800',
  total: 'bg-linear-to-br from-sky-500 via-blue-500 to-indigo-600',
}

function StatGradientCard({ label, value, icon: Icon, variant, helper }) {
  const gradient = HISTORY_STAT_GRADIENT[variant] ?? HISTORY_STAT_GRADIENT.total
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

const selectShell =
  'h-9 w-full appearance-none rounded-lg border border-[#081F5C]/15 bg-white/95 px-3 py-2 pr-8 text-xs sm:text-sm shadow-sm outline-none focus-visible:border-[#1447a6]/50 focus-visible:ring-2 focus-visible:ring-[#081F5C]/20 dark:border-white/10 dark:bg-[#04133d]/30'

function BookingSearchBar({ value, onChange }) {
  const { state: sidebarState } = useSidebar()
  const lgWidthClass = sidebarState === 'collapsed' ? 'lg:w-[500px] lg:max-w-[520px]' : 'lg:w-[360px] lg:max-w-[360px]'

  return (
    <div className={`flex w-full min-w-0 flex-1 flex-col gap-2 self-stretch lg:flex-none ${lgWidthClass}`}>
      <div className="relative h-9 w-full min-w-0 shrink-0">
        <Input
          className="h-9 w-full min-w-0 rounded-lg border-[#081F5C]/15 bg-white/95 pr-12 pl-4 text-[13px] shadow-sm sm:text-sm focus-visible:border-[#1447a6]/45 focus-visible:ring-[#081F5C]/15 dark:border-white/10 dark:bg-[#04133d]/25"
          placeholder="Search by name, phone, service, notes…"
          value={value}
          onChange={onChange}
          aria-label="Search service history"
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

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function initialsFromName(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (a + b).toUpperCase()
}

function formatPreferredDate(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

function formatTime12h(hm) {
  const s = String(hm ?? '').trim()
  if (!/^([01]?\d|2[0-3]):([0-5]\d)$/.test(s)) return s || '—'
  const [hStr, mStr] = s.split(':')
  let h = parseInt(hStr, 10)
  const m = mStr
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m} ${ampm}`
}

function formatRequestedAt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function formatSubmittedLine(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${date} · ${time}`
}

function categoryIcon(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return Bike
  if (normalized === 'gadget') return Smartphone
  if (normalized === 'appliance') return WashingMachine
  return Wrench
}

function categoryBadge(category) {
  const label = typeof category === 'string' && category.trim() ? category.trim() : '—'
  return (
    <Badge
      variant="outline"
      className="border-[#1447a6]/25 bg-white/95 px-2 py-0.5 text-xs font-medium text-[#081F5C] dark:border-[#1447a6]/40 dark:bg-[#04133d]/40 dark:text-blue-100"
    >
      {label}
    </Badge>
  )
}

function bookingStatusBadge() {
  return (
    <Badge className="border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200">
      Completed
    </Badge>
  )
}

function serviceModeLabel(mode) {
  return mode === 'home' ? 'Home service' : 'In-shop'
}

function mapBookingFromApi(row) {
  if (!row || !row.id) return null
  return {
    id: String(row.id),
    status: row.status,
    contactName: row.contactName || '',
    contactPhone: row.contactPhone || '',
    preferredDate: row.preferredDate,
    preferredTime: row.preferredTime || '',
    serviceMode: row.serviceMode,
    serviceAddress: row.serviceAddress || '',
    serviceLatitude: row.serviceLatitude,
    serviceLongitude: row.serviceLongitude,
    problemDescription: row.problemDescription || '',
    notes: row.notes || '',
    rejectionReason: row.rejectionReason || '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    customer: row.customer || null,
    shopService: row.shopService || null,
  }
}

function preferredDateSortValue(b) {
  const d = b.preferredDate ? new Date(b.preferredDate) : null
  if (!d || Number.isNaN(d.getTime())) return 0
  return d.getTime()
}

const FOCUS_KEY = 'epaayosIndependentHistoryFocusBookingId'

function IndependentMechanicServiceHistory() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [sortBy, setSortBy] = useState('completedRecent')
  const [search, setSearch] = useState('')
  const [highlightId, setHighlightId] = useState('')
  const clearedFocusRef = useRef(false)

  const loadBookings = useCallback(async () => {
    setListError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/shop/bookings?status=completed`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || 'Could not load service history.')
      }
      const raw = Array.isArray(data?.bookings) ? data.bookings : []
      setBookings(raw.map(mapBookingFromApi).filter(Boolean))
    } catch (e) {
      setBookings([])
      setListError(e?.message || 'Could not load service history.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBookings()
  }, [loadBookings])

  useEffect(() => {
    if (clearedFocusRef.current) return
    try {
      const id = sessionStorage.getItem(FOCUS_KEY)
      if (id) {
        setHighlightId(id)
        sessionStorage.removeItem(FOCUS_KEY)
        clearedFocusRef.current = true
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!highlightId || loading) return
    const t = window.setTimeout(() => {
      const el = document.querySelector(`[data-booking-history-id="${CSS.escape(highlightId)}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
    return () => window.clearTimeout(t)
  }, [highlightId, loading, bookings.length])

  useEffect(() => {
    if (!highlightId) return
    const t = window.setTimeout(() => setHighlightId(''), 4000)
    return () => window.clearTimeout(t)
  }, [highlightId])

  const completedThisMonth = useMemo(() => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    return bookings.filter((b) => {
      const t = new Date(b.updatedAt || b.createdAt || 0)
      return !Number.isNaN(t.getTime()) && t >= startOfMonth
    }).length
  }, [bookings])

  const filtered = useMemo(() => {
    let list = bookings
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((b) => {
        const hay = [
          b.contactName,
          b.contactPhone,
          b.problemDescription,
          b.notes,
          b.shopService?.name,
          b.shopService?.category,
          b.customer?.fullName,
          b.customer?.email,
          b.customer?.phone,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(q) || hay.split(/\s+/).some((w) => w.startsWith(q))
      })
    }
    const out = [...list]
    if (sortBy === 'completedRecent') {
      out.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    } else if (sortBy === 'completedOldest') {
      out.sort((a, b) => new Date(a.updatedAt || a.createdAt || 0) - new Date(b.updatedAt || b.createdAt || 0))
    } else if (sortBy === 'schedule') {
      out.sort((a, b) => {
        const da = preferredDateSortValue(a)
        const db = preferredDateSortValue(b)
        if (da !== db) return db - da
        return String(b.preferredTime || '').localeCompare(String(a.preferredTime || ''))
      })
    }
    return out
  }, [bookings, search, sortBy])

  return (
    <IndependentMechanicLayout
      activeSection="service-history"
      pageMeta={{
        title: 'Service history',
        description: 'Completed jobs recorded from Service request (same bookings, finished status).',
      }}
    >
      <div className="w-full min-w-0 max-w-full space-y-3 overflow-x-hidden pr-2 md:pr-4">
        {listError ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span>{listError}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadBookings()}>
              Retry
            </Button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatGradientCard
            variant="completed"
            label="Completed jobs"
            value={bookings.length}
            helper="All time"
            icon={CheckCircle}
          />
          <StatGradientCard
            variant="total"
            label="Completed this month"
            value={completedThisMonth}
            helper="By last update date"
            icon={CalendarCheck}
          />
        </div>
        <p className="text-xs text-muted-foreground sm:text-sm">
          Use <span className="font-medium text-foreground">Service request</span> for pending, confirmed, and working jobs. This page lists{' '}
          <span className="font-medium text-foreground">completed</span> work only.
        </p>

        <div className="mb-1 flex min-w-0 max-w-full flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 w-full max-w-full flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-nowrap">
            <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[180px] sm:flex-1 sm:max-w-[260px]">
              <select className={`${selectShell} text-neutral-900 dark:text-neutral-100`} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="completedRecent">Sort: Recently completed</option>
                <option value="completedOldest">Sort: Oldest completion</option>
                <option value="schedule">Sort: By preferred date</option>
              </select>
              <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>

          <BookingSearchBar value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="mt-2 min-w-0 max-w-full space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[#081F5C] dark:text-slate-50">Past services</p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground sm:text-[13px]">
                {filtered.length} completed {filtered.length === 1 ? 'record' : 'records'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void loadBookings()}
              className="h-9 shrink-0 gap-1.5 rounded-lg border-[#081F5C]/15 bg-white/80 px-3 text-sm text-[#081F5C] shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-blue-100"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm dark:border-white/15 dark:bg-[#020818]">
              <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#081F5C]/70" aria-hidden />
              <p className="text-base font-medium text-foreground">Loading history…</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">Fetching completed bookings.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[140px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm ring-1 ring-black/2 dark:border-white/15 dark:bg-[#020818] dark:ring-white/5">
              <History className="mx-auto h-10 w-10 text-muted-foreground/45" aria-hidden />
              <p className="mt-3 text-base font-medium text-foreground">No completed services yet</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                When you mark a job complete in Service request, it will appear here.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  window.location.hash = '#/independent/technician/service-request'
                }}
              >
                Go to Service request
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((b) => {
                const CategoryIcon = b.shopService ? categoryIcon(b.shopService.category) : Wrench
                const hasPin =
                  typeof b.serviceLatitude === 'number' &&
                  Number.isFinite(b.serviceLatitude) &&
                  typeof b.serviceLongitude === 'number' &&
                  Number.isFinite(b.serviceLongitude)
                const isHi = highlightId === b.id

                return (
                  <div
                    key={b.id}
                    data-booking-history-id={b.id}
                    className={`flex w-full flex-col overflow-hidden rounded-xl border bg-white shadow-sm ring-1 ring-black/2 transition-colors dark:bg-[#020818]/95 dark:ring-white/5 ${
                      isHi
                        ? 'border-emerald-500/60 ring-2 ring-emerald-500/35'
                        : 'border-[#081F5C]/10 hover:border-[#1447a6]/28'
                    }`}
                  >
                    <div className="p-3 sm:p-3.5">
                      <div className="flex items-start gap-2.5">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-bold text-white"
                          aria-hidden
                        >
                          {initialsFromName(b.contactName)}
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-base font-semibold leading-tight text-foreground">{b.contactName || '—'}</h3>
                                {bookingStatusBadge()}
                              </div>
                              <p className="mt-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-200/90">
                                Recorded outcome:{' '}
                                <span className="font-semibold">{completionOutcomeLabel(b.shopService?.category)}</span>
                              </p>
                              <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground sm:text-sm">
                                <Phone className="h-3.5 w-3.5 shrink-0 text-[#081F5C]/55" aria-hidden />
                                <a href={`tel:${b.contactPhone}`} className="font-medium text-[#1447a6] hover:underline dark:text-sky-300">
                                  {b.contactPhone || '—'}
                                </a>
                                {b.customer?.fullName && b.customer.fullName.trim() !== b.contactName.trim() ? (
                                  <>
                                    <span className="text-muted-foreground/50">·</span>
                                    <span className="inline-flex min-w-0 items-center gap-1 truncate">
                                      <User className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                                      <span className="truncate">{b.customer.fullName}</span>
                                    </span>
                                  </>
                                ) : null}
                              </p>
                            </div>
                            <div className="shrink-0 text-right" title={formatRequestedAt(b.updatedAt || b.createdAt)}>
                              <p className="text-xs leading-tight text-muted-foreground">Completed</p>
                              <p className="text-xs font-normal tabular-nums text-foreground/90 sm:text-sm">{formatSubmittedLine(b.updatedAt || b.createdAt)}</p>
                            </div>
                          </div>

                          <p className="line-clamp-3 text-sm leading-relaxed text-foreground/90">{b.problemDescription || '—'}</p>

                          <div className="flex flex-wrap items-center gap-1.5">
                            {b.shopService?.category ? categoryBadge(b.shopService.category) : null}
                            <Badge
                              variant="outline"
                              className="inline-flex items-center gap-1 border-[#081F5C]/12 bg-white/90 px-2 py-0.5 text-xs font-medium text-[#081F5C] dark:border-white/10 dark:bg-white/5 dark:text-blue-100"
                            >
                              {b.serviceMode === 'home' ? <Home className="h-3 w-3 shrink-0" aria-hidden /> : <Store className="h-3 w-3 shrink-0" aria-hidden />}
                              {serviceModeLabel(b.serviceMode)}
                            </Badge>
                            <span className="inline-flex min-w-0 max-w-full items-center gap-1 text-xs text-muted-foreground sm:text-[13px]">
                              <CategoryIcon className="h-3.5 w-3.5 shrink-0 text-[#081F5C]/50" aria-hidden />
                              <span className="truncate">{b.shopService?.name || '—'}</span>
                            </span>
                          </div>

                          <div className="inline-flex w-fit items-center gap-1.5 rounded-md border border-[#081F5C]/10 bg-slate-50/90 px-2 py-1 text-xs font-medium text-foreground dark:border-white/10 dark:bg-white/5 sm:text-[13px]">
                            <CalendarClock className="h-3.5 w-3.5 shrink-0 text-[#081F5C]/60" aria-hidden />
                            <span className="tabular-nums">{formatPreferredDate(b.preferredDate)}</span>
                            <span className="text-muted-foreground">·</span>
                            <span className="tabular-nums">{formatTime12h(b.preferredTime)}</span>
                          </div>

                          {b.serviceMode === 'home' && b.serviceAddress ? (
                            <p className="flex gap-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#081F5C]/55" aria-hidden />
                              <span>{b.serviceAddress}</span>
                            </p>
                          ) : null}
                          {b.serviceMode === 'home' && hasPin ? (
                            <a
                              href={`https://www.google.com/maps?q=${b.serviceLatitude},${b.serviceLongitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-[#1447a6] hover:underline dark:text-sky-300"
                            >
                              <MapPin className="h-3.5 w-3.5" aria-hidden />
                              Open in Maps
                            </a>
                          ) : null}
                          {b.notes?.trim() ? (
                            <div className="rounded-md border border-dashed border-border/70 bg-muted/20 px-2.5 py-1.5 text-xs leading-relaxed dark:bg-white/5 sm:text-sm">
                              <span className="font-medium text-foreground">Notes · </span>
                              <span className="text-muted-foreground">{b.notes.trim()}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </IndependentMechanicLayout>
  )
}

export default IndependentMechanicServiceHistory
