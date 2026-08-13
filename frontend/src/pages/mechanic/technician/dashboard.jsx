import { useEffect, useMemo, useRef, useState } from "react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
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
  SidebarProvider,
  SidebarSeparator,
  useSidebar,
} from "../../../components/ui/sidebar"
import { TooltipProvider } from "../../../components/ui/tooltip"
import {
  Bell,
  Briefcase,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PlayCircle,
  Settings,
  Star,
  Truck,
  Wrench,
} from "lucide-react"
import Elogo from "../../../assets/Elogo.png"
import { useLogoutConfirmation } from "@/hooks/useLogoutConfirmation.jsx"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

const navyDeep = "#04133d"
const navy = "#081F5C"
const navyMuted = "#0b2b73"
const navyBright = "#1447a6"
const pageBaseNavyGradient = `linear-gradient(145deg, ${navyDeep} 0%, ${navy} 35%, ${navyMuted} 65%, ${navyBright} 100%)`

const DASHBOARD_META = { title: "Dashboard", description: "Overview of your mechanic workspace." }
let mechanicTechnicianSidebarOpenState = false

const sidebarMenuButtonClass =
  "h-9 gap-3 rounded-sm px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap"

const API_URL = import.meta?.env?.VITE_API_URL || "http://localhost:5000"

function authHeaders() {
  const token = localStorage.getItem("token")
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function isSameLocalCalendarDay(a, b) {
  const da = a instanceof Date ? a : new Date(a)
  const db = b instanceof Date ? b : new Date(b)
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
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

const STAT_CARD_GRADIENT = {
  pending: "from-amber-600 via-orange-700 to-slate-950 border-amber-400/30",
  confirmed: "from-blue-600 via-indigo-700 to-slate-950 border-blue-400/30",
  working: "from-purple-600 via-violet-700 to-slate-950 border-purple-400/30",
  today: "from-sky-600 via-cyan-700 to-slate-950 border-cyan-400/30",
  completed: "from-emerald-600 via-teal-700 to-slate-950 border-emerald-400/30",
}

function StatGradientCard({ label, value, icon: Icon, variant, helper, onClick }) {
  const gradient = STAT_CARD_GRADIENT[variant] ?? STAT_CARD_GRADIENT.confirmed
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

function MechanicMobileNav() {
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

function MechanicTechnicianDashboard() {
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(mechanicTechnicianSidebarOpenState)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileMenuRef = useRef(null)
  const [range, setRange] = useState("thisWeek")
  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsError, setBookingsError] = useState("")

  const kpis = useMemo(() => {
    const today = new Date()
    const pending = bookings.filter((b) => b.status === "pending").length
    const confirmed = bookings.filter((b) => b.status === "confirmed").length
    const working = bookings.filter((b) => b.status === "working").length
    const dueToday = bookings.filter((b) => {
      if (b.status === "cancelled") return false
      return b.preferredDate && isSameLocalCalendarDay(b.preferredDate, today)
    }).length
    const completed = bookings.filter((b) => b.status === "completed").length
    return [
      {
        label: "Pending Requests",
        value: pending,
        icon: ClipboardList,
        variant: "pending",
        helper: "Waiting for shop action",
        onClick: () => { window.location.hash = "#/mechanic/technician/assigned-request" },
      },
      {
        label: "Confirmed Jobs",
        value: confirmed,
        icon: Wrench,
        variant: "confirmed",
        helper: "Accepted, not started",
        onClick: () => { window.location.hash = "#/mechanic/technician/assigned-request" },
      },
      {
        label: "In Progress",
        value: working,
        icon: PlayCircle,
        variant: "working",
        helper: "Shop marked in progress",
        onClick: () => { window.location.hash = "#/mechanic/technician/assigned-request" },
      },
      {
        label: "Due Today",
        value: dueToday,
        icon: Truck,
        variant: "today",
        helper: "Preferred date today",
        onClick: () => { window.location.hash = "#/mechanic/technician/assigned-request" },
      },
      {
        label: "Completed Jobs",
        value: completed,
        icon: CheckCircle,
        variant: "completed",
        helper: "Finished bookings",
        onClick: () => { window.location.hash = "#/mechanic/technician/service-history" },
      },
    ]
  }, [bookings])

  const statusPieRows = useMemo(() => {
    const pending = bookings.filter((b) => b.status === "pending").length
    const confirmed = bookings.filter((b) => b.status === "confirmed").length
    const working = bookings.filter((b) => b.status === "working").length
    const completed = bookings.filter((b) => b.status === "completed").length
    const cancelled = bookings.filter((b) => b.status === "cancelled").length
    return [
      { key: "pending", name: "Pending", value: pending, fill: "url(#gradMechPiePending)" },
      { key: "confirmed", name: "Confirmed", value: confirmed, fill: "url(#gradMechPieConfirmed)" },
      { key: "working", name: "Working", value: working, fill: "url(#gradMechPieWorking)" },
      { key: "completed", name: "Completed", value: completed, fill: "url(#gradMechPieCompleted)" },
      { key: "cancelled", name: "Cancelled", value: cancelled, fill: "url(#gradMechPieCancelled)" },
    ]
  }, [bookings])

  const statusPieTotal = useMemo(
    () => statusPieRows.reduce((sum, entry) => sum + entry.value, 0),
    [statusPieRows]
  )

  const chartSeries = useMemo(() => {
    const source = bookings.filter((b) => b.status === "completed")
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
      const t = new Date(o?.updatedAt || o?.createdAt || Date.now())
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
      const ts = o?.updatedAt || o?.createdAt || Date.now()
      const key = makeKey(ts)
      dataMap.set(key, (dataMap.get(key) || 0) + 1)
    })

    const result = []
    if (range === "today") {
      for (let i = 0; i < 24; i++) {
        const d = new Date(start)
        d.setHours(i, 0, 0, 0)
        const key = makeKey(d)
        const hourLabel = `${String(i).padStart(2, "0")}:00`
        result.push({ date: hourLabel, value: dataMap.get(key) || 0 })
      }
    } else if (range === "thisWeek" || range === "lastWeek") {
      const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      for (let i = 0; i < 7; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        const key = makeKey(d)
        result.push({ date: weekDays[d.getDay()], value: dataMap.get(key) || 0 })
      }
    } else if (range === "thisMonth" || range === "lastMonth") {
      const daysInMonth =
        range === "thisMonth"
          ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
          : new Date(now.getFullYear(), now.getMonth(), 0).getDate()
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(start)
        d.setDate(i)
        const key = makeKey(d)
        result.push({ date: `D${i}`, value: dataMap.get(key) || 0 })
      }
    } else {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      for (let i = 0; i < 12; i++) {
        const d = new Date(start)
        d.setMonth(i)
        const key = makeKey(new Date(d.getFullYear(), d.getMonth(), 1))
        result.push({ date: months[i], value: dataMap.get(key) || 0 })
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
        buyer: o.contactName || o.customerFullName || "Customer",
        serviceName: o.shopService?.name || o.serviceName || "Assigned Repair",
        amount:
          o.startingPrice != null && Number(o.startingPrice) > 0
            ? currencyPhilippinePeso(o.startingPrice)
            : "—",
        status: normalizeStatus(o?.status) || "pending",
        when: o?.updatedAt ? timeAgo(o.updatedAt) : o?.createdAt ? timeAgo(o.createdAt) : "Recently",
      }))
  }, [bookings])

  const quickActions = [
    {
      label: "Assigned Requests",
      desc: "View new booking requests",
      icon: ClipboardList,
      tone: "blue",
      href: "#/mechanic/technician/assigned-request",
    },
    {
      label: "Service History",
      desc: "Completed jobs you worked on",
      icon: History,
      tone: "emerald",
      href: "#/mechanic/technician/service-history",
    },
    {
      label: "Customer Messages",
      desc: "Chat with the customer",
      icon: MessageSquare,
      tone: "purple",
      href: "#/mechanic/technician/messages",
    },
    {
      label: "Work Info & Profile",
      desc: "Skills, schedule, and profile",
      icon: Briefcase,
      tone: "orange",
      href: "#/mechanic/technician/work-info",
    },
  ]

  useEffect(() => {
    const raw = localStorage.getItem("user")
    const token = localStorage.getItem("token")
    if (!token || !raw) {
      window.location.hash = "#/login"
      return
    }
    try {
      const parsed = JSON.parse(raw)
      if (parsed.role !== "mechanic-technician") {
        window.location.hash = "#/login"
        return
      }
      setUser(parsed)
    } catch {
      window.location.hash = "#/login"
    }
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const load = async () => {
      setBookingsLoading(true)
      setBookingsError("")
      try {
        const res = await fetch(`${API_URL}/api/mechanic/bookings`, { headers: authHeaders() })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.message || "Could not load bookings.")
        }
        const list = Array.isArray(data?.bookings) ? data.bookings : []
        if (!cancelled) setBookings(list)
      } catch (e) {
        if (!cancelled) {
          setBookings([])
          setBookingsError(e?.message || "Could not load bookings.")
        }
      } finally {
        if (!cancelled) setBookingsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    mechanicTechnicianSidebarOpenState = sidebarOpen
  }, [sidebarOpen])

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
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    )
  }

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
                        isActive
                        tooltip="Dashboard"
                        onClick={() => {
                          window.location.hash = "#/mechanic/technician/dashboard"
                        }}
                        className={sidebarMenuButtonClass}
                      >
                        <LayoutDashboard className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Dashboard</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip="Assigned Request"
                        onClick={() => {
                          window.location.hash = "#/mechanic/technician/assigned-request"
                        }}
                        className={sidebarMenuButtonClass}
                      >
                        <ClipboardList className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Assigned Request</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip="Service History"
                        onClick={() => {
                          window.location.hash = "#/mechanic/technician/service-history"
                        }}
                        className={sidebarMenuButtonClass}
                      >
                        <History className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Service History</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip="Messages"
                        onClick={() => {
                          window.location.hash = "#/mechanic/technician/messages"
                        }}
                        className={sidebarMenuButtonClass}
                      >
                        <MessageSquare className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Messages</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip="Work Info"
                        onClick={() => {
                          window.location.hash = "#/mechanic/technician/work-info"
                        }}
                        className={sidebarMenuButtonClass}
                      >
                        <Briefcase className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Work Info</span>
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
                  {(user.fullName || user.email || "M").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-[11px] font-normal uppercase tracking-wide text-white/80">Mechanic / Technician</p>
                  <p className="truncate text-[11px] text-white/75">{user.email}</p>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-linear-to-br from-blue-50 via-violet-100 to-indigo-100 dark:from-slate-900 dark:via-violet-950/40 dark:to-indigo-950/50">
            <header className="relative z-30 flex h-14 shrink-0 flex-none items-center gap-3 border-b border-border/60 bg-white/90 px-4 shadow-sm backdrop-blur-md dark:bg-background/95 md:px-6">
              <MechanicMobileNav />
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-semibold tracking-tight text-foreground md:text-xl">
                  {DASHBOARD_META.title}
                </h1>
                <p className="hidden truncate text-xs text-muted-foreground sm:block">{DASHBOARD_META.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Notification"
                  onClick={() => {
                    window.location.hash = "#/mechanic/technician/notification"
                  }}
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
                      {(user.fullName || user.email || "M").charAt(0).toUpperCase()}
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
              id="mechanic-main-scroll"
              className="scrollbar-hidden flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain py-4 pl-4 pr-1 md:py-6 md:pl-6 md:pr-2"
            >
              <div className="space-y-4 pr-2 md:pr-4">
                {bookingsError ? (
                  <div className="rounded-sm border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
                    {bookingsError}
                  </div>
                ) : null}
                {bookingsLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Spinner className="size-8 text-[#081F5C]" />
                    <p className="mt-3 text-sm font-medium text-slate-600">Loading technician workspace...</p>
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
                      {/* Completed Jobs Over Time AreaChart */}
                      <div className="rounded-none bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/45 backdrop-blur-sm lg:col-span-2 flex flex-col justify-between">
                        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Completed Jobs Over Time</p>
                            <p className="text-xs text-slate-500">Volume trend of jobs you completed</p>
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
                            id="mechanic-tech-chart"
                            config={{
                              series: {
                                label: "Jobs",
                                color: "#1447a6",
                              },
                            }}
                            className="aspect-auto h-[250px] w-full [&_.recharts-responsive-container]:!h-full"
                          >
                            <AreaChart data={chartSeries} margin={{ top: 12, right: 12, left: -20, bottom: 4 }}>
                              <defs>
                                <linearGradient id="fillMechanicJobs" x1="0" y1="0" x2="0" y2="1">
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
                                fill="url(#fillMechanicJobs)"
                                activeDot={{ r: 5, strokeWidth: 2, stroke: "#ffffff", fill: "#1447a6" }}
                              />
                            </AreaChart>
                          </ChartContainer>
                        </div>

                        {/* Summary Metric Bar */}
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-2 rounded-none bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-200/50">
                            <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                            <span className="text-slate-500 truncate">Total Completed:</span>
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
                          <p className="text-xs text-slate-500">Status overview of assigned requests</p>
                        </div>

                        <div className="relative mx-auto h-[210px] w-full max-w-[260px] flex items-center justify-center">
                          <PieChart width={220} height={210}>
                            <defs>
                              <linearGradient id="gradMechPiePending" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#f59e0b" />
                                <stop offset="100%" stopColor="#d97706" />
                              </linearGradient>
                              <linearGradient id="gradMechPieConfirmed" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#0ea5e9" />
                                <stop offset="100%" stopColor="#0369a1" />
                              </linearGradient>
                              <linearGradient id="gradMechPieWorking" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#5b21b6" />
                              </linearGradient>
                              <linearGradient id="gradMechPieCompleted" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#10b981" />
                                <stop offset="100%" stopColor="#059669" />
                              </linearGradient>
                              <linearGradient id="gradMechPieCancelled" x1="0" y1="0" x2="1" y2="1">
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
                      {/* Recent Jobs List */}
                      <div className="rounded-none bg-white/90 p-4 shadow-sm ring-1 ring-slate-200/45 backdrop-blur-sm lg:col-span-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Recent Assigned Jobs</p>
                            <p className="text-xs text-slate-500">Latest service bookings assigned to you</p>
                          </div>
                          <a
                            href="#/mechanic/technician/assigned-request"
                            className="inline-flex items-center gap-1 rounded-none border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
                          >
                            View all <ChevronRight className="size-3.5" />
                          </a>
                        </div>

                        <div className="space-y-2">
                          {!bookingsLoading && recent.length === 0 ? (
                            <p className="py-8 text-center text-sm text-slate-500">
                              No bookings yet for services you are assigned to. When a customer books a shop listing you are assigned on, it will appear here.
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
                                    {o.serviceName}
                                  </div>
                                </div>
                                <div className="mt-2 flex flex-row items-center justify-between gap-3 sm:mt-0 sm:flex-col sm:items-end sm:gap-0.5">
                                  <div className="text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                                    {o.amount}
                                  </div>
                                  <div className="text-[11px] text-slate-400">
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
                        <h3 className="text-sm font-semibold text-slate-900 mb-0.5">Quick Navigation</h3>
                        <p className="text-xs text-slate-500 mb-3">Shortcuts to your technician workspace sections.</p>
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

                    {/* E-Paayos Navy Blue Footer Banner */}
                    <footer className="mt-6 relative overflow-hidden rounded-none bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#0b2b73] p-6 sm:p-8 text-slate-200 border border-[#1447a6]/40 shadow-2xl">
                      <div className="pointer-events-none absolute -top-16 -right-16 size-64 bg-[#1447a6]/25 blur-3xl rounded-full" />
                      <div className="pointer-events-none absolute -bottom-16 -left-16 size-64 bg-[#081F5C]/40 blur-3xl rounded-full" />
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#081F5C] via-[#1447a6] to-sky-400" />

                      <div className="relative z-10 grid gap-6 md:grid-cols-12 md:items-center">
                        <div className="md:col-span-5 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-[#081F5C] to-[#1447a6] text-white shadow-md shadow-blue-900/40 border border-white/10">
                              <LayoutDashboard className="size-4" />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                                E-Paayos Technician Workspace
                                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#1447a6]/30 text-blue-200 border border-blue-400/30 px-2 py-0.5 rounded-none">
                                  v2.4 Pro
                                </span>
                              </h3>
                              <p className="text-xs text-blue-200/80">
                                Official Mechanic & Technician Operations Portal
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
                          <a href="#/mechanic/technician/assigned-request" className="hover:text-white transition-colors flex items-center gap-1">
                            <ClipboardList className="size-3.5 text-sky-400" /> Assigned Requests
                          </a>
                          <a href="#/mechanic/technician/service-history" className="hover:text-white transition-colors flex items-center gap-1">
                            <History className="size-3.5 text-blue-400" /> Service History
                          </a>
                          <a href="#/mechanic/technician/messages" className="hover:text-white transition-colors flex items-center gap-1">
                            <MessageSquare className="size-3.5 text-indigo-300" /> Messages
                          </a>
                          <a href="#/mechanic/technician/work-info" className="hover:text-white transition-colors flex items-center gap-1">
                            <Briefcase className="size-3.5 text-amber-300" /> Work Info
                          </a>
                        </div>

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
                  </>
                )}
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
      {LogoutDialog}
    </div>
  )
}

export default MechanicTechnicianDashboard
