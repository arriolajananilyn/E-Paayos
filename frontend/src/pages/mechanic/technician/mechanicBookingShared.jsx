import { Badge } from '../../../components/ui/badge'
import { useSidebar } from '../../../components/ui/sidebar'
import {
  Bell,
  Bike,
  CalendarClock,
  ChevronDown,
  Home,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Phone,
  Settings,
  Smartphone,
  Store,
  User,
  WashingMachine,
  Wrench,
} from 'lucide-react'
import { NotificationBellIndicator } from '../../../components/notifications/NotificationFeed.jsx'

export const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

export const selectShell =
  'h-9 w-full appearance-none rounded-sm border border-[#081F5C]/15 bg-white/95 px-3 py-2 pr-8 text-xs sm:text-sm shadow-sm outline-none focus-visible:border-[#1447a6]/50 focus-visible:ring-2 focus-visible:ring-[#081F5C]/20'

export const REQUEST_STAT_GRADIENT = {
  pending: 'bg-linear-to-br from-amber-500 via-orange-500 to-amber-900',
  confirmed: 'bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6]',
  working: 'bg-linear-to-br from-violet-600 via-purple-600 to-indigo-800',
  completed: 'bg-linear-to-br from-emerald-600 via-teal-600 to-emerald-800',
  total: 'bg-linear-to-br from-sky-500 via-blue-500 to-indigo-600',
}

export function StatGradientCard({ label, value, icon: Icon, variant, helper, className = '' }) {
  const gradient = REQUEST_STAT_GRADIENT[variant] ?? REQUEST_STAT_GRADIENT.total
  return (
    <div
      className={`group relative min-w-0 overflow-hidden rounded-none border border-white/20 p-2.5 sm:p-5 shadow-md transition-all duration-300 hover:shadow-lg sm:min-h-[120px] ${gradient} ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/15 to-transparent" />
      <Icon className="pointer-events-none absolute -right-1 -top-1 size-12 sm:size-16 text-white/15 stroke-[1.2] rotate-12 transition-transform duration-500 group-hover:scale-110" />
      <div className="relative z-10 flex items-start justify-between gap-1.5 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-white/90 truncate">{label}</p>
          <p className="mt-0.5 sm:mt-1 text-xl font-black tracking-tight text-white tabular-nums sm:text-3xl">{value}</p>
          {helper ? <p className="mt-0.5 sm:mt-1 line-clamp-1 text-[10px] sm:text-[11px] text-white/80 font-medium truncate">{helper}</p> : null}
        </div>
        <div className="shrink-0 rounded-none border border-white/25 bg-white/15 p-1.5 sm:p-2.5 shadow-inner backdrop-blur-xs">
          <Icon className="size-3.5 sm:size-4 text-white" aria-hidden />
        </div>
      </div>
    </div>
  )
}

export function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export function mapBookingFromApi(row) {
  if (!row || !row.id) return null
  return {
    id: String(row.id),
    ref: row.ref || '',
    status: row.status,
    contactName: row.contactName || '',
    contactPhone: row.contactPhone || '',
    preferredDate: row.preferredDate,
    preferredTime: row.preferredTime || '',
    serviceMode: row.serviceMode,
    serviceAddress: row.serviceAddress || '',
    serviceLatitude: row.serviceLatitude,
    serviceLongitude: row.serviceLongitude,
    issuePhotos: Array.isArray(row.issuePhotos) ? row.issuePhotos.filter(Boolean) : [],
    problemDescription: row.problemDescription || '',
    notes: row.notes || '',
    rejectionReason: row.rejectionReason || '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    customer: row.customer || null,
    shopService: row.shopService || null,
    shopName: row.shopName || '',
    startingPrice: row.startingPrice,
    serviceName: row.serviceName || row.shopService?.name || '',
    serviceCategory: row.serviceCategory || row.shopService?.category || '',
    serviceFeeLaborRateAtCalc:
      row.serviceFeeLaborRateAtCalc != null && Number.isFinite(Number(row.serviceFeeLaborRateAtCalc))
        ? Number(row.serviceFeeLaborRateAtCalc)
        : null,
    serviceFeeMaterialsAmount:
      row.serviceFeeMaterialsAmount != null && Number.isFinite(Number(row.serviceFeeMaterialsAmount))
        ? Number(row.serviceFeeMaterialsAmount)
        : null,
    serviceFeeMaterialsDescription:
      typeof row.serviceFeeMaterialsDescription === 'string' ? row.serviceFeeMaterialsDescription : '',
    serviceFeeReplacementParts: Array.isArray(row.serviceFeeReplacementParts)
      ? row.serviceFeeReplacementParts
        .map((x) => ({
          name: typeof x?.name === 'string' ? x.name : '',
          price: Number.isFinite(Number(x?.price)) ? Number(x.price) : 0,
        }))
        .filter((x) => x.name)
      : [],
    serviceFeeConfirmedAt: row.serviceFeeConfirmedAt || null,
  }
}

/** Green action while status is Working (tap to finish — not past tense). */
export function workingFinishButtonLabel(category) {
  const c = String(category ?? '').toLowerCase()
  if (c === 'vehicle') return 'Fixed'
  if (c === 'gadget' || c === 'appliance') return 'Repaired'
  return 'Complete'
}

/** Recorded outcome after the job is done (history / completed row). */
export function completionOutcomeLabel(category) {
  const c = String(category ?? '').toLowerCase()
  if (c === 'vehicle') return 'Fixed'
  if (c === 'gadget' || c === 'appliance') return 'Repaired'
  return 'Completed'
}

export function initialsFromName(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (a + b).toUpperCase()
}

export function formatPreferredDate(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatTime12h(hm) {
  const s = String(hm ?? '').trim()
  if (!/^([01]?\d|2[0-3]):([0-5]\d)$/.test(s)) return s || '—'
  const [hStr, mStr] = s.split(':')
  let h = parseInt(hStr, 10)
  const m = mStr
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m} ${ampm}`
}

export function formatSubmittedLine(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${date} · ${time}`
}

export function categoryIcon(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return Bike
  if (normalized === 'gadget') return Smartphone
  if (normalized === 'appliance') return WashingMachine
  return Wrench
}

export function categoryBadge(category) {
  const label = typeof category === 'string' && category.trim() ? category.trim() : '—'
  return (
    <Badge
      variant="outline"
      className="border-[#1447a6]/25 bg-white/95 px-2 py-0.5 text-xs font-medium text-[#081F5C] dark:border-[#1447a6]/40 dark:bg-[#04133d]/40 dark:text-blue-100"
    >
      {label}
    </Badge>
  )
}

export function bookingStatusBadge(status) {
  const s = String(status ?? '')
  if (s === 'pending') {
    return (
      <Badge className="border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200">
        Pending
      </Badge>
    )
  }
  if (s === 'confirmed') {
    return (
      <Badge className="border border-[#081F5C]/25 bg-[#081F5C]/8 px-2 py-0.5 text-xs font-medium text-[#04133d] dark:border-[#1447a6]/40 dark:bg-[#04133d]/35 dark:text-blue-100">
        Confirmed
      </Badge>
    )
  }
  if (s === 'working') {
    return (
      <Badge className="border border-violet-500/35 bg-violet-500/12 px-2 py-0.5 text-xs font-medium text-violet-900 dark:border-violet-400/40 dark:bg-violet-950/40 dark:text-violet-200">
        Working
      </Badge>
    )
  }
  if (s === 'completed') {
    return (
      <Badge className="border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200">
        Completed
      </Badge>
    )
  }
  if (s === 'cancelled') {
    return (
      <Badge className="border border-slate-500/25 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
        Cancelled
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="px-2 py-0.5 text-xs">
      {s || '—'}
    </Badge>
  )
}

export function serviceModeLabel(mode) {
  return mode === 'home' ? 'Home service' : 'In-shop'
}

export function currencyPhp(n) {
  const x = Number(n)
  if (!Number.isFinite(x) || x <= 0) return null
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(x)
  } catch {
    return `₱${Math.round(x).toLocaleString('en-PH')}`
  }
}

export function preferredDateSortValue(b) {
  const d = b.preferredDate ? new Date(b.preferredDate) : null
  if (!d || Number.isNaN(d.getTime())) return 0
  return d.getTime()
}

export function isSameLocalCalendarDay(a, b) {
  const da = a instanceof Date ? a : new Date(a)
  const db = b instanceof Date ? b : new Date(b)
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}

export function MechanicMobileNav() {
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

export function MechanicTopBar({
  title,
  description,
  user,
  profileOpen,
  setProfileOpen,
  profileMenuRef,
  requestLogout,
  unreadCount = 0,
  isNotificationActive = false,
}) {
  const userInitial = (user?.fullName || user?.email || 'M').charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-40 flex h-14 sm:h-16 shrink-0 flex-none items-center justify-between gap-2 sm:gap-4 border-b border-border/60 bg-white/95 px-3 sm:px-4 md:px-6 shadow-xs backdrop-blur-md dark:bg-background/95">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
        <MechanicMobileNav />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm sm:text-base md:text-lg font-black tracking-tight text-foreground leading-tight">
            {title}
          </h1>
          {description ? (
            <p className="hidden truncate text-xs text-muted-foreground md:block font-medium">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="relative flex shrink-0 items-center gap-1 sm:gap-2.5">
        {/* Notification Bell Button */}
        <button
          type="button"
          aria-label="Notification center"
          onClick={() => {
            window.location.hash = '#/mechanic/technician/notification'
          }}
          className={`relative flex size-9 sm:size-10 items-center justify-center rounded-sm transition-colors cursor-pointer ${
            isNotificationActive
              ? 'bg-blue-50 text-blue-700 dark:bg-white/10 dark:text-blue-300'
              : 'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          <NotificationBellIndicator unreadCount={unreadCount}>
            <Bell className="size-4.5 sm:size-5" />
          </NotificationBellIndicator>
        </button>

        {/* Profile Dropdown Trigger */}
        <div ref={profileMenuRef} className="relative">
          <button
            type="button"
            aria-label="Profile menu"
            onClick={() => setProfileOpen?.((prev) => !prev)}
            className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 text-foreground hover:bg-accent rounded-sm transition-colors cursor-pointer"
          >
            <span className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-bold leading-none text-white shadow-xs">
              {userInitial}
            </span>
            <span className="hidden lg:inline-block max-w-[110px] truncate text-xs font-bold uppercase tracking-wider">
              {user?.fullName ? user.fullName.split(' ')[0] : 'Tech'}
            </span>
            <ChevronDown
              className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
                profileOpen ? 'rotate-180 text-foreground' : ''
              }`}
            />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-md border border-slate-200 dark:border-border/80 bg-white dark:bg-slate-900 shadow-2xl z-50 divide-y divide-slate-100 dark:divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-sm font-extrabold text-white shadow-xs">
                  {userInitial}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground">
                    {user?.fullName || 'Mechanic / Technician'}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">{user?.email || ''}</p>
                  <span className="inline-flex items-center gap-1 mt-1 rounded-sm border border-[#081F5C]/20 bg-[#081F5C]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#081F5C] dark:text-blue-300">
                    Mechanic / Technician
                  </span>
                </div>
              </div>

              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen?.(false)
                    window.location.hash = '#/mechanic/technician/work-info'
                  }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-accent transition-colors cursor-pointer"
                >
                  <Settings className="size-4 text-muted-foreground" />
                  <span>Work Info</span>
                </button>
              </div>

              <div className="p-1">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen?.(false)
                    requestLogout?.()
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
  )
}

/**
 * Shared booking row — same data model as Assigned requests / shop Service requests.
 * @param {{ b: object, footer?: import('react').ReactNode, className?: string }} props
 */
export function MechanicBookingCard({ b, footer, className = '' }) {
  const CategoryIcon = b.shopService ? categoryIcon(b.shopService.category) : categoryIcon(b.serviceCategory)
  const hasPin =
    typeof b.serviceLatitude === 'number' &&
    Number.isFinite(b.serviceLatitude) &&
    typeof b.serviceLongitude === 'number' &&
    Number.isFinite(b.serviceLongitude)
  const priceLabel = currencyPhp(b.startingPrice)

  return (
    <div
      className={`flex w-full flex-col overflow-hidden rounded-sm border border-[#081F5C]/10 bg-white shadow-sm ring-1 ring-black/2 transition-colors hover:border-[#1447a6]/28 dark:border-white/10 dark:bg-[#020818]/95 dark:ring-white/5${className ? ` ${className}` : ''}`}
    >
      <div className="p-3 sm:p-3.5">
        <div className="flex items-start gap-2.5">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-bold text-white"
            aria-hidden
          >
            {initialsFromName(b.contactName)}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-base font-semibold leading-tight text-foreground">{b.contactName || '—'}</h3>
                  {bookingStatusBadge(b.status)}
                </div>
                <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                  Ref {b.ref || b.id.slice(-8)} · {b.shopName || 'Shop'}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground sm:text-sm">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-[#081F5C]/55" aria-hidden />
                  <a href={`tel:${b.contactPhone}`} className="font-medium text-[#1447a6] hover:underline dark:text-sky-300">
                    {b.contactPhone || '—'}
                  </a>
                  {b.customer?.fullName && b.customer.fullName.trim() !== String(b.contactName || '').trim() ? (
                    <>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="inline-flex min-w-0 items-center gap-1 truncate">
                        <User className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
                        <span className="truncate">{b.customer.fullName}</span>
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
              <div className="shrink-0 text-right" title={b.createdAt ? new Date(b.createdAt).toLocaleString() : ''}>
                <p className="text-xs leading-tight sm:text-sm">
                  <span className="font-semibold text-muted-foreground">Submitted: </span>
                  <span className="whitespace-nowrap font-normal tabular-nums text-foreground/90">{formatSubmittedLine(b.createdAt)}</span>
                </p>
              </div>
            </div>

            <p className="line-clamp-3 text-sm leading-relaxed text-foreground/90">{b.problemDescription || '—'}</p>

            <div className="flex flex-wrap items-center gap-1.5">
              {b.shopService?.category ? categoryBadge(b.shopService.category) : b.serviceCategory ? categoryBadge(b.serviceCategory) : null}
              <Badge
                variant="outline"
                className="inline-flex items-center gap-1 border-[#081F5C]/12 bg-white/90 px-2 py-0.5 text-xs font-medium text-[#081F5C] dark:border-white/10 dark:bg-white/5 dark:text-blue-100"
              >
                {b.serviceMode === 'home' ? (
                  <Home className="h-3 w-3 shrink-0" aria-hidden />
                ) : (
                  <Store className="h-3 w-3 shrink-0" aria-hidden />
                )}
                {serviceModeLabel(b.serviceMode)}
              </Badge>
              <span className="inline-flex min-w-0 max-w-full items-center gap-1 text-xs text-muted-foreground sm:text-[13px]">
                <CategoryIcon className="h-3.5 w-3.5 shrink-0 text-[#081F5C]/50" aria-hidden />
                <span className="truncate">{b.shopService?.name || b.serviceName || '—'}</span>
              </span>
              {priceLabel ? (
                <Badge variant="secondary" className="text-xs font-semibold tabular-nums">
                  From {priceLabel}
                </Badge>
              ) : null}
            </div>

            <div className="inline-flex w-fit items-center gap-1.5 rounded-sm border border-[#081F5C]/10 bg-slate-50/90 px-2 py-1 text-xs font-medium text-foreground dark:border-white/10 dark:bg-white/5 sm:text-[13px]">
              <CalendarClock className="h-3.5 w-3.5 shrink-0 text-[#081F5C]/60" aria-hidden />
              <span className="tabular-nums">{formatPreferredDate(b.preferredDate)}</span>
              <span className="text-muted-foreground">·</span>
              <span className="tabular-nums">{formatTime12h(b.preferredTime)}</span>
            </div>

            {b.serviceMode === 'home' && b.serviceAddress ? (
              <p className="flex gap-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#081F5C]/55" aria-hidden />
                <span>{b.serviceAddress}</span>
              </p>
            ) : null}
            {b.serviceMode === 'home' && hasPin ? (
              <a
                href={`https://www.google.com/maps?q=${b.serviceLatitude},${b.serviceLongitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#1447a6] hover:underline dark:text-sky-300"
              >
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                Open in Maps
              </a>
            ) : null}
            {b.notes?.trim() ? (
              <div className="rounded-sm border border-dashed border-border/70 bg-muted/20 px-2.5 py-1.5 text-xs leading-relaxed dark:bg-white/5 sm:text-sm">
                <span className="font-medium text-foreground">Notes · </span>
                <span className="text-muted-foreground">{b.notes.trim()}</span>
              </div>
            ) : null}
            {b.status === 'cancelled' && b.rejectionReason?.trim() ? (
              <div className="rounded-sm border border-red-200/60 bg-red-50/80 px-2.5 py-1.5 text-xs leading-relaxed dark:border-red-500/25 dark:bg-red-950/25 sm:text-sm">
                <span className="font-medium text-red-900 dark:text-red-200">Rejection reason · </span>
                <span className="text-red-800/90 dark:text-red-100/90">{b.rejectionReason.trim()}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {footer != null ? (
        <div className="flex w-full flex-wrap items-center justify-end border-t border-[#081F5C]/10 bg-slate-50/60 px-3 py-2 dark:border-white/10 dark:bg-white/4">
          <div className="flex w-full flex-wrap items-center justify-end gap-2">{footer}</div>
        </div>
      ) : null}
    </div>
  )
}
