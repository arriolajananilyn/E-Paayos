import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts"
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
} from "../../components/ui/sidebar"
import { TooltipProvider } from "../../components/ui/tooltip"
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
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
  LayoutDashboard,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  Package,
  Phone,
  PlayCircle,
  Plus,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  User,
  Users,
  Wallet,
  Wrench,
  XCircle,
} from "lucide-react"
import Elogo from "../../assets/Elogo.png"
import {
  EPAAYOS_UNREAD_EVENT,
  NotificationBellIndicator,
  useNotificationUnreadCount,
} from "../../components/notifications/NotificationFeed.jsx"
import { useLogoutConfirmation } from "@/hooks/useLogoutConfirmation.jsx"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

const navyDeep = "#04133d"
const navy = "#081F5C"
const navyMuted = "#0b2b73"
const navyBright = "#1447a6"
const pageBaseNavyGradient = `linear-gradient(145deg, ${navyDeep} 0%, ${navy} 35%, ${navyMuted} 65%, ${navyBright} 100%)`

const DASHBOARD_META = { title: "Dashboard", description: "Overview of your shop operations and bookings." }
let shopOwnerSidebarOpenState = false

const API_URL = import.meta?.env?.VITE_API_URL || "http://localhost:5000"

const PROVIDER_NOTIF_ROUTES = {
  bookings: "#/provider/service-request",
  messages: "#/provider/messages",
  dashboard: "#/provider/dashboard",
}

function authHeaders() {
  const token = localStorage.getItem("token")
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function currencyPhilippinePeso(amount) {
  const n = Number(amount || 0)
  try {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n)
  } catch {
    return `₱${Math.round(n).toLocaleString("en-PH")}`
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

function formatPreferredDate(val) {
  if (!val) return "Flexible / Any day"
  const d = new Date(val)
  if (isNaN(d.getTime())) return String(val)
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatDateTime(val) {
  if (!val) return "—"
  const d = new Date(val)
  if (isNaN(d.getTime())) return String(val)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function bookingStatusBadgeClass(status) {
  const s = String(status || "").toLowerCase()
  switch (s) {
    case "pending":
      return "bg-amber-100 text-amber-900 border-amber-300"
    case "confirmed":
      return "bg-sky-100 text-sky-900 border-sky-300"
    case "working":
    case "in_progress":
      return "bg-purple-100 text-purple-900 border-purple-300"
    case "completed":
      return "bg-emerald-100 text-emerald-900 border-emerald-300"
    case "cancelled":
    case "rejected":
      return "bg-rose-100 text-rose-900 border-rose-300"
    default:
      return "bg-slate-100 text-slate-800 border-slate-300"
  }
}

function paymentBadgeClass(status) {
  const s = String(status || "").toLowerCase()
  switch (s) {
    case "paid":
      return "bg-emerald-100 text-emerald-900 border-emerald-300"
    case "pending":
    case "unpaid":
      return "bg-amber-100 text-amber-900 border-amber-300"
    case "failed":
      return "bg-rose-100 text-rose-900 border-rose-300"
    default:
      return "bg-slate-100 text-slate-800 border-slate-300"
  }
}

const STAT_CARD_GRADIENT = {
  services: "from-emerald-600 via-teal-700 to-slate-950 border-emerald-400/30",
  pending: "from-amber-600 via-orange-700 to-slate-950 border-amber-400/30",
  active: "from-blue-600 via-indigo-700 to-slate-950 border-blue-400/30",
  completed: "from-purple-600 via-violet-700 to-slate-950 border-purple-400/30",
}

function StatGradientCard({ label, value, icon: Icon, variant, helper, onClick, className }) {
  const gradient = STAT_CARD_GRADIENT[variant] ?? STAT_CARD_GRADIENT.services
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden bg-gradient-to-br p-2.5 sm:p-4 text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg rounded-none border cursor-pointer",
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
          {helper ? (
            <p className="text-[10px] sm:text-[11px] text-white/85 font-medium mt-0.5 sm:mt-1 leading-snug truncate">
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

export function ShopOwnerDashboardHome({ variant = "shop" }) {
  const [range, setRange] = useState("thisWeek")
  const [bookings, setBookings] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [copiedRef, setCopiedRef] = useState(false)

  const handleCopyRef = useCallback((refText) => {
    if (!refText) return
    navigator.clipboard?.writeText(refText).then(() => {
      setCopiedRef(true)
      setTimeout(() => setCopiedRef(false), 2000)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError("")
      try {
        const [bRes, sRes] = await Promise.all([
          fetch(`${API_URL}/api/shop/bookings`, { headers: authHeaders() }),
          fetch(`${API_URL}/api/shop/services`, { headers: authHeaders() }),
        ])
        const bData = await bRes.json().catch(() => ({}))
        const sData = await sRes.json().catch(() => [])
        if (!bRes.ok) throw new Error(bData?.message || "Could not load bookings.")
        if (!sRes.ok) {
          const se = Array.isArray(sData) ? {} : sData
          throw new Error(se?.message || "Could not load services.")
        }
        const bList = Array.isArray(bData?.bookings) ? bData.bookings : []
        const sList = Array.isArray(sData) ? sData : []
        if (!cancelled) {
          setBookings(bList)
          setServices(sList)
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e?.message || "Could not load dashboard data.")
          setBookings([])
          setServices([])
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

  const inactiveListings = useMemo(() => services.filter((s) => s.status === "inactive").length, [services])

  const kpis = useMemo(() => {
    const activeListings = services.filter((s) => s.status === "active").length
    const pending = bookings.filter((b) => b.status === "pending").length
    const inPipeline = bookings.filter((b) => b.status === "confirmed" || b.status === "working").length
    const completed = bookings.filter((b) => b.status === "completed").length
    return [
      {
        label: "Active Services",
        value: activeListings,
        icon: Store,
        variant: "services",
        helper: "Services visible to customers",
        onClick: () => { window.location.hash = variant === "independent" ? "#/independent/technician/services" : "#/provider/services" },
      },
      {
        label: "Pending Bookings",
        value: pending,
        icon: ClipboardList,
        variant: "pending",
        helper: "Awaiting your response",
        onClick: () => { window.location.hash = variant === "independent" ? "#/independent/technician/service-request" : "#/provider/service-request" },
      },
      {
        label: "In Progress",
        value: inPipeline,
        icon: PlayCircle,
        variant: "active",
        helper: "Confirmed or working jobs",
        onClick: () => { window.location.hash = variant === "independent" ? "#/independent/technician/service-request" : "#/provider/service-request" },
      },
      {
        label: "Completed Jobs",
        value: completed,
        icon: CheckCircle,
        variant: "completed",
        helper: "Finished bookings",
        onClick: () => { window.location.hash = variant === "independent" ? "#/independent/technician/service-request" : "#/provider/service-request" },
      },
    ]
  }, [bookings, services, variant])

  const statusPieRows = useMemo(() => {
    const pending = bookings.filter((b) => b.status === "pending").length
    const confirmed = bookings.filter((b) => b.status === "confirmed").length
    const working = bookings.filter((b) => b.status === "working").length
    const completed = bookings.filter((b) => b.status === "completed").length
    const cancelled = bookings.filter((b) => b.status === "cancelled").length
    return [
      { key: "pending", name: "Pending", value: pending, fill: "url(#gradShopPiePending)" },
      { key: "confirmed", name: "Confirmed", value: confirmed, fill: "url(#gradShopPieConfirmed)" },
      { key: "working", name: "Working", value: working, fill: "url(#gradShopPieWorking)" },
      { key: "completed", name: "Completed", value: completed, fill: "url(#gradShopPieCompleted)" },
      { key: "cancelled", name: "Cancelled", value: cancelled, fill: "url(#gradShopPieCancelled)" },
    ]
  }, [bookings])

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
      .map((o) => {
        const sp = o.serviceFee || o.shopService?.startingPrice
        const hasPrice = sp != null && Number(sp) > 0
        return {
          raw: o,
          rowKey: o.id || o._id,
          id: o.ref || `BK-${String(o.id || o._id || "").slice(-8).toUpperCase()}`,
          buyer: o.contactName || o.customer?.fullName || "Customer",
          serviceName: o.shopService?.name || "Service Repair",
          amount: hasPrice ? currencyPhilippinePeso(sp) : "—",
          status: normalizeStatus(o?.status) || "pending",
          when: o?.updatedAt ? timeAgo(o.updatedAt) : o?.createdAt ? timeAgo(o.createdAt) : "Recently",
        }
      })
  }, [bookings])

  const quickActions = useMemo(
    () =>
      variant === "independent"
        ? [
          {
            label: "Service Requests",
            desc: "Review and update booking status",
            icon: ClipboardList,
            tone: "blue",
            href: "#/independent/technician/service-request",
          },
          {
            label: "Services Catalog",
            desc: "Manage your listings and availability",
            icon: Store,
            tone: "emerald",
            href: "#/independent/technician/services",
          },
          {
            label: "Business Info",
            desc: "Business profile and service area",
            icon: Building2,
            tone: "purple",
            href: "#/independent/technician/business-info",
          },
          {
            label: "Customer Messages",
            desc: "Chat with customers & send updates",
            icon: MessageSquare,
            tone: "orange",
            href: "#/independent/technician/messages",
          },
        ]
        : [
          {
            label: "Service Requests",
            desc: "Review and update booking status",
            icon: ClipboardList,
            tone: "blue",
            href: "#/provider/service-request",
          },
          {
            label: "Services Catalog",
            desc: "Manage listings, prices, and staff",
            icon: Store,
            tone: "emerald",
            href: "#/provider/services",
          },
          {
            label: "Shop Info",
            desc: "Business profile and contact details",
            icon: Building2,
            tone: "purple",
            href: "#/provider/shop-info",
          },
          {
            label: "Customer Messages",
            desc: "Chat with customers & send updates",
            icon: MessageSquare,
            tone: "orange",
            href: "#/provider/messages",
          },
        ],
    [variant]
  )

  const serviceRequestHref =
    variant === "independent" ? "#/independent/technician/service-request" : "#/provider/service-request"

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Spinner className="size-8 text-[#081F5C]" />
        <p className="mt-3 text-sm font-medium text-slate-600">
          Loading {variant === "independent" ? "Technician" : "Shop"} Dashboard...
        </p>
      </div>
    )
  }

  return (
    <main className="w-full min-w-0 max-w-full space-y-3 sm:space-y-4 overflow-x-hidden">
      {/* Load Error Banner */}
      {loadError ? (
        <div className="rounded-sm border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
          {loadError}
        </div>
      ) : null}

      {/* Inactive Listings Warning Banner */}
      {inactiveListings > 0 ? (
        <div className="rounded-sm border border-amber-300 bg-amber-50 p-3 sm:px-4 sm:py-3 text-xs font-medium text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600 shrink-0" />
            <span>
              You have <strong>{inactiveListings}</strong> inactive service listing{inactiveListings === 1 ? "" : "s"}. Activate them in Services so customers can book.
            </span>
          </div>
          <a
            href={variant === "independent" ? "#/independent/technician/services" : "#/provider/services"}
            className="shrink-0 font-bold underline hover:text-amber-950 self-start sm:self-auto"
          >
            Manage Services
          </a>
        </div>
      ) : null}

      {/* 4 Compact Modern Stat Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {kpis.map(({ label, value, icon, variant: cardVar, helper, onClick }) => (
          <StatGradientCard
            key={label}
            label={label}
            value={value}
            icon={icon}
            variant={cardVar}
            helper={helper}
            onClick={onClick}
          />
        ))}
      </div>

      {/* Charts Section */}
      <section className="grid gap-4 lg:grid-cols-3">
        {/* Bookings Over Time Chart */}
        <div className="rounded-none bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/45 backdrop-blur-sm lg:col-span-2 flex flex-col justify-between">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {variant === "independent" ? "Bookings Over Time" : "New Bookings Received"}
              </p>
              <p className="text-xs text-slate-500">Volume trend of incoming customer service requests</p>
            </div>
            <div className="relative w-full shrink-0 sm:w-[160px]">
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
              id={`bookings-chart-${variant}`}
              config={{ series: { label: "Bookings", color: "#1447a6" } }}
              className="aspect-auto h-[190px] sm:h-[250px] w-full [&_.recharts-responsive-container]:!h-full"
            >
              <AreaChart data={chartSeries} margin={{ top: 12, right: 12, left: -20, bottom: 4 }}>
                <defs>
                  <linearGradient id="fillShopBookings" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#fillShopBookings)"
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "#ffffff", fill: "#1447a6" }}
                />
              </AreaChart>
            </ChartContainer>
          </div>

          {/* Summary Metric Bar */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2 text-[11px] sm:text-xs pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-none bg-slate-50 px-2 sm:px-2.5 py-1.5 ring-1 ring-slate-200/50 min-w-0">
              <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
              <span className="text-slate-500 truncate">Total in Period:</span>
              <span className="font-bold text-slate-900 tabular-nums ml-auto">
                {chartSeries.reduce((acc, curr) => acc + curr.value, 0)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-none bg-slate-50 px-2 sm:px-2.5 py-1.5 ring-1 ring-slate-200/50 min-w-0">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-slate-500 truncate">Peak Volume:</span>
              <span className="font-bold text-slate-900 tabular-nums ml-auto">
                {Math.max(0, ...chartSeries.map((s) => s.value))}
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-none bg-slate-50 px-2 sm:px-2.5 py-1.5 ring-1 ring-slate-200/50 min-w-0">
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
            <p className="text-xs text-slate-500">Distribution across active service workflow</p>
          </div>

          <div className="relative mx-auto h-[210px] w-full max-w-[260px] flex items-center justify-center">
            <PieChart width={220} height={210}>
              <defs>
                <linearGradient id="gradShopPiePending" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
                <linearGradient id="gradShopPieConfirmed" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" />
                  <stop offset="100%" stopColor="#0369a1" />
                </linearGradient>
                <linearGradient id="gradShopPieWorking" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#5b21b6" />
                </linearGradient>
                <linearGradient id="gradShopPieCompleted" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <linearGradient id="gradShopPieCancelled" x1="0" y1="0" x2="1" y2="1">
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

          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
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
        {/* Recent Customer Bookings List */}
        <div className="rounded-none bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/45 backdrop-blur-sm lg:col-span-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Recent Customer Bookings</p>
              <p className="text-xs text-slate-500">Latest service requests submitted by customers</p>
            </div>
            <a
              href={serviceRequestHref}
              className="inline-flex items-center gap-1 rounded-none border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
            >
              View all <ChevronRight className="size-3.5" />
            </a>
          </div>

          <div className="space-y-2">
            {!loading && recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No bookings yet. When customers book your active services, they will appear here.
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
                  onClick={() => setSelectedBooking(o.raw)}
                  className="group flex flex-col rounded-none bg-gradient-to-r from-white via-slate-50/50 to-blue-50/30 p-2.5 sm:p-3 border border-slate-200/60 shadow-xs transition-all hover:border-[#1447a6]/40 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between cursor-pointer"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900 text-xs sm:text-sm line-clamp-1 group-hover:text-[#1447a6] transition-colors">
                        {o.id} • {o.buyer}
                      </span>
                      <span className={cn("inline-flex items-center rounded-none border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", badgeClass)}>
                        {o.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate font-medium">
                      {o.serviceName}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 sm:mt-0 sm:flex-row sm:items-center sm:gap-3.5 sm:pt-0 sm:border-0">
                    <div className="text-left sm:text-right">
                      <div className="text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                        {o.amount}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {o.when}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedBooking(o.raw)
                      }}
                      className="h-7 px-2.5 text-xs font-semibold text-slate-700 hover:text-[#081F5C] hover:bg-slate-100 shrink-0"
                    >
                      <Eye className="size-3.5 mr-1 text-slate-500" />
                      View
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Navigation Links */}
        <div className="rounded-none bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/45 backdrop-blur-sm lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-900 mb-0.5">Quick Navigation</h3>
          <p className="text-xs text-slate-500 mb-3">Shortcuts to primary shop owner management sections.</p>
          <div className="space-y-2">
            {quickActions.map(({ label, desc, icon: QaIcon, tone, href }) => (
              <a
                key={label}
                href={href}
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
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Modern E-Paayos Navy Blue Footer Banner */}
      <footer className="mt-6 relative overflow-hidden rounded-none bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#0b2b73] p-5 sm:p-8 text-slate-200 border border-[#1447a6]/40 shadow-2xl">
        {/* Ambient Lighting Mesh Glow */}
        <div className="pointer-events-none absolute -top-16 -right-16 size-64 bg-[#1447a6]/25 blur-3xl rounded-full" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 size-64 bg-[#081F5C]/40 blur-3xl rounded-full" />
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#081F5C] via-[#1447a6] to-sky-400" />

        <div className="relative z-10 grid gap-6 md:grid-cols-12 md:items-center">
          {/* Left Column: Brand & System Status */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#081F5C] to-[#1447a6] text-white shadow-md shadow-blue-900/40 border border-white/10">
                <LayoutDashboard className="size-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  {variant === "independent" ? "E-Paayos Technician Operations" : "E-Paayos Shop Management"}
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#1447a6]/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-none">
                    v2.4 Pro
                  </span>
                </h3>
                <p className="text-xs text-blue-200/80">
                  {variant === "independent"
                    ? "Official On-call Technician Operations Portal"
                    : "Official Service Provider Portal & Operations Center"}
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

          {/* Middle Column: Quick Admin Links */}
          <div className="md:col-span-4 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-blue-100">
            <a href={variant === "independent" ? "#/independent/technician/services" : "#/provider/services"} className="hover:text-white transition-colors flex items-center gap-1">
              <Plus className="size-3.5 text-sky-400" /> Add Service
            </a>
            <a href={variant === "independent" ? "#/independent/technician/service-request" : "#/provider/service-request"} className="hover:text-white transition-colors flex items-center gap-1">
              <ShoppingBag className="size-3.5 text-blue-400" /> Bookings
            </a>
            <a href={variant === "independent" ? "#/independent/technician/messages" : "#/provider/messages"} className="hover:text-white transition-colors flex items-center gap-1">
              <MessageSquare className="size-3.5 text-indigo-300" /> Messages
            </a>
          </div>

          {/* Right Column: Copyright & Info */}
          <div className="md:col-span-3 text-left md:text-right space-y-1">
            <p className="text-xs font-semibold text-white">
              © {new Date().getFullYear()} E-Paayos Portal.
            </p>
            <p className="text-[11px] text-blue-200/70 leading-tight">
              Connecting Local Technicians & Quality Repairs
            </p>
          </div>
        </div>
      </footer>

      {/* Modernized Booking Details Modal */}
      <Dialog open={Boolean(selectedBooking)} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent
          className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden p-0 border border-slate-200 bg-white shadow-2xl rounded-none flex flex-col duration-200 focus:outline-none"
        >
          {selectedBooking ? (
            <>
              {/* Compact Modern Header */}
              <DialogHeader className="bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] text-white px-4 py-3 sm:px-5 sm:py-3.5 space-y-1 shrink-0 text-left">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex size-7 sm:size-8 items-center justify-center rounded-none bg-white/10 text-white border border-white/20 shrink-0">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <DialogTitle className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                        Booking Details
                      </DialogTitle>
                      <DialogDescription className="text-white/70 text-[11px] font-normal leading-tight">
                        Complete overview of customer service request
                      </DialogDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border shadow-xs", bookingStatusBadgeClass(selectedBooking?.status))}>
                      {selectedBooking?.status || "pending"}
                    </Badge>
                  </div>
                </div>
              </DialogHeader>

              {/* Ref and Meta Sub-header */}
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 sm:px-5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ref:</span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 border border-slate-200">
                    {selectedBooking?.ref || (selectedBooking?.id ? `BK-${String(selectedBooking.id).slice(-8).toUpperCase()}` : "BK-N/A")}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyRef(selectedBooking?.ref || `BK-${String(selectedBooking?.id || selectedBooking?._id || "").slice(-8).toUpperCase()}`)}
                    className="h-6 px-1.5 text-[11px] text-slate-600 hover:text-slate-900"
                  >
                    {copiedRef ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                    <span className="ml-1 text-[10px]">{copiedRef ? "Copied" : "Copy"}</span>
                  </Button>
                </div>
                <div className="text-[11px] text-slate-500">
                  Created: <span className="font-medium text-slate-700">{formatDateTime(selectedBooking?.createdAt)}</span>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs text-left">
                {/* 1. Service Details Highlight Card */}
                <div className="border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Store className="size-4 text-[#1447a6]" />
                      <span className="text-sm font-bold text-slate-900">
                        {selectedBooking.shopService?.name || "Service Repair"}
                      </span>
                    </div>
                    {selectedBooking.shopService?.category ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-200 text-slate-700 px-2 py-0.5">
                        {selectedBooking.shopService.category}
                      </span>
                    ) : null}
                  </div>
                  {selectedBooking.shopService?.startingPrice != null ? (
                    <div className="text-xs text-slate-600">
                      Starting Rate: <span className="font-bold text-slate-900">{currencyPhilippinePeso(selectedBooking.shopService.startingPrice)}</span>
                    </div>
                  ) : null}
                </div>

                {/* 2. Customer & Schedule Information Cards (2 Columns) */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Customer Contact Card */}
                  <div className="border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200">
                      <User className="size-3.5 text-[#1447a6] shrink-0" />
                      <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-800">
                        Customer Details
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <div className="font-bold text-slate-900 text-xs">
                        {selectedBooking.contactName || selectedBooking.customer?.fullName || "Unnamed Customer"}
                      </div>

                      {selectedBooking.contactPhone || selectedBooking.customer?.phone ? (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Phone className="size-3 text-slate-400 shrink-0" />
                          <a
                            href={`tel:${selectedBooking.contactPhone || selectedBooking.customer?.phone}`}
                            className="hover:text-[#1447a6] hover:underline font-medium"
                          >
                            {selectedBooking.contactPhone || selectedBooking.customer?.phone}
                          </a>
                        </div>
                      ) : null}

                      {selectedBooking.customer?.email ? (
                        <div className="flex items-center gap-1.5 text-slate-600 truncate">
                          <Mail className="size-3 text-slate-400 shrink-0" />
                          <a href={`mailto:${selectedBooking.customer.email}`} className="hover:text-[#1447a6] hover:underline truncate">
                            {selectedBooking.customer.email}
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Schedule & Mode Card */}
                  <div className="border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
                    <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200">
                      <Calendar className="size-3.5 text-[#1447a6] shrink-0" />
                      <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-800">
                        Schedule &amp; Mode
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Preferred Date:</span>
                        <span className="font-bold text-slate-900">
                          {formatPreferredDate(selectedBooking.preferredDate)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Preferred Time:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedBooking.preferredTime || "Shop hours"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Service Mode:</span>
                        <span className="font-bold capitalize text-slate-800">
                          {selectedBooking.serviceMode === "home" ? "Home Service" : "In-Shop Service"}
                        </span>
                      </div>
                    </div>

                    {selectedBooking.serviceMode === "home" && selectedBooking.serviceAddress ? (
                      <div className="pt-1 border-t border-slate-200/80">
                        <div className="flex items-start gap-1.5 text-[11px] text-slate-700">
                          <MapPin className="size-3 text-rose-500 shrink-0 mt-0.5" />
                          <span className="leading-snug">{selectedBooking.serviceAddress}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* 3. Problem Description & Notes */}
                <div className="border border-slate-200 bg-white p-3.5 space-y-3">
                  <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200">
                    <ClipboardList className="size-3.5 text-[#1447a6] shrink-0" />
                    <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-800">
                      Problem Description &amp; Notes
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Customer Problem Description:
                    </span>
                    <div className="bg-slate-50 border-l-2 border-[#1447a6] p-3 text-xs text-slate-800 whitespace-pre-wrap font-normal leading-relaxed">
                      {selectedBooking.problemDescription || "No description provided."}
                    </div>
                  </div>

                  {selectedBooking.notes ? (
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Additional Notes:
                      </span>
                      <div className="bg-amber-50/60 border border-amber-200/70 p-2.5 text-xs text-amber-900 whitespace-pre-wrap leading-relaxed">
                        {selectedBooking.notes}
                      </div>
                    </div>
                  ) : null}

                  {selectedBooking.status === "cancelled" && selectedBooking.rejectionReason ? (
                    <div className="bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2">
                      <AlertTriangle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">Cancellation / Rejection Reason:</span>
                        <p className="mt-0.5">{selectedBooking.rejectionReason}</p>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* 4. Billing Breakdown */}
                {(selectedBooking.serviceFeeLaborRateAtCalc != null ||
                  selectedBooking.serviceFeeMaterialsAmount != null ||
                  selectedBooking.serviceFeeReplacementParts?.length > 0 ||
                  selectedBooking.serviceFee != null ||
                  selectedBooking.paymentMethod ||
                  selectedBooking.paidAt) ? (
                  <div className="border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="size-3.5 text-[#1447a6] shrink-0" />
                        <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-800">
                          Billing &amp; Cost Breakdown
                        </span>
                      </div>
                      <Badge className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border", paymentBadgeClass(selectedBooking.paymentStatus))}>
                        {selectedBooking.paymentStatus || "unpaid"}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      {selectedBooking.serviceFeeLaborRateAtCalc != null ? (
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-600 font-medium">Labor Service Fee:</span>
                          <span className="font-bold text-slate-900">
                            {currencyPhilippinePeso(selectedBooking.serviceFeeLaborRateAtCalc)}
                          </span>
                        </div>
                      ) : selectedBooking.serviceFee != null ? (
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-600 font-medium">Agreed Service Fee:</span>
                          <span className="font-bold text-slate-900">
                            {currencyPhilippinePeso(selectedBooking.serviceFee)}
                          </span>
                        </div>
                      ) : null}

                      {Array.isArray(selectedBooking.serviceFeeReplacementParts) && selectedBooking.serviceFeeReplacementParts.length > 0 ? (
                        <div className="space-y-1 pt-1">
                          <span className="text-[11px] font-bold text-slate-600 block">
                            Replacement Parts &amp; Materials:
                          </span>
                          <div className="border border-slate-200 bg-white divide-y divide-slate-100 text-[11px]">
                            {selectedBooking.serviceFeeReplacementParts.map((part, pIdx) => {
                              const partPrice = Number(part?.price ?? part?.unitPrice) || 0
                              const partQty = Number(part?.quantity ?? part?.qty) || 1
                              return (
                                <div key={pIdx} className="flex justify-between p-2">
                                  <span className="text-slate-700">
                                    {part?.name || part?.description || `Part #${pIdx + 1}`}
                                    {partQty > 1 ? ` × ${partQty}` : ""}
                                  </span>
                                  <span className="font-semibold text-slate-900">
                                    {currencyPhilippinePeso(partPrice * partQty)}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : selectedBooking.serviceFeeMaterialsAmount != null ? (
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-600 font-medium">
                            Materials {selectedBooking.serviceFeeMaterialsDescription ? `(${selectedBooking.serviceFeeMaterialsDescription})` : ""}:
                          </span>
                          <span className="font-bold text-slate-900">
                            {currencyPhilippinePeso(selectedBooking.serviceFeeMaterialsAmount)}
                          </span>
                        </div>
                      ) : null}

                      {/* Total Amount */}
                      <div className="flex justify-between pt-2 border-t-2 border-slate-300 text-sm">
                        <span className="font-extrabold text-slate-900">Total Amount:</span>
                        <span className="font-black text-emerald-600 text-base">
                          {currencyPhilippinePeso(
                            (Number(selectedBooking.serviceFeeLaborRateAtCalc ?? selectedBooking.serviceFee) || 0) +
                              (Number(selectedBooking.serviceFeeMaterialsAmount) || 0)
                          )}
                        </span>
                      </div>

                      {/* Payment Meta */}
                      <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-500 border-t border-slate-200/60">
                        <div>
                          <span>Payment Method:</span>{" "}
                          <span className="font-semibold text-slate-800 uppercase">
                            {selectedBooking.paymentMethod || "—"}
                          </span>
                        </div>
                        {selectedBooking.paidAt ? (
                          <div className="text-right">
                            <span>Paid On:</span>{" "}
                            <span className="font-medium text-slate-800">
                              {formatDateTime(selectedBooking.paidAt)}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* 5. Customer Review & Rating */}
                {selectedBooking.customerReviewRating ? (
                  <div className="border border-amber-200 bg-amber-50/50 p-3.5 space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-amber-200/80">
                      <div className="flex items-center gap-1.5">
                        <Star className="size-3.5 text-amber-500 fill-amber-500" />
                        <span className="font-extrabold uppercase tracking-wider text-[11px] text-amber-900">
                          Customer Review &amp; Rating
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 text-amber-600 font-bold text-xs">
                        <span>{selectedBooking.customerReviewRating} / 5</span>
                      </div>
                    </div>
                    {selectedBooking.customerReviewComment ? (
                      <p className="text-xs text-amber-900 italic bg-white/70 p-2.5 border border-amber-200/60">
                        "{selectedBooking.customerReviewComment}"
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* Compact Footer */}
              <DialogFooter className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 sm:px-5 flex flex-row items-center justify-between gap-2 shrink-0">
                <a
                  href={serviceRequestHref}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#1447a6] hover:underline"
                >
                  Manage in Service Requests <ExternalLink className="size-3" />
                </a>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedBooking(null)}
                  className="h-8 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  )
}

function ShopOwnerMobileNav() {
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

function ShopOwnerDashboard({ activeSection = "dashboard", pageMeta = DASHBOARD_META, children }) {
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(shopOwnerSidebarOpenState)
  const [profileOpen, setProfileOpen] = useState(false)
  const [shopEventUnread, setShopEventUnread] = useState(null)
  const profileMenuRef = useRef(null)
  const [employeesOpen, setEmployeesOpen] = useState(["manage-employee", "track-employee"].includes(activeSection))
  const [serviceManagementOpen, setServiceManagementOpen] = useState(
    ["service-request", "appointments-schedule", "service-history"].includes(activeSection)
  )

  useEffect(() => {
    const raw = localStorage.getItem("user")
    const token = localStorage.getItem("token")
    if (!token || !raw) {
      window.location.hash = "#/login"
      return
    }
    try {
      const parsed = JSON.parse(raw)
      if (parsed.role === "oncall-mechanic-technician") {
        window.location.hash = "#/independent/technician/dashboard"
        return
      }
      if (parsed.role !== "shop-owner") {
        window.location.hash = "#/login"
        return
      }
      setUser(parsed)
    } catch {
      window.location.hash = "#/login"
    }
  }, [])

  const isDashboardActive = activeSection === "dashboard"
  const isServicesActive = activeSection === "services"
  const isShopInfoActive = activeSection === "shop-info"
  const isMessagesActive = activeSection === "messages"
  const isNotificationActive = activeSection === "notification"
  const isAccountSettingsActive = activeSection === "account-settings"
  const isReviewsRatingsActive = activeSection === "reviews-ratings"
  const isReportsAnalyticsActive = activeSection === "reports-analytics"
  const isManageEmployeeActive = activeSection === "manage-employee"
  const isTrackEmployeeActive = activeSection === "track-employee"
  const isEmployeesGroupActive = isManageEmployeeActive || isTrackEmployeeActive
  const isServiceRequestActive = activeSection === "service-request"
  const isServiceHistoryActive = activeSection === "service-history"
  const isServiceManagementGroupActive =
    isServiceRequestActive || isServiceHistoryActive

  useEffect(() => {
    if (isEmployeesGroupActive) {
      setEmployeesOpen(true)
    }
  }, [isEmployeesGroupActive])

  useEffect(() => {
    if (isServiceManagementGroupActive) {
      setServiceManagementOpen(true)
    }
  }, [isServiceManagementGroupActive])

  useEffect(() => {
    shopOwnerSidebarOpenState = sidebarOpen
  }, [sidebarOpen])

  useEffect(() => {
    setProfileOpen(false)
  }, [activeSection])

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

  const onNotifSection = activeSection === "notification"
  const { unreadCount: shopNotifUnread } = useNotificationUnreadCount({
    user,
    readScope: "shop_owner",
    bookingsUrl: `${API_URL}/api/shop/bookings`,
    routes: PROVIDER_NOTIF_ROUTES,
    variant: "shopOwner",
    enabled: Boolean(user) && !onNotifSection,
  })

  useEffect(() => {
    const fn = (e) => {
      if (e.detail?.readScope === "shop_owner") setShopEventUnread(e.detail.count)
    }
    window.addEventListener(EPAAYOS_UNREAD_EVENT, fn)
    return () => window.removeEventListener(EPAAYOS_UNREAD_EVENT, fn)
  }, [])

  const shopHeaderUnread = onNotifSection ? (shopEventUnread ?? shopNotifUnread) : shopNotifUnread

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    window.location.hash = "#/"
  }

  const { requestLogout, LogoutDialog } = useLogoutConfirmation(handleLogout)

  if (!user) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div
      className="h-svh max-h-svh min-h-0 w-full overflow-hidden"
      style={{ backgroundImage: pageBaseNavyGradient }}
    >
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
                        isActive={isDashboardActive}
                        tooltip="Dashboard"
                        onClick={() => { window.location.hash = "#/provider/dashboard" }}
                        className="h-9 gap-3 rounded-sm px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap"
                      >
                        <LayoutDashboard className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Dashboard</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isServicesActive}
                        tooltip="Services"
                        onClick={() => { window.location.hash = "#/provider/services" }}
                        className="h-9 gap-3 rounded-sm px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap"
                      >
                        <Store className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Services</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isShopInfoActive}
                        tooltip="Shop Info"
                        onClick={() => { window.location.hash = "#/provider/shop-info" }}
                        className="h-9 gap-3 rounded-sm px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap"
                      >
                        <Building2 className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Shop Info</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isEmployeesGroupActive}
                        tooltip="Employees"
                        onClick={() => setEmployeesOpen((prev) => !prev)}
                        className="h-9 gap-3 rounded-sm px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap"
                      >
                        <Users className="size-[18px] opacity-90" />
                        <span className="flex-1 whitespace-nowrap">Employees</span>
                        {employeesOpen ? (
                          <ChevronDown className="size-4 opacity-90" />
                        ) : (
                          <ChevronRight className="size-4 opacity-90" />
                        )}
                      </SidebarMenuButton>
                      {employeesOpen && (
                        <SidebarMenuSub className="ml-10 gap-2.5 overflow-visible border-white/25">
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild={false}
                              isActive={isManageEmployeeActive}
                              onClick={() => { window.location.hash = "#/provider/manage-employee" }}
                              className="min-w-max cursor-pointer overflow-visible pr-3 text-white hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black [&>svg]:text-current [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap"
                            >
                              <span>Manage Employee</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild={false}
                              isActive={isTrackEmployeeActive}
                              onClick={() => { window.location.hash = "#/provider/track-employee" }}
                              className="min-w-max cursor-pointer overflow-visible pr-3 text-white hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black [&>svg]:text-current [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap"
                            >
                              <span>Track Employee</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isServiceManagementGroupActive}
                        tooltip="Service Management"
                        onClick={() => setServiceManagementOpen((prev) => !prev)}
                        className="h-9 gap-3 rounded-sm px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap"
                      >
                        <Wrench className="size-[18px] opacity-90" />
                        <span className="flex-1 whitespace-nowrap">Service Management</span>
                        {serviceManagementOpen ? (
                          <ChevronDown className="size-4 opacity-90" />
                        ) : (
                          <ChevronRight className="size-4 opacity-90" />
                        )}
                      </SidebarMenuButton>
                      {serviceManagementOpen && (
                        <SidebarMenuSub className="ml-10 gap-2.5 overflow-visible border-white/25">
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild={false}
                              isActive={isServiceRequestActive}
                              onClick={() => { window.location.hash = "#/provider/service-request" }}
                              className="min-w-max cursor-pointer overflow-visible pr-3 text-white hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black [&>svg]:text-current [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap"
                            >
                              <span>Service Request</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild={false}
                              isActive={isServiceHistoryActive}
                              onClick={() => { window.location.hash = "#/provider/service-history" }}
                              className="min-w-max cursor-pointer overflow-visible pr-3 text-white hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black [&>svg]:text-current [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap"
                            >
                              <span>Service History</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isMessagesActive}
                        tooltip="Messages"
                        onClick={() => { window.location.hash = "#/provider/messages" }}
                        className="h-9 gap-3 rounded-sm px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap"
                      >
                        <MessageSquare className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Messages</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isReviewsRatingsActive}
                        tooltip="Reviews & Ratings"
                        onClick={() => { window.location.hash = "#/provider/reviews-ratings" }}
                        className="h-9 gap-3 rounded-sm px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap"
                      >
                        <Star className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Reviews & Ratings</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isReportsAnalyticsActive}
                        tooltip="Reports & Analytics"
                        onClick={() => { window.location.hash = "#/provider/reports-analytics" }}
                        className="h-9 gap-3 rounded-sm px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap"
                      >
                        <BarChart3 className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Reports & Analytics</span>
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
                  {(user.fullName || user.email || "S").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-[11px] font-normal uppercase tracking-wide text-white/80">Shop Owner</p>
                  <p className="truncate text-[11px] text-white/75">{user.email}</p>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-linear-to-br from-blue-50 via-violet-100 to-indigo-100 dark:from-slate-900 dark:via-violet-950/40 dark:to-indigo-950/50">
            <header className="sticky top-0 z-40 flex h-14 sm:h-16 shrink-0 flex-none items-center justify-between gap-2 sm:gap-4 border-b border-border/60 bg-white/95 px-3 sm:px-4 md:px-6 shadow-xs backdrop-blur-md dark:bg-background/95">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
                <ShopOwnerMobileNav />
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-sm sm:text-base md:text-lg font-black tracking-tight text-foreground leading-tight">
                    {pageMeta.title}
                  </h1>
                  <p className="hidden truncate text-xs text-muted-foreground md:block font-medium">{pageMeta.description}</p>
                </div>
              </div>
              <div className="relative flex shrink-0 items-center gap-1 sm:gap-2.5">
                <button
                  type="button"
                  aria-label="Notification center"
                  onClick={() => { window.location.hash = "#/provider/notification" }}
                  className={`relative flex size-9 sm:size-10 items-center justify-center rounded-sm transition-colors cursor-pointer ${isNotificationActive
                    ? "bg-blue-50 text-blue-700 dark:bg-white/10 dark:text-blue-300"
                    : "bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                >
                  <NotificationBellIndicator unreadCount={shopHeaderUnread}>
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
                    <span className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-bold leading-none text-white shadow-xs">
                      {(user.fullName || user.email || "S").charAt(0).toUpperCase()}
                    </span>
                    <span className="hidden lg:inline-block max-w-[110px] truncate text-xs font-bold uppercase tracking-wider">
                      {user.fullName ? user.fullName.split(' ')[0] : 'Shop'}
                    </span>
                    <ChevronDown className={`size-3.5 text-muted-foreground transition-transform duration-200 ${profileOpen ? 'rotate-180 text-foreground' : ''}`} />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-md border border-slate-200 dark:border-border/80 bg-white dark:bg-slate-900 shadow-2xl z-50 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-sm font-extrabold text-white shadow-xs">
                          {(user.fullName || user.email || "S").charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-foreground">
                            {user.fullName || 'Shop Owner'}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">{user.email || ''}</p>
                          <span className="inline-flex items-center gap-1 mt-1 rounded-sm border border-[#081F5C]/20 bg-[#081F5C]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#081F5C] dark:text-blue-300">
                            Shop Owner
                          </span>
                        </div>
                      </div>
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false)
                            window.location.hash = "#/provider/account-settings"
                          }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-accent transition-colors cursor-pointer"
                        >
                          <Settings className="size-4 text-muted-foreground" />
                          <span>Account Settings</span>
                        </button>
                      </div>
                      <div className="p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false)
                            requestLogout()
                          }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
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
              id="shopowner-main-scroll"
              className={
                isMessagesActive
                  ? "scrollbar-hidden flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden overflow-x-hidden px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-2 md:px-6 md:pb-6 md:pt-3"
                  : "scrollbar-hidden flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:py-4 sm:px-4 md:py-6 md:px-6"
              }
            >
              {children != null ? children : activeSection === "dashboard" ? <ShopOwnerDashboardHome variant="shop" /> : null}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
      {LogoutDialog}
    </div>
  )
}

export default ShopOwnerDashboard
