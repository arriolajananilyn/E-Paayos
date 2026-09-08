import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Bell,
  Calendar,
  CheckCheck,
  ChevronDown,
  Loader2,
  MessageSquare,
  Package,
  Search,
  Trash2,
  Truck,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

const NOTIFICATION_TABS = [
  { id: 'All', label: 'All activity' },
  { id: 'booking', label: 'Bookings' },
  { id: 'status', label: 'Status updates' },
  { id: 'message', label: 'Messages' },
]

const selectShell =
  'h-9 w-full min-w-0 rounded-none border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-2xs focus-visible:ring-1 focus-visible:ring-[#081F5C] focus-visible:border-[#081F5C] appearance-none pr-8 transition-all hover:border-slate-300'

function NotificationSearchBar({ value, onChange }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="relative h-9 w-full min-w-0 shrink-0">
        <Input
          className="h-9 w-full min-w-0 rounded-none border border-slate-200 bg-white pr-12 pl-4 text-xs sm:text-sm shadow-[0_2px_5px_rgba(15,23,42,0.14)] focus-visible:ring-1 focus-visible:ring-[#081F5C] focus-visible:border-[#081F5C] transition-all hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)] hover:border-slate-300"
          placeholder="Search by keyword, shop, or notification detail…"
          value={value}
          onChange={onChange}
          aria-label="Search notifications"
        />
        <Button
          type="button"
          size="icon-sm"
          className="pointer-events-none absolute top-1/2 right-1.5 z-10 h-7 w-7 -translate-y-1/2 rounded-none bg-[#081F5C] hover:bg-[#0a2770] p-0 shadow-sm"
          aria-hidden
          tabIndex={-1}
        >
          <Search className="h-4 w-4 text-white" />
        </Button>
      </div>
    </div>
  )
}

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

function adminStatusTitle(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'pending') return 'New booking — pending shop confirmation'
  if (s === 'confirmed') return 'Booking confirmed by shop'
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
      const bookings = Array.isArray(data?.bookings)
        ? data.bookings
        : Array.isArray(data?.data)
          ? data.data
          : []
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

/** Shared route map for admin notification feed + bell badge. */
export const ADMIN_NOTIFICATION_ROUTES = {
  bookings: '#/admin/dashboard',
  messages: '#/admin/dashboard',
  dashboard: '#/admin/dashboard',
}

/**
 * Unread count for admin role headers.
 */
export function useAdminNotificationUnreadCount(user, options = {}) {
  const { enabled = true } = options
  const out = useNotificationUnreadCount({
    user,
    readScope: 'admin',
    bookingsUrl: `${API_URL}/api/admin/service-bookings`,
    routes: ADMIN_NOTIFICATION_ROUTES,
    variant: 'admin',
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
      if (e.detail?.readScope === 'admin') bump()
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

function mapAdminBooking(booking, readMap, routes) {
  const id = String(booking?.id || booking?._id || '')
  if (!id) return []

  const serviceName = booking?.shopService?.name || booking?.serviceName || 'Service'
  const customerName = booking?.customer?.fullName || booking?.contactName || 'Customer'
  const shopName = booking?.shopOwner?.shopName || booking?.shopName || 'Shop'
  const ref = booking?.ref || `BK-${id.slice(-8).toUpperCase()}`
  const createdAt = booking?.createdAt || ''
  const updatedAt = booking?.updatedAt || createdAt
  const status = String(booking?.status || 'pending').toLowerCase()
  const list = []

  list.push({
    id: `booking-created-${id}`,
    type: 'booking',
    title: 'New platform booking',
    desc: `${serviceName} by ${customerName} at ${shopName} (${ref})`,
    timestamp: createdAt || updatedAt,
    route: routes.bookings,
    unread: !readMap[`booking-created-${id}`],
  })

  list.push({
    id: `booking-status-${id}-${status}`,
    type: 'status',
    title: adminStatusTitle(status),
    desc: `${serviceName} (${ref}) for ${customerName} at ${shopName} is now ${status}.`,
    timestamp: updatedAt || createdAt,
    route: routes.bookings,
    unread: !readMap[`booking-status-${id}-${status}`],
  })

  if ((status === 'cancelled' || status === 'canceled') && booking?.rejectionReason) {
    list.push({
      id: `booking-cancel-note-${id}`,
      type: 'system',
      title: 'Booking cancelled reason',
      desc: `${ref}: ${booking.rejectionReason}`,
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
        : variant === 'admin'
          ? mapAdminBooking
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
export function NotificationFeedContent({
  user,
  readScope = 'customer',
  bookingsUrl,
  routes = { bookings: '#/customer/my-bookings', messages: '#/customer/messages', dashboard: '#/customer/dashboard' },
  variant = 'customer',
  onUnreadChange,
}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('All')
  const [readFilter, setReadFilter] = useState('All')
  const [sortBy, setSortBy] = useState('newest')
  const [q, setQ] = useState('')

  const url = bookingsUrl || `${API_URL}/api/catalog/bookings`
  const unread = useMemo(() => items.filter((x) => x.unread).length, [items])

  const onUnreadCbRef = useRef(onUnreadChange)
  useEffect(() => {
    onUnreadCbRef.current = onUnreadChange
  }, [onUnreadChange])

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
      if (!res.ok) throw new Error(data?.message || 'Could not load notifications.')
      const bookings = Array.isArray(data?.bookings)
        ? data.bookings
        : Array.isArray(data?.data)
          ? data.data
          : []
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
    items.forEach((item) => { nextReadMap[item.id] = true })
    saveReadMap(readScope, user, nextReadMap)
    setItems((prev) => prev.map((i) => ({ ...i, unread: false })))
  }

  const clearAll = () => setItems([])

  const handleNotificationClick = (n) => {
    if (n.unread) markOneRead(n.id)
    window.location.hash = n.route || routes.bookings
  }

  const list = useMemo(() => {
    if (activeTab === 'All') return items
    return items.filter((n) => n.type === activeTab)
  }, [items, activeTab])

  return (
    <div className="space-y-3.5 sm:space-y-4 w-full min-w-0">
      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-none border border-rose-300 bg-rose-50 px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs font-medium text-rose-800 shadow-2xs">
          <span className="min-w-0 break-words">{error}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadNotifications()}
            disabled={loading}
            className="rounded-none border-rose-300 text-rose-800 hover:bg-rose-100 text-xs px-2.5 py-1 shrink-0"
          >
            Retry
          </Button>
        </div>
      ) : null}

      <div
        className="mb-3 sm:mb-4 flex w-full items-stretch overflow-x-auto rounded-none border border-slate-200 bg-white p-1 shadow-[0_2px_5px_rgba(15,23,42,0.08)] [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:overflow-visible"
        role="tablist"
        aria-label="Notification activity type"
      >
        {NOTIFICATION_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 min-w-[85px] sm:min-w-0 whitespace-nowrap rounded-none px-2 sm:px-4 py-1.5 sm:py-2 text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === t.id
                ? 'bg-linear-to-r from-[#081F5C] to-[#1447a6] text-white shadow-sm ring-1 ring-[#081F5C]/25'
                : 'text-slate-600 hover:bg-slate-50 hover:text-[#081F5C]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="min-w-0 max-w-full space-y-3">
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs sm:text-base font-bold text-[#081F5C]">Notifications &amp; Activity Log</p>
            <p className="mt-0.5 truncate text-[10px] sm:text-xs text-muted-foreground font-medium">
              {loading
                ? 'Loading your notification feed from server…'
                : items.length === 0
                  ? 'No activity logs found for your account.'
                  : list.length === items.length
                    ? `Showing all ${items.length} notification${items.length === 1 ? '' : 's'}.`
                    : `Showing ${list.length} of ${items.length} notifications.`}
            </p>
          </div>
          <div className="flex shrink-0 items-center">
            <Button
              type="button"
              onClick={markAllRead}
              disabled={loading || unread === 0}
              className="inline-flex h-8 sm:h-9 shrink-0 items-center justify-center gap-1 sm:gap-1.5 rounded-none bg-[#081F5C] px-2.5 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white shadow-[0_2px_5px_rgba(15,23,42,0.14)] transition-all hover:bg-[#0a2770] hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)] focus-visible:ring-1 focus-visible:ring-[#081F5C] cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <CheckCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Mark all read</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[180px] sm:min-h-[200px] flex-col items-center justify-center rounded-none border border-dashed border-[#081F5C]/20 bg-slate-50/60 p-4 sm:p-6 text-center">
            <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 animate-spin text-[#081F5C]" aria-hidden />
            <p className="mt-2 sm:mt-3 text-xs sm:text-sm font-bold text-foreground">Loading notifications…</p>
            <p className="mt-1 max-w-sm text-[11px] sm:text-xs text-muted-foreground">Syncing real-time repair and booking updates.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[160px] sm:min-h-[180px] flex-col items-center justify-center rounded-none border border-dashed border-[#081F5C]/20 bg-slate-50/60 p-4 sm:p-6 text-center shadow-sm">
            <Bell className="h-7 w-7 sm:h-8 sm:w-8 text-slate-300" />
            <p className="mt-2 text-xs sm:text-sm font-bold text-foreground">No notifications yet</p>
            <p className="mt-1 max-w-md text-[11px] sm:text-xs text-muted-foreground">
              Bookings, status updates, and messages from repair specialists will appear here.
            </p>
          </div>
        ) : list.length === 0 ? (
          <div className="flex min-h-[140px] sm:min-h-[160px] flex-col items-center justify-center rounded-none border border-dashed border-[#081F5C]/20 bg-slate-50/60 p-4 sm:p-6 text-center shadow-sm">
            <p className="text-xs sm:text-sm font-bold text-foreground">No notifications match your filter</p>
            <p className="mt-1 max-w-md text-[11px] sm:text-xs text-muted-foreground">Try selecting a different tab filter.</p>
            <Button
              type="button"
              onClick={() => setActiveTab('All')}
              className="mt-3 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-none bg-[#081F5C] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_2px_5px_rgba(15,23,42,0.14)] hover:bg-[#0a2770]"
            >
              Reset tab
            </Button>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-2.5">
            {list.map((n) => {
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
                  className={`group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3.5 p-3 sm:p-4 rounded-none border transition-all duration-200 cursor-pointer shadow-[0_2px_5px_rgba(15,23,42,0.1)] hover:border-[#081F5C] hover:shadow-[0_4px_12px_rgba(8,31,92,0.18)] active:bg-slate-50 ${
                    n.unread
                      ? 'border-l-4 border-l-[#081F5C] border-slate-200 bg-sky-50/70'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3.5 w-full sm:w-auto">
                    <span className="inline-flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-none bg-[#081F5C]/10 text-[#081F5C] group-hover:bg-[#081F5C] group-hover:text-white transition-colors mt-0.5 sm:mt-0">
                      <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <p className="text-xs sm:text-base font-bold text-slate-900 break-words leading-snug">{n.title}</p>
                        {n.unread ? (
                          <span className="inline-flex items-center rounded-none border border-sky-400 bg-sky-100 px-1.5 sm:px-2 py-0.2 sm:py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-sky-900">
                            Unread
                          </span>
                        ) : null}
                        <span className="inline-flex items-center rounded-none border border-slate-200 bg-slate-100 px-1.5 sm:px-2 py-0.2 sm:py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          {n.type}
                        </span>
                      </div>
                      <p className="mt-1 text-xs sm:text-sm font-medium text-slate-600 line-clamp-2 leading-relaxed">{n.desc}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-between sm:justify-end gap-2 w-full sm:w-auto self-end sm:self-center text-right pt-1 sm:pt-0 border-t border-slate-100 sm:border-0">
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-500">{n.timeLabel || formatRelativeTime(n.timestamp)}</span>
                    <span className="text-[11px] sm:text-xs font-bold text-[#081F5C] sm:hidden flex items-center gap-1">
                      View &rarr;
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
