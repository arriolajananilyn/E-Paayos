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
  ClipboardList,
  Clock,
  DollarSign,
  History,
  Home,
  Image as ImageIcon,
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
  X,
} from 'lucide-react'
import Elogo from '../../../assets/Elogo.png'
import {
  API_URL,
  MechanicMobileNav,
  StatGradientCard,
  authHeaders,
  mapBookingFromApi,
  workingFinishButtonLabel,
  completionOutcomeLabel,
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
  'h-9 gap-3 rounded-sm px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function formatPhp(amount) {
  const n = Number(amount || 0)
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(n)
  } catch {
    return `₱${Math.round(n).toLocaleString('en-PH')}`
  }
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

function categoryBadgeClass(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return 'bg-gradient-to-r from-sky-600 to-blue-700 text-white'
  if (normalized === 'gadget') return 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
  if (normalized === 'appliance') return 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
  if (normalized === 'others') return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
  return 'bg-gradient-to-r from-slate-600 to-slate-700 text-white'
}

function bookingStatusBadge(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
        <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
        <span>Completed</span>
      </span>
    )
  }
  if (s === 'cancelled' || s === 'canceled') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
        <X className="size-4 text-rose-600 shrink-0" />
        <span>Cancelled</span>
      </span>
    )
  }
  if (s === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-sky-100 text-sky-800 border border-sky-300 shadow-2xs">
        <span className="size-2 rounded-full bg-sky-500 animate-pulse" />
        <span>Confirmed</span>
      </span>
    )
  }
  if (s === 'working') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-purple-100 text-purple-800 border border-purple-300 shadow-2xs">
        <span className="size-2 rounded-full bg-purple-500 animate-pulse" />
        <span>Working</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
      <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
      <span>Pending</span>
    </span>
  )
}

function serviceModeBadge(mode) {
  const label = mode === 'home' ? 'Home Service' : 'In-Shop'
  return (
    <Badge variant="outline" className="rounded-none border-indigo-200 bg-indigo-50 text-[11px] font-bold text-indigo-900">
      {label}
    </Badge>
  )
}

function resolveIssuePhotoSrc(src) {
  const value = String(src ?? '').trim()
  if (!value) return ''
  if (/^(data:|blob:)/i.test(value)) return value
  if (value.startsWith('/uploads/')) return `${API_URL}${value}`
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value)
      const host = (parsed.hostname || '').toLowerCase()
      if (host === 'localhost' || host === '127.0.0.1') {
        const api = new URL(API_URL)
        parsed.protocol = api.protocol
        parsed.host = api.host
        return parsed.toString()
      }
    } catch {
      // ignore
    }
    return value
  }
  return value
}

function IssuePhotoThumb({ src, label, size = 'sm' }) {
  const [failed, setFailed] = useState(false)
  const resolvedSrc = resolveIssuePhotoSrc(src)
  const boxClass = size === 'lg' ? 'h-20 w-20' : 'h-14 w-14'

  return (
    <a href={resolvedSrc || '#'} target="_blank" rel="noopener noreferrer" className="group block" title={label}>
      <div className={cn("relative overflow-hidden rounded-none border border-indigo-200 bg-slate-100", boxClass)}>
        {!failed ? (
          <img
            src={resolvedSrc}
            alt={label}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-medium text-slate-500">
            No preview
          </div>
        )}
      </div>
    </a>
  )
}

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
  /** Default All so jobs stay visible after Confirmed → Working */
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
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-base font-semibold leading-none text-white">
                      {(user.fullName || user.email || 'M').charAt(0).toUpperCase()}
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
              className="scrollbar-hidden flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden overscroll-contain py-4 pl-4 pr-1 md:py-6 md:pl-6 md:pr-2"
            >
              <div className="w-full min-w-0 max-w-full space-y-3 overflow-x-hidden pr-2 md:pr-4">
                {listError ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    <span>{listError}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => void loadBookings()}>
                      Retry
                    </Button>
                  </div>
                ) : null}
                {actionError ? (
                  <div className="rounded-sm border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm text-amber-950 dark:text-amber-100">
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
                      className="h-9 w-full rounded-sm border-[#081F5C]/15 bg-white/95 pr-12 pl-4 text-sm shadow-sm focus-visible:border-[#1447a6]/45 focus-visible:ring-[#081F5C]/15 dark:border-white/10 dark:bg-[#04133d]/25"
                      placeholder="Search name, phone, service, shop, notes…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      aria-label="Search assigned requests"
                    />
                    <Button
                      type="button"
                      size="icon-sm"
                      className="pointer-events-none absolute top-1/2 right-1.5 z-10 h-7 w-7 -translate-y-1/2 rounded-sm bg-linear-to-r from-[#081F5C] to-[#1447a6] p-0 shadow-sm"
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
                      className="h-9 shrink-0 gap-1.5 rounded-sm border-[#081F5C]/15 bg-white/80 px-3 text-sm text-[#081F5C] shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-blue-100"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
                      Refresh
                    </Button>
                  </div>

                  {loading ? (
                    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-sm border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm dark:border-white/15 dark:bg-[#020818]">
                      <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#081F5C]/70" aria-hidden />
                      <p className="text-base font-medium text-foreground">Loading bookings…</p>
                      <p className="mt-1 max-w-md text-sm text-muted-foreground">Fetching requests from the server.</p>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex min-h-[140px] flex-col items-center justify-center rounded-sm border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm dark:border-white/15 dark:bg-[#020818]">
                      <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/45" aria-hidden />
                      <p className="mt-3 text-base font-medium text-foreground">No bookings found</p>
                      <p className="mt-1 max-w-md text-sm text-muted-foreground">
                        {statusFilter === 'confirmed'
                          ? 'Nothing confirmed yet. When the shop owner confirms a customer booking for a service you are assigned on, it will show here.'
                          : 'Try another status filter or search, or wait for customers to book your shop’s listings.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filtered.map((b) => {
                        const CategoryIcon = b.shopService ? categoryIcon(b.shopService.category) : categoryIcon(b.serviceCategory)
                        const busy = updatingId === b.id
                        const hasPin =
                          typeof b.serviceLatitude === 'number' &&
                          Number.isFinite(b.serviceLatitude) &&
                          typeof b.serviceLongitude === 'number' &&
                          Number.isFinite(b.serviceLongitude)

                        return (
                          <article
                            key={b.id}
                            className="bg-white border border-slate-200 shadow-[0_3px_8px_rgba(15,23,42,0.12)] transition-all duration-200 hover:border-indigo-500 hover:shadow-[0_6px_16px_rgba(8,31,92,0.18)] hover:-translate-y-0.5 p-4 sm:p-5 space-y-4 rounded-none"
                          >
                            {/* Top Bar Header */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
                              <div className="flex items-center gap-3">
                                <div className="flex size-9 items-center justify-center rounded-none bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                                  <CategoryIcon className="size-5" />
                                </div>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-base font-black text-slate-900">
                                      {b.shopService?.name || b.serviceName || 'Service Request'}
                                    </span>
                                    <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-none border border-slate-200 inline-flex items-center gap-1">
                                      <Tag className="size-3 text-indigo-600" />
                                      Ref: {b.ref || b.id}
                                    </span>
                                    <span className="text-[11px] font-bold bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded-none border border-indigo-200 inline-flex items-center gap-1">
                                      <User className="size-3 text-indigo-600" />
                                      {b.contactName || 'Customer'}
                                    </span>
                                    {b.shopName ? (
                                      <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-none border border-slate-200 inline-flex items-center gap-1">
                                        <Store className="size-3 text-slate-500" />
                                        {b.shopName}
                                      </span>
                                    ) : null}
                                  </div>
                                  <span className="text-[11px] text-slate-500 block mt-0.5">
                                    Submitted {formatSubmittedLine(b.createdAt)}
                                  </span>
                                </div>
                              </div>

                              {/* Status Pill Badge */}
                              {bookingStatusBadge(b.status)}
                            </div>

                            {/* Customer, Schedule & Financial Summary 3-Column Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 text-xs sm:text-sm">
                              {/* 1. Customer Details */}
                              <div className="bg-slate-50/80 p-3.5 border border-slate-200 space-y-2.5 rounded-none flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between pb-1">
                                    <span className="font-extrabold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                                      <User className="size-4 text-indigo-600" />
                                      <span>Customer Info</span>
                                    </span>
                                    {b.contactPhone && (
                                      <a
                                        href={`tel:${b.contactPhone}`}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-none shadow-2xs transition-colors"
                                      >
                                        <Phone className="size-3" />
                                        <span>Call</span>
                                      </a>
                                    )}
                                  </div>

                                  <div className="space-y-1.5 text-xs pt-1">
                                    <p className="text-slate-900 font-bold text-sm">{b.contactName || '—'}</p>
                                    {b.contactPhone && (
                                      <p className="text-slate-700 font-mono flex items-center gap-1.5 pt-0.5">
                                        <Phone className="size-3.5 text-slate-400" />
                                        <span>{b.contactPhone}</span>
                                      </p>
                                    )}
                                    {b.customer?.fullName && b.customer.fullName.trim() !== b.contactName?.trim() && (
                                      <p className="text-slate-600 font-medium text-[11px]">
                                        Account: {b.customer.fullName} {b.customer.email ? `(${b.customer.email})` : ''}
                                      </p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                      <Badge className={cn("rounded-none text-[10px] uppercase font-bold", categoryBadgeClass(b.shopService?.category || b.serviceCategory))}>
                                        {b.shopService?.category || b.serviceCategory || 'Service'}
                                      </Badge>
                                      {serviceModeBadge(b.serviceMode)}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 2. Schedule & Location Details */}
                              <div className="bg-slate-50/80 p-3.5 border border-slate-200 space-y-2 rounded-none flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between pb-1">
                                    <span className="font-extrabold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                                      <Calendar className="size-4 text-indigo-600" />
                                      <span>Schedule & Location</span>
                                    </span>
                                  </div>

                                  <div className="space-y-2 text-xs pt-1">
                                    <div>
                                      <span className="text-slate-500 font-medium block">Preferred Schedule:</span>
                                      <p className="font-bold text-slate-900 text-xs mt-0.5 flex items-center gap-1">
                                        <Clock className="size-3.5 text-indigo-600 shrink-0" />
                                        <span>{formatPreferredDate(b.preferredDate)} • {formatTime12h(b.preferredTime)}</span>
                                      </p>
                                    </div>

                                    {b.serviceMode === 'home' && b.serviceAddress ? (
                                      <div>
                                        <span className="text-slate-500 font-medium block">Service Address:</span>
                                        <p className="text-slate-700 flex items-start gap-1 mt-0.5 leading-relaxed">
                                          <MapPin className="size-3.5 text-rose-500 shrink-0 mt-0.5" />
                                          <span>{b.serviceAddress}</span>
                                        </p>
                                        {hasPin && (
                                          <a
                                            href={`https://www.google.com/maps?q=${b.serviceLatitude},${b.serviceLongitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline mt-1"
                                          >
                                            <MapPin className="size-3" />
                                            <span>Open in Google Maps</span>
                                          </a>
                                        )}
                                      </div>
                                    ) : (
                                      <div>
                                        <span className="text-slate-500 font-medium block">Service Location:</span>
                                        <p className="text-slate-700 flex items-center gap-1 mt-0.5">
                                          <Store className="size-3.5 text-slate-400 shrink-0" />
                                          <span>In-Shop Service</span>
                                        </p>
                                      </div>
                                    )}

                                    {b.problemDescription && (
                                      <div className="pt-1">
                                        <span className="text-slate-500 font-medium block">Issue Description:</span>
                                        <p className="text-slate-700 line-clamp-2 italic text-[11px] mt-0.5">"{b.problemDescription}"</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* 3. Fee & Service Quote Summary */}
                              <div className="bg-slate-50/80 p-3.5 border border-slate-200 space-y-2.5 rounded-none flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between pb-1">
                                    <span className="font-extrabold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                                      <DollarSign className="size-4 text-indigo-600" />
                                      <span>Fee Summary</span>
                                    </span>
                                    <span
                                      className={cn(
                                        "px-2 py-0.5 text-[11px] font-extrabold uppercase rounded-none border",
                                        b.serviceFeeConfirmedAt
                                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                          : "bg-amber-100 text-amber-800 border-amber-300"
                                      )}
                                    >
                                      {b.serviceFeeConfirmedAt ? "Fee Set" : "Quote Pending"}
                                    </span>
                                  </div>

                                  <div className="space-y-1.5 text-xs pt-1">
                                    <div className="flex justify-between items-center text-slate-600">
                                      <span>Labor Rate / Fee:</span>
                                      <span className="font-semibold text-slate-800">
                                        {b.serviceFeeLaborRateAtCalc != null ? formatPhp(b.serviceFeeLaborRateAtCalc) : "TBD"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-600">
                                      <span>Materials & Parts:</span>
                                      <span className="font-semibold text-slate-800">
                                        {b.serviceFeeMaterialsAmount != null ? formatPhp(b.serviceFeeMaterialsAmount) : "TBD"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 font-bold">
                                      <span className="text-slate-900">Total Fee:</span>
                                      <span className="font-black text-indigo-700 text-base">
                                        {(b.serviceFeeLaborRateAtCalc != null || b.serviceFeeMaterialsAmount != null)
                                          ? formatPhp((b.serviceFeeLaborRateAtCalc || 0) + (b.serviceFeeMaterialsAmount || 0))
                                          : "Awaiting Quote"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Uploaded Issue Photos & Additional Customer Notes 2-Column Row */}
                            {((Array.isArray(b.issuePhotos) && b.issuePhotos.length > 0) || b.notes?.trim()) && (
                              <div
                                className={cn(
                                  "grid gap-3.5",
                                  Array.isArray(b.issuePhotos) && b.issuePhotos.length > 0 && b.notes?.trim()
                                    ? "grid-cols-1 md:grid-cols-2"
                                    : "grid-cols-1"
                                )}
                              >
                                {Array.isArray(b.issuePhotos) && b.issuePhotos.length > 0 && (
                                  <div className="bg-indigo-50/50 border border-indigo-100 p-3 text-xs space-y-2 rounded-none flex flex-col justify-between">
                                    <div>
                                      <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                                        <ImageIcon className="size-4 text-indigo-600" />
                                        Uploaded Issue Photos ({b.issuePhotos.length})
                                      </span>
                                      <div className="flex flex-wrap items-center gap-2 pt-1.5">
                                        {b.issuePhotos.map((src, photoIndex) => (
                                          <IssuePhotoThumb key={photoIndex} src={src} label={`Issue ${photoIndex + 1}`} size="sm" />
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {b.notes?.trim() && (
                                  <div className="bg-slate-50 border border-slate-200 p-3 text-xs space-y-1 rounded-none flex flex-col justify-between">
                                    <div>
                                      <span className="font-bold text-slate-700 block">Additional Notes:</span>
                                      <p className="text-slate-700 italic mt-1 leading-relaxed">"{b.notes.trim()}"</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Rejection Note */}
                            {b.status === 'cancelled' && b.rejectionReason?.trim() && (
                              <div className="bg-rose-50 border border-rose-200 p-3 text-xs space-y-1">
                                <span className="font-bold text-rose-900 block">Rejection Reason:</span>
                                <p className="text-rose-700">{b.rejectionReason.trim()}</p>
                              </div>
                            )}

                            {/* Completed Job Info Banner */}
                            {b.status === 'completed' && (
                              <div className="flex w-full flex-col gap-2 bg-emerald-50/60 p-3 sm:flex-row sm:items-center sm:justify-between text-xs">
                                <p className="min-w-0 text-emerald-950/90 font-medium">
                                  Job finished — recorded as <span className="font-bold">{completionOutcomeLabel(b.shopService?.category || b.serviceCategory)}</span>. Status: <span className="font-bold text-emerald-700">Completed</span>. Listed in Service history.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    try {
                                      sessionStorage.setItem('epaayosMechanicHistoryFocusBookingId', b.id)
                                    } catch {}
                                    window.location.hash = '#/mechanic/technician/service-history'
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-none shadow-2xs transition-colors cursor-pointer shrink-0"
                                >
                                  <History className="size-3.5" />
                                  <span>Service History</span>
                                </button>
                              </div>
                            )}

                            {/* Action Controls Footer */}
                            <div className="pt-1 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => {
                                  window.location.hash = '#/mechanic/technician/messages'
                                }}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer"
                              >
                                <MessageSquare className="size-3.5 text-slate-500" />
                                <span>Messages</span>
                              </button>

                              {b.status === 'confirmed' && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    setConfirmWorkingBooking({
                                      id: b.id,
                                      contactName: b.contactName || 'Customer',
                                      serviceName: b.shopService?.name || b.serviceName || 'Service',
                                    })
                                  }
                                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Wrench className="size-3.5" />}
                                  <span>Start Job (Working)</span>
                                </button>
                              )}

                              {b.status === 'working' && (
                                <>
                                  <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 border border-slate-300 text-xs font-bold rounded-none">
                                    <Wrench className="size-3.5 opacity-70" />
                                    <span>Working</span>
                                  </span>
                                  {!b.serviceFeeConfirmedAt ? (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => {
                                        setFeeDialogError('')
                                        setFeeBooking(b)
                                      }}
                                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      <DollarSign className="size-3.5" />
                                      <span>Calculate Service Fee</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => void patchTechnicianBooking(b.id, 'completed')}
                                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle className="size-3.5" />}
                                      <span>{workingFinishButtonLabel(b.shopService?.category || b.serviceCategory)}</span>
                                    </button>
                                  )}
                                </>
                              )}

                              {b.status === 'completed' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    try {
                                      sessionStorage.setItem('epaayosMechanicHistoryFocusBookingId', b.id)
                                    } catch {}
                                    window.location.hash = '#/mechanic/technician/service-history'
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer"
                                >
                                  <History className="size-3.5" />
                                  <span>Service History</span>
                                </button>
                              )}
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
        <AlertDialogContent className="rounded-none border border-slate-200 bg-white p-6 shadow-2xl sm:max-w-md">
          <AlertDialogHeader className="border-b border-slate-100 pb-3">
            <AlertDialogTitle className="text-lg font-black text-slate-900">Start Service Job Now?</AlertDialogTitle>
            <AlertDialogDescription className="text-left text-xs font-medium text-slate-600 mt-1 leading-relaxed">
              {confirmWorkingBooking ? (
                <>
                  Mark service for{' '}
                  <span className="font-bold text-slate-900">{confirmWorkingBooking.contactName}</span>
                  {confirmWorkingBooking.serviceName ? (
                    <>
                      {' '}
                      (<span className="font-bold text-purple-700">{confirmWorkingBooking.serviceName}</span>)
                    </>
                  ) : null}{' '}
                  as <span className="font-bold text-purple-800 uppercase">Working</span>? Service is actively in progress.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-3.5 gap-2">
            <AlertDialogCancel type="button" className="rounded-none border-slate-300 text-xs font-bold cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              className="rounded-none bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 shadow-md shadow-purple-900/20 cursor-pointer disabled:opacity-50"
              disabled={!confirmWorkingBooking || updatingId === confirmWorkingBooking?.id}
              onClick={async () => {
                if (!confirmWorkingBooking) return
                await patchTechnicianBooking(confirmWorkingBooking.id, 'working')
                setConfirmWorkingBooking(null)
              }}
            >
              {confirmWorkingBooking && updatingId === confirmWorkingBooking.id ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden />
                  Updating…
                </>
              ) : (
                'Yes, Start Job (Working)'
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
