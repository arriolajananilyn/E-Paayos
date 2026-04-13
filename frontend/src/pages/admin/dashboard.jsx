import { useEffect, useMemo, useRef, useState } from 'react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
import AdminUserManagement from '@/pages/admin/userManagement.jsx'
import AdminReportedUsers from '@/pages/admin/reportedUsers.jsx'
import AdminAnnouncement from '@/pages/admin/announcement.jsx'
import AdminTrackServices from '@/pages/admin/trackServices.jsx'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  Bell,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Flag,
  LayoutDashboard,
  LogOut,
  Megaphone,
  PlayCircle,
  Settings,
  Store,
  Users,
} from 'lucide-react'
import Elogo from '@/assets/Elogo.png'

const navyDeep = '#04133d'
const navy = '#081F5C'
const navyMuted = '#0b2b73'
const navyBright = '#1447a6'
const pageBaseNavyGradient = `linear-gradient(145deg, ${navyDeep} 0%, ${navy} 35%, ${navyMuted} 65%, ${navyBright} 100%)`

const SECTIONS = {
  overview: { title: 'Dashboard', description: 'Platform overview: bookings, listings, and moderation shortcuts.' },
  announcement: { title: 'Announcement', description: 'Create and manage system announcements.' },
  trackServices: { title: 'Track services', description: 'Monitor service bookings across customers, shops, and mechanics.' },
  users: { title: 'User management', description: 'View and manage user accounts.' },
  reportedUsers: { title: 'Reported User', description: 'Review users that have been reported.' },
}

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

let adminSidebarOpenState = false

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function timeAgo(dateString) {
  const d = new Date(dateString)
  const diffMs = Date.now() - d.getTime()
  const sec = Math.floor(diffMs / 1000)
  const min = Math.floor(sec / 60)
  const hr = Math.floor(min / 60)
  const day = Math.floor(hr / 24)
  if (sec < 60) return `${sec}s ago`
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  return `${day}d ago`
}

function normalizeStatus(s) {
  return String(s || '').toLowerCase()
}

const STAT_CARD_GRADIENT = {
  services: 'bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6]',
  active: 'bg-linear-to-br from-emerald-600 via-teal-600 to-emerald-800',
  inactive: 'bg-linear-to-br from-slate-600 via-slate-700 to-slate-900',
  booked: 'bg-linear-to-br from-sky-500 via-blue-500 to-indigo-600',
}

function StatGradientCard({ label, value, icon: Icon, variant, helper }) {
  const gradient = STAT_CARD_GRADIENT[variant] ?? STAT_CARD_GRADIENT.services
  return (
    <div
      className={`relative min-h-[112px] min-w-0 overflow-hidden rounded-2xl border border-white/15 p-5 shadow-md transition-shadow duration-300 hover:shadow-lg sm:min-h-[128px] sm:p-6 ${gradient}`}
    >
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

function chipTone(t) {
  return (
    {
      blue: 'from-[#081F5C] to-[#1447a6]',
      orange: 'from-[#0b2b73] to-[#2a63cc]',
      purple: 'from-[#081F5C] via-[#0b2b73] to-[#1447a6]',
      emerald: 'from-emerald-600 to-teal-700',
    }[t] || 'from-[#081F5C] to-[#1447a6]'
  )
}

function AdminDashboardOverview({ user, setSection }) {
  const [range, setRange] = useState('thisWeek')
  const [bookings, setBookings] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const [statsRes, listRes] = await Promise.all([
          fetch(`${API_URL}/api/admin/service-bookings/stats`, { headers: authHeaders() }),
          fetch(`${API_URL}/api/admin/service-bookings`, { headers: authHeaders() }),
        ])
        const statsJson = await statsRes.json().catch(() => ({}))
        const listJson = await listRes.json().catch(() => ({}))
        if (!statsRes.ok) throw new Error(statsJson?.message || 'Could not load stats.')
        if (!listRes.ok) throw new Error(listJson?.message || 'Could not load bookings.')
        if (!cancelled) {
          setStats(statsJson?.data ?? null)
          setBookings(Array.isArray(listJson?.data) ? listJson.data : [])
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e?.message || 'Could not load dashboard data.')
          setStats(null)
          setBookings([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const kpis = useMemo(() => {
    const s = stats || {
      totalBookings: 0,
      activeListings: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
    }
    return [
      {
        label: 'Total bookings',
        value: s.totalBookings ?? 0,
        icon: ClipboardList,
        variant: 'services',
        helper: 'All bookings on E-Paayos',
      },
      {
        label: 'Active listings',
        value: s.activeListings ?? 0,
        icon: Store,
        variant: 'booked',
        helper: 'Services visible to customers',
      },
      {
        label: 'Pending',
        value: s.pending ?? 0,
        icon: ClipboardList,
        variant: 'inactive',
        helper: 'Awaiting provider action',
      },
      {
        label: 'In progress',
        value: s.inProgress ?? 0,
        icon: PlayCircle,
        variant: 'active',
        helper: 'Confirmed or working',
      },
      {
        label: 'Completed',
        value: s.completed ?? 0,
        icon: CheckCircle,
        variant: 'services',
        helper: 'Finished jobs',
      },
    ]
  }, [stats])

  const statusPieRows = useMemo(() => {
    const s = stats || { pending: 0, confirmed: 0, working: 0, completed: 0, cancelled: 0 }
    return [
      { key: 'pending', name: 'Pending', value: s.pending ?? 0, fill: 'url(#gradAdminPiePending)' },
      { key: 'confirmed', name: 'Confirmed', value: s.confirmed ?? 0, fill: 'url(#gradAdminPieConfirmed)' },
      { key: 'working', name: 'Working', value: s.working ?? 0, fill: 'url(#gradAdminPieWorking)' },
      { key: 'completed', name: 'Completed', value: s.completed ?? 0, fill: 'url(#gradAdminPieCompleted)' },
      { key: 'cancelled', name: 'Cancelled', value: s.cancelled ?? 0, fill: 'url(#gradAdminPieCancelled)' },
    ]
  }, [stats])

  const chartSeries = useMemo(() => {
    const source = bookings
    const now = new Date()
    const getDateRange = () => {
      switch (range) {
        case 'today':
          return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end: now }
        case 'thisWeek': {
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          weekStart.setHours(0, 0, 0, 0)
          return { start: weekStart, end: now }
        }
        case 'lastWeek': {
          const lastWeekEnd = new Date(now)
          lastWeekEnd.setDate(now.getDate() - now.getDay() - 1)
          lastWeekEnd.setHours(23, 59, 59, 999)
          const lastWeekStart = new Date(lastWeekEnd)
          lastWeekStart.setDate(lastWeekEnd.getDate() - 6)
          lastWeekStart.setHours(0, 0, 0, 0)
          return { start: lastWeekStart, end: lastWeekEnd }
        }
        case 'thisMonth':
          return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
        case 'lastMonth': {
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          return { start: lastMonthStart, end: lastMonthEnd }
        }
        case 'thisYear':
          return { start: new Date(now.getFullYear(), 0, 1), end: now }
        case 'lastYear': {
          const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999)
          const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
          return { start: lastYearStart, end: lastYearEnd }
        }
        default:
          return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6), end: now }
      }
    }
    const { start, end } = getDateRange()
    const filtered = source.filter((o) => {
      const t = new Date(o?.createdAt || Date.now())
      return t >= start && t <= end
    })
    const makeKey = (d) => {
      const dt = new Date(d)
      if (range === 'today') {
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}-${String(dt.getHours()).padStart(2, '0')}`
      }
      if (range === 'thisYear' || range === 'lastYear') {
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
      }
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    }
    const dataMap = new Map()
    filtered.forEach((o) => {
      const ts = o?.createdAt || Date.now()
      const key = makeKey(ts)
      dataMap.set(key, (dataMap.get(key) || 0) + 1)
    })
    const result = []
    if (range === 'today') {
      for (let i = 0; i < 24; i++) {
        const d = new Date(start)
        d.setHours(i, 0, 0, 0)
        const key = makeKey(d)
        result.push({ date: `${String(i).padStart(2, '0')}:00`, value: dataMap.get(key) || 0 })
      }
    } else if (range === 'thisWeek' || range === 'lastWeek') {
      const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      for (let i = 0; i < 7; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        result.push({ date: weekDays[d.getDay()], value: dataMap.get(makeKey(d)) || 0 })
      }
    } else if (range === 'thisMonth' || range === 'lastMonth') {
      const daysInMonth =
        range === 'thisMonth'
          ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
          : new Date(now.getFullYear(), now.getMonth(), 0).getDate()
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(start)
        d.setDate(i)
        result.push({ date: `D${i}`, value: dataMap.get(makeKey(d)) || 0 })
      }
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      for (let i = 0; i < 12; i++) {
        const d = new Date(start)
        d.setMonth(i)
        result.push({ date: months[i], value: dataMap.get(makeKey(new Date(d.getFullYear(), d.getMonth(), 1))) || 0 })
      }
    }
    return result
  }, [range, bookings])

  const recent = useMemo(() => {
    return [...bookings]
      .sort((a, b) => new Date(b?.updatedAt || b?.createdAt || 0) - new Date(a?.updatedAt || a?.createdAt || 0))
      .slice(0, 3)
      .map((o) => ({
        rowKey: o.id,
        id: o.ref || o.id || '—',
        buyer: o.contactName || o.customer?.fullName || 'Customer',
        serviceName: o.shopService?.name || 'Service',
        shopLabel: o.shopOwner?.shopName || o.shopOwner?.fullName || '—',
        status: normalizeStatus(o?.status) || 'pending',
        when: o?.updatedAt ? timeAgo(o.updatedAt) : o?.createdAt ? timeAgo(o.createdAt) : '',
      }))
  }, [bookings])

  const quickActions = [
    {
      label: 'User management',
      desc: 'Accounts, approvals, and roles',
      icon: Users,
      tone: 'blue',
      onClick: () => setSection('users'),
    },
    {
      label: 'Reported users',
      desc: 'Review flagged accounts',
      icon: Flag,
      tone: 'orange',
      onClick: () => setSection('reportedUsers'),
    },
    {
      label: 'Track services',
      desc: 'All bookings across the platform',
      icon: ClipboardList,
      tone: 'emerald',
      onClick: () => setSection('trackServices'),
    },
    {
      label: 'Announcement',
      desc: 'Broadcast updates to users',
      icon: Megaphone,
      tone: 'purple',
      onClick: () => setSection('announcement'),
    },
  ]

  return (
    <div className="space-y-2 sm:space-y-3.5 pr-2 md:pr-4">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Welcome, <span className="font-medium text-foreground">{user.fullName || user.email}</span>. Here is what is
          happening across E-Paayos.
        </p>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      ) : null}
      {loading ? <p className="text-xs text-muted-foreground sm:text-sm">Loading dashboard…</p> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map(({ label, value, icon, variant, helper }) => (
          <StatGradientCard key={label} label={label} value={value} icon={icon} variant={variant} helper={helper} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#081F5C]/10 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/5 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-sm font-medium text-[#081F5C] dark:text-blue-100">New bookings (created)</div>
            <div className="relative w-[148px] shrink-0 sm:w-[160px]">
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className={`${selectShell} h-8 cursor-pointer py-1.5 pr-8 pl-2.5`}
              >
                <option value="today">Today</option>
                <option value="thisWeek">This Week</option>
                <option value="lastWeek">Last Week</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="thisYear">This Year</option>
                <option value="lastYear">Last Year</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>
          <ChartContainer
            id="admin-bookings-chart"
            config={{ series: { label: 'Bookings', color: '#1447a6' } }}
            className="h-64 w-full [&_.recharts-responsive-container]:min-h-[256px]"
          >
            <AreaChart data={chartSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillAdminBookings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1447a6" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#081F5C" stopOpacity={0.08} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#081F5C"
                fillOpacity={1}
                fill="url(#fillAdminBookings)"
              />
            </AreaChart>
          </ChartContainer>
        </div>

        <div className="rounded-2xl border border-[#081F5C]/10 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="mb-2 text-sm font-medium text-[#081F5C] dark:text-blue-100">Bookings by status</div>
          <div className="grid h-64 place-items-center">
            <PieChart width={240} height={240}>
              <defs>
                <linearGradient id="gradAdminPiePending" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
                <linearGradient id="gradAdminPieConfirmed" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#0369a1" />
                </linearGradient>
                <linearGradient id="gradAdminPieWorking" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#5b21b6" />
                </linearGradient>
                <linearGradient id="gradAdminPieCompleted" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="gradAdminPieCancelled" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="100%" stopColor="#334155" />
                </linearGradient>
              </defs>
              <Pie
                data={statusPieRows}
                cx={120}
                cy={120}
                innerRadius={62}
                outerRadius={96}
                paddingAngle={2}
                cornerRadius={4}
                stroke="#ffffff"
                strokeWidth={2}
                dataKey="value"
              >
                {statusPieRows.map((row) => (
                  <Cell key={row.key} fill={row.fill} />
                ))}
              </Pie>
            </PieChart>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
            {statusPieRows.map((row) => (
              <div key={row.key} className="flex min-w-0 items-center gap-1">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{
                    background:
                      row.key === 'pending'
                        ? 'linear-gradient(90deg,#f59e0b,#d97706)'
                        : row.key === 'confirmed'
                          ? 'linear-gradient(90deg,#0ea5e9,#0369a1)'
                          : row.key === 'working'
                            ? 'linear-gradient(90deg,#8b5cf6,#5b21b6)'
                            : row.key === 'completed'
                              ? 'linear-gradient(90deg,#10b981,#059669)'
                              : 'linear-gradient(90deg,#64748b,#334155)',
                  }}
                />
                <span className="truncate text-muted-foreground">{row.name}</span>
                <span className="ml-auto shrink-0 text-muted-foreground">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-[#081F5C]/10 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between px-4 pt-5 pb-2">
            <div className="text-sm font-semibold text-[#081F5C] dark:text-blue-100">Recent bookings</div>
            <button
              type="button"
              onClick={() => setSection('trackServices')}
              className="inline-flex items-center gap-1 text-sm font-medium text-[#081F5C] hover:text-[#1447a6] dark:text-blue-200 dark:hover:text-blue-100"
            >
              View all
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 p-3">
            {!loading && recent.length === 0 ? (
              <p className="px-1 py-4 text-center text-sm text-muted-foreground">
                No bookings yet. When customers book services, they will appear here and in Track services.
              </p>
            ) : null}
            {recent.map((o) => {
              const s = o.status
              const rowKey = o.rowKey || o.id
              const badgeClass =
                s === 'pending'
                  ? 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300'
                  : s === 'confirmed'
                    ? 'border-[#1447a6]/30 bg-[#1447a6]/10 text-[#0b2b73] dark:border-blue-400/30 dark:bg-blue-950/40 dark:text-blue-200'
                    : s === 'working'
                      ? 'border-violet-300 bg-violet-50 text-violet-800 dark:border-violet-600 dark:bg-violet-950/40 dark:text-violet-200'
                      : s === 'completed'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : s === 'cancelled'
                          ? 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
                          : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
              return (
                <div
                  key={rowKey}
                  className="rounded-xl border border-[#081F5C]/10 bg-white/95 p-3 shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-[#04133d]/25"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-[12px] font-medium text-muted-foreground">Ref</span>
                        <span className="text-[12px] font-semibold text-foreground">{o.id}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] capitalize ${badgeClass}`}>
                          {o.status}
                        </span>
                      </div>
                      <div className="truncate text-[13px] font-medium text-foreground">{o.buyer}</div>
                      <div className="truncate text-[12px] text-muted-foreground">{o.serviceName}</div>
                      <div className="truncate text-[11px] text-muted-foreground/90">{o.shopLabel}</div>
                    </div>
                    <div className="min-w-[100px] text-right">
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{o.when}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[#081F5C]/10 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="mb-2 text-sm font-semibold text-[#081F5C] dark:text-blue-100">Quick actions</div>
          <div className="space-y-2">
            {quickActions.map((a) => {
              const QaIcon = a.icon
              return (
                <button
                  key={a.label}
                  type="button"
                  onClick={a.onClick}
                  className="group flex w-full items-center gap-3 rounded-xl border border-[#081F5C]/10 bg-white/95 p-3 text-left transition-all hover:border-[#081F5C]/25 hover:shadow-sm dark:border-white/10 dark:bg-[#04133d]/20"
                >
                  <div className={`rounded-lg bg-linear-to-r p-2.5 text-white shadow-sm ${chipTone(a.tone)}`}>
                    <QaIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground">{a.label}</div>
                    <div className="text-[12px] text-muted-foreground">{a.desc}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

const sidebarMenuButtonClass =
  'h-9 gap-3 rounded-lg px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap'

function AdminMobileNav() {
  const { isMobile, setOpenMobile } = useSidebar()
  if (!isMobile) return null
  return (
    <button
      type="button"
      className="-ml-1 mr-2 shrink-0 rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
      onClick={() => setOpenMobile(true)}
    >
      Menu
    </button>
  )
}

function AdminDashboard() {
  const [user, setUser] = useState(null)
  const [section, setSection] = useState('overview')
  const [usersMenuOpen, setUsersMenuOpen] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(adminSidebarOpenState)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileMenuRef = useRef(null)
  const isUsersGroupActive = section === 'users' || section === 'reportedUsers'

  useEffect(() => {
    const raw = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!token || !raw) {
      window.location.hash = '#/login'
      return
    }
    try {
      const parsed = JSON.parse(raw)
      if (parsed.role !== 'admin') {
        window.location.hash = '#/login'
        return
      }
      setUser(parsed)
    } catch {
      window.location.hash = '#/login'
    }
  }, [])

  useEffect(() => {
    adminSidebarOpenState = sidebarOpen
  }, [sidebarOpen])

  useEffect(() => {
    setProfileOpen(false)
  }, [section])

  useEffect(() => {
    if (isUsersGroupActive) {
      setUsersMenuOpen(true)
    }
  }, [isUsersGroupActive])

  useEffect(() => {
    if (!profileOpen) return

    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [profileOpen])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.hash = '#/'
  }

  if (!user) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  const meta = SECTIONS[section] ?? SECTIONS.overview

  return (
    <div className="h-svh max-h-svh min-h-0 w-full overflow-hidden" style={{ backgroundImage: pageBaseNavyGradient }}>
      <TooltipProvider delayDuration={0}>
        <SidebarProvider
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          className="h-svh max-h-svh min-h-0 w-full max-w-full overflow-hidden bg-transparent"
          style={{ '--sidebar': 'transparent', '--sidebar-width': '17.5rem', '--sidebar-width-icon': '3.35rem' }}
        >
          <Sidebar
            collapsible="icon"
            variant="inset"
            className="border-r-0"
            onMouseEnter={() => setSidebarOpen(true)}
            onMouseLeave={() => setSidebarOpen(false)}
          >
            <SidebarHeader className="gap-2 border-b border-sidebar-border/80 py-2 px-3">
              <div className="flex items-center gap-3 md:group-data-[collapsible=icon]:justify-center md:group-data-[collapsible=icon]:gap-0">
                <img
                  src={Elogo}
                  alt="E-Paayos icon"
                  className="h-14 w-14 min-h-14 min-w-14 -mt-1 flex-none object-contain"
                  decoding="async"
                />
                <div className="grid min-w-0 flex-1 text-left leading-tight md:group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-xl font-bold tracking-wide text-white">E-Paayos</span>
                </div>
              </div>
            </SidebarHeader>

            <SidebarContent className="gap-0 px-2 py-4">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-2.5">
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={section === 'overview'}
                        tooltip="Overview"
                        onClick={() => setSection('overview')}
                        className={sidebarMenuButtonClass}
                      >
                        <LayoutDashboard className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Dashboard</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isUsersGroupActive}
                        tooltip="Users"
                        onClick={() => setUsersMenuOpen((prev) => !prev)}
                        className={sidebarMenuButtonClass}
                      >
                        <Users className="size-[18px] opacity-90" />
                        <span className="flex-1 whitespace-nowrap">Users</span>
                        {usersMenuOpen ? (
                          <ChevronDown className="size-4 opacity-90" />
                        ) : (
                          <ChevronRight className="size-4 opacity-90" />
                        )}
                      </SidebarMenuButton>
                      {usersMenuOpen && (
                        <SidebarMenuSub className="ml-10 gap-2.5 overflow-visible border-white/25">
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild={false}
                              isActive={section === 'users'}
                              onClick={() => setSection('users')}
                              className="min-w-max cursor-pointer overflow-visible pr-3 text-white hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black [&>svg]:text-current [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap"
                            >
                              <span>User management</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild={false}
                              isActive={section === 'reportedUsers'}
                              onClick={() => setSection('reportedUsers')}
                              className="min-w-max cursor-pointer overflow-visible pr-3 text-white hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black [&>svg]:text-current [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap"
                            >
                              <span>Reported User</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={section === 'trackServices'}
                        tooltip="Track Services"
                        onClick={() => setSection('trackServices')}
                        className={sidebarMenuButtonClass}
                      >
                        <ClipboardList className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Track Services</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={section === 'announcement'}
                        tooltip="Announcement"
                        onClick={() => setSection('announcement')}
                        className={sidebarMenuButtonClass}
                      >
                        <Megaphone className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Announcement</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarSeparator className="mx-0 bg-sidebar-border/80" />

            <SidebarFooter className="gap-2 px-3 py-2 group-data-[collapsible=icon]:items-center">
              <div className="flex items-center gap-2 overflow-hidden rounded-xl border border-white/15 bg-white/10 px-2.5 py-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-1">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#081F5C]">
                  {(user.fullName || user.email || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-[11px] font-normal uppercase tracking-wide text-white/80">Admin</p>
                  <p className="truncate text-[11px] text-white/75">{user.email}</p>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-linear-to-br from-blue-50 via-violet-100 to-indigo-100 dark:from-slate-900 dark:via-violet-950/40 dark:to-indigo-950/50">
            <header className="relative z-30 flex h-14 shrink-0 flex-none items-center gap-3 border-b border-border/60 bg-white/90 px-4 shadow-sm backdrop-blur-md dark:bg-background/95 md:px-6">
              <AdminMobileNav />
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-semibold tracking-tight text-foreground md:text-xl">
                  {meta.title}
                </h1>
                <p className="hidden truncate text-xs text-muted-foreground sm:block">{meta.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Notification"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-transparent text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Bell className="h-5 w-5" />
                </button>

                <div ref={profileMenuRef} className="relative">
                  <button
                    type="button"
                    aria-label="Profile menu"
                    onClick={() => setProfileOpen((prev) => !prev)}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                      profileOpen
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-base font-semibold leading-none text-white">
                      {(user.fullName || user.email || 'A').charAt(0).toUpperCase()}
                    </span>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-md border border-border/80 bg-background shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Account Settings</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false)
                          handleLogout()
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Log out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            <div
              id="admin-main-scroll"
              className="scrollbar-hidden flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain py-4 pl-4 pr-1 md:py-6 md:pl-6 md:pr-2"
            >
              {section === 'overview' && <AdminDashboardOverview user={user} setSection={setSection} />}
              {section === 'announcement' && (
                <div className="flex flex-1 flex-col gap-6 pr-3 md:pr-4">
                  <AdminAnnouncement />
                </div>
              )}
              {section === 'trackServices' && (
                <div className="flex flex-1 flex-col gap-6 pr-3 md:pr-4">
                  <AdminTrackServices />
                </div>
              )}
              {section === 'users' && (
                <div className="flex flex-1 flex-col gap-6 pr-3 md:pr-4">
                  <AdminUserManagement />
                </div>
              )}
              {section === 'reportedUsers' && (
                <div className="flex flex-1 flex-col gap-6 pr-3 md:pr-4">
                  <AdminReportedUsers />
                </div>
              )}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </div>
  )
}

export default AdminDashboard
