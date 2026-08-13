import { useEffect, useMemo, useRef, useState } from "react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts"
import AdminUserManagement from "@/pages/admin/userManagement.jsx"
import AdminReportedUsers from "@/pages/admin/reportedUsers.jsx"
import AdminAnnouncement from "@/pages/admin/announcement.jsx"
import AdminTrackServices from "@/pages/admin/trackServices.jsx"
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
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
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
  ShieldCheck,
  Store,
  Users,
} from "lucide-react"
import Elogo from "@/assets/Elogo.png"
import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import { useLogoutConfirmation } from "@/hooks/useLogoutConfirmation.jsx"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

const navyDeep = "#04133d"
const navy = "#081F5C"
const navyMuted = "#0b2b73"
const navyBright = "#1447a6"
const pageBaseNavyGradient = `linear-gradient(145deg, ${navyDeep} 0%, ${navy} 35%, ${navyMuted} 65%, ${navyBright} 100%)`

const SECTIONS = {
  overview: { title: "Dashboard", description: "Platform overview: bookings, listings, and moderation shortcuts." },
  announcement: { title: "Announcement", description: "Create and manage system announcements." },
  trackServices: { title: "Track services", description: "Monitor service bookings across customers, shops, and mechanics." },
  users: { title: "User management", description: "View and manage user accounts." },
  reportedUsers: { title: "Reported User", description: "Review users that have been reported." },
}

const API_URL = getApiBaseUrl()

let adminSidebarOpenState = false

function authHeaders() {
  const token = localStorage.getItem("token")
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function timeAgo(dateString) {
  if (!dateString) return "Recently"
  const d = new Date(dateString)
  const diffMs = Date.now() - d.getTime()
  if (isNaN(diffMs)) return "Recently"
  const sec = Math.floor(diffMs / 1000)
  const min = Math.floor(sec / 60)
  const hr = Math.floor(min / 60)
  const day = Math.floor(hr / 24)
  if (sec < 60) return "Just now"
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  return `${day}d ago`
}

function normalizeStatus(s) {
  return String(s || "").toLowerCase()
}

const STAT_CARD_GRADIENT = {
  services: "from-[#04133d] via-[#081F5C] to-[#1447a6] border-[#1447a6]/40",
  booked: "from-blue-600 via-indigo-700 to-slate-950 border-blue-400/30",
  pending: "from-amber-600 via-orange-700 to-slate-950 border-amber-400/30",
  working: "from-purple-600 via-violet-700 to-slate-950 border-purple-400/30",
  completed: "from-emerald-600 via-teal-700 to-slate-950 border-emerald-400/30",
}

function StatGradientCard({ label, value, icon: Icon, variant, helper, onClick }) {
  const gradient = STAT_CARD_GRADIENT[variant] ?? STAT_CARD_GRADIENT.services
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden bg-gradient-to-br p-4 text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg rounded-sm border cursor-pointer",
        gradient
      )}
    >
      <div className="pointer-events-none absolute -right-3 -top-3 size-28 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-lg group-hover:scale-125 transition-transform duration-500" />
      <Icon className="pointer-events-none absolute -right-2 -top-2 size-20 text-white/15 stroke-[1.2] rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:text-white/25" />

      <div className="relative z-10 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-black/25 backdrop-blur-md border border-white/25 text-white rounded-none shadow-xs">
            <Icon className="size-3 text-white/90" />
            {label}
          </span>
          <div className="size-6 rounded-none bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/30 text-white group-hover:bg-white group-hover:text-slate-900 transition-colors shadow-xs">
            <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm tabular-nums">
              {value}
            </span>
          </div>
          {helper ? (
            <p className="text-[11px] text-white/85 font-medium mt-1 leading-snug truncate">
              {helper}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const selectShell =
  "h-9 w-full appearance-none rounded-none border border-slate-200 bg-white px-3 py-1.5 pr-8 text-xs font-semibold text-slate-800 shadow-xs outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"

function chipTone(t) {
  return (
    {
      blue: "linear-gradient(145deg, rgba(8,31,92,0.95) 0%, rgba(20,71,166,0.82) 55%, rgba(59,130,246,0.72) 100%)",
      emerald: "linear-gradient(145deg, rgba(4,120,87,0.95) 0%, rgba(16,185,129,0.88) 55%, rgba(52,211,153,0.72) 100%)",
      purple: "linear-gradient(145deg, rgba(124,58,237,0.95) 0%, rgba(139,92,246,0.82) 55%, rgba(167,139,250,0.72) 100%)",
      orange: "linear-gradient(145deg, rgba(180,83,9,0.95) 0%, rgba(245,158,11,0.88) 55%, rgba(251,191,36,0.72) 100%)",
    }[t] || "linear-gradient(145deg, rgba(8,31,92,0.95) 0%, rgba(20,71,166,0.82) 55%, rgba(59,130,246,0.72) 100%)"
  )
}

function AdminDashboardOverview({ user, setSection }) {
  const [range, setRange] = useState("thisWeek")
  const [bookings, setBookings] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError("")
      try {
        const [statsRes, listRes] = await Promise.all([
          fetch(`${API_URL}/api/admin/service-bookings/stats`, { headers: authHeaders() }),
          fetch(`${API_URL}/api/admin/service-bookings`, { headers: authHeaders() }),
        ])
        const statsJson = await statsRes.json().catch(() => ({}))
        const listJson = await listRes.json().catch(() => ({}))
        if (!statsRes.ok) throw new Error(statsJson?.message || "Could not load stats.")
        if (!listRes.ok) throw new Error(listJson?.message || "Could not load bookings.")
        if (!cancelled) {
          setStats(statsJson?.data ?? null)
          setBookings(Array.isArray(listJson?.data) ? listJson.data : [])
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e?.message || "Could not load dashboard data.")
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
        label: "Total Bookings",
        value: s.totalBookings ?? 0,
        icon: ClipboardList,
        variant: "services",
        helper: "All bookings on E-Paayos",
        onClick: () => setSection("trackServices"),
      },
      {
        label: "Active Listings",
        value: s.activeListings ?? 0,
        icon: Store,
        variant: "booked",
        helper: "Services visible to customers",
        onClick: () => setSection("trackServices"),
      },
      {
        label: "Pending Action",
        value: s.pending ?? 0,
        icon: ClipboardList,
        variant: "pending",
        helper: "Awaiting provider action",
        onClick: () => setSection("trackServices"),
      },
      {
        label: "In Progress",
        value: s.inProgress ?? 0,
        icon: PlayCircle,
        variant: "working",
        helper: "Confirmed or working",
        onClick: () => setSection("trackServices"),
      },
      {
        label: "Completed Jobs",
        value: s.completed ?? 0,
        icon: CheckCircle,
        variant: "completed",
        helper: "Finished platform jobs",
        onClick: () => setSection("trackServices"),
      },
    ]
  }, [stats, setSection])

  const statusPieRows = useMemo(() => {
    const s = stats || { pending: 0, confirmed: 0, working: 0, completed: 0, cancelled: 0 }
    return [
      { key: "pending", name: "Pending", value: s.pending ?? 0, fill: "url(#gradAdminPiePending)" },
      { key: "confirmed", name: "Confirmed", value: s.confirmed ?? 0, fill: "url(#gradAdminPieConfirmed)" },
      { key: "working", name: "Working", value: s.working ?? 0, fill: "url(#gradAdminPieWorking)" },
      { key: "completed", name: "Completed", value: s.completed ?? 0, fill: "url(#gradAdminPieCompleted)" },
      { key: "cancelled", name: "Cancelled", value: s.cancelled ?? 0, fill: "url(#gradAdminPieCancelled)" },
    ]
  }, [stats])

  const statusPieTotal = useMemo(
    () => statusPieRows.reduce((sum, entry) => sum + entry.value, 0),
    [statusPieRows]
  )

  const chartSeries = useMemo(() => {
    const source = bookings
    const now = new Date()
    const getDateRange = () => {
      switch (range) {
        case "today":
          return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end: now }
        case "thisWeek": {
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          weekStart.setHours(0, 0, 0, 0)
          return { start: weekStart, end: now }
        }
        case "lastWeek": {
          const lastWeekEnd = new Date(now)
          lastWeekEnd.setDate(now.getDate() - now.getDay() - 1)
          lastWeekEnd.setHours(23, 59, 59, 999)
          const lastWeekStart = new Date(lastWeekEnd)
          lastWeekStart.setDate(lastWeekEnd.getDate() - 6)
          lastWeekStart.setHours(0, 0, 0, 0)
          return { start: lastWeekStart, end: lastWeekEnd }
        }
        case "thisMonth":
          return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
        case "lastMonth": {
          const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
          const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          return { start: lastMonthStart, end: lastMonthEnd }
        }
        case "thisYear":
          return { start: new Date(now.getFullYear(), 0, 1), end: now }
        case "lastYear": {
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
      if (range === "today") {
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}-${String(dt.getHours()).padStart(2, "0")}`
      }
      if (range === "thisYear" || range === "lastYear") {
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`
      }
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
    }
    const dataMap = new Map()
    filtered.forEach((o) => {
      const ts = o?.createdAt || Date.now()
      const key = makeKey(ts)
      dataMap.set(key, (dataMap.get(key) || 0) + 1)
    })
    const result = []
    if (range === "today") {
      for (let i = 0; i < 24; i++) {
        const d = new Date(start)
        d.setHours(i, 0, 0, 0)
        const key = makeKey(d)
        result.push({ date: `${String(i).padStart(2, "0")}:00`, value: dataMap.get(key) || 0 })
      }
    } else if (range === "thisWeek" || range === "lastWeek") {
      const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      for (let i = 0; i < 7; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        result.push({ date: weekDays[d.getDay()], value: dataMap.get(makeKey(d)) || 0 })
      }
    } else if (range === "thisMonth" || range === "lastMonth") {
      const daysInMonth =
        range === "thisMonth"
          ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
          : new Date(now.getFullYear(), now.getMonth(), 0).getDate()
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(start)
        d.setDate(i)
        result.push({ date: `D${i}`, value: dataMap.get(makeKey(d)) || 0 })
      }
    } else {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
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
      .slice(0, 4)
      .map((o) => ({
        rowKey: o.id,
        id: o.ref || o.id || "—",
        buyer: o.contactName || o.customer?.fullName || "Customer",
        serviceName: o.shopService?.name || "Service Repair",
        shopLabel: o.shopOwner?.shopName || o.shopOwner?.fullName || "Independent Provider",
        status: normalizeStatus(o?.status) || "pending",
        when: o?.updatedAt ? timeAgo(o.updatedAt) : o?.createdAt ? timeAgo(o.createdAt) : "Recently",
      }))
  }, [bookings])

  const quickActions = [
    {
      label: "User Management",
      desc: "Accounts, approvals, and roles",
      icon: Users,
      tone: "blue",
      onClick: () => setSection("users"),
    },
    {
      label: "Reported Users",
      desc: "Review flagged accounts",
      icon: Flag,
      tone: "orange",
      onClick: () => setSection("reportedUsers"),
    },
    {
      label: "Track Services",
      desc: "All bookings across the platform",
      icon: ClipboardList,
      tone: "emerald",
      onClick: () => setSection("trackServices"),
    },
    {
      label: "System Announcements",
      desc: "Broadcast updates to users",
      icon: Megaphone,
      tone: "purple",
      onClick: () => setSection("announcement"),
    },
  ]

  return (
    <div className="space-y-4 pr-2 md:pr-4">
      {loadError ? (
        <div className="rounded-sm border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
          {loadError}
        </div>
      ) : null}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Spinner className="size-8 text-[#081F5C]" />
          <p className="mt-3 text-sm font-medium text-slate-600">Loading admin workspace...</p>
        </div>
      ) : (
        <>
          {/* Modern Stat Cards Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {kpis.map(({ label, value, icon, variant, helper, onClick }) => (
              <StatGradientCard
                key={label}
                label={label}
                value={value}
                icon={icon}
                variant={variant}
                helper={helper}
                onClick={onClick}
              />
            ))}
          </div>

          {/* Charts Section */}
          <section className="grid gap-4 lg:grid-cols-3">
            {/* New Bookings Created AreaChart */}
            <div className="rounded-none bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/45 backdrop-blur-sm lg:col-span-2 flex flex-col justify-between">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">New Bookings Received (Platform)</p>
                  <p className="text-xs text-slate-500">Volume trend of created service requests across all providers</p>
                </div>
                <div className="relative w-[148px] shrink-0 sm:w-[160px]">
                  <select
                    value={range}
                    onChange={(e) => setRange(e.target.value)}
                    className={selectShell}
                  >
                    <option value="today">Today</option>
                    <option value="thisWeek">This Week</option>
                    <option value="lastWeek">Last Week</option>
                    <option value="thisMonth">This Month</option>
                    <option value="lastMonth">Last Month</option>
                    <option value="thisYear">This Year</option>
                    <option value="lastYear">Last Year</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="flex-1 rounded-none bg-slate-50/60 p-2.5 ring-1 ring-slate-200/40 flex flex-col justify-center">
                <ChartContainer
                  id="admin-bookings-chart"
                  config={{ series: { label: "Bookings", color: "#1447a6" } }}
                  className="aspect-auto h-[250px] w-full [&_.recharts-responsive-container]:!h-full"
                >
                  <AreaChart data={chartSeries} margin={{ top: 12, right: 12, left: -20, bottom: 4 }}>
                    <defs>
                      <linearGradient id="fillAdminBookings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1447a6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#081F5C" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(148 163 184 / 0.35)" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tick={{ fontSize: 11, fontWeight: 500 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={6}
                      tick={{ fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#081F5C"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#fillAdminBookings)"
                      activeDot={{ r: 5, strokeWidth: 2, stroke: "#ffffff", fill: "#1447a6" }}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>

              {/* Summary Metric Bar */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2 rounded-none bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200/50">
                  <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                  <span className="text-slate-500 truncate">Total in Period:</span>
                  <span className="font-bold text-slate-900 tabular-nums ml-auto">
                    {chartSeries.reduce((acc, curr) => acc + curr.value, 0)}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-none bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200/50">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-500 truncate">Peak Volume:</span>
                  <span className="font-bold text-slate-900 tabular-nums ml-auto">
                    {Math.max(0, ...chartSeries.map((s) => s.value))}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-none bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200/50">
                  <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
                  <span className="text-slate-500 truncate">Avg / Slot:</span>
                  <span className="font-bold text-slate-900 tabular-nums ml-auto">
                    {chartSeries.length > 0
                      ? (chartSeries.reduce((acc, curr) => acc + curr.value, 0) / chartSeries.length).toFixed(1)
                      : 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Bookings By Status Donut Chart */}
            <div className="rounded-none bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/45 backdrop-blur-sm">
              <div className="mb-2">
                <p className="text-sm font-semibold text-slate-900">Bookings by Status</p>
                <p className="text-xs text-slate-500">Platform status breakdown across all shops</p>
              </div>

              <div className="relative mx-auto h-[210px] w-full max-w-[260px] flex items-center justify-center">
                <PieChart width={220} height={210}>
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
                    cx={110}
                    cy={105}
                    innerRadius={58}
                    outerRadius={90}
                    paddingAngle={3}
                    cornerRadius={3}
                    stroke="#ffffff"
                    strokeWidth={2}
                    dataKey="value"
                  >
                    {statusPieRows.map((row) => (
                      <Cell key={row.key} fill={row.fill} />
                    ))}
                  </Pie>
                </PieChart>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                      {statusPieTotal}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Total
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                {statusPieRows.map((row) => (
                  <div key={row.key} className="flex min-w-0 items-center gap-1.5 rounded-none bg-slate-50 px-2 py-1 border border-slate-200/50">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        background:
                          row.key === "pending"
                            ? "linear-gradient(90deg,#f59e0b,#d97706)"
                            : row.key === "confirmed"
                              ? "linear-gradient(90deg,#0ea5e9,#0369a1)"
                              : row.key === "working"
                                ? "linear-gradient(90deg,#8b5cf6,#5b21b6)"
                                : row.key === "completed"
                                  ? "linear-gradient(90deg,#10b981,#059669)"
                                  : "linear-gradient(90deg,#64748b,#334155)",
                      }}
                    />
                    <span className="truncate text-slate-600 font-medium">{row.name}</span>
                    <span className="ml-auto shrink-0 font-bold tabular-nums text-slate-900">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Recent Activity & Quick Navigation */}
          <section className="grid gap-4 lg:grid-cols-5">
            {/* Recent Bookings List */}
            <div className="rounded-none bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/45 backdrop-blur-sm lg:col-span-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Recent Platform Bookings</p>
                  <p className="text-xs text-slate-500">Latest service bookings created across E-Paayos</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSection("trackServices")}
                  className="inline-flex items-center gap-1 rounded-none border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
                >
                  View all <ChevronRight className="size-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {!loading && recent.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No bookings yet. When customers book services, they will appear here and in Track services.
                  </p>
                ) : null}
                {recent.map((o) => {
                  const s = o.status
                  const badgeClass =
                    s === "pending"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : s === "confirmed"
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : s === "working"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : s === "completed"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                  return (
                    <div
                      key={o.rowKey}
                      className="flex flex-col rounded-none bg-gradient-to-r from-white via-slate-50/50 to-blue-50/30 p-3 border border-slate-200/60 shadow-xs transition hover:border-slate-300 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900 text-sm">
                            {o.id} • {o.buyer}
                          </span>
                          <span className={cn("inline-flex items-center rounded-none border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", badgeClass)}>
                            {o.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 truncate font-medium">
                          {o.serviceName} • <span className="text-slate-700 font-semibold">{o.shopLabel}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-row items-center justify-between gap-3 sm:mt-0 sm:flex-col sm:items-end sm:gap-0.5">
                        <div className="text-[11px] text-slate-400 font-medium">
                          {o.when}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quick Navigation Links */}
            <div className="rounded-none bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/45 backdrop-blur-sm lg:col-span-2">
              <h3 className="text-sm font-semibold text-slate-900 mb-0.5">Quick Actions</h3>
              <p className="text-xs text-slate-500 mb-3">Shortcuts to system moderation and oversight tools.</p>
              <div className="space-y-2">
                {quickActions.map(({ label, desc, icon: QaIcon, tone, onClick }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={onClick}
                    className="group flex w-full items-center justify-between p-3 bg-white hover:bg-slate-50/80 transition-all border border-slate-200/60 rounded-none text-left shadow-xs hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-none text-white shadow-xs"
                        style={{ backgroundImage: chipTone(tone) }}
                      >
                        <QaIcon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold text-slate-900 truncate">{label}</span>
                        <span className="block text-[11px] text-slate-500 truncate">{desc}</span>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-slate-400 shrink-0 group-hover:text-slate-700 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* E-Paayos Navy Blue Footer Banner */}
          <footer className="mt-6 relative overflow-hidden rounded-none bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#0b2b73] p-6 sm:p-8 text-slate-200 border border-[#1447a6]/40 shadow-2xl">
            <div className="pointer-events-none absolute -top-16 -right-16 size-64 bg-[#1447a6]/25 blur-3xl rounded-full" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 size-64 bg-[#081F5C]/40 blur-3xl rounded-full" />
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#081F5C] via-[#1447a6] to-sky-400" />

            <div className="relative z-10 grid gap-6 md:grid-cols-12 md:items-center">
              <div className="md:col-span-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#081F5C] to-[#1447a6] text-white shadow-md shadow-blue-900/40 border border-white/10">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      E-Paayos System Administration
                      <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#1447a6]/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-none">
                        v2.4 Enterprise
                      </span>
                    </h3>
                    <p className="text-xs text-blue-200/80">
                      Central Administrative Control & Moderation Workspace
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-blue-200/90 pt-1">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-sky-400" />
                  </span>
                  <span className="font-semibold text-sky-300">All Systems Operational</span>
                  <span className="text-blue-400/60">•</span>
                  <span>Real-time Sync Active</span>
                </div>
              </div>

              <div className="md:col-span-4 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-blue-100">
                <button type="button" onClick={() => setSection("users")} className="hover:text-white transition-colors flex items-center gap-1">
                  <Users className="size-3.5 text-sky-400" /> User Management
                </button>
                <button type="button" onClick={() => setSection("reportedUsers")} className="hover:text-white transition-colors flex items-center gap-1">
                  <Flag className="size-3.5 text-amber-300" /> Reported Users
                </button>
                <button type="button" onClick={() => setSection("trackServices")} className="hover:text-white transition-colors flex items-center gap-1">
                  <ClipboardList className="size-3.5 text-blue-400" /> Track Services
                </button>
                <button type="button" onClick={() => setSection("announcement")} className="hover:text-white transition-colors flex items-center gap-1">
                  <Megaphone className="size-3.5 text-indigo-300" /> Announcement
                </button>
              </div>

              <div className="md:col-span-3 text-left md:text-right space-y-1">
                <p className="text-xs font-semibold text-white">
                  © {new Date().getFullYear()} E-Paayos Portal.
                </p>
                <p className="text-[11px] text-blue-200/70 leading-tight">
                  Platform Administration & Management
                </p>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  )
}

const sidebarMenuButtonClass =
  "h-9 gap-3 rounded-sm px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap"

function AdminMobileNav() {
  const { isMobile, setOpenMobile } = useSidebar()
  if (!isMobile) return null
  return (
    <button
      type="button"
      className="-ml-1 mr-2 shrink-0 rounded-sm px-2 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
      onClick={() => setOpenMobile(true)}
    >
      Menu
    </button>
  )
}

function AdminDashboard() {
  const [user, setUser] = useState(null)
  const [section, setSection] = useState("overview")
  const [usersMenuOpen, setUsersMenuOpen] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(adminSidebarOpenState)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileMenuRef = useRef(null)
  const isUsersGroupActive = section === "users" || section === "reportedUsers"

  useEffect(() => {
    const raw = localStorage.getItem("user")
    const token = localStorage.getItem("token")
    if (!token || !raw) {
      window.location.hash = "#/login"
      return
    }
    try {
      const parsed = JSON.parse(raw)
      if (parsed.role !== "admin") {
        window.location.hash = "#/login"
        return
      }
      setUser(parsed)
    } catch {
      window.location.hash = "#/login"
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

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [profileOpen])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    window.location.hash = "#/"
  }

  const { requestLogout, LogoutDialog } = useLogoutConfirmation(handleLogout)

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
          style={{ "--sidebar": "transparent", "--sidebar-width": "17.5rem", "--sidebar-width-icon": "3.35rem" }}
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
                        isActive={section === "overview"}
                        tooltip="Overview"
                        onClick={() => setSection("overview")}
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
                              isActive={section === "users"}
                              onClick={() => setSection("users")}
                              className="min-w-max cursor-pointer overflow-visible pr-3 text-white hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black [&>svg]:text-current [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap"
                            >
                              <span>User management</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild={false}
                              isActive={section === "reportedUsers"}
                              onClick={() => setSection("reportedUsers")}
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
                        isActive={section === "trackServices"}
                        tooltip="Track Services"
                        onClick={() => setSection("trackServices")}
                        className={sidebarMenuButtonClass}
                      >
                        <ClipboardList className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Track Services</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={section === "announcement"}
                        tooltip="Announcement"
                        onClick={() => setSection("announcement")}
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
              <div className="flex items-center gap-2 overflow-hidden rounded-sm border border-white/15 bg-white/10 px-2.5 py-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-1">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#081F5C]">
                  {(user.fullName || user.email || "A").charAt(0).toUpperCase()}
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
                  className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-transparent text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
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
                        ? "bg-blue-50 text-blue-700"
                        : "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-base font-semibold leading-none text-white">
                      {(user.fullName || user.email || "A").charAt(0).toUpperCase()}
                    </span>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-sm border border-border/80 bg-background shadow-lg">
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
                          requestLogout()
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
              {section === "overview" && <AdminDashboardOverview user={user} setSection={setSection} />}
              {section === "announcement" && (
                <div className="flex flex-1 flex-col gap-6 pr-3 md:pr-4">
                  <AdminAnnouncement />
                </div>
              )}
              {section === "trackServices" && (
                <div className="flex flex-1 flex-col gap-6 pr-3 md:pr-4">
                  <AdminTrackServices />
                </div>
              )}
              {section === "users" && (
                <div className="flex flex-1 flex-col gap-6 pr-3 md:pr-4">
                  <AdminUserManagement />
                </div>
              )}
              {section === "reportedUsers" && (
                <div className="flex flex-1 flex-col gap-6 pr-3 md:pr-4">
                  <AdminReportedUsers />
                </div>
              )}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
      {LogoutDialog}
    </div>
  )
}

export default AdminDashboard
