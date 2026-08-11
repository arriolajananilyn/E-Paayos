import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  ChevronDown,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Star,
  User,
  X,
} from 'lucide-react'
import logoEpaayos from '../assets/epaayosLOGO.png'
import {
  NotificationBellIndicator,
  useCustomerNotificationUnreadCount,
} from '../components/notifications/NotificationFeed.jsx'
import { useLogoutConfirmation } from '../hooks/useLogoutConfirmation.jsx'

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

export default function CustomerLayout({ children, activePage }) {
  const [user, setUser] = useState(readCustomerUserSession)
  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
    (currentRoute.startsWith('#/customer/find-services') ||
    currentRoute.startsWith('#/customer/shop/') ||
    currentRoute.startsWith('#/customer/view-shop/')
      ? 'find-services'
      : currentRoute.startsWith('#/customer/my-bookings')
      ? 'my-bookings'
      : currentRoute.startsWith('#/customer/messages')
      ? 'messages'
      : currentRoute.startsWith('#/customer/notification')
      ? 'notification'
      : currentRoute.startsWith('#/customer/reviews-ratings')
      ? 'reviews-ratings'
      : currentRoute.startsWith('#/customer/account-settings')
      ? 'account-settings'
      : 'home')

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-600 text-xs font-semibold uppercase tracking-wider">
          <div className="h-4 w-4 border-2 border-[#081F5C] border-t-transparent rounded-full animate-spin" />
          <span>Loading session…</span>
        </div>
      </div>
    )
  }

  const userInitial = (user.fullName || user.email || 'C').charAt(0).toUpperCase()

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Modern Sticky Header Topbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs transition-all">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 md:px-12 py-2.5 flex items-center justify-between gap-4">
          {/* Brand Logo & Customer Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              className="flex items-center focus-visible:outline-none group transition-transform duration-200 hover:scale-[1.02]"
              aria-label="E-Paayos customer home"
              onClick={() => {
                sessionStorage.setItem('customerDashboardMenu', 'home')
                window.location.hash = '#/customer/dashboard'
              }}
            >
              <img
                src={logoEpaayos}
                alt="E-PAAYOS"
                className="h-8 sm:h-9 w-auto max-h-10 max-w-[min(60vw,210px)] object-contain object-left"
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
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
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
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
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
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
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
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-none text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
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
          <div className="flex items-center gap-2 shrink-0">
            {/* Notification Bell Button (Borderless Icon) */}
            <button
              type="button"
              aria-label="Notification center"
              onClick={() => {
                window.location.hash = '#/customer/notification'
              }}
              className={`relative flex items-center justify-center p-2 text-slate-700 hover:text-[#081F5C] hover:bg-slate-100/80 transition-colors focus-visible:outline-none ${
                currentTab === 'notification' ? 'text-[#081F5C]' : ''
              }`}
            >
              <NotificationBellIndicator unreadCount={customerNotifUnread}>
                <Bell className="h-5 w-5" />
              </NotificationBellIndicator>
            </button>

            {/* Profile Dropdown Trigger (Containerless) */}
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                aria-label="Profile menu"
                onClick={() => setProfileOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1.5 text-slate-700 hover:text-[#081F5C] transition-colors focus-visible:outline-none"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-[11px] font-extrabold leading-none text-white shadow-2xs">
                  {userInitial}
                </span>
                <span className="hidden lg:inline-block max-w-[110px] truncate text-xs font-bold uppercase tracking-wider">
                  {user.fullName ? user.fullName.split(' ')[0] : 'Account'}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 ${profileOpen ? 'rotate-180 text-[#081F5C]' : ''}`} />
              </button>

              {/* Profile Dropdown Menu Card */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-none border border-slate-200 bg-white shadow-[0_10px_25px_rgba(15,23,42,0.18)] z-50 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-3.5 bg-slate-50/90 flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-sm font-extrabold text-white shadow-sm">
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
                      className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider transition-colors ${
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
                      className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider transition-colors ${
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
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-bold uppercase tracking-wider text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Drawer Toggle Button */}
            <button
              type="button"
              aria-label="Toggle Navigation Menu"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="inline-flex md:hidden h-9 w-9 items-center justify-center rounded-none border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 shadow-2xs"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-1.5 shadow-lg animate-in slide-in-from-top-2 duration-150">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                sessionStorage.setItem('customerDashboardMenu', 'home')
                window.location.hash = '#/customer/dashboard'
              }}
              className={`flex w-full items-center gap-3 px-3.5 py-2.5 rounded-none text-xs font-bold uppercase tracking-wider transition-colors ${
                currentTab === 'home'
                  ? 'bg-[#081F5C]/10 text-[#081F5C] border-l-4 border-l-[#081F5C]'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                window.location.hash = '#/customer/find-services'
              }}
              className={`flex w-full items-center gap-3 px-3.5 py-2.5 rounded-none text-xs font-bold uppercase tracking-wider transition-colors ${
                currentTab === 'find-services'
                  ? 'bg-[#081F5C]/10 text-[#081F5C] border-l-4 border-l-[#081F5C]'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Search className="h-4 w-4" />
              <span>Find Services</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                window.location.hash = '#/customer/my-bookings'
              }}
              className={`flex w-full items-center gap-3 px-3.5 py-2.5 rounded-none text-xs font-bold uppercase tracking-wider transition-colors ${
                currentTab === 'my-bookings'
                  ? 'bg-[#081F5C]/10 text-[#081F5C] border-l-4 border-l-[#081F5C]'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Package className="h-4 w-4" />
              <span>My Bookings</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                window.location.hash = '#/customer/messages'
              }}
              className={`flex w-full items-center gap-3 px-3.5 py-2.5 rounded-none text-xs font-bold uppercase tracking-wider transition-colors ${
                currentTab === 'messages'
                  ? 'bg-[#081F5C]/10 text-[#081F5C] border-l-4 border-l-[#081F5C]'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Messages</span>
            </button>

            <div className="border-t border-slate-100 my-2 pt-2 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  window.location.hash = '#/customer/reviews-ratings'
                }}
                className={`flex w-full items-center gap-3 px-3.5 py-2 rounded-none text-xs font-semibold uppercase tracking-wider transition-colors ${
                  currentTab === 'reviews-ratings'
                    ? 'bg-[#081F5C]/10 text-[#081F5C] font-bold border-l-4 border-l-[#081F5C]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Star className="h-4 w-4 text-[#081F5C]" />
                <span>Reviews &amp; Ratings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  window.location.hash = '#/customer/account-settings'
                }}
                className={`flex w-full items-center gap-3 px-3.5 py-2 rounded-none text-xs font-semibold uppercase tracking-wider transition-colors ${
                  currentTab === 'account-settings'
                    ? 'bg-[#081F5C]/10 text-[#081F5C] font-bold border-l-4 border-l-[#081F5C]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Settings className="h-4 w-4 text-[#081F5C]" />
                <span>Account Settings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  requestLogout()
                }}
                className="flex w-full items-center gap-3 px-3.5 py-2 rounded-none text-xs font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Page Content */}
      <main className="w-full flex-1 flex flex-col">{children}</main>

      {/* Logout Confirmation Dialog */}
      {LogoutDialog}
    </div>
  )
}
