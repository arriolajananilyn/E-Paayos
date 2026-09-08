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
  Bell,
  Building2,
  ChevronDown,
  ClipboardList,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
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

let onCallMechanicSidebarOpenState = false

const sidebarMenuButtonClass =
  'h-9 gap-3 rounded-sm px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap'

const ROUTES = {
  dashboard: '#/independent/technician/dashboard',
  services: '#/independent/technician/services',
  businessInfo: '#/independent/technician/business-info',
  serviceRequest: '#/independent/technician/service-request',
  serviceHistory: '#/independent/technician/service-history',
  messages: '#/independent/technician/messages',
  ratingsReviews: '#/independent/technician/ratings-reviews',
  notification: '#/independent/technician/notification',
  accountSettings: '#/independent/technician/account-settings',
}

function IndependentMobileNav() {
  const { isMobile, setOpenMobile } = useSidebar()
  if (!isMobile) return null
  return (
    <button
      type="button"
      className="-ml-1 mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-sm text-foreground hover:bg-accent md:hidden transition-colors cursor-pointer"
      onClick={() => setOpenMobile(true)}
      aria-label="Open navigation menu"
    >
      <Menu className="size-5 text-foreground" />
    </button>
  )
}

/**
 * Shell for On-call Mechanic/Technician — sidebar + top bar aligned with
 * `mechanic/technician/dashboard.jsx` and `shopowner/dashboard.jsx`.
 */
export default function OnCallMechanicLayout({
  activeSection = 'dashboard',
  pageMeta = { title: 'Dashboard', description: 'On-call Mechanic/Technician workspace.' },
  children,
  fullHeightMain = false,
  /** When false, children render without the default spaced wrapper (e.g. shared `ShopOwnerDashboardHome` already applies it). */
  wrapContent = true,
}) {
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(onCallMechanicSidebarOpenState)
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
      if (parsed.role !== 'oncall-mechanic-technician') {
        window.location.hash = '#/login'
        return
      }
      setUser(parsed)
    } catch {
      window.location.hash = '#/login'
    }
  }, [])

  useEffect(() => {
    onCallMechanicSidebarOpenState = sidebarOpen
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
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarSeparator className="mx-0 bg-sidebar-border/80" />

            <SidebarFooter className="gap-2 px-3 py-2 group-data-[collapsible=icon]:items-center">
              <div className="flex items-center gap-2 overflow-hidden rounded-sm border border-white/15 bg-white/10 px-2.5 py-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-1">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#081F5C]">
                  {(user.fullName || user.email || 'I').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-[11px] font-normal uppercase tracking-wide text-white/80">
                    On-call Mechanic/Technician
                  </p>
                  <p className="truncate text-[11px] text-white/75">{user.email}</p>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-linear-to-br from-blue-50 via-violet-100 to-indigo-100 dark:from-slate-900 dark:via-violet-950/40 dark:to-indigo-950/50">
            <header className="sticky top-0 z-40 flex h-14 sm:h-16 shrink-0 flex-none items-center justify-between gap-2 sm:gap-4 border-b border-border/60 bg-white/95 px-3 sm:px-4 md:px-6 shadow-xs backdrop-blur-md dark:bg-background/95">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
                <IndependentMobileNav />
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
                  onClick={() => go(ROUTES.notification)}
                  className={`relative flex size-9 sm:size-10 items-center justify-center rounded-sm transition-colors cursor-pointer ${
                    isNotificationActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-white/10 dark:text-blue-300'
                      : 'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <NotificationBellIndicator unreadCount={independentHeaderUnread}>
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
                      {(user.fullName || user.email || 'I').charAt(0).toUpperCase()}
                    </span>
                    <span className="hidden lg:inline-block max-w-[110px] truncate text-xs font-bold uppercase tracking-wider">
                      {user.fullName ? user.fullName.split(' ')[0] : 'Tech'}
                    </span>
                    <ChevronDown className={`size-3.5 text-muted-foreground transition-transform duration-200 ${profileOpen ? 'rotate-180 text-foreground' : ''}`} />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-md border border-slate-200 dark:border-border/80 bg-white dark:bg-slate-900 shadow-2xl z-50 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-sm font-extrabold text-white shadow-xs">
                          {(user.fullName || user.email || 'I').charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-foreground">
                            {user.fullName || 'On-Call Technician'}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">{user.email || ''}</p>
                          <span className="inline-flex items-center gap-1 mt-1 rounded-sm border border-[#081F5C]/20 bg-[#081F5C]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#081F5C] dark:text-blue-300">
                            On-Call Technician
                          </span>
                        </div>
                      </div>
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false)
                            go(ROUTES.accountSettings)
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
              id="independent-mechanic-main-scroll"
              className={
                fullHeightMain
                  ? 'scrollbar-hidden flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-hidden overflow-x-hidden px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-2 md:px-6 md:pb-6 md:pt-3'
                  : 'scrollbar-hidden flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:py-4 sm:pl-4 sm:pr-1 md:py-6 md:pl-6 md:pr-2'
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
    <div className="rounded-sm border border-[#081F5C]/10 bg-white/90 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
      <div className="mb-2 flex items-center gap-2 text-[#081F5C] dark:text-blue-100">
        <Icon className="h-5 w-5 shrink-0 opacity-90" />
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
