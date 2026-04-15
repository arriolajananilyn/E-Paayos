import { useEffect, useMemo, useRef, useState } from 'react'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from 'recharts'
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
} from '../../../components/ui/sidebar'
import { TooltipProvider } from '../../../components/ui/tooltip'
import {
  Bell,
  Briefcase,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PlayCircle,
  Settings,
  Star,
  Truck,
  Wrench,
} from 'lucide-react'
import Elogo from '../../../assets/Elogo.png'
import { useLogoutConfirmation } from '@/hooks/useLogoutConfirmation.jsx'

const navyDeep = '#04133d'
const navy = '#081F5C'
const navyMuted = '#0b2b73'
const navyBright = '#1447a6'
const pageBaseNavyGradient = `linear-gradient(145deg, ${navyDeep} 0%, ${navy} 35%, ${navyMuted} 65%, ${navyBright} 100%)`

const DASHBOARD_META = { title: 'Dashboard', description: 'Overview of your mechanic workspace.' }
let mechanicTechnicianSidebarOpenState = false

const sidebarMenuButtonClass =
  'h-9 gap-3 rounded-lg px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
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
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n)
  } catch {
    return `₱${Math.round(n).toLocaleString('en-PH')}`
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

/** Same stat card gradients as shop owner Services page (`services.jsx`). */
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

/** Quick-action icon chip — shop navy (matches Services search button). */
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

function MechanicMobileNav() {
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

function MechanicTechnicianDashboard() {
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(mechanicTechnicianSidebarOpenState)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileMenuRef = useRef(null)
  const [range, setRange] = useState('thisWeek')
  const [bookings, setBookings] = useState([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingsError, setBookingsError] = useState('')

  const kpis = useMemo(() => {
    const today = new Date()
    const pending = bookings.filter((b) => b.status === 'pending').length
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length
    const working = bookings.filter((b) => b.status === 'working').length
    const dueToday = bookings.filter((b) => {
      if (b.status === 'cancelled') return false
      return b.preferredDate && isSameLocalCalendarDay(b.preferredDate, today)
    }).length
    const completed = bookings.filter((b) => b.status === 'completed').length
    return [
      {
        label: 'Pending requests',
        value: pending,
        icon: ClipboardList,
        variant: 'inactive',
        helper: 'Waiting for shop action',
      },
      {
        label: 'Confirmed',
        value: confirmed,
        icon: Wrench,
        variant: 'active',
        helper: 'Accepted, not started',
      },
      {
        label: 'Working',
        value: working,
        icon: PlayCircle,
        variant: 'booked',
        helper: 'Shop marked in progress',
      },
      {
        label: 'Due today',
        value: dueToday,
        icon: Truck,
        variant: 'booked',
        helper: 'Preferred date today',
      },
      {
        label: 'Completed',
        value: completed,
        icon: CheckCircle,
        variant: 'services',
        helper: 'Marked done',
      },
    ]
  }, [bookings])

  const statusPieRows = useMemo(() => {
    const pending = bookings.filter((b) => b.status === 'pending').length
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length
    const working = bookings.filter((b) => b.status === 'working').length
    const completed = bookings.filter((b) => b.status === 'completed').length
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length
    return [
      { key: 'pending', name: 'Pending', value: pending, fill: 'url(#gradMechPiePending)' },
      { key: 'confirmed', name: 'Confirmed', value: confirmed, fill: 'url(#gradMechPieConfirmed)' },
      { key: 'working', name: 'Working', value: working, fill: 'url(#gradMechPieWorking)' },
      { key: 'completed', name: 'Completed', value: completed, fill: 'url(#gradMechPieCompleted)' },
      { key: 'cancelled', name: 'Cancelled', value: cancelled, fill: 'url(#gradMechPieCancelled)' },
    ]
  }, [bookings])

  const chartSeries = useMemo(() => {
    const source = bookings.filter((b) => b.status === 'completed')
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
      const t = new Date(o?.updatedAt || o?.createdAt || Date.now())
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
      const ts = o?.updatedAt || o?.createdAt || Date.now()
      const key = makeKey(ts)
      dataMap.set(key, (dataMap.get(key) || 0) + 1)
    })

    const result = []
    if (range === 'today') {
      for (let i = 0; i < 24; i++) {
        const d = new Date(start)
        d.setHours(i, 0, 0, 0)
        const key = makeKey(d)
        const hourLabel = `${String(i).padStart(2, '0')}:00`
        result.push({ date: hourLabel, value: dataMap.get(key) || 0 })
      }
    } else if (range === 'thisWeek' || range === 'lastWeek') {
      const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      for (let i = 0; i < 7; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        const key = makeKey(d)
        result.push({ date: weekDays[d.getDay()], value: dataMap.get(key) || 0 })
      }
    } else if (range === 'thisMonth' || range === 'lastMonth') {
      const daysInMonth =
        range === 'thisMonth'
          ? new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
          : new Date(now.getFullYear(), now.getMonth(), 0).getDate()
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(start)
        d.setDate(i)
        const key = makeKey(d)
        result.push({ date: `D${i}`, value: dataMap.get(key) || 0 })
      }
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
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
      .slice(0, 3)
      .map((o) => ({
        rowKey: o.id,
        id: o.ref || o.id || '—',
        buyer: o.contactName || o.customerFullName || 'Customer',
        amount:
          o.startingPrice != null && Number(o.startingPrice) > 0
            ? currencyPhilippinePeso(o.startingPrice)
            : '—',
        status: normalizeStatus(o?.status) || 'pending',
        when: o?.updatedAt ? timeAgo(o.updatedAt) : o?.createdAt ? timeAgo(o.createdAt) : '',
      }))
  }, [bookings])

  const quickActions = [
    {
      label: 'Assigned requests',
      desc: 'View new booking requests',
      icon: ClipboardList,
      tone: 'blue',
      href: '#/mechanic/technician/assigned-request',
    },
    {
      label: 'Service history',
      desc: 'Completed jobs you worked on',
      icon: History,
      tone: 'emerald',
      href: '#/mechanic/technician/service-history',
    },
    {
      label: 'Messages',
      desc: 'Chat with the customer',
      icon: MessageSquare,
      tone: 'purple',
      href: '#/mechanic/technician/messages',
    },
    {
      label: 'Work info',
      desc: 'Skills, schedule, and profile',
      icon: Briefcase,
      tone: 'orange',
      href: '#/mechanic/technician/work-info',
    },
  ]

  useEffect(() => {
    const raw = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!token || !raw) {
      window.location.hash = '#/login'
      return
    }
    try {
      const parsed = JSON.parse(raw)
      if (parsed.role !== 'mechanic-technician') {
        window.location.hash = '#/login'
        return
      }
      setUser(parsed)
    } catch {
      window.location.hash = '#/login'
    }
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const load = async () => {
      setBookingsLoading(true)
      setBookingsError('')
      try {
        const res = await fetch(`${API_URL}/api/mechanic/bookings`, { headers: authHeaders() })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.message || 'Could not load bookings.')
        }
        const list = Array.isArray(data?.bookings) ? data.bookings : []
        if (!cancelled) setBookings(list)
      } catch (e) {
        if (!cancelled) {
          setBookings([])
          setBookingsError(e?.message || 'Could not load bookings.')
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
                        isActive
                        tooltip="Dashboard"
                        onClick={() => {
                          window.location.hash = '#/mechanic/technician/dashboard'
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
                          window.location.hash = '#/mechanic/technician/assigned-request'
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
                          window.location.hash = '#/mechanic/technician/service-history'
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
                          window.location.hash = '#/mechanic/technician/messages'
                        }}
                        className={sidebarMenuButtonClass}
                      >
                        <MessageSquare className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Messages</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip="Reviews & Ratings"
                        onClick={() => {
                          window.location.hash = '#/mechanic/technician/reviews-ratings'
                        }}
                        className={sidebarMenuButtonClass}
                      >
                        <Star className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Reviews & Ratings</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip="Work Info"
                        onClick={() => {
                          window.location.hash = '#/mechanic/technician/work-info'
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
              <div className="flex items-center gap-2 overflow-hidden rounded-xl border border-white/15 bg-white/10 px-2.5 py-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-1">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#081F5C]">
                  {(user.fullName || user.email || 'M').charAt(0).toUpperCase()}
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
                    window.location.hash = '#/mechanic/technician/notification'
                  }}
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
                      {(user.fullName || user.email || 'M').charAt(0).toUpperCase()}
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
              <div className="space-y-2 sm:space-y-3.5 pr-2 md:pr-4">
                {bookingsError ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {bookingsError}
                  </div>
                ) : null}
                {bookingsLoading ? (
                  <p className="text-xs text-muted-foreground sm:text-sm">Loading bookings…</p>
                ) : null}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {kpis.map(({ label, value, icon, variant, helper }) => (
                    <StatGradientCard
                      key={label}
                      label={label}
                      value={value}
                      icon={icon}
                      variant={variant}
                      helper={helper}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div className="rounded-2xl border border-[#081F5C]/10 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/5 lg:col-span-2">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-[#081F5C] dark:text-blue-100">Completed jobs</div>
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
                      id="mechanic-tech-chart"
                      config={{
                        series: {
                          label: 'Jobs',
                          color: '#1447a6',
                        },
                      }}
                      className="h-64 w-full [&_.recharts-responsive-container]:min-h-[256px]"
                    >
                      <AreaChart data={chartSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="fillMechanicJobs" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1447a6" stopOpacity={0.28} />
                            <stop offset="95%" stopColor="#081F5C" stopOpacity={0.08} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#081F5C"
                          fillOpacity={1}
                          fill="url(#fillMechanicJobs)"
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>

                  <div className="rounded-2xl border border-[#081F5C]/10 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                    <div className="mb-2 text-sm font-medium text-[#081F5C] dark:text-blue-100">Bookings by status</div>
                    <div className="grid h-64 place-items-center">
                      <PieChart width={240} height={240}>
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
                      <div className="text-sm font-semibold text-[#081F5C] dark:text-blue-100">Recent jobs</div>
                      <a
                        href="#/mechanic/technician/assigned-request"
                        className="inline-flex items-center gap-1 text-sm font-medium text-[#081F5C] hover:text-[#1447a6] dark:text-blue-200 dark:hover:text-blue-100"
                      >
                        View all
                        <ChevronRight className="h-4 w-4" />
                      </a>
                    </div>
                    <div className="grid grid-cols-1 gap-3 p-3">
                      {!bookingsLoading && recent.length === 0 ? (
                        <p className="px-1 py-4 text-center text-sm text-muted-foreground">
                          No bookings yet for services you are assigned to. When a customer books a shop listing you
                          are assigned on, it will appear here.
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
                                <div className="truncate text-[13px] text-foreground">{o.buyer}</div>
                              </div>
                              <div className="min-w-[120px] text-right">
                                <div className="text-sm font-semibold text-foreground tabular-nums sm:text-base">
                                  {o.amount}
                                </div>
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
                        <a
                          key={a.label}
                          href={a.href}
                          className="group flex w-full items-center gap-3 rounded-xl border border-[#081F5C]/10 bg-white/95 p-3 text-left transition-all hover:border-[#081F5C]/25 hover:shadow-sm dark:border-white/10 dark:bg-[#04133d]/20"
                        >
                          <div
                            className={`rounded-lg bg-linear-to-r p-2.5 text-white shadow-sm ${chipTone(a.tone)}`}
                          >
                            <QaIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-foreground">{a.label}</div>
                            <div className="text-[12px] text-muted-foreground">{a.desc}</div>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
                        </a>
                        )
                      })}
                    </div>
                  </div>
                </div>
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
