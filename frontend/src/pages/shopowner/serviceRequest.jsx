import { useCallback, useEffect, useMemo, useState } from 'react'
import ShopOwnerDashboard from './dashboard.jsx'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { useSidebar } from '../../components/ui/sidebar.jsx'
import {
  Bike,
  CalendarCheck,
  CalendarClock,
  CheckCircle,
  CheckCircle2,
  ClipboardList,
  Clock,
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
  XCircle,
} from 'lucide-react'

import { completionOutcomeLabel } from '../mechanic/technician/mechanicBookingShared.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

/** Must match backend `MIN_REJECTION_REASON_LEN` when rejecting a booking. */
const MIN_REJECTION_REASON_LEN = 10

const REQUEST_STAT_GRADIENT = {
  pending: 'bg-linear-to-br from-amber-500 via-orange-500 to-amber-900',
  confirmed: 'bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6]',
  working: 'bg-linear-to-br from-violet-600 via-purple-600 to-indigo-800',
  completed: 'bg-linear-to-br from-emerald-600 via-teal-600 to-emerald-800',
  total: 'bg-linear-to-br from-sky-500 via-blue-500 to-indigo-600',
}

function StatGradientCard({ label, value, icon: Icon, variant, helper }) {
  const gradient = REQUEST_STAT_GRADIENT[variant] ?? REQUEST_STAT_GRADIENT.total
  return (
    <div className={`relative min-h-[112px] min-w-0 overflow-hidden rounded-2xl border border-white/15 p-5 shadow-md transition-shadow duration-300 hover:shadow-lg sm:min-h-[128px] sm:p-6 ${gradient}`}>
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
          aria-label="Search booking requests"
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

/** One line for card header: date · time */
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

/** Booking lifecycle — styled to match services.jsx badge language */
function bookingStatusBadge(status) {
  const s = String(status ?? '')
  if (s === 'pending') {
    return (
      <Badge className="border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200">
        Pending
      </Badge>
    )
  }
  if (s === 'confirmed') {
    return (
      <Badge className="border border-[#081F5C]/25 bg-[#081F5C]/8 px-2 py-0.5 text-xs font-medium text-[#04133d] dark:border-[#1447a6]/40 dark:bg-[#04133d]/35 dark:text-blue-100">
        Confirmed
      </Badge>
    )
  }
  if (s === 'working') {
    return (
      <Badge className="border border-violet-500/35 bg-violet-500/12 px-2 py-0.5 text-xs font-medium text-violet-900 dark:border-violet-400/40 dark:bg-violet-950/40 dark:text-violet-200">
        Working
      </Badge>
    )
  }
  if (s === 'completed') {
    return (
      <Badge className="border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200">
        Completed
      </Badge>
    )
  }
  if (s === 'cancelled') {
    return (
      <Badge className="border border-slate-500/25 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
        Cancelled
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="px-2 py-0.5 text-xs">
      {s || '—'}
    </Badge>
  )
}

function serviceModeLabel(mode) {
  return mode === 'home' ? 'Home service' : 'In-shop'
}

function resolveIssuePhotoSrc(src) {
  const value = String(src ?? '').trim()
  if (!value) return ''
  if (/^(data:|blob:)/i.test(value)) return value
  if (value.startsWith('/uploads/')) return `${API_URL}${value}`
  if (/^https?:\/\//i.test(value)) {
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

function IssuePhotoThumb({ src, label }) {
  const [failed, setFailed] = useState(false)
  const resolvedSrc = resolveIssuePhotoSrc(src)

  return (
    <a
      href={resolvedSrc || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
      title={label}
    >
      <div className="relative h-16 w-16 overflow-hidden rounded-md border border-[#081F5C]/20 bg-slate-100 dark:border-white/15 dark:bg-slate-800/60">
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
    issuePhotos: Array.isArray(row.issuePhotos) ? row.issuePhotos.filter(Boolean) : [],
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

function ServiceRequestPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [actionError, setActionError] = useState('')
  const [statusFilter, setStatusFilter] = useState('__')
  const [sortBy, setSortBy] = useState('newest')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [confirmBooking, setConfirmBooking] = useState(null)
  const [rejectBooking, setRejectBooking] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectReasonError, setRejectReasonError] = useState('')

  const loadBookings = useCallback(async () => {
    setListError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/shop/bookings`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || 'Could not load bookings.')
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
    void loadBookings()
  }, [loadBookings])

  const counts = useMemo(() => {
    const base = { all: 0, pending: 0, confirmed: 0, working: 0, completed: 0, cancelled: 0 }
    for (const b of bookings) {
      base.all += 1
      const st = String(b.status)
      if (st in base) base[st] += 1
    }
    return base
  }, [bookings])

  const filtered = useMemo(() => {
    let list = bookings
    if (statusFilter !== '__' && statusFilter !== '') {
      list = list.filter((b) => b.status === statusFilter)
    }
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
          b.rejectionReason,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(q) || hay.split(/\s+/).some((w) => w.startsWith(q))
      })
    }
    const out = [...list]
    if (sortBy === 'newest') {
      out.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    } else if (sortBy === 'oldest') {
      out.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
    } else if (sortBy === 'schedule') {
      out.sort((a, b) => {
        const da = preferredDateSortValue(a)
        const db = preferredDateSortValue(b)
        if (da !== db) return da - db
        return String(a.preferredTime || '').localeCompare(String(b.preferredTime || ''))
      })
    }
    return out
  }, [bookings, statusFilter, search, sortBy])

  const patchBooking = async (bookingId, nextStatus, extraBody = {}) => {
    setActionError('')
    setUpdatingId(bookingId)
    try {
      const res = await fetch(`${API_URL}/api/shop/bookings/${encodeURIComponent(bookingId)}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: nextStatus, ...extraBody }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || 'Could not update status.')
      }
      const mapped = mapBookingFromApi(data?.booking)
      if (mapped) {
        setBookings((prev) => prev.map((b) => (b.id === mapped.id ? mapped : b)))
      } else {
        await loadBookings()
      }
      return true
    } catch (e) {
      setActionError(e?.message || 'Could not update status.')
      return false
    } finally {
      setUpdatingId(null)
    }
  }

  const openRejectDialog = (b) => {
    setRejectReasonError('')
    setRejectReason('')
    setRejectBooking({ id: b.id, contactName: b.contactName || 'Customer' })
  }

  const submitReject = async () => {
    const trimmed = rejectReason.trim()
    if (trimmed.length < MIN_REJECTION_REASON_LEN) {
      setRejectReasonError(`Please enter at least ${MIN_REJECTION_REASON_LEN} characters.`)
      return
    }
    if (!rejectBooking) return
    const ok = await patchBooking(rejectBooking.id, 'cancelled', { rejectionReason: trimmed })
    if (ok) {
      setRejectBooking(null)
      setRejectReason('')
      setRejectReasonError('')
    }
  }

  const confirmAcceptBooking = async () => {
    if (!confirmBooking) return
    const ok = await patchBooking(confirmBooking.id, 'confirmed')
    if (ok) setConfirmBooking(null)
  }

  return (
    <ShopOwnerDashboard
      activeSection="service-request"
      pageMeta={{
        title: 'Service requests',
        description: 'Review and manage customer booking requests from your catalog (same data as customer Book Now).',
      }}
    >
      <div className="w-full min-w-0 max-w-full space-y-3 overflow-x-hidden">
        {listError ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span>{listError}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadBookings()}>
              Retry
            </Button>
          </div>
        ) : null}
        {actionError ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm text-amber-950 dark:text-amber-100">
            {actionError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <StatGradientCard
            variant="pending"
            label="Pending"
            value={counts.pending}
            helper="Needs your response"
            icon={CalendarClock}
          />
          <StatGradientCard
            variant="confirmed"
            label="Confirmed"
            value={counts.confirmed}
            helper="Accepted, not started"
            icon={CalendarCheck}
          />
          <StatGradientCard
            variant="working"
            label="Working"
            value={counts.working}
            helper="Service in progress"
            icon={Wrench}
          />
          <StatGradientCard
            variant="completed"
            label="Completed"
            value={counts.completed}
            helper="Finished jobs"
            icon={CheckCircle}
          />
          <StatGradientCard
            variant="total"
            label="Total requests"
            value={counts.all}
            helper={`${counts.cancelled} cancelled`}
            icon={ClipboardList}
          />
        </div>

        <div className="mb-1 flex min-w-0 max-w-full flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 w-full max-w-full flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-nowrap">
            <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[140px] sm:flex-1 sm:max-w-[200px]">
              <select
                className={`${selectShell} ${statusFilter !== '__' ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-500'}`}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value === '' ? '__' : e.target.value)}
              >
                <option value="__" disabled hidden>
                  Status
                </option>
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="working">Working</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <Clock className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>

            <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[220px]">
              <select className={`${selectShell} text-neutral-900 dark:text-neutral-100`} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">Sort: Newest request</option>
                <option value="oldest">Sort: Oldest request</option>
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
              <p className="truncate text-base font-semibold text-[#081F5C] dark:text-slate-50">Incoming requests</p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground sm:text-[13px]">
                {filtered.length} result{filtered.length === 1 ? '' : 's'}
                {statusFilter && statusFilter !== '__' && statusFilter !== '' ? ` · ${statusFilter}` : ''}
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
              <p className="text-base font-medium text-foreground">Loading bookings…</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">Fetching requests from the server.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[140px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm ring-1 ring-black/2 dark:border-white/15 dark:bg-[#020818] dark:ring-white/5">
              <Store className="mx-auto h-10 w-10 text-muted-foreground/45" aria-hidden />
              <p className="mt-3 text-base font-medium text-foreground">No requests found</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Try adjusting status or search, or wait for customers to book from your service listings.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((b) => {
                const CategoryIcon = b.shopService ? categoryIcon(b.shopService.category) : Wrench
                const busy = updatingId === b.id
                const hasPin =
                  typeof b.serviceLatitude === 'number' &&
                  Number.isFinite(b.serviceLatitude) &&
                  typeof b.serviceLongitude === 'number' &&
                  Number.isFinite(b.serviceLongitude)

                return (
                  <div
                    key={b.id}
                    className="flex w-full flex-col overflow-hidden rounded-xl border border-[#081F5C]/10 bg-white shadow-sm ring-1 ring-black/2 transition-colors hover:border-[#1447a6]/28 dark:border-white/10 dark:bg-[#020818]/95 dark:ring-white/5"
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
                                {bookingStatusBadge(b.status)}
                              </div>
                              <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-muted-foreground sm:text-sm">
                                <Phone className="h-3.5 w-3.5 shrink-0 text-[#081F5C]/55" aria-hidden />
                                <a
                                  href={`tel:${b.contactPhone}`}
                                  className="font-medium text-[#1447a6] hover:underline dark:text-sky-300"
                                >
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
                            <div className="shrink-0 text-right" title={formatRequestedAt(b.createdAt)}>
                              <p className="text-xs leading-tight sm:text-sm">
                                <span className="font-semibold text-muted-foreground">Submitted: </span>
                                <span className="whitespace-nowrap font-normal tabular-nums text-foreground/90">
                                  {formatSubmittedLine(b.createdAt)}
                                </span>
                              </p>
                            </div>
                          </div>

                          <p className="line-clamp-3 text-sm leading-relaxed text-foreground/90">{b.problemDescription || '—'}</p>
                          {Array.isArray(b.issuePhotos) && b.issuePhotos.length > 0 ? (
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-[#081F5C] dark:text-slate-100">
                                Attached issue photo{b.issuePhotos.length === 1 ? '' : 's'}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {b.issuePhotos.slice(0, 6).map((src, photoIndex) => (
                                  <IssuePhotoThumb
                                    key={`${b.id}-issue-photo-${photoIndex}`}
                                    src={src}
                                    label={`Issue photo ${photoIndex + 1}`}
                                  />
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <div className="flex flex-wrap items-center gap-1.5">
                            {b.shopService?.category ? categoryBadge(b.shopService.category) : null}
                            <Badge
                              variant="outline"
                              className="inline-flex items-center gap-1 border-[#081F5C]/12 bg-white/90 px-2 py-0.5 text-xs font-medium text-[#081F5C] dark:border-white/10 dark:bg-white/5 dark:text-blue-100"
                            >
                              {b.serviceMode === 'home' ? (
                                <Home className="h-3 w-3 shrink-0" aria-hidden />
                              ) : (
                                <Store className="h-3 w-3 shrink-0" aria-hidden />
                              )}
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
                          {b.status === 'cancelled' && b.rejectionReason?.trim() ? (
                            <div className="rounded-md border border-red-200/60 bg-red-50/80 px-2.5 py-1.5 text-xs leading-relaxed dark:border-red-500/25 dark:bg-red-950/25 sm:text-sm">
                              <span className="font-medium text-red-900 dark:text-red-200">Rejection reason · </span>
                              <span className="text-red-800/90 dark:text-red-100/90">{b.rejectionReason.trim()}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {b.status === 'completed' ? (
                      <div className="flex w-full flex-col gap-2 border-t border-emerald-500/20 bg-emerald-50/40 px-3 py-2.5 dark:border-emerald-500/25 dark:bg-emerald-950/15 sm:flex-row sm:items-center sm:justify-between">
                        <p className="min-w-0 text-xs leading-snug text-emerald-950/90 dark:text-emerald-100/90 sm:text-sm">
                          Job finished — recorded as <span className="font-semibold">{completionOutcomeLabel(b.shopService?.category)}</span>. Status:{' '}
                          <span className="font-semibold">Completed</span>. Listed in Service history. Open below to review.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 shrink-0 gap-1.5 rounded-md bg-emerald-700 px-3 text-sm text-white shadow-sm hover:bg-emerald-700/90 dark:bg-emerald-600 dark:hover:bg-emerald-600/90"
                          onClick={() => {
                            try {
                              sessionStorage.setItem('epaayosHistoryFocusBookingId', b.id)
                            } catch {
                              /* ignore */
                            }
                            window.location.hash = '#/provider/service-history'
                          }}
                        >
                          <History className="h-4 w-4 shrink-0" aria-hidden />
                          Service history
                        </Button>
                      </div>
                    ) : null}

                    {(b.status === 'pending' || b.status === 'confirmed' || b.status === 'working') && (
                      <div className="flex w-full flex-wrap items-center justify-end border-t border-[#081F5C]/10 bg-slate-50/60 px-3 py-2 dark:border-white/10 dark:bg-white/4">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {b.status === 'pending' ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                className="h-8 gap-1.5 rounded-md border-red-600/55 bg-white/90 px-3 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50 hover:text-red-800 dark:border-red-500/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                                onClick={() => openRejectDialog(b)}
                              >
                                <XCircle className="h-4 w-4 shrink-0" aria-hidden />
                                Reject
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={busy}
                                className="h-8 gap-1.5 rounded-md bg-linear-to-r from-emerald-600 to-green-600 px-3 text-sm text-white shadow-sm hover:from-emerald-600/90 hover:to-green-600/90"
                                onClick={() =>
                                  setConfirmBooking({
                                    id: b.id,
                                    contactName: b.contactName || 'Customer',
                                    serviceName: b.shopService?.name || 'Service',
                                  })
                                }
                              >
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                Confirm
                              </Button>
                            </>
                          ) : null}
                          {b.status === 'confirmed' ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={busy}
                              className="h-8 gap-1.5 rounded-md bg-linear-to-r from-violet-600 to-indigo-600 px-3 text-sm text-white shadow-sm hover:from-violet-600/90 hover:to-indigo-600/90"
                              onClick={() => void patchBooking(b.id, 'working')}
                            >
                              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                              Working
                            </Button>
                          ) : null}
                          {b.status === 'working' ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                disabled
                                className="h-8 cursor-not-allowed gap-1.5 rounded-md border border-slate-300 bg-slate-200 px-3 text-sm font-medium text-slate-600 shadow-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                title="Technician or shop has started this job"
                              >
                                <Wrench className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                                Working
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={busy}
                                className="h-8 gap-1.5 rounded-md bg-emerald-600 px-3 text-sm text-white shadow-sm hover:bg-emerald-600/90"
                                onClick={() => void patchBooking(b.id, 'completed')}
                              >
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                                Completed
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        open={!!confirmBooking}
        onOpenChange={(open) => {
          if (!open) setConfirmBooking(null)
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm this booking?</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              {confirmBooking ? (
                <>
                  Are you sure you want to confirm the booking for{' '}
                  <span className="font-medium text-foreground">{confirmBooking.contactName}</span>
                  {confirmBooking.serviceName ? (
                    <>
                      {' '}
                      (<span className="font-medium text-foreground">{confirmBooking.serviceName}</span>)
                    </>
                  ) : null}
                  ? The customer will see this request as accepted.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button
              type="button"
              className="bg-linear-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-600/90 hover:to-green-600/90"
              disabled={!confirmBooking || updatingId === confirmBooking?.id}
              onClick={() => void confirmAcceptBooking()}
            >
              {confirmBooking && updatingId === confirmBooking.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Confirming…
                </>
              ) : (
                'Yes, confirm booking'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={!!rejectBooking}
        onOpenChange={(open) => {
          if (!open) {
            setRejectBooking(null)
            setRejectReason('')
            setRejectReasonError('')
          }
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Reject booking</DialogTitle>
            <DialogDescription>
              Please explain why you are declining this request. This reason is saved with the booking.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="reject-reason">Rejection reason (required)</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value)
                if (rejectReasonError) setRejectReasonError('')
              }}
              placeholder="e.g. Fully booked on that date, service not available for this issue, outside service area…"
              rows={4}
              className="min-h-[100px] resize-y"
              aria-invalid={!!rejectReasonError}
            />
            <p className="text-xs text-muted-foreground">
              Minimum {MIN_REJECTION_REASON_LEN} characters ({rejectReason.trim().length}/{MIN_REJECTION_REASON_LEN}).
            </p>
            {rejectReasonError ? <p className="text-sm text-destructive">{rejectReasonError}</p> : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectBooking(null)
                setRejectReason('')
                setRejectReasonError('')
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!rejectBooking || updatingId === rejectBooking?.id}
              onClick={() => void submitReject()}
            >
              {rejectBooking && updatingId === rejectBooking.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Rejecting…
                </>
              ) : (
                'Reject booking'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ShopOwnerDashboard>
  )
}

export default ServiceRequestPage
