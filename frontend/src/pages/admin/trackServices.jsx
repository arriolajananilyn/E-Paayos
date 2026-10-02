import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  Eye,
  FileText,
  ImageIcon,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Star,
  Store,
  Tag,
  User,
  Wrench,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

const STAT_CARD_GRADIENT = {
  total: "from-[#04133d] via-[#081F5C] to-[#1447a6] border-[#1447a6]/40",
  pending: "from-amber-600 via-orange-700 to-slate-950 border-amber-400/30",
  progress: "from-purple-600 via-violet-700 to-slate-950 border-purple-400/30",
  completed: "from-emerald-600 via-teal-700 to-slate-950 border-emerald-400/30",
}

const selectShell =
  "h-9 w-full appearance-none rounded-none border border-slate-200 bg-white px-3 py-1.5 pr-8 text-xs font-semibold text-slate-800 shadow-xs outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function apiJson(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  })
  if (res.status === 401) {
    window.location.hash = '#/login'
    throw new Error('Not authorized')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof data?.message === 'string' ? data.message : 'Request failed')
  }
  return data
}

function StatGradientCard({ label, value, sub, helper, icon: Icon, variant, onClick, className }) {
  const gradient = STAT_CARD_GRADIENT[variant] ?? STAT_CARD_GRADIENT.total
  const helperText = helper || sub
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden bg-gradient-to-br p-2.5 sm:p-4 text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg rounded-none border",
        onClick ? "cursor-pointer" : "",
        gradient,
        className
      )}
    >
      <div className="pointer-events-none absolute -right-3 -top-3 size-20 sm:size-28 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-lg group-hover:scale-125 transition-transform duration-500" />
      <Icon className="pointer-events-none absolute -right-1 -top-1 size-14 sm:size-20 text-white/15 stroke-[1.2] rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:text-white/25" />

      <div className="relative z-10 space-y-1.5 sm:space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[11px] font-black uppercase tracking-wider bg-black/25 backdrop-blur-md border border-white/25 text-white rounded-none shadow-xs truncate max-w-[110px] sm:max-w-none">
            <Icon className="size-2.5 sm:size-3 text-white/90 shrink-0" />
            <span className="truncate">{label}</span>
          </span>
          <div className="size-5 sm:size-6 rounded-none bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/30 text-white group-hover:bg-white group-hover:text-slate-900 transition-colors shadow-xs shrink-0">
            <ChevronRight className="size-3 sm:size-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm tabular-nums">
              {value}
            </span>
          </div>
          {helperText ? (
            <p className="text-[10px] sm:text-[11px] text-white/85 font-medium mt-0.5 sm:mt-1 leading-snug truncate">
              {helperText}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function getDateRange(range) {
  if (range === 'all') return { from: null, to: null }
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)
  const firstDayOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1)
  const lastDayOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0)

  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      return { from: start, to: end }
    case 'this-week': {
      const day = now.getDay()
      const diffToMonday = (day + 6) % 7
      start.setDate(now.getDate() - diffToMonday)
      start.setHours(0, 0, 0, 0)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      return { from: start, to: end }
    }
    case 'this-month':
      return { from: firstDayOfMonth(now), to: lastDayOfMonth(now) }
    case 'last-month': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return { from: firstDayOfMonth(lastMonth), to: lastDayOfMonth(lastMonth) }
    }
    case 'this-year':
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      }
    case 'last-year':
      return {
        from: new Date(now.getFullYear() - 1, 0, 1),
        to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
      }
    default:
      return { from: null, to: null }
  }
}

function formatDateTime(iso) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

function formatPreferredDate(d) {
  if (!d) return '—'
  try {
    const x = new Date(d)
    if (Number.isNaN(x.getTime())) return '—'
    return x.toISOString().slice(0, 10)
  } catch {
    return '—'
  }
}

const ROLE_LABELS = {
  customer: 'Customer',
  'shop-owner': 'Shop owner',
  'mechanic-technician': 'Mechanic',
  admin: 'Admin',
}

function formatCurrency(val) {
  if (val == null || !Number.isFinite(Number(val)) || Number(val) < 0) return null
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(Number(val))
}

function roleLabel(role) {
  if (!role) return '—'
  return ROLE_LABELS[role] || role
}

function statusBadgeClass(status) {
  switch (status) {
    case 'pending':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'confirmed':
      return 'border-sky-200 bg-sky-50 text-sky-700'
    case 'working':
      return 'border-purple-200 bg-purple-50 text-purple-700'
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'cancelled':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700'
  }
}

function paymentBadgeClass(status) {
  switch (status) {
    case 'paid':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'unpaid':
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700'
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

function IssuePhotoThumb({ src, label }) {
  const [failed, setFailed] = useState(false)
  const resolvedSrc = resolveIssuePhotoSrc(src)

  return (
    <a
      href={resolvedSrc || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block size-16 sm:size-20 overflow-hidden border border-slate-200 bg-slate-100 transition-all hover:border-[#1447a6] hover:shadow-md shrink-0"
      title={label || 'View image'}
    >
      {!failed && resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={label || 'Issue Photo'}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center p-1 text-center text-[10px] font-medium text-slate-400">
          <ImageIcon className="size-4 mb-0.5 text-slate-400" />
          <span>No preview</span>
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
        <ExternalLink className="size-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
      </div>
    </a>
  )
}

/** Admin: monitor service bookings across customers, shops, and assigned technicians. */
export default function AdminTrackServices() {
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState({
    totalBookings: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    activeListings: 0,
  })
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [copiedRef, setCopiedRef] = useState(false)

  const handleCopyRef = (refText) => {
    if (!refText) return
    navigator.clipboard?.writeText(refText)
    setCopiedRef(true)
    setTimeout(() => setCopiedRef(false), 2000)
  }

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const qs = new URLSearchParams()
      if (statusFilter !== 'all') qs.set('status', statusFilter)
      const path = `/api/admin/service-bookings${qs.toString() ? `?${qs}` : ''}`
      const [listRes, statsRes] = await Promise.all([apiJson(path), apiJson('/api/admin/service-bookings/stats')])
      const list = Array.isArray(listRes?.data) ? listRes.data : []
      setRows(list)
      if (statsRes?.data) {
        setStats({
          totalBookings: statsRes.data.totalBookings ?? 0,
          pending: statsRes.data.pending ?? 0,
          inProgress: statsRes.data.inProgress ?? 0,
          completed: statsRes.data.completed ?? 0,
          cancelled: statsRes.data.cancelled ?? 0,
          activeListings: statsRes.data.activeListings ?? 0,
        })
      }
    } catch (e) {
      console.error(e)
      setError(e?.message || 'Failed to load service activity')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    const { from, to } = getDateRange(dateFilter)

    return rows.filter((row) => {
      const matchesSearch =
        !q ||
        (row.ref && row.ref.toLowerCase().includes(q)) ||
        (row.shopService?.name && row.shopService.name.toLowerCase().includes(q)) ||
        (row.customer?.fullName && row.customer.fullName.toLowerCase().includes(q)) ||
        (row.shopOwner?.shopName && row.shopOwner.shopName.toLowerCase().includes(q)) ||
        (row.shopOwner?.fullName && row.shopOwner.fullName.toLowerCase().includes(q))

      const created = row.createdAt ? new Date(row.createdAt) : null
      const matchesDate =
        !from || !to || !created || (created >= from && created <= to)

      return matchesSearch && matchesDate
    })
  }, [rows, searchTerm, dateFilter])

  const openDetail = (row) => {
    setSelected(row)
    setDetailOpen(true)
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-3.5 sm:space-y-4 overflow-x-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5 min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate">Track services</h1>
          <p className="text-xs text-slate-500 font-medium">
            Monitor booking requests and job status across customers, shop owners, and mechanics.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-8 sm:h-9 shrink-0 rounded-none border border-slate-200 bg-white px-2.5 sm:px-3 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 sm:mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {error ? (
        <div className="rounded-none border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <StatGradientCard
          variant="total"
          label="Total bookings"
          value={stats.totalBookings}
          sub={stats.activeListings ? `${stats.activeListings} active listings` : 'All platform bookings'}
          icon={ClipboardList}
          onClick={() => setStatusFilter('all')}
        />
        <StatGradientCard
          variant="pending"
          label="Pending"
          value={stats.pending}
          sub="Awaiting provider action"
          icon={Clock}
          onClick={() => setStatusFilter('pending')}
        />
        <StatGradientCard
          variant="progress"
          label="In progress"
          value={stats.inProgress}
          sub="Confirmed or working"
          icon={Wrench}
          onClick={() => setStatusFilter('working')}
        />
        <StatGradientCard
          variant="completed"
          label="Completed"
          value={stats.completed}
          sub={stats.cancelled ? `${stats.cancelled} cancelled` : 'Finished platform jobs'}
          icon={CheckCircle}
          onClick={() => setStatusFilter('completed')}
        />
      </div>

      <div className="mb-1 flex min-w-0 max-w-full flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-stretch lg:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-1 sm:flex-row sm:flex-wrap sm:gap-3 min-w-0 w-full max-w-full">
          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[160px] sm:flex-1 sm:max-w-[200px]">
            <select
              className={selectShell}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="working">Working</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[160px] sm:flex-1 sm:max-w-[220px]">
            <select
              className={selectShell}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">Date created</option>
              <option value="today">Today</option>
              <option value="this-week">This week</option>
              <option value="this-month">This month</option>
              <option value="last-month">Last month</option>
              <option value="this-year">This year</option>
              <option value="last-year">Last year</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="relative min-w-0 w-full max-w-full lg:max-w-md lg:flex-1">
          <Input
            className="h-9 w-full min-w-0 rounded-none border border-slate-200 bg-white pr-12 pl-3.5 text-xs font-medium text-slate-800 shadow-xs focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
            placeholder="Search ref, service, customer, shop…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search bookings"
          />
          <Button
            type="button"
            size="icon-sm"
            className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-none bg-gradient-to-br from-[#081F5C] to-[#1447a6] p-0 shadow-xs hover:opacity-95"
            aria-label="Search"
            onClick={() => {}}
          >
            <Search className="h-3.5 w-3.5 text-white" />
          </Button>
        </div>
      </div>

      <div className="mt-3 min-w-0 max-w-full overflow-hidden rounded-none border border-slate-200/60 bg-white/90 shadow-sm ring-1 ring-slate-200/45 backdrop-blur-sm dark:border-white/10 dark:bg-[#0c1929]/90">
        <div className="min-w-0 p-0">
          {/* Desktop Table View */}
          <div className="hidden max-w-full overflow-x-auto scroll-smooth md:block">
            <table className="w-full min-w-[850px] border-collapse text-sm">
              <thead className="[&_tr]:border-0">
                <tr className="border-0 bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6]">
                  <th className="w-[11%] border-0 px-4 py-3 text-left text-[11px] font-black tracking-wider text-white uppercase">
                    Ref
                  </th>
                  <th className="w-[20%] border-0 px-3 py-3 text-left text-[11px] font-black tracking-wider text-white uppercase">
                    Service
                  </th>
                  <th className="w-[18%] border-0 px-3 py-3 text-left text-[11px] font-black tracking-wider text-white uppercase">
                    Customer
                  </th>
                  <th className="w-[20%] border-0 px-3 py-3 text-left text-[11px] font-black tracking-wider text-white uppercase">
                    Shop
                  </th>
                  <th className="w-[11%] border-0 px-3 py-3 text-left text-[11px] font-black tracking-wider text-white uppercase">
                    Status
                  </th>
                  <th className="w-[10%] border-0 px-3 py-3 text-left text-[11px] font-black tracking-wider text-white uppercase">
                    Mode
                  </th>
                  <th className="w-[10%] border-0 px-3 py-3 text-center text-[11px] font-black tracking-wider text-white uppercase">
                    View
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#04133d]/35">
                {loading && rows.length === 0 ? (
                  <tr>
                    <td className="px-6 py-14 text-center text-xs font-semibold text-slate-500" colSpan={7}>
                      Loading bookings…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="px-6 py-14 text-center text-xs font-semibold text-slate-500" colSpan={7}>
                      {rows.length === 0
                        ? 'No service bookings yet.'
                        : 'No rows match your filters or search.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`transition-colors duration-150 hover:bg-slate-50/80 ${idx % 2 === 1 ? 'bg-slate-50/40' : ''} ${idx < filtered.length - 1 ? 'border-b border-slate-100' : ''}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">{row.ref}</td>
                      <td className="px-3 py-3">
                        <div className="truncate font-semibold text-xs text-slate-900">{row.shopService?.name || '—'}</div>
                        <div className="truncate text-[11px] text-slate-500 font-medium">{row.shopService?.category || ''}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="truncate font-semibold text-xs text-slate-900">{row.customer?.fullName || row.contactName || '—'}</div>
                        <div className="truncate text-[11px] text-slate-500 font-medium">{roleLabel(row.customer?.role)}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="truncate font-semibold text-xs text-slate-800">
                          {row.shopOwner?.shopName || row.shopOwner?.fullName || '—'}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span className={cn("inline-flex items-center rounded-none border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", statusBadgeClass(row.status))}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-xs capitalize text-slate-600 font-medium">
                        {row.serviceMode === 'home' ? 'Home' : 'In-shop'}
                      </td>
                      <td className="px-2 py-3 text-center align-middle">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 rounded-none p-0 text-[#081F5C] hover:bg-slate-100 transition-colors"
                          onClick={() => openDetail(row)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Booking Cards */}
          <div className="block divide-y divide-slate-100 dark:divide-white/5 md:hidden">
            {loading && rows.length === 0 ? (
              <div className="px-4 py-12 text-center text-xs font-medium text-slate-500">
                Loading service bookings…
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-12 text-center text-xs font-medium text-slate-500">
                {rows.length === 0
                  ? 'No service bookings yet.'
                  : 'No rows match your filters or search.'}
              </div>
            ) : (
              filtered.map((row) => (
                <div
                  key={row.id}
                  className="p-3 sm:p-3.5 space-y-2.5 transition-colors bg-gradient-to-r from-white via-slate-50/40 to-blue-50/20 hover:bg-slate-50/80"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900">
                          {row.ref}
                        </span>
                        <span className={cn("inline-flex items-center rounded-none border px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider", statusBadgeClass(row.status))}>
                          {row.status}
                        </span>
                      </div>
                      <div className="truncate font-semibold text-xs sm:text-sm text-slate-900">
                        {row.shopService?.name || '—'}
                      </div>
                      {row.shopService?.category ? (
                        <div className="text-[11px] text-slate-500 truncate font-medium">
                          {row.shopService.category}
                        </div>
                      ) : null}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 rounded-none p-0 text-[#081F5C] hover:bg-white border border-slate-200 shadow-xs shrink-0"
                      onClick={() => openDetail(row)}
                      aria-label="View booking details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-slate-100">
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Customer</span>
                      <div className="truncate font-semibold text-slate-800">
                        {row.customer?.fullName || row.contactName || '—'}
                      </div>
                      <div className="truncate text-[10px] sm:text-[11px] text-slate-500 font-medium">
                        {roleLabel(row.customer?.role)}
                      </div>
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Shop & Mode</span>
                      <div className="truncate font-semibold text-slate-800">
                        {row.shopOwner?.shopName || row.shopOwner?.fullName || '—'}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium capitalize">
                        {row.serviceMode === 'home' ? 'Home service' : 'In-shop'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span className="font-medium text-[10px] sm:text-[11px]">{formatPreferredDate(row.preferredDate)}</span>
                    <button
                      type="button"
                      onClick={() => openDetail(row)}
                      className="inline-flex items-center gap-1 font-bold text-xs text-[#1447a6] hover:underline"
                    >
                      View details <ChevronRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent
          className="max-h-[90vh] max-w-[calc(100vw-1.5rem)] sm:max-w-2xl overflow-hidden flex flex-col p-0 border border-slate-200 bg-white shadow-2xl rounded-none dark:border-slate-800 dark:bg-slate-900"
          showCloseButton
        >
          {selected ? (
            <>
              {/* Compact Header Gradient Banner */}
              <div className="bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-4 py-3 sm:px-5 sm:py-3.5 text-white shrink-0 border-b border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pr-6">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 sm:size-8 items-center justify-center bg-white/15 text-white border border-white/20 shrink-0">
                      <ClipboardList className="size-3.5 sm:size-4 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <DialogTitle className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                          Booking Details
                        </DialogTitle>
                        <button
                          type="button"
                          onClick={() => handleCopyRef(selected.ref)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/15 hover:bg-white/25 text-white border border-white/30 transition-colors"
                          title="Click to copy reference ID"
                        >
                          <span>{selected.ref}</span>
                          {copiedRef ? (
                            <Check className="size-2.5 text-emerald-300" />
                          ) : (
                            <Copy className="size-2.5 text-white/70" />
                          )}
                        </button>
                      </div>
                      <DialogDescription className="text-[10px] sm:text-[11px] text-blue-100/75 font-normal">
                        {formatDateTime(selected.createdAt)} · Read-only service record
                      </DialogDescription>
                    </div>
                  </div>

                  {/* Badges in same compact row */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${statusBadgeClass(selected.status)}`}>
                      {selected.status}
                    </Badge>
                    <Badge className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-white/15 text-white border-white/30">
                      {selected.serviceMode === 'home' ? 'Home' : 'In-shop'}
                    </Badge>
                    <Badge className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${paymentBadgeClass(selected.paymentStatus)}`}>
                      {selected.paymentStatus || 'unpaid'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
                {/* 1. Service & Shop Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Service Card */}
                  <div className="border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-700">
                      <Wrench className="size-3.5 text-[#1447a6] dark:text-blue-400 shrink-0" />
                      <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-800 dark:text-slate-200">
                        Service Package
                      </span>
                    </div>

                    <div>
                      <p className="font-bold text-slate-900 text-sm dark:text-white leading-snug">
                        {selected.shopService?.name || 'Custom Service'}
                      </p>
                      {selected.shopService?.category ? (
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-[#1447a6] text-[10px] font-bold border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
                            {selected.shopService.category}
                          </span>
                          {selected.shopService?.subcategory ? (
                            <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
                              {selected.shopService.subcategory}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="text-[11px] space-y-1 pt-1 border-t border-slate-200/80 dark:border-slate-700/80">
                      {selected.shopService?.startingPrice ? (
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Starting price:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {formatCurrency(selected.shopService.startingPrice)}
                          </span>
                        </div>
                      ) : null}

                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Assigned Mechanic(s):</span>
                        {selected.assignedTechnicians?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {selected.assignedTechnicians.map((tech, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        ) : selected.assignedTechnicianName ? (
                          <span className="inline-flex items-center px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800">
                            {selected.assignedTechnicianName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Shop Provider Card */}
                  <div className="border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-700">
                      <Store className="size-3.5 text-[#1447a6] dark:text-blue-400 shrink-0" />
                      <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-800 dark:text-slate-200">
                        Provider / Shop
                      </span>
                    </div>

                    <div>
                      <p className="font-bold text-slate-900 text-sm dark:text-white leading-snug">
                        {selected.shopOwner?.shopName || selected.shopOwner?.fullName || '—'}
                      </p>
                      {selected.shopOwner?.fullName && selected.shopOwner?.shopName ? (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          Owner: <span className="font-medium text-slate-700 dark:text-slate-300">{selected.shopOwner.fullName}</span>
                        </p>
                      ) : null}
                    </div>

                    <div className="text-[11px] space-y-1 pt-1 border-t border-slate-200/80 dark:border-slate-700/80">
                      {selected.shopOwner?.phone ? (
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Phone className="size-3 text-slate-400 shrink-0" />
                          <a href={`tel:${selected.shopOwner.phone}`} className="hover:text-[#1447a6] hover:underline font-medium">
                            {selected.shopOwner.phone}
                          </a>
                        </div>
                      ) : null}

                      {selected.shopOwner?.email ? (
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate">
                          <Mail className="size-3 text-slate-400 shrink-0" />
                          <a href={`mailto:${selected.shopOwner.email}`} className="hover:text-[#1447a6] hover:underline truncate">
                            {selected.shopOwner.email}
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* 2. Customer & Schedule Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Customer Info Card */}
                  <div className="border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-700">
                      <User className="size-3.5 text-[#1447a6] dark:text-blue-400 shrink-0" />
                      <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-800 dark:text-slate-200">
                        Customer Information
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-900 text-sm dark:text-white">
                          {selected.customer?.fullName || selected.contactName || '—'}
                        </p>
                        <Badge variant="outline" className="text-[10px] font-bold capitalize">
                          {roleLabel(selected.customer?.role || 'customer')}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-[11px] space-y-1 pt-1 border-t border-slate-200/80 dark:border-slate-700/80">
                      {selected.customer?.phone || selected.contactPhone ? (
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Phone className="size-3 text-slate-400 shrink-0" />
                          <a
                            href={`tel:${selected.customer?.phone || selected.contactPhone}`}
                            className="hover:text-[#1447a6] hover:underline font-medium"
                          >
                            {selected.customer?.phone || selected.contactPhone}
                          </a>
                        </div>
                      ) : null}

                      {selected.customer?.email ? (
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate">
                          <Mail className="size-3 text-slate-400 shrink-0" />
                          <a href={`mailto:${selected.customer.email}`} className="hover:text-[#1447a6] hover:underline truncate">
                            {selected.customer.email}
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Schedule & Mode Card */}
                  <div className="border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-700">
                      <Calendar className="size-3.5 text-[#1447a6] dark:text-blue-400 shrink-0" />
                      <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-800 dark:text-slate-200">
                        Schedule &amp; Fulfillment
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Preferred Date:</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatPreferredDate(selected.preferredDate)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Preferred Time:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selected.preferredTime || 'Shop hours'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Service Mode:</span>
                        <span className="font-bold capitalize text-slate-800 dark:text-slate-200">
                          {selected.serviceMode === 'home' ? 'Home Service' : 'In-Shop'}
                        </span>
                      </div>
                    </div>

                    {selected.serviceMode === 'home' && selected.serviceAddress ? (
                      <div className="pt-1 border-t border-slate-200/80 dark:border-slate-700/80">
                        <div className="flex items-start gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                          <MapPin className="size-3 text-rose-500 shrink-0 mt-0.5" />
                          <span className="leading-snug">{selected.serviceAddress}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* 3. Problem Diagnosis & Issue Photos */}
                <div className="border border-slate-200 bg-white p-3.5 space-y-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <ClipboardList className="size-3.5 text-[#1447a6] dark:text-blue-400 shrink-0" />
                      <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-800 dark:text-slate-200">
                        Problem Description &amp; Notes
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                      Customer Problem Description:
                    </span>
                    <div className="bg-slate-50 border-l-2 border-[#1447a6] p-3 text-xs text-slate-800 whitespace-pre-wrap dark:bg-slate-800/60 dark:border-blue-500 dark:text-slate-200 font-normal leading-relaxed">
                      {selected.problemDescription || 'No description provided.'}
                    </div>
                  </div>

                  {selected.notes ? (
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                        Additional Notes:
                      </span>
                      <div className="bg-amber-50/60 border border-amber-200/70 p-2.5 text-xs text-amber-900 whitespace-pre-wrap dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-200 leading-relaxed">
                        {selected.notes}
                      </div>
                    </div>
                  ) : null}

                  {selected.status === 'cancelled' && selected.rejectionReason ? (
                    <div className="bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300 flex items-start gap-2">
                      <AlertTriangle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Cancellation / Rejection Reason:</span>
                        <p className="mt-0.5">{selected.rejectionReason}</p>
                      </div>
                    </div>
                  ) : null}

                  {/* Attached Photos */}
                  {Array.isArray(selected.issuePhotos) && selected.issuePhotos.length > 0 ? (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2">
                        <ImageIcon className="size-3.5 text-[#1447a6] dark:text-blue-400" />
                        <span>Uploaded Issue Photos ({selected.issuePhotos.length})</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {selected.issuePhotos.map((src, photoIdx) => (
                          <IssuePhotoThumb key={photoIdx} src={src} label={`Photo ${photoIdx + 1}`} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* 4. Billing, Parts & Payment Breakdown */}
                {(selected.serviceFeeLaborRateAtCalc != null ||
                  selected.serviceFeeMaterialsAmount != null ||
                  selected.serviceFeeReplacementParts?.length > 0 ||
                  selected.paymentMethod ||
                  selected.paidAt) ? (
                  <div className="border border-slate-200 bg-slate-50/80 p-3.5 space-y-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="size-3.5 text-[#1447a6] dark:text-blue-400 shrink-0" />
                        <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-800 dark:text-slate-200">
                          Billing &amp; Cost Breakdown
                        </span>
                      </div>
                      <Badge className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border ${paymentBadgeClass(selected.paymentStatus)}`}>
                        {selected.paymentStatus || 'unpaid'}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      {selected.serviceFeeLaborRateAtCalc != null ? (
                        <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">Labor Service Fee:</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatCurrency(selected.serviceFeeLaborRateAtCalc) || '—'}
                          </span>
                        </div>
                      ) : null}

                      {Array.isArray(selected.serviceFeeReplacementParts) && selected.serviceFeeReplacementParts.length > 0 ? (
                        <div className="space-y-1 pt-1">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                            Replacement Parts &amp; Materials:
                          </span>
                          <div className="border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                            {selected.serviceFeeReplacementParts.map((part, pIdx) => {
                              const partPrice = Number(part?.price ?? part?.unitPrice) || 0
                              const partQty = Number(part?.quantity ?? part?.qty) || 1
                              return (
                                <div key={pIdx} className="flex justify-between p-2">
                                  <span className="text-slate-700 dark:text-slate-300">
                                    {part?.name || part?.description || `Part #${pIdx + 1}`}
                                    {partQty > 1 ? ` × ${partQty}` : ''}
                                  </span>
                                  <span className="font-semibold text-slate-900 dark:text-white">
                                    {formatCurrency(partPrice * partQty)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : selected.serviceFeeMaterialsAmount != null ? (
                        <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                          <span className="text-slate-600 dark:text-slate-400 font-medium">
                            Materials {selected.serviceFeeMaterialsDescription ? `(${selected.serviceFeeMaterialsDescription})` : ''}:
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatCurrency(selected.serviceFeeMaterialsAmount)}
                          </span>
                        </div>
                      ) : null}

                      {/* Total Amount */}
                      <div className="flex justify-between pt-2 border-t-2 border-slate-300 dark:border-slate-600 text-sm">
                        <span className="font-extrabold text-slate-900 dark:text-white">Total Amount:</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                          {formatCurrency(
                            (Number(selected.serviceFeeLaborRateAtCalc) || 0) +
                              (Number(selected.serviceFeeMaterialsAmount) || 0)
                          ) || '—'}
                        </span>
                      </div>

                      {/* Payment Meta */}
                      <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-700/60">
                        <div>
                          <span>Payment Method:</span>{' '}
                          <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase">
                            {selected.paymentMethod || '—'}
                          </span>
                        </div>
                        {selected.paidAt ? (
                          <div className="text-right">
                            <span>Paid On:</span>{' '}
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {formatDateTime(selected.paidAt)}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* 5. Customer Review & Rating */}
                {selected.customerReviewRating ? (
                  <div className="border border-amber-200 bg-amber-50/50 p-3.5 space-y-2 dark:border-amber-800/60 dark:bg-amber-950/20">
                    <div className="flex items-center justify-between pb-1 border-b border-amber-200/70 dark:border-amber-800/50">
                      <div className="flex items-center gap-1.5">
                        <Star className="size-3.5 text-amber-500 fill-amber-400" />
                        <span className="font-extrabold uppercase tracking-wider text-[11px] text-amber-900 dark:text-amber-300">
                          Customer Rating &amp; Review
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`size-3.5 ${
                              s <= Number(selected.customerReviewRating)
                                ? 'text-amber-500 fill-amber-400'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                        <span className="font-black text-xs text-amber-900 dark:text-amber-200 ml-1">
                          {selected.customerReviewRating} / 5
                        </span>
                      </div>
                    </div>
                    {selected.customerReviewComment ? (
                      <p className="text-xs text-amber-950 dark:text-amber-100 italic leading-relaxed">
                        &ldquo;{selected.customerReviewComment}&rdquo;
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* Dialog Footer */}
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                  Created {formatDateTime(selected.createdAt)} · Updated {formatDateTime(selected.updatedAt)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto h-8 px-4 text-xs font-bold rounded-none border-slate-300 hover:bg-slate-100 dark:border-slate-700"
                  onClick={() => setDetailOpen(false)}
                >
                  Close
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
