import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '@/components/ui/pagination'
import { getApiBaseUrl } from '@/lib/apiBaseUrl'
import { resolvePsgcField } from '@/lib/psgcResolve'
import { AdminRegistrationDetailView } from '@/pages/admin/AdminUserRegistrationDetail.jsx'
import {
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  HardHat,
  MoreHorizontal,
  Search,
  User,
  Users,
  Wrench,
  XCircle,
} from 'lucide-react'

const API_URL = getApiBaseUrl()

const ROLE_LABELS = {
  customer: 'Customer',
  'shop-owner': 'Shop owner',
  'oncall-mechanic-technician': 'On-call Mechanic/Technician',
  'mechanic-technician': 'Mechanic / technician',
}

const PAGE_SIZE = 10

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function mapUserFromApi(u) {
  if (!u || !u._id) return null
  const phone = [u.phoneCode, u.phoneNumber].filter(Boolean).join(' ').trim() || '—'
  const joined = u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : ''
  const roleRaw = u.role
  const role = ROLE_LABELS[roleRaw] || roleRaw || '—'
  let subtitle = ''
  if (roleRaw === 'shop-owner') subtitle = u.shopName || 'Shop owner'
  else if (roleRaw === 'oncall-mechanic-technician') subtitle = u.shopName || 'On-call provider'
  else if (roleRaw === 'mechanic-technician') {
    const spec = u.courseProgram ? String(u.courseProgram) : ''
    const job = u.shopJobTitle ? String(u.shopJobTitle).trim() : ''
    subtitle = [job, spec].filter(Boolean).join(' · ') || 'Technician'
  } else {
    subtitle = [u.cityMunicipality, u.province].filter(Boolean).join(', ') || 'Customer'
  }
  const rosterStatus = u.shopManagedStatus || 'active'
  const rawApproval = u.accountApprovalStatus
  const accountApprovalStatus =
    rawApproval === 'pending' || rawApproval === 'rejected' ? rawApproval : 'approved'
  return {
    id: String(u._id),
    fullName: u.fullName || '—',
    email: u.email || '—',
    phone,
    role,
    roleRaw,
    rosterStatus,
    accountApprovalStatus,
    joinedAt: joined,
    subtitle,
    shopName: u.shopName || '',
    shopJobTitle: u.shopJobTitle || '',
    courseProgram: u.courseProgram || '',
  }
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function formatJoined(iso) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function getRangeDates(range) {
  if (!range) return { from: null, to: null }
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

function accountApprovalBadge(status) {
  switch (status) {
    case 'pending':
      return (
        <Badge className="border border-amber-500/30 bg-amber-500/10 font-medium text-amber-950 hover:bg-amber-500/15 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-100">
          Pending approval
        </Badge>
      )
    case 'rejected':
      return (
        <Badge className="border border-rose-500/30 bg-rose-500/10 font-medium text-rose-900 hover:bg-rose-500/15 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-100">
          Rejected
        </Badge>
      )
    case 'approved':
    default:
      return (
        <Badge className="border border-emerald-500/25 bg-emerald-500/10 font-medium text-emerald-900 hover:bg-emerald-500/15 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-100">
          Approved
        </Badge>
      )
  }
}

function statusCell(row) {
  const showRoster =
    row.roleRaw === 'mechanic-technician' && row.accountApprovalStatus === 'approved'
  return (
    <div className="flex flex-col gap-1.5">
      {accountApprovalBadge(row.accountApprovalStatus)}
      {showRoster ? (
        <div className="text-[10px] leading-tight text-muted-foreground">Roster: {row.rosterStatus}</div>
      ) : null}
    </div>
  )
}

function roleBadge(role) {
  return (
    <Badge
      variant="outline"
      className="border-[#1447a6]/25 bg-white/90 capitalize text-[#081F5C] dark:border-[#1447a6]/35 dark:bg-[#04133d]/40 dark:text-blue-100"
    >
      {role}
    </Badge>
  )
}

const STAT_CARD_GRADIENT = {
  total: 'bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6]',
  customer: 'bg-linear-to-br from-sky-600 via-blue-600 to-indigo-900',
  'shop-owner': 'bg-linear-to-br from-violet-600 via-purple-700 to-fuchsia-950',
  independent: 'bg-linear-to-br from-amber-600 via-orange-600 to-amber-950',
  mechanic: 'bg-linear-to-br from-emerald-600 via-teal-600 to-emerald-900',
}

function StatGradientCard({ label, value, icon: Icon, variant }) {
  const gradient = STAT_CARD_GRADIENT[variant] ?? STAT_CARD_GRADIENT.total
  return (
    <div
      className={`relative min-h-[112px] min-w-0 overflow-hidden rounded-2xl border border-white/15 p-5 shadow-md transition-shadow duration-300 hover:shadow-lg sm:min-h-[128px] sm:p-6 ${gradient}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/10 to-transparent" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-white/85">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-white tabular-nums sm:text-3xl">{value}</p>
        </div>
        <div className="shrink-0 rounded-xl border border-white/25 bg-white/15 p-3 shadow-inner backdrop-blur-sm">
          <Icon className="h-5 w-5 text-white" aria-hidden />
        </div>
      </div>
    </div>
  )
}

const selectShell =
  'h-9 w-full appearance-none rounded-lg border border-[#081F5C]/15 bg-white/95 px-3 py-2 pr-8 text-sm shadow-sm outline-none focus-visible:border-[#1447a6]/50 focus-visible:ring-2 focus-visible:ring-[#081F5C]/20 dark:border-white/10 dark:bg-[#04133d]/30'

/** Admin: platform users (customers, shop owners, mechanics) — UI aligned with shop owner Manage Employee. */
export default function AdminUserManagement() {
  useLayoutEffect(() => {
    const tableX = document.getElementById('admin-um-table-x-scroll')
    if (tableX) {
      tableX.style.setProperty('scrollbar-width', 'none', 'important')
      tableX.style.setProperty('-ms-overflow-style', 'none', 'important')
    }
  }, [])

  const [users, setUsers] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [roleFilter, setRoleFilter] = useState('__')
  const [approvalFilter, setApprovalFilter] = useState('__')
  const [mechanicRosterFilter, setMechanicRosterFilter] = useState('__')
  const [dateRange, setDateRange] = useState('__')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailUser, setDetailUser] = useState(null)
  const [detailProfile, setDetailProfile] = useState(null)
  const [detailProfileLoading, setDetailProfileLoading] = useState(false)
  const [detailProfileError, setDetailProfileError] = useState('')
  const [moderationUser, setModerationUser] = useState(null)
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectFieldError, setRejectFieldError] = useState('')
  const [acting, setActing] = useState(false)

  const loadUsers = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setListLoading(false)
      setListError('Not signed in.')
      setUsers([])
      return
    }
    setListError('')
    setListLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/users/admin/list`, { headers: authHeaders() })
      if (res.status === 401) {
        window.location.hash = '#/login'
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data?.message === 'string' ? data.message : 'Could not load users')
      }
      const rows = Array.isArray(data) ? data : []

      const uniqPsgc = new Map()
      for (const u of rows) {
        if (u?.role !== 'customer') continue
        for (const [kind, key] of [
          ['barangay', 'barangay'],
          ['city', 'cityMunicipality'],
          ['province', 'province'],
        ]) {
          const v = u[key]
          if (v == null || v === '') continue
          const s = String(v).trim()
          if (!/^\d+$/.test(s)) continue
          uniqPsgc.set(`${kind}:${s}`, [kind, v])
        }
      }
      await Promise.all([...uniqPsgc.values()].map(([kind, code]) => resolvePsgcField(kind, code)))

      const mapped = (
        await Promise.all(
          rows.map(async (u) => {
            const base = mapUserFromApi(u)
            if (!base) return null
            if (base.roleRaw !== 'customer') return base
            const [brgy, city, prov] = await Promise.all([
              resolvePsgcField('barangay', u.barangay),
              resolvePsgcField('city', u.cityMunicipality),
              resolvePsgcField('province', u.province),
            ])
            const sub = [brgy, city, prov].filter(Boolean).join(', ')
            return { ...base, subtitle: sub || 'Customer' }
          }),
        )
      ).filter(Boolean)

      setUsers(mapped)
    } catch (e) {
      setListError(e?.message || 'Could not load users')
      setUsers([])
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    if (!detailOpen || !detailUser?.id) return undefined
    const id = detailUser.id
    let cancelled = false
    setDetailProfile(null)
    setDetailProfileError('')
    setDetailProfileLoading(true)
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/admin/${id}`, { headers: authHeaders() })
        if (res.status === 401) {
          window.location.hash = '#/login'
          return
        }
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(typeof data?.message === 'string' ? data.message : 'Could not load user')
        }
        if (!cancelled) setDetailProfile(data)
      } catch (e) {
        if (!cancelled) {
          setDetailProfileError(e?.message || 'Could not load user')
          setDetailProfile(null)
        }
      } finally {
        if (!cancelled) setDetailProfileLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [detailOpen, detailUser?.id])

  const stats = useMemo(() => {
    const total = users.length
    const customers = users.filter((u) => u.roleRaw === 'customer').length
    const owners = users.filter((u) => u.roleRaw === 'shop-owner').length
    const independents = users.filter((u) => u.roleRaw === 'oncall-mechanic-technician').length
    const mechanics = users.filter((u) => u.roleRaw === 'mechanic-technician').length
    return { total, customers, owners, independents, mechanics }
  }, [users])

  const filtered = useMemo(() => {
    const roleOk = roleFilter === '__' || roleFilter === '' ? null : roleFilter
    const approvalOk = approvalFilter === '__' || approvalFilter === '' ? null : approvalFilter
    const rosterOk =
      mechanicRosterFilter === '__' || mechanicRosterFilter === '' ? null : mechanicRosterFilter
    const { from, to } = getRangeDates(dateRange === '__' || dateRange === '' ? '' : dateRange)
    const query = q.trim().toLowerCase()

    return users.filter((e) => {
      if (roleOk && e.roleRaw !== roleOk) return false

      if (approvalOk && e.accountApprovalStatus !== approvalOk) return false

      if (rosterOk) {
        if (e.roleRaw !== 'mechanic-technician') return false
        if (e.rosterStatus !== rosterOk) return false
      }

      const joined = new Date(e.joinedAt)
      if (from && joined < from) return false
      if (to && joined > to) return false
      if (!query) return true
      return (
        e.fullName.toLowerCase().includes(query) ||
        e.email.toLowerCase().includes(query) ||
        e.role.toLowerCase().includes(query) ||
        (e.subtitle && e.subtitle.toLowerCase().includes(query))
      )
    })
  }, [users, roleFilter, approvalFilter, mechanicRosterFilter, dateRange, q])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageSlice = useMemo(() => {
    const p = Math.min(page, totalPages)
    const start = (p - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page, totalPages])

  useEffect(() => {
    setPage(1)
  }, [roleFilter, approvalFilter, mechanicRosterFilter, dateRange, q])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const fromIdx = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const toIdx = filtered.length === 0 ? 0 : Math.min(safePage * PAGE_SIZE, filtered.length)

  const pageNumbers = useMemo(() => {
    const tp = totalPages
    if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1)
    const pages = new Set([1, tp, safePage, safePage - 1, safePage + 1].filter((n) => n >= 1 && n <= tp))
    return [...pages].sort((a, b) => a - b)
  }, [totalPages, safePage])

  const openDetail = (row) => {
    setDetailUser(row)
    setDetailOpen(true)
  }

  const openApproveFlow = (userRow) => {
    setModerationUser(userRow)
    setApproveConfirmOpen(true)
  }

  const openRejectFlow = (userRow) => {
    setModerationUser(userRow)
    setRejectReason('')
    setRejectFieldError('')
    setRejectOpen(true)
  }

  const closeModerationDialogs = () => {
    setApproveConfirmOpen(false)
    setRejectOpen(false)
    setModerationUser(null)
    setRejectReason('')
    setRejectFieldError('')
    setActing(false)
  }

  const doApprove = async () => {
    if (!moderationUser) return
    setActing(true)
    setListError('')
    try {
      const res = await fetch(`${API_URL}/api/users/admin/${moderationUser.id}/approve`, {
        method: 'PATCH',
        headers: authHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        window.location.hash = '#/login'
        return
      }
      if (!res.ok) {
        throw new Error(typeof data?.message === 'string' ? data.message : 'Could not approve user.')
      }
      setApproveConfirmOpen(false)
      const approvedId = moderationUser.id
      setModerationUser(null)
      if (detailUser?.id === approvedId) {
        setDetailOpen(false)
        setDetailUser(null)
        setDetailProfile(null)
      }
      await loadUsers()
    } catch (e) {
      setListError(e?.message || 'Could not approve user.')
    } finally {
      setActing(false)
    }
  }

  const doReject = async () => {
    if (!moderationUser) return
    const reason = rejectReason.trim()
    if (!reason) {
      setRejectFieldError('Please provide a reason for rejection.')
      return
    }
    setRejectFieldError('')
    setActing(true)
    setListError('')
    try {
      const res = await fetch(`${API_URL}/api/users/admin/${moderationUser.id}/reject`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ reason }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 401) {
        window.location.hash = '#/login'
        return
      }
      if (!res.ok) {
        throw new Error(typeof data?.message === 'string' ? data.message : 'Could not reject user.')
      }
      setRejectOpen(false)
      setRejectReason('')
      const rejectedId = moderationUser.id
      setModerationUser(null)
      if (detailUser?.id === rejectedId) {
        setDetailOpen(false)
        setDetailUser(null)
        setDetailProfile(null)
      }
      await loadUsers()
    } catch (e) {
      setListError(e?.message || 'Could not reject user.')
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-3 overflow-x-hidden">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">User management</h1>
        <p className="text-sm text-muted-foreground">
          Customers, shop owners, and mechanics registered on E-Paayos (admin view).
        </p>
      </div>

      <div className="overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:thin] md:overflow-visible">
        <div className="grid w-full min-w-[520px] grid-cols-5 gap-2 sm:min-w-0 sm:gap-3">
          <StatGradientCard variant="total" label="Total users" value={stats.total} icon={Users} />
          <StatGradientCard variant="customer" label="Customers" value={stats.customers} icon={User} />
          <StatGradientCard variant="shop-owner" label="Shop owners" value={stats.owners} icon={Building2} />
          <StatGradientCard variant="independent" label="On-call providers" value={stats.independents} icon={HardHat} />
          <StatGradientCard variant="mechanic" label="Mechanics" value={stats.mechanics} icon={Wrench} />
        </div>
      </div>

      {listError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {listError}
        </div>
      ) : null}

      <div className="mb-1 flex min-w-0 max-w-full flex-col gap-3 lg:flex-row lg:items-stretch lg:justify-between">
        <div className="flex min-w-0 w-full max-w-full flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[140px] sm:flex-1 sm:max-w-[200px]">
            <select
              className={`${selectShell} ${roleFilter !== '__' ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-500'}`}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value === '' ? '__' : e.target.value)}
            >
              <option value="__" disabled hidden>
                Role
              </option>
              <option value="">All</option>
              <option value="customer">Customer</option>
              <option value="shop-owner">Shop owner</option>
              <option value="oncall-mechanic-technician">On-call Mechanic/Technician</option>
              <option value="mechanic-technician">Mechanic / technician</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          </div>

          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[200px]">
            <select
              className={`${selectShell} ${approvalFilter !== '__' ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-500'}`}
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value === '' ? '__' : e.target.value)}
            >
              <option value="__" disabled hidden>
                Approval
              </option>
              <option value="">All</option>
              <option value="pending">Pending approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          </div>

          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[200px]">
            <select
              className={`${selectShell} ${mechanicRosterFilter !== '__' ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-500'}`}
              value={mechanicRosterFilter}
              onChange={(e) => setMechanicRosterFilter(e.target.value === '' ? '__' : e.target.value)}
            >
              <option value="__" disabled hidden>
                Mechanic roster
              </option>
              <option value="">All</option>
              <option value="active">Active roster</option>
              <option value="on-leave">On leave</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          </div>

          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[160px] sm:flex-1 sm:max-w-[220px]">
            <select
              className={`${selectShell} ${dateRange !== '__' ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-500'}`}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value === '' ? '__' : e.target.value)}
            >
              <option value="__" disabled hidden>
                Date joined
              </option>
              <option value="">All</option>
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

        <div className="relative min-w-0 w-full max-w-full lg:max-w-lg lg:flex-1">
          <div className="relative w-full min-w-0 max-w-full">
            <Input
              className="h-9 w-full min-w-0 rounded-lg border-[#081F5C]/15 bg-white/95 pr-12 pl-4 text-sm shadow-sm focus-visible:border-[#1447a6]/45 focus-visible:ring-[#081F5C]/15 dark:border-white/10 dark:bg-[#04133d]/25"
              placeholder="Search by name, email, role, or notes…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search users"
            />
            <Button
              type="button"
              size="icon-sm"
              className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-md bg-linear-to-r from-[#081F5C] to-[#1447a6] p-0 shadow-sm hover:opacity-95"
              aria-label="Search"
            >
              <Search className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>
      </div>

      <Card className="mt-3 min-w-0 max-w-full overflow-hidden rounded-2xl border border-[#081F5C]/12 bg-white shadow-lg ring-1 ring-black/3 backdrop-blur-sm dark:border-white/10 dark:bg-[#0c1929]/90 dark:ring-white/6">
        <CardContent className="min-w-0 p-0">
          <div
            id="admin-um-table-x-scroll"
            className="scrollbar-hidden max-w-full overflow-x-auto overflow-y-hidden scroll-smooth"
          >
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="[&_tr]:border-0">
                <tr className="border-0 bg-linear-to-r from-[#081F5C] to-[#1447a6]">
                  <th className="w-[26%] border-0 px-4 py-3.5 text-left text-[11px] font-semibold tracking-widest text-white/95 uppercase">
                    User
                  </th>
                  <th className="w-[20%] border-0 px-3 py-3.5 pr-4 text-left text-[11px] font-semibold tracking-widest text-white/95 uppercase">
                    Email
                  </th>
                  <th className="w-[16%] border-0 px-3 py-3.5 text-left text-[11px] font-semibold tracking-widest text-white/95 uppercase">
                    Role
                  </th>
                  <th className="w-[14%] border-0 px-3 py-3.5 text-left text-[11px] font-semibold tracking-widest text-white/95 uppercase">
                    Status
                  </th>
                  <th className="w-[14%] border-0 px-3 py-3.5 text-left text-[11px] font-semibold tracking-widest text-white/95 uppercase">
                    Joined
                  </th>
                  <th className="w-[72px] border-0 px-3 py-3.5 text-center text-[11px] font-semibold tracking-widest text-white/95 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#04133d]/35">
                {listLoading ? (
                  <tr>
                    <td
                      className="rounded-b-2xl px-6 py-14 text-center text-sm text-muted-foreground"
                      colSpan={6}
                    >
                      Loading users…
                    </td>
                  </tr>
                ) : pageSlice.length === 0 ? (
                  <tr>
                    <td
                      className="rounded-b-2xl px-6 py-14 text-center text-sm text-muted-foreground"
                      colSpan={6}
                    >
                      {users.length === 0
                        ? 'No users yet, or you may not have admin access to this list.'
                        : 'No results match your filters. Try a different keyword or filter.'}
                    </td>
                  </tr>
                ) : (
                  pageSlice.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`transition-colors duration-150 hover:bg-[#081F5C]/5 dark:hover:bg-white/6 ${idx % 2 === 1 ? 'bg-[#081F5C]/2.5 dark:bg-white/2' : ''} ${idx < pageSlice.length - 1 ? 'border-b border-[#081F5C]/8 dark:border-white/5' : ''}`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar
                            className="size-10 shrink-0 ring-2 ring-white shadow-md ring-offset-2 ring-offset-background dark:ring-[#04133d] dark:ring-offset-[#04133d]/50"
                            size="sm"
                          >
                            <AvatarFallback className="bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-semibold text-white">
                              {initials(row.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-foreground">{row.fullName}</div>
                            <div className="truncate text-xs text-muted-foreground">{row.subtitle}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 pr-4 align-middle">
                        <div className="truncate text-sm text-foreground">{row.email}</div>
                        <div className="truncate text-xs text-muted-foreground">{row.phone}</div>
                      </td>
                      <td className="px-3 py-3.5 align-middle">{roleBadge(row.role)}</td>
                      <td className="px-3 py-3.5 align-middle">{statusCell(row)}</td>
                      <td className="px-3 py-3.5 align-middle text-sm tabular-nums text-muted-foreground">
                        {formatJoined(row.joinedAt)}
                      </td>
                      <td className="px-2 py-3 text-center align-middle">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mx-auto h-9 w-9 rounded-lg p-0 text-[#081F5C]/70 opacity-80 hover:bg-[#081F5C]/10 hover:text-[#081F5C] hover:opacity-100 dark:text-blue-200/80 dark:hover:bg-white/10"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 text-xs">
                            <DropdownMenuItem className="gap-2 text-xs" onClick={() => openDetail(row)}>
                              <Eye className="h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            {row.accountApprovalStatus === 'pending' || row.accountApprovalStatus === 'rejected' ? (
                              <DropdownMenuItem className="gap-2 text-xs" onClick={() => openApproveFlow(row)}>
                                <Check className="h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                            ) : null}
                            {row.accountApprovalStatus === 'pending' ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  className="gap-2 text-xs"
                                  onClick={() => openRejectFlow(row)}
                                >
                                  <XCircle className="h-4 w-4" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {filtered.length > 0 && (
        <div className="mt-4 flex min-w-0 max-w-full flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            Showing <span className="font-medium text-neutral-900 dark:text-neutral-100">{fromIdx}</span> to{' '}
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{toIdx}</span> of{' '}
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{filtered.length}</span> users
          </div>
          <Pagination>
            <PaginationContent className="flex-wrap justify-center gap-1">
              <PaginationItem>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
              </PaginationItem>

              {totalPages > 0 &&
                pageNumbers.map((p, i) => {
                  const prev = pageNumbers[i - 1]
                  const showEllipsisBefore = prev !== undefined && p - prev > 1
                  return (
                    <span key={p} className="flex items-center gap-1">
                      {showEllipsisBefore && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <Button
                          variant={safePage === p ? 'outline' : 'ghost'}
                          size="sm"
                          className="h-9 w-9 p-0"
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </Button>
                      </PaginationItem>
                    </span>
                  )
                })}

              <PaginationItem>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <Dialog open={approveConfirmOpen} onOpenChange={(open) => !open && closeModerationDialogs()}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Approve this user?</DialogTitle>
            <DialogDescription className="text-left text-gray-600 dark:text-gray-400">
              Are you sure you want to approve this user?
            </DialogDescription>
          </DialogHeader>
          {moderationUser ? (
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {moderationUser.fullName}{' '}
              <span className="font-normal text-gray-500 dark:text-gray-400">({moderationUser.email})</span>
            </p>
          ) : null}
          <DialogFooter className="mx-0 mb-0 gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={acting}
              onClick={() => {
                setApproveConfirmOpen(false)
                setModerationUser(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={acting || !moderationUser}
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={() => void doApprove()}
            >
              {acting ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRejectOpen(false)
            setRejectReason('')
            setRejectFieldError('')
            setModerationUser(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Reject user</DialogTitle>
            <DialogDescription className="text-left text-gray-600 dark:text-gray-400">
              Provide a reason for rejection. The user will see this message when they try to sign in.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Textarea
              className="min-h-[120px] resize-none"
              placeholder="Enter reason for rejection (required)"
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value)
                if (rejectFieldError) setRejectFieldError('')
              }}
              aria-invalid={!!rejectFieldError}
            />
            {rejectFieldError ? <p className="text-sm text-rose-600 dark:text-rose-400">{rejectFieldError}</p> : null}
          </div>
          <DialogFooter className="mx-0 mb-0 gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={acting}
              onClick={() => {
                setRejectOpen(false)
                setRejectReason('')
                setRejectFieldError('')
                setModerationUser(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={acting || !moderationUser}
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={() => void doReject()}
            >
              {acting ? 'Rejecting...' : 'Reject user'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) {
            setDetailUser(null)
            setDetailProfile(null)
            setDetailProfileError('')
            setDetailProfileLoading(false)
          }
        }}
      >
        <DialogContent
          className="flex max-h-[90vh] max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden border-gray-200 bg-white p-0 sm:max-w-3xl dark:border-white/10 dark:bg-popover"
          showCloseButton
        >
          <DialogHeader className="shrink-0 space-y-1 border-b border-gray-200 px-4 py-4 text-left sm:px-6 dark:border-white/10">
            <DialogTitle className="text-lg text-gray-900 dark:text-gray-100">User registration</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              {detailUser
                ? `${detailUser.fullName} — full registration data as submitted on sign-up.`
                : 'Read-only view.'}
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50/50 px-4 py-5 sm:px-6 dark:bg-transparent">
            {detailProfileLoading ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Loading registration data…</p>
            ) : detailProfileError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
                {detailProfileError}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 dark:border-white/10 dark:bg-gray-950/30">
                <AdminRegistrationDetailView profile={detailProfile} apiBaseUrl={API_URL} />
              </div>
            )}
          </div>
          {!detailProfileLoading && !detailProfileError && detailUser && detailProfile ? (
            (() => {
              const st = detailProfile.accountApprovalStatus
              const isPending = st === 'pending'
              const isRejected = st === 'rejected'
              if (!isPending && !isRejected) return null
              return (
                <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none border-t border-gray-200 bg-white px-4 py-3 sm:justify-end sm:px-6 dark:border-white/10 dark:bg-gray-950/80">
                  <div className="flex w-full flex-row justify-end gap-2">
                    {isPending ? (
                      <Button type="button" variant="secondary" onClick={() => openRejectFlow(detailUser)}>
                        Reject
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      className="bg-linear-to-r from-blue-600 to-purple-600 text-white shadow-sm hover:opacity-95"
                      onClick={() => openApproveFlow(detailUser)}
                    >
                      Approve
                    </Button>
                  </div>
                </DialogFooter>
              )
            })()
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
