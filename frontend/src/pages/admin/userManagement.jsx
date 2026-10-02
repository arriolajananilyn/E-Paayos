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
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  HardHat,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Search,
  ShieldCheck,
  User,
  UserCheck,
  Users,
  UserX,
  Wrench,
  X,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

function formatRegisteredUnder(emp) {
  if (!emp) return ''
  if (typeof emp === 'string') return emp
  const shop = emp.shopName ? String(emp.shopName).trim() : ''
  const name = emp.fullName ? String(emp.fullName).trim() : ''
  if (shop && name) return `${shop} (${name})`
  return shop || name || emp.email || ''
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
  const registeredUnder = formatRegisteredUnder(u.employedByShopOwner)
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
    registeredUnder,
    employedByShopOwner: u.employedByShopOwner,
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
        <span className="inline-flex items-center rounded-none border border-amber-200 bg-amber-50 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-700">
          Pending approval
        </span>
      )
    case 'rejected':
      return (
        <span className="inline-flex items-center rounded-none border border-rose-200 bg-rose-50 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-rose-700">
          Rejected
        </span>
      )
    case 'approved':
    default:
      return (
        <span className="inline-flex items-center rounded-none border border-emerald-200 bg-emerald-50 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-emerald-700">
          Approved
        </span>
      )
  }
}

function statusCell(row) {
  const isMechanic = row.roleRaw === 'mechanic-technician'
  return (
    <div className="flex flex-col gap-1">
      {accountApprovalBadge(row.accountApprovalStatus)}
      {isMechanic ? (
        <div
          className="max-w-[200px] break-words text-[10px] leading-tight text-slate-500 font-medium"
          title={row.registeredUnder || '—'}
        >
          Registered under: <span className="font-semibold text-slate-800">{row.registeredUnder || '—'}</span>
        </div>
      ) : null}
    </div>
  )
}

function roleBadge(role) {
  return (
    <span className="inline-flex items-center rounded-none border border-blue-200 bg-blue-50 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-blue-700 capitalize">
      {role}
    </span>
  )
}

const STAT_CARD_GRADIENT = {
  total: "from-[#04133d] via-[#081F5C] to-[#1447a6] border-[#1447a6]/40",
  customer: "from-blue-600 via-indigo-700 to-slate-950 border-blue-400/30",
  'shop-owner': "from-purple-600 via-violet-700 to-slate-950 border-purple-400/30",
  independent: "from-amber-600 via-orange-700 to-slate-950 border-amber-400/30",
  mechanic: "from-emerald-600 via-teal-700 to-slate-950 border-emerald-400/30",
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

const selectShell =
  "h-9 w-full appearance-none rounded-none border border-slate-200 bg-white px-3 py-1.5 pr-8 text-xs font-semibold text-slate-800 shadow-xs outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"

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
  const [copiedId, setCopiedId] = useState(false)

  const handleCopyText = (text) => {
    if (!text) return
    navigator.clipboard?.writeText(text)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

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
        (e.subtitle && e.subtitle.toLowerCase().includes(query)) ||
        (e.registeredUnder && e.registeredUnder.toLowerCase().includes(query))
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
    <div className="w-full min-w-0 max-w-full space-y-3.5 sm:space-y-4 overflow-x-hidden">
      <div className="space-y-0.5 min-w-0 flex-1">
        <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate">User management</h1>
        <p className="text-xs text-slate-500 font-medium">
          Customers, shop owners, and mechanics registered on E-Paayos (admin view).
        </p>
      </div>

      <div className="grid w-full grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3.5">
        <StatGradientCard
          variant="total"
          label="Total users"
          value={stats.total}
          helper="All registered accounts"
          icon={Users}
          onClick={() => {
            setRoleFilter('')
            setPage(1)
          }}
        />
        <StatGradientCard
          variant="customer"
          label="Customers"
          value={stats.customers}
          helper="Service buyers"
          icon={User}
          onClick={() => {
            setRoleFilter('customer')
            setPage(1)
          }}
        />
        <StatGradientCard
          variant="shop-owner"
          label="Shop owners"
          value={stats.owners}
          helper="Repair shop owners"
          icon={Building2}
          onClick={() => {
            setRoleFilter('shop-owner')
            setPage(1)
          }}
        />
        <StatGradientCard
          variant="independent"
          label="On-call providers"
          value={stats.independents}
          helper="Independent mechanics"
          icon={HardHat}
          onClick={() => {
            setRoleFilter('oncall-mechanic-technician')
            setPage(1)
          }}
        />
        <StatGradientCard
          variant="mechanic"
          label="Mechanics"
          value={stats.mechanics}
          helper="Shop technicians"
          icon={Wrench}
          className="col-span-2 sm:col-span-1 xl:col-span-1"
          onClick={() => {
            setRoleFilter('mechanic-technician')
            setPage(1)
          }}
        />
      </div>

      {listError ? (
        <div className="rounded-none border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
          {listError}
        </div>
      ) : null}

      <div className="mb-1 flex min-w-0 max-w-full flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-stretch lg:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-1 sm:flex-row sm:flex-wrap sm:gap-3 min-w-0 w-full max-w-full">
          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[140px] sm:flex-1 sm:max-w-[200px]">
            <select
              className={selectShell}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value === '' ? '__' : e.target.value)}
            >
              <option value="__" disabled hidden>
                Role
              </option>
              <option value="">All roles</option>
              <option value="customer">Customer</option>
              <option value="shop-owner">Shop owner</option>
              <option value="oncall-mechanic-technician">On-call Mechanic/Technician</option>
              <option value="mechanic-technician">Mechanic / technician</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[200px]">
            <select
              className={selectShell}
              value={approvalFilter}
              onChange={(e) => setApprovalFilter(e.target.value === '' ? '__' : e.target.value)}
            >
              <option value="__" disabled hidden>
                Approval
              </option>
              <option value="">All statuses</option>
              <option value="pending">Pending approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[200px]">
            <select
              className={selectShell}
              value={mechanicRosterFilter}
              onChange={(e) => setMechanicRosterFilter(e.target.value === '' ? '__' : e.target.value)}
            >
              <option value="__" disabled hidden>
                Mechanic roster
              </option>
              <option value="">All roster</option>
              <option value="active">Active roster</option>
              <option value="on-leave">On leave</option>
              <option value="inactive">Inactive</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[160px] sm:flex-1 sm:max-w-[220px]">
            <select
              className={selectShell}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value === '' ? '__' : e.target.value)}
            >
              <option value="__" disabled hidden>
                Date joined
              </option>
              <option value="">All time</option>
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

        <div className="relative min-w-0 w-full max-w-full lg:max-w-lg lg:flex-1">
          <div className="relative w-full min-w-0 max-w-full">
            <Input
              className="h-9 w-full min-w-0 rounded-none border border-slate-200 bg-white pr-12 pl-3.5 text-xs font-medium text-slate-800 shadow-xs focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
              placeholder="Search by name, email, role, or notes…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search users"
            />
            <Button
              type="button"
              size="icon-sm"
              className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-none bg-gradient-to-br from-[#081F5C] to-[#1447a6] p-0 shadow-xs hover:opacity-95"
              aria-label="Search"
            >
              <Search className="h-3.5 w-3.5 text-white" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-3 min-w-0 max-w-full overflow-hidden rounded-none border border-slate-200/60 bg-white/90 shadow-sm ring-1 ring-slate-200/45 backdrop-blur-sm dark:border-white/10 dark:bg-[#0c1929]/90">
        <div className="min-w-0 p-0">
          {/* Desktop Table View */}
          <div
            id="admin-um-table-x-scroll"
            className="scrollbar-hidden hidden max-w-full overflow-x-auto overflow-y-hidden scroll-smooth md:block"
          >
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="[&_tr]:border-0">
                <tr className="border-0 bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6]">
                  <th className="w-[26%] border-0 px-4 py-3 text-left text-[11px] font-black tracking-wider text-white uppercase">
                    User
                  </th>
                  <th className="w-[20%] border-0 px-3 py-3 pr-4 text-left text-[11px] font-black tracking-wider text-white uppercase">
                    Email
                  </th>
                  <th className="w-[16%] border-0 px-3 py-3 text-left text-[11px] font-black tracking-wider text-white uppercase">
                    Role
                  </th>
                  <th className="w-[14%] border-0 px-3 py-3 text-left text-[11px] font-black tracking-wider text-white uppercase">
                    Status
                  </th>
                  <th className="w-[14%] border-0 px-3 py-3 text-left text-[11px] font-black tracking-wider text-white uppercase">
                    Joined
                  </th>
                  <th className="w-[72px] border-0 px-3 py-3 text-center text-[11px] font-black tracking-wider text-white uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#04133d]/35">
                {listLoading ? (
                  <tr>
                    <td
                      className="px-6 py-14 text-center text-xs font-semibold text-slate-500"
                      colSpan={6}
                    >
                      Loading users…
                    </td>
                  </tr>
                ) : pageSlice.length === 0 ? (
                  <tr>
                    <td
                      className="px-6 py-14 text-center text-xs font-semibold text-slate-500"
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
                      className={`transition-colors duration-150 hover:bg-slate-50/80 ${idx % 2 === 1 ? 'bg-slate-50/40' : ''} ${idx < pageSlice.length - 1 ? 'border-b border-slate-100' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                          <Avatar
                            className="size-9 shrink-0 ring-2 ring-white shadow-xs"
                            size="sm"
                          >
                            <AvatarFallback className="bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-bold text-white">
                              {initials(row.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-xs text-slate-900">{row.fullName}</div>
                            <div className="truncate text-[11px] text-slate-500 font-medium">{row.subtitle}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 pr-4 align-middle">
                        <div className="truncate text-xs font-semibold text-slate-800">{row.email}</div>
                        <div className="truncate text-[11px] text-slate-500 font-medium">{row.phone}</div>
                      </td>
                      <td className="px-3 py-3 align-middle">{roleBadge(row.role)}</td>
                      <td className="px-3 py-3 align-middle">{statusCell(row)}</td>
                      <td className="px-3 py-3 align-middle text-xs tabular-nums text-slate-600 font-medium">
                        {formatJoined(row.joinedAt)}
                      </td>
                      <td className="px-2 py-3 text-center align-middle">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mx-auto h-7 w-7 rounded-none p-0 text-[#081F5C] hover:bg-slate-100 transition-colors"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 text-xs rounded-none">
                            <DropdownMenuItem className="gap-2 text-xs" onClick={() => openDetail(row)}>
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </DropdownMenuItem>
                            {row.accountApprovalStatus === 'pending' || row.accountApprovalStatus === 'rejected' ? (
                              <DropdownMenuItem className="gap-2 text-xs" onClick={() => openApproveFlow(row)}>
                                <Check className="h-3.5 w-3.5" />
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
                                  <XCircle className="h-3.5 w-3.5" />
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

          {/* Mobile User Cards View */}
          <div className="block divide-y divide-slate-100 dark:divide-white/5 md:hidden">
            {listLoading ? (
              <div className="px-4 py-12 text-center text-xs font-medium text-slate-500">
                Loading users…
              </div>
            ) : pageSlice.length === 0 ? (
              <div className="px-4 py-12 text-center text-xs font-medium text-slate-500">
                {users.length === 0
                  ? 'No users yet, or you may not have admin access to this list.'
                  : 'No results match your filters. Try a different keyword or filter.'}
              </div>
            ) : (
              pageSlice.map((row) => (
                <div key={row.id} className="p-3 sm:p-3.5 space-y-2.5 transition-colors bg-gradient-to-r from-white via-slate-50/40 to-blue-50/20 hover:bg-slate-50/80">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        className="size-9 sm:size-10 shrink-0 ring-2 ring-white shadow-xs"
                        size="sm"
                      >
                        <AvatarFallback className="bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-bold text-white">
                          {initials(row.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-xs sm:text-sm text-slate-900">{row.fullName}</div>
                        <div className="truncate text-[11px] text-slate-500 font-medium">{row.subtitle}</div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 rounded-none p-0 text-[#081F5C] hover:bg-white border border-slate-200 shadow-xs shrink-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 text-xs z-50 rounded-none">
                        <DropdownMenuItem className="gap-2 text-xs" onClick={() => openDetail(row)}>
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </DropdownMenuItem>
                        {row.accountApprovalStatus === 'pending' || row.accountApprovalStatus === 'rejected' ? (
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => openApproveFlow(row)}>
                            <Check className="h-3.5 w-3.5" />
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
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1.5 border-t border-slate-100">
                    <div className="space-y-0.5 min-w-0">
                      <div className="truncate font-semibold text-xs text-slate-800">{row.email}</div>
                      <div className="truncate text-[11px] text-slate-500 font-medium">{row.phone}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {roleBadge(row.role)}
                      {statusCell(row)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span className="font-medium text-[10px] sm:text-[11px]">Joined: {formatJoined(row.joinedAt)}</span>
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

      {filtered.length > 0 && (
        <div className="mt-4 flex min-w-0 max-w-full flex-col items-center justify-between gap-3 sm:flex-row sm:gap-4">
          <div className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 text-center sm:text-left">
            Showing <span className="font-medium text-neutral-900 dark:text-neutral-100">{fromIdx}</span> to{' '}
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{toIdx}</span> of{' '}
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{filtered.length}</span> users
          </div>
          <Pagination className="mx-0 w-auto">
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

      {/* 1. Approve Confirmation Dialog */}
      <Dialog open={approveConfirmOpen} onOpenChange={(open) => !open && closeModerationDialogs()}>
        <DialogContent
          className="max-h-[90vh] max-w-[calc(100vw-1.5rem)] sm:max-w-md overflow-hidden flex flex-col p-0 border border-slate-200 bg-white shadow-2xl rounded-none dark:border-slate-800 dark:bg-slate-900"
          showCloseButton
        >
          <div className="bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-4 py-3 sm:px-5 sm:py-3.5 text-white shrink-0 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 sm:size-8 items-center justify-center bg-white/15 text-white border border-white/20 shrink-0">
                <CheckCircle2 className="size-4 text-emerald-300" />
              </div>
              <div>
                <DialogTitle className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                  Approve User Registration
                </DialogTitle>
                <DialogDescription className="text-[10px] sm:text-[11px] text-blue-100/75 font-normal">
                  Grant full verified access to the platform
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm">
            {moderationUser ? (
              <div className="border border-slate-200 bg-slate-50/80 p-3.5 space-y-2 rounded-none dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-9 rounded-none border border-slate-300">
                    <AvatarFallback className="rounded-none bg-[#1447a6] text-white font-bold text-xs">
                      {moderationUser.fullName ? moderationUser.fullName.slice(0, 2).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 dark:text-white truncate text-sm">
                      {moderationUser.fullName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {moderationUser.email}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase shrink-0">
                    {moderationUser.role}
                  </Badge>
                </div>
              </div>
            ) : null}

            <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800/60 dark:text-emerald-200 text-xs leading-relaxed">
              <p className="font-bold mb-0.5">Verification Note:</p>
              Approving this user will verify their account immediately. They will be permitted to log in and use all corresponding features in E-Paayos.
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end shrink-0 dark:border-slate-800 dark:bg-slate-950">
            <Button
              type="button"
              variant="outline"
              disabled={acting}
              className="h-8 px-4 text-xs font-bold rounded-none border-slate-300 hover:bg-slate-100 dark:border-slate-700"
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
              className="h-8 px-4 text-xs font-bold rounded-none bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
              onClick={() => void doApprove()}
            >
              {acting ? 'Approving...' : 'Confirm Approval'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Reject Form Dialog */}
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
        <DialogContent
          className="max-h-[90vh] max-w-[calc(100vw-1.5rem)] sm:max-w-lg overflow-hidden flex flex-col p-0 border border-rose-200 bg-white shadow-2xl rounded-none dark:border-rose-900/60 dark:bg-slate-900"
          showCloseButton
        >
          <div className="bg-gradient-to-r from-rose-900 via-red-800 to-slate-950 px-4 py-3 sm:px-5 sm:py-3.5 text-white shrink-0 border-b border-rose-700/30">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 sm:size-8 items-center justify-center bg-white/15 text-white border border-white/20 shrink-0">
                <XCircle className="size-4 text-rose-300" />
              </div>
              <div>
                <DialogTitle className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                  Reject User Registration
                </DialogTitle>
                <DialogDescription className="text-[10px] sm:text-[11px] text-rose-100/75 font-normal">
                  Provide a specific reason for rejection
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm">
            {moderationUser ? (
              <div className="border border-slate-200 bg-slate-50/80 p-3.5 space-y-2 rounded-none dark:border-slate-800 dark:bg-slate-800/40">
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-9 rounded-none border border-slate-300">
                    <AvatarFallback className="rounded-none bg-rose-700 text-white font-bold text-xs">
                      {moderationUser.fullName ? moderationUser.fullName.slice(0, 2).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 dark:text-white truncate text-sm">
                      {moderationUser.fullName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {moderationUser.email}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold uppercase shrink-0">
                    {moderationUser.role}
                  </Badge>
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Reason for Rejection <span className="text-rose-600">*</span>
              </label>
              <Textarea
                className="min-h-[110px] resize-none text-xs rounded-none border-slate-200 focus-visible:ring-rose-500 dark:border-slate-700"
                placeholder="e.g. Unclear or invalid government ID submitted, unverified business permit, mismatched name and documentation..."
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value)
                  if (rejectFieldError) setRejectFieldError('')
                }}
                aria-invalid={!!rejectFieldError}
              />
              {rejectFieldError ? (
                <p className="text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center gap-1 mt-1">
                  <AlertTriangle className="size-3 shrink-0" />
                  <span>{rejectFieldError}</span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  The applicant will see this explanation message when attempting to log into the platform.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end shrink-0 dark:border-slate-800 dark:bg-slate-950">
            <Button
              type="button"
              variant="outline"
              disabled={acting}
              className="h-8 px-4 text-xs font-bold rounded-none border-slate-300 hover:bg-slate-100 dark:border-slate-700"
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
              className="h-8 px-4 text-xs font-bold rounded-none bg-rose-600 text-white hover:bg-rose-700 shadow-xs"
              onClick={() => void doReject()}
            >
              {acting ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. User Registration Profile Modal */}
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
          className="max-h-[90vh] max-w-[calc(100vw-1.5rem)] sm:max-w-3xl lg:max-w-4xl overflow-hidden flex flex-col p-0 border border-slate-200 bg-white shadow-2xl rounded-none dark:border-slate-800 dark:bg-slate-900"
          showCloseButton
        >
          {/* Sleek Compact Header Banner */}
          <div className="bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-4 py-3 sm:px-5 sm:py-3.5 text-white shrink-0 border-b border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pr-6">
              <div className="flex items-center gap-2.5">
                <div className="flex size-7 sm:size-8 items-center justify-center bg-white/15 text-white border border-white/20 shrink-0">
                  <User className="size-3.5 sm:size-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                      User Registration Profile
                    </DialogTitle>
                    {detailUser ? (
                      <button
                        type="button"
                        onClick={() => handleCopyText(detailUser.id)}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/15 hover:bg-white/25 text-white border border-white/30 transition-colors"
                        title="Click to copy User ID"
                      >
                        <span>ID: {detailUser.id ? detailUser.id.slice(-8).toUpperCase() : '—'}</span>
                        {copiedId ? (
                          <Check className="size-2.5 text-emerald-300" />
                        ) : (
                          <Copy className="size-2.5 text-white/70" />
                        )}
                      </button>
                    ) : null}
                  </div>
                  <DialogDescription className="text-[10px] sm:text-[11px] text-blue-100/75 font-normal">
                    {detailUser ? `${detailUser.fullName} (${detailUser.email})` : 'Read-only profile view'}
                  </DialogDescription>
                </div>
              </div>

              {/* Badges in same compact row */}
              {detailUser ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-white/15 text-white border-white/30">
                    {detailUser.role}
                  </Badge>
                  {accountApprovalBadge(detailUser.accountApprovalStatus)}
                </div>
              ) : null}
            </div>
          </div>

          {/* Scrollable Profile Body */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-4 sm:p-6 dark:bg-slate-950/40">
            {detailProfileLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                <div className="size-8 border-3 border-[#1447a6] border-t-transparent animate-spin rounded-full" />
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Loading registration data…</p>
              </div>
            ) : detailProfileError ? (
              <div className="border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200 flex items-start gap-2">
                <AlertTriangle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Failed to load registration data:</span>
                  <p className="mt-0.5">{detailProfileError}</p>
                </div>
              </div>
            ) : (
              <AdminRegistrationDetailView profile={detailProfile} apiBaseUrl={API_URL} />
            )}
          </div>

          {/* Dialog Footer with Action Controls */}
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
              {detailUser?.joinedAt ? `Account created ${detailUser.joinedAt}` : 'User Management System'}
            </p>

            <div className="flex w-full sm:w-auto items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto h-8 px-4 text-xs font-bold rounded-none border-slate-300 hover:bg-slate-100 dark:border-slate-700"
                onClick={() => setDetailOpen(false)}
              >
                Close
              </Button>

              {!detailProfileLoading && !detailProfileError && detailUser && detailProfile ? (
                (() => {
                  const st = detailProfile.accountApprovalStatus
                  const isPending = st === 'pending'
                  const isRejected = st === 'rejected'

                  if (!isPending && !isRejected) return null

                  return (
                    <div className="flex items-center gap-2">
                      {isPending ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-8 px-3.5 text-xs font-bold rounded-none border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400"
                          onClick={() => openRejectFlow(detailUser)}
                        >
                          Reject
                        </Button>
                      ) : null}

                      <Button
                        type="button"
                        className="h-8 px-4 text-xs font-bold rounded-none bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                        onClick={() => openApproveFlow(detailUser)}
                      >
                        {isRejected ? 'Re-evaluate & Approve' : 'Approve'}
                      </Button>
                    </div>
                  )
                })()
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
