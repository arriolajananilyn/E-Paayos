import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  CheckCircle,
  ChevronRight,
  ClipboardList,
  History,
  Home,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquare,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Star,
} from 'lucide-react'
import Elogo from '../../../assets/Elogo.png'
import {
  API_URL,
  MechanicBookingCard,
  MechanicMobileNav,
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
  'h-9 gap-3 rounded-lg px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap'

function formatCompletedLine(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
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
                <h1 className="truncate text-lg font-semibold tracking-tight text-foreground md:text-xl">{SERVICE_HISTORY_META.title}</h1>
                <p className="hidden truncate text-xs text-muted-foreground sm:block">{SERVICE_HISTORY_META.description}</p>
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

                <div className="flex flex-col gap-2 rounded-xl border border-[#081F5C]/12 bg-white/90 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-[#020818]/80 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#081F5C] dark:text-blue-100">Finished work only</p>
                    <p className="mt-0.5 text-xs text-muted-foreground sm:text-[13px]">
                      Active and in-progress jobs stay under <span className="font-medium text-foreground">Assigned requests</span>.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 gap-1 rounded-lg border-[#081F5C]/20 text-[#081F5C] dark:border-white/15 dark:text-blue-100"
                    onClick={() => {
                      window.location.hash = '#/mechanic/technician/assigned-request'
                    }}
                  >
                    Assigned requests
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <StatGradientCard
                    variant="completed"
                    label="Completed jobs"
                    value={kpis.total}
                    helper="All time on your services"
                    icon={CheckCircle}
                  />
                  <StatGradientCard
                    variant="total"
                    label="This month"
                    value={kpis.thisMonth}
                    helper="Completed (by last update)"
                    icon={History}
                  />
                  <StatGradientCard
                    variant="confirmed"
                    label="Home service done"
                    value={kpis.homeDone}
                    helper="Completed home visits"
                    icon={Home}
                  />
                </div>

                <div className="mb-1 flex min-w-0 max-w-full flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[200px] sm:max-w-[280px]">
                    <select className={`${selectShell} text-neutral-900 dark:text-neutral-100`} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                      <option value="recent">Sort: Recently completed</option>
                      <option value="oldest">Sort: Oldest completion</option>
                      <option value="schedule">Sort: Preferred service date</option>
                    </select>
                    <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  </div>

                  <div className="relative h-9 w-full min-w-0 shrink-0 lg:w-[320px]">
                    <Input
                      className="h-9 w-full rounded-lg border-[#081F5C]/15 bg-white/95 pr-12 pl-4 text-sm shadow-sm focus-visible:border-[#1447a6]/45 focus-visible:ring-[#081F5C]/15 dark:border-white/10 dark:bg-[#04133d]/25"
                      placeholder="Search customer, service, shop…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      aria-label="Search service history"
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
                      className="h-9 shrink-0 gap-1.5 rounded-lg border-[#081F5C]/15 bg-white/80 px-3 text-sm text-[#081F5C] shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-blue-100"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
                      Refresh
                    </Button>
                  </div>

                  {loading ? (
                    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm dark:border-white/15 dark:bg-[#020818]">
                      <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#081F5C]/70" aria-hidden />
                      <p className="text-base font-medium text-foreground">Loading history…</p>
                      <p className="mt-1 max-w-md text-sm text-muted-foreground">Fetching completed bookings.</p>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex min-h-[140px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm dark:border-white/15 dark:bg-[#020818]">
                      <History className="mx-auto h-10 w-10 text-muted-foreground/45" aria-hidden />
                      <p className="mt-3 text-base font-medium text-foreground">No completed jobs yet</p>
                      <p className="mt-1 max-w-md text-sm text-muted-foreground">
                        When you or the shop marks a booking complete, it will show up here.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filtered.map((b) => {
                        const cat = b.shopService?.category || b.serviceCategory
                        const isHi = highlightId === b.id
                        return (
                          <div
                            key={b.id}
                            data-mechanic-history-id={b.id}
                            className={isHi ? 'rounded-xl ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-transparent' : ''}
                          >
                            <MechanicBookingCard
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
                                  <div className="flex w-full min-w-0 flex-1 flex-col items-end gap-0.5 text-right sm:flex-row sm:items-center sm:justify-end sm:gap-2">
                                    <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-200/95 sm:text-xs">
                                      Outcome: {completionOutcomeLabel(cat)} · Status: Completed
                                    </p>
                                    <p className="text-[11px] text-muted-foreground sm:text-xs">{formatCompletedLine(b.updatedAt)}</p>
                                  </div>
                                </>
                              }
                            />
                          </div>
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
