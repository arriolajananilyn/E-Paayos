import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  Home,
  LogOut,
  MessageSquare,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Store,
  User,
  Wrench,
} from 'lucide-react'
import logoEpaayos from '../assets/epaayosLOGO.png'
import {
  NotificationBellIndicator,
  useCustomerNotificationUnreadCount,
} from '../components/notifications/NotificationFeed.jsx'
import { useLogoutConfirmation } from '../hooks/useLogoutConfirmation.jsx'
import ChatbotWidget from '../components/chatbot/ChatbotWidget.jsx'

export function readCustomerUserSession() {
  if (typeof window === 'undefined') return null
  const token = localStorage.getItem('token')
  const raw = localStorage.getItem('user')
  if (!token || !raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && parsed.role === 'customer' ? parsed : null
  } catch {
    return null
  }
}

/** Route configurations for dedicated page topbars */
const PAGE_TOP_BAR_CONFIG = {
  'service-details': {
    title: 'Service Details',
    description: 'View service specifications, pricing breakdown, and book a request',
    icon: Wrench,
    backUrl: '#/customer/find-services',
  },
  'reviews-ratings': {
    title: 'Reviews & Ratings',
    description: 'View and manage your service reviews and ratings',
    icon: Star,
    backUrl: '#/customer/dashboard',
  },
  'account-settings': {
    title: 'Account Settings',
    description: 'Manage your profile details, password, and preferences',
    icon: Settings,
    backUrl: '#/customer/dashboard',
  },
  'notification': {
    title: 'Notifications',
    description: 'Stay updated with your service requests and system alerts',
    icon: Bell,
    backUrl: '#/customer/dashboard',
  },
  'booking-history': {
    title: 'Booking History',
    description: 'View your completed, past, and cancelled service requests',
    icon: Wrench,
    backUrl: '#/customer/my-bookings',
  },
}

function CustomerPageTopBar({
  config,
  user,
  customerNotifUnread,
  profileOpen,
  setProfileOpen,
  profileMenuRef,
  requestLogout,
  currentTab,
}) {
  const PageIcon = config.icon || Package

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else if (config.backUrl) {
      window.location.hash = config.backUrl
    } else {
      window.location.hash = '#/customer/find-services'
    }
  }

  const userInitial = (user?.fullName || user?.email || 'C').charAt(0).toUpperCase()

  return (
    <header
      aria-label={config.title}
      className="sticky top-0 z-40 flex h-14 sm:h-16 min-w-0 shrink-0 items-center justify-between gap-2 sm:gap-4 bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-3 sm:px-6 lg:px-8 shadow-md border-b border-indigo-900/40"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(255,255,255,0.18),transparent)]"
      />

      <div className="relative flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-none text-white hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
          title="Go back"
        >
          <ArrowLeft className="size-5" />
          <span className="sr-only">Go back</span>
        </button>
        <div className="hidden xs:flex size-8 sm:size-10 shrink-0 items-center justify-center bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-sm rounded-none">
          <PageIcon className="size-4 sm:size-5" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-black tracking-tight text-white sm:text-base md:text-lg leading-tight">
            {config.title}
          </h1>
          <p className="hidden truncate text-xs text-indigo-100/80 md:block font-medium">{config.description}</p>
        </div>
      </div>

      <div className="relative flex shrink-0 items-center gap-1 sm:gap-2.5">
        {/* Notification Bell Button */}
        <button
          type="button"
          aria-label="Notification center"
          onClick={() => {
            window.location.hash = '#/customer/notification'
          }}
          className="relative flex size-9 sm:size-10 items-center justify-center text-white/90 hover:text-white hover:bg-white/15 transition-colors focus-visible:outline-none rounded-none cursor-pointer"
        >
          <NotificationBellIndicator unreadCount={customerNotifUnread}>
            <Bell className="size-4.5 sm:size-5" />
          </NotificationBellIndicator>
        </button>

        {/* Profile Dropdown Trigger */}
        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            aria-label="Profile menu"
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex items-center gap-1.5 p-1 sm:p-1.5 text-white hover:bg-white/15 transition-colors focus-visible:outline-none rounded-none cursor-pointer"
          >
            <span className="flex size-7 sm:size-8 shrink-0 items-center justify-center bg-white/20 text-xs font-extrabold text-white border border-white/30">
              {userInitial}
            </span>
            <span className="hidden lg:inline-block max-w-[110px] truncate text-xs font-bold uppercase tracking-wider text-white">
              {user.fullName ? user.fullName.split(' ')[0] : 'Account'}
            </span>
            <ChevronDown className={`size-3.5 text-white/80 transition-transform duration-200 ${profileOpen ? 'rotate-180 text-white' : ''}`} />
          </button>

          {/* Profile Dropdown Menu Card */}
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-none border border-slate-200 bg-white shadow-2xl z-50 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
              <div className="p-3.5 bg-slate-50 flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-none bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-sm font-extrabold text-white shadow-sm">
                  {userInitial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-900">
                    {user.fullName || 'Customer User'}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">{user.email || ''}</p>
                  <span className="inline-flex items-center gap-1 mt-1 rounded-none border border-[#081F5C]/20 bg-[#081F5C]/10 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-[#081F5C]">
                    Customer Account
                  </span>
                </div>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false)
                    window.location.hash = '#/customer/reviews-ratings'
                  }}
                  className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                    currentTab === 'reviews-ratings'
                      ? 'bg-[#081F5C]/10 text-[#081F5C] font-bold border-l-4 border-l-[#081F5C]'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-[#081F5C]'
                  }`}
                >
                  <Star className="size-4 text-[#081F5C]" />
                  <span>Reviews &amp; Ratings</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false)
                    window.location.hash = '#/customer/account-settings'
                  }}
                  className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                    currentTab === 'account-settings'
                      ? 'bg-[#081F5C]/10 text-[#081F5C] font-bold border-l-4 border-l-[#081F5C]'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-[#081F5C]'
                  }`}
                >
                  <Settings className="size-4 text-[#081F5C]" />
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
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold uppercase tracking-wider text-rose-600 transition-colors hover:bg-rose-50 cursor-pointer"
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
  )
}

function CustomerBottomNav({ currentTab }) {
  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      onClick: () => {
        sessionStorage.setItem('customerDashboardMenu', 'home')
        window.location.hash = '#/customer/dashboard'
      },
      isActive: currentTab === 'home',
    },
    {
      id: 'find-services',
      label: 'Services',
      icon: Search,
      onClick: () => {
        window.location.hash = '#/customer/find-services'
      },
      isActive: currentTab === 'find-services',
    },
    {
      id: 'my-bookings',
      label: 'Bookings',
      icon: Package,
      onClick: () => {
        window.location.hash = '#/customer/my-bookings'
      },
      isActive: currentTab === 'my-bookings' || currentTab === 'booking-history',
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      onClick: () => {
        window.location.hash = '#/customer/messages'
      },
      isActive: currentTab === 'messages',
    },
    {
      id: 'account',
      label: 'Account',
      icon: User,
      onClick: () => {
        window.location.hash = '#/customer/account-settings'
      },
      isActive: currentTab === 'account-settings' || currentTab === 'reviews-ratings',
    },
  ]

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1"
    >
      <div className="grid grid-cols-5 items-center h-14 max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = item.isActive
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className={`group flex flex-col items-center justify-center py-1 px-1 transition-all duration-150 cursor-pointer relative ${
                active ? 'text-[#081F5C]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {/* Active top indicator pill */}
              {active && (
                <span className="absolute -top-1 w-8 h-1 bg-gradient-to-r from-[#081F5C] to-[#1447a6] rounded-full shadow-xs animate-in fade-in zoom-in-75 duration-150" />
              )}
              <div
                className={`flex items-center justify-center w-10 h-7 rounded-full transition-all duration-150 ${
                  active ? 'bg-[#081F5C]/10 text-[#081F5C]' : 'group-hover:bg-slate-100/80 text-slate-500'
                }`}
              >
                <Icon className={`size-4.5 transition-transform duration-150 ${active ? 'scale-110 stroke-[2.2]' : 'stroke-[1.8]'}`} />
              </div>
              <span
                className={`text-[10px] uppercase tracking-wider transition-colors duration-150 truncate max-w-full ${
                  active ? 'font-black text-[#081F5C]' : 'font-semibold text-slate-500'
                }`}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default function CustomerLayout({ children, activePage, hideBottomNav = false }) {
  const [user, setUser] = useState(readCustomerUserSession)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileMenuRef = useRef(null)

  useEffect(() => {
    if (!user) {
      window.location.hash = '#/login'
    }
  }, [user])

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

  const { unreadCount: customerNotifUnread } = useCustomerNotificationUnreadCount(user)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.hash = '#/'
  }

  const { requestLogout, LogoutDialog } = useLogoutConfirmation(handleLogout)

  const currentRoute = typeof window !== 'undefined' ? window.location.hash || '' : ''
  const currentTab =
    activePage ||
    (currentRoute.startsWith('#/customer/shop/') ||
    currentRoute.startsWith('#/customer/view-shop/')
      ? 'service-details'
      : currentRoute.startsWith('#/customer/find-services')
        ? 'find-services'
        : currentRoute.startsWith('#/customer/my-bookings')
          ? 'my-bookings'
          : currentRoute.startsWith('#/customer/booking-history')
            ? 'booking-history'
            : currentRoute.startsWith('#/customer/messages')
            ? 'messages'
            : currentRoute.startsWith('#/customer/notification')
              ? 'notification'
              : currentRoute.startsWith('#/customer/reviews-ratings')
                ? 'reviews-ratings'
                : currentRoute.startsWith('#/customer/account-settings')
                  ? 'account-settings'
                  : 'home')

  const shouldShowBottomNav = !hideBottomNav && currentTab !== 'service-details'

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-fixed bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100">
        <div className="flex items-center gap-3 text-slate-600 text-xs font-semibold uppercase tracking-wider">
          <div className="h-4 w-4 border-2 border-[#081F5C] border-t-transparent rounded-full animate-spin" />
          <span>Loading session…</span>
        </div>
      </div>
    )
  }

  const userInitial = (user.fullName || user.email || 'C').charAt(0).toUpperCase()
  const pageConfig = PAGE_TOP_BAR_CONFIG[currentTab] ?? null

  return (
    <div className="min-h-screen flex flex-col bg-fixed bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 text-slate-900 font-sans">
      {/* Modern Topbar: Render CustomerPageTopBar if route config exists, else default header */}
      {pageConfig ? (
        <CustomerPageTopBar
          config={pageConfig}
          user={user}
          customerNotifUnread={customerNotifUnread}
          profileOpen={profileOpen}
          setProfileOpen={setProfileOpen}
          profileMenuRef={profileMenuRef}
          requestLogout={requestLogout}
          currentTab={currentTab}
        />
      ) : (
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs transition-all">
          <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 md:px-12 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
            {/* Brand Logo & Customer Badge */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
              <button
                type="button"
                className="flex items-center focus-visible:outline-none group transition-transform duration-200 hover:scale-[1.02] shrink-0"
                aria-label="E-Paayos customer home"
                onClick={() => {
                  sessionStorage.setItem('customerDashboardMenu', 'home')
                  window.location.hash = '#/customer/dashboard'
                }}
              >
                <img
                  src={logoEpaayos}
                  alt="E-PAAYOS"
                  className="h-7 sm:h-8 md:h-9 w-auto max-h-10 max-w-[min(52vw,210px)] object-contain object-left"
                  decoding="async"
                />
              </button>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-none border border-[#081F5C]/20 bg-[#081F5C]/5 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-[#081F5C]">
                <ShieldCheck className="h-3 w-3 text-[#081F5C]" />
                Customer
              </span>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex flex-1 justify-center items-center">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100/70 border border-slate-200/80 rounded-none shadow-2xs">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    currentTab === 'home'
                      ? 'bg-linear-to-r from-[#081F5C] to-[#1447a6] text-white shadow-sm ring-1 ring-[#081F5C]/25'
                      : 'text-slate-600 hover:text-[#081F5C] hover:bg-white/80'
                  }`}
                  onClick={() => {
                    sessionStorage.setItem('customerDashboardMenu', 'home')
                    window.location.hash = '#/customer/dashboard'
                  }}
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>Home</span>
                </button>

                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    currentTab === 'find-services'
                      ? 'bg-linear-to-r from-[#081F5C] to-[#1447a6] text-white shadow-sm ring-1 ring-[#081F5C]/25'
                      : 'text-slate-600 hover:text-[#081F5C] hover:bg-white/80'
                  }`}
                  onClick={() => {
                    window.location.hash = '#/customer/find-services'
                  }}
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Find Services</span>
                </button>

                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    currentTab === 'my-bookings'
                      ? 'bg-linear-to-r from-[#081F5C] to-[#1447a6] text-white shadow-sm ring-1 ring-[#081F5C]/25'
                      : 'text-slate-600 hover:text-[#081F5C] hover:bg-white/80'
                  }`}
                  onClick={() => {
                    window.location.hash = '#/customer/my-bookings'
                  }}
                >
                  <Package className="h-3.5 w-3.5" />
                  <span>My Bookings</span>
                </button>

                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                    currentTab === 'messages'
                      ? 'bg-linear-to-r from-[#081F5C] to-[#1447a6] text-white shadow-sm ring-1 ring-[#081F5C]/25'
                      : 'text-slate-600 hover:text-[#081F5C] hover:bg-white/80'
                  }`}
                  onClick={() => {
                    window.location.hash = '#/customer/messages'
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Messages</span>
                </button>
              </div>
            </nav>

            {/* Right Controls: Notifications & Profile Trigger */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Notification Bell Button */}
              <button
                type="button"
                aria-label="Notification center"
                onClick={() => {
                  window.location.hash = '#/customer/notification'
                }}
                className={`relative flex size-9 sm:size-10 items-center justify-center text-slate-700 hover:text-[#081F5C] hover:bg-slate-100/80 transition-colors focus-visible:outline-none rounded-none cursor-pointer ${
                  currentTab === 'notification' ? 'text-[#081F5C] bg-slate-100/80' : ''
                }`}
              >
                <NotificationBellIndicator unreadCount={customerNotifUnread}>
                  <Bell className="size-4.5 sm:size-5" />
                </NotificationBellIndicator>
              </button>

              {/* Profile Dropdown Trigger */}
              <div ref={profileMenuRef} className="relative">
                <button
                  type="button"
                  aria-label="Profile menu"
                  onClick={() => setProfileOpen((prev) => !prev)}
                  className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 text-slate-700 hover:text-[#081F5C] transition-colors focus-visible:outline-none rounded-none cursor-pointer"
                >
                  <span className="flex size-7 sm:size-8 shrink-0 items-center justify-center bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-[11px] font-extrabold leading-none text-white shadow-2xs rounded-none">
                    {userInitial}
                  </span>
                  <span className="hidden lg:inline-block max-w-[110px] truncate text-xs font-bold uppercase tracking-wider">
                    {user.fullName ? user.fullName.split(' ')[0] : 'Account'}
                  </span>
                  <ChevronDown
                    className={`size-3.5 text-slate-500 transition-transform duration-200 ${
                      profileOpen ? 'rotate-180 text-[#081F5C]' : ''
                    }`}
                  />
                </button>

                {/* Profile Dropdown Menu Card */}
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-none border border-slate-200 bg-white shadow-[0_10px_25px_rgba(15,23,42,0.18)] z-50 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-3.5 bg-slate-50/90 flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-none bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-sm font-extrabold text-white shadow-sm">
                        {userInitial}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-900">
                          {user.fullName || 'Customer User'}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">{user.email || ''}</p>
                        <span className="inline-flex items-center gap-1 mt-1 rounded-none border border-[#081F5C]/20 bg-[#081F5C]/10 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-[#081F5C]">
                          Customer Account
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false)
                          window.location.hash = '#/customer/reviews-ratings'
                        }}
                        className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                          currentTab === 'reviews-ratings'
                            ? 'bg-[#081F5C]/10 text-[#081F5C] font-bold border-l-4 border-l-[#081F5C]'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-[#081F5C]'
                        }`}
                      >
                        <Star className="h-4 w-4 text-[#081F5C]" />
                        <span>Reviews &amp; Ratings</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false)
                          window.location.hash = '#/customer/account-settings'
                        }}
                        className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                          currentTab === 'account-settings'
                            ? 'bg-[#081F5C]/10 text-[#081F5C] font-bold border-l-4 border-l-[#081F5C]'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-[#081F5C]'
                        }`}
                      >
                        <Settings className="h-4 w-4 text-[#081F5C]" />
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
                        className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Log out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Page Content */}
      <main className={`w-full flex-1 flex flex-col ${shouldShowBottomNav ? 'pb-20 md:pb-0' : ''}`}>{children}</main>

      {/* Mobile Bottom Navigation Bar */}
      {shouldShowBottomNav && <CustomerBottomNav currentTab={currentTab} />}

      {/* Logout Confirmation Dialog */}
      {LogoutDialog}

      {/* AI Chatbot Floating Widget */}
      <ChatbotWidget />
    </div>
  )
}
