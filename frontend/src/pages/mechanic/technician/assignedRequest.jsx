import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog'
import { ServiceFeeCalculateDialog } from '../../../components/bookings/ServiceFeeCalculateDialog.jsx'
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
  Briefcase,
  CalendarCheck,
  CalendarClock,
  CheckCircle,
  ClipboardList,
  Clock,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquare,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Star,
  Wrench,
} from 'lucide-react'
import Elogo from '../../../assets/Elogo.png'
import {
  API_URL,
  MechanicBookingCard,
  MechanicMobileNav,
  StatGradientCard,
  authHeaders,
  mapBookingFromApi,
  workingFinishButtonLabel,
  preferredDateSortValue,
  selectShell,
} from './mechanicBookingShared.jsx'
import { useLogoutConfirmation } from '@/hooks/useLogoutConfirmation.jsx'

const navyDeep = '#04133d'
const navy = '#081F5C'
const navyMuted = '#0b2b73'
const navyBright = '#1447a6'
const pageBaseNavyGradient = `linear-gradient(145deg, ${navyDeep} 0%, ${navy} 35%, ${navyMuted} 65%, ${navyBright} 100%)`

const ASSIGNED_REQUEST_META = {
  title: 'Assigned requests',
  description:
    'Same bookings as the shop’s Service requests. After the owner confirms, use Working when you start the job, then finish with Complete / Fixed when the job is done.',
}
let mechanicTechnicianSidebarOpenState = false

const sidebarMenuButtonClass =
  'h-9 gap-3 rounded-lg px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap'

function MechanicTechnicianAssignedRequest() {
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(mechanicTechnicianSidebarOpenState)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileMenuRef = useRef(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [actionError, setActionError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [confirmWorkingBooking, setConfirmWorkingBooking] = useState(null)
  const [feeBooking, setFeeBooking] = useState(null)
  const [feeDialogError, setFeeDialogError] = useState('')
  /** Default All so jobs stay visible after Confirmed → Working (confirmed-only filter used to hide them). */
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('schedule')
  const [q, setQ] = useState('')

  const loadBookings = useCallback(async () => {
    setListError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/mechanic/bookings`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || 'Could not load bookings.')
      }
      const raw = Array.isArray(data?.bookings) ? data.bookings : []
      setBookings(raw.map(mapBookingFromApi).filter(Boolean))
    } catch (e) {
      setBookings([])
      setListError(e?.message || 'Could not load bookings.')
    } finally {
      setLoading(false)
    }
  }, [])

  const patchTechnicianBooking = useCallback(
    async (bookingId, action) => {
      setActionError('')
      setUpdatingId(bookingId)
      try {
        const res = await fetch(`${API_URL}/api/mechanic/bookings/${encodeURIComponent(bookingId)}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ action }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.message || 'Could not update booking.')
        }
        const mapped = mapBookingFromApi(data?.booking)
        if (mapped) {
          setBookings((prev) => prev.map((x) => (x.id === mapped.id ? mapped : x)))
        } else {
          await loadBookings()
        }
      } catch (e) {
        setActionError(e?.message || 'Could not update booking.')
      } finally {
        setUpdatingId(null)
      }
    },
    [loadBookings],
  )

  const patchTechnicianServiceFee = useCallback(
    async (bookingId, body) => {
      setFeeDialogError('')
      setActionError('')
      setUpdatingId(bookingId)
      try {
        const res = await fetch(`${API_URL}/api/mechanic/bookings/${encodeURIComponent(bookingId)}/service-fee`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify(body),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.message || 'Could not save service fee.')
        }
        const mapped = mapBookingFromApi(data?.booking)
        if (mapped) {
          setBookings((prev) => prev.map((x) => (x.id === mapped.id ? mapped : x)))
        } else {
          await loadBookings()
        }
        setFeeBooking(null)
        return true
      } catch (e) {
        setFeeDialogError(e?.message || 'Could not save service fee.')
        return false
      } finally {
        setUpdatingId(null)
      }
    },
    [loadBookings],
  )

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

  const counts = useMemo(() => {
    const base = { pending: 0, confirmed: 0, working: 0, completed: 0 }
    for (const b of bookings) {
      const st = String(b.status)
      if (st in base) base[st] += 1
    }
    return base
  }, [bookings])

  const filtered = useMemo(() => {
    let list = bookings
    if (['pending', 'confirmed', 'working', 'completed', 'cancelled'].includes(statusFilter)) {
      list = list.filter((b) => b.status === statusFilter)
    }
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
          b.rejectionReason,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(query) || hay.split(/\s+/).some((w) => w.startsWith(query))
      })
    }
    const out = [...list]
    if (sortBy === 'newest') {
      out.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    } else if (sortBy === 'oldest') {
      out.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
    } else if (sortBy === 'schedule') {
      out.sort((a, b) => {
        const da = preferredDateSortValue(a)
        const db = preferredDateSortValue(b)
        if (da !== db) return da - db
        return String(a.preferredTime || '').localeCompare(String(b.preferredTime || ''))
      })
    }
    return out
  }, [bookings, statusFilter, sortBy, q])

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
                        isActive
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
                  {ASSIGNED_REQUEST_META.title}
                </h1>
                <p className="hidden truncate text-xs text-muted-foreground sm:block">{ASSIGNED_REQUEST_META.description}</p>
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
              className="scrollbar-hidden flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden overscroll-contain py-4 pl-4 pr-1 md:py-6 md:pl-6 md:pr-2"
            >
              <div className="w-full min-w-0 max-w-full space-y-3 overflow-x-hidden pr-2 md:pr-4">
                {listError ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    <span>{listError}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => void loadBookings()}>
                      Retry
                    </Button>
                  </div>
                ) : null}
                {actionError ? (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm text-amber-950 dark:text-amber-100">
                    {actionError}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <StatGradientCard
                    variant="pending"
                    label="Awaiting shop"
                    value={counts.pending}
                    helper="Owner has not confirmed yet"
                    icon={CalendarClock}
                  />
                  <StatGradientCard
                    variant="confirmed"
                    label="Confirmed for you"
                    value={counts.confirmed}
                    helper="Accepted, not started"
                    icon={CalendarCheck}
                  />
                  <StatGradientCard
                    variant="working"
                    label="Working"
                    value={counts.working}
                    helper="Shop marked in progress"
                    icon={Wrench}
                  />
                  <StatGradientCard
                    variant="completed"
                    label="Completed"
                    value={counts.completed}
                    helper="Marked done by the shop"
                    icon={CheckCircle}
                  />
                </div>

                <div className="mb-1 flex min-w-0 max-w-full flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 w-full max-w-full flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-nowrap">
                    <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[140px] sm:flex-1 sm:max-w-[200px]">
                      <select
                        className={`${selectShell} text-neutral-900 dark:text-neutral-100`}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="">All statuses</option>
                        <option value="confirmed">Confirmed (assigned)</option>
                        <option value="working">Working</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <Clock className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    </div>

                    <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[220px]">
                      <select className={`${selectShell} text-neutral-900 dark:text-neutral-100`} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="schedule">Sort: Preferred date</option>
                        <option value="newest">Sort: Newest request</option>
                        <option value="oldest">Sort: Oldest request</option>
                      </select>
                      <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    </div>
                  </div>

                  <div className="relative h-9 w-full min-w-0 shrink-0 lg:w-[320px]">
                    <Input
                      className="h-9 w-full rounded-lg border-[#081F5C]/15 bg-white/95 pr-12 pl-4 text-sm shadow-sm focus-visible:border-[#1447a6]/45 focus-visible:ring-[#081F5C]/15 dark:border-white/10 dark:bg-[#04133d]/25"
                      placeholder="Search name, phone, service, shop, notes…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      aria-label="Search assigned requests"
                    />
                    <Button
                      type="button"
                      size="icon-sm"
                      className="pointer-events-none absolute top-1/2 right-1.5 z-10 h-7 w-7 -translate-y-1/2 rounded-md bg-linear-to-r from-[#081F5C] to-[#1447a6] p-0 shadow-sm"
                      aria-hidden
                      tabIndex={-1}
                    >
                      <Search className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                </div>

                <div className="mt-2 min-w-0 max-w-full space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[#081F5C] dark:text-slate-50">Bookings on your assigned services</p>
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground sm:text-[13px]">
                        {filtered.length} result{filtered.length === 1 ? '' : 's'}
                        {statusFilter ? ` · ${statusFilter}` : ''}
                        {statusFilter === 'confirmed'
                          ? ' · same data after the shop owner taps Confirm in Service requests'
                          : statusFilter === ''
                            ? ' · use filters to focus on one status'
                            : null}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={() => void loadBookings()}
                      className="h-9 shrink-0 gap-1.5 rounded-lg border-[#081F5C]/15 bg-white/80 px-3 text-sm text-[#081F5C] shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-blue-100"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
                      Refresh
                    </Button>
                  </div>

                  {loading ? (
                    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm dark:border-white/15 dark:bg-[#020818]">
                      <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#081F5C]/70" aria-hidden />
                      <p className="text-base font-medium text-foreground">Loading bookings…</p>
                      <p className="mt-1 max-w-md text-sm text-muted-foreground">Fetching requests from the server.</p>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex min-h-[140px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm dark:border-white/15 dark:bg-[#020818]">
                      <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/45" aria-hidden />
                      <p className="mt-3 text-base font-medium text-foreground">No bookings found</p>
                      <p className="mt-1 max-w-md text-sm text-muted-foreground">
                        {statusFilter === 'confirmed'
                          ? 'Nothing confirmed yet. When the shop owner confirms a customer booking for a service you are assigned on, it will show here.'
                          : 'Try another status filter or search, or wait for customers to book your shop’s listings.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filtered.map((b) => {
                        const busy = updatingId === b.id
                        return (
                          <MechanicBookingCard
                            key={b.id}
                            b={b}
                            footer={
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 gap-1.5 rounded-md border-[#081F5C]/20 bg-white/90 px-3 text-sm text-[#081F5C]"
                                  onClick={() => {
                                    window.location.hash = '#/mechanic/technician/messages'
                                  }}
                                >
                                  <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
                                  Messages
                                </Button>
                                {b.status === 'confirmed' ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={busy}
                                    className="h-8 gap-1.5 rounded-md bg-linear-to-r from-violet-600 to-indigo-600 px-3 text-sm text-white shadow-sm hover:from-violet-600/90 hover:to-indigo-600/90"
                                    onClick={() =>
                                      setConfirmWorkingBooking({
                                        id: b.id,
                                        contactName: b.contactName || 'Customer',
                                        serviceName: b.shopService?.name || b.serviceName || 'Service',
                                      })
                                    }
                                  >
                                    {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Wrench className="h-4 w-4 shrink-0" aria-hidden />}
                                    Working
                                  </Button>
                                ) : null}
                                {b.status === 'working' ? (
                                  !b.serviceFeeConfirmedAt ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={busy}
                                      className="h-8 gap-1.5 rounded-md bg-linear-to-r from-sky-600 to-blue-600 px-3 text-sm text-white shadow-sm hover:from-sky-600/90 hover:to-blue-600/90"
                                      onClick={() => {
                                        setFeeDialogError('')
                                        setFeeBooking(b)
                                      }}
                                    >
                                      Calculate service fee
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={busy}
                                      className="h-8 gap-1.5 rounded-md bg-emerald-600 px-3 text-sm text-white shadow-sm hover:bg-emerald-600/90"
                                      onClick={() => void patchTechnicianBooking(b.id, 'completed')}
                                    >
                                      {busy ? (
                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                                      ) : (
                                        <CheckCircle className="h-4 w-4 shrink-0" aria-hidden />
                                      )}
                                      {workingFinishButtonLabel(b.shopService?.category || b.serviceCategory)}
                                    </Button>
                                  )
                                ) : null}
                                {b.status === 'completed' ? (
                                  <>
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled
                                      className="h-8 cursor-default gap-1.5 rounded-md border border-emerald-600/30 bg-emerald-600 px-3 text-sm font-medium text-white shadow-sm"
                                      aria-label="Job completed"
                                    >
                                      <CheckCircle className="h-4 w-4 shrink-0" aria-hidden />
                                      Completed
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-8 gap-1.5 rounded-md border-emerald-700/30 bg-white/90 px-3 text-sm text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-950/30 dark:text-emerald-100"
                                      onClick={() => {
                                        try {
                                          sessionStorage.setItem('epaayosMechanicHistoryFocusBookingId', b.id)
                                        } catch {
                                          /* ignore */
                                        }
                                        window.location.hash = '#/mechanic/technician/service-history'
                                      }}
                                    >
                                      <History className="h-4 w-4 shrink-0" aria-hidden />
                                      Service history
                                    </Button>
                                  </>
                                ) : null}
                              </>
                            }
                          />
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
      <ServiceFeeCalculateDialog
        open={Boolean(feeBooking)}
        onOpenChange={(open) => {
          if (!open) {
            setFeeBooking(null)
            setFeeDialogError('')
          }
        }}
        customerName={feeBooking?.contactName || 'Customer'}
        initialLaborPrice={feeBooking?.serviceFeeLaborRateAtCalc ?? null}
        initialReplacementParts={feeBooking?.serviceFeeReplacementParts || []}
        isSubmitting={Boolean(feeBooking) && updatingId === feeBooking.id}
        error={feeDialogError}
        onSave={(payload) => {
          if (!feeBooking) return
          void patchTechnicianServiceFee(feeBooking.id, payload)
        }}
      />

      <AlertDialog
        open={!!confirmWorkingBooking}
        onOpenChange={(open) => {
          if (!open) setConfirmWorkingBooking(null)
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Start this job now?</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              {confirmWorkingBooking ? (
                <>
                  Are you sure you want to mark the booking for{' '}
                  <span className="font-medium text-foreground">{confirmWorkingBooking.contactName}</span>
                  {confirmWorkingBooking.serviceName ? (
                    <>
                      {' '}
                      (<span className="font-medium text-foreground">{confirmWorkingBooking.serviceName}</span>)
                    </>
                  ) : null}{' '}
                  as <span className="font-medium text-foreground">Working</span>?
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <Button
              type="button"
              className="bg-linear-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-600/90 hover:to-indigo-600/90"
              disabled={!confirmWorkingBooking || updatingId === confirmWorkingBooking?.id}
              onClick={async () => {
                if (!confirmWorkingBooking) return
                await patchTechnicianBooking(confirmWorkingBooking.id, 'working')
                setConfirmWorkingBooking(null)
              }}
            >
              {confirmWorkingBooking && updatingId === confirmWorkingBooking.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Updating…
                </>
              ) : (
                'Yes, start working'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {LogoutDialog}
    </div>
  )
}

export default MechanicTechnicianAssignedRequest
