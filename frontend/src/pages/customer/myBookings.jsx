import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import {
  Bike,
  Calendar,
  ChevronDown,
  FileText,
  Home,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Smartphone,
  Star,
  User,
  WashingMachine,
  Wrench,
} from 'lucide-react'
import CustomerLayout, { readCustomerUserSession } from '../../layout/customerlayout.jsx'
import { SERVICE_TYPES } from './findServices.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

/**
 * Tabs match E-Paayos booking workflow (see `bookingModel.js`: pending → confirmed → working → completed, or cancelled).
 */
const BOOKING_TABS = ['All bookings', 'Pending', 'Confirmed', 'Working', 'Completed', 'Cancelled']

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/** Normalizes `GET /api/catalog/bookings` rows for this page. */
function mapBookingFromApi(row) {
  if (!row || !row.id) return null
  return {
    id: String(row.id),
    ref: String(row.ref || ''),
    shopServiceId: String(row.shopServiceId || ''),
    serviceName: row.serviceName || 'Service',
    shopName: row.shopName || 'Shop',
    category: row.category || '',
    subcategory: row.subcategory || '',
    listingType: row.listingType || 'in-shop',
    serviceMode: row.serviceMode === 'home' ? 'home' : 'in-shop',
    contactName: row.contactName || '',
    contactPhone: row.contactPhone || '',
    date: row.date || '',
    preferredTime: row.preferredTime || '',
    serviceAddress: row.serviceAddress || '',
    issuePhotos: Array.isArray(row.issuePhotos) ? row.issuePhotos.filter(Boolean) : [],
    problemDescription: row.problemDescription || '',
    notes: row.notes || '',
    status: String(row.status || 'pending').toLowerCase(),
    rejectionReason: row.rejectionReason || '',
    acceptedPaymentMethods: Array.isArray(row.acceptedPaymentMethods) ? row.acceptedPaymentMethods : [],
    serviceFeeLaborRateAtCalc:
      row.serviceFeeLaborRateAtCalc != null && Number.isFinite(Number(row.serviceFeeLaborRateAtCalc))
        ? Number(row.serviceFeeLaborRateAtCalc)
        : null,
    serviceFeeMaterialsAmount:
      row.serviceFeeMaterialsAmount != null && Number.isFinite(Number(row.serviceFeeMaterialsAmount))
        ? Number(row.serviceFeeMaterialsAmount)
        : null,
    serviceFeeReplacementParts: Array.isArray(row.serviceFeeReplacementParts)
      ? row.serviceFeeReplacementParts
          .map((x) => ({
            name: typeof x?.name === 'string' ? x.name : '',
            price: Number.isFinite(Number(x?.price)) ? Number(x.price) : 0,
          }))
          .filter((x) => x.name)
      : [],
    serviceFeeConfirmedAt: row.serviceFeeConfirmedAt || null,
    paymentStatus: row.paymentStatus || 'unpaid',
    paymentMethod: row.paymentMethod || '',
    paymentProofImage: row.paymentProofImage || '',
    paidAt: row.paidAt || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function formatPhp(amount) {
  const n = Number(amount || 0)
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(n)
  } catch {
    return `PHP ${Math.round(n).toLocaleString('en-PH')}`
  }
}

function resolveIssuePhotoSrc(src) {
  const value = String(src ?? '').trim()
  if (!value) return ''
  if (/^(data:|blob:)/i.test(value)) return value
  if (value.startsWith('/uploads/')) return `${API_URL}${value}`
  if (/^https?:\/\//i.test(value)) {
    // Best-effort remap legacy localhost URLs to configured API base.
    try {
      const parsed = new URL(value)
      const host = (parsed.hostname || '').toLowerCase()
      if (host === 'localhost' || host === '127.0.0.1') {
        const api = new URL(API_URL)
        parsed.protocol = api.protocol
        parsed.host = api.host
        return parsed.toString()
      }
    } catch {
      // ignore
    }
    return value
  }
  return value
}

function IssuePhotoThumb({ src, label, size = 'sm' }) {
  const [failed, setFailed] = useState(false)
  const resolvedSrc = resolveIssuePhotoSrc(src)
  const boxClass = size === 'lg' ? 'h-20 w-20' : 'h-16 w-16'

  return (
    <a href={resolvedSrc || '#'} target="_blank" rel="noopener noreferrer" className="group block" title={label}>
      <div
        className={`relative ${boxClass} overflow-hidden rounded-none border border-[#081F5C]/20 bg-slate-100 dark:border-white/15 dark:bg-slate-800/60`}
      >
        {!failed ? (
          <img
            src={resolvedSrc}
            alt={label}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.05]"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-medium text-slate-600 dark:text-slate-300">
            No preview
          </div>
        )}
      </div>
    </a>
  )
}

const selectShell =
  'h-9 w-full appearance-none rounded-none border border-slate-200 bg-white px-3 py-2 pr-8 text-xs sm:text-sm shadow-[0_2px_5px_rgba(15,23,42,0.14)] outline-none focus-visible:ring-1 focus-visible:ring-[#081F5C] focus-visible:border-[#081F5C] transition-all hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)] hover:border-slate-300'

function statusBadge(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'completed') {
    return (
      <Badge className="shrink-0 border border-emerald-500/30 bg-emerald-500/10 text-[11px] font-medium text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200">
        Completed
      </Badge>
    )
  }
  if (s === 'cancelled' || s === 'canceled') {
    return (
      <Badge className="shrink-0 border border-rose-500/30 bg-rose-500/10 text-[11px] font-medium text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-200">
        Cancelled
      </Badge>
    )
  }
  if (s === 'confirmed') {
    return (
      <Badge className="shrink-0 border border-sky-500/30 bg-sky-500/10 text-[11px] font-medium text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-200">
        Confirmed
      </Badge>
    )
  }
  if (s === 'working') {
    return (
      <Badge className="shrink-0 border border-violet-500/35 bg-violet-500/12 text-[11px] font-medium text-violet-900 dark:border-violet-400/40 dark:bg-violet-950/40 dark:text-violet-200">
        Working
      </Badge>
    )
  }
  return (
    <Badge className="shrink-0 border border-amber-500/30 bg-amber-500/10 text-[11px] font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200">
      Pending
    </Badge>
  )
}

function bookingProgressHint(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'pending') return 'Waiting for the shop to accept this request.'
  if (s === 'confirmed') return 'The shop confirmed your booking — they will start when ready.'
  if (s === 'working') return 'Your service is in progress.'
  if (s === 'completed') return 'This job is completed.'
  if (s === 'cancelled' || s === 'canceled') return 'This request was cancelled.'
  return ''
}

function bookingMatchesTab(activeTab, b) {
  if (activeTab === 'All bookings') return true
  const s = String(b.status || '').toLowerCase()
  if (activeTab === 'Pending') return s === 'pending'
  if (activeTab === 'Confirmed') return s === 'confirmed'
  if (activeTab === 'Working') return s === 'working'
  if (activeTab === 'Completed') return s === 'completed'
  if (activeTab === 'Cancelled') return s === 'cancelled' || s === 'canceled'
  return true
}

function categoryIcon(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return Bike
  if (normalized === 'gadget') return Smartphone
  if (normalized === 'appliance') return WashingMachine
  return Wrench
}

function categoryBadgeClass(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return 'bg-linear-to-r from-sky-600 to-blue-700 text-white'
  if (normalized === 'gadget') return 'bg-linear-to-r from-violet-600 to-fuchsia-600 text-white'
  if (normalized === 'appliance') return 'bg-linear-to-r from-emerald-600 to-teal-600 text-white'
  if (normalized === 'others') return 'bg-linear-to-r from-amber-500 to-orange-500 text-white'
  return 'bg-linear-to-r from-slate-600 to-slate-700 text-white'
}

/** How the customer chose to receive service (matches booking form). */
function serviceModeBadge(mode) {
  const label = SERVICE_TYPES.find((x) => x.value === mode)?.label ?? '—'
  return (
    <Badge variant="outline" className="border-[#081F5C]/15 bg-white/90 text-[11px] font-medium text-[#081F5C] dark:border-white/10 dark:bg-white/5 dark:text-blue-100">
      {label}
    </Badge>
  )
}

/** Catalog listing type on Service Details (home / in-shop / both). */
function listingTypeBadge(listingType) {
  const label = SERVICE_TYPES.find((x) => x.value === listingType)?.label ?? '—'
  return (
    <Badge variant="outline" className="border-[#081F5C]/12 bg-slate-50/90 text-[10px] font-medium text-muted-foreground dark:border-white/10 dark:bg-white/5">
      Listing: {label}
    </Badge>
  )
}

function formatPreferredTime12h(hm) {
  const s = String(hm ?? '').trim()
  const m = s.match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
  if (!m) return s || '—'
  let h = parseInt(m[1], 10)
  const mins = m[2]
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${mins} ${ap}`
}

function formatPreferredDateLong(ymd) {
  const str = String(ymd ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return str || '—'
  const d = new Date(`${str}T12:00:00`)
  if (Number.isNaN(d.getTime())) return str
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

function formatSubmittedLine(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${date} · ${time}`
}

function parseBookingDate(b) {
  const d = `${b.date}T12:00:00`
  const t = Date.parse(d)
  return Number.isFinite(t) ? t : 0
}

function parseDateOnly(str) {
  if (!str || typeof str !== 'string') return null
  const [y, m, d] = str.split('-').map(Number)
  if (!y || !m || !d) return null
  const dt = new Date(y, m - 1, d)
  return Number.isFinite(dt.getTime()) ? dt : null
}

function bookingMatchesDateFilter(b, dateFilter) {
  if (dateFilter === 'All') return true
  const bookingDate = parseDateOnly(b.date)
  if (!bookingDate) return true
  const now = new Date()
  const startOfDay = (d) => {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
  }
  const endOfDay = (d) => {
    const x = new Date(d)
    x.setHours(23, 59, 59, 999)
    return x
  }
  const startOfWeek = (d) => {
    const dt = new Date(d)
    const day = (dt.getDay() + 6) % 7
    dt.setHours(0, 0, 0, 0)
    dt.setDate(dt.getDate() - day)
    return dt
  }
  const endOfWeek = (d) => {
    const s = startOfWeek(d)
    const e = new Date(s)
    e.setDate(s.getDate() + 7)
    return e
  }
  const startOfMonth = (d) => {
    const dt = new Date(d.getFullYear(), d.getMonth(), 1)
    dt.setHours(0, 0, 0, 0)
    return dt
  }
  const endOfMonth = (d) => {
    const dt = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    dt.setHours(0, 0, 0, 0)
    return dt
  }

  if (dateFilter === 'Today') {
    return bookingDate >= startOfDay(now) && bookingDate <= endOfDay(now)
  }
  if (dateFilter === 'Yesterday') {
    const y = new Date(now)
    y.setDate(now.getDate() - 1)
    return bookingDate >= startOfDay(y) && bookingDate <= endOfDay(y)
  }
  if (dateFilter === 'This Week') {
    return bookingDate >= startOfWeek(now) && bookingDate < endOfWeek(now)
  }
  if (dateFilter === 'Last Week') {
    const last = new Date(now)
    last.setDate(now.getDate() - 7)
    return bookingDate >= startOfWeek(last) && bookingDate < endOfWeek(last)
  }
  if (dateFilter === 'This Month') {
    return bookingDate >= startOfMonth(now) && bookingDate < endOfMonth(now)
  }
  if (dateFilter === 'Last Month') {
    const lastM = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return bookingDate >= startOfMonth(lastM) && bookingDate < endOfMonth(lastM)
  }
  return true
}

function BookingsSearchBar({ value, onChange }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="relative h-9 w-full min-w-0 shrink-0">
        <Input
          className="h-9 w-full min-w-0 rounded-none border border-slate-200 bg-white pr-12 pl-4 text-xs sm:text-sm shadow-[0_2px_5px_rgba(15,23,42,0.14)] focus-visible:ring-1 focus-visible:ring-[#081F5C] focus-visible:border-[#081F5C] transition-all hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)] hover:border-slate-300"
          placeholder="Search by service, shop, or reference…"
          value={value}
          onChange={onChange}
          aria-label="Search bookings"
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

function CustomerMyBookings() {
  const [user, setUser] = useState(readCustomerUserSession)

  const [activeTab, setActiveTab] = useState('All bookings')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('All')
  const [sortBy, setSortBy] = useState('soonest')
  const [q, setQ] = useState('')
  const [viewing, setViewing] = useState(null)
  const [payingBooking, setPayingBooking] = useState(null)
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('')
  const [paymentProofImage, setPaymentProofImage] = useState('')
  const [payError, setPayError] = useState('')
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  const loadBookings = useCallback(async () => {
    setListError('')
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        window.location.hash = '#/login'
        return
      }
      const res = await fetch(`${API_URL}/api/catalog/bookings`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || 'Could not load your bookings.')
      }
      const raw = Array.isArray(data?.bookings) ? data.bookings : []
      setBookings(raw.map(mapBookingFromApi).filter(Boolean))
    } catch (e) {
      setBookings([])
      setListError(e?.message || 'Could not load bookings.')
    } finally {
      setLoading(false)
    }
  }, [])


  useEffect(() => {
    if (!user) return
    void loadBookings()
  }, [user, loadBookings])

  useEffect(() => {
    if (!user) return
    const onFocus = () => {
      void loadBookings()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [user, loadBookings])


  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()

    const base = bookings.filter((b) => {
      if (!bookingMatchesTab(activeTab, b)) return false
      if (categoryFilter && String(b.category || '').trim().toLowerCase() !== categoryFilter.trim().toLowerCase()) return false
      if (!bookingMatchesDateFilter(b, dateFilter)) return false
      if (!query) return true
      const hay =
        `${b.serviceName} ${b.shopName} ${b.ref} ${b.category} ${b.subcategory ?? ''} ${b.problemDescription} ${b.notes} ${b.contactName} ${b.contactPhone} ${b.rejectionReason ?? ''}`.toLowerCase()
      return hay.includes(query)
    })

    const sorted = [...base]
    switch (sortBy) {
      case 'newest-request':
        sorted.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        break
      case 'last-updated':
        sorted.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
        break
      case 'soonest':
      default:
        sorted.sort((a, b) => parseBookingDate(a) - parseBookingDate(b))
        break
    }
    return sorted
  }, [bookings, activeTab, categoryFilter, dateFilter, q, sortBy])

  const payBreakdown = useMemo(() => {
    const b = payingBooking
    if (!b) return { labor: 0, parts: 0, total: 0 }
    const labor = Number.isFinite(Number(b.serviceFeeLaborRateAtCalc)) ? Number(b.serviceFeeLaborRateAtCalc) : 0
    const parts = Number.isFinite(Number(b.serviceFeeMaterialsAmount)) ? Number(b.serviceFeeMaterialsAmount) : 0
    return { labor, parts, total: labor + parts }
  }, [payingBooking])

  const paymentMethodsForDialog = useMemo(() => {
    const list =
      payingBooking && Array.isArray(payingBooking.acceptedPaymentMethods)
        ? payingBooking.acceptedPaymentMethods.filter((m) => m && typeof m === 'object' && typeof m.id === 'string')
        : []
    const hasCash = list.some((m) => m.type === 'cash_on_service')
    if (!hasCash) {
      list.push({
        id: 'cash_on_service',
        type: 'cash_on_service',
        accountName: '',
        details: '',
        notes: 'Pay face-to-face upon service completion.',
        qrImage: '',
      })
    }
    if (list.length > 0) return list
    return [
      {
        id: 'cash_on_service',
        type: 'cash_on_service',
        accountName: '',
        details: '',
        notes: 'Pay face-to-face upon service completion.',
        qrImage: '',
      },
    ]
  }, [payingBooking])

  const selectedPaymentMethod = useMemo(
    () => paymentMethodsForDialog.find((m) => m.id === selectedPaymentMethodId) || null,
    [paymentMethodsForDialog, selectedPaymentMethodId],
  )

  useEffect(() => {
    if (!selectedPaymentMethod || selectedPaymentMethod.type !== 'cash_on_service') return
    setPaymentProofImage('')
  }, [selectedPaymentMethod])

  useEffect(() => {
    if (!payingBooking) return
    setSelectedPaymentMethodId('')
    setPaymentProofImage('')
  }, [payingBooking, paymentMethodsForDialog])

  const submitPayNow = useCallback(async () => {
    if (!payingBooking) return
    setPayError('')
    if (!selectedPaymentMethodId) {
      setPayError('Please choose a payment method.')
      return
    }
    if (selectedPaymentMethod && selectedPaymentMethod.type !== 'cash_on_service' && !paymentProofImage) {
      setPayError('Please upload proof of payment.')
      return
    }
    setIsSubmittingPayment(true)
    try {
      const res = await fetch(`${API_URL}/api/catalog/bookings/${encodeURIComponent(payingBooking.id)}/pay`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          paymentMethod: selectedPaymentMethodId,
          paymentProofImage: selectedPaymentMethod?.type === 'cash_on_service' ? '' : paymentProofImage,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Payment failed.')
      const mapped = mapBookingFromApi(data?.booking)
      if (mapped) {
        setBookings((prev) => prev.map((x) => (x.id === mapped.id ? mapped : x)))
      } else {
        await loadBookings()
      }
      setPayingBooking(null)
      setSelectedPaymentMethodId('')
      setPaymentProofImage('')
      setPayError('')
    } catch (e) {
      setPayError(e?.message || 'Payment failed.')
    } finally {
      setIsSubmittingPayment(false)
    }
  }, [payingBooking, selectedPaymentMethodId, selectedPaymentMethod, paymentProofImage, loadBookings])


  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-sky-50 via-violet-50 to-indigo-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <CustomerLayout activePage="my-bookings">

      <main className="mx-auto w-full max-w-[1440px] space-y-4 px-6 pb-8 pt-6 sm:px-10 md:px-16">
        {listError ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-none border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span>{listError}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadBookings()} disabled={loading}>
              Retry
            </Button>
          </div>
        ) : null}

        <div
          className="mb-4 flex w-full items-stretch overflow-x-auto rounded-none border border-slate-200 bg-white p-1 shadow-[0_2px_5px_rgba(15,23,42,0.08)] sm:overflow-visible"
          role="tablist"
          aria-label="Booking status"
        >
          {BOOKING_TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={activeTab === t}
              onClick={() => setActiveTab(t)}
              className={`flex-none whitespace-nowrap rounded-none px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider transition-all sm:flex-1 sm:px-4 sm:text-xs ${
                activeTab === t
                  ? 'bg-linear-to-r from-[#081F5C] to-[#1447a6] text-white shadow-sm ring-1 ring-[#081F5C]/25'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#081F5C]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mb-1 flex min-w-0 w-full max-w-full flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative min-w-[200px]">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={selectShell}
                aria-label="Filter by category"
              >
                <option value="">All categories</option>
                <option value="Appliance">Appliance</option>
                <option value="Gadget">Gadget</option>
                <option value="Vehicle">Vehicle</option>
                <option value="Others">Others</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3 w-3 -translate-y-1/2 text-gray-500" />
            </div>
            <div className="relative min-w-[200px]">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className={selectShell}
                aria-label="Filter by date"
              >
                <option value="All">All dates</option>
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="This Week">This week</option>
                <option value="Last Week">Last week</option>
                <option value="This Month">This month</option>
                <option value="Last Month">Last month</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3 w-3 -translate-y-1/2 text-gray-500" />
            </div>
            <div className="relative min-w-[200px]">
              <select
                className={selectShell}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort bookings"
              >
                <option value="soonest">Sort: Soonest date</option>
                <option value="newest-request">Sort: Newest request</option>
                <option value="last-updated">Sort: Last updated (status changes)</option>
              </select>
              <Calendar className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>
          <div className="w-full min-w-60 sm:w-1/2 sm:max-w-md sm:flex-1">
            <BookingsSearchBar value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        <div className="min-w-0 max-w-full space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[#081F5C] dark:text-slate-50">Your booking requests</p>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                {loading
                  ? 'Loading your requests from the server…'
                  : bookings.length === 0
                    ? 'Book a service from Service Details — your requests appear here for you and the shop (Service requests).'
                    : filtered.length === bookings.length
                      ? `Showing all ${bookings.length} request${bookings.length === 1 ? '' : 's'}.`
                      : `Showing ${filtered.length} of ${bookings.length} requests.`}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => {
                  window.location.hash = '#/customer/find-services'
                }}
                className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-none bg-[#081F5C] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_2px_5px_rgba(15,23,42,0.14)] transition-all hover:bg-[#0a2770] hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)] focus-visible:ring-1 focus-visible:ring-[#081F5C] sm:text-sm"
              >
                <Search className="h-4 w-4" />
                Find services
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-none border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center dark:border-white/15 dark:bg-[#020818]">
              <Loader2 className="h-8 w-8 animate-spin text-[#081F5C] dark:text-blue-300" aria-hidden />
              <p className="mt-3 text-sm font-medium text-foreground">Loading bookings…</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">Same data your shop sees under Service requests.</p>
            </div>
          ) : bookings.length === 0 ? (
            listError ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Use <span className="font-medium text-foreground">Retry</span> above to load your list.</p>
            ) : (
              <div className="flex min-h-[180px] flex-col items-center justify-center rounded-none border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm ring-1 ring-black/2 dark:border-white/15 dark:bg-[#020818] dark:ring-white/5">
                <p className="text-sm font-medium text-foreground">No booking requests yet</p>
                <p className="mt-1 max-w-md text-xs text-muted-foreground">
                  Use <span className="font-medium text-foreground">Book Now</span> on a service page — your request will show here and on the shop&apos;s Service requests page.
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    window.location.hash = '#/customer/find-services'
                  }}
                  className="mt-4 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-none bg-[#081F5C] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_2px_5px_rgba(15,23,42,0.14)] transition-all hover:bg-[#0a2770] hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)] focus-visible:ring-1 focus-visible:ring-[#081F5C] sm:text-sm"
                >
                  Browse services
                </Button>
              </div>
            )
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-none border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm ring-1 ring-black/2 dark:border-white/15 dark:bg-[#020818] dark:ring-white/5">
              <p className="text-sm font-medium text-foreground">No bookings match</p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">Try clearing filters or search, or book a new service.</p>
              <Button
                type="button"
                onClick={() => {
                  setActiveTab('All bookings')
                  setCategoryFilter('')
                  setDateFilter('All')
                  setQ('')
                  window.location.hash = '#/customer/find-services'
                }}
                className="mt-4 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-none bg-[#081F5C] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_2px_5px_rgba(15,23,42,0.14)] transition-all hover:bg-[#0a2770] hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)] focus-visible:ring-1 focus-visible:ring-[#081F5C] sm:text-sm"
              >
                Browse services
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((b) => {
                const CategoryIcon = categoryIcon(b.category)
                return (
                  <Card
                    key={b.id}
                    className="shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-300 hover:border-[#081F5C] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#081F5C] bg-white rounded-none border border-slate-200"
                  >
                    <CardContent className="flex flex-col gap-3 p-3.5 sm:p-4">
                      {/* Header Row */}
                      <div className="flex flex-col justify-between gap-1.5 sm:flex-row sm:items-start">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-[#081F5C]/10 text-[#081F5C]">
                            <CategoryIcon className="h-5 w-5" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-base font-bold text-slate-900">{b.serviceName}</p>
                              <div className="shrink-0">{statusBadge(b.status)}</div>
                            </div>
                            <p className="mt-0.5 truncate text-xs font-semibold text-slate-700">
                              {b.shopName} {b.subcategory?.trim() ? <span className="font-normal text-slate-500">• {b.subcategory.trim()}</span> : null}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className="rounded-none border-slate-200 bg-slate-50 font-mono text-[10px] text-slate-500">Ref: {b.ref}</Badge>
                              <Badge className={`rounded-none text-[10px] ${categoryBadgeClass(b.category)}`}>{b.category || '—'}</Badge>
                              {serviceModeBadge(b.serviceMode)}
                            </div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end sm:gap-0 sm:text-right">
                          <p className="text-[11px] font-medium text-slate-500">Submitted</p>
                          <p className="text-xs font-semibold text-slate-700">{formatSubmittedLine(b.createdAt)}</p>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 gap-1.5 border border-slate-100 bg-slate-50/50 p-2 sm:grid-cols-2">
                        {/* Schedule & Address */}
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-xs">
                            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                            <div>
                              <p className="leading-tight font-semibold text-slate-700">Preferred Schedule</p>
                              <p className="mt-0.5 text-slate-600">{formatPreferredDateLong(b.date)} • {formatPreferredTime12h(b.preferredTime)}</p>
                            </div>
                          </div>
                          {b.serviceMode === 'home' && b.serviceAddress?.trim() ? (
                            <div className="flex items-start gap-2 text-xs">
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                              <div className="min-w-0">
                                <p className="leading-tight font-semibold text-slate-700">Service Address</p>
                                <p className="mt-0.5 line-clamp-1 text-slate-600" title={b.serviceAddress.trim()}>{b.serviceAddress.trim()}</p>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        
                        {/* Issue & Contact */}
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-xs">
                            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                            <div className="min-w-0">
                              <p className="leading-tight font-semibold text-slate-700">Issue Description</p>
                              <p className="mt-0.5 line-clamp-1 text-slate-600" title={b.problemDescription}>{b.problemDescription || '—'}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2 text-xs">
                            <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                            <div className="min-w-0">
                              <p className="leading-tight font-semibold text-slate-700">Contact Person</p>
                              <p className="mt-0.5 text-slate-600">{b.contactName} • {b.contactPhone}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Hint & Photos row */}
                      {(bookingProgressHint(b.status) || (Array.isArray(b.issuePhotos) && b.issuePhotos.length > 0) || b.notes?.trim()) ? (
                        <div className="flex flex-col justify-between gap-1.5 sm:flex-row sm:items-start">
                          <div className="min-w-0 flex-1 space-y-2">
                            {bookingProgressHint(b.status) ? (
                              <p className="inline-block border border-slate-100 bg-slate-50 px-2.5 py-1 text-[11px] italic text-slate-500">
                                {bookingProgressHint(b.status)}
                              </p>
                            ) : null}
                            {b.notes?.trim() ? (
                              <p className="line-clamp-1 text-[11px] text-slate-600"><span className="font-semibold text-slate-800">Notes:</span> {b.notes.trim()}</p>
                            ) : null}
                          </div>
                          {Array.isArray(b.issuePhotos) && b.issuePhotos.length > 0 ? (
                            <div className="flex shrink-0 gap-1.5">
                              {b.issuePhotos.slice(0, 3).map((src, photoIndex) => (
                                <a key={`${b.id}-photo-${photoIndex}`} href={resolveIssuePhotoSrc(src)} target="_blank" rel="noopener noreferrer" className="block h-10 w-10 shrink-0 overflow-hidden rounded-none border border-slate-200 transition-opacity hover:opacity-80" title={`View issue photo ${photoIndex + 1}`}>
                                  <img src={resolveIssuePhotoSrc(src)} alt={`Issue ${photoIndex + 1}`} className="h-full w-full object-cover" />
                                </a>
                              ))}
                              {b.issuePhotos.length > 3 && (
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none border border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500">
                                  +{b.issuePhotos.length - 3}
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {/* Footer Actions */}
                      <div className="flex flex-wrap justify-end gap-1.5 border-t border-slate-100 pt-1.5 mt-0.5">
                        {String(b.status).toLowerCase() === 'completed' ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 gap-1 rounded-none bg-[#081F5C] px-3 text-[11px] font-semibold uppercase tracking-wider text-white shadow-[0_1px_3px_rgba(15,23,42,0.14)] transition-all hover:bg-[#0a2770] hover:shadow-[0_2px_5px_rgba(15,23,42,0.2)] focus-visible:ring-1 focus-visible:ring-[#081F5C]"
                              onClick={() => {
                                window.location.hash = '#/customer/messages'
                              }}
                            >
                              <MessageCircle className="h-3 w-3 shrink-0 opacity-95" aria-hidden />
                              Message
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 rounded-none border border-amber-300 bg-amber-50 px-3 text-[11px] font-semibold uppercase tracking-wider text-amber-900 shadow-[0_1px_3px_rgba(15,23,42,0.14)] transition-all hover:bg-amber-100 hover:shadow-[0_2px_5px_rgba(15,23,42,0.2)] focus-visible:ring-1 focus-visible:ring-amber-500"
                              onClick={() => {
                                window.location.hash = '#/customer/reviews-ratings'
                              }}
                            >
                              <Star className="h-3 w-3 shrink-0" aria-hidden />
                              Rate Service
                            </Button>
                          </>
                        ) : (
                          <>
                            {String(b.status).toLowerCase() === 'working' &&
                            b.serviceFeeConfirmedAt &&
                            String(b.paymentStatus || '').toLowerCase() !== 'paid' ? (
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 rounded-none bg-emerald-600 px-3 text-[11px] font-semibold uppercase tracking-wider text-white shadow-[0_1px_3px_rgba(15,23,42,0.14)] transition-all hover:bg-emerald-700 hover:shadow-[0_2px_5px_rgba(15,23,42,0.2)] focus-visible:ring-1 focus-visible:ring-emerald-700"
                                onClick={() => {
                                  setPayingBooking(b)
                                  setPayError('')
                                }}
                              >
                                Pay Now
                              </Button>
                            ) : null}
                            {String(b.paymentStatus || '').toLowerCase() === 'paid' ? (
                              <Badge className="flex h-7 items-center justify-center rounded-none border border-emerald-500/35 bg-emerald-500/10 px-3 text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                                Paid
                              </Badge>
                            ) : null}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 rounded-none border border-slate-200 bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-[#081F5C] shadow-[0_1px_3px_rgba(15,23,42,0.14)] transition-all hover:border-slate-300 hover:shadow-[0_2px_5px_rgba(15,23,42,0.2)] focus-visible:ring-1 focus-visible:ring-[#081F5C] disabled:pointer-events-none disabled:opacity-50"
                              disabled={!b.shopServiceId?.trim()}
                              onClick={() => {
                                if (!b.shopServiceId?.trim()) return
                                window.location.hash = `#/customer/shop/${encodeURIComponent(b.shopServiceId)}`
                              }}
                            >
                              View service
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 rounded-none border border-slate-200 bg-white px-4 text-xs font-semibold uppercase tracking-wider text-[#081F5C] shadow-[0_2px_5px_rgba(15,23,42,0.14)] transition-all hover:border-slate-300 hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)] focus-visible:ring-1 focus-visible:ring-[#081F5C] sm:text-sm"
                              onClick={() => setViewing(b)}
                            >
                              Details
                            </Button>
                          </>
                        )}
                        {String(b.status).toLowerCase() !== 'completed' ? (
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 gap-1 rounded-none bg-[#081F5C] px-3 text-[11px] font-semibold uppercase tracking-wider text-white shadow-[0_1px_3px_rgba(15,23,42,0.14)] transition-all hover:bg-[#0a2770] hover:shadow-[0_2px_5px_rgba(15,23,42,0.2)] focus-visible:ring-1 focus-visible:ring-[#081F5C]"
                              onClick={() => {
                                window.location.hash = '#/customer/messages'
                              }}
                            >
                              <MessageCircle className="h-3 w-3 shrink-0 opacity-95" aria-hidden />
                            Message
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="flex max-h-[calc(100vh-3.5rem)] flex-col gap-4 overflow-hidden sm:max-w-lg" showCloseButton>
          {viewing ? (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle className="pr-6">{viewing.serviceName}</DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{viewing.shopName}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="font-mono text-xs">{viewing.ref}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {statusBadge(viewing.status)}
                      <Badge className={categoryBadgeClass(viewing.category)}>{viewing.category || '—'}</Badge>
                      {serviceModeBadge(viewing.serviceMode)}
                      {listingTypeBadge(viewing.listingType)}
                    </div>
                    {bookingProgressHint(viewing.status) ? (
                      <p className="text-xs leading-snug text-muted-foreground">{bookingProgressHint(viewing.status)}</p>
                    ) : null}
                  </div>

                  <div className="rounded-none border border-[#081F5C]/10 bg-slate-50/60 p-4 dark:border-white/10 dark:bg-white/4">
                    <p className="text-xs font-medium text-muted-foreground">Preferred schedule</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {formatPreferredDateLong(viewing.date)}{' '}
                      <span className="font-normal text-muted-foreground">at</span> {formatPreferredTime12h(viewing.preferredTime)}
                    </p>
                  </div>

                  <div className="rounded-none border border-[#081F5C]/10 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs font-medium text-muted-foreground">Contact on booking</p>
                    <p className="mt-1 text-sm text-foreground">
                      {viewing.contactName} <span className="text-muted-foreground">·</span>{' '}
                      <span className="tabular-nums">{viewing.contactPhone}</span>
                    </p>
                  </div>

                  {viewing.serviceMode === 'home' && viewing.serviceAddress?.trim() ? (
                    <div className="rounded-none border border-[#081F5C]/10 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                      <p className="text-xs font-medium text-muted-foreground">Service address</p>
                      <p className="mt-1 flex items-start gap-2 text-sm text-foreground">
                        <Home className="mt-0.5 h-4 w-4 shrink-0 text-[#081F5C]/70 dark:text-blue-300/80" aria-hidden />
                        <span className="whitespace-pre-wrap">{viewing.serviceAddress.trim()}</span>
                      </p>
                    </div>
                  ) : null}

                  <div className="rounded-none border border-[#081F5C]/10 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs font-medium text-muted-foreground">Issue / service description</p>
                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-foreground">{viewing.problemDescription}</p>
                    {Array.isArray(viewing.issuePhotos) && viewing.issuePhotos.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-[#081F5C] dark:text-slate-100">
                          Uploaded issue photo{viewing.issuePhotos.length === 1 ? '' : 's'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {viewing.issuePhotos.slice(0, 6).map((src, photoIndex) => (
                            <IssuePhotoThumb
                              key={`${viewing.id}-details-photo-${photoIndex}`}
                              src={src}
                              label={`Issue photo ${photoIndex + 1}`}
                              size="lg"
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {viewing.notes?.trim() ? (
                    <div className="rounded-none border border-[#081F5C]/10 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                      <p className="text-xs font-medium text-muted-foreground">Additional notes</p>
                      <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-foreground">{viewing.notes.trim()}</p>
                    </div>
                  ) : null}

                  {String(viewing.status).toLowerCase() === 'cancelled' && viewing.rejectionReason?.trim() ? (
                    <div className="rounded-none border border-rose-500/25 bg-rose-500/5 p-4 dark:border-rose-500/30 dark:bg-rose-950/20">
                      <p className="text-xs font-medium text-rose-800 dark:text-rose-200">Message from the shop</p>
                      <p className="mt-1 text-sm text-rose-900 dark:text-rose-100">{viewing.rejectionReason.trim()}</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <DialogFooter className="shrink-0 gap-2 sm:gap-3">
                <Button type="button" variant="outline" className="h-9 rounded-none border border-slate-200 bg-white px-4 text-xs font-semibold uppercase tracking-wider text-[#081F5C] shadow-[0_2px_5px_rgba(15,23,42,0.14)] transition-all hover:border-slate-300 hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)] focus-visible:ring-1 focus-visible:ring-[#081F5C] sm:text-sm" onClick={() => setViewing(null)}>
                  Close
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-none border border-slate-200 bg-white px-4 text-xs font-semibold uppercase tracking-wider text-[#081F5C] shadow-[0_2px_5px_rgba(15,23,42,0.14)] transition-all hover:border-slate-300 hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)] focus-visible:ring-1 focus-visible:ring-[#081F5C] sm:text-sm"
                  onClick={() => {
                    setViewing(null)
                    window.location.hash = '#/customer/find-services'
                  }}
                >
                  Find services
                </Button>
                <Button
                  type="button"
                  className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-none bg-[#081F5C] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_2px_5px_rgba(15,23,42,0.14)] transition-all hover:bg-[#0a2770] hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)] focus-visible:ring-1 focus-visible:ring-[#081F5C] sm:text-sm"
                  disabled={!viewing.shopServiceId?.trim()}
                  onClick={() => {
                    const id = viewing.shopServiceId
                    if (!id?.trim()) return
                    setViewing(null)
                    window.location.hash = `#/customer/shop/${encodeURIComponent(id)}`
                  }}
                >
                  Open service
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(payingBooking)}
        onOpenChange={(open) => {
          if (!open) {
            setPayingBooking(null)
            setSelectedPaymentMethodId('')
            setPaymentProofImage('')
            setPayError('')
          }
        }}
      >
        <DialogContent className="flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden sm:max-w-lg" showCloseButton>
          {payingBooking ? (
            <>
              <DialogHeader>
                <DialogTitle>Pay Now</DialogTitle>
                <DialogDescription>
                  Service fee to pay for <span className="font-medium text-foreground">{payingBooking.serviceName}</span> from{' '}
                  <span className="font-medium text-foreground">{payingBooking.shopName}</span>.
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                <div className="rounded-none border border-[#081F5C]/15 bg-slate-50/70 p-3">
                  <p className="text-xs font-semibold text-muted-foreground">Service fee set by provider</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Labor Price</span>
                      <span className="font-semibold tabular-nums">{formatPhp(payBreakdown.labor)}</span>
                    </div>
                    {Array.isArray(payingBooking.serviceFeeReplacementParts) && payingBooking.serviceFeeReplacementParts.length > 0 ? (
                      <div className="pt-1">
                        <p className="mb-1 text-xs font-semibold text-muted-foreground">Replacement Part</p>
                        <div className="space-y-1">
                          {payingBooking.serviceFeeReplacementParts.map((part, idx) => (
                            <div key={`${payingBooking.id}-part-${idx}`} className="flex items-center justify-between text-sm">
                              <span>{part.name}</span>
                              <span className="tabular-nums">{formatPhp(part.price)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between border-t border-[#081F5C]/10 pt-2 font-semibold">
                      <span>Estimated Total</span>
                      <span className="tabular-nums">{formatPhp(payBreakdown.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Choose payment method</p>
                  <select
                    value={selectedPaymentMethodId}
                    onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
                    className="h-10 w-full rounded-none border border-[#081F5C]/20 bg-white px-3 text-sm outline-none focus:border-[#1447a6]"
                  >
                    <option value="" disabled>
                      Select payment method
                    </option>
                    {paymentMethodsForDialog.map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.type === 'cash_on_service' ? 'Cash (on-site)' : method.type === 'maya' ? 'Maya' : 'GCash'}
                      </option>
                    ))}
                  </select>
                  {selectedPaymentMethod ? (
                    <div className="rounded-none border border-[#081F5C]/15 bg-white p-3 text-sm">
                      {selectedPaymentMethod.type === 'cash_on_service' ? (
                        <p className="text-muted-foreground">Cash (on-site): pay face-to-face to the service provider.</p>
                      ) : (
                        <div className="space-y-1.5">
                          <p>
                            <span className="font-semibold">Account number:</span>{' '}
                            {selectedPaymentMethod.details?.trim() || '—'}
                          </p>
                          <p>
                            <span className="font-semibold">Account Name:</span>{' '}
                            {selectedPaymentMethod.accountName?.trim() || '—'}
                          </p>
                          {selectedPaymentMethod.qrImage ? (
                            <div className="pt-1">
                              <p className="mb-1 text-xs font-semibold">QR code</p>
                              <img
                                src={selectedPaymentMethod.qrImage}
                                alt="Payment QR"
                                className="mx-auto h-44 w-44 rounded border border-[#081F5C]/15 object-cover"
                              />
                            </div>
                          ) : null}
                          <p>
                            <span className="font-semibold">Notes:</span>{' '}
                            {selectedPaymentMethod.notes?.trim() || '—'}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}
                  {selectedPaymentMethod && selectedPaymentMethod.type !== 'cash_on_service' ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Upload proof of payment (receipt screenshot)</p>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          if (!file.type.startsWith('image/')) {
                            setPayError('Please upload an image file for proof of payment.')
                            e.target.value = ''
                            return
                          }
                          if (file.size > 5 * 1024 * 1024) {
                            setPayError('Proof image must be 5MB or less.')
                            e.target.value = ''
                            return
                          }
                          try {
                            const dataUrl = await new Promise((resolve, reject) => {
                              const reader = new FileReader()
                              reader.onload = () => resolve(String(reader.result || ''))
                              reader.onerror = () => reject(new Error('Failed to read proof image.'))
                              reader.readAsDataURL(file)
                            })
                            setPaymentProofImage(dataUrl)
                            setPayError('')
                          } catch {
                            setPayError('Unable to read proof image.')
                          } finally {
                            e.target.value = ''
                          }
                        }}
                      />
                      {paymentProofImage ? (
                        <img
                          src={paymentProofImage}
                          alt="Proof of payment preview"
                          className="h-40 w-full rounded-none border border-[#081F5C]/15 bg-slate-50 object-contain"
                        />
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {payError ? <p className="text-sm text-destructive">{payError}</p> : null}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" className="h-9 rounded-none border border-slate-200 bg-white px-4 text-xs font-semibold uppercase tracking-wider text-[#081F5C] shadow-[0_2px_5px_rgba(15,23,42,0.14)] transition-all hover:border-slate-300 hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)] focus-visible:ring-1 focus-visible:ring-[#081F5C] sm:text-sm" onClick={() => setPayingBooking(null)} disabled={isSubmittingPayment}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="h-9 rounded-none bg-emerald-600 px-4 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_2px_5px_rgba(15,23,42,0.14)] transition-all hover:bg-emerald-700 hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)] focus-visible:ring-1 focus-visible:ring-emerald-700 sm:text-sm"
                  disabled={isSubmittingPayment || !selectedPaymentMethodId}
                  onClick={() => void submitPayNow()}
                >
                  {isSubmittingPayment ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Processing...
                    </>
                  ) : (
                    'Confirm Payment'
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  )
}

export default CustomerMyBookings
