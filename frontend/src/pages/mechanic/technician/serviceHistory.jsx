import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
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
} from '../../../components/ui/sidebar'
import { TooltipProvider } from '../../../components/ui/tooltip'
import {
  Bell,
  Bike,
  Briefcase,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  History,
  Home,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Smartphone,
  Star,
  Store,
  Tag,
  User,
  WashingMachine,
  Wrench,
} from 'lucide-react'
import Elogo from '../../../assets/Elogo.png'
import {
  API_URL,
  MechanicMobileNav,
  MechanicTopBar,
  StatGradientCard,
  authHeaders,
  mapBookingFromApi,
  completionOutcomeLabel,
  preferredDateSortValue,
  selectShell,
} from './mechanicBookingShared.jsx'
import { useLogoutConfirmation } from '@/hooks/useLogoutConfirmation.jsx'

const MECHANIC_FOCUS_KEY = 'epaayosMechanicHistoryFocusBookingId'

const navyDeep = '#04133d'
const navy = '#081F5C'
const navyMuted = '#0b2b73'
const navyBright = '#1447a6'
const pageBaseNavyGradient = `linear-gradient(145deg, ${navyDeep} 0%, ${navy} 35%, ${navyMuted} 65%, ${navyBright} 100%)`

const SERVICE_HISTORY_META = {
  title: 'Service history',
  description: 'Completed jobs for services you are assigned on — same bookings as the shop, filtered to finished work.',
}
let mechanicTechnicianSidebarOpenState = false

const sidebarMenuButtonClass =
  'h-9 gap-3 rounded-sm px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function initialsFromName(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (a + b).toUpperCase()
}

function formatPreferredDate(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

function formatTime12h(hm) {
  const s = String(hm ?? '').trim()
  if (!/^([01]?\d|2[0-3]):([0-5]\d)$/.test(s)) return s || '—'
  const [hStr, mStr] = s.split(':')
  let h = parseInt(hStr, 10)
  const m = mStr
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m} ${ampm}`
}

function formatSubmittedLine(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${date} · ${time}`
}

function categoryIcon(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return Bike
  if (normalized === 'gadget') return Smartphone
  if (normalized === 'appliance') return WashingMachine
  return Wrench
}

function bookingStatusBadge() {
  return (
    <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-extrabold uppercase rounded-none bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
      <CheckCircle2 className="size-3.5 sm:size-4 text-emerald-600 shrink-0" />
      <span>Completed</span>
    </span>
  )
}

function MechanicTechnicianServiceHistory() {
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(mechanicTechnicianSidebarOpenState)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileMenuRef = useRef(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [q, setQ] = useState('')
  const [highlightId, setHighlightId] = useState('')

  const loadBookings = useCallback(async () => {
    setListError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/mechanic/bookings?status=completed`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || 'Could not load service history.')
      }
      const raw = Array.isArray(data?.bookings) ? data.bookings : []
      setBookings(raw.map(mapBookingFromApi).filter(Boolean))
    } catch (e) {
      setBookings([])
      setListError(e?.message || 'Could not load service history.')
    } finally {
      setLoading(false)
    }
  }, [])

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
    void loadBookings()
  }, [user, loadBookings])

  useEffect(() => {
    try {
      const id = sessionStorage.getItem(MECHANIC_FOCUS_KEY)
      if (id) {
        setHighlightId(id)
        sessionStorage.removeItem(MECHANIC_FOCUS_KEY)
      }
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    if (!highlightId || loading) return
    const t = window.setTimeout(() => {
      document.querySelector(`[data-mechanic-history-id="${CSS.escape(highlightId)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 120)
    return () => window.clearTimeout(t)
  }, [highlightId, loading, bookings.length])

  useEffect(() => {
    if (!highlightId) return
    const t = window.setTimeout(() => setHighlightId(''), 4500)
    return () => window.clearTimeout(t)
  }, [highlightId])

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

  const kpis = useMemo(() => {
    const total = bookings.length
    const homeDone = bookings.filter((b) => b.serviceMode === 'home').length
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonth = bookings.filter((b) => {
      const t = new Date(b.updatedAt || b.createdAt || 0)
      return !Number.isNaN(t.getTime()) && t >= startOfMonth
    }).length
    return { total, homeDone, thisMonth }
  }, [bookings])

  const filtered = useMemo(() => {
    let list = bookings
    const query = q.trim().toLowerCase()
    if (query) {
      list = list.filter((b) => {
        const hay = [
          b.ref,
          b.contactName,
          b.contactPhone,
          b.problemDescription,
          b.notes,
          b.shopService?.name,
          b.shopService?.category,
          b.serviceName,
          b.serviceCategory,
          b.shopName,
          b.customer?.fullName,
          b.customer?.email,
          b.customer?.phone,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(query) || hay.split(/\s+/).some((w) => w.startsWith(query))
      })
    }
    const out = [...list]
    if (sortBy === 'recent') {
      out.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    } else if (sortBy === 'oldest') {
      out.sort((a, b) => new Date(a.updatedAt || a.createdAt || 0) - new Date(b.updatedAt || b.createdAt || 0))
    } else {
      out.sort((a, b) => {
        const da = preferredDateSortValue(a)
        const db = preferredDateSortValue(b)
        if (da !== db) return db - da
        return String(b.preferredTime || '').localeCompare(String(a.preferredTime || ''))
      })
    }
    return out
  }, [bookings, sortBy, q])

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
                        isActive
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
              <div className="flex items-center gap-2 overflow-hidden rounded-sm border border-white/15 bg-white/10 px-2.5 py-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-1">
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
            <MechanicTopBar
              title={SERVICE_HISTORY_META.title}
              description={SERVICE_HISTORY_META.description}
              user={user}
              profileOpen={profileOpen}
              setProfileOpen={setProfileOpen}
              profileMenuRef={profileMenuRef}
              requestLogout={requestLogout}
            />

            <div
              id="mechanic-main-scroll"
              className="scrollbar-hidden flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:p-4 md:p-6"
            >
              <div className="w-full min-w-0 max-w-full space-y-3.5 sm:space-y-4">
                {listError ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    <span>{listError}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => void loadBookings()}>
                      Retry
                    </Button>
                  </div>
                ) : null}

                <div className="flex flex-col gap-2.5 rounded-none border border-slate-200 bg-white p-3 sm:p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-[#081F5C] dark:text-blue-100">Finished work only</p>
                    <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground">
                      Active and in-progress jobs stay under <span className="font-medium text-foreground">Assigned requests</span>.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 sm:h-9 shrink-0 gap-1 rounded-none border-[#081F5C]/20 text-[#081F5C] dark:border-white/15 dark:text-blue-100 text-xs font-bold cursor-pointer"
                    onClick={() => {
                      window.location.hash = '#/mechanic/technician/assigned-request'
                    }}
                  >
                    Assigned requests
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
                  <StatGradientCard
                    variant="completed"
                    label="Completed Jobs"
                    value={kpis.total}
                    helper="All time on your services"
                    icon={CheckCircle}
                  />
                  <StatGradientCard
                    variant="total"
                    label="Completed This Month"
                    value={kpis.thisMonth}
                    helper="Finished jobs in current month"
                    icon={CalendarCheck}
                  />
                  <StatGradientCard
                    variant="confirmed"
                    label="Home Service Done"
                    value={kpis.homeDone}
                    helper="Completed home visits"
                    icon={Home}
                  />
                </div>

                <div className="mb-1 flex min-w-0 max-w-full flex-col gap-2.5 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[190px] sm:max-w-[260px]">
                    <select className={`${selectShell} text-neutral-900 dark:text-neutral-100`} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                      <option value="recent">Sort: Recently completed</option>
                      <option value="oldest">Sort: Oldest completion</option>
                      <option value="schedule">Sort: Preferred service date</option>
                    </select>
                    <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  </div>

                  <div className="relative h-9 w-full min-w-0 shrink-0 lg:w-[320px]">
                    <Input
                      className="h-9 w-full rounded-none border-slate-300 bg-white/95 pr-12 pl-4 text-xs font-medium shadow-2xs focus-visible:border-[#081F5C] focus-visible:ring-1 focus-visible:ring-[#081F5C]"
                      placeholder="Search customer, service, shop…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      aria-label="Search service history"
                    />
                    <Button
                      type="button"
                      size="icon-sm"
                      className="pointer-events-none absolute top-1/2 right-1 z-10 h-7 w-7 -translate-y-1/2 rounded-none bg-linear-to-r from-[#04133d] to-[#081F5C] p-0 shadow-xs"
                      aria-hidden
                      tabIndex={-1}
                    >
                      <Search className="h-3.5 w-3.5 text-white" />
                    </Button>
                  </div>
                </div>

                <div className="mt-2 min-w-0 max-w-full space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[#081F5C] dark:text-slate-50">Past jobs</p>
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground sm:text-[13px]">
                        {filtered.length} completed {filtered.length === 1 ? 'job' : 'jobs'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={() => void loadBookings()}
                      className="h-9 shrink-0 gap-1.5 rounded-none border-slate-300 bg-white/80 px-3 text-xs font-bold text-[#081F5C] shadow-2xs hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-blue-100 cursor-pointer"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
                      Refresh
                    </Button>
                  </div>

                  {loading ? (
                    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-none border border-dashed border-slate-300 bg-white p-6 text-center shadow-2xs">
                      <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#081F5C]" aria-hidden />
                      <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Loading history…</p>
                      <p className="mt-1 max-w-md text-xs text-slate-500">Fetching completed bookings.</p>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex min-h-[140px] flex-col items-center justify-center rounded-none border border-dashed border-slate-300 bg-white p-6 text-center shadow-2xs">
                      <History className="mx-auto h-9 w-9 text-slate-400 mb-2" aria-hidden />
                      <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">No completed jobs yet</p>
                      <p className="mt-1 max-w-md text-xs text-slate-500">
                        When you or the shop marks a booking complete, it will show up here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-3.5">
                      {filtered.map((b) => {
                        const CategoryIcon = b.shopService ? categoryIcon(b.shopService.category) : categoryIcon(b.serviceCategory)
                        const cat = b.shopService?.category || b.serviceCategory
                        const hasPin =
                          typeof b.serviceLatitude === 'number' &&
                          Number.isFinite(b.serviceLatitude) &&
                          typeof b.serviceLongitude === 'number' &&
                          Number.isFinite(b.serviceLongitude)
                        const isHi = highlightId === b.id

                        return (
                          <article
                            key={b.id}
                            data-mechanic-history-id={b.id}
                            className={cn(
                              'rounded-none border border-slate-200 bg-white shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-200 hover:border-[#081F5C] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)] p-3 sm:p-4 hover:-translate-y-0.5 space-y-2.5 sm:space-y-3',
                              isHi && 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-50/20'
                            )}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-2">
                              <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                                <div className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-none bg-linear-to-r from-[#04133d] to-[#081F5C] text-xs font-bold text-white shadow-2xs mt-0.5 sm:mt-0">
                                  {initialsFromName(b.contactName)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                    <h3 className="text-sm font-black tracking-tight text-slate-900 break-words">{b.contactName || '—'}</h3>
                                    {b.ref ? (
                                      <span className="font-mono text-[10px] sm:text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 border border-slate-200">
                                        Ref: #{b.ref}
                                      </span>
                                    ) : null}
                                    {b.shopName ? (
                                      <span className="text-[10px] sm:text-[11px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 border border-slate-200 inline-flex items-center gap-1">
                                        <Store className="size-2.5 sm:size-3 text-slate-500" />
                                        {b.shopName}
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                                    <Phone className="size-3 text-[#081F5C]" />
                                    <a href={`tel:${b.contactPhone}`} className="text-[#081F5C] hover:underline font-bold">
                                      {b.contactPhone || '—'}
                                    </a>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-start sm:flex-col sm:items-end gap-1.5 pt-1 sm:pt-0">
                                {bookingStatusBadge()}
                                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500">
                                  Finished: {formatSubmittedLine(b.updatedAt || b.createdAt)}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3">
                              <div className="bg-slate-50/80 border border-slate-200/90 p-2.5 sm:p-3 rounded-none flex flex-col justify-between space-y-1.5">
                                <div>
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                    <FileText className="size-3.5 text-[#081F5C]" />
                                    <span>Service Requested</span>
                                  </span>
                                  <p className="text-xs font-black text-slate-900 mt-1 flex items-center gap-1.5">
                                    <CategoryIcon className="size-3.5 text-indigo-600 shrink-0" />
                                    <span>{b.shopService?.name || b.serviceName || 'General Repair'}</span>
                                  </p>
                                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-3 leading-relaxed">
                                    {b.problemDescription || 'No description provided.'}
                                  </p>
                                </div>
                                {b.notes?.trim() ? (
                                  <div className="bg-white p-2 border border-slate-200 text-[11px] text-slate-600 mt-1">
                                    <span className="font-bold text-slate-800">Notes:</span> {b.notes.trim()}
                                  </div>
                                ) : null}
                              </div>

                              <div className="bg-slate-50/80 border border-slate-200/90 p-2.5 sm:p-3 rounded-none flex flex-col justify-between space-y-1.5">
                                <div>
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                                    <span>Recorded Outcome</span>
                                  </span>
                                  <p className="text-[11px] font-bold text-emerald-900 bg-emerald-50 p-2 border border-emerald-200 mt-1">
                                    {completionOutcomeLabel(cat)}
                                  </p>
                                </div>
                                <div className="bg-white p-2 border border-slate-200 space-y-0.5 text-[11px]">
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Preferred Schedule</span>
                                  <div className="flex items-center gap-1 font-bold text-slate-800">
                                    <CalendarClock className="size-3 text-indigo-600" />
                                    <span>{formatPreferredDate(b.preferredDate)} · {formatTime12h(b.preferredTime)}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="bg-slate-50/80 border border-slate-200/90 p-2.5 sm:p-3 rounded-none flex flex-col justify-between space-y-1.5">
                                <div>
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                    <MapPin className="size-3 text-rose-500" />
                                    <span>Service Location</span>
                                  </span>
                                  <div className="mt-1 flex items-center gap-1">
                                    <Badge className="rounded-none border border-slate-300 bg-white text-slate-800 text-[10px] font-bold uppercase py-0">
                                      {b.serviceMode === 'home' ? <Home className="size-3 mr-1 text-indigo-600" /> : <Store className="size-3 mr-1 text-indigo-600" />}
                                      {b.serviceMode === 'home' ? 'Home Service' : 'In-Shop Visit'}
                                    </Badge>
                                  </div>
                                  {b.serviceMode === 'home' && b.serviceAddress ? (
                                    <p className="text-[11px] font-medium text-slate-700 mt-1.5 line-clamp-2 leading-tight">
                                      {b.serviceAddress}
                                    </p>
                                  ) : (
                                    <p className="text-[11px] font-medium text-slate-500 mt-1.5 italic">
                                      In-shop customer repair visit.
                                    </p>
                                  )}
                                </div>
                                {b.serviceMode === 'home' && hasPin ? (
                                  <a
                                    href={`https://www.google.com/maps?q=${b.serviceLatitude},${b.serviceLongitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-[#081F5C] text-[11px] font-bold rounded-none border border-slate-300 shadow-2xs transition-colors mt-1"
                                  >
                                    <MapPin className="size-3 text-rose-600" />
                                    <span>Open Location Map</span>
                                  </a>
                                ) : null}
                              </div>
                            </div>

                            <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-slate-100">
                              <p className="text-[10px] sm:text-[11px] font-semibold text-emerald-800 dark:text-emerald-200/95">
                                Outcome: <span className="font-bold">{completionOutcomeLabel(cat)}</span> · Status: <span className="font-bold">Completed</span>
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 gap-1.5 rounded-none border-slate-300 bg-white/90 px-3 text-xs font-bold text-[#081F5C] shadow-2xs hover:bg-slate-50 cursor-pointer w-full sm:w-auto inline-flex items-center justify-center"
                                onClick={() => {
                                  window.location.hash = '#/mechanic/technician/messages'
                                }}
                              >
                                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-indigo-600" aria-hidden />
                                Messages
                              </Button>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )}
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

export default MechanicTechnicianServiceHistory
