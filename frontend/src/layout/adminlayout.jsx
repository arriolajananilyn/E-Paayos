import { useEffect, useRef, useState } from "react"
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
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Users,
} from "lucide-react"
import Elogo from "@/assets/Elogo.png"
import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import { useLogoutConfirmation } from "@/hooks/useLogoutConfirmation.jsx"
import {
  NotificationBellIndicator,
  useAdminNotificationUnreadCount,
} from "@/components/notifications/NotificationFeed.jsx"

const navyDeep = "#04133d"
const navy = "#081F5C"
const navyMuted = "#0b2b73"
const navyBright = "#1447a6"
const pageBaseNavyGradient = `linear-gradient(145deg, ${navyDeep} 0%, ${navy} 35%, ${navyMuted} 65%, ${navyBright} 100%)`

export const ADMIN_SECTIONS = {
  overview: {
    title: "Dashboard",
    description: "Platform overview: bookings, listings, and moderation shortcuts.",
    hash: "#/admin/dashboard",
  },
  users: {
    title: "User Management",
    description: "View, verify, and manage platform user and provider accounts.",
    hash: "#/admin/dashboard?section=users",
  },
  trackServices: {
    title: "Track Services",
    description: "Monitor live service bookings across customers, shops, and mechanics.",
    hash: "#/admin/dashboard?section=trackServices",
  },
  reportsAnalytics: {
    title: "Reports & Analytics",
    description: "Comprehensive platform performance, revenue, and system reports.",
    hash: "#/admin/reports-analytics",
  },
  announcement: {
    title: "Announcement",
    description: "Create and publish system-wide advisories and alerts.",
    hash: "#/admin/dashboard?section=announcement",
  },
  complaints: {
    title: "Complaint & Reports",
    description: "Review, investigate, and resolve grievances reported by customers.",
    hash: "#/admin/complaint-report",
  },
  notification: {
    title: "Notifications",
    description: "Stay updated with platform bookings and activity.",
    hash: "#/admin/notification",
  },
}

export function readAdminUserSession() {
  if (typeof window === "undefined") return null
  const token = localStorage.getItem("token")
  const raw = localStorage.getItem("user")
  if (!token || !raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && parsed.role === "admin" ? parsed : null
  } catch {
    return null
  }
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

export function AdminLayoutSidebarNav({ activeSection, onNavigate, pendingComplaintsCount = 0 }) {
  const { isMobile, setOpenMobile } = useSidebar()

  const handleNav = (sectionKey) => {
    if (onNavigate) {
      onNavigate(sectionKey)
    } else {
      const targetHash = ADMIN_SECTIONS[sectionKey]?.hash || "#/admin/dashboard"
      window.location.hash = targetHash
    }
    if (isMobile) setOpenMobile(false)
  }

  const isComplaintsActive = activeSection === "complaints" || activeSection === "complaintReports"

  return (
    <SidebarMenu className="gap-2.5">
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={activeSection === "overview"}
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
          isActive={activeSection === "users"}
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
          isActive={activeSection === "trackServices"}
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
          isActive={activeSection === "reportsAnalytics"}
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
          isActive={activeSection === "announcement"}
          tooltip="Announcement"
          onClick={() => handleNav("announcement")}
          className={sidebarMenuButtonClass}
        >
          <Megaphone className="size-[18px] opacity-90" />
          <span className="whitespace-nowrap">Announcement</span>
        </SidebarMenuButton>
      </SidebarMenuItem>

      {/* NEW: Complaint & Reports menu item */}
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={isComplaintsActive}
          tooltip="Complaint & Reports"
          onClick={() => handleNav("complaints")}
          className={sidebarMenuButtonClass}
        >
          <AlertTriangle className="size-[18px] opacity-90 text-amber-300" />
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
          isActive={activeSection === "notification"}
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

export default function AdminLayout({
  children,
  activeSection = "overview",
  title,
  description,
  onNavigate,
}) {
  const [user, setUser] = useState(readAdminUserSession)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [pendingComplaintsCount, setPendingComplaintsCount] = useState(0)
  const profileMenuRef = useRef(null)
  const API_URL = getApiBaseUrl()

  const { unreadCount: adminUnreadCount } = useAdminNotificationUnreadCount(user)

  useEffect(() => {
    if (!user) {
      const session = readAdminUserSession()
      if (!session) {
        window.location.hash = "#/login"
      } else {
        setUser(session)
      }
    }
  }, [user])

  // Fetch pending complaints count for sidebar badge
  useEffect(() => {
    if (!user) return
    let cancelled = false
    const token = localStorage.getItem("token")
    fetch(`${API_URL}/api/admin/complaints/stats`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
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
  }, [user, API_URL])

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
        <p className="text-muted-foreground text-sm">Loading admin session…</p>
      </div>
    )
  }

  const activeMeta = ADMIN_SECTIONS[activeSection] || ADMIN_SECTIONS.overview
  const headerTitle = title || activeMeta.title
  const headerDescription = description || activeMeta.description

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
          style={{
            "--sidebar": "transparent",
            "--sidebar-width": "17.5rem",
            "--sidebar-width-icon": "3.35rem",
          }}
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
                  <AdminLayoutSidebarNav
                    activeSection={activeSection}
                    onNavigate={onNavigate}
                    pendingComplaintsCount={pendingComplaintsCount}
                  />
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarSeparator className="mx-0 bg-sidebar-border/80" />

            <SidebarFooter className="gap-2 px-3 py-2 group-data-[collapsible=icon]:items-center">
              <div className="flex items-center gap-2 overflow-hidden rounded-sm border border-white/15 bg-white/10 px-2.5 py-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-1">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#081F5C]">
                  {(user.fullName || user.email || "A").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-[11px] font-normal uppercase tracking-wide text-white/80">
                    Admin
                  </p>
                  <p className="truncate text-[11px] text-white/75">{user.email}</p>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-linear-to-br from-blue-50 via-violet-100 to-indigo-100 dark:from-slate-900 dark:via-violet-950/40 dark:to-indigo-950/50">
            <header className="sticky top-0 z-40 flex h-14 sm:h-16 shrink-0 flex-none items-center justify-between gap-2 sm:gap-4 border-b border-border/60 bg-white/95 px-3 sm:px-4 md:px-6 shadow-xs backdrop-blur-md dark:bg-background/95">
              <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
                <AdminMobileNav />
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-sm sm:text-base md:text-lg font-black tracking-tight text-foreground leading-tight">
                    {headerTitle}
                  </h1>
                  <p className="hidden truncate text-xs text-muted-foreground md:block font-medium">
                    {headerDescription}
                  </p>
                </div>
              </div>
              <div className="relative flex shrink-0 items-center gap-1 sm:gap-2.5">
                <button
                  type="button"
                  aria-label="Notification center"
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate("notification")
                    } else {
                      window.location.hash = "#/admin/notification"
                    }
                  }}
                  className={`relative flex size-9 sm:size-10 items-center justify-center rounded-sm transition-colors cursor-pointer ${
                    activeSection === "notification"
                      ? "bg-blue-50 text-blue-700 dark:bg-white/10 dark:text-blue-300"
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
                    <span className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-bold leading-none text-white shadow-xs">
                      {(user.fullName || user.email || "A").charAt(0).toUpperCase()}
                    </span>
                    <span className="hidden lg:inline-block max-w-[110px] truncate text-xs font-bold uppercase tracking-wider">
                      {user.fullName ? user.fullName.split(" ")[0] : "Admin"}
                    </span>
                    <ChevronDown
                      className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
                        profileOpen ? "rotate-180 text-foreground" : ""
                      }`}
                    />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-md border border-slate-200 dark:border-border/80 bg-white dark:bg-slate-900 shadow-2xl z-50 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-sm font-extrabold text-white shadow-xs">
                          {(user.fullName || user.email || "A").charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-foreground">
                            {user.fullName || "Administrator"}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {user.email || ""}
                          </p>
                          <span className="inline-flex items-center gap-1 mt-1 rounded-sm border border-[#081F5C]/20 bg-[#081F5C]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#081F5C] dark:text-blue-300">
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
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
      {LogoutDialog}
    </div>
  )
}
