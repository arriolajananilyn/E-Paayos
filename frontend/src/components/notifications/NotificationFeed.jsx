import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Bell, MessageSquare, Package, Truck } from 'lucide-react'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

const NOTIFICATION_FILTERS = ['All', 'booking', 'status', 'message', 'system']

const ICON_MAP = {
  booking: Package,
  status: Truck,
  message: MessageSquare,
  system: AlertCircle,
}

function notificationAuthHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function formatRelativeTime(value) {
  if (!value) return '—'
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return '—'
  const diff = Date.now() - time
  if (diff < 0) return 'Just now'
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return 'Just now'
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`
  if (diff < day) return `${Math.floor(diff / hour)}h ago`
  if (diff < day * 2) return 'Yesterday'
  return `${Math.floor(diff / day)}d ago`
}

function customerStatusTitle(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'confirmed') return 'Booking confirmed'
  if (s === 'working') return 'Service in progress'
  if (s === 'completed') return 'Service completed'
  if (s === 'cancelled' || s === 'canceled') return 'Booking cancelled'
  return 'Booking update'
}

function technicianStatusTitle(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'pending') return 'Awaiting shop confirmation'
  if (s === 'confirmed') return 'Booking confirmed — ready to start'
  if (s === 'working') return 'Service in progress'
  if (s === 'completed') return 'Service completed'
  if (s === 'cancelled' || s === 'canceled') return 'Booking cancelled'
  return 'Booking update'
}

function shopOwnerStatusTitle(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'pending') return 'New request — action needed'
  if (s === 'confirmed') return 'Booking confirmed'
  if (s === 'working') return 'Service in progress'
  if (s === 'completed') return 'Service completed'
  if (s === 'cancelled' || s === 'canceled') return 'Booking cancelled'
  return 'Booking update'
}

function userReadKey(readScope, user) {
  const id = user?.id || user?._id || user?.email || 'user'
  return `epaayos_${readScope}_notification_reads_${id}`
}

function loadReadMap(readScope, user) {
  try {
    const raw = localStorage.getItem(userReadKey(readScope, user))
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveReadMap(readScope, user, map) {
  localStorage.setItem(userReadKey(readScope, user), JSON.stringify(map))
}

/** Window event so shells (e.g. shop / independent layout headers) can show the bell badge without duplicating fetch while the feed is mounted. */
export const EPAAYOS_UNREAD_EVENT = 'epaayos:notification-unread-count'

function dispatchUnreadCount(readScope, count) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent(EPAAYOS_UNREAD_EVENT, {
      detail: { readScope, count: typeof count === 'number' ? count : 0 },
    }),
  )
}

/**
 * Fetch bookings and compute unread count (same rules as the feed). Use in layout headers when the notification feed is not mounted.
 */
export function useNotificationUnreadCount({ user, readScope, bookingsUrl, routes, variant, enabled = true }) {
  const [unreadCount, setUnreadCount] = useState(0)

  const url = bookingsUrl || `${API_URL}/api/catalog/bookings`

  const refresh = async () => {
    if (!user || !enabled) return
    try {
      const res = await fetch(url, { headers: notificationAuthHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return
      const bookings = Array.isArray(data?.bookings) ? data.bookings : []
      const readMap = loadReadMap(readScope, user)
      const items = flatMapBookings(bookings, readMap, routes, variant)
      const n = items.filter((i) => i.unread).length
      setUnreadCount(n)
    } catch {
      setUnreadCount(0)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- routes is a stable route map from callers
  }, [user, url, readScope, variant, enabled, routes])

  return { unreadCount, refresh }
}

/** Shared route map for customer notification feed + bell badge (single source of truth). */
export const CUSTOMER_NOTIFICATION_ROUTES = {
  bookings: '#/customer/my-bookings',
  messages: '#/customer/messages',
  dashboard: '#/customer/dashboard',
}

/**
 * Unread count for customer role headers. Refreshes on hash/visibility change and when the notification feed dispatches `EPAAYOS_UNREAD_EVENT`.
 */
export function useCustomerNotificationUnreadCount(user, options = {}) {
  const { enabled = true } = options
  const out = useNotificationUnreadCount({
    user,
    readScope: 'customer',
    bookingsUrl: `${API_URL}/api/catalog/bookings`,
    routes: CUSTOMER_NOTIFICATION_ROUTES,
    variant: 'customer',
    enabled: Boolean(user) && enabled,
  })
  const { refresh } = out
  useEffect(() => {
    const bump = () => void refresh()
    window.addEventListener('hashchange', bump)
    const onVis = () => {
      if (document.visibilityState === 'visible') bump()
    }
    document.addEventListener('visibilitychange', onVis)
    const onUnreadEvt = (e) => {
      if (e.detail?.readScope === 'customer') bump()
    }
    window.addEventListener(EPAAYOS_UNREAD_EVENT, onUnreadEvt)
    return () => {
      window.removeEventListener('hashchange', bump)
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener(EPAAYOS_UNREAD_EVENT, onUnreadEvt)
    }
  }, [refresh])
  return out
}

function mapCustomerBooking(booking, readMap, routes) {
  const id = String(booking?.id || '')
  if (!id) return []

  const serviceName = booking?.serviceName || 'Service'
  const shopName = booking?.shopName || 'Shop'
  const ref = booking?.ref || `BK-${id.slice(-6)}`
  const createdAt = booking?.createdAt || ''
  const updatedAt = booking?.updatedAt || createdAt
  const status = String(booking?.status || 'pending').toLowerCase()
  const list = []

  list.push({
    id: `booking-created-${id}`,
    type: 'booking',
    title: 'Booking submitted',
    desc: `${serviceName} at ${shopName} (${ref})`,
    timestamp: createdAt || updatedAt,
    route: routes.bookings,
    unread: !readMap[`booking-created-${id}`],
  })

  list.push({
    id: `booking-status-${id}-${status}`,
    type: 'status',
    title: customerStatusTitle(status),
    desc: `${serviceName} at ${shopName} is now ${status}.`,
    timestamp: updatedAt || createdAt,
    route: routes.bookings,
    unread: !readMap[`booking-status-${id}-${status}`],
  })

  if ((status === 'cancelled' || status === 'canceled') && booking?.rejectionReason) {
    list.push({
      id: `booking-cancel-note-${id}`,
      type: 'system',
      title: 'Cancellation note from shop',
      desc: booking.rejectionReason,
      timestamp: updatedAt || createdAt,
      route: routes.bookings,
      unread: !readMap[`booking-cancel-note-${id}`],
    })
  }

  return list
}

function mapTechnicianBooking(booking, readMap, routes) {
  const id = String(booking?.id || '')
  if (!id) return []

  const serviceName = booking?.serviceName || 'Service'
  const shopName = booking?.shopName || 'Shop'
  const ref = booking?.ref || `BK-${id.slice(-8).toUpperCase()}`
  const createdAt = booking?.createdAt || ''
  const updatedAt = booking?.updatedAt || createdAt
  const status = String(booking?.status || 'pending').toLowerCase()
  const list = []

  list.push({
    id: `booking-created-${id}`,
    type: 'booking',
    title: 'New booking assigned',
    desc: `${serviceName} at ${shopName} (${ref})`,
    timestamp: createdAt || updatedAt,
    route: routes.bookings,
    unread: !readMap[`booking-created-${id}`],
  })

  list.push({
    id: `booking-status-${id}-${status}`,
    type: 'status',
    title: technicianStatusTitle(status),
    desc: `${serviceName} — ${shopName} is now ${status}.`,
    timestamp: updatedAt || createdAt,
    route: routes.bookings,
    unread: !readMap[`booking-status-${id}-${status}`],
  })

  if ((status === 'cancelled' || status === 'canceled') && booking?.rejectionReason) {
    list.push({
      id: `booking-cancel-note-${id}`,
      type: 'system',
      title: 'Shop cancelled this booking',
      desc: booking.rejectionReason,
      timestamp: updatedAt || createdAt,
      route: routes.bookings,
      unread: !readMap[`booking-cancel-note-${id}`],
    })
  }

  return list
}

function mapShopOwnerBooking(booking, readMap, routes) {
  const id = String(booking?.id || '')
  if (!id) return []

  const serviceName = booking?.shopService?.name || 'Service'
  const who = booking?.contactName || booking?.customer?.fullName || 'Customer'
  const ref = booking?.ref || `BK-${id.slice(-8).toUpperCase()}`
  const createdAt = booking?.createdAt || ''
  const updatedAt = booking?.updatedAt || createdAt
  const status = String(booking?.status || 'pending').toLowerCase()
  const list = []

  list.push({
    id: `booking-created-${id}`,
    type: 'booking',
    title: 'New booking request',
    desc: `${serviceName} from ${who} (${ref})`,
    timestamp: createdAt || updatedAt,
    route: routes.bookings,
    unread: !readMap[`booking-created-${id}`],
  })

  list.push({
    id: `booking-status-${id}-${status}`,
    type: 'status',
    title: shopOwnerStatusTitle(status),
    desc: `${serviceName} — ${who} — ${status}.`,
    timestamp: updatedAt || createdAt,
    route: routes.bookings,
    unread: !readMap[`booking-status-${id}-${status}`],
  })

  if ((status === 'cancelled' || status === 'canceled') && booking?.rejectionReason) {
    list.push({
      id: `booking-cancel-note-${id}`,
      type: 'system',
      title: 'Rejection reason on file',
      desc: booking.rejectionReason,
      timestamp: updatedAt || createdAt,
      route: routes.bookings,
      unread: !readMap[`booking-cancel-note-${id}`],
    })
  }

  return list
}

function flatMapBookings(bookings, readMap, routes, variant) {
  const map =
    variant === 'customer'
      ? mapCustomerBooking
      : variant === 'technician'
        ? mapTechnicianBooking
        : mapShopOwnerBooking
  return (Array.isArray(bookings) ? bookings : []).flatMap((b) => map(b, readMap, routes)).filter(Boolean)
}

/**
 * Numeric badge on header bell: unread count (0 if none), up to 99+.
 * `countOnDarkBg`: true when the bell is on a dark bar (keeps 0 readable).
 */
export function NotificationBellIndicator({ unreadCount, children, className = '', countOnDarkBg = false }) {
  const raw = Number(unreadCount)
  const n = Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 0
  const label = n > 99 ? '99+' : String(n)
  const hasNew = n > 0
  const badgeTone = hasNew
    ? 'bg-red-500 text-white ring-2 ring-white dark:ring-background'
    : countOnDarkBg
      ? 'bg-white/25 text-white ring-1 ring-white/40'
      : 'bg-slate-500 text-white ring-2 ring-white dark:ring-background'

  return (
    <span className={`relative inline-flex ${className}`.trim()}>
      {children}
      <span
        className={`absolute -top-2 -right-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums leading-none pointer-events-none ${badgeTone}`}
        aria-label={hasNew ? `${n} unread notifications` : 'No unread notifications'}
      >
        {label}
      </span>
    </span>
  )
}

/**
 * Main notifications list — same layout as customer notification page body.
 * @param {{ user: object, readScope: string, bookingsUrl?: string, routes: { bookings: string, messages: string, dashboard: string }, variant: 'customer' | 'technician' | 'shopOwner', onUnreadCountChange?: (count: number) => void }} props
 */
export function NotificationFeedContent({ user, readScope, bookingsUrl, routes, variant, onUnreadCountChange }) {
  const [filter, setFilter] = useState('All')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const url = bookingsUrl || `${API_URL}/api/catalog/bookings`

  const list = useMemo(() => {
    const base = filter === 'All' ? items : items.filter((i) => i.type === filter)
    return base
      .map((item) => ({
        ...item,
        Icon: ICON_MAP[item.type] || Bell,
        timeLabel: formatRelativeTime(item.timestamp),
      }))
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
  }, [items, filter])

  const unread = useMemo(() => items.filter((i) => i.unread).length, [items])

  const onUnreadCbRef = useRef(onUnreadCountChange)
  onUnreadCbRef.current = onUnreadCountChange

  useEffect(() => {
    onUnreadCbRef.current?.(unread)
    dispatchUnreadCount(readScope, unread)
  }, [unread, readScope])

  const loadNotifications = async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(url, { headers: notificationAuthHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || 'Could not load notifications.')
      }
      const bookings = Array.isArray(data?.bookings) ? data.bookings : []
      const readMap = loadReadMap(readScope, user)
      setItems(flatMapBookings(bookings, readMap, routes, variant))
    } catch (e) {
      setItems([])
      setError(e?.message || 'Could not load notifications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- routes object identity may vary; url/readScope/user/variant drive reloads
  }, [user, url, readScope, variant])

  const markOneRead = (id) => {
    if (!user) return
    const nextReadMap = { ...loadReadMap(readScope, user), [id]: true }
    saveReadMap(readScope, user, nextReadMap)
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, unread: false } : x)))
  }

  const markAllRead = () => {
    if (!user) return
    const nextReadMap = { ...loadReadMap(readScope, user) }
    items.forEach((item) => {
      nextReadMap[item.id] = true
    })
    saveReadMap(readScope, user, nextReadMap)
    setItems((prev) => prev.map((i) => ({ ...i, unread: false })))
  }

  const clearAll = () => setItems([])

  const handleNotificationClick = (notification) => {
    if (notification.unread) markOneRead(notification.id)

    if (notification.type === 'message') {
      window.location.hash = routes.messages
      return
    }
    if (notification.type === 'system') {
      window.location.hash = notification.route || routes.dashboard
      return
    }
    window.location.hash = notification.route || routes.bookings
  }

  return (
    <div className="space-y-3 sm:space-y-4 w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Bell className="h-5 w-5 text-[#081F5C] dark:text-blue-200 shrink-0" />
          <h2 className="text-xl sm:text-2xl font-semibold text-[#081F5C] dark:text-slate-50">Notifications</h2>
          <span className="ml-2 text-[12px] px-2 py-0.5 rounded-full bg-[#081F5C]/8 text-[#081F5C] border border-[#081F5C]/20 dark:bg-white/10 dark:text-blue-100 dark:border-white/15">
            {unread} unread
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={markAllRead}
            className="px-3 py-1.5 rounded-md border border-[#081F5C]/15 bg-white/90 text-sm text-[#081F5C] shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-blue-100 dark:hover:bg-white/10"
          >
            Mark all read
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="px-3 py-1.5 rounded-md border border-[#081F5C]/15 bg-white/90 text-sm text-[#081F5C] shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-blue-100 dark:hover:bg-white/10"
          >
            Clear all
          </button>
        </div>
      </div>

      <div className="flex w-full items-stretch rounded-lg border border-gray-200 bg-white p-1 shadow-sm overflow-x-auto sm:overflow-visible dark:border-white/10 dark:bg-slate-900/90">
        {NOTIFICATION_FILTERS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={`whitespace-nowrap flex-none sm:flex-1 text-center px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm transition-colors ${
              filter === t
                ? 'bg-linear-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] text-white shadow-sm ring-1 ring-[#081F5C]/25 dark:from-[#04133d] dark:via-[#081F5C] dark:to-[#2a63cc]'
                : 'text-gray-700 hover:bg-gray-50 dark:text-slate-200 dark:hover:bg-white/10'
            }`}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#081F5C]/10 overflow-hidden dark:bg-[#020818]/95 dark:border-white/10 dark:ring-1 dark:ring-white/5">
        <div className="hidden md:grid grid-cols-[2fr_5fr_1fr] gap-2 px-4 py-3 text-xs font-medium text-gray-600 bg-gray-50 items-center dark:bg-white/5 dark:text-slate-300">
          <div className="text-left pl-2 sm:pl-4">Type</div>
          <div className="text-left">Details</div>
          <div className="text-right pr-2">Time</div>
        </div>
        <div className="divide-y">
          {loading ? (
            <div className="p-10 text-center text-gray-600 dark:text-slate-300">Loading notifications…</div>
          ) : error ? (
            <div className="p-6 text-center text-sm text-rose-600">
              {error}
              <button
                type="button"
                onClick={() => void loadNotifications()}
                className="ml-2 text-[#1447a6] hover:underline dark:text-blue-300"
              >
                Retry
              </button>
            </div>
          ) : list.length === 0 ? (
            <div className="p-10 text-center text-gray-600 dark:text-slate-300">No notifications</div>
          ) : (
            list.map((n) => {
              const Icon = n.Icon || Bell
              return (
                <div
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleNotificationClick(n)
                    }
                  }}
                  onClick={() => handleNotificationClick(n)}
                  className={`grid grid-cols-1 md:grid-cols-[2fr_5fr_1fr] gap-2 px-4 py-3 items-center cursor-pointer hover:bg-gray-50 transition-colors dark:hover:bg-white/5 ${
                    n.unread ? 'bg-[#081F5C]/6 dark:bg-[#081F5C]/18' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-200 dark:bg-white/5 dark:border-white/10">
                      <Icon className="h-4 w-4 text-gray-700 dark:text-blue-200" />
                    </div>
                    <span className="text-[12px] md:text-[13px] font-medium text-gray-900 dark:text-slate-100 capitalize">
                      {n.type}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-slate-50 truncate">{n.title}</div>
                    <div className="text-[13px] text-gray-700 dark:text-slate-300 truncate">{n.desc}</div>
                  </div>
                  <div className="text-right text-[11px] text-gray-500 dark:text-slate-400 md:pr-2">{n.timeLabel || '—'}</div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
