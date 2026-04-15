import { useEffect, useRef, useState } from 'react'
import { Bell, LogOut, Settings, Star } from 'lucide-react'
import logoEpaayos from '../../assets/epaayosLOGO.png'
import { MessagingPanel } from '../../components/MessagingPanel'
import {
  NotificationBellIndicator,
  useCustomerNotificationUnreadCount,
} from '../../components/notifications/NotificationFeed.jsx'

function CustomerMessages() {
  const [user, setUser] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
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
      if (parsed.role !== 'customer') {
        window.location.hash = '#/login'
        return
      }
      setUser(parsed)
    } catch {
      window.location.hash = '#/login'
    }
  }, [])

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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-sky-50 via-violet-50 to-indigo-100">
        <p className="text-gray-600 text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="h-svh min-h-0 flex flex-col bg-linear-to-b from-sky-50 via-violet-50 to-indigo-100">
      <header className="sticky top-0 z-20 shrink-0 border-b border-blue-100/80 bg-white/90 backdrop-blur-md shadow-[0_2px_14px_rgba(8,31,92,0.06)]">
        <div className="w-full px-10 sm:px-14 md:px-20 py-3 flex items-center gap-4">
          <div className="flex items-center gap-5 shrink-0">
            <button
              type="button"
              className="flex items-center"
              aria-label="E-Paayos customer messages"
              onClick={() => {
                sessionStorage.setItem('customerDashboardMenu', 'home')
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
          </div>

          <nav className="flex-1 flex justify-center">
            <div className="flex items-center gap-9 md:gap-11">
              <button
                type="button"
                className="text-sm font-semibold text-blue-900/80 hover:text-blue-700 transition-colors"
                onClick={() => {
                  sessionStorage.setItem('customerDashboardMenu', 'home')
                  window.location.hash = '#/customer/dashboard'
                }}
              >
                Home
              </button>
              <button
                type="button"
                className="text-sm font-semibold text-blue-900/80 hover:text-blue-700 transition-colors"
                onClick={() => {
                  window.location.hash = '#/customer/find-services'
                }}
              >
                Find Services
              </button>
              <button
                type="button"
                className="text-sm font-semibold text-blue-900/80 hover:text-blue-700 transition-colors"
                onClick={() => {
                  window.location.hash = '#/customer/my-bookings'
                }}
              >
                My Bookings
              </button>
              <span className="text-sm font-semibold text-blue-900">Messages</span>
            </div>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              aria-label="Notification"
              onClick={() => {
                window.location.hash = '#/customer/notification'
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#081F5C] transition-colors hover:bg-[#081F5C]/8"
            >
              <NotificationBellIndicator unreadCount={customerNotifUnread}>
                <Bell className="h-5 w-5" />
              </NotificationBellIndicator>
            </button>

            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                aria-label="Profile menu"
                onClick={() => setProfileOpen((prev) => !prev)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  profileOpen ? 'bg-[#081F5C]/8 text-[#081F5C]' : 'bg-transparent text-[#081F5C] hover:bg-[#081F5C]/8'
                }`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-sm font-semibold leading-none text-white">
                  {(user.fullName || user.email || 'C').charAt(0).toUpperCase()}
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-md border border-border/80 bg-white shadow-lg z-40">
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
                      handleLogout()
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
      </header>

      <main className="w-full flex-1 min-h-0 basis-0 px-6 sm:px-10 md:px-14 lg:px-20 pt-4 pb-5 flex flex-col overflow-hidden">
        <MessagingPanel variant="customer" />
      </main>
    </div>
  )
}

export default CustomerMessages
