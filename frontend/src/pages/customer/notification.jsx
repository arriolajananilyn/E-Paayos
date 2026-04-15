import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Bell, LogOut, Settings, Star } from 'lucide-react'
import logoEpaayos from '../../assets/epaayos_logo.png'
import {
  CUSTOMER_NOTIFICATION_ROUTES,
  NotificationBellIndicator,
  NotificationFeedContent,
} from '../../components/notifications/NotificationFeed.jsx'
import { useLogoutConfirmation } from '../../hooks/useLogoutConfirmation.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

function readCustomerSession() {
  const raw = localStorage.getItem('user')
  const token = localStorage.getItem('token')
  if (!token || !raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (parsed.role !== 'customer') return null
    return parsed
  } catch {
    return null
  }
}

function NotificationPage() {
  const [user] = useState(readCustomerSession)
  const [headerUnread, setHeaderUnread] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileMenuRef = useRef(null)

  useEffect(() => {
    if (!user) window.location.hash = '#/login'
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

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.hash = '#/'
  }

  const { requestLogout, LogoutDialog } = useLogoutConfirmation(handleLogout)

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-slate-50 via-sky-50/40 to-indigo-100/80 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-100 min-h-16 border-b border-transparent bg-linear-to-r from-[#04133d] via-[#081F5C] to-[#1447a6]">
        <div className="mx-auto flex h-full min-h-16 max-w-7xl items-center justify-between gap-3 px-1 py-2 sm:px-3 sm:py-2.5">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#/customer/dashboard'
              }}
              aria-label="Back"
              className="text-white hover:text-white/90 shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="flex shrink-0 items-center min-w-0"
              aria-label="E-PAAYOS"
              onClick={() => {
                window.location.hash = '#/customer/dashboard'
              }}
            >
              <img
                src={logoEpaayos}
                alt="E-PAAYOS"
                className="h-9 w-auto max-h-11 max-w-[min(62vw,220px)] object-contain object-left sm:h-10"
                decoding="async"
              />
            </button>
            <span className="hidden sm:block h-6 w-px bg-white/40 ml-1 mr-1 shrink-0" />
            <div className="hidden sm:grid h-10 w-10 rounded-lg bg-white/15 border border-white/30 place-items-center shrink-0">
              <NotificationBellIndicator unreadCount={headerUnread} countOnDarkBg className="text-white">
                <Bell className="h-5 w-5 text-white" />
              </NotificationBellIndicator>
            </div>
            <div className="leading-tight min-w-0">
              <div className="text-base sm:text-xl font-bold text-white truncate">Notifications</div>
              <div className="text-[10px] sm:text-xs text-white/90 leading-snug sm:max-w-md truncate">
                Stay updated with your bookings and service status.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              aria-label="Notification"
              onClick={() => {
                window.location.hash = '#/customer/notification'
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10"
            >
              <NotificationBellIndicator unreadCount={headerUnread} countOnDarkBg>
                <Bell className="h-5 w-5" />
              </NotificationBellIndicator>
            </button>

            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                aria-label="Profile menu"
                onClick={() => setProfileOpen((prev) => !prev)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  profileOpen ? 'bg-white/15 text-white' : 'bg-transparent text-white hover:bg-white/10'
                }`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold leading-none text-white ring-1 ring-white/30">
                  {(user.fullName || user.email || 'C').charAt(0).toUpperCase()}
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 z-110 mt-2 w-44 overflow-hidden rounded-md border border-border/80 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false)
                      window.location.hash = '#/customer/reviews-ratings'
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Star className="h-4 w-4" />
                    <span className="whitespace-nowrap">Reviews &amp; Ratings</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false)
                      window.location.hash = '#/customer/account-settings'
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
        </div>
      </div>

      <div className="min-h-screen overflow-x-hidden bg-linear-to-b from-slate-50 via-sky-50/40 to-indigo-100/80 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pt-16">
        <main className="w-full min-w-0 overflow-x-hidden px-6 sm:px-10 md:px-14 lg:px-20 pt-4 pb-6">
          <NotificationFeedContent
            user={user}
            readScope="customer"
            bookingsUrl={`${API_URL}/api/catalog/bookings`}
            routes={CUSTOMER_NOTIFICATION_ROUTES}
            variant="customer"
            onUnreadCountChange={setHeaderUnread}
          />
        </main>
      </div>
      {LogoutDialog}
    </>
  )
}

export default NotificationPage
