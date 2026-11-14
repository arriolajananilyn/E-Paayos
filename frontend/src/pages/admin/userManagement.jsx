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
  IssueWarningDialog,
  LiftRestrictionDialog,
  RestrictUserDialog,
  ReviewAppealDialog,
} from '@/components/admin/UserModerationDialogs.jsx'
import {
  AlertTriangle,
  Ban,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  HardHat,
  History,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
  Search,
  ShieldAlert,
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
    moderationStatus: u.moderationStatus || 'active',
    warningCount: Number(u.warningCount || 0),
    unacknowledgedWarningCount: Number(u.unacknowledgedWarningCount || 0),
    warnings: Array.isArray(u.warnings) ? u.warnings : [],
    appeals: Array.isArray(u.appeals) ? u.appeals : [],
    pendingAppealCount: Number(u.pendingAppealCount || 0),
    latestAppealStatus: u.latestAppealStatus || '',
    latestAppeal: u.latestAppeal || null,
    restrictedAt: u.restrictedAt || null,
    restrictedUntil: u.restrictedUntil || null,
    restrictionReason: u.restrictionReason || '',
    restrictionCategory: u.restrictionCategory || '',
    complaintsAgainstCount: Number(u.complaintsAgainstCount || 0),
    openComplaintsAgainstCount: Number(u.openComplaintsAgainstCount || 0),
    complaintsFiledCount: Number(u.complaintsFiledCount || 0),
    joinedAt: joined,
    subtitle,
    shopName: u.shopName || '',
    shopJobTitle: u.shopJobTitle || '',
    courseProgram: u.courseProgram || '',
  }
}

function initials(name) {
  const letter = String(name ?? '').trim().charAt(0)
  return letter ? letter.toUpperCase() : '?'
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

function moderationStandingBadge(row) {
  const st = row?.moderationStatus || 'active'
  const strikes = Number(row?.warningCount || 0)
  if (st === 'restricted') {
    return (
      <span className="inline-flex items-center gap-1 rounded-none border border-rose-300 bg-rose-100 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-rose-800">
        <Ban className="size-2.5 shrink-0" />
        Restricted
      </span>
    )
  }
  if (st === 'warned' || strikes > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-none border border-amber-300 bg-amber-50 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-800">
        <ShieldAlert className="size-2.5 shrink-0 text-amber-600" />
        Warned ({strikes} Strike{strikes === 1 ? '' : 's'})
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-none border border-slate-200 bg-slate-50 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider text-slate-600">
      <ShieldCheck className="size-2.5 shrink-0 text-emerald-600" />
      Good Standing
    </span>
  )
}

function statusCell(row) {
  const isMechanic = row.roleRaw === 'mechanic-technician'
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1">
        {accountApprovalBadge(row.accountApprovalStatus)}
        {row.accountApprovalStatus === 'approved' ? moderationStandingBadge(row) : null}
      </div>
      {row.accountApprovalStatus === 'approved' && row.pendingAppealCount > 0 ? (
        <div className="inline-flex items-center gap-1 rounded-none border border-blue-300 bg-blue-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-blue-800 w-fit">
          <Clock className="size-2.5 shrink-0" />
          {row.latestAppealStatus === 'under_review' ? 'Appeal Reviewing' : 'Appeal Pending'}
        </div>
      ) : null}
      {row.complaintsAgainstCount > 0 ? (
        <div className="text-[10px] font-bold text-rose-700">
          {row.complaintsAgainstCount} Report{row.complaintsAgainstCount === 1 ? '' : 's'} Against
          {row.openComplaintsAgainstCount > 0 ? ` (${row.openComplaintsAgainstCount} Open)` : ''}
        </div>
      ) : null}
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
  total: 'text-[#224d84]',
  customer: 'text-sky-600',
  'shop-owner': 'text-purple-600',
  independent: 'text-amber-500',
  mechanic: 'text-emerald-600',
}

function StatGradientCard({ label, value, sub, helper, icon: Icon, variant, onClick, className }) {
  const iconTone = STAT_CARD_GRADIENT[variant] ?? STAT_CARD_GRADIENT.total ?? 'text-[#224d84]'
  const helperText = helper || sub
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-none border border-[#c9e8fd] bg-white p-3 sm:p-4 shadow-[0_10px_28px_-18px_rgba(1,30,72,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#8fc8f3] hover:shadow-[0_16px_32px_-18px_rgba(1,30,72,0.5)]',
        onClick ? 'cursor-pointer' : '',
        className
      )}
    >
      <Icon className={cn('pointer-events-none absolute -right-2 -bottom-3 size-16 sm:size-20 rotate-12 stroke-[1.15] opacity-[0.12] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6', iconTone)} />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[#011e48] tabular-nums">
            {value}
          </p>
          {helperText ? (
            <p className="mt-1 truncate text-[10px] sm:text-[11px] font-medium text-slate-500">
              {helperText}
            </p>
          ) : null}
        </div>
        <Icon className={cn('size-5 sm:size-6 shrink-0', iconTone)} />
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
  const [standingFilter, setStandingFilter] = useState('__')
  const [mechanicRosterFilter, setMechanicRosterFilter] = useState('__')
  const [dateRange, setDateRange] = useState('__')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTab, setDetailTab] = useState('profile')
  const [detailUser, setDetailUser] = useState(null)
  const [detailProfile, setDetailProfile] = useState(null)
  const [detailProfileLoading, setDetailProfileLoading] = useState(false)
  const [detailProfileError, setDetailProfileError] = useState('')
  const [moderationUser, setModerationUser] = useState(null)
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [warnOpen, setWarnOpen] = useState(false)
  const [restrictOpen, setRestrictOpen] = useState(false)
  const [liftRestrictOpen, setLiftRestrictOpen] = useState(false)
  const [reviewAppealOpen, setReviewAppealOpen] = useState(false)
  const [reviewAppealTarget, setReviewAppealTarget] = useState(null)
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
    const pendingApproval = users.filter((u) => u.accountApprovalStatus === 'pending').length
    const warned = users.filter((u) => u.moderationStatus === 'warned').length
    const restricted = users.filter((u) => u.moderationStatus === 'restricted').length
    const pendingAppeals = users.filter((u) => u.pendingAppealCount > 0).length
    const withReports = users.filter((u) => u.complaintsAgainstCount > 0).length
    return { total, customers, owners, independents, mechanics, pendingApproval, warned, restricted, pendingAppeals, withReports }
  }, [users])

  const filtered = useMemo(() => {
    const roleOk = roleFilter === '__' || roleFilter === '' ? null : roleFilter
    const approvalOk = approvalFilter === '__' || approvalFilter === '' ? null : approvalFilter
    const standingOk = standingFilter === '__' || standingFilter === '' ? null : standingFilter
    const rosterOk =
      mechanicRosterFilter === '__' || mechanicRosterFilter === '' ? null : mechanicRosterFilter
    const { from, to } = getRangeDates(dateRange === '__' || dateRange === '' ? '' : dateRange)
    const query = q.trim().toLowerCase()

    return users.filter((e) => {
      if (roleOk && e.roleRaw !== roleOk) return false

      if (approvalOk && e.accountApprovalStatus !== approvalOk) return false

      if (standingOk) {
        if (standingOk === 'reported') {
          if (!(e.complaintsAgainstCount > 0)) return false
        } else if (standingOk === 'pending_appeal') {
          if (!(e.pendingAppealCount > 0)) return false
        } else if (e.moderationStatus !== standingOk) {
          return false
        }
      }

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
  }, [users, roleFilter, approvalFilter, standingFilter, mechanicRosterFilter, dateRange, q])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageSlice = useMemo(() => {
    const p = Math.min(page, totalPages)
    const start = (p - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page, totalPages])

  useEffect(() => {
    setPage(1)
  }, [roleFilter, approvalFilter, standingFilter, mechanicRosterFilter, dateRange, q])

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

  const openDetail = (row, initialTab = 'profile') => {
    setDetailUser(row)
    setDetailTab(initialTab)
    setDetailOpen(true)
  }

  const refreshDetailIfNeeded = async (targetUserId) => {
    await loadUsers()
    if (detailOpen && detailUser?.id === targetUserId) {
      try {
        const res = await fetch(`${API_URL}/api/users/admin/${targetUserId}`, { headers: authHeaders() })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data?._id) {
          setDetailProfile(data)
          setDetailUser((prev) =>
            prev
              ? {
                  ...prev,
                  moderationStatus: data.moderationStatus || 'active',
                  warningCount: Number(data.warningCount || 0),
                  restrictionReason: data.restrictionReason || '',
                  restrictedUntil: data.restrictedUntil || null,
                }
              : prev
          )
        }
      } catch {
        // silent
      }
    }
  }

  const closeDetail = () => {
    setDetailOpen(false)
    setDetailTab('profile')
    setDetailUser(null)
    setDetailProfile(null)
    setDetailProfileError('')
    setDetailProfileLoading(false)
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

  const openWarnFlow = (userRow) => {
    setModerationUser(userRow)
    setWarnOpen(true)
  }

  const openRestrictFlow = (userRow) => {
    setModerationUser(userRow)
    setRestrictOpen(true)
  }

  const openLiftRestrictFlow = (userRow) => {
    setModerationUser(userRow)
    setLiftRestrictOpen(true)
  }

  const openReviewAppealFlow = (userRow, appealObj) => {
    setModerationUser(userRow)
    setReviewAppealTarget(appealObj || userRow?.latestAppeal || null)
    setReviewAppealOpen(true)
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
        closeDetail()
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
        closeDetail()
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

      {/* Progressive Discipline & Moderation Quick Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border border-slate-200 bg-white px-3.5 py-2.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mr-1">
            Moderation Quick Filter:
          </span>
          <button
            type="button"
            onClick={() => {
              setApprovalFilter((prev) => (prev === 'pending' ? '__' : 'pending'))
              setStandingFilter('__')
            }}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold border transition-colors cursor-pointer',
              approvalFilter === 'pending'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            )}
          >
            <Clock className="size-3" />
            <span>Pending Approval ({stats.pendingApproval})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setStandingFilter((prev) => (prev === 'warned' ? '__' : 'warned'))
              setApprovalFilter('__')
            }}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold border transition-colors cursor-pointer',
              standingFilter === 'warned'
                ? 'bg-amber-700 text-white border-amber-700'
                : 'bg-amber-50/70 text-amber-900 border-amber-300 hover:bg-amber-100'
            )}
          >
            <ShieldAlert className="size-3" />
            <span>Warned Users ({stats.warned})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setStandingFilter((prev) => (prev === 'restricted' ? '__' : 'restricted'))
              setApprovalFilter('__')
            }}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold border transition-colors cursor-pointer',
              standingFilter === 'restricted'
                ? 'bg-rose-700 text-white border-rose-700'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            )}
          >
            <Ban className="size-3" />
            <span>Restricted ({stats.restricted})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setStandingFilter((prev) => (prev === 'pending_appeal' ? '__' : 'pending_appeal'))
              setApprovalFilter('__')
            }}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold border transition-colors cursor-pointer',
              standingFilter === 'pending_appeal'
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
            )}
          >
            <Clock className="size-3" />
            <span>Pending Appeals ({stats.pendingAppeals})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setStandingFilter((prev) => (prev === 'reported' ? '__' : 'reported'))
              setApprovalFilter('__')
            }}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold border transition-colors cursor-pointer',
              standingFilter === 'reported'
                ? 'bg-[#081F5C] text-white border-[#081F5C]'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            )}
          >
            <AlertTriangle className="size-3 text-rose-600" />
            <span>With Reports ({stats.withReports})</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            window.location.hash = '#/admin/complaint-report'
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-black uppercase tracking-wider bg-[#081F5C] text-white hover:bg-[#1447a6] transition-colors cursor-pointer"
        >
          <ShieldAlert className="size-3.5 text-amber-300" />
          <span>Review Reports &amp; Complaints</span>
          <ExternalLink className="size-3" />
        </button>
      </div>

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
              value={standingFilter}
              onChange={(e) => setStandingFilter(e.target.value === '' ? '__' : e.target.value)}
            >
              <option value="__" disabled hidden>
                Standing
              </option>
              <option value="">All standings</option>
              <option value="active">Good standing</option>
              <option value="warned">Warned (Has strikes)</option>
              <option value="restricted">Restricted</option>
              <option value="pending_appeal">Pending appeal</option>
              <option value="reported">Has reports</option>
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
              placeholder="Search name, email, role"
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
                          <DropdownMenuContent align="end" className="w-52 text-xs rounded-none">
                            <DropdownMenuItem className="gap-2 text-xs" onClick={() => openDetail(row)}>
                              <Eye className="h-3.5 w-3.5" />
                              View Profile &amp; Moderation
                            </DropdownMenuItem>
                            {row.warnings?.length > 0 || row.complaintsAgainstCount > 0 ? (
                              <DropdownMenuItem
                                className="gap-2 text-xs"
                                onClick={() => openDetail(row, row.warnings?.length > 0 ? 'warnings' : 'reports')}
                              >
                                <FileText className="h-3.5 w-3.5 text-[#081F5C]" />
                                View Strikes &amp; Reports
                              </DropdownMenuItem>
                            ) : null}
                            {row.appeals?.length > 0 ? (
                              <DropdownMenuItem
                                className="gap-2 text-xs text-blue-800 focus:text-blue-900"
                                onClick={() => openDetail(row, 'appeals')}
                              >
                                <Clock className="h-3.5 w-3.5 text-blue-600" />
                                {row.pendingAppealCount > 0 ? 'Review Appeal' : 'View Appeals'}
                              </DropdownMenuItem>
                            ) : null}
                            {row.accountApprovalStatus === 'approved' ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2 text-xs text-amber-800 focus:text-amber-900"
                                  onClick={() => openWarnFlow(row)}
                                >
                                  <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                                  Issue Warning Form
                                </DropdownMenuItem>
                                {row.moderationStatus === 'restricted' ? (
                                  <DropdownMenuItem
                                    className="gap-2 text-xs text-emerald-700 focus:text-emerald-800"
                                    onClick={() => openLiftRestrictFlow(row)}
                                  >
                                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                    Lift Restriction
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    className="gap-2 text-xs"
                                    onClick={() => openRestrictFlow(row)}
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                    Restrict Account
                                  </DropdownMenuItem>
                                )}
                              </>
                            ) : null}
                            {row.accountApprovalStatus === 'pending' || row.accountApprovalStatus === 'rejected' ? (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="gap-2 text-xs" onClick={() => openApproveFlow(row)}>
                                  <Check className="h-3.5 w-3.5" />
                                  Approve
                                </DropdownMenuItem>
                              </>
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
                      <DropdownMenuContent align="end" className="w-52 text-xs z-50 rounded-none">
                        <DropdownMenuItem className="gap-2 text-xs" onClick={() => openDetail(row)}>
                          <Eye className="h-3.5 w-3.5" />
                          View Profile &amp; Moderation
                        </DropdownMenuItem>
                        {row.appeals?.length > 0 ? (
                          <DropdownMenuItem
                            className="gap-2 text-xs text-blue-800"
                            onClick={() => openDetail(row, 'appeals')}
                          >
                            <Clock className="h-3.5 w-3.5 text-blue-600" />
                            {row.pendingAppealCount > 0 ? 'Review Appeal' : 'View Appeals'}
                          </DropdownMenuItem>
                        ) : null}
                        {row.accountApprovalStatus === 'approved' ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2 text-xs text-amber-800"
                              onClick={() => openWarnFlow(row)}
                            >
                              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                              Issue Warning Form
                            </DropdownMenuItem>
                            {row.moderationStatus === 'restricted' ? (
                              <DropdownMenuItem
                                className="gap-2 text-xs text-emerald-700"
                                onClick={() => openLiftRestrictFlow(row)}
                              >
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                Lift Restriction
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                variant="destructive"
                                className="gap-2 text-xs"
                                onClick={() => openRestrictFlow(row)}
                              >
                                <Ban className="h-3.5 w-3.5" />
                                Restrict Account
                              </DropdownMenuItem>
                            )}
                          </>
                        ) : null}
                        {row.accountApprovalStatus === 'pending' || row.accountApprovalStatus === 'rejected' ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 text-xs" onClick={() => openApproveFlow(row)}>
                              <Check className="h-3.5 w-3.5" />
                              Approve
                            </DropdownMenuItem>
                          </>
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
                      {moderationUser.fullName ? moderationUser.fullName.trim().charAt(0).toUpperCase() : 'U'}
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
                      {moderationUser.fullName ? moderationUser.fullName.trim().charAt(0).toUpperCase() : 'U'}
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
                placeholder="Why this account was rejected"
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
          if (open) setDetailOpen(true)
          else closeDetail()
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
                  {detailUser.accountApprovalStatus === 'approved' ? moderationStandingBadge(detailUser) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* Modal Navigation Tabs */}
          {detailProfile && (
            <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4 pt-2 shrink-0">
              {[
                { id: 'profile', label: 'Registration Profile', icon: User },
                {
                  id: 'warnings',
                  label: `Warnings & Strikes (${Array.isArray(detailProfile.warnings) ? detailProfile.warnings.length : 0})`,
                  icon: ShieldAlert,
                },
                {
                  id: 'appeals',
                  label: `Appeals (${Array.isArray(detailProfile.appeals) ? detailProfile.appeals.length : 0})`,
                  icon: Clock,
                },
                {
                  id: 'reports',
                  label: `Reports (${
                    (detailProfile.complaintsAgainst?.length || 0) +
                    (detailProfile.complaintsFiled?.length || 0)
                  })`,
                  icon: FileText,
                },
                {
                  id: 'logs',
                  label: `Moderation Log (${detailProfile.moderationLogs?.length || 0})`,
                  icon: History,
                },
              ].map((tab) => {
                const TabIcon = tab.icon
                const active = detailTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDetailTab(tab.id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-colors whitespace-nowrap cursor-pointer',
                      active
                        ? 'border-[#081F5C] text-[#081F5C] bg-slate-50/80'
                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    )}
                  >
                    <TabIcon className="size-3.5" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          )}

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
            ) : detailProfile ? (
              detailTab === 'profile' ? (
                <AdminRegistrationDetailView
                  profile={detailProfile}
                  apiBaseUrl={API_URL}
                  onApprove={() => openApproveFlow(detailUser)}
                  onReject={() => openRejectFlow(detailUser)}
                />
              ) : detailTab === 'warnings' ? (
                <div className="space-y-3 text-xs">
                  {detailProfile.moderationStatus === 'restricted' && (
                    <div className="border-2 border-rose-300 bg-rose-50 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black uppercase text-rose-800 flex items-center gap-1.5">
                          <Ban className="size-4 text-rose-600" />
                          Account Currently Restricted
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => openLiftRestrictFlow(detailUser)}
                          className="h-7 px-3 rounded-none bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold"
                        >
                          Lift Restriction
                        </Button>
                      </div>
                      <p className="text-rose-950 font-semibold">{detailProfile.restrictionReason}</p>
                      <p className="text-[11px] text-rose-700">
                        {detailProfile.restrictedUntil
                          ? `Restricted until ${new Date(detailProfile.restrictedUntil).toLocaleString('en-PH')}`
                          : 'Indefinite restriction until lifted by Admin'}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between bg-white border border-slate-200 p-3">
                    <div>
                      <p className="font-bold text-slate-900">Issued Administrative Warnings</p>
                      <p className="text-[11px] text-slate-500">
                        Total strikes: {Number(detailProfile.warningCount || 0)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openWarnFlow(detailUser)}
                      className="h-8 px-3 rounded-none bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                    >
                      <ShieldAlert className="size-3.5 mr-1.5" />
                      Issue Warning Form
                    </Button>
                  </div>

                  {Array.isArray(detailProfile.warnings) && detailProfile.warnings.length > 0 ? (
                    [...detailProfile.warnings]
                      .sort((a, b) => new Date(b.issuedAt || 0) - new Date(a.issuedAt || 0))
                      .map((w) => (
                        <div key={w._id || w.referenceCode} className="border border-slate-200 bg-white p-3.5 space-y-2 shadow-2xs">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-black bg-slate-900 text-white px-2 py-0.5">
                                {w.referenceCode}
                              </span>
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                Strike #{w.warningNumber} · {String(w.severity || 'moderate').replace('_', ' ')}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {w.issuedAt ? new Date(w.issuedAt).toLocaleString('en-PH') : '—'}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900 text-sm">{w.title}</p>
                          <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{w.reason}</p>
                          {w.correctiveAction && (
                            <p className="text-[11px] bg-blue-50 border border-blue-200 p-2 text-blue-950">
                              <strong>Required Corrective Action:</strong> {w.correctiveAction}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-100 text-[11px]">
                            <span className={w.acknowledged ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                              {w.acknowledged
                                ? `Acknowledged by user (${new Date(w.acknowledgedAt).toLocaleString('en-PH')})`
                                : 'Pending user acknowledgment (Form will appear on user screen)'}
                            </span>
                            {w.relatedTicketNumber && (
                              <span className="font-mono text-slate-500">Ticket #{w.relatedTicketNumber}</span>
                            )}
                          </div>
                          {w.acknowledgmentNote && (
                            <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 border border-slate-200">
                              User Note: &ldquo;{w.acknowledgmentNote}&rdquo;
                            </p>
                          )}
                        </div>
                      ))
                  ) : (
                    <div className="border border-slate-200 bg-white p-8 text-center text-slate-500">
                      <ShieldCheck className="size-8 mx-auto text-emerald-500 mb-2" />
                      <p className="font-bold text-slate-800">No warnings issued to this user</p>
                      <p className="text-[11px] mt-0.5">Use &ldquo;Issue Warning Form&rdquo; above if a rule violation occurred.</p>
                    </div>
                  )}
                </div>
              ) : detailTab === 'appeals' ? (
                <div className="space-y-3 text-xs">
                  {Array.isArray(detailProfile.appeals) && detailProfile.appeals.length > 0 ? (
                    [...detailProfile.appeals]
                      .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0))
                      .map((ap) => {
                        const isPending = ap.status === 'submitted' || ap.status === 'under_review'
                        return (
                          <div
                            key={ap._id || ap.appealRef}
                            className={cn(
                              'border bg-white p-4 space-y-2.5 shadow-2xs',
                              isPending ? 'border-blue-300' : 'border-slate-200'
                            )}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-black bg-slate-900 text-white px-2 py-0.5">
                                  {ap.appealRef}
                                </span>
                                <span
                                  className={cn(
                                    'px-2 py-0.5 text-[10px] font-bold uppercase border',
                                    ap.status === 'approved'
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                      : ap.status === 'rejected'
                                        ? 'bg-rose-100 text-rose-900 border-rose-300'
                                        : ap.status === 'under_review'
                                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                                          : 'bg-amber-100 text-amber-900 border-amber-300'
                                  )}
                                >
                                  {ap.status === 'under_review'
                                    ? 'Under Review'
                                    : ap.status === 'approved'
                                      ? 'Approved'
                                      : ap.status === 'rejected'
                                        ? 'Rejected'
                                        : 'Submitted'}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500">
                                Submitted: {ap.submittedAt ? new Date(ap.submittedAt).toLocaleString('en-PH') : '—'}
                              </span>
                            </div>

                            <p className="font-bold text-slate-900 text-sm">{ap.subject}</p>
                            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 border border-slate-200 p-2.5">
                              {ap.reason}
                            </p>

                            {Array.isArray(ap.evidencePhotos) && ap.evidencePhotos.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {ap.evidencePhotos.map((img, i) => (
                                  <a
                                    key={i}
                                    href={img}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="size-14 border border-slate-300 overflow-hidden block hover:border-[#081F5C]"
                                  >
                                    <img src={img} alt="Appeal proof" className="size-full object-cover" />
                                  </a>
                                ))}
                              </div>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                              <div className="text-[11px] text-slate-500 space-y-0.5">
                                {ap.reviewStartedAt && (
                                  <p>Review started: {new Date(ap.reviewStartedAt).toLocaleString('en-PH')}</p>
                                )}
                                {ap.reviewedAt && (
                                  <p className="font-semibold text-slate-700">
                                    Decided: {new Date(ap.reviewedAt).toLocaleString('en-PH')} by {ap.reviewedByName || 'Admin'}
                                  </p>
                                )}
                                {ap.adminRemarks && (
                                  <p className="text-slate-800">
                                    <strong>Admin Remarks:</strong> {ap.adminRemarks}
                                  </p>
                                )}
                              </div>

                              {isPending && (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => openReviewAppealFlow({ ...detailUser, restrictionReason: detailProfile.restrictionReason }, ap)}
                                  className="h-8 px-3.5 rounded-none bg-[#081F5C] hover:bg-[#1447a6] text-white text-xs font-bold cursor-pointer"
                                >
                                  <Eye className="size-3.5 mr-1.5" />
                                  Review &amp; Decide Appeal
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })
                  ) : (
                    <div className="border border-slate-200 bg-white p-8 text-center text-slate-500">
                      <Clock className="size-8 mx-auto text-slate-300 mb-2" />
                      <p className="font-bold text-slate-800">No restriction appeals submitted</p>
                      <p className="text-[11px] mt-0.5">
                        When a restricted user submits an appeal from their restriction screen, it will appear here for review.
                      </p>
                    </div>
                  )}
                </div>
              ) : detailTab === 'reports' ? (
                <div className="space-y-4 text-xs">
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-rose-800">
                      Reports Filed Against This User ({detailProfile.complaintsAgainst?.length || 0})
                    </h4>
                    {Array.isArray(detailProfile.complaintsAgainst) && detailProfile.complaintsAgainst.length > 0 ? (
                      detailProfile.complaintsAgainst.map((c) => (
                        <div key={c._id} className="border border-slate-200 bg-white p-3 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold bg-slate-900 text-white px-2 py-0.5">
                                {c.ticketNumber}
                              </span>
                              <span className="px-2 py-0.5 text-[10px] font-bold uppercase border border-slate-200 bg-slate-50">
                                {c.status}
                              </span>
                              {c.moderationOutcome && c.moderationOutcome !== 'none' && (
                                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
                                  Outcome: {c.moderationOutcome}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-PH') : '—'}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900">{c.subject}</p>
                          <p className="text-[11px] text-slate-500">
                            Reported by: <span className="font-semibold text-slate-700">{c.reporterName || c.customerName}</span>
                          </p>
                          {c.adminAction && (
                            <p className="text-[11px] font-semibold text-indigo-800">Admin Ruling: {c.adminAction}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="border border-slate-200 bg-white p-4 text-slate-500 text-center">
                        No reports filed against this user.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                      Reports Submitted By This User ({detailProfile.complaintsFiled?.length || 0})
                    </h4>
                    {Array.isArray(detailProfile.complaintsFiled) && detailProfile.complaintsFiled.length > 0 ? (
                      detailProfile.complaintsFiled.map((c) => (
                        <div key={c._id} className="border border-slate-200 bg-white p-3 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[11px] font-bold bg-slate-800 text-white px-2 py-0.5">
                              {c.ticketNumber}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 border border-slate-200 bg-slate-50">
                              {c.status}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900">{c.subject}</p>
                          <p className="text-[11px] text-slate-500">
                            Reported: {c.reportedUserName || c.targetShopName || 'Platform'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="border border-slate-200 bg-white p-4 text-slate-500 text-center">
                        This user has not submitted any reports.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 text-xs">
                  {Array.isArray(detailProfile.moderationLogs) && detailProfile.moderationLogs.length > 0 ? (
                    [...detailProfile.moderationLogs]
                      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                      .map((log, i) => (
                        <div key={log._id || i} className="border border-slate-200 bg-white p-3 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800">
                              {String(log.action || '').replace('_', ' ')}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {log.createdAt ? new Date(log.createdAt).toLocaleString('en-PH') : '—'}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900">{log.summary}</p>
                          {log.details && <p className="text-slate-600">{log.details}</p>}
                          <p className="text-[10px] text-slate-400">By: {log.actorName || 'System'}</p>
                        </div>
                      ))
                  ) : (
                    <div className="border border-slate-200 bg-white p-8 text-center text-slate-500">
                      No moderation events recorded for this user yet.
                    </div>
                  )}
                </div>
              )
            ) : (
              <p className="py-8 text-center text-sm text-slate-500 font-medium">No registration data.</p>
            )}
          </div>

          {/* Dialog Footer with Action Controls */}
          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
              {detailUser?.joinedAt ? `Account created ${detailUser.joinedAt}` : 'User Management System'}
            </p>

            <div className="flex w-full sm:w-auto flex-wrap items-center justify-end gap-2">
              {!detailProfileLoading && !detailProfileError && detailUser && detailProfile && detailProfile.accountApprovalStatus === 'approved' ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => openWarnFlow(detailUser)}
                    className="h-8 px-3 text-xs font-bold rounded-none bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                  >
                    <ShieldAlert className="size-3.5 mr-1.5" />
                    Issue Warning
                  </Button>
                  {detailProfile.moderationStatus === 'restricted' ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openLiftRestrictFlow(detailUser)}
                      className="h-8 px-3 text-xs font-bold rounded-none bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                    >
                      <ShieldCheck className="size-3.5 mr-1.5" />
                      Lift Restriction
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openRestrictFlow(detailUser)}
                      className="h-8 px-3 text-xs font-bold rounded-none bg-rose-700 hover:bg-rose-800 text-white cursor-pointer"
                    >
                      <Ban className="size-3.5 mr-1.5" />
                      Restrict Account
                    </Button>
                  )}
                </>
              ) : null}

              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto h-8 px-4 text-xs font-bold rounded-none border-slate-300 hover:bg-slate-100 dark:border-slate-700"
                onClick={closeDetail}
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

      {/* 4. Issue Formal Warning Dialog */}
      <IssueWarningDialog
        open={warnOpen}
        onOpenChange={(open) => {
          setWarnOpen(open)
          if (!open) setModerationUser(null)
        }}
        targetUser={moderationUser}
        onSuccess={() => {
          if (moderationUser?.id) void refreshDetailIfNeeded(moderationUser.id)
          else void loadUsers()
        }}
      />

      {/* 5. Restrict User Account Dialog */}
      <RestrictUserDialog
        open={restrictOpen}
        onOpenChange={(open) => {
          setRestrictOpen(open)
          if (!open) setModerationUser(null)
        }}
        targetUser={moderationUser}
        onSuccess={() => {
          if (moderationUser?.id) void refreshDetailIfNeeded(moderationUser.id)
          else void loadUsers()
        }}
      />

      {/* 6. Lift Restriction Dialog */}
      <LiftRestrictionDialog
        open={liftRestrictOpen}
        onOpenChange={(open) => {
          setLiftRestrictOpen(open)
          if (!open) setModerationUser(null)
        }}
        targetUser={moderationUser}
        onSuccess={() => {
          if (moderationUser?.id) void refreshDetailIfNeeded(moderationUser.id)
          else void loadUsers()
        }}
      />

      {/* 7. Review User Appeal Dialog */}
      <ReviewAppealDialog
        open={reviewAppealOpen}
        onOpenChange={(open) => {
          setReviewAppealOpen(open)
          if (!open) {
            setReviewAppealTarget(null)
            setModerationUser(null)
          }
        }}
        targetUser={moderationUser}
        appeal={reviewAppealTarget}
        onSuccess={() => {
          if (moderationUser?.id) void refreshDetailIfNeeded(moderationUser.id)
          else void loadUsers()
        }}
      />
    </div>
  )
}
