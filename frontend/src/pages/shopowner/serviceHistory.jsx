import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ShopOwnerDashboard from './dashboard.jsx'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { useSidebar } from '../../components/ui/sidebar.jsx'
import {
  Bike,
  CalendarCheck,
  CalendarClock,
  CheckCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
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
  Tag,
  User,
  WashingMachine,
  Wrench,
} from 'lucide-react'
import { completionOutcomeLabel } from '../mechanic/technician/mechanicBookingShared.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function formatPhp(amount) {
  const n = Number(amount || 0)
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(n)
  } catch {
    return `₱${Math.round(n).toLocaleString('en-PH')}`
  }
}

const HISTORY_STAT_GRADIENT = {
  completed: 'bg-linear-to-br from-emerald-600 via-teal-600 to-emerald-800',
  total: 'bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6]',
}

function StatGradientCard({ label, value, icon: Icon, variant, helper, className }) {
  const gradient = HISTORY_STAT_GRADIENT[variant] ?? HISTORY_STAT_GRADIENT.total
  return (
    <div
      className={`relative min-h-[88px] sm:min-h-[112px] min-w-0 overflow-hidden rounded-sm border border-white/15 p-3.5 sm:p-5 shadow-md transition-shadow duration-300 hover:shadow-lg ${gradient} ${className || ''}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/12 to-transparent" />
      <div className="relative z-10 flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs font-medium tracking-wide text-white/85">{label}</p>
          <p className="mt-0.5 sm:mt-1 text-xl sm:text-2xl font-bold tracking-tight text-white tabular-nums sm:text-3xl">{value}</p>
          {helper ? <p className="mt-0.5 line-clamp-1 text-[10px] sm:text-[11px] text-white/80">{helper}</p> : null}
        </div>
        <div className="shrink-0 rounded-sm border border-white/25 bg-white/15 p-2 sm:p-3 shadow-inner backdrop-blur-sm">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" aria-hidden />
        </div>
      </div>
    </div>
  )
}

const selectShell =
  'h-9 w-full appearance-none rounded-sm border border-[#081F5C]/15 bg-white/95 px-3 py-2 pr-8 text-xs sm:text-sm shadow-sm outline-none focus-visible:border-[#1447a6]/50 focus-visible:ring-2 focus-visible:ring-[#081F5C]/20 dark:border-white/10 dark:bg-[#04133d]/30'

function BookingSearchBar({ value, onChange }) {
  const { state: sidebarState } = useSidebar()
  const lgWidthClass = sidebarState === 'collapsed' ? 'lg:w-[500px] lg:max-w-[520px]' : 'lg:w-[360px] lg:max-w-[360px]'

  return (
    <div className={`flex w-full min-w-0 flex-1 flex-col gap-2 self-stretch lg:flex-none ${lgWidthClass}`}>
      <div className="relative h-9 w-full min-w-0 shrink-0">
        <Input
          className="h-9 w-full min-w-0 rounded-sm border-[#081F5C]/15 bg-white/95 pr-12 pl-4 text-[13px] shadow-sm sm:text-sm focus-visible:border-[#1447a6]/45 focus-visible:ring-[#081F5C]/15 dark:border-white/10 dark:bg-[#04133d]/25"
          placeholder="Search by name, phone, service, notes…"
          value={value}
          onChange={onChange}
          aria-label="Search service history"
        />
        <Button
          type="button"
          size="icon-sm"
          className="pointer-events-none absolute top-1/2 right-1.5 z-10 h-7 w-7 -translate-y-1/2 rounded-sm bg-linear-to-r from-[#081F5C] to-[#1447a6] p-0 shadow-sm"
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

function bookingStatusBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
      <span>Completed</span>
    </span>
  )
}

function mapBookingFromApi(row) {
  if (!row || !row.id) return null
  return {
    id: String(row.id),
    ref: String(row.ref || ''),
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

const FOCUS_KEY = 'epaayosHistoryFocusBookingId'

export function ServiceHistoryPage() {
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
    <ShopOwnerDashboard
      activeSection="service-history"
      pageMeta={{
        title: 'Service History',
        description: 'Completed job records archive from Service Requests.',
      }}
    >
      <main className="w-full min-w-0 max-w-full space-y-3 sm:space-y-4 overflow-x-hidden">
        {listError ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span>{listError}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadBookings()}>
              Retry
            </Button>
          </div>
        ) : null}

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <StatGradientCard
            variant="completed"
            label="Completed Jobs"
            value={bookings.length}
            helper="All time completed repair requests"
            icon={CheckCircle}
          />
          <StatGradientCard
            variant="total"
            label="Completed This Month"
            value={completedThisMonth}
            helper="Finished jobs in current calendar month"
            icon={CalendarCheck}
          />
        </div>

        {/* Filter Controls & Search Bar */}
        <div className="mb-1 flex min-w-0 max-w-full flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:flex-1 lg:flex-nowrap">
            <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[160px] sm:flex-1 sm:max-w-[240px]">
              <select
                className={`${selectShell} text-neutral-900 dark:text-neutral-100`}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="completedRecent">Sort: Recently completed</option>
                <option value="completedOldest">Sort: Oldest completion</option>
                <option value="schedule">Sort: By preferred date</option>
              </select>
              <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>

          <BookingSearchBar value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Completed Service Cards List */}
        <div className="mt-2 min-w-0 max-w-full space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[#081F5C] dark:text-slate-50">Completed services</p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground sm:text-[13px]">
                {filtered.length} result{filtered.length === 1 ? '' : 's'}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void loadBookings()}
              className="h-9 shrink-0 gap-1.5 rounded-sm border-[#081F5C]/15 bg-white/80 px-3 text-sm text-[#081F5C] shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-blue-100"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-sm border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm dark:border-white/15 dark:bg-[#020818]">
              <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#081F5C]/70" aria-hidden />
              <p className="text-base font-medium text-foreground">Loading history…</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">Fetching completed service bookings.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[140px] flex-col items-center justify-center rounded-sm border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm ring-1 ring-black/2 dark:border-white/15 dark:bg-[#020818] dark:ring-white/5">
              <History className="mx-auto h-10 w-10 text-muted-foreground/45" aria-hidden />
              <p className="mt-3 text-base font-medium text-foreground">No completed services found</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                When you or your technician completes a job request, it will automatically record here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((b) => {
                const CategoryIcon = b.shopService ? categoryIcon(b.shopService.category) : Wrench
                const hasPin =
                  typeof b.serviceLatitude === 'number' &&
                  Number.isFinite(b.serviceLatitude) &&
                  typeof b.serviceLongitude === 'number' &&
                  Number.isFinite(b.serviceLongitude)
                const isHi = highlightId === b.id

                return (
                  <article
                    key={b.id}
                    data-booking-history-id={b.id}
                    className={cn(
                      'bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-3 sm:p-4 space-y-2.5 sm:space-y-3 rounded-none',
                      isHi && 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-50/20'
                    )}
                  >
                    {/* Top Bar Header */}
                    <div className="flex flex-wrap items-start sm:items-center justify-between gap-2.5 sm:gap-3 pb-2 border-b border-slate-100">
                      <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-none bg-linear-to-r from-[#04133d] to-[#081F5C] text-xs font-bold text-white shadow-2xs mt-0.5 sm:mt-0">
                          {initialsFromName(b.contactName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <h3 className="text-sm sm:text-base font-black text-slate-900 leading-snug">{b.contactName || '—'}</h3>
                            {b.ref ? (
                              <span className="text-[10px] sm:text-[11px] font-semibold bg-slate-100 text-slate-700 px-1.5 sm:px-2 py-0.5 rounded-none border border-slate-200 inline-flex items-center gap-1">
                                <Tag className="size-3 text-indigo-600 shrink-0" />
                                Ref: #{b.ref}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                            <Phone className="size-3 text-[#081F5C] shrink-0" />
                            <a href={`tel:${b.contactPhone}`} className="text-[#081F5C] hover:underline font-bold truncate">
                              {b.contactPhone || '—'}
                            </a>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-row sm:flex-col sm:items-end items-center gap-1.5 shrink-0 self-start sm:self-center">
                        {bookingStatusBadge()}
                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                          Finished: {formatSubmittedLine(b.updatedAt || b.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* 3 Container Box Body Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 text-xs sm:text-sm">
                      {/* Container 1: Service Description */}
                      <div className="bg-slate-50/80 p-3 sm:p-3.5 border border-slate-200 space-y-2 rounded-none flex flex-col justify-between">
                        <div>
                          <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] sm:text-xs flex items-center gap-1">
                            <FileText className="size-3.5 text-[#081F5C] shrink-0" />
                            <span>Service Requested</span>
                          </span>
                          <p className="text-xs sm:text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                            <CategoryIcon className="size-3.5 text-indigo-600 shrink-0" />
                            <span>{b.shopService?.name || 'General Repair'}</span>
                          </p>
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-3 leading-relaxed">
                            {b.problemDescription || 'No description provided.'}
                          </p>
                        </div>
                        {b.notes?.trim() ? (
                          <div className="bg-white p-2 border border-slate-200 text-[11px] text-slate-600 mt-1">
                            <span className="font-bold text-slate-800">Notes:</span> {b.notes.trim()}
                          </div>
                        ) : null}
                      </div>

                      {/* Container 2: Outcome & Schedule */}
                      <div className="bg-slate-50/80 p-3 sm:p-3.5 border border-slate-200 space-y-2 rounded-none flex flex-col justify-between">
                        <div>
                          <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] sm:text-xs flex items-center gap-1">
                            <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                            <span>Recorded Outcome</span>
                          </span>
                          <p className="text-[11px] font-bold text-emerald-900 bg-emerald-50 p-2 border border-emerald-200 mt-1">
                            {completionOutcomeLabel(b.shopService?.category)}
                          </p>
                        </div>
                        <div className="bg-white p-2 border border-slate-200 space-y-0.5 text-[11px]">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Preferred Schedule</span>
                          <div className="flex items-center gap-1 font-bold text-slate-800">
                            <CalendarClock className="size-3 text-indigo-600 shrink-0" />
                            <span>{formatPreferredDate(b.preferredDate)} · {formatTime12h(b.preferredTime)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Container 3: Service Mode & Location */}
                      <div className="bg-slate-50/80 p-3 sm:p-3.5 border border-slate-200 space-y-2 rounded-none flex flex-col justify-between">
                        <div>
                          <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] sm:text-xs flex items-center gap-1">
                            <MapPin className="size-3 text-rose-500 shrink-0" />
                            <span>Service Location</span>
                          </span>
                          <div className="mt-1 flex items-center gap-1">
                            <Badge className="rounded-none border border-slate-300 bg-white text-slate-800 text-[10px] font-bold uppercase py-0">
                              {b.serviceMode === 'home' ? <Home className="size-3 mr-1 text-indigo-600 shrink-0" /> : <Store className="size-3 mr-1 text-indigo-600 shrink-0" />}
                              {b.serviceMode === 'home' ? 'Home Service' : 'In-Shop Visit'}
                            </Badge>
                          </div>
                          {b.serviceMode === 'home' && b.serviceAddress ? (
                            <p className="text-[11px] font-medium text-slate-700 mt-1.5 line-clamp-2 leading-tight">
                              {b.serviceAddress}
                            </p>
                          ) : (
                            <p className="text-[11px] font-medium text-slate-500 mt-1.5 italic">
                              In-shop customer repair visit.
                            </p>
                          )}
                        </div>
                        {b.serviceMode === 'home' && hasPin ? (
                          <a
                            href={`https://www.google.com/maps?q=${b.serviceLatitude},${b.serviceLongitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-full sm:w-auto items-center justify-center gap-1 px-2.5 py-1.5 sm:py-1 bg-white hover:bg-slate-100 text-[#081F5C] text-[11px] font-bold rounded-none border border-slate-300 shadow-2xs transition-colors mt-2"
                          >
                            <MapPin className="size-3 text-rose-600 shrink-0" />
                            <span>Open Location Map</span>
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </ShopOwnerDashboard>
  )
}

export default ServiceHistoryPage
