import { useEffect, useMemo, useRef, useState } from "react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts"
import AdminUserManagement from "@/pages/admin/userManagement.jsx"
import AdminAnnouncement from "@/pages/admin/announcement.jsx"
import AdminTrackServices from "@/pages/admin/trackServices.jsx"
import AdminNotification from "@/pages/admin/notification.jsx"
import { AdminReportsAnalyticsContent } from "@/pages/admin/reportsAnalytics.jsx"
import { AdminComplaintReportContent } from "@/pages/admin/complaint&Report.jsx"
import {
  NotificationBellIndicator,
  useAdminNotificationUnreadCount,
} from "@/components/notifications/NotificationFeed.jsx"
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
  SidebarProvider,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
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

const navyDeep = "#011e48"
const navy = "#224d84"
const navyMuted = "#1086ce"
const navyBright = "#1086ce"
const pageBaseNavyGradient = `linear-gradient(145deg, ${navyDeep} 0%, ${navy} 35%, ${navyMuted} 65%, ${navyBright} 100%)`

const SECTIONS = {
  overview: { title: "Dashboard", description: "Platform overview: bookings, listings, and moderation shortcuts." },
  reportsAnalytics: { title: "Reports & Analytics", description: "Comprehensive platform performance, revenue, and system reports." },
  announcement: { title: "Announcement", description: "Create and manage system announcements." },
  trackServices: { title: "Track services", description: "Monitor service bookings across customers, shops, and mechanics." },
  users: { title: "User management", description: "View and manage user accounts." },
  complaints: { title: "Complaint & Reports", description: "Review, investigate, and resolve grievances reported by customers." },
  notification: { title: "Notifications", description: "Stay updated with platform service bookings and activity." },
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

const STAT_ICON_TONE = {
  services: "text-[#224d84]",
  booked: "text-emerald-600",
  pending: "text-amber-500",
  working: "text-purple-600",
  completed: "text-teal-600",
}

function StatGradientCard({ label, value, icon: Icon, variant, helper, onClick, className }) {
  const iconTone = STAT_ICON_TONE[variant] ?? STAT_ICON_TONE.services
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden cursor-pointer rounded-none border border-[#c9e8fd] bg-white p-3 sm:p-4 shadow-[0_10px_28px_-18px_rgba(1,30,72,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#8fc8f3] hover:shadow-[0_16px_32px_-18px_rgba(1,30,72,0.5)]",
        className
      )}
    >
      <Icon className={cn("pointer-events-none absolute -right-2 -bottom-3 size-16 sm:size-20 rotate-12 stroke-[1.15] opacity-[0.12] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6", iconTone)} />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-[#011e48] tabular-nums">
            {value}
          </p>
          {helper ? (
            <p className="mt-1 truncate text-[10px] sm:text-[11px] font-medium text-slate-500">
              {helper}
            </p>
          ) : null}
        </div>
        <Icon className={cn("size-5 sm:size-6 shrink-0", iconTone)} />
      </div>
    </div>
  )
}

const selectShell =
  "h-9 w-full appearance-none rounded-none border border-slate-200 bg-white px-3 py-1.5 pr-8 text-xs font-semibold text-slate-800 shadow-xs outline-none focus-visible:border-[#1086ce] focus-visible:ring-2 focus-visible:ring-[#1086ce]/20"

function chipTone(t) {
  return (
    {
      blue: "linear-gradient(145deg, #011e48 0%, #224d84 55%, #1086ce 100%)",
      emerald: "linear-gradient(145deg, #224d84 0%, #1086ce 50%, #224d84 100%)",
      purple: "linear-gradient(145deg, #011e48 0%, #1086ce 60%, #224d84 100%)",
      orange: "linear-gradient(145deg, #1086ce 0%, #224d84 50%, #011e48 100%)",
    }[t] || "linear-gradient(145deg, #011e48 0%, #224d84 55%, #1086ce 100%)"
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
    <div className="space-y-3.5 sm:space-y-5 md:space-y-6 w-full max-w-full">
      {loadError ? (
        <div className="rounded-sm border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
          {loadError}
        </div>
      ) : null}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Spinner className="size-8 text-[#224d84]" />
          <p className="mt-3 text-sm font-medium text-slate-600">Loading admin workspace...</p>
        </div>
      ) : (
        <>
          {/* Modern Stat Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-3.5">
            {kpis.map(({ label, value, icon, variant, helper, onClick }, idx) => (
              <StatGradientCard
                key={label}
                label={label}
                value={value}
                icon={icon}
                variant={variant}
                helper={helper}
                onClick={onClick}
                className={idx === 4 ? "col-span-2 sm:col-span-1" : ""}
              />
            ))}
          </div>

          {/* Charts Section */}
          <section className="grid gap-4 lg:grid-cols-3">
            {/* New Bookings Created AreaChart */}
            <div className="rounded-none bg-white/90 p-3.5 sm:p-4 shadow-sm ring-1 ring-slate-200/45 backdrop-blur-sm lg:col-span-2 flex flex-col justify-between">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">New Bookings Received (Platform)</p>
                  <p className="text-xs text-slate-500">Volume trend of created service requests across all providers</p>
                </div>
                <div className="relative w-full sm:w-[160px] shrink-0">
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
                  config={{ series: { label: "Bookings", color: "#1086ce" } }}
                  className="aspect-auto h-[250px] w-full [&_.recharts-responsive-container]:!h-full"
                >
                  <AreaChart data={chartSeries} margin={{ top: 12, right: 12, left: -20, bottom: 4 }}>
                    <defs>
                      <linearGradient id="fillAdminBookings" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="5%" stopColor="#1086ce" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#224d84" stopOpacity={0.02} />
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
                      stroke="#224d84"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#fillAdminBookings)"
                      activeDot={{ r: 5, strokeWidth: 2, stroke: "#ffffff", fill: "#1086ce" }}
                    />
                  </AreaChart>
                </ChartContainer>
              </div>

              {/* Summary Metric Bar */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between sm:justify-start gap-2 rounded-none bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-full bg-[#1086ce] shrink-0" />
                    <span className="text-slate-500 truncate">Total in Period:</span>
                  </div>
                  <span className="font-bold text-slate-900 tabular-nums sm:ml-auto">
                    {chartSeries.reduce((acc, curr) => acc + curr.value, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between sm:justify-start gap-2 rounded-none bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-full bg-[#224d84] shrink-0" />
                    <span className="text-slate-500 truncate">Peak Volume:</span>
                  </div>
                  <span className="font-bold text-slate-900 tabular-nums sm:ml-auto">
                    {Math.max(0, ...chartSeries.map((s) => s.value))}
                  </span>
                </div>
                <div className="flex items-center justify-between sm:justify-start gap-2 rounded-none bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-2 w-2 rounded-full bg-[#8fc8f3] shrink-0" />
                    <span className="text-slate-500 truncate">Avg / Slot:</span>
                  </div>
                  <span className="font-bold text-slate-900 tabular-nums sm:ml-auto">
                    {chartSeries.length > 0
                      ? (chartSeries.reduce((acc, curr) => acc + curr.value, 0) / chartSeries.length).toFixed(1)
                      : 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Bookings By Status Donut Chart */}
            <div className="rounded-none bg-white/90 p-3.5 sm:p-4 shadow-sm ring-1 ring-slate-200/45 backdrop-blur-sm">
              <div className="mb-2">
                <p className="text-sm font-semibold text-slate-900">Bookings by Status</p>
                <p className="text-xs text-slate-500">Platform status breakdown across all shops</p>
              </div>

              <div className="relative mx-auto h-[200px] sm:h-[210px] w-full max-w-[260px] flex items-center justify-center">
                <PieChart width={220} height={200}>
                  <defs>
                    <linearGradient id="gradAdminPiePending" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#011e48" />
                      <stop offset="100%" stopColor="#224d84" />
                    </linearGradient>
                    <linearGradient id="gradAdminPieConfirmed" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#224d84" />
                      <stop offset="100%" stopColor="#1086ce" />
                    </linearGradient>
                    <linearGradient id="gradAdminPieWorking" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#1086ce" />
                      <stop offset="100%" stopColor="#8fc8f3" />
                    </linearGradient>
                    <linearGradient id="gradAdminPieCompleted" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#8fc8f3" />
                      <stop offset="100%" stopColor="#c9e8fd" />
                    </linearGradient>
                    <linearGradient id="gradAdminPieCancelled" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#224d84" />
                      <stop offset="100%" stopColor="#011e48" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={statusPieRows}
                    cx={110}
                    cy={100}
                    innerRadius={56}
                    outerRadius={88}
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

              <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                {statusPieRows.map((row) => (
                  <div key={row.key} className="flex min-w-0 items-center gap-1.5 rounded-none bg-slate-50 px-2 py-1 border border-slate-200/50">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        background:
                          row.key === "pending"
                            ? "linear-gradient(90deg,#011e48,#224d84)"
                            : row.key === "confirmed"
                              ? "linear-gradient(90deg,#224d84,#1086ce)"
                              : row.key === "working"
                                ? "linear-gradient(90deg,#1086ce,#8fc8f3)"
                                : row.key === "completed"
                                  ? "linear-gradient(90deg,#8fc8f3,#c9e8fd)"
                                  : "linear-gradient(90deg,#224d84,#011e48)",
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
            <div className="rounded-none bg-white/90 p-3.5 sm:p-4 shadow-sm ring-1 ring-slate-200/45 backdrop-blur-sm lg:col-span-3">
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
                      ? "bg-[#c9e8fd] text-[#011e48] border-[#8fc8f3]"
                      : s === "confirmed"
                        ? "bg-[#8fc8f3] text-[#011e48] border-[#1086ce]/50"
                        : s === "working"
                          ? "bg-[#1086ce]/15 text-[#011e48] border-[#1086ce]/45"
                          : s === "completed"
                            ? "bg-[#224d84]/12 text-[#011e48] border-[#224d84]/35"
                            : "bg-[#011e48]/10 text-[#011e48] border-[#011e48]/25"
                  return (
                    <div
                      key={o.rowKey}
                      className="flex flex-col rounded-none bg-gradient-to-r from-white via-slate-50/50 to-[#c9e8fd]/30 p-2.5 sm:p-3 border border-slate-200/60 shadow-xs transition hover:border-slate-300 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                            {o.id} • {o.buyer}
                          </span>
                          <span className={cn("inline-flex items-center rounded-none border px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider", badgeClass)}>
                            {o.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 truncate font-medium">
                          {o.serviceName} • <span className="text-slate-700 font-semibold">{o.shopLabel}</span>
                        </div>
                      </div>
                      <div className="flex flex-row items-center justify-between sm:flex-col sm:items-end sm:gap-0.5 border-t border-slate-100 pt-1.5 sm:border-0 sm:pt-0">
                        <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                          {o.when}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quick Navigation Links */}
            <div className="rounded-none bg-white/90 p-3.5 sm:p-4 shadow-sm ring-1 ring-slate-200/45 backdrop-blur-sm lg:col-span-2">
              <h3 className="text-sm font-semibold text-slate-900 mb-0.5">Quick Actions</h3>
              <p className="text-xs text-slate-500 mb-3">Shortcuts to system moderation and oversight tools.</p>
              <div className="space-y-2">
                {quickActions.map(({ label, desc, icon: QaIcon, tone, onClick }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={onClick}
                    className="group flex w-full items-center justify-between p-2.5 sm:p-3 bg-white hover:bg-slate-50/80 transition-all border border-slate-200/60 rounded-none text-left shadow-xs hover:shadow-sm"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div
                        className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-none text-white shadow-xs"
                        style={{ backgroundImage: chipTone(tone) }}
                      >
                        <QaIcon className="size-3.5 sm:size-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold text-slate-900 truncate">{label}</span>
                        <span className="block text-[10px] sm:text-[11px] text-slate-500 truncate">{desc}</span>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-slate-400 shrink-0 group-hover:text-slate-700 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* E-Paayos Navy Blue Footer Banner */}
          <footer className="mt-4 sm:mt-6 relative overflow-hidden rounded-none bg-gradient-to-br from-[#011e48] via-[#224d84] to-[#1086ce] p-4 sm:p-6 md:p-8 text-slate-200 border border-[#1086ce]/40 shadow-2xl">
            <div className="pointer-events-none absolute -top-16 -right-16 size-64 bg-[#1086ce]/25 blur-3xl rounded-full" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 size-64 bg-[#224d84]/40 blur-3xl rounded-full" />
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#224d84] via-[#1086ce] to-[#8fc8f3]" />

            <div className="relative z-10 grid gap-4 sm:gap-6 md:grid-cols-12 md:items-center">
              <div className="md:col-span-5 space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <div className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#224d84] to-[#1086ce] text-white shadow-md shadow-[#011e48]/40 border border-white/10">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      E-Paayos System Administration
                      <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider bg-[#1086ce]/30 text-[#c9e8fd] border border-[#8fc8f3]/30 px-1.5 sm:px-2 py-0.5 rounded-none">
                        v2.4 Enterprise
                      </span>
                    </h3>
                    <p className="text-[11px] sm:text-xs text-[#c9e8fd]/80">
                      Central Administrative Control & Moderation Workspace
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] sm:text-xs text-[#c9e8fd]/90 pt-0.5 sm:pt-1">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#8fc8f3] opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-[#8fc8f3]" />
                  </span>
                  <span className="font-semibold text-[#8fc8f3]">All Systems Operational</span>
                  <span className="text-[#8fc8f3]/60">•</span>
                  <span>Real-time Sync Active</span>
                </div>
              </div>

              <div className="md:col-span-4 flex flex-wrap gap-x-4 sm:gap-x-6 gap-y-2 text-xs font-medium text-[#c9e8fd]">
                <button type="button" onClick={() => setSection("users")} className="hover:text-white transition-colors flex items-center gap-1">
                  <Users className="size-3.5 text-[#8fc8f3]" /> User Management
                </button>
                <button type="button" onClick={() => setSection("trackServices")} className="hover:text-white transition-colors flex items-center gap-1">
                  <ClipboardList className="size-3.5 text-[#8fc8f3]" /> Track Services
                </button>
                <button type="button" onClick={() => setSection("announcement")} className="hover:text-white transition-colors flex items-center gap-1">
                  <Megaphone className="size-3.5 text-[#c9e8fd]" /> Announcement
                </button>
              </div>

              <div className="md:col-span-3 text-left md:text-right space-y-1">
                <p className="text-xs font-semibold text-white">
                  © {new Date().getFullYear()} E-Paayos Portal.
                </p>
                <p className="text-[10px] sm:text-[11px] text-[#c9e8fd]/70 leading-tight">
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
      className="-ml-1 mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-sm text-foreground hover:bg-accent md:hidden transition-colors cursor-pointer"
      onClick={() => setOpenMobile(true)}
      aria-label="Toggle navigation menu"
    >
      <Menu className="size-5 text-foreground" />
    </button>
  )
}

function AdminSidebarNav({ section, setSection, pendingComplaintsCount = 0 }) {
  const { isMobile, setOpenMobile } = useSidebar()
  const handleNav = (key) => {
    setSection(key)
    if (isMobile) setOpenMobile(false)
  }
  return (
    <SidebarMenu className="gap-2.5">
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={section === "overview"}
          tooltip="Dashboard"
          onClick={() => handleNav("overview")}
          className={sidebarMenuButtonClass}
        >
          <LayoutDashboard className="size-[18px] opacity-90" />
          <span className="whitespace-nowrap">Dashboard</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={section === "users"}
          tooltip="User Management"
          onClick={() => handleNav("users")}
          className={sidebarMenuButtonClass}
        >
          <Users className="size-[18px] opacity-90" />
          <span className="whitespace-nowrap">User Management</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={section === "trackServices"}
          tooltip="Track Services"
          onClick={() => handleNav("trackServices")}
          className={sidebarMenuButtonClass}
        >
          <ClipboardList className="size-[18px] opacity-90" />
          <span className="whitespace-nowrap">Track Services</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={section === "reportsAnalytics"}
          tooltip="Reports & Analytics"
          onClick={() => handleNav("reportsAnalytics")}
          className={sidebarMenuButtonClass}
        >
          <BarChart3 className="size-[18px] opacity-90" />
          <span className="whitespace-nowrap">Reports & Analytics</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={section === "announcement"}
          tooltip="Announcement"
          onClick={() => handleNav("announcement")}
          className={sidebarMenuButtonClass}
        >
          <Megaphone className="size-[18px] opacity-90" />
          <span className="whitespace-nowrap">Announcement</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={section === "complaints" || section === "complaintReports"}
          tooltip="Complaint & Reports"
          onClick={() => handleNav("complaints")}
          className={sidebarMenuButtonClass}
        >
          <AlertTriangle className="size-[18px] opacity-90 text-[#c9e8fd]" />
          <span className="whitespace-nowrap flex items-center justify-between flex-1 gap-2 min-w-0">
            <span className="truncate">Complaint & Reports</span>
            {pendingComplaintsCount > 0 && (
              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-black rounded-full bg-rose-500 text-white leading-none shadow-xs">
                {pendingComplaintsCount}
              </span>
            )}
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={section === "notification"}
          tooltip="Notifications"
          onClick={() => handleNav("notification")}
          className={sidebarMenuButtonClass}
        >
          <Bell className="size-[18px] opacity-90" />
          <span className="whitespace-nowrap">Notifications</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function AdminDashboard({ initialSection = "overview" } = {}) {
  const [user, setUser] = useState(null)
  const initialSec =
    typeof window !== "undefined" &&
    (window.location.hash === "#/admin/complaint-report" ||
      window.location.hash === "#/admin/complaints" ||
      window.location.hash === "#/admin/complaint&Report")
      ? "complaints"
      : typeof window !== "undefined" && window.location.hash === "#/admin/notification"
      ? "notification"
      : initialSection
  const [section, setSection] = useState(initialSec)
  const [sidebarOpen, setSidebarOpen] = useState(adminSidebarOpenState)
  const [profileOpen, setProfileOpen] = useState(false)
  const [pendingComplaintsCount, setPendingComplaintsCount] = useState(0)
  const profileMenuRef = useRef(null)
  const { unreadCount: adminUnreadCount } = useAdminNotificationUnreadCount(user)

  // Fetch pending complaints count for sidebar badge
  useEffect(() => {
    if (!user) return
    let cancelled = false
    fetch(`${API_URL}/api/admin/complaints/stats`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.success && json?.data?.pending !== undefined) {
          setPendingComplaintsCount(json.data.pending)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user, section])

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === "#/admin/notification") {
        setSection("notification")
      } else if (window.location.hash === "#/admin/reports-analytics") {
        setSection("reportsAnalytics")
      } else if (
        window.location.hash === "#/admin/complaint-report" ||
        window.location.hash === "#/admin/complaints" ||
        window.location.hash === "#/admin/complaint&Report"
      ) {
        setSection("complaints")
      } else if (window.location.hash === "#/admin/dashboard") {
        setSection((prev) =>
          prev === "notification" || prev === "reportsAnalytics" || prev === "complaints"
            ? "overview"
            : prev
        )
      }
    }
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [])

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
                  <AdminSidebarNav
                    section={section}
                    setSection={setSection}
                    pendingComplaintsCount={pendingComplaintsCount}
                  />
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarSeparator className="mx-0 bg-sidebar-border/80" />

            <SidebarFooter className="gap-2 px-3 py-2 group-data-[collapsible=icon]:items-center">
              <div className="flex items-center gap-2 overflow-hidden rounded-sm border border-white/15 bg-white/10 px-2.5 py-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-1">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#224d84]">
                  {(user.fullName || user.email || "A").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-[11px] font-normal uppercase tracking-wide text-white/80">Admin</p>
                  <p className="truncate text-[11px] text-white/75">{user.email}</p>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-linear-to-br from-[#c9e8fd] via-[#8fc8f3]/50 to-[#c9e8fd] dark:from-[#011e48] dark:via-[#224d84]/45 dark:to-[#011e48]">
            <header className="sticky top-0 z-40 flex h-14 sm:h-16 shrink-0 flex-none items-center justify-between gap-2 sm:gap-4 border-b border-border/60 bg-white/95 px-3 sm:px-4 md:px-6 shadow-xs backdrop-blur-md dark:bg-background/95">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
                <AdminMobileNav />
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-sm sm:text-base md:text-lg font-black tracking-tight text-foreground leading-tight">
                    {meta.title}
                  </h1>
                  <p className="hidden truncate text-xs text-muted-foreground md:block font-medium">{meta.description}</p>
                </div>
              </div>
              <div className="relative flex shrink-0 items-center gap-1 sm:gap-2.5">
                <button
                  type="button"
                  aria-label="Notification center"
                  onClick={() => {
                    setSection("notification")
                    window.location.hash = "#/admin/notification"
                  }}
                  className={`relative flex size-9 sm:size-10 items-center justify-center rounded-sm transition-colors cursor-pointer ${section === "notification"
                      ? "bg-[#c9e8fd] text-[#224d84] dark:bg-white/10 dark:text-[#8fc8f3]"
                      : "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                >
                  <NotificationBellIndicator unreadCount={adminUnreadCount}>
                    <Bell className="size-4.5 sm:size-5" />
                  </NotificationBellIndicator>
                </button>

                <div ref={profileMenuRef} className="relative">
                  <button
                    type="button"
                    aria-label="Profile menu"
                    onClick={() => setProfileOpen((prev) => !prev)}
                    className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 text-foreground hover:bg-accent rounded-sm transition-colors cursor-pointer"
                  >
                    <span className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#011e48] via-[#224d84] to-[#1086ce] text-xs font-bold leading-none text-white shadow-xs">
                      {(user.fullName || user.email || "A").charAt(0).toUpperCase()}
                    </span>
                    <span className="hidden lg:inline-block max-w-[110px] truncate text-xs font-bold uppercase tracking-wider">
                      {user.fullName ? user.fullName.split(' ')[0] : 'Admin'}
                    </span>
                    <ChevronDown className={`size-3.5 text-muted-foreground transition-transform duration-200 ${profileOpen ? 'rotate-180 text-foreground' : ''}`} />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-md border border-slate-200 dark:border-border/80 bg-white dark:bg-slate-900 shadow-2xl z-50 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#011e48] via-[#224d84] to-[#1086ce] text-sm font-extrabold text-white shadow-xs">
                          {(user.fullName || user.email || "A").charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-foreground">
                            {user.fullName || 'Administrator'}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">{user.email || ''}</p>
                          <span className="inline-flex items-center gap-1 mt-1 rounded-sm border border-[#224d84]/20 bg-[#224d84]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#224d84] dark:text-[#8fc8f3]">
                            Administrator
                          </span>
                        </div>
                      </div>
                      <div className="p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false)
                            requestLogout()
                          }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition-colors"
                        >
                          <LogOut className="size-4" />
                          <span>Log out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </header>

            <div
              id="admin-main-scroll"
              className="scrollbar-hidden flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:p-4 md:p-6"
            >
              {section === "overview" && <AdminDashboardOverview user={user} setSection={setSection} />}
              {section === "reportsAnalytics" && (
                <div className="flex flex-1 flex-col gap-4 sm:gap-6 min-w-0 max-w-full">
                  <AdminReportsAnalyticsContent />
                </div>
              )}
              {section === "announcement" && (
                <div className="flex flex-1 flex-col gap-4 sm:gap-6 min-w-0 max-w-full">
                  <AdminAnnouncement />
                </div>
              )}
              {section === "trackServices" && (
                <div className="flex flex-1 flex-col gap-4 sm:gap-6 min-w-0 max-w-full">
                  <AdminTrackServices />
                </div>
              )}
              {section === "users" && (
                <div className="flex flex-1 flex-col gap-4 sm:gap-6 min-w-0 max-w-full">
                  <AdminUserManagement />
                </div>
              )}
              {section === "complaints" && (
                <div className="flex flex-1 flex-col gap-4 sm:gap-6 min-w-0 max-w-full">
                  <AdminComplaintReportContent />
                </div>
              )}
              {section === "notification" && (
                <div className="flex flex-1 flex-col gap-4 sm:gap-6 min-w-0 max-w-full">
                  <AdminNotification isEmbedded />
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
