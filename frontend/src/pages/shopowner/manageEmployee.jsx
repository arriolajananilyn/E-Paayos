import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import ShopOwnerDashboard from './dashboard.jsx'
import { Avatar, AvatarFallback } from '../../components/ui/avatar'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from '../../components/ui/pagination'
import {
  CalendarDays,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  UserMinus,
  Users,
} from 'lucide-react'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

const DEFAULT_JOB_TITLE = 'Mechanic / Technician'
const ROLES = ['Senior Mechanic', 'Mechanic', 'Service Advisor', 'Detailer', 'Apprentice']
const FORM_ROLE_OPTIONS = [DEFAULT_JOB_TITLE, ...ROLES]

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function mapRegisteredMechanicFromApi(u) {
  if (!u || !u._id) return null
  const phone = [u.phoneCode, u.phoneNumber].filter(Boolean).join(' ').trim() || '—'
  const tech = Array.isArray(u.technicalSkillsNoFormalTraining) ? u.technicalSkillsNoFormalTraining : []
  const spec = [u.courseProgram, ...tech.slice(0, 2)].filter(Boolean).join(' · ') || ''
  const title = (u.shopJobTitle && String(u.shopJobTitle).trim()) || DEFAULT_JOB_TITLE
  const joined = u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : ''
  return {
    id: String(u._id),
    fullName: u.fullName || '—',
    email: u.email || '—',
    phone,
    role: title,
    status: u.shopManagedStatus || 'active',
    joinedAt: joined,
    specialization: spec || 'Registered technician',
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

function statusBadge(status) {
  switch (status) {
    case 'active':
      return (
        <Badge className="border border-emerald-500/25 bg-emerald-500/10 font-medium text-emerald-800 hover:bg-emerald-500/15 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
          Active
        </Badge>
      )
    case 'on-leave':
      return (
        <Badge className="border border-amber-500/25 bg-amber-500/10 font-medium text-amber-900 hover:bg-amber-500/15 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-200">
          On leave
        </Badge>
      )
    case 'inactive':
      return (
        <Badge className="border border-[#081F5C]/15 bg-slate-100 font-medium text-slate-600 hover:bg-slate-200/80 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          Inactive
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
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
  /** Headcount — brand navy */
  total: 'bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6]',
  /** On duty — success greens */
  active: 'bg-linear-to-br from-emerald-600 via-teal-600 to-emerald-800',
  /** Away — warm amber */
  'on-leave': 'bg-linear-to-br from-amber-500 via-orange-600 to-amber-800',
  /** Not on roster — cool neutral */
  inactive: 'bg-linear-to-br from-slate-600 via-slate-700 to-slate-900',
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

const emptyForm = {
  fullName: '',
  email: '',
  phone: '',
  role: DEFAULT_JOB_TITLE,
  status: 'active',
  specialization: '',
}

const PAGE_SIZE = 10

function ManageEmployeePage() {
  /** Force-hide scrollbars on the shop-owner main scroll (parent) + this table strip — CSS + inline fallback. */
  useLayoutEffect(() => {
    const main = document.getElementById('shopowner-main-scroll')
    if (main) {
      main.style.setProperty('scrollbar-width', 'none', 'important')
      main.style.setProperty('-ms-overflow-style', 'none', 'important')
    }
    const tableX = document.getElementById('me-table-x-scroll')
    if (tableX) {
      tableX.style.setProperty('scrollbar-width', 'none', 'important')
      tableX.style.setProperty('-ms-overflow-style', 'none', 'important')
    }
  }, [])

  const [employees, setEmployees] = useState([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [roleFilter, setRoleFilter] = useState('__')
  const [statusFilter, setStatusFilter] = useState('__')
  const [dateRange, setDateRange] = useState('__')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [formSaving, setFormSaving] = useState(false)

  const roleSelectOptions = useMemo(() => {
    const fromRows = employees.map((e) => e.role).filter(Boolean)
    return [...new Set([...FORM_ROLE_OPTIONS, ...fromRows])]
  }, [employees])

  const loadEmployees = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setListLoading(false)
      setListError('Not signed in.')
      setEmployees([])
      return
    }
    setListError('')
    setListLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/shop/registered-mechanics`, { headers: authHeaders() })
      if (res.status === 401) {
        window.location.hash = '#/login'
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data?.message === 'string' ? data.message : 'Could not load your team')
      }
      const rows = Array.isArray(data) ? data : []
      setEmployees(rows.map(mapRegisteredMechanicFromApi).filter(Boolean))
    } catch (e) {
      setListError(e?.message || 'Could not load your team')
      setEmployees([])
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  const stats = useMemo(() => {
    const total = employees.length
    const active = employees.filter((e) => e.status === 'active').length
    const onLeave = employees.filter((e) => e.status === 'on-leave').length
    const inactive = employees.filter((e) => e.status === 'inactive').length
    return { total, active, onLeave, inactive }
  }, [employees])

  const filtered = useMemo(() => {
    const roleOk = roleFilter === '__' || roleFilter === '' ? null : roleFilter
    const statusOk = statusFilter === '__' || statusFilter === '' ? null : statusFilter
    const { from, to } = getRangeDates(dateRange === '__' || dateRange === '' ? '' : dateRange)
    const query = q.trim().toLowerCase()

    return employees.filter((e) => {
      if (roleOk && e.role !== roleOk) return false
      if (statusOk && e.status !== statusOk) return false
      const joined = new Date(e.joinedAt)
      if (from && joined < from) return false
      if (to && joined > to) return false
      if (!query) return true
      return (
        e.fullName.toLowerCase().includes(query) ||
        e.email.toLowerCase().includes(query) ||
        e.role.toLowerCase().includes(query) ||
        (e.specialization && e.specialization.toLowerCase().includes(query))
      )
    })
  }, [employees, roleFilter, statusFilter, dateRange, q])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageSlice = useMemo(() => {
    const p = Math.min(page, totalPages)
    const start = (p - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page, totalPages])

  useEffect(() => {
    setPage(1)
  }, [roleFilter, statusFilter, dateRange, q])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const openEdit = (emp) => {
    setEditingId(emp.id)
    const roleVal = roleSelectOptions.includes(emp.role) ? emp.role : DEFAULT_JOB_TITLE
    setForm({
      fullName: emp.fullName,
      email: emp.email,
      phone: emp.phone,
      role: roleVal,
      status: emp.status,
      specialization: emp.specialization || '',
    })
    setFormOpen(true)
  }

  const submitForm = async () => {
    if (!editingId) {
      setFormOpen(false)
      return
    }
    const roleForApi = form.role === DEFAULT_JOB_TITLE ? '' : form.role
    setFormSaving(true)
    setListError('')
    try {
      const res = await fetch(`${API_URL}/api/shop/registered-mechanics/${editingId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          shopJobTitle: roleForApi,
          shopManagedStatus: form.status,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof data?.message === 'string' ? data.message : 'Update failed')
      await loadEmployees()
      setFormOpen(false)
      setEditingId(null)
    } catch (e) {
      setListError(e?.message || 'Update failed')
    } finally {
      setFormSaving(false)
    }
  }

  const cycleLeave = async (emp) => {
    const next =
      emp.status === 'active' ? 'on-leave' : emp.status === 'on-leave' ? 'active' : 'active'
    setListError('')
    try {
      const res = await fetch(`${API_URL}/api/shop/registered-mechanics/${emp.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ shopManagedStatus: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof data?.message === 'string' ? data.message : 'Could not update status')
      await loadEmployees()
    } catch (e) {
      setListError(e?.message || 'Could not update status')
    }
  }

  const confirmRemove = async () => {
    if (!removeTarget) return
    setListError('')
    try {
      const res = await fetch(`${API_URL}/api/shop/registered-mechanics/${removeTarget.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ shopManagedStatus: 'inactive' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(typeof data?.message === 'string' ? data.message : 'Could not update')
      await loadEmployees()
    } catch (e) {
      setListError(e?.message || 'Could not update')
    } finally {
      setRemoveTarget(null)
    }
  }

  const fromIdx = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const toIdx = filtered.length === 0 ? 0 : Math.min(safePage * PAGE_SIZE, filtered.length)

  const pageNumbers = useMemo(() => {
    const tp = totalPages
    if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1)
    const pages = new Set([1, tp, safePage, safePage - 1, safePage + 1].filter((n) => n >= 1 && n <= tp))
    return [...pages].sort((a, b) => a - b)
  }, [totalPages, safePage])

  return (
    <ShopOwnerDashboard
      activeSection="manage-employee"
      pageMeta={{
        title: 'Manage Employee',
        description: 'Mechanics and technicians who registered under your shop.',
      }}
    >
      <div className="w-full min-w-0 max-w-full space-y-3 overflow-x-hidden">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <StatGradientCard variant="total" label="Total staff" value={stats.total} icon={Users} />
          <StatGradientCard variant="active" label="Active" value={stats.active} icon={CheckCircle} />
          <StatGradientCard variant="on-leave" label="On leave" value={stats.onLeave} icon={Clock} />
          <StatGradientCard variant="inactive" label="Inactive" value={stats.inactive} icon={UserMinus} />
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
                {roleSelectOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>

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
                <option value="active">Active</option>
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
                placeholder="Search by name, email, or role…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search employees"
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
              id="me-table-x-scroll"
              className="scrollbar-hidden max-w-full overflow-x-auto overflow-y-hidden scroll-smooth"
            >
              <table className="w-full min-w-[600px] border-collapse text-sm">
                <thead className="[&_tr]:border-0">
                  <tr className="border-0 bg-linear-to-r from-[#081F5C] to-[#1447a6]">
                    <th className="w-[26%] border-0 px-4 py-3.5 text-left text-[11px] font-semibold tracking-widest text-white/95 uppercase">
                      Employee
                    </th>
                    <th className="w-[18%] border-0 px-3 py-3.5 pr-4 text-left text-[11px] font-semibold tracking-widest text-white/95 uppercase">
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
                        Loading mechanics registered under your shop…
                      </td>
                    </tr>
                  ) : pageSlice.length === 0 ? (
                    <tr>
                      <td
                        className="rounded-b-2xl px-6 py-14 text-center text-sm text-muted-foreground"
                        colSpan={6}
                      >
                        {employees.length === 0
                          ? 'No mechanics have registered under your shop yet. They must choose your shop when they sign up as Mechanic / Technician.'
                          : 'No results match your filters. Try a different keyword or filter.'}
                      </td>
                    </tr>
                  ) : (
                    pageSlice.map((emp, idx) => (
                      <tr
                        key={emp.id}
                        className={`transition-colors duration-150 hover:bg-[#081F5C]/5 dark:hover:bg-white/6 ${idx % 2 === 1 ? 'bg-[#081F5C]/2.5 dark:bg-white/2' : ''} ${idx < pageSlice.length - 1 ? 'border-b border-[#081F5C]/8 dark:border-white/5' : ''}`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar className="size-10 shrink-0 ring-2 ring-white shadow-md ring-offset-2 ring-offset-background dark:ring-[#04133d] dark:ring-offset-[#04133d]/50" size="sm">
                              <AvatarFallback className="bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-semibold text-white">
                                {initials(emp.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-foreground">{emp.fullName}</div>
                              <div className="truncate text-xs text-muted-foreground">{emp.specialization}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3.5 pr-4 align-middle">
                          <div className="truncate text-sm text-foreground">{emp.email}</div>
                          <div className="truncate text-xs text-muted-foreground">{emp.phone}</div>
                        </td>
                        <td className="px-3 py-3.5 align-middle">{roleBadge(emp.role)}</td>
                        <td className="px-3 py-3.5 align-middle">{statusBadge(emp.status)}</td>
                        <td className="px-3 py-3.5 align-middle text-sm tabular-nums text-muted-foreground">
                          {formatJoined(emp.joinedAt)}
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
                              <DropdownMenuItem className="gap-2 text-xs" onClick={() => openEdit(emp)}>
                                <Pencil className="h-4 w-4" />
                                Edit details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 text-xs" onClick={() => cycleLeave(emp)}>
                                <CalendarDays className="h-4 w-4" />
                                {emp.status === 'on-leave' ? 'Mark as active' : 'Mark on leave'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                className="gap-2 text-xs"
                                onClick={() => setRemoveTarget(emp)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Mark inactive
                              </DropdownMenuItem>
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
              <span className="font-medium text-neutral-900 dark:text-neutral-100">{filtered.length}</span>{' '}
              employees
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
      </div>

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            setEditingId(null)
            setForm(emptyForm)
          }
        }}
      >
        <DialogContent className="gap-4 sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Edit roster entry</DialogTitle>
            <DialogDescription>
              Profile details come from the technician&apos;s registration. You can set their shop role label and roster
              status here.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-1">
            <div className="grid gap-1.5">
              <Label htmlFor="emp-name">Full name</Label>
              <Input id="emp-name" value={form.fullName} readOnly className="bg-muted/50" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="emp-email">Email</Label>
              <Input id="emp-email" type="email" value={form.email} readOnly className="bg-muted/50" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="emp-phone">Phone</Label>
              <Input id="emp-phone" value={form.phone} readOnly className="bg-muted/50" />
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="emp-role">Role</Label>
                <div className="relative">
                  <select
                    id="emp-role"
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    className={selectShell}
                  >
                    {roleSelectOptions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="emp-status">Status</Label>
                <div className="relative">
                  <select
                    id="emp-status"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className={selectShell}
                  >
                    <option value="active">Active</option>
                    <option value="on-leave">On leave</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                </div>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="emp-spec">Course / skills (from registration)</Label>
              <Input id="emp-spec" value={form.specialization} readOnly className="bg-muted/50" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void submitForm()}
              disabled={formSaving || !editingId}
              className="bg-linear-to-r from-[#081F5C] to-[#1447a6] hover:from-[#081F5C]/90 hover:to-[#1447a6]/90"
            >
              {formSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as inactive?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget
                ? `${removeTarget.fullName} will be marked inactive on your roster. Their account is unchanged; you can set them active again from Edit.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void confirmRemove()}>
              Mark inactive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ShopOwnerDashboard>
  )
}

export default ManageEmployeePage
