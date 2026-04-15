import { useEffect, useRef, useState } from 'react'
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
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Star,
  Store,
} from 'lucide-react'
import Elogo from '../../../assets/Elogo.png'
import {
  EPAAYOS_UNREAD_EVENT,
  NotificationBellIndicator,
  useNotificationUnreadCount,
} from '../../../components/notifications/NotificationFeed.jsx'
import { useLogoutConfirmation } from '@/hooks/useLogoutConfirmation.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

/** Same targets as `notification.jsx` feed — used for unread bell badge. */
const INDEPENDENT_NOTIF_ROUTES = {
  bookings: '#/independent/technician/service-request',
  messages: '#/independent/technician/messages',
  dashboard: '#/independent/technician/dashboard',
}

const navyDeep = '#04133d'
const navy = '#081F5C'
const navyMuted = '#0b2b73'
const navyBright = '#1447a6'
const pageBaseNavyGradient = `linear-gradient(145deg, ${navyDeep} 0%, ${navy} 35%, ${navyMuted} 65%, ${navyBright} 100%)`

let independentMechanicSidebarOpenState = false

const sidebarMenuButtonClass =
  'h-9 gap-3 rounded-lg px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap'

const ROUTES = {
  dashboard: '#/independent/technician/dashboard',
  services: '#/independent/technician/services',
  businessInfo: '#/independent/technician/business-info',
  serviceRequest: '#/independent/technician/service-request',
  serviceHistory: '#/independent/technician/service-history',
  messages: '#/independent/technician/messages',
  ratingsReviews: '#/independent/technician/ratings-reviews',
  reportsAnalytics: '#/independent/technician/reports-analytics',
  notification: '#/independent/technician/notification',
  accountSettings: '#/independent/technician/account-settings',
}

function IndependentMobileNav() {
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

/**
 * Shell for Independent Mechanic / Technician — sidebar + top bar aligned with
 * `mechanic/technician/dashboard.jsx` and `shopowner/dashboard.jsx`.
 */
export default function IndependentMechanicLayout({
  activeSection = 'dashboard',
  pageMeta = { title: 'Dashboard', description: 'Independent mechanic workspace.' },
  children,
  fullHeightMain = false,
  /** When false, children render without the default spaced wrapper (e.g. shared `ShopOwnerDashboardHome` already applies it). */
  wrapContent = true,
}) {
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(independentMechanicSidebarOpenState)
  const [profileOpen, setProfileOpen] = useState(false)
  const [independentEventUnread, setIndependentEventUnread] = useState(null)
  const profileMenuRef = useRef(null)

  useEffect(() => {
    const raw = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!token || !raw) {
      window.location.hash = '#/login'
      return
    }
    try {
      const parsed = JSON.parse(raw)
      if (parsed.role !== 'independent-mechanic-technician') {
        window.location.hash = '#/login'
        return
      }
      setUser(parsed)
    } catch {
      window.location.hash = '#/login'
    }
  }, [])

  useEffect(() => {
    independentMechanicSidebarOpenState = sidebarOpen
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
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileOpen])

  const onNotifSection = activeSection === 'notification'
  const { unreadCount: independentNotifUnread } = useNotificationUnreadCount({
    user,
    readScope: 'mechanic_independent',
    bookingsUrl: `${API_URL}/api/mechanic/bookings`,
    routes: INDEPENDENT_NOTIF_ROUTES,
    variant: 'technician',
    enabled: Boolean(user) && !onNotifSection,
  })

  useEffect(() => {
    const fn = (e) => {
      if (e.detail?.readScope === 'mechanic_independent') setIndependentEventUnread(e.detail.count)
    }
    window.addEventListener(EPAAYOS_UNREAD_EVENT, fn)
    return () => window.removeEventListener(EPAAYOS_UNREAD_EVENT, fn)
  }, [])

  const independentHeaderUnread = onNotifSection ? (independentEventUnread ?? independentNotifUnread) : independentNotifUnread

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

  const isDashboardActive = activeSection === 'dashboard'
  const isServicesActive = activeSection === 'services'
  const isBusinessInfoActive = activeSection === 'business-info'
  const isServiceRequestActive = activeSection === 'service-request'
  const isServiceHistoryActive = activeSection === 'service-history'
  const isMessagesActive = activeSection === 'messages'
  const isRatingsReviewsActive = activeSection === 'ratings-reviews'
  const isReportsAnalyticsActive = activeSection === 'reports-analytics'
  const isNotificationActive = activeSection === 'notification'
  const isAccountSettingsActive = activeSection === 'account-settings'

  const go = (hash) => {
    window.location.hash = hash
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
                        isActive={isDashboardActive}
                        tooltip="Dashboard"
                        onClick={() => go(ROUTES.dashboard)}
                        className={sidebarMenuButtonClass}
                      >
                        <LayoutDashboard className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Dashboard</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isServicesActive}
                        tooltip="Services"
                        onClick={() => go(ROUTES.services)}
                        className={sidebarMenuButtonClass}
                      >
                        <Store className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Services</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isBusinessInfoActive}
                        tooltip="Business Info"
                        onClick={() => go(ROUTES.businessInfo)}
                        className={sidebarMenuButtonClass}
                      >
                        <Building2 className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Business Info</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isServiceRequestActive}
                        tooltip="Service Request"
                        onClick={() => go(ROUTES.serviceRequest)}
                        className={sidebarMenuButtonClass}
                      >
                        <ClipboardList className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Service Request</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isServiceHistoryActive}
                        tooltip="Service History"
                        onClick={() => go(ROUTES.serviceHistory)}
                        className={sidebarMenuButtonClass}
                      >
                        <History className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Service History</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isMessagesActive}
                        tooltip="Messages"
                        onClick={() => go(ROUTES.messages)}
                        className={sidebarMenuButtonClass}
                      >
                        <MessageSquare className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Messages</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isRatingsReviewsActive}
                        tooltip="Ratings & Reviews"
                        onClick={() => go(ROUTES.ratingsReviews)}
                        className={sidebarMenuButtonClass}
                      >
                        <Star className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Ratings & Reviews</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={isReportsAnalyticsActive}
                        tooltip="Report & Analytics"
                        onClick={() => go(ROUTES.reportsAnalytics)}
                        className={sidebarMenuButtonClass}
                      >
                        <BarChart3 className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Report & Analytics</span>
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
                  {(user.fullName || user.email || 'I').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-[11px] font-normal uppercase tracking-wide text-white/80">
                    Independent Mechanic / Technician
                  </p>
                  <p className="truncate text-[11px] text-white/75">{user.email}</p>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-linear-to-br from-blue-50 via-violet-100 to-indigo-100 dark:from-slate-900 dark:via-violet-950/40 dark:to-indigo-950/50">
            <header className="relative z-30 flex h-14 shrink-0 flex-none items-center gap-3 border-b border-border/60 bg-white/90 px-4 shadow-sm backdrop-blur-md dark:bg-background/95 md:px-6">
              <IndependentMobileNav />
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-semibold tracking-tight text-foreground md:text-xl">
                  {pageMeta.title}
                </h1>
                <p className="hidden truncate text-xs text-muted-foreground sm:block">{pageMeta.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Notification"
                  onClick={() => go(ROUTES.notification)}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                    isNotificationActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <NotificationBellIndicator unreadCount={independentHeaderUnread}>
                    <Bell className="h-5 w-5" />
                  </NotificationBellIndicator>
                </button>

                <div ref={profileMenuRef} className="relative">
                  <button
                    type="button"
                    aria-label="Profile menu"
                    onClick={() => setProfileOpen((prev) => !prev)}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                      isAccountSettingsActive || profileOpen
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-base font-semibold leading-none text-white">
                      {(user.fullName || user.email || 'I').charAt(0).toUpperCase()}
                    </span>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-md border border-border/80 bg-background shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false)
                          go(ROUTES.accountSettings)
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
              id="independent-mechanic-main-scroll"
              className={
                fullHeightMain
                  ? 'scrollbar-hidden flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden overflow-x-hidden px-4 pb-4 pt-2 md:px-6 md:pb-6 md:pt-3'
                  : 'scrollbar-hidden flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain py-4 pl-4 pr-1 md:py-6 md:pl-6 md:pr-2'
              }
            >
              {wrapContent ? (
                <div className="space-y-2 sm:space-y-3.5 pr-2 md:pr-4">{children}</div>
              ) : (
                children
              )}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
      {LogoutDialog}
    </div>
  )
}

export function IndependentPlaceholder({ title, body, icon: Icon = LayoutDashboard }) {
  return (
    <div className="rounded-2xl border border-[#081F5C]/10 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="mb-2 flex items-center gap-2 text-[#081F5C] dark:text-blue-100">
        <Icon className="h-5 w-5 shrink-0 opacity-90" />
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
