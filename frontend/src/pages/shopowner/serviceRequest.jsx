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
  Calendar,
  CalendarCheck,
  CalendarClock,
  CheckCircle,
  CheckCircle2,
  ClipboardList,
  Clock,
  DollarSign,
  FileText,
  History,
  Home,
  Image as ImageIcon,
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
  X,
  XCircle,
} from 'lucide-react'

import { completionOutcomeLabel } from '../mechanic/technician/mechanicBookingShared.jsx'
import { ServiceFeeCalculateDialog } from '../../components/bookings/ServiceFeeCalculateDialog.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

/** Must match backend `MIN_REJECTION_REASON_LEN` when rejecting a booking. */
const MIN_REJECTION_REASON_LEN = 10

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

const REQUEST_STAT_GRADIENT = {
  pending: 'bg-linear-to-br from-amber-500 via-orange-500 to-amber-900',
  confirmed: 'bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6]',
  working: 'bg-linear-to-br from-violet-600 via-purple-600 to-indigo-800',
  completed: 'bg-linear-to-br from-emerald-600 via-teal-600 to-emerald-800',
  total: 'bg-linear-to-br from-sky-500 via-blue-500 to-indigo-600',
}

function StatGradientCard({ label, value, icon: Icon, variant, helper, className }) {
  const gradient = REQUEST_STAT_GRADIENT[variant] ?? REQUEST_STAT_GRADIENT.total
  return (
    <div className={`relative min-h-[88px] sm:min-h-[112px] min-w-0 overflow-hidden rounded-sm border border-white/15 p-3.5 sm:p-5 shadow-md transition-shadow duration-300 hover:shadow-lg ${gradient} ${className || ''}`}>
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
          aria-label="Search booking requests"
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

function categoryBadgeClass(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return 'bg-gradient-to-r from-sky-600 to-blue-700 text-white'
  if (normalized === 'gadget') return 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
  if (normalized === 'appliance') return 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
  if (normalized === 'others') return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
  return 'bg-gradient-to-r from-slate-600 to-slate-700 text-white'
}

function bookingStatusBadge(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
        <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
        <span>Completed</span>
      </span>
    )
  }
  if (s === 'cancelled' || s === 'canceled') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
        <X className="size-4 text-rose-600 shrink-0" />
        <span>Cancelled</span>
      </span>
    )
  }
  if (s === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-sky-100 text-sky-800 border border-sky-300 shadow-2xs">
        <span className="size-2 rounded-full bg-sky-500 animate-pulse" />
        <span>Confirmed</span>
      </span>
    )
  }
  if (s === 'working') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-purple-100 text-purple-800 border border-purple-300 shadow-2xs">
        <span className="size-2 rounded-full bg-purple-500 animate-pulse" />
        <span>Working</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
      <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
      <span>Pending</span>
    </span>
  )
}

function serviceModeBadge(mode) {
  const label = mode === 'home' ? 'Home Service' : 'In-Shop'
  return (
    <Badge variant="outline" className="rounded-none border-indigo-200 bg-indigo-50 text-[11px] font-bold text-indigo-900">
      {label}
    </Badge>
  )
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

function IssuePhotoThumb({ src, label, size = 'sm' }) {
  const [failed, setFailed] = useState(false)
  const resolvedSrc = resolveIssuePhotoSrc(src)
  const boxClass = size === 'lg' ? 'h-20 w-20' : 'h-14 w-14'

  return (
    <a href={resolvedSrc || '#'} target="_blank" rel="noopener noreferrer" className="group block" title={label}>
      <div className={cn("relative overflow-hidden rounded-none border border-indigo-200 bg-slate-100", boxClass)}>
        {!failed ? (
          <img
            src={resolvedSrc}
            alt={label}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-medium text-slate-500">
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
    issuePhotos: Array.isArray(row.issuePhotos) ? row.issuePhotos.filter(Boolean) : [],
    problemDescription: row.problemDescription || '',
    notes: row.notes || '',
    rejectionReason: row.rejectionReason || '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    customer: row.customer || null,
    shopService: row.shopService || null,
    serviceFeeLaborRateAtCalc:
      row.serviceFeeLaborRateAtCalc != null && Number.isFinite(Number(row.serviceFeeLaborRateAtCalc))
        ? Number(row.serviceFeeLaborRateAtCalc)
        : null,
    serviceFeeMaterialsAmount:
      row.serviceFeeMaterialsAmount != null && Number.isFinite(Number(row.serviceFeeMaterialsAmount))
        ? Number(row.serviceFeeMaterialsAmount)
        : null,
    serviceFeeMaterialsDescription:
      typeof row.serviceFeeMaterialsDescription === 'string' ? row.serviceFeeMaterialsDescription : '',
    serviceFeeReplacementParts: Array.isArray(row.serviceFeeReplacementParts)
      ? row.serviceFeeReplacementParts
          .map((x) => ({
            name: typeof x?.name === 'string' ? x.name : '',
            price: Number.isFinite(Number(x?.price)) ? Number(x.price) : 0,
          }))
          .filter((x) => x.name)
      : [],
    serviceFeeConfirmedAt: row.serviceFeeConfirmedAt || null,
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
  const [confirmWorkingBooking, setConfirmWorkingBooking] = useState(null)
  const [rejectBooking, setRejectBooking] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectReasonError, setRejectReasonError] = useState('')
  const [feeBooking, setFeeBooking] = useState(null)
  const [feeDialogError, setFeeDialogError] = useState('')

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
          b.ref,
          b.id,
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

  const patchBookingServiceFee = async (bookingId, body) => {
    setFeeDialogError('')
    setActionError('')
    setUpdatingId(bookingId)
    try {
      const res = await fetch(`${API_URL}/api/shop/bookings/${encodeURIComponent(bookingId)}/service-fee`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || 'Could not save service fee.')
      }
      const mapped = mapBookingFromApi(data?.booking)
      if (mapped) {
        setBookings((prev) => prev.map((b) => (b.id === mapped.id ? mapped : b)))
      } else {
        await loadBookings()
      }
      setFeeBooking(null)
      return true
    } catch (e) {
      setFeeDialogError(e?.message || 'Could not save service fee.')
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

  const confirmStartWorking = async () => {
    if (!confirmWorkingBooking) return
    const ok = await patchBooking(confirmWorkingBooking.id, 'working')
    if (ok) setConfirmWorkingBooking(null)
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
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span>{listError}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadBookings()}>
              Retry
            </Button>
          </div>
        ) : null}
        {actionError ? (
          <div className="rounded-sm border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm text-amber-950 dark:text-amber-100">
            {actionError}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-5">
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
            className="col-span-2 sm:col-span-1 lg:col-span-1"
            variant="total"
            label="Total requests"
            value={counts.all}
            helper={`${counts.cancelled} cancelled`}
            icon={ClipboardList}
          />
        </div>

        <div className="mb-1 flex min-w-0 max-w-full flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="grid w-full min-w-0 max-w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:flex-1 lg:flex-nowrap">
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
              className="h-9 shrink-0 gap-1.5 rounded-sm border-[#081F5C]/15 bg-white/80 px-3 text-sm text-[#081F5C] shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-blue-100"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-sm border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm dark:border-white/15 dark:bg-[#020818]">
              <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#081F5C]/70" aria-hidden />
              <p className="text-base font-medium text-foreground">Loading bookings…</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">Fetching requests from the server.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[140px] flex-col items-center justify-center rounded-sm border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm ring-1 ring-black/2 dark:border-white/15 dark:bg-[#020818] dark:ring-white/5">
              <Store className="mx-auto h-10 w-10 text-muted-foreground/45" aria-hidden />
              <p className="mt-3 text-base font-medium text-foreground">No requests found</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Try adjusting status or search, or wait for customers to book from your service listings.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((b) => {
                const CategoryIcon = b.shopService ? categoryIcon(b.shopService.category) : Wrench
                const busy = updatingId === b.id
                const hasPin =
                  typeof b.serviceLatitude === 'number' &&
                  Number.isFinite(b.serviceLatitude) &&
                  typeof b.serviceLongitude === 'number' &&
                  Number.isFinite(b.serviceLongitude)

                return (
                  <article key={b.id} className="bg-white border border-slate-200 shadow-[0_3px_8px_rgba(15,23,42,0.12)] transition-all duration-200 hover:border-indigo-500 hover:shadow-[0_6px_16px_rgba(8,31,92,0.18)] hover:-translate-y-0.5 p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 rounded-none">
                    {/* Top Bar Header */}
                    <div className="flex flex-wrap items-start sm:items-center justify-between gap-2.5 sm:gap-3 pb-2">
                      <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-none bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 mt-0.5 sm:mt-0">
                          <CategoryIcon className="size-4 sm:size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                              {b.shopService?.name || 'Service Request'}
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-semibold bg-slate-100 text-slate-700 px-1.5 sm:px-2 py-0.5 rounded-none border border-slate-200 inline-flex items-center gap-1">
                              <Tag className="size-3 text-indigo-600 shrink-0" />
                              Ref: {b.ref || b.id}
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-bold bg-indigo-50 text-indigo-800 px-1.5 sm:px-2 py-0.5 rounded-none border border-indigo-200 inline-flex items-center gap-1">
                              <User className="size-3 text-indigo-600 shrink-0" />
                              {b.contactName || 'Customer'}
                            </span>
                          </div>
                          <span className="text-[10px] sm:text-[11px] text-slate-500 block mt-0.5">
                            Submitted {formatSubmittedLine(b.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Status Pill Badge */}
                      <div className="shrink-0 self-start sm:self-center">
                        {bookingStatusBadge(b.status)}
                      </div>
                    </div>

                    {/* Recipient, Schedule & Financial Summary 3-Column Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 text-xs sm:text-sm">
                      {/* 1. Customer Details */}
                      <div className="bg-slate-50/80 p-3.5 border border-slate-200 space-y-2.5 rounded-none flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-1">
                            <span className="font-extrabold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                              <User className="size-4 text-indigo-600" />
                              <span>Customer Info</span>
                            </span>
                            {b.contactPhone && (
                              <a
                                href={`tel:${b.contactPhone}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-none shadow-2xs transition-colors"
                              >
                                <Phone className="size-3" />
                                <span>Call</span>
                              </a>
                            )}
                          </div>

                          <div className="space-y-1.5 text-xs pt-1">
                            <p className="text-slate-900 font-bold text-sm">{b.contactName || '—'}</p>
                            {b.contactPhone && (
                              <p className="text-slate-700 font-mono flex items-center gap-1.5 pt-0.5">
                                <Phone className="size-3.5 text-slate-400" />
                                <span>{b.contactPhone}</span>
                              </p>
                            )}
                            {b.customer?.fullName && b.customer.fullName.trim() !== b.contactName?.trim() && (
                              <p className="text-slate-600 font-medium text-[11px]">
                                Account: {b.customer.fullName} {b.customer.email ? `(${b.customer.email})` : ''}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <Badge className={cn("rounded-none text-[10px] uppercase font-bold", categoryBadgeClass(b.shopService?.category))}>
                                {b.shopService?.category || 'Service'}
                              </Badge>
                              {serviceModeBadge(b.serviceMode)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2. Schedule & Address Details */}
                      <div className="bg-slate-50/80 p-3.5 border border-slate-200 space-y-2 rounded-none flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-1">
                            <span className="font-extrabold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                              <Calendar className="size-4 text-indigo-600" />
                              <span>Schedule & Location</span>
                            </span>
                          </div>

                          <div className="space-y-2 text-xs pt-1">
                            <div>
                              <span className="text-slate-500 font-medium block">Preferred Schedule:</span>
                              <p className="font-bold text-slate-900 text-xs mt-0.5 flex items-center gap-1">
                                <Clock className="size-3.5 text-indigo-600 shrink-0" />
                                <span>{formatPreferredDate(b.preferredDate)} • {formatTime12h(b.preferredTime)}</span>
                              </p>
                            </div>

                            {b.serviceMode === 'home' && b.serviceAddress ? (
                              <div>
                                <span className="text-slate-500 font-medium block">Service Address:</span>
                                <p className="text-slate-700 flex items-start gap-1 mt-0.5 leading-relaxed">
                                  <MapPin className="size-3.5 text-rose-500 shrink-0 mt-0.5" />
                                  <span>{b.serviceAddress}</span>
                                </p>
                                {hasPin && (
                                  <a
                                    href={`https://www.google.com/maps?q=${b.serviceLatitude},${b.serviceLongitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline mt-1"
                                  >
                                    <MapPin className="size-3" />
                                    <span>Open in Google Maps</span>
                                  </a>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span className="text-slate-500 font-medium block">Service Location:</span>
                                <p className="text-slate-700 flex items-center gap-1 mt-0.5">
                                  <Store className="size-3.5 text-slate-400 shrink-0" />
                                  <span>In-Shop Service</span>
                                </p>
                              </div>
                            )}

                            {b.problemDescription && (
                              <div className="pt-1">
                                <span className="text-slate-500 font-medium block">Issue Description:</span>
                                <p className="text-slate-700 line-clamp-2 italic text-[11px] mt-0.5">"{b.problemDescription}"</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 3. Fee & Service Quote Summary */}
                      <div className="bg-slate-50/80 p-3.5 border border-slate-200 space-y-2.5 rounded-none flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-1">
                            <span className="font-extrabold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                              <DollarSign className="size-4 text-indigo-600" />
                              <span>Fee Summary</span>
                            </span>
                            <span
                              className={cn(
                                "px-2 py-0.5 text-[11px] font-extrabold uppercase rounded-none border",
                                b.serviceFeeConfirmedAt
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                  : "bg-amber-100 text-amber-800 border-amber-300"
                              )}
                            >
                              {b.serviceFeeConfirmedAt ? "Fee Set" : "Quote Pending"}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs pt-1">
                            <div className="flex justify-between items-center text-slate-600">
                              <span>Labor Rate / Fee:</span>
                              <span className="font-semibold text-slate-800">
                                {b.serviceFeeLaborRateAtCalc != null ? formatPhp(b.serviceFeeLaborRateAtCalc) : "TBD"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600">
                              <span>Materials & Parts:</span>
                              <span className="font-semibold text-slate-800">
                                {b.serviceFeeMaterialsAmount != null ? formatPhp(b.serviceFeeMaterialsAmount) : "TBD"}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-1 font-bold">
                              <span className="text-slate-900">Total Fee:</span>
                              <span className="font-black text-indigo-700 text-base">
                                {(b.serviceFeeLaborRateAtCalc != null || b.serviceFeeMaterialsAmount != null)
                                  ? formatPhp((b.serviceFeeLaborRateAtCalc || 0) + (b.serviceFeeMaterialsAmount || 0))
                                  : "Awaiting Quote"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Uploaded Issue Photos & Additional Customer Notes 2-Column Row */}
                    {((Array.isArray(b.issuePhotos) && b.issuePhotos.length > 0) || b.notes?.trim()) && (
                      <div className={cn(
                        "grid gap-3.5",
                        (Array.isArray(b.issuePhotos) && b.issuePhotos.length > 0 && b.notes?.trim())
                          ? "grid-cols-1 md:grid-cols-2"
                          : "grid-cols-1"
                      )}>
                        {Array.isArray(b.issuePhotos) && b.issuePhotos.length > 0 && (
                          <div className="bg-indigo-50/50 border border-indigo-100 p-3 text-xs space-y-2 rounded-none flex flex-col justify-between">
                            <div>
                              <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                                <ImageIcon className="size-4 text-indigo-600" />
                                Uploaded Issue Photos ({b.issuePhotos.length})
                              </span>
                              <div className="flex flex-wrap items-center gap-2 pt-1.5">
                                {b.issuePhotos.map((src, photoIndex) => (
                                  <IssuePhotoThumb key={photoIndex} src={src} label={`Issue ${photoIndex + 1}`} size="sm" />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {b.notes?.trim() && (
                          <div className="bg-slate-50 border border-slate-200 p-3 text-xs space-y-1 rounded-none flex flex-col justify-between">
                            <div>
                              <span className="font-bold text-slate-700 block">Additional Notes:</span>
                              <p className="text-slate-700 italic mt-1 leading-relaxed">"{b.notes.trim()}"</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Rejection Note */}
                    {b.status === 'cancelled' && b.rejectionReason?.trim() && (
                      <div className="bg-rose-50 border border-rose-200 p-3 text-xs space-y-1">
                        <span className="font-bold text-rose-900 block">Rejection Reason:</span>
                        <p className="text-rose-700">{b.rejectionReason.trim()}</p>
                      </div>
                    )}

                    {/* Completed Job Info Banner */}
                    {b.status === 'completed' && (
                      <div className="flex w-full flex-col gap-2 bg-emerald-50/60 p-3 sm:flex-row sm:items-center sm:justify-between text-xs">
                        <p className="min-w-0 text-emerald-950/90 font-medium">
                          Job finished — recorded as <span className="font-bold">{completionOutcomeLabel(b.shopService?.category)}</span>. Status: <span className="font-bold text-emerald-700">Completed</span>. Listed in Service history.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              sessionStorage.setItem('epaayosHistoryFocusBookingId', b.id)
                            } catch {}
                            window.location.hash = '#/provider/service-history'
                          }}
                          className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 px-3.5 py-2 sm:py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-none shadow-2xs transition-colors cursor-pointer shrink-0 text-xs"
                        >
                          <History className="size-3.5" />
                          <span>Service History</span>
                        </button>
                      </div>
                    )}

                    {/* Action Controls Footer */}
                    {(b.status === 'pending' || b.status === 'confirmed' || b.status === 'working') && (
                      <div className="pt-1 flex flex-wrap items-center justify-end gap-2 w-full">
                        {b.status === 'pending' && (
                          <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:justify-end">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openRejectDialog(b)}
                              className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 px-3.5 py-2.5 sm:py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <XCircle className="size-3.5 text-rose-600 shrink-0" />
                              <span>Reject</span>
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                setConfirmBooking({
                                  id: b.id,
                                  contactName: b.contactName || 'Customer',
                                  serviceName: b.shopService?.name || 'Service',
                                })
                              }
                              className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 px-4 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5 shrink-0" />}
                              <span>Confirm</span>
                            </button>
                          </div>
                        )}

                        {b.status === 'confirmed' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              setConfirmWorkingBooking({
                                id: b.id,
                                contactName: b.contactName || 'Customer',
                                serviceName: b.shopService?.name || 'Service',
                              })
                            }
                            className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 px-4 py-2.5 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Wrench className="size-3.5 shrink-0" />}
                            <span>Start Job (Working)</span>
                          </button>
                        )}

                        {b.status === 'working' && (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 w-full sm:w-auto">
                            <span className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 border border-slate-300 text-xs font-bold rounded-none">
                              <Wrench className="size-3.5 opacity-70 shrink-0" />
                              <span>Working</span>
                            </span>
                            {!b.serviceFeeConfirmedAt ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => {
                                  setFeeDialogError('')
                                  setFeeBooking(b)
                                }}
                                className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 px-4 py-2.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <DollarSign className="size-3.5 shrink-0" />
                                <span>Calculate Service Fee</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void patchBooking(b.id, 'completed')}
                                className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 px-4 py-2.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                              >
                                {busy ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle className="size-3.5 shrink-0" />}
                                <span>Mark Completed</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Request Dialog */}
      <AlertDialog
        open={!!confirmBooking}
        onOpenChange={(open) => {
          if (!open) setConfirmBooking(null)
        }}
      >
        <AlertDialogContent className="w-[calc(100vw-1.5rem)] max-w-md rounded-none border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl">
          <AlertDialogHeader className="border-b border-slate-100 pb-3">
            <AlertDialogTitle className="text-lg font-black text-slate-900">Confirm This Booking Request?</AlertDialogTitle>
            <AlertDialogDescription className="text-left text-xs font-medium text-slate-600 mt-1 leading-relaxed">
              {confirmBooking ? (
                <>
                  Are you sure you want to confirm the booking for{' '}
                  <span className="font-bold text-slate-900">{confirmBooking.contactName}</span>
                  {confirmBooking.serviceName ? (
                    <>
                      {' '}
                      (<span className="font-bold text-indigo-700">{confirmBooking.serviceName}</span>)
                    </>
                  ) : null}
                  ? The customer will be notified that their request is accepted.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-3.5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end w-full">
            <AlertDialogCancel type="button" className="w-full sm:w-auto justify-center rounded-none border-slate-300 text-xs font-bold cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              className="w-full sm:w-auto justify-center rounded-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 shadow-md shadow-emerald-900/20 cursor-pointer disabled:opacity-50"
              disabled={!confirmBooking || updatingId === confirmBooking?.id}
              onClick={() => void confirmAcceptBooking()}
            >
              {confirmBooking && updatingId === confirmBooking.id ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden />
                  Confirming…
                </>
              ) : (
                'Yes, Confirm Booking'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Start Job (Working) Dialog */}
      <AlertDialog
        open={!!confirmWorkingBooking}
        onOpenChange={(open) => {
          if (!open) setConfirmWorkingBooking(null)
        }}
      >
        <AlertDialogContent className="w-[calc(100vw-1.5rem)] max-w-md rounded-none border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl">
          <AlertDialogHeader className="border-b border-slate-100 pb-3">
            <AlertDialogTitle className="text-lg font-black text-slate-900">Start Service Job Now?</AlertDialogTitle>
            <AlertDialogDescription className="text-left text-xs font-medium text-slate-600 mt-1 leading-relaxed">
              {confirmWorkingBooking ? (
                <>
                  Mark service for{' '}
                  <span className="font-bold text-slate-900">{confirmWorkingBooking.contactName}</span>
                  {confirmWorkingBooking.serviceName ? (
                    <>
                      {' '}
                      (<span className="font-bold text-purple-700">{confirmWorkingBooking.serviceName}</span>)
                    </>
                  ) : null}{' '}
                  as <span className="font-bold text-purple-800 uppercase">Working</span>? Service is actively in progress.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-3.5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end w-full">
            <AlertDialogCancel type="button" className="w-full sm:w-auto justify-center rounded-none border-slate-300 text-xs font-bold cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              className="w-full sm:w-auto justify-center rounded-none bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 shadow-md shadow-purple-900/20 cursor-pointer disabled:opacity-50"
              disabled={!confirmWorkingBooking || updatingId === confirmWorkingBooking?.id}
              onClick={() => void confirmStartWorking()}
            >
              {confirmWorkingBooking && updatingId === confirmWorkingBooking.id ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden />
                  Updating…
                </>
              ) : (
                'Yes, Start Job (Working)'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Calculate Service Fee Dialog */}
      <ServiceFeeCalculateDialog
        open={Boolean(feeBooking)}
        onOpenChange={(open) => {
          if (!open) {
            setFeeBooking(null)
            setFeeDialogError('')
          }
        }}
        customerName={feeBooking?.contactName || 'Customer'}
        initialLaborPrice={feeBooking?.serviceFeeLaborRateAtCalc ?? null}
        initialReplacementParts={feeBooking?.serviceFeeReplacementParts || []}
        isSubmitting={Boolean(feeBooking) && updatingId === feeBooking.id}
        error={feeDialogError}
        onSave={(payload) => {
          if (!feeBooking) return
          void patchBookingServiceFee(feeBooking.id, payload)
        }}
      />

      {/* Reject Booking Dialog */}
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
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-none border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl" showCloseButton>
          <DialogHeader className="shrink-0 border-b border-slate-100 pb-3.5">
            <DialogTitle className="text-xl font-black text-slate-900">Decline Service Request</DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500 mt-0.5">
              Please explain why you are declining this request. This reason is saved with the booking record.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 text-xs sm:text-sm">
            <Label htmlFor="reject-reason" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Rejection Reason <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value)
                if (rejectReasonError) setRejectReasonError('')
              }}
              placeholder="e.g. Fully booked on that schedule, outside service area, parts unavailable..."
              rows={4}
              className="rounded-none border-slate-300 text-xs font-medium min-h-[100px] resize-y focus:border-rose-600 focus:ring-1 focus:ring-rose-600 shadow-2xs"
              aria-invalid={!!rejectReasonError}
            />
            <p className="text-[11px] text-slate-500">
              Minimum {MIN_REJECTION_REASON_LEN} characters ({rejectReason.trim().length}/{MIN_REJECTION_REASON_LEN}).
            </p>
            {rejectReasonError ? <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 border border-rose-200 rounded-none">{rejectReasonError}</p> : null}
          </div>
          <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 border-t border-slate-100 pt-3.5 sm:justify-end w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectBooking(null)
                setRejectReason('')
                setRejectReasonError('')
              }}
              className="w-full sm:w-auto justify-center rounded-none border-slate-300 text-xs font-bold px-4 py-2 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!rejectBooking || updatingId === rejectBooking?.id}
              onClick={() => void submitReject()}
              className="w-full sm:w-auto justify-center rounded-none bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 shadow-md shadow-rose-900/20 cursor-pointer disabled:opacity-50"
            >
              {rejectBooking && updatingId === rejectBooking.id ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden />
                  Rejecting…
                </>
              ) : (
                'Decline Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ShopOwnerDashboard>
  )
}

export default ServiceRequestPage
