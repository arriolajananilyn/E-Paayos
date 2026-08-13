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
import { CheckCircle, ChevronDown, ClipboardList, Clock, Eye, RefreshCw, Search, Wrench } from 'lucide-react'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

const STAT_CARD_GRADIENT = {
  total: 'bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6]',
  pending: 'bg-linear-to-br from-sky-600 via-blue-600 to-indigo-900',
  progress: 'bg-linear-to-br from-emerald-600 via-teal-600 to-emerald-900',
  completed: 'bg-linear-to-br from-violet-600 via-purple-700 to-fuchsia-950',
}

const selectShell =
  'h-9 w-full appearance-none rounded-md border border-[#081F5C]/15 bg-white/95 px-3 py-2 pr-8 text-sm shadow-sm outline-none focus-visible:border-[#1447a6]/50 focus-visible:ring-2 focus-visible:ring-[#081F5C]/20 dark:border-white/10 dark:bg-[#04133d]/30'

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

function StatGradientCard({ label, value, sub, icon: Icon, variant }) {
  const gradient = STAT_CARD_GRADIENT[variant] ?? STAT_CARD_GRADIENT.total
  return (
    <div
      className={`relative min-h-[112px] min-w-0 overflow-hidden rounded-lg border border-white/15 p-5 shadow-md transition-shadow duration-300 hover:shadow-lg sm:min-h-[128px] sm:p-6 ${gradient}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/10 to-transparent" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-white/85">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-white tabular-nums sm:text-3xl">{value}</p>
          {sub ? <p className="mt-1 text-xs text-white/70">{sub}</p> : null}
        </div>
        <div className="shrink-0 rounded-md border border-white/25 bg-white/15 p-3 shadow-inner backdrop-blur-sm">
          <Icon className="h-5 w-5 text-white" aria-hidden />
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

function roleLabel(role) {
  if (!role) return '—'
  return ROLE_LABELS[role] || role
}

function statusBadgeClass(status) {
  switch (status) {
    case 'pending':
      return 'border border-amber-500/30 bg-amber-500/10 font-medium text-amber-950 hover:bg-amber-500/15 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-100'
    case 'confirmed':
      return 'border border-sky-500/30 bg-sky-500/10 font-medium text-sky-950 hover:bg-sky-500/15 dark:border-sky-500/35 dark:bg-sky-500/15 dark:text-sky-100'
    case 'working':
      return 'border border-blue-500/30 bg-blue-500/10 font-medium text-blue-950 hover:bg-blue-500/15 dark:border-blue-500/35 dark:bg-blue-500/15 dark:text-blue-100'
    case 'completed':
      return 'border border-emerald-500/25 bg-emerald-500/10 font-medium text-emerald-900 hover:bg-emerald-500/15 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-100'
    case 'cancelled':
      return 'border border-rose-500/30 bg-rose-500/10 font-medium text-rose-900 hover:bg-rose-500/15 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-100'
    default:
      return 'border border-muted-foreground/25 bg-muted/40 font-medium text-foreground'
  }
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
    <div className="w-full min-w-0 max-w-full space-y-3 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">Track services</h1>
          <p className="text-sm text-muted-foreground">
            Monitor booking requests and job status across customers, shop owners, and mechanics.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-9 shrink-0 border-[#081F5C]/20 bg-white/90 hover:bg-[#081F5C]/5 dark:border-white/15 dark:bg-transparent"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatGradientCard
          variant="total"
          label="Total bookings"
          value={stats.totalBookings}
          sub={stats.activeListings ? `${stats.activeListings} active listings` : 'All service requests'}
          icon={ClipboardList}
        />
        <StatGradientCard
          variant="pending"
          label="Pending"
          value={stats.pending}
          sub="Awaiting shop action"
          icon={Clock}
        />
        <StatGradientCard
          variant="progress"
          label="In progress"
          value={stats.inProgress}
          sub="Confirmed or working"
          icon={Wrench}
        />
        <StatGradientCard
          variant="completed"
          label="Completed"
          value={stats.completed}
          sub={stats.cancelled ? `${stats.cancelled} cancelled` : 'Finished jobs'}
          icon={CheckCircle}
        />
      </div>

      <div className="mb-1 flex min-w-0 max-w-full flex-col gap-3 lg:flex-row lg:items-stretch lg:justify-between">
        <div className="flex min-w-0 w-full max-w-full flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[160px] sm:flex-1 sm:max-w-[200px]">
            <select
              className={`${selectShell} ${statusFilter !== 'all' ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-500'}`}
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
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          </div>
          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[160px] sm:flex-1 sm:max-w-[220px]">
            <select
              className={`${selectShell} ${dateFilter !== 'all' ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-500'}`}
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
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          </div>
        </div>

        <div className="relative min-w-0 w-full max-w-full lg:max-w-md lg:flex-1">
          <Input
            className="h-9 w-full min-w-0 rounded-md border-[#081F5C]/15 bg-white/95 pr-12 pl-4 text-sm shadow-sm focus-visible:border-[#1447a6]/45 focus-visible:ring-[#081F5C]/15 dark:border-white/10 dark:bg-[#04133d]/25"
            placeholder="Search ref, service, customer, shop…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search bookings"
          />
          <Button
            type="button"
            size="icon-sm"
            className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-sm bg-linear-to-r from-[#081F5C] to-[#1447a6] p-0 shadow-sm hover:opacity-95"
            aria-label="Search"
            onClick={() => {}}
          >
            <Search className="h-4 w-4 text-white" />
          </Button>
        </div>
      </div>

      <Card className="mt-3 min-w-0 max-w-full overflow-hidden rounded-lg border border-[#081F5C]/12 bg-white shadow-lg ring-1 ring-black/3 backdrop-blur-sm dark:border-white/10 dark:bg-[#0c1929]/90 dark:ring-white/6">
        <CardContent className="min-w-0 p-0">
          <div className="max-w-full overflow-x-auto scroll-smooth">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead className="[&_tr]:border-0">
                <tr className="border-0 bg-linear-to-r from-[#081F5C] to-[#1447a6]">
                  <th className="w-[11%] border-0 px-4 py-3.5 text-left text-[11px] font-semibold tracking-widest text-white/95 uppercase">
                    Ref
                  </th>
                  <th className="w-[20%] border-0 px-3 py-3.5 text-left text-[11px] font-semibold tracking-widest text-white/95 uppercase">
                    Service
                  </th>
                  <th className="w-[18%] border-0 px-3 py-3.5 text-left text-[11px] font-semibold tracking-widest text-white/95 uppercase">
                    Customer
                  </th>
                  <th className="w-[20%] border-0 px-3 py-3.5 text-left text-[11px] font-semibold tracking-widest text-white/95 uppercase">
                    Shop
                  </th>
                  <th className="w-[11%] border-0 px-3 py-3.5 text-left text-[11px] font-semibold tracking-widest text-white/95 uppercase">
                    Status
                  </th>
                  <th className="w-[10%] border-0 px-3 py-3.5 text-left text-[11px] font-semibold tracking-widest text-white/95 uppercase">
                    Mode
                  </th>
                  <th className="w-[10%] border-0 px-3 py-3.5 text-center text-[11px] font-semibold tracking-widest text-white/95 uppercase">
                    View
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#04133d]/35">
                {loading && rows.length === 0 ? (
                  <tr>
                    <td className="px-6 py-14 text-center text-sm text-muted-foreground" colSpan={7}>
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="px-6 py-14 text-center text-sm text-muted-foreground" colSpan={7}>
                      {rows.length === 0
                        ? 'No service bookings yet.'
                        : 'No rows match your filters or search.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`transition-colors duration-150 hover:bg-[#081F5C]/5 dark:hover:bg-white/6 ${idx % 2 === 1 ? 'bg-[#081F5C]/2.5 dark:bg-white/2' : ''} ${idx < filtered.length - 1 ? 'border-b border-[#081F5C]/8 dark:border-white/5' : ''}`}
                    >
                      <td className="px-4 py-3.5 font-mono text-xs font-medium text-foreground">{row.ref}</td>
                      <td className="px-3 py-3.5">
                        <div className="truncate font-semibold text-foreground">{row.shopService?.name || '—'}</div>
                        <div className="truncate text-xs text-muted-foreground">{row.shopService?.category || ''}</div>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="truncate font-medium text-foreground">{row.customer?.fullName || row.contactName || '—'}</div>
                        <div className="truncate text-xs text-muted-foreground">{roleLabel(row.customer?.role)}</div>
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="truncate font-medium text-foreground">
                          {row.shopOwner?.shopName || row.shopOwner?.fullName || '—'}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 align-middle">
                        <Badge className={`text-xs capitalize ${statusBadgeClass(row.status)}`}>{row.status}</Badge>
                      </td>
                      <td className="px-3 py-3.5 text-xs capitalize text-muted-foreground">
                        {row.serviceMode === 'home' ? 'Home' : 'In-shop'}
                      </td>
                      <td className="px-2 py-3 text-center align-middle">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-[#081F5C] hover:bg-[#081F5C]/10 dark:text-blue-200"
                          onClick={() => openDetail(row)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent
          className="max-h-[90vh] max-w-[calc(100vw-1.5rem)] overflow-y-auto border-[#081F5C]/12 sm:max-w-lg dark:border-white/10"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">Booking details</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Read-only view of this service request across roles.
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-foreground">{selected.ref}</span>
                <Badge className={`text-xs capitalize ${statusBadgeClass(selected.status)}`}>{selected.status}</Badge>
              </div>
              <div className="grid gap-3 rounded-md border border-[#081F5C]/10 bg-muted/30 p-4 dark:border-white/10">
                <p>
                  <span className="text-muted-foreground">Service:</span>{' '}
                  <span className="font-medium text-foreground">{selected.shopService?.name}</span>
                  {selected.shopService?.category ? (
                    <span className="text-muted-foreground"> · {selected.shopService.category}</span>
                  ) : null}
                </p>
                <p>
                  <span className="text-muted-foreground">Shop:</span>{' '}
                  <span className="font-medium text-foreground">
                    {selected.shopOwner?.shopName || selected.shopOwner?.fullName || '—'}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Customer:</span>{' '}
                  <span className="font-medium text-foreground">{selected.customer?.fullName || selected.contactName}</span>
                  <span className="text-muted-foreground"> ({roleLabel(selected.customer?.role)})</span>
                </p>
                {selected.customer?.email ? (
                  <p>
                    <span className="text-muted-foreground">Email:</span> {selected.customer.email}
                  </p>
                ) : null}
                {selected.customer?.phone || selected.contactPhone ? (
                  <p>
                    <span className="text-muted-foreground">Phone:</span>{' '}
                    {selected.customer?.phone || selected.contactPhone}
                  </p>
                ) : null}
                {selected.assignedTechnicians?.length ? (
                  <p>
                    <span className="text-muted-foreground">Assigned technicians:</span>{' '}
                    {selected.assignedTechnicians.join(', ')}
                  </p>
                ) : null}
                <p>
                  <span className="text-muted-foreground">Preferred:</span>{' '}
                  {formatPreferredDate(selected.preferredDate)} {selected.preferredTime ? `· ${selected.preferredTime}` : ''}
                </p>
                <p>
                  <span className="text-muted-foreground">Mode:</span>{' '}
                  <span className="capitalize">{selected.serviceMode === 'home' ? 'Home service' : 'In-shop'}</span>
                </p>
                {selected.serviceMode === 'home' && selected.serviceAddress ? (
                  <p>
                    <span className="text-muted-foreground">Address:</span> {selected.serviceAddress}
                  </p>
                ) : null}
                <p>
                  <span className="text-muted-foreground">Problem:</span>
                </p>
                <p className="whitespace-pre-wrap rounded-sm bg-background/80 p-3 text-foreground">{selected.problemDescription}</p>
                {selected.notes ? (
                  <>
                    <p className="text-muted-foreground">Notes</p>
                    <p className="whitespace-pre-wrap rounded-sm bg-background/80 p-3 text-foreground">{selected.notes}</p>
                  </>
                ) : null}
                {selected.status === 'cancelled' && selected.rejectionReason ? (
                  <p className="text-rose-700 dark:text-rose-300">
                    <span className="font-medium">Rejection / cancel reason:</span> {selected.rejectionReason}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Created {formatDateTime(selected.createdAt)} · Updated {formatDateTime(selected.updatedAt)}
                </p>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
