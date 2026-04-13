import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Bell,
  Bike,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Clock,
  FileText,
  Landmark,
  Layers,
  LogOut,
  MapPin,
  Navigation,
  MessageCircle,
  Settings,
  Smartphone,
  Star,
  Store,
  Tag,
  ThumbsUp,
  User,
  Users,
  WashingMachine,
  Wrench,
} from 'lucide-react'
import ShopAddressGoogleMap from '../../components/ShopAddressGoogleMap.jsx'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent } from '../../components/ui/card'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog.jsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { NativeSelect } from '../../components/ui/native-select'
import { Textarea } from '../../components/ui/textarea'
import logoEpaayos from '../../assets/epaayos_logo.png'
import { resolveProfilePsgcLabels } from '../../lib/psgcResolve'
import { SERVICE_TYPES, staffAssignedLabel } from './findServices.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

/**
 * Sample completed jobs: customer, work done, completion date/time (local).
 * Replace with API data when booking/review history is exposed per shop.
 */
const MOCK_COMPLETED_WORKS = [
  {
    id: 'cw-1',
    customerName: 'Maria S. Reyes',
    whatWasFixed: 'Two-door refrigerator — compressor replacement and refrigerant recharge; leak tested OK.',
    completedAt: '2025-03-12T09:15:00',
  },
  {
    id: 'cw-2',
    customerName: 'John Paul L. Cruz',
    whatWasFixed: 'iPhone 12 — OLED + battery swap, calibration and water gasket check before handoff.',
    completedAt: '2025-03-18T14:45:00',
  },
  {
    id: 'cw-3',
    customerName: 'Angelo T. Mendoza',
    whatWasFixed: '125cc motorcycle — full tune-up, brake fluid flush, chain clean & tension.',
    completedAt: '2025-04-02T16:00:00',
  },
  {
    id: 'cw-4',
    customerName: 'Liezel Ann K. Bautista',
    whatWasFixed: 'Top-load washer — noisy spin traced to worn bearings; bearing kit installed.',
    completedAt: '2025-04-05T11:30:00',
  },
  {
    id: 'cw-5',
    customerName: 'Rico M. Villanueva',
    whatWasFixed: 'Window-type AC — deep clean, capacitor check, and pressure test.',
    completedAt: '2025-04-08T08:00:00',
  },
  {
    id: 'cw-6',
    customerName: 'Denise P. Ocampo',
    whatWasFixed: 'Laptop — SSD upgrade + OS reinstall, data migrated to new drive.',
    completedAt: '2025-04-10T13:20:00',
  },
]

/**
 * Sample reviews for this service / shop — same shape as a future reviews API.
 * Replace when per-service or per-shop reviews are exposed to customers.
 */
const MOCK_SERVICE_REVIEWS = [
  {
    id: 'sr-1',
    overallRating: 5,
    customerName: 'Rhea D. Castillo',
    comment:
      'Malinis ang trabaho sa ref namin, maayos magpaliwanag ang technician. Babalik kami dito sa shop na ito.',
    createdAt: '2025-04-01T10:30:00',
    shopResponse: 'Salamat po sa tiwala — glad we could help with the refrigerator.',
    images: [],
  },
  {
    id: 'sr-2',
    overallRating: 4,
    customerName: 'Mark Anthony V.',
    comment: 'On time for home service. Fixed our washer same day.',
    createdAt: '2025-03-22T15:00:00',
    shopResponse: null,
    images: ['https://picsum.photos/seed/epaayos-r2/120/120'],
  },
  {
    id: 'sr-3',
    overallRating: 5,
    customerName: 'Anonymous',
    comment: '',
    createdAt: '2025-03-10T09:00:00',
    shopResponse: null,
    images: [],
  },
]

/** Time (left) + mm/dd/yyyy (right), using the viewer’s local timezone */
function formatCompletedWorkDateTime(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return { time: '—', date: '—' }
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yyyy = d.getFullYear()
  const date = `${mm}/${dd}/${yyyy}`
  let h24 = d.getHours()
  const mins = String(d.getMinutes()).padStart(2, '0')
  const ampm = h24 >= 12 ? 'PM' : 'AM'
  let h12 = h24 % 12
  if (h12 === 0) h12 = 12
  const time = `${h12}:${mins} ${ampm}`
  return { time, date }
}

function formatShopOwnerJoinedAt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Table row label: mechanics for vehicle, technicians otherwise */
function noOfTechnicianMechanicLabel(category) {
  return String(category || '').toLowerCase() === 'vehicle' ? 'No. of mechanics:' : 'No. of technicians:'
}

const SHOP_TABLE_ICON = 'h-3.5 w-3.5 shrink-0 text-[#081F5C]/75 dark:text-sky-300/85'
const SHOP_TABLE_ICON_ON_STRIP =
  'h-3.5 w-3.5 shrink-0 text-zinc-600 dark:text-zinc-400'

function ShopTableLabel({ icon: Icon, children, variant = 'default' }) {
  const onStrip = variant === 'dark'
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className={onStrip ? SHOP_TABLE_ICON_ON_STRIP : SHOP_TABLE_ICON} aria-hidden />
      <span className={onStrip ? 'text-zinc-800 dark:text-zinc-200' : undefined}>{children}</span>
    </span>
  )
}

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function isLikelyMongoId(id) {
  return typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id)
}

function reviewRatingValue(review) {
  const n = Number(review?.overallRating ?? review?.rating ?? 0)
  return Number.isFinite(n) ? n : 0
}

function initialsFromName(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return `${first}${second}`.toUpperCase()
}

function serviceTypeBadge(type) {
  const label = SERVICE_TYPES.find((x) => x.value === type)?.label ?? '—'
  return (
    <Badge variant="outline" className="border-[#081F5C]/15 bg-white/90 text-[11px] font-medium text-[#081F5C] dark:border-white/10 dark:bg-white/5 dark:text-blue-100">
      {label}
    </Badge>
  )
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

/** Today's date as YYYY-MM-DD in the user's local calendar */
function localDateInputMin() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Format YYYY-MM-DD for confirmation copy (locale-aware). */
function formatDateForConfirm(ymd) {
  const s = String(ymd ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || '—'
  const d = new Date(`${s}T12:00:00`)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

function truncateForSummary(text, max) {
  const t = String(text ?? '').trim()
  if (!t) return '—'
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

/** Default service mode from catalog `type` (shop service location). */
function defaultServiceMode(serviceType) {
  const t = String(serviceType ?? '')
  if (t === 'home') return 'home'
  if (t === 'in-shop') return 'in-shop'
  return 'in-shop'
}

/** Optional hover hint on Book Now — fields to complete (English). */
function bookingFieldsTooltip(serviceType) {
  const t = String(serviceType ?? '')
  const lines = [
    'Please have the following ready:',
    '• Contact full name',
    '• Mobile or telephone number',
    '• Preferred date and time',
    '• Clear description of the issue (brand/model, symptoms, when it started)',
  ]
  if (t === 'home') {
    lines.push('• Full service address (including landmarks if helpful)')
    lines.push('• Optional: share current location (GPS) for faster navigation')
  } else if (t === 'both') {
    lines.push('• In-shop visit or home service — full address required for home service')
    lines.push('• For home service: optional GPS pin via “Use current location”')
  } else {
    lines.push('• Bring the item to the shop (address is on this page)')
  }
  lines.push('• Optional: access notes, parking, preferred contact hours')
  return lines.join('\n')
}

/** Hide provider note when value is empty or a placeholder (e.g. "N/A"). */
function shouldShowProviderNote(value) {
  const t = String(value ?? '').trim()
  if (!t) return false
  const lower = t.toLowerCase()
  if (lower === 'n/a' || lower === 'na' || lower === 'n.a.' || lower === 'n.a' || lower === 'none' || lower === 'null')
    return false
  if (/^[\-—–]+$/.test(t)) return false
  return true
}

export default function CustomerServiceDetails({ serviceId }) {
  const [user, setUser] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileMenuRef = useRef(null)

  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(true)
  const [detailError, setDetailError] = useState('')
  const [mapAddressParts, setMapAddressParts] = useState(null)
  const [mapPartsResolving, setMapPartsResolving] = useState(false)
  const [shopContext, setShopContext] = useState(null)
  const [serviceReviewFilter, setServiceReviewFilter] = useState('all')

  const [bookDialogOpen, setBookDialogOpen] = useState(false)
  const [bookingConfirmOpen, setBookingConfirmOpen] = useState(false)
  const [bookSubmitting, setBookSubmitting] = useState(false)
  const [bookError, setBookError] = useState('')
  const [bookSuccess, setBookSuccess] = useState('')
  const [bookForm, setBookForm] = useState({
    contactName: '',
    contactPhone: '',
    preferredDate: '',
    preferredTime: '',
    serviceMode: 'in-shop',
    serviceAddress: '',
    serviceLatitude: null,
    serviceLongitude: null,
    problemDescription: '',
    notes: '',
  })
  const [locationCaptureLoading, setLocationCaptureLoading] = useState(false)
  const [locationCaptureError, setLocationCaptureError] = useState('')

  /** Customer GPS from booking form — shown as second pin on header map (home service). */
  const headerBookingLocationPin = useMemo(() => {
    if (bookForm.serviceMode !== 'home') return null
    if (
      typeof bookForm.serviceLatitude !== 'number' ||
      !Number.isFinite(bookForm.serviceLatitude) ||
      typeof bookForm.serviceLongitude !== 'number' ||
      !Number.isFinite(bookForm.serviceLongitude)
    ) {
      return null
    }
    return {
      lat: bookForm.serviceLatitude,
      lng: bookForm.serviceLongitude,
      label: 'Your location (booking preview)',
    }
  }, [bookForm.serviceMode, bookForm.serviceLatitude, bookForm.serviceLongitude])

  const serviceReviewsList = useMemo(() => MOCK_SERVICE_REVIEWS, [])

  const serviceReviewStats = useMemo(() => {
    const base = { stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, withComments: 0, withMedia: 0 }
    if (!serviceReviewsList.length) return base
    for (const review of serviceReviewsList) {
      const rating = Math.round(reviewRatingValue(review))
      if (rating >= 1 && rating <= 5) base.stars[rating] += 1
      if (typeof review?.comment === 'string' && review.comment.trim().length > 0) base.withComments += 1
      if (Array.isArray(review?.images) && review.images.length > 0) base.withMedia += 1
    }
    return base
  }, [serviceReviewsList])

  const serviceRatingAverage = useMemo(() => {
    const shop = Number(detail?.shopRating)
    if (detail && Number.isFinite(shop) && shop > 0) return Math.min(5, Math.max(0, shop))
    if (!serviceReviewsList.length) return 0
    const sum = serviceReviewsList.reduce((acc, r) => acc + reviewRatingValue(r), 0)
    return sum / serviceReviewsList.length
  }, [detail?.shopRating, serviceReviewsList])

  const serviceRatingCount = useMemo(() => {
    if (serviceReviewsList.length) return serviceReviewsList.length
    return 0
  }, [serviceReviewsList])

  const filteredServiceReviews = useMemo(() => {
    let list = serviceReviewsList
    if (serviceReviewFilter === 'all') return list
    if (serviceReviewFilter === 'comments') return list.filter((r) => typeof r?.comment === 'string' && r.comment.trim().length > 0)
    if (serviceReviewFilter === 'media') return list.filter((r) => Array.isArray(r?.images) && r.images.length > 0)
    const star = Number(serviceReviewFilter)
    if (star >= 1 && star <= 5) {
      return list.filter((r) => Math.round(reviewRatingValue(r)) === star)
    }
    return list
  }, [serviceReviewsList, serviceReviewFilter])

  const hasServiceRatings = serviceRatingCount > 0 && serviceRatingAverage > 0

  useEffect(() => {
    setServiceReviewFilter('all')
  }, [serviceId])

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
    if (!user) return
    if (!serviceId || !isLikelyMongoId(serviceId)) {
      setDetail(null)
      setShopContext(null)
      setDetailError('Invalid or missing service link.')
      setDetailLoading(false)
      return
    }

    let cancelled = false
    setDetailLoading(true)
    setDetailError('')
    setDetail(null)
    setShopContext(null)

    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/catalog/shop-services/context/${encodeURIComponent(serviceId)}`, {
          headers: authHeaders(),
        })
        const errBody = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(errBody?.message || 'Could not load service details.')
        }
        const data = errBody
        const list = Array.isArray(data?.services) ? data.services : []
        const focusId = data?.focusServiceId ? String(data.focusServiceId) : serviceId
        const focus = list.find((s) => s && String(s.id) === focusId) || list.find((s) => s && String(s.id) === String(serviceId))
        if (!focus) {
          throw new Error('Service not found or no longer available.')
        }
        const rated = list.filter((s) => Number(s?.shopRating) > 0)
        const shopAverageRating =
          rated.length > 0
            ? Math.round((rated.reduce((a, s) => a + Number(s.shopRating), 0) / rated.length) * 10) / 10
            : 0
        const derived = {
          activeServiceCount: list.length,
          totalCompletedBookings: list.reduce((a, s) => a + Math.max(0, Number(s?.completedJobs) || 0), 0),
          shopAverageRating,
        }
        const merged =
          data?.shopContext && typeof data.shopContext === 'object' ? { ...derived, ...data.shopContext } : derived
        if (!cancelled) {
          setDetail(focus)
          setShopContext(merged)
        }
      } catch (e) {
        if (!cancelled) {
          setDetailError(e?.message || 'Could not load service details.')
          setShopContext(null)
        }
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, serviceId])

  useEffect(() => {
    if (!detail) {
      setMapAddressParts(null)
      setMapPartsResolving(false)
      return
    }
    let cancelled = false
    setMapPartsResolving(true)
    ;(async () => {
      try {
        const labels = await resolveProfilePsgcLabels({
          shopRegion: detail.shopRegion,
          shopProvince: detail.shopProvince,
          shopCityMunicipality: detail.shopCityMunicipality,
          shopBarangay: detail.shopBarangay,
        })
        if (cancelled) return
        setMapAddressParts({
          detailedAddress: detail.shopDetailedAddress?.trim() || '',
          barangay: labels.shopBarangay || '',
          cityMunicipality: labels.shopCityMunicipality || '',
          province: labels.shopProvince || '',
          region: labels.shopRegion || '',
          landmark: detail.shopLandmark?.trim() || '',
        })
      } catch {
        if (cancelled) return
        setMapAddressParts({
          detailedAddress: detail.shopDetailedAddress?.trim() || '',
          barangay: String(detail.shopBarangay || '').trim(),
          cityMunicipality: String(detail.shopCityMunicipality || '').trim(),
          province: String(detail.shopProvince || '').trim(),
          region: String(detail.shopRegion || '').trim(),
          landmark: detail.shopLandmark?.trim() || '',
        })
      } finally {
        if (!cancelled) setMapPartsResolving(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [detail])

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

  const openBookDialog = () => {
    if (!detail || !serviceId) return
    setBookError('')
    setBookSuccess('')
    setBookingConfirmOpen(false)
    setLocationCaptureError('')
    setLocationCaptureLoading(false)
    setBookForm({
      contactName: '',
      contactPhone: '',
      preferredDate: '',
      preferredTime: '',
      serviceMode: defaultServiceMode(detail.type),
      serviceAddress: '',
      serviceLatitude: null,
      serviceLongitude: null,
      problemDescription: '',
      notes: '',
    })
    setBookDialogOpen(true)
  }

  const captureCustomerLocation = () => {
    if (!navigator.geolocation) {
      setLocationCaptureError('Location is not supported in this browser.')
      return
    }
    setLocationCaptureError('')
    setLocationCaptureLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBookForm((f) => ({
          ...f,
          serviceLatitude: pos.coords.latitude,
          serviceLongitude: pos.coords.longitude,
        }))
        setLocationCaptureLoading(false)
      },
      (err) => {
        setLocationCaptureLoading(false)
        let msg = 'Could not read your location.'
        if (err?.code === 1) {
          msg =
            'Location permission was denied. Allow location in your browser settings, or enter your address manually.'
        } else if (err?.code === 2) {
          msg = 'Location unavailable. Try again or enter your address manually.'
        } else if (err?.code === 3) {
          msg = 'Location request timed out. Try again.'
        }
        setLocationCaptureError(msg)
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60_000 }
    )
  }

  const handleBookingFormSubmit = (e) => {
    e.preventDefault()
    if (!detail || !serviceId || !isLikelyMongoId(serviceId)) return
    const form = e.currentTarget
    if (!form.reportValidity()) return
    setBookError('')
    setBookingConfirmOpen(true)
  }

  const performBookingSubmit = async () => {
    if (!detail || !serviceId || !isLikelyMongoId(serviceId)) return
    setBookingConfirmOpen(false)
    setBookError('')
    setBookSuccess('')
    setBookSubmitting(true)
    try {
      const payload = {
        shopServiceId: serviceId,
        contactName: bookForm.contactName.trim(),
        contactPhone: bookForm.contactPhone.trim(),
        preferredDate: bookForm.preferredDate.trim(),
        preferredTime: bookForm.preferredTime.trim(),
        serviceMode: bookForm.serviceMode,
        serviceAddress: bookForm.serviceMode === 'home' ? bookForm.serviceAddress.trim() : '',
        problemDescription: bookForm.problemDescription.trim(),
        notes: bookForm.notes.trim(),
      }
      if (
        bookForm.serviceMode === 'home' &&
        typeof bookForm.serviceLatitude === 'number' &&
        Number.isFinite(bookForm.serviceLatitude) &&
        typeof bookForm.serviceLongitude === 'number' &&
        Number.isFinite(bookForm.serviceLongitude)
      ) {
        payload.serviceLatitude = bookForm.serviceLatitude
        payload.serviceLongitude = bookForm.serviceLongitude
      }

      const res = await fetch(`${API_URL}/api/catalog/bookings`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || 'Could not submit booking.')
      }
      setBookSuccess(data?.message || 'Booking request sent.')
    } catch (err) {
      setBookError(err?.message || 'Could not submit booking.')
    } finally {
      setBookSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-sky-50 via-violet-50 to-indigo-100">
        <p className="text-gray-600 text-sm">Loading…</p>
      </div>
    )
  }

  const CategoryIcon = detail ? categoryIcon(detail.category) : Wrench

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-100 min-h-16 border-b border-transparent bg-linear-to-r from-[#04133d] via-[#081F5C] to-[#1447a6]">
        <div className="mx-auto flex h-full min-h-16 max-w-7xl items-center justify-between gap-3 px-1 py-2 sm:px-3 sm:py-2.5">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#/customer/find-services'
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
                className="h-8 w-auto max-h-10 max-w-[min(48vw,200px)] object-contain object-left sm:h-9"
                decoding="async"
              />
            </button>
            <span className="hidden sm:block h-6 w-px bg-white/40 ml-1 mr-1 shrink-0" />
            <div className="hidden sm:grid h-10 w-10 rounded-lg bg-white/15 border border-white/30 place-items-center shrink-0">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight min-w-0">
              <div className="text-base sm:text-xl font-bold text-white truncate">Service Details</div>
              <div className="text-[10px] sm:text-xs text-white/90 leading-snug sm:max-w-md line-clamp-2">
                {detailLoading
                  ? 'Loading shop and service information…'
                  : detail
                    ? (() => {
                        const shop = detail.shopName?.trim() || '—'
                        const owner = detail.shopOwner?.trim()
                        return owner ? `${shop} · ${owner}` : shop
                      })()
                    : 'Review shop details, location, and this service before booking.'}
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
              <Bell className="h-5 w-5" />
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
      </div>

      <div className="min-h-screen overflow-x-hidden bg-linear-to-b from-sky-50 via-violet-50 to-indigo-100 pt-16 pb-10 sm:pt-16">
        <div className="max-w-7xl mx-auto px-1 sm:px-3">
          {detailLoading ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed border-[#081F5C]/20 bg-white/60 px-6 py-12 text-center shadow-sm">
              <p className="text-sm font-medium text-foreground">Loading service details…</p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">Fetching the same catalog data shops use for this listing.</p>
            </div>
          ) : detailError ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-center text-sm text-destructive">
              <p>{detailError}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => {
                  window.location.hash = '#/customer/find-services'
                }}
              >
                Back to Find Services
              </Button>
            </div>
          ) : detail ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-0">
              <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2">
              <div className="relative isolate z-0 w-full min-h-[max(300px,min(480px,58vh))] overflow-hidden rounded-none border-x-0 border-t-0 border-b-0 border-[#081F5C]/10 bg-white/90 shadow-sm ring-1 ring-inset ring-black/5 dark:border-white/10 dark:bg-[#020818]/90 dark:ring-white/5">
                <div className="absolute inset-0 z-0 flex min-h-0 flex-col">
                  {mapPartsResolving ? (
                    <div
                      className="flex h-full min-h-[max(300px,min(480px,58vh))] w-full flex-1 items-center justify-center bg-slate-100/90 text-sm text-muted-foreground dark:bg-white/5"
                      role="status"
                      aria-live="polite"
                    >
                      Preparing map from shop address…
                    </div>
                  ) : (
                    <div className="flex min-h-0 flex-1 flex-col">
                      <ShopAddressGoogleMap
                        addressParts={mapAddressParts}
                        mapTitle={detail.shopName?.trim() ? `${detail.shopName.trim()} — shop location` : 'Shop location'}
                        showHeading={false}
                        flush
                        secondaryPin={headerBookingLocationPin}
                        emptyAddressHint="This shop has not added enough address detail to show a map pin. Use the written address below."
                      />
                    </div>
                  )}
                </div>

                <div className="pointer-events-none absolute inset-y-2.5 left-0 right-0 z-10 sm:inset-y-4">
                  <div className="mx-auto flex h-full w-full max-w-7xl items-start px-1 sm:px-3">
                    <aside
                      className="pointer-events-none flex max-h-full w-[min(19rem,100%)] max-w-full flex-col self-start sm:w-[min(22rem,100%)]"
                      aria-label="Shop summary"
                    >
                  <div className="pointer-events-auto flex w-full min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-[#081F5C]/40 bg-white/58 shadow-lg shadow-black/10 ring-1 ring-[#081F5C]/12 dark:border-[#1447a6]/55 dark:bg-white/40 dark:shadow-black/30 dark:ring-[#1447a6]/20">
                    <CardContent className="flex max-h-[min(32rem,72dvh)] flex-col gap-0 overflow-hidden border-0 bg-transparent p-0 text-shadow-[0_1px_2px_rgba(255,255,255,0.88)] shadow-none dark:text-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
                      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 pt-3 pb-2 sm:gap-4 sm:px-4 sm:pt-4 sm:pb-3">
                      <div>
                        <p className="flex items-start gap-2 text-sm font-semibold leading-snug sm:text-base">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/70 text-slate-700 ring-1 ring-[#081F5C]/18 sm:h-9 sm:w-9 sm:rounded-xl dark:bg-white/45 dark:text-white dark:ring-[#1447a6]/35">
                            <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                          </span>
                          <span className="min-w-0 text-slate-900 dark:text-white">{detail.shopName?.trim() || '—'}</span>
                        </p>
                      </div>

                      <div className="space-y-2.5 border-t border-dashed border-[#081F5C]/18 pt-2.5 dark:border-[#1447a6]/35 sm:space-y-3 sm:pt-3">
                        <div className="flex gap-2 text-sm">
                          <User className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600 sm:h-4 sm:w-4 dark:text-white/75" aria-hidden />
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600 sm:text-[11px] dark:text-white/65">
                              Shop owner
                            </p>
                            <p className="text-xs font-medium text-slate-900 sm:text-sm dark:text-white">{detail.shopOwner?.trim() || '—'}</p>
                          </div>
                        </div>

                        <div className="flex gap-2 text-sm">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600 sm:h-4 sm:w-4 dark:text-white/75" aria-hidden />
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600 sm:text-[11px] dark:text-white/65">
                              Address
                            </p>
                            <p className="text-xs leading-snug text-slate-900 sm:text-sm dark:text-white">{detail.shopAddress?.trim() || '—'}</p>
                          </div>
                        </div>

                        {detail.shopLandmark?.trim() ? (
                          <div className="flex gap-2 text-sm">
                            <Landmark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600 sm:h-4 sm:w-4 dark:text-amber-200/90" aria-hidden />
                            <div className="min-w-0">
                              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-600 sm:text-[11px] dark:text-white/65">
                                Landmark
                              </p>
                              <p className="text-xs leading-snug text-slate-900 sm:text-sm dark:text-white">{detail.shopLandmark.trim()}</p>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 border-t border-dashed border-[#081F5C]/18 pt-2.5 dark:border-[#1447a6]/35 sm:gap-2 sm:pt-3">
                        {serviceTypeBadge(detail.type)}
                        <Badge
                          variant="outline"
                          className="inline-flex items-center gap-1 border-[#081F5C]/30 bg-white/65 text-[10px] font-medium text-slate-800 sm:gap-1 sm:text-[11px] dark:border-[#1447a6]/45 dark:bg-white/35 dark:text-white"
                        >
                          <CalendarCheck className="h-2.5 w-2.5 shrink-0 opacity-90 sm:h-3 sm:w-3" aria-hidden />
                          {detail.completedJobs ?? 0} bookings
                        </Badge>
                        <Badge
                          variant="outline"
                          className="inline-flex items-center gap-0.5 border-[#081F5C]/30 bg-white/65 text-[10px] font-medium text-slate-800 sm:gap-1 sm:text-[11px] dark:border-[#1447a6]/45 dark:bg-white/35 dark:text-white"
                        >
                          <Star className="h-2.5 w-2.5 shrink-0 text-slate-700 dark:text-amber-200/90 sm:h-3 sm:w-3" aria-hidden />
                          {typeof detail.shopRating === 'number' && detail.shopRating > 0
                            ? `${detail.shopRating.toFixed(1)} rating`
                            : 'No ratings yet'}
                        </Badge>
                      </div>
                      </div>

                      <div className="shrink-0 border-t border-dashed border-[#081F5C]/18 bg-white/40 px-3 py-2.5 dark:border-[#1447a6]/35 dark:bg-white/15 sm:px-4">
                        <Button
                          type="button"
                          aria-label="Open messages to contact this shop"
                          className="h-9 w-full gap-2 rounded-lg bg-linear-to-r from-[#081F5C] to-[#1447a6] text-xs font-medium text-white shadow-sm hover:opacity-95 sm:h-10 sm:text-sm"
                          onClick={() => {
                            window.location.hash = '#/customer/messages'
                          }}
                        >
                          <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                          Message shop
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                    </aside>
                  </div>
                </div>
              </div>
              </div>

              <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2">
              <div
                className="overflow-x-auto rounded-none border-x-0 border-b border-t-0 border-zinc-400/45 bg-linear-to-r from-zinc-300 via-zinc-200 to-zinc-300 px-0 py-2 shadow-sm ring-1 ring-inset ring-zinc-400/30 dark:border-zinc-500/40 dark:bg-linear-to-r dark:from-zinc-700 dark:via-zinc-600 dark:to-zinc-700 dark:ring-zinc-500/25 sm:py-2.5"
                role="region"
                aria-label="Shop summary table"
              >
                <div className="mx-auto w-full max-w-7xl pl-20 pr-1 sm:pl-28 sm:pr-3">
                <table className="w-full min-w-[36rem] border-separate border-spacing-x-1 border-spacing-y-0 text-sm text-zinc-900 dark:text-zinc-100 sm:min-w-[42rem] sm:border-spacing-x-2 md:border-spacing-x-3">
                  <tbody>
                    <tr>
                      <td className="w-[24%] whitespace-nowrap py-1.5 align-top sm:py-2">
                        <ShopTableLabel icon={Layers} variant="dark">
                          No. of Services:
                        </ShopTableLabel>
                      </td>
                      <td className="w-[22%] py-1.5 align-top font-medium tabular-nums sm:py-2">
                        {shopContext?.activeServiceCount != null ? shopContext.activeServiceCount : '—'}
                      </td>
                      <td className="w-[24%] whitespace-nowrap border-l border-zinc-400/55 py-1.5 pl-6 align-top dark:border-zinc-500/50 sm:py-2 sm:pl-10 md:pl-14">
                        <ShopTableLabel icon={Clock} variant="dark">
                          Operating Hours:
                        </ShopTableLabel>
                      </td>
                      <td className="min-w-0 py-1.5 align-top font-medium wrap-break-word sm:py-2">
                        {detail.shopOperatingHours?.trim() ? detail.shopOperatingHours.trim() : '—'}
                      </td>
                    </tr>
                    <tr>
                      <td className="whitespace-nowrap py-1.5 align-top sm:py-2">
                        <ShopTableLabel icon={Tag} variant="dark">
                          Service Type:
                        </ShopTableLabel>
                      </td>
                      <td className="py-1.5 align-top font-medium sm:py-2">
                        {SERVICE_TYPES.find((x) => x.value === detail.type)?.label ?? '—'}
                      </td>
                      <td className="whitespace-nowrap border-l border-zinc-400/55 py-1.5 pl-6 align-top dark:border-zinc-500/50 sm:py-2 sm:pl-10 md:pl-14">
                        <ShopTableLabel icon={Star} variant="dark">
                          Ratings:
                        </ShopTableLabel>
                      </td>
                      <td className="min-w-0 py-1.5 align-top font-medium tabular-nums sm:py-2">
                        {(() => {
                          const shopAvg = Number(shopContext?.shopAverageRating) || 0
                          const svc = Number(detail.shopRating) || 0
                          if (shopAvg > 0) return `${shopAvg.toFixed(1)} / 5`
                          if (svc > 0) return `${svc.toFixed(1)} / 5`
                          return '—'
                        })()}
                      </td>
                    </tr>
                    <tr>
                      <td className="whitespace-nowrap py-1.5 align-top sm:py-2">
                        <ShopTableLabel icon={Users} variant="dark">
                          {noOfTechnicianMechanicLabel(detail.category)}
                        </ShopTableLabel>
                      </td>
                      <td className="py-1.5 align-top font-medium tabular-nums sm:py-2">
                        {(detail.staff ?? []).length}
                      </td>
                      <td className="whitespace-nowrap border-l border-zinc-400/55 py-1.5 pl-6 align-top dark:border-zinc-500/50 sm:py-2 sm:pl-10 md:pl-14">
                        <ShopTableLabel icon={CalendarDays} variant="dark">
                          Date Joined:
                        </ShopTableLabel>
                      </td>
                      <td className="min-w-0 py-1.5 align-top font-medium sm:py-2">
                        {formatShopOwnerJoinedAt(detail.shopOwnerJoinedAt)}
                      </td>
                    </tr>
                  </tbody>
                </table>
                </div>
              </div>
              </div>
              </div>

              <Card className="gap-0 py-0 overflow-hidden rounded-2xl border border-[#081F5C]/10 bg-white/95 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-[#020818]/95">
                <CardContent className="px-3 py-3 sm:px-4 sm:py-3.5">
                  <div className="flex flex-col gap-2 sm:gap-2.5">
                    <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
                      <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#081F5C]/12 text-[#081F5C] sm:h-11 sm:w-11">
                        <CategoryIcon className="h-5 w-5 sm:h-5 sm:w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold leading-snug text-foreground sm:text-lg">{detail.serviceName}</p>
                        <div className="mt-1 space-y-0">
                          <p className="text-sm font-semibold text-[#04133d] dark:text-slate-100">{detail.category || '—'}</p>
                          {detail.subcategory?.trim() ? (
                            <p className="text-sm text-muted-foreground">{detail.subcategory.trim()}</p>
                          ) : null}
                        </div>
                        <div className="mt-2 flex w-full min-w-0 items-center gap-2">
                          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1.5 sm:gap-x-2 sm:gap-y-2">
                            <Badge className={categoryBadgeClass(detail.category)}>{detail.category || '—'}</Badge>
                            {serviceTypeBadge(detail.type)}
                            <Badge className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200">
                              Active
                            </Badge>
                            <Badge
                              variant="outline"
                              className="inline-flex items-center gap-1 border-[#081F5C]/15 bg-white/90 text-[11px] font-medium text-[#081F5C] dark:border-white/10 dark:bg-white/5 dark:text-blue-100"
                            >
                              <CalendarCheck className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
                              {detail.completedJobs ?? 0} bookings
                            </Badge>
                            <Badge
                              variant="outline"
                              className="border-[#081F5C]/15 bg-white/90 text-[11px] font-medium text-[#081F5C] dark:border-white/10 dark:bg-white/5 dark:text-blue-100"
                            >
                              {typeof detail.shopRating === 'number' && detail.shopRating > 0
                                ? `${detail.shopRating.toFixed(1)} rating`
                                : 'No ratings yet'}
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            aria-label="Book this service now"
                            title={bookingFieldsTooltip(detail.type)}
                            className="h-9 shrink-0 gap-1.5 rounded-lg bg-linear-to-r from-[#081F5C] to-[#1447a6] px-4 text-xs font-semibold text-white shadow-sm hover:opacity-95 sm:px-5 sm:text-sm"
                            onClick={openBookDialog}
                          >
                            <CalendarCheck className="h-3.5 w-3.5 shrink-0 opacity-95" aria-hidden />
                            Book Now
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#081F5C]/10 pt-2.5 dark:border-white/10">
                      <div className="flex flex-wrap items-center gap-2">
                        {(detail.staff ?? []).length ? (
                          <>
                            <Users
                              className="h-4 w-4 shrink-0 text-[#081F5C]/70 dark:text-sky-300/80"
                              aria-hidden
                            />
                            <div className="inline-flex items-center gap-1.5">
                              {(detail.staff ?? []).slice(0, 4).map((name, idx) => (
                                <span
                                  key={`${String(name)}-${idx}`}
                                  title={String(name)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-[10px] font-semibold text-white shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                                >
                                  {initialsFromName(name)}
                                </span>
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {staffAssignedLabel(detail.category, (detail.staff ?? []).length)}
                            </span>
                          </>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Users className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                            No mechanics or technicians assigned to this service yet.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                  <p className="flex gap-2.5 text-sm leading-relaxed text-foreground">
                    <FileText
                      className="mt-0.5 h-4 w-4 shrink-0 text-[#081F5C]/65 dark:text-sky-300/75"
                      aria-hidden
                    />
                    <span className="min-w-0">{detail.description || '—'}</span>
                  </p>

                  <section className="pt-2" aria-labelledby="completed-works-heading">
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h2
                          id="completed-works-heading"
                          className="flex items-center gap-2 text-base font-semibold tracking-tight text-[#081F5C] dark:text-slate-50 sm:text-lg"
                        >
                          <ClipboardList className="h-5 w-5 shrink-0 text-[#081F5C]/80 dark:text-sky-300/85" aria-hidden />
                          Completed works
                        </h2>
                        <p className="mt-0.5 max-w-2xl text-xs text-muted-foreground sm:text-sm">
                          Customer, work completed for them, then date and time the job was completed. Sample rows until history is loaded from the server.
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="mt-1 w-fit shrink-0 border-dashed border-[#081F5C]/25 text-[10px] text-muted-foreground dark:border-white/15 sm:mt-0"
                      >
                        Sample data
                      </Badge>
                    </div>
                    <div
                      className="flex flex-nowrap gap-4 overflow-x-auto overscroll-x-contain pt-0.5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth snap-x snap-mandatory [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
                      role="list"
                      aria-label="Completed work entries"
                    >
                      {MOCK_COMPLETED_WORKS.map((job) => {
                        const { time, date } = formatCompletedWorkDateTime(job.completedAt)
                        return (
                        <article
                          key={job.id}
                          role="listitem"
                          className="w-[min(420px,calc(100vw-3rem))] shrink-0 snap-start rounded-xl border border-[#081F5C]/12 bg-white/95 p-5 shadow-sm dark:border-white/10 dark:bg-[#020818]/90 sm:w-[min(440px,calc(100vw-4rem))] md:w-[460px]"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-bold text-white ring-2 ring-white/80 shadow-sm dark:ring-white/20"
                              aria-hidden
                            >
                              {initialsFromName(job.customerName)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">{job.customerName}</p>
                              <p className="text-[11px] text-muted-foreground">Customer</p>
                            </div>
                          </div>
                          <div className="mt-3 border-t border-dashed border-[#081F5C]/15 pt-3 dark:border-white/10">
                            <p className="text-[11px] font-normal leading-snug text-muted-foreground/80 dark:text-muted-foreground/70">
                              Work completed for customer
                            </p>
                            <p className="mt-2 text-sm font-normal leading-relaxed text-foreground">{job.whatWasFixed}</p>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3 border-t border-dashed border-[#081F5C]/15 pt-3 text-sm tabular-nums dark:border-white/10">
                            <span className="shrink-0 font-semibold text-[#04133d] dark:text-slate-100">{time}</span>
                            <span className="min-w-0 text-right font-medium text-muted-foreground">{date}</span>
                          </div>
                        </article>
                        )
                      })}
                    </div>
                  </section>

                  <section className="pt-2" aria-labelledby="service-reviews-heading">
                    <div className="overflow-hidden rounded-2xl border border-[#081F5C]/10 bg-white/95 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-[#020818]/95">
                      <div className="px-4 py-4 sm:px-5 sm:py-5">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <h2
                            id="service-reviews-heading"
                            className="flex items-center gap-2 text-lg font-semibold text-[#081F5C] dark:text-slate-100 sm:text-xl"
                          >
                            <Star className="h-5 w-5 shrink-0 fill-amber-400/30 text-amber-500 dark:fill-amber-400/20 dark:text-amber-300/90" aria-hidden />
                            Reviews & Ratings
                          </h2>
                          <div className="flex shrink-0 items-center gap-2">
                            <Badge
                              variant="outline"
                              className="border-dashed border-[#081F5C]/25 text-[10px] text-muted-foreground dark:border-white/15"
                            >
                              Sample data
                            </Badge>
                            <button
                              type="button"
                              onClick={() => {
                                window.location.hash = '#/customer/reviews-ratings'
                              }}
                              className="text-sm font-medium text-[#1447a6] hover:text-[#081F5C] dark:text-sky-300 dark:hover:text-sky-200"
                            >
                              View all ›
                            </button>
                          </div>
                        </div>

                        <div className="mb-3 flex flex-wrap items-center gap-3">
                          <div className="text-xl font-bold text-foreground">
                            {hasServiceRatings ? `${serviceRatingAverage.toFixed(1)} out of 5` : 'No ratings yet'}
                          </div>
                          <div className="flex items-center" aria-hidden>
                            {[0, 1, 2, 3, 4].map((i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.floor(hasServiceRatings ? serviceRatingAverage : 0)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-muted-foreground/35'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="hidden h-4 w-px bg-border sm:block" />
                          <span className="text-sm text-muted-foreground">
                            {hasServiceRatings
                              ? `${serviceRatingCount} Review${serviceRatingCount === 1 ? '' : 's'}`
                              : 'No reviews yet'}
                          </span>
                        </div>

                        {serviceReviewsList.length > 0 ? (
                          <div className="mb-3 flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => setServiceReviewFilter('all')}
                              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                                serviceReviewFilter === 'all'
                                  ? 'border border-[#081F5C] bg-[#081F5C]/10 text-[#081F5C] dark:border-sky-400/60 dark:bg-sky-500/15 dark:text-sky-200'
                                  : 'border border-[#081F5C]/20 text-muted-foreground hover:border-[#081F5C]/40 dark:border-white/15 dark:hover:border-white/25'
                              }`}
                            >
                              All ({serviceRatingCount})
                            </button>
                            {[5, 4, 3, 2, 1].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setServiceReviewFilter(String(star))}
                                className={`rounded px-2.5 py-1 text-xs transition-colors ${
                                  serviceReviewFilter === String(star)
                                    ? 'border border-[#081F5C] bg-[#081F5C]/10 text-[#081F5C] dark:border-sky-400/60 dark:bg-sky-500/15 dark:text-sky-200'
                                    : 'border border-[#081F5C]/20 text-muted-foreground hover:border-[#081F5C]/40 dark:border-white/15 dark:hover:border-white/25'
                                }`}
                              >
                                {star} Star ({serviceReviewStats.stars[star] || 0})
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setServiceReviewFilter('comments')}
                              className={`rounded px-2.5 py-1 text-xs transition-colors ${
                                serviceReviewFilter === 'comments'
                                  ? 'border border-[#081F5C] bg-[#081F5C]/10 text-[#081F5C] dark:border-sky-400/60 dark:bg-sky-500/15 dark:text-sky-200'
                                  : 'border border-[#081F5C]/20 text-muted-foreground hover:border-[#081F5C]/40 dark:border-white/15 dark:hover:border-white/25'
                              }`}
                            >
                              With comments ({serviceReviewStats.withComments})
                            </button>
                            <button
                              type="button"
                              onClick={() => setServiceReviewFilter('media')}
                              className={`rounded px-2.5 py-1 text-xs transition-colors ${
                                serviceReviewFilter === 'media'
                                  ? 'border border-[#081F5C] bg-[#081F5C]/10 text-[#081F5C] dark:border-sky-400/60 dark:bg-sky-500/15 dark:text-sky-200'
                                  : 'border border-[#081F5C]/20 text-muted-foreground hover:border-[#081F5C]/40 dark:border-white/15 dark:hover:border-white/25'
                              }`}
                            >
                              With media ({serviceReviewStats.withMedia})
                            </button>
                          </div>
                        ) : null}

                        <div className="border-t border-[#081F5C]/10 pt-3 dark:border-white/10">
                          {filteredServiceReviews.length > 0 ? (
                            <ul className="divide-y divide-[#081F5C]/10 dark:divide-white/10">
                              {filteredServiceReviews.map((review) => {
                                const normalizedRating = Math.max(
                                  0,
                                  Math.min(5, Math.round(reviewRatingValue(review))),
                                )
                                const when = review.createdAt ? new Date(review.createdAt) : null
                                const dateStr =
                                  when && !Number.isNaN(when.getTime())
                                    ? `${when.toLocaleDateString('en-CA')} ${when.toLocaleTimeString('en-GB', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}`
                                    : '—'
                                const displayName =
                                  typeof review.customerName === 'string' && review.customerName.trim()
                                    ? review.customerName.trim()
                                    : 'Customer'
                                return (
                                  <li key={review.id} className="flex gap-3 py-4 first:pt-0">
                                    <div
                                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-bold text-white"
                                      aria-hidden
                                    >
                                      {initialsFromName(displayName)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-foreground">{displayName}</p>
                                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                        <div className="flex items-center" aria-label={`${normalizedRating} out of 5 stars`}>
                                          {[0, 1, 2, 3, 4].map((i) => (
                                            <Star
                                              key={i}
                                              className={`h-3 w-3 ${
                                                i < normalizedRating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/35'
                                              }`}
                                            />
                                          ))}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{dateStr}</span>
                                      </div>
                                      {typeof review.comment === 'string' && review.comment.trim().length > 0 ? (
                                        <p className="mt-2 text-sm leading-relaxed text-foreground">{review.comment.trim()}</p>
                                      ) : null}
                                      {Array.isArray(review.images) && review.images.length > 0 ? (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                          {review.images.slice(0, 4).map((src, imgIndex) => (
                                            <div
                                              key={`${review.id}-img-${imgIndex}`}
                                              className="h-12 w-12 overflow-hidden rounded border border-[#081F5C]/10 dark:border-white/10"
                                            >
                                              <img
                                                src={src}
                                                alt=""
                                                className="h-full w-full object-cover"
                                                loading="lazy"
                                                onError={(e) => {
                                                  e.currentTarget.style.display = 'none'
                                                }}
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      ) : null}
                                      {typeof review.shopResponse === 'string' && review.shopResponse.trim().length > 0 ? (
                                        <div className="mt-2 rounded-md border border-[#081F5C]/10 bg-muted/40 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                                          <p className="text-xs font-medium text-muted-foreground">Shop response</p>
                                          <p className="mt-1 text-sm text-foreground">{review.shopResponse.trim()}</p>
                                        </div>
                                      ) : null}
                                      <div className="mt-2">
                                        <button
                                          type="button"
                                          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                                        >
                                          <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
                                          Helpful?
                                        </button>
                                      </div>
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                          ) : serviceReviewsList.length > 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">No reviews match this filter.</p>
                          ) : (
                            <div className="py-6 text-center">
                              <p className="text-sm text-muted-foreground">No reviews yet</p>
                              <p className="mt-1 text-xs text-muted-foreground">Ratings will appear here after customers leave feedback.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <Dialog
        open={bookDialogOpen}
        onOpenChange={(open) => {
          setBookDialogOpen(open)
          if (!open) {
            setBookError('')
            setBookSuccess('')
            setBookingConfirmOpen(false)
          }
        }}
      >
        <DialogContent
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[min(84dvh,calc(100dvh-2rem))] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl p-0 sm:max-w-xl lg:max-w-2xl"
          showCloseButton={!bookSubmitting}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-5 pt-3 [scrollbar-gutter:stable] sm:px-5 sm:pb-6 sm:pt-4">
          <DialogHeader className="space-y-1.5 pr-10 text-center sm:text-left">
            <DialogTitle className="text-base text-[#081F5C] dark:text-sky-100 sm:text-lg">
              {bookSuccess ? 'Booking Completed' : 'Book this service'}
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed sm:text-sm">
              {bookSuccess ? (
                <>
                  Thank you — your request has been sent successfully.{' '}
                  {detail ? (
                    <>
                      <span className="font-medium text-foreground">{detail.shopName?.trim() || 'The shop'}</span> has received
                      your booking for <span className="font-medium text-foreground">{detail.serviceName}</span> and will review
                      it shortly.
                    </>
                  ) : (
                    'The service provider has received your booking and will review it shortly.'
                  )}{' '}
                  They may reach out using the contact details you provided. You can review this and other requests anytime under{' '}
                  <span className="font-medium text-foreground">My bookings</span>.
                </>
              ) : detail ? (
                <>
                  Complete all required fields so{' '}
                  <span className="font-medium text-foreground">{detail.shopName?.trim() || 'the shop'}</span> can review your
                  request for <span className="font-medium text-foreground">{detail.serviceName}</span>. Include your contact
                  details, preferred schedule, and a clear description of the issue
                  {detail.type === 'home'
                    ? '. A full service address is required for this home-service booking.'
                    : detail.type === 'both'
                      ? '. Choose in-shop or home service; a full address is required if you select home service.'
                      : '. You will bring the item to the shop — the shop address is shown on this page.'}
                </>
              ) : (
                'Complete the booking form below.'
              )}
            </DialogDescription>
          </DialogHeader>

          {detail && shouldShowProviderNote(detail.requirements) && !bookSuccess ? (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-foreground dark:border-amber-400/30 dark:bg-amber-500/10">
              <span className="font-semibold text-amber-900 dark:text-amber-100">Provider note: </span>
              {String(detail.requirements).trim()}
            </div>
          ) : null}

          {bookSuccess ? (
            <div className="space-y-3">
              <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-100 sm:text-sm">
                {bookSuccess}
              </p>
              <DialogFooter className="mx-0 mb-0 mt-0 flex w-full max-w-full flex-row flex-wrap items-center justify-end gap-2 border-0 bg-transparent p-0 pt-3 sm:pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => {
                    setBookDialogOpen(false)
                    window.location.hash = '#/customer/my-bookings'
                  }}
                >
                  View my bookings
                </Button>
                <Button
                  type="button"
                  className="shrink-0 bg-linear-to-r from-[#081F5C] to-[#1447a6] text-white"
                  onClick={() => setBookDialogOpen(false)}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleBookingFormSubmit} className="space-y-3">
              {bookError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive" role="alert">
                  {bookError}
                </p>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="book-contact-name">Contact full name</Label>
                <Input
                  id="book-contact-name"
                  name="contactName"
                  autoComplete="name"
                  required
                  value={bookForm.contactName}
                  onChange={(ev) => setBookForm((f) => ({ ...f, contactName: ev.target.value }))}
                  placeholder="Enter the name we should use for this booking"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="book-contact-phone">Mobile / phone number</Label>
                <Input
                  id="book-contact-phone"
                  name="contactPhone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={bookForm.contactPhone}
                  onChange={(ev) => setBookForm((f) => ({ ...f, contactPhone: ev.target.value }))}
                  placeholder="e.g. 09XX XXX XXXX"
                />
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="book-pref-date">Preferred service date</Label>
                  <Input
                    id="book-pref-date"
                    name="preferredDate"
                    type="date"
                    required
                    min={localDateInputMin()}
                    value={bookForm.preferredDate}
                    onChange={(ev) => setBookForm((f) => ({ ...f, preferredDate: ev.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="book-pref-time">Preferred time</Label>
                  <Input
                    id="book-pref-time"
                    name="preferredTime"
                    type="time"
                    required
                    value={bookForm.preferredTime}
                    onChange={(ev) => setBookForm((f) => ({ ...f, preferredTime: ev.target.value }))}
                  />
                </div>
              </div>

              {detail?.type === 'both' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="book-service-mode">Service option</Label>
                  <NativeSelect
                    id="book-service-mode"
                    name="serviceMode"
                    className="w-full"
                    required
                    value={bookForm.serviceMode}
                    onChange={(ev) => {
                      const mode = ev.target.value
                      setBookForm((f) => ({
                        ...f,
                        serviceMode: mode,
                        ...(mode !== 'home'
                          ? { serviceLatitude: null, serviceLongitude: null }
                          : {}),
                      }))
                      if (mode !== 'home') {
                        setLocationCaptureError('')
                        setLocationCaptureLoading(false)
                      }
                    }}
                  >
                    <option value="in-shop">In-shop visit </option>
                    <option value="home">Home service</option>
                  </NativeSelect>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {detail?.type === 'home'
                    ? 'This service is offered as home service only.'
                    : detail?.type === 'in-shop'
                      ? 'This service is in-shop only — please bring your item to the shop.'
                      : null}
                </p>
              )}

              {bookForm.serviceMode === 'home' ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="book-service-address">Service address</Label>
                    <Textarea
                      id="book-service-address"
                      name="serviceAddress"
                      required
                      rows={2}
                      value={bookForm.serviceAddress}
                      onChange={(ev) => setBookForm((f) => ({ ...f, serviceAddress: ev.target.value }))}
                      placeholder="Street, barangay, city, landmarks or building access details"
                      className="min-h-[4.25rem] resize-y"
                    />
                  </div>
                  <div className="rounded-lg border border-[#081F5C]/15 bg-muted/25 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs font-semibold text-foreground">Location pin (GPS)</p>
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          Share your current position so the technician can open it on a map. Your browser will ask for
                          permission. The written address above is still required.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 shrink-0 gap-1.5 self-start border-[#081F5C]/20 bg-white/90 text-[#081F5C] hover:bg-white dark:border-white/15 dark:bg-transparent dark:text-slate-100"
                        disabled={locationCaptureLoading || bookSubmitting}
                        onClick={captureCustomerLocation}
                      >
                        <Navigation className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {locationCaptureLoading ? 'Getting location…' : 'Use current location'}
                      </Button>
                    </div>
                    {locationCaptureError ? (
                      <p className="mt-2 text-xs text-destructive" role="alert">
                        {locationCaptureError}
                      </p>
                    ) : null}
                    {typeof bookForm.serviceLatitude === 'number' &&
                    Number.isFinite(bookForm.serviceLatitude) &&
                    typeof bookForm.serviceLongitude === 'number' &&
                    Number.isFinite(bookForm.serviceLongitude) ? (
                      <div className="mt-2 flex flex-col gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-2 text-xs dark:border-emerald-500/30 dark:bg-emerald-500/10">
                        <p className="font-medium text-emerald-900 dark:text-emerald-100">
                          Location saved for this request
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {bookForm.serviceLatitude.toFixed(6)}, {bookForm.serviceLongitude.toFixed(6)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={`https://www.google.com/maps?q=${bookForm.serviceLatitude},${bookForm.serviceLongitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#081F5C] underline-offset-2 hover:underline dark:text-sky-300"
                          >
                            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                            Open in Google Maps
                          </a>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground"
                            onClick={() => {
                              setBookForm((f) => ({ ...f, serviceLatitude: null, serviceLongitude: null }))
                              setLocationCaptureError('')
                            }}
                          >
                            Clear pin
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="book-problem">Issue or service description</Label>
                <Textarea
                  id="book-problem"
                  name="problemDescription"
                  required
                  rows={3}
                  value={bookForm.problemDescription}
                  onChange={(ev) => setBookForm((f) => ({ ...f, problemDescription: ev.target.value }))}
                  placeholder="Describe the device or item, brand/model if known, symptoms, and when the issue began"
                  className="min-h-[5rem] resize-y"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="book-notes">Additional notes (optional)</Label>
                <Textarea
                  id="book-notes"
                  name="notes"
                  rows={2}
                  value={bookForm.notes}
                  onChange={(ev) => setBookForm((f) => ({ ...f, notes: ev.target.value }))}
                  placeholder="e.g. gate codes, parking, preferred times to call"
                  className="min-h-12 resize-y"
                />
              </div>

              <DialogFooter className="mx-0 mb-0 mt-0 flex w-full max-w-full flex-row flex-wrap items-center justify-end gap-2 border-0 bg-transparent p-0 pt-3 sm:pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  disabled={bookSubmitting}
                  onClick={() => setBookDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={bookSubmitting}
                  className="shrink-0 bg-linear-to-r from-[#081F5C] to-[#1447a6] text-white"
                >
                  {bookSubmitting ? 'Submitting…' : 'Submit booking request'}
                </Button>
              </DialogFooter>
            </form>
          )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={bookingConfirmOpen}
        onOpenChange={(open) => {
          if (!open && bookSubmitting) return
          setBookingConfirmOpen(open)
        }}
      >
        <AlertDialogContent className="flex max-h-[min(58dvh,22rem)] w-full max-w-[calc(100%-1.5rem)] flex-col gap-3 overflow-hidden border border-[#081F5C]/10 p-4 shadow-lg sm:max-h-[min(62dvh,24rem)] sm:max-w-xl sm:p-5 lg:max-w-2xl dark:border-white/10">
          <AlertDialogHeader className="shrink-0 space-y-1.5 text-left sm:text-left">
            <AlertDialogTitle className="text-base font-semibold text-[#081F5C] dark:text-sky-100">
              Confirm your booking request
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left text-xs leading-snug text-muted-foreground sm:text-sm">
              Please review the summary below. By confirming, you certify that the information is correct to the best of your
              knowledge and that you wish to submit this booking request to the service provider for review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {detail ? (
            <div
              className="min-h-0 max-h-[min(28dvh,9.5rem)] shrink overflow-y-auto overscroll-contain rounded-lg border border-border/80 bg-muted/40 px-3 py-2.5 text-left text-foreground [-webkit-overflow-scrolling:touch] sm:max-h-[min(32dvh,11rem)] dark:bg-white/5"
              role="region"
              aria-label="Request summary"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Request summary</p>
              <dl className="mt-1.5 space-y-1.5 text-xs sm:space-y-2 sm:text-sm">
                <div>
                  <dt className="text-muted-foreground">Service</dt>
                  <dd className="font-medium">{detail.serviceName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Provider</dt>
                  <dd className="font-medium">{detail.shopName?.trim() || '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Contact</dt>
                  <dd className="font-medium">
                    {bookForm.contactName.trim() || '—'} · {bookForm.contactPhone.trim() || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Preferred schedule</dt>
                  <dd className="font-medium">
                    {formatDateForConfirm(bookForm.preferredDate)} · {bookForm.preferredTime || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Service option</dt>
                  <dd className="font-medium">{bookForm.serviceMode === 'home' ? 'Home service' : 'In-shop visit'}</dd>
                </div>
                {bookForm.serviceMode === 'home' ? (
                  <div>
                    <dt className="text-muted-foreground">Service address</dt>
                    <dd className="whitespace-pre-wrap font-medium">{truncateForSummary(bookForm.serviceAddress, 220)}</dd>
                  </div>
                ) : null}
                {bookForm.serviceMode === 'home' &&
                typeof bookForm.serviceLatitude === 'number' &&
                Number.isFinite(bookForm.serviceLatitude) &&
                typeof bookForm.serviceLongitude === 'number' &&
                Number.isFinite(bookForm.serviceLongitude) ? (
                  <div>
                    <dt className="text-muted-foreground">Location pin</dt>
                    <dd className="font-medium text-emerald-800 dark:text-emerald-200/90">
                      GPS coordinates will be shared with this request.
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-muted-foreground">Issue / service details</dt>
                  <dd className="whitespace-pre-wrap font-medium">{truncateForSummary(bookForm.problemDescription, 280)}</dd>
                </div>
                {bookForm.notes.trim() ? (
                  <div>
                    <dt className="text-muted-foreground">Additional notes</dt>
                    <dd className="whitespace-pre-wrap font-medium">{truncateForSummary(bookForm.notes, 180)}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
          <AlertDialogFooter className="shrink-0 border-0 bg-transparent p-0 pt-1 sm:justify-end">
            <AlertDialogCancel type="button" disabled={bookSubmitting} className="mt-0 border-[#081F5C]/20 sm:mt-0">
              Go back and edit
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={bookSubmitting}
              className="bg-linear-to-r from-[#081F5C] to-[#1447a6] text-white"
              onClick={() => {
                void performBookingSubmit()
              }}
            >
              {bookSubmitting ? 'Submitting…' : 'Confirm and submit request'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
