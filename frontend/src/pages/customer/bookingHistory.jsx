import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Bike,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  History,
  Home,
  Image as ImageIcon,
  Layers,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Tag,
  User,
  WashingMachine,
  Wrench,
  X,
} from 'lucide-react'
import CustomerLayout, { readCustomerUserSession } from '../../layout/customerlayout.jsx'
import { SERVICE_TYPES } from './findServices.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

const HISTORY_TABS = ['All History', 'Completed', 'Cancelled']

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
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
    acceptedPaymentMethods: Array.isArray(row.acceptedPaymentMethods) ? row.acceptedPaymentMethods : [],
    serviceFeeLaborRateAtCalc:
      row.serviceFeeLaborRateAtCalc != null && Number.isFinite(Number(row.serviceFeeLaborRateAtCalc))
        ? Number(row.serviceFeeLaborRateAtCalc)
        : null,
    serviceFeeMaterialsAmount:
      row.serviceFeeMaterialsAmount != null && Number.isFinite(Number(row.serviceFeeMaterialsAmount))
        ? Number(row.serviceFeeMaterialsAmount)
        : null,
    serviceFeeReplacementParts: Array.isArray(row.serviceFeeReplacementParts)
      ? row.serviceFeeReplacementParts
          .map((x) => ({
            name: typeof x?.name === 'string' ? x.name : '',
            price: Number.isFinite(Number(x?.price)) ? Number(x.price) : 0,
          }))
          .filter((x) => x.name)
      : [],
    serviceFeeConfirmedAt: row.serviceFeeConfirmedAt || null,
    paymentStatus: row.paymentStatus || 'unpaid',
    paymentMethod: row.paymentMethod || '',
    paymentProofImage: row.paymentProofImage || '',
    paidAt: row.paidAt || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function formatPhp(amount) {
  const n = Number(amount || 0)
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(n)
  } catch {
    return `₱${Math.round(n).toLocaleString('en-PH')}`
  }
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
      <div className={cn('relative overflow-hidden rounded-none border border-indigo-200 bg-slate-100', boxClass)}>
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

const selectShell =
  'h-10 w-full appearance-none rounded-none border-0 bg-white px-3 py-2 pr-8 text-xs font-bold text-slate-700 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.16)] outline-none focus-visible:ring-1 focus-visible:ring-indigo-600 transition-shadow hover:shadow-[0_4px_24px_-4px_rgba(79,70,229,0.28)]'

function statusBadge(status) {
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
        <span>Working / In Progress</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
      <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
      <span>Pending Approval</span>
    </span>
  )
}

function bookingProgressHint(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'completed') return 'Service has been marked completed by technician.'
  if (s === 'cancelled' || s === 'canceled') return 'Service request was cancelled.'
  return ''
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

function serviceModeBadge(mode) {
  const label = SERVICE_TYPES.find((x) => x.value === mode)?.label ?? 'In-Shop'
  return (
    <Badge variant="outline" className="rounded-none border-indigo-200 bg-indigo-50 text-[11px] font-bold text-indigo-900">
      {label}
    </Badge>
  )
}

function listingTypeBadge(listingType) {
  const label = SERVICE_TYPES.find((x) => x.value === listingType)?.label ?? '—'
  return (
    <Badge variant="outline" className="rounded-none border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-600">
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

export default function CustomerBookingHistory() {
  const [user, setUser] = useState(readCustomerUserSession)

  const [activeTab, setActiveTab] = useState('All History')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('All')
  const [sortBy, setSortBy] = useState('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewing, setViewing] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  const loadHistory = useCallback(async () => {
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
        throw new Error(data?.message || 'Could not load your booking history.')
      }
      const raw = Array.isArray(data?.bookings) ? data.bookings : []
      const mapped = raw.map(mapBookingFromApi).filter(Boolean)
      // History only shows completed or cancelled bookings
      const historyOnly = mapped.filter((b) => b.status === 'completed' || b.status === 'cancelled' || b.status === 'canceled')
      setBookings(historyOnly)
    } catch (e) {
      setBookings([])
      setListError(e?.message || 'Could not load booking history.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    void loadHistory()
  }, [user, loadHistory])

  const stats = useMemo(() => {
    const total = bookings.length
    const completed = bookings.filter((b) => b.status === 'completed').length
    const cancelled = bookings.filter((b) => b.status === 'cancelled' || b.status === 'canceled').length
    const totalSpent = bookings
      .filter((b) => b.status === 'completed')
      .reduce((sum, b) => {
        const labor = Number(b.serviceFeeLaborRateAtCalc || 0)
        const parts = Number(b.serviceFeeMaterialsAmount || 0)
        return sum + labor + parts
      }, 0)

    return { total, completed, cancelled, totalSpent }
  }, [bookings])

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    const base = bookings.filter((b) => {
      if (activeTab === 'Completed' && b.status !== 'completed') return false
      if (activeTab === 'Cancelled' && b.status !== 'cancelled' && b.status !== 'canceled') return false

      if (categoryFilter && String(b.category || '').trim().toLowerCase() !== categoryFilter.trim().toLowerCase()) return false
      if (!bookingMatchesDateFilter(b, dateFilter)) return false
      if (!query) return true
      const hay =
        `${b.serviceName} ${b.shopName} ${b.ref} ${b.category} ${b.subcategory ?? ''} ${b.problemDescription} ${b.notes} ${b.contactName} ${b.contactPhone} ${b.rejectionReason ?? ''}`.toLowerCase()
      return hay.includes(query)
    })

    const sorted = [...base]
    switch (sortBy) {
      case 'oldest':
        sorted.sort((a, b) => {
          const tA = new Date(a.createdAt || 0).getTime()
          const tB = new Date(b.createdAt || 0).getTime()
          return tA - tB
        })
        break
      case 'highest-fee':
        sorted.sort((a, b) => {
          const totalA = Number(a.serviceFeeLaborRateAtCalc || 0) + Number(a.serviceFeeMaterialsAmount || 0)
          const totalB = Number(b.serviceFeeLaborRateAtCalc || 0) + Number(b.serviceFeeMaterialsAmount || 0)
          return totalB - totalA
        })
        break
      case 'newest':
      default:
        sorted.sort((a, b) => {
          const tB = new Date(b.createdAt || 0).getTime()
          const tA = new Date(a.createdAt || 0).getTime()
          return tB - tA
        })
        break
    }
    return sorted
  }, [bookings, activeTab, categoryFilter, dateFilter, searchQuery, sortBy])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <Loader2 className="size-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  return (
    <CustomerLayout activePage="booking-history">
      <main className="w-full px-6 sm:px-10 md:px-16 pt-6 pb-8 space-y-6 max-w-[1440px] mx-auto">
        {/* Header Banner */}
        <header className="relative overflow-hidden rounded-none bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-5 text-white shadow-lg space-y-4 border border-slate-800">
          <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-indigo-600/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 size-80 rounded-full bg-purple-600/10 blur-3xl" />

          {/* Top Row: Info & Nav Back to My Bookings */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative flex size-12 shrink-0 items-center justify-center rounded-none bg-gradient-to-br from-indigo-500 via-purple-600 to-indigo-800 shadow-md shadow-indigo-500/30">
                <History className="size-6 text-white" aria-hidden />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Booking History
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold uppercase tracking-wider">
                    <History className="size-3 text-indigo-400" />
                    Past Records
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5 font-medium">
                  Review your completed jobs, past payments, and cancelled service requests.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.hash = '#/customer/my-bookings'
              }}
              className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-none border border-indigo-500 shadow-md shadow-indigo-900/30 transition-all cursor-pointer"
            >
              <ArrowLeft className="size-4" />
              <span>Back to Active Bookings</span>
            </button>
          </div>

          {/* History Stats Bar */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
            {/* Total History */}
            <div className="bg-slate-800/80 p-3 rounded-none border border-slate-700/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium block text-[11px]">History Records</span>
                <Layers className="size-3.5 text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-white">{stats.total}</span>
                <span className="text-[11px] text-slate-400 font-medium">Requests</span>
              </div>
            </div>

            {/* Completed Jobs */}
            <div className="bg-slate-800/80 p-3 rounded-none border border-slate-700/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-emerald-300 font-medium block text-[11px]">Completed Jobs</span>
                <CheckCircle2 className="size-3.5 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-emerald-400">{stats.completed}</span>
                <span className="text-[11px] text-emerald-400/70 font-medium">Finished</span>
              </div>
            </div>

            {/* Cancelled */}
            <div className="bg-slate-800/80 p-3 rounded-none border border-slate-700/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-rose-300 font-medium block text-[11px]">Cancelled / Declined</span>
                <X className="size-3.5 text-rose-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-rose-300">{stats.cancelled}</span>
                <span className="text-[11px] text-rose-400/70 font-medium">Cancelled</span>
              </div>
            </div>

            {/* Total Spent */}
            <div className="bg-slate-800/80 p-3 rounded-none border border-slate-700/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sky-300 font-medium block text-[11px]">Completed Services Fee</span>
                <DollarSign className="size-3.5 text-sky-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-black text-sky-300">{formatPhp(stats.totalSpent)}</span>
              </div>
            </div>
          </div>
        </header>

        {listError ? (
          <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-none">
            <span>{listError}</span>
            <button
              type="button"
              onClick={() => void loadHistory()}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-none cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : null}

        {/* Filter & Controls Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {HISTORY_TABS.map((t) => {
              const count =
                t === 'All History'
                  ? stats.total
                  : t === 'Completed'
                    ? stats.completed
                    : stats.cancelled

              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveTab(t)}
                  className={cn(
                    'px-3.5 py-2.5 text-xs font-bold rounded-none border-0 transition-all cursor-pointer whitespace-nowrap',
                    activeTab === t
                      ? 'bg-gradient-to-r from-[#081F5C] to-[#123B9B] text-white shadow-md shadow-[#081F5C]/35'
                      : 'bg-white text-slate-700 hover:bg-slate-50 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.16)]'
                  )}
                >
                  {t} ({count})
                </button>
              )
            })}
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full sm:w-36">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={selectShell}
              >
                <option value="">Categories</option>
                <option value="Appliance">Appliance</option>
                <option value="Gadget">Gadget</option>
                <option value="Vehicle">Vehicle</option>
                <option value="Others">Others</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative w-full sm:w-36">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={selectShell}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest-fee">Highest Fee</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search history ref, service, shop..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-none border-0 bg-white px-4 py-2.5 pr-10 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none shadow-[0_4px_20px_-4px_rgba(15,23,42,0.16)] font-medium"
              />
              <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Content Body */}
        {loading && bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 text-slate-400 space-y-3 shadow-xs">
            <RefreshCw className="size-10 animate-spin text-indigo-600 mb-3" />
            <p className="text-sm font-semibold text-slate-700">Connecting to Service Database...</p>
            <p className="text-xs text-slate-400 mt-1">Loading your booking history in real-time</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 text-center">
            <History className="size-14 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Booking History Found</h3>
            <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
              {searchQuery
                ? 'No bookings match your search criteria.'
                : activeTab !== 'All History'
                  ? `No bookings found under "${activeTab}".`
                  : 'You have no completed or cancelled service booking requests yet.'}
            </p>
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#/customer/find-services'
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-none shadow-md transition-colors cursor-pointer"
            >
              Browse Services
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => {
              const CategoryIcon = categoryIcon(b.category)
              const labor = b.serviceFeeLaborRateAtCalc != null ? Number(b.serviceFeeLaborRateAtCalc) : 0
              const parts = b.serviceFeeMaterialsAmount != null ? Number(b.serviceFeeMaterialsAmount) : 0
              const totalFee = labor + parts

              return (
                <article key={b.id} className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5 space-y-4 rounded-none">
                  {/* Top Bar Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-none bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                        <CategoryIcon className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-slate-900">{b.serviceName}</span>
                          <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-none border border-slate-200 inline-flex items-center gap-1">
                            <Tag className="size-3 text-indigo-600" />
                            Ref: {b.ref}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          Submitted {formatSubmittedLine(b.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill Badge */}
                    {statusBadge(b.status)}
                  </div>

                  {/* Recipient, Line Items & Payment Summary 3-Column Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 text-xs sm:text-sm">
                    {/* 1. Service Provider Details */}
                    <div className="bg-slate-50/80 p-3.5 border border-slate-200 space-y-2.5 rounded-none flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-1">
                          <span className="font-extrabold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                            <Store className="size-4 text-indigo-600" />
                            <span>Service Provider</span>
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
                          <p className="text-slate-900 font-bold text-sm">{b.shopName}</p>
                          {b.subcategory?.trim() && (
                            <p className="text-slate-600 font-medium">Subcategory: {b.subcategory.trim()}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <Badge className={cn('rounded-none text-[10px] uppercase font-bold', categoryBadgeClass(b.category))}>
                              {b.category || 'Service'}
                            </Badge>
                            {serviceModeBadge(b.serviceMode)}
                          </div>
                          {b.contactName && (
                            <p className="text-slate-700 font-mono flex items-center gap-1.5 pt-1">
                              <User className="size-3.5 text-slate-400" />
                              <span>Contact: {b.contactName} ({b.contactPhone || 'N/A'})</span>
                            </p>
                          )}
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
                              <span>{formatPreferredDateLong(b.date)} • {formatPreferredTime12h(b.preferredTime)}</span>
                            </p>
                          </div>

                          {b.serviceMode === 'home' && b.serviceAddress?.trim() ? (
                            <div>
                              <span className="text-slate-500 font-medium block">Service Address:</span>
                              <p className="text-slate-700 flex items-start gap-1 mt-0.5 leading-relaxed">
                                <MapPin className="size-3.5 text-rose-500 shrink-0 mt-0.5" />
                                <span>{b.serviceAddress.trim()}</span>
                              </p>
                            </div>
                          ) : (
                            <div>
                              <span className="text-slate-500 font-medium block">Service Location:</span>
                              <p className="text-slate-700 flex items-center gap-1 mt-0.5">
                                <Store className="size-3.5 text-slate-400 shrink-0" />
                                <span>In-Shop Service at {b.shopName}</span>
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

                    {/* 3. Pricing & Financial Summary */}
                    <div className="bg-slate-50/80 p-3.5 border border-slate-200 space-y-2.5 rounded-none flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-1">
                          <span className="font-extrabold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                            <DollarSign className="size-4 text-indigo-600" />
                            <span>Fee Summary</span>
                          </span>
                          <span
                            className={cn(
                              'px-2 py-0.5 text-[11px] font-extrabold uppercase rounded-none border',
                              b.paymentStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : b.serviceFeeConfirmedAt
                                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                            )}
                          >
                            {b.paymentStatus === 'paid' ? '✓ Paid' : b.serviceFeeConfirmedAt ? 'Fee Set' : 'Quote Pending'}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs pt-1">
                          <div className="flex justify-between items-center text-slate-600">
                            <span>Labor Rate / Fee:</span>
                            <span className="font-semibold text-slate-800">
                              {b.serviceFeeLaborRateAtCalc != null ? formatPhp(b.serviceFeeLaborRateAtCalc) : 'TBD'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-slate-600">
                            <span>Materials & Parts:</span>
                            <span className="font-semibold text-slate-800">
                              {b.serviceFeeMaterialsAmount != null ? formatPhp(b.serviceFeeMaterialsAmount) : 'TBD'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-1 font-bold">
                            <span className="text-slate-900">Total Fee:</span>
                            <span className="font-black text-indigo-700 text-base">
                              {b.serviceFeeLaborRateAtCalc != null || b.serviceFeeMaterialsAmount != null
                                ? formatPhp((b.serviceFeeLaborRateAtCalc || 0) + (b.serviceFeeMaterialsAmount || 0))
                                : 'Awaiting Quote'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Hint */}
                  {bookingProgressHint(b.status) && (
                    <div className="bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-600 flex items-center gap-2">
                      <AlertCircle className="size-4 text-indigo-600 shrink-0" />
                      <span className="italic">{bookingProgressHint(b.status)}</span>
                    </div>
                  )}

                  {/* Uploaded Issue Photos */}
                  {Array.isArray(b.issuePhotos) && b.issuePhotos.length > 0 && (
                    <div className="bg-indigo-50/50 border border-indigo-100 p-3 text-xs space-y-2">
                      <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                        <ImageIcon className="size-4 text-indigo-600" />
                        Uploaded Issue Photos ({b.issuePhotos.length})
                      </span>
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {b.issuePhotos.map((src, photoIndex) => (
                          <IssuePhotoThumb key={photoIndex} src={src} label={`Issue ${photoIndex + 1}`} size="sm" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cancellation Note */}
                  {String(b.status).toLowerCase() === 'cancelled' && b.rejectionReason?.trim() && (
                    <div className="bg-rose-50 border border-rose-200 p-3 text-xs space-y-1">
                      <span className="font-bold text-rose-900 block">Shop Cancellation Note:</span>
                      <p className="text-rose-700">{b.rejectionReason.trim()}</p>
                    </div>
                  )}

                  {/* Action Controls */}
                  <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        window.location.hash = '#/customer/messages'
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer"
                    >
                      <MessageCircle className="size-3.5" />
                      <span>Message Shop</span>
                    </button>

                    {String(b.status).toLowerCase() === 'completed' && (
                      <button
                        type="button"
                        onClick={() => {
                          window.location.hash = '#/customer/reviews-ratings'
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer"
                      >
                        <Star className="size-3.5 text-amber-600" />
                        <span>Rate Service</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={!b.shopServiceId?.trim()}
                      onClick={() => {
                        if (!b.shopServiceId?.trim()) return
                        window.location.hash = `#/customer/shop/${encodeURIComponent(b.shopServiceId)}`
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Store className="size-3.5 text-slate-500" />
                      <span>View Service</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setViewing(b)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white border border-slate-900 text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer"
                    >
                      <FileText className="size-3.5" />
                      <span>Full Details</span>
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* Details Dialog */}
        <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
          <DialogContent className="flex max-h-[calc(100vh-3.5rem)] flex-col gap-4 overflow-hidden sm:max-w-lg rounded-none" showCloseButton>
            {viewing ? (
              <>
                <DialogHeader className="shrink-0 border-b border-slate-100 pb-3">
                  <DialogTitle className="pr-6 text-lg font-black text-slate-900">{viewing.serviceName}</DialogTitle>
                  <DialogDescription className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold text-slate-800">{viewing.shopName}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 border border-slate-200 text-slate-700">Ref: {viewing.ref}</span>
                  </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 space-y-4 text-xs sm:text-sm">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {statusBadge(viewing.status)}
                      <Badge className={cn('rounded-none text-[10px] uppercase font-bold', categoryBadgeClass(viewing.category))}>{viewing.category || '—'}</Badge>
                      {serviceModeBadge(viewing.serviceMode)}
                      {listingTypeBadge(viewing.listingType)}
                    </div>
                    {bookingProgressHint(viewing.status) ? (
                      <p className="text-xs italic text-slate-500 bg-slate-50 p-2.5 border border-slate-200">{bookingProgressHint(viewing.status)}</p>
                    ) : null}
                  </div>

                  <div className="bg-slate-50 p-3.5 border border-slate-200 space-y-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preferred Schedule</p>
                    <p className="text-sm font-bold text-slate-900">
                      {formatPreferredDateLong(viewing.date)}{' '}
                      <span className="font-medium text-slate-500">at</span> {formatPreferredTime12h(viewing.preferredTime)}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3.5 border border-slate-200 space-y-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Person</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {viewing.contactName} <span className="text-slate-400">·</span>{' '}
                      <span className="font-mono">{viewing.contactPhone}</span>
                    </p>
                  </div>

                  {viewing.serviceMode === 'home' && viewing.serviceAddress?.trim() ? (
                    <div className="bg-slate-50 p-3.5 border border-slate-200 space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Service Address</p>
                      <p className="flex items-start gap-2 text-sm text-slate-800">
                        <Home className="mt-0.5 size-4 shrink-0 text-indigo-600" aria-hidden />
                        <span className="whitespace-pre-wrap">{viewing.serviceAddress.trim()}</span>
                      </p>
                    </div>
                  ) : null}

                  <div className="bg-slate-50 p-3.5 border border-slate-200 space-y-2">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Issue Description</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800">{viewing.problemDescription}</p>
                    {Array.isArray(viewing.issuePhotos) && viewing.issuePhotos.length > 0 ? (
                      <div className="mt-3 pt-2 border-t border-slate-200">
                        <p className="text-xs font-bold text-indigo-900 mb-2">
                          Uploaded Issue Photos ({viewing.issuePhotos.length})
                        </p>
                        <div className="flex flex-wrap gap-2">
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
                    <div className="bg-slate-50 p-3.5 border border-slate-200 space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Additional Notes</p>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-800">{viewing.notes.trim()}</p>
                    </div>
                  ) : null}

                  {String(viewing.status).toLowerCase() === 'cancelled' && viewing.rejectionReason?.trim() ? (
                    <div className="bg-rose-50 border border-rose-200 p-3.5 space-y-1">
                      <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Cancellation Note from Shop</p>
                      <p className="text-sm text-rose-900">{viewing.rejectionReason.trim()}</p>
                    </div>
                  ) : null}
                </div>

                <DialogFooter className="shrink-0 gap-2 border-t border-slate-100 pt-3">
                  <Button type="button" variant="outline" className="rounded-none border-slate-300 text-xs font-bold" onClick={() => setViewing(null)}>
                    Close
                  </Button>
                  <Button
                    type="button"
                    className="rounded-none bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
                    disabled={!viewing.shopServiceId?.trim()}
                    onClick={() => {
                      const id = viewing.shopServiceId
                      if (!id?.trim()) return
                      setViewing(null)
                      window.location.hash = `#/customer/shop/${encodeURIComponent(id)}`
                    }}
                  >
                    Open Service Page
                  </Button>
                </DialogFooter>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </main>
    </CustomerLayout>
  )
}
