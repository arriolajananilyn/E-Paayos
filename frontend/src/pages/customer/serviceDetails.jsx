import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Bike,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Home,
  Image as ImageIcon,
  Info,
  Landmark,
  Layers,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Tag,
  Upload,
  User,
  Users,
  WashingMachine,
  Wrench,
  X,
} from 'lucide-react'
import ShopAddressGoogleMap from '../../components/ShopAddressGoogleMap.jsx'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
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
import CustomerLayout, { readCustomerUserSession } from '../../layout/customerlayout.jsx'
import { resolveProfilePsgcLabels } from '../../lib/psgcResolve'
import { SERVICE_TYPES, staffAssignedLabel } from './findServices.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

const MESSAGE_RECIPIENT_STORAGE_KEY = 'epaayos_message_recipient'

function storeShopRecipientForMessages(detail) {
  const ownerId = detail?.shopOwnerId
  if (!ownerId) return
  try {
    sessionStorage.setItem(
      MESSAGE_RECIPIENT_STORAGE_KEY,
      JSON.stringify({
        fullName: detail.shopName?.trim() || 'Shop',
        shopName: detail.shopName?.trim() || '',
        ownerName: detail.shopOwner?.trim() || '',
        role: 'Shop',
        isOnline: false,
        otherUserId: String(ownerId),
      }),
    )
  } catch {
    /* ignore */
  }
}

/**
 * Sample completed jobs: customer, work done, completion date/time (local).
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

function noOfTechnicianMechanicLabel(category) {
  return String(category || '').toLowerCase() === 'vehicle' ? 'No. of mechanics' : 'No. of technicians'
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

function resolveReviewMediaSrc(src) {
  const value = String(src ?? '').trim()
  if (!value) return ''
  if (/^(https?:\/\/|data:|blob:)/i.test(value)) return value
  if (value.startsWith('/uploads/')) return `${API_URL}${value}`
  return value
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

function resolveOwnerThumbSrc(detail) {
  if (!detail || typeof detail !== 'object') return ''
  const candidates = [detail.shopPlacePhoto, detail.shopOwnerProfileImage, detail.shopOwnerSelfieImage]
  for (const raw of candidates) {
    const value = String(raw ?? '').trim()
    if (!value) continue
    if (/^(https?:\/\/|data:|blob:)/i.test(value)) return value
    if (value.startsWith('/uploads/')) return `${API_URL}${value}`
    return value
  }
  return ''
}

function OwnerThumb({ src, ownerName, className = 'h-9 w-9' }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(src) && !imageFailed
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-none border border-slate-200 bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-white shadow-2xs ${className}`}>
      {showImage ? (
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setImageFailed(true)} />
      ) : (
        <span className="text-xs font-bold text-white">{initialsFromName(ownerName) || '?'}</span>
      )}
    </span>
  )
}

function serviceTypeBadge(type) {
  const label = SERVICE_TYPES.find((x) => x.value === type)?.label ?? '—'
  return (
    <Badge variant="outline" className="rounded-none border border-slate-200 bg-slate-100/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#081F5C]">
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

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('Failed to read image file.'))
    reader.readAsDataURL(file)
  })
}

function categoryBadgeClass(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return 'rounded-none bg-linear-to-r from-sky-600 to-blue-700 text-white font-bold px-2.5 py-0.5 text-[10px] uppercase tracking-wider'
  if (normalized === 'gadget') return 'rounded-none bg-linear-to-r from-violet-600 to-fuchsia-600 text-white font-bold px-2.5 py-0.5 text-[10px] uppercase tracking-wider'
  if (normalized === 'appliance') return 'rounded-none bg-linear-to-r from-emerald-600 to-teal-600 text-white font-bold px-2.5 py-0.5 text-[10px] uppercase tracking-wider'
  if (normalized === 'others') return 'rounded-none bg-linear-to-r from-amber-600 to-orange-600 text-white font-bold px-2.5 py-0.5 text-[10px] uppercase tracking-wider'
  return 'rounded-none bg-linear-to-r from-slate-600 to-slate-800 text-white font-bold px-2.5 py-0.5 text-[10px] uppercase tracking-wider'
}

function localDateInputMin() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

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

function defaultServiceMode(serviceType) {
  const t = String(serviceType ?? '')
  if (t === 'home') return 'home'
  if (t === 'in-shop') return 'in-shop'
  return 'in-shop'
}

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

function shouldShowProviderNote(value) {
  const t = String(value ?? '').trim()
  if (!t) return false
  const lower = t.toLowerCase()
  if (lower === 'n/a' || lower === 'na' || lower === 'n.a.' || lower === 'n.a' || lower === 'none' || lower === 'null')
    return false
  if (/^[-—–]+$/.test(t)) return false
  return true
}

export default function CustomerServiceDetails({ serviceId }) {
  const [user, setUser] = useState(readCustomerUserSession)

  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(true)
  const [detailError, setDetailError] = useState('')
  const [mapAddressParts, setMapAddressParts] = useState(null)
  const [mapPartsResolving, setMapPartsResolving] = useState(false)
  const [shopContext, setShopContext] = useState(null)
  const [serviceReviewFilter, setServiceReviewFilter] = useState('all')
  const [serviceReviews, setServiceReviews] = useState([])

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
  const [mapUserLocation, setMapUserLocation] = useState(null)
  const [mapLocationLoading, setMapLocationLoading] = useState(false)
  const [mapLocationError, setMapLocationError] = useState('')
  const [issuePhotos, setIssuePhotos] = useState([])
  const issuePhotoPreviews = useMemo(
    () =>
      issuePhotos.map((file, index) => ({
        id: `${file.name}-${file.lastModified}-${index}`,
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    [issuePhotos]
  )

  const completedWorksScrollRef = useRef(null)

  // Smooth fluid auto-scroll animation for completed works showcase
  useEffect(() => {
    const el = completedWorksScrollRef.current
    if (!el) return
    let animationId
    let isHovered = false

    const handleMouseEnter = () => { isHovered = true }
    const handleMouseLeave = () => { isHovered = false }

    el.addEventListener('mouseenter', handleMouseEnter)
    el.addEventListener('mouseleave', handleMouseLeave)

    const step = () => {
      if (!isHovered && el) {
        el.scrollLeft += 0.75
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 2) {
          el.scrollLeft = 0
        }
      }
      animationId = requestAnimationFrame(step)
    }
    animationId = requestAnimationFrame(step)

    return () => {
      cancelAnimationFrame(animationId)
      if (el) {
        el.removeEventListener('mouseenter', handleMouseEnter)
        el.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [detail])

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

  const headerMapSecondaryPin = useMemo(() => {
    if (
      mapUserLocation &&
      typeof mapUserLocation.lat === 'number' &&
      Number.isFinite(mapUserLocation.lat) &&
      typeof mapUserLocation.lng === 'number' &&
      Number.isFinite(mapUserLocation.lng)
    ) {
      return {
        lat: mapUserLocation.lat,
        lng: mapUserLocation.lng,
        label: 'Your location',
      }
    }
    return headerBookingLocationPin
  }, [mapUserLocation, headerBookingLocationPin])

  const serviceReviewsList = useMemo(
    () => serviceReviews.map((rv) => ({ ...rv, images: (rv.images || []).map(resolveReviewMediaSrc).filter(Boolean) })),
    [serviceReviews],
  )

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
    if (!user || !serviceId || !isLikelyMongoId(serviceId)) {
      setServiceReviews([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/api/catalog/shop-services/${encodeURIComponent(serviceId)}/reviews`, {
          headers: authHeaders(),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || 'Could not load reviews.')
        const list = Array.isArray(data?.reviews) ? data.reviews : []
        if (!cancelled) setServiceReviews(list)
      } catch {
        if (!cancelled) setServiceReviews([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, serviceId])

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
    return () => {
      issuePhotoPreviews.forEach((photo) => URL.revokeObjectURL(photo.url))
    }
  }, [issuePhotoPreviews])

  const openBookDialog = () => {
    if (!detail || !serviceId) return
    setBookError('')
    setBookSuccess('')
    setBookingConfirmOpen(false)
    setLocationCaptureError('')
    setLocationCaptureLoading(false)
    setBookForm({
      contactName: user?.fullName || user?.name || '',
      contactPhone: user?.phone || user?.phoneNumber || '',
      preferredDate: '',
      preferredTime: '',
      serviceMode: defaultServiceMode(detail.type),
      serviceAddress: user?.address || '',
      serviceLatitude: null,
      serviceLongitude: null,
      problemDescription: '',
      notes: '',
    })
    setIssuePhotos([])
    setBookDialogOpen(true)
  }

  const readBrowserLocation = ({ onSuccess, onError, onFinish }) => {
    if (!navigator.geolocation) {
      onError?.('Location is not supported in this browser.')
      onFinish?.()
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSuccess?.(pos.coords.latitude, pos.coords.longitude)
        onFinish?.()
      },
      (err) => {
        let msg = 'Could not read your location.'
        if (err?.code === 1) {
          msg =
            'Location permission was denied. Allow location in your browser settings, or enter your address manually.'
        } else if (err?.code === 2) {
          msg = 'Location unavailable. Try again or enter your address manually.'
        } else if (err?.code === 3) {
          msg = 'Location request timed out. Try again.'
        }
        onError?.(msg)
        onFinish?.()
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60_000 },
    )
  }

  const captureCustomerLocation = () => {
    setLocationCaptureError('')
    setLocationCaptureLoading(true)
    readBrowserLocation({
      onSuccess: (lat, lng) => {
        setBookForm((f) => ({
          ...f,
          serviceLatitude: lat,
          serviceLongitude: lng,
        }))
      },
      onError: (msg) => setLocationCaptureError(msg),
      onFinish: () => setLocationCaptureLoading(false),
    })
  }

  const captureMapUserLocation = () => {
    setMapLocationError('')
    setMapLocationLoading(true)
    readBrowserLocation({
      onSuccess: (lat, lng) => {
        setMapUserLocation({ lat, lng })
      },
      onError: (msg) => setMapLocationError(msg),
      onFinish: () => setMapLocationLoading(false),
    })
  }

  const clearMapUserLocation = () => {
    setMapUserLocation(null)
    setMapLocationError('')
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
      if (issuePhotos.length > 0) {
        const encodedPhotos = await Promise.all(issuePhotos.slice(0, 6).map((file) => fileToDataUrl(file)))
        payload.issuePhotos = encodedPhotos.filter(Boolean)
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider">Loading system user session…</p>
      </div>
    )
  }

  const CategoryIcon = detail ? categoryIcon(detail.category) : Wrench

  const dialogInputClass =
    'h-9 w-full rounded-none border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm shadow-[0_2px_5px_rgba(15,23,42,0.14)] outline-none focus-visible:ring-1 focus-visible:ring-[#081F5C] focus-visible:border-[#081F5C] transition-all hover:border-slate-300 font-medium placeholder:font-normal placeholder:text-slate-400'

  return (
    <CustomerLayout activePage="service-details">
      {/* Main Page Container with Tighter Modern Spacing */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-4 sm:space-y-5">
        {detailLoading ? (
          <div className="flex min-h-[380px] flex-col items-center justify-center rounded-none border border-dashed border-slate-300 bg-white p-6 text-center shadow-[0_3px_8px_rgba(15,23,42,0.14)]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#081F5C]" />
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-900">Loading service details…</p>
            <p className="mt-1 max-w-md text-xs text-slate-500 font-medium">Fetching verified service pricing, shop location map, and active availability.</p>
          </div>
        ) : detailError ? (
          <div className="rounded-none border border-rose-300 bg-rose-50 p-6 text-center text-xs font-medium text-rose-900 shadow-[0_3px_8px_rgba(15,23,42,0.14)]">
            <p className="text-sm font-bold text-rose-800">{detailError}</p>
            <p className="mt-1 text-xs text-rose-600">The requested service ID might be unavailable or removed by the shop owner.</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 rounded-none border-rose-300 text-xs font-bold uppercase tracking-wider hover:bg-rose-100"
              onClick={() => {
                window.location.hash = '#/customer/find-services'
              }}
            >
              Back to Find Services
            </Button>
          </div>
        ) : detail ? (
          <div className="space-y-4 sm:space-y-5">

            {/* 1. MAP HERO CONTAINER WITH UNIFIED OVERLAY AND MODERN HEADER STYLED BOTTOM BAR */}
            <div className="relative overflow-hidden rounded-none border border-slate-800 bg-white shadow-lg w-full">
              {/* Map Canvas */}
              <div className="relative isolate z-0 h-[260px] sm:h-[285px] w-full bg-slate-100">
                {mapPartsResolving ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-[#081F5C]" />
                    <span>Resolving map location…</span>
                  </div>
                ) : (
                  <div className="relative h-full w-full">
                    <ShopAddressGoogleMap
                      addressParts={mapAddressParts}
                      mapTitle={detail.shopName?.trim() ? `${detail.shopName.trim()} — shop location` : 'Shop location'}
                      showHeading={false}
                      flush
                      secondaryPin={headerMapSecondaryPin}
                      showRouteLine={Boolean(headerMapSecondaryPin)}
                      emptyAddressHint="This shop has not added enough address detail to show a map pin. Use the written address below."
                    />

                    {/* Unified Floating Shop Details Container inside Map (Top Left) */}
                    <div className="pointer-events-auto absolute top-3 left-3 z-20 max-w-[270px] sm:max-w-xs rounded-none border border-slate-200/90 bg-white/95 p-3 shadow-[0_4px_14px_rgba(15,23,42,0.18)] backdrop-blur-md transition-all space-y-2">
                      {/* Shop Name & Owner Header */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <OwnerThumb
                          src={resolveOwnerThumbSrc(detail)}
                          ownerName={detail.shopOwner?.trim() || detail.shopName?.trim() || ''}
                          className="h-8.5 w-8.5 border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xs sm:text-sm font-extrabold leading-tight text-slate-900 truncate flex items-center gap-1">
                            <span>{detail.shopName?.trim() || 'Shop Location'}</span>
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          </h3>
                          <p className="text-[10px] font-semibold text-slate-500 truncate">
                            Owner: <span className="font-bold text-slate-800">{detail.shopOwner?.trim() || '—'}</span>
                          </p>
                        </div>
                      </div>

                      {/* Address & Landmark Info */}
                      <div className="border-t border-slate-200/80 pt-2 space-y-1.5 text-xs">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#081F5C]" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Shop Address</p>
                            <p className="font-semibold text-slate-800 leading-snug text-[11px] line-clamp-2">
                              {detail.shopAddress?.trim() || '—'}
                            </p>
                          </div>
                        </div>

                        {detail.shopLandmark?.trim() ? (
                          <div className="flex items-start gap-1.5 pt-1 border-t border-slate-100">
                            <Landmark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Landmark</p>
                              <p className="font-semibold text-slate-800 leading-snug text-[11px] truncate">
                                {detail.shopLandmark.trim()}
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modern Header Styled Bottom Bar (myBookings header banner gradient match) */}
              <div className="relative overflow-hidden border-t border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-3.5 py-2.5 text-white flex flex-wrap items-center justify-between gap-2 shadow-inner">
                {/* Decorative subtle ambient background glow */}
                <div className="pointer-events-none absolute -top-12 -right-12 size-36 rounded-full bg-indigo-600/20 blur-2xl" />

                <div className="relative z-10 flex items-center gap-2.5 min-w-0">
                  <div className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-none bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-white shadow-2xs">
                    <Navigation className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[11px] font-bold tracking-wide text-slate-200 truncate">
                    {headerMapSecondaryPin ? 'Route active from your current location' : 'Interactive Map & GPS Navigation'}
                  </span>
                </div>

                <div className="relative z-10 flex items-center gap-2 shrink-0">
                  {headerMapSecondaryPin ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-none bg-white/10 hover:bg-white/20 px-2.5 text-[10px] font-bold text-white transition-all border border-white/10"
                      onClick={clearMapUserLocation}
                    >
                      Clear route
                    </Button>
                  ) : null}

                  <Button
                    type="button"
                    size="sm"
                    className="h-7.5 gap-1.5 rounded-none bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] hover:from-[#081F5C] hover:to-[#1d5ec4] text-white text-[10px] font-bold uppercase tracking-wider shadow-md transition-all border border-blue-400/30"
                    disabled={mapLocationLoading}
                    onClick={captureMapUserLocation}
                  >
                    <Navigation className={`h-3 w-3 shrink-0 ${mapLocationLoading ? 'animate-spin' : ''}`} aria-hidden />
                    <span>{mapLocationLoading ? 'Getting location…' : headerMapSecondaryPin ? 'Update location' : 'Route from my location'}</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* 2. DUAL-COLUMN HERO SECTION BELOW MAP: Left Service Card + Right Key Stats Rows Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">

              {/* LEFT COLUMN: Service Details Primary Card */}
              <div className="lg:col-span-8 flex flex-col justify-between rounded-none border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] space-y-4">
                <div className="space-y-4">
                  {/* Badges Bar */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className={categoryBadgeClass(detail.category)}>{detail.category || '—'}</Badge>
                    {serviceTypeBadge(detail.type)}
                    <span className="inline-flex items-center gap-1 rounded-none border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Active Listing
                    </span>
                    <Badge
                      variant="outline"
                      className="rounded-none border border-slate-200 bg-slate-100/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#081F5C]"
                    >
                      <CalendarCheck className="mr-1 h-3 w-3 text-[#081F5C]" aria-hidden />
                      {detail.completedJobs ?? 0} jobs done
                    </Badge>
                  </div>

                  {/* Title & Category Header */}
                  <div>
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-white shadow-2xs">
                        <CategoryIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h1 className="text-lg sm:text-xl lg:text-2xl font-extrabold uppercase tracking-wide text-slate-900 leading-tight">
                          {detail.serviceName}
                        </h1>
                        <p className="text-[11px] font-bold text-[#081F5C] mt-0.5">
                          Category: <span className="text-slate-800">{detail.category || '—'}</span>
                          {detail.subcategory?.trim() ? ` · ${detail.subcategory.trim()}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick specs grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 border-t border-b border-slate-100 py-2.5 text-xs">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Rating</p>
                      <p className="flex items-center gap-1 font-bold text-slate-900 mt-0.5 text-xs">
                        <Star className="h-3 w-3 fill-amber-300 text-amber-400 shrink-0" />
                        {typeof detail.shopRating === 'number' && detail.shopRating > 0
                          ? `${detail.shopRating.toFixed(1)} / 5.0`
                          : 'New listing'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Service Scope</p>
                      <p className="font-bold text-slate-900 truncate mt-0.5 text-xs">
                        {SERVICE_TYPES.find((x) => x.value === detail.type)?.label ?? 'Standard'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Staff Assigned</p>
                      <p className="font-bold text-slate-900 mt-0.5 text-xs">
                        {(detail.staff ?? []).length} {noOfTechnicianMechanicLabel(detail.category).toLowerCase().replace('no. of ', '')}
                      </p>
                    </div>
                  </div>

                  {/* Assigned Staff Preview */}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Assigned Personnel
                    </p>
                    <div className="flex items-center gap-2">
                      {(detail.staff ?? []).length ? (
                        <>
                          <div className="inline-flex items-center gap-1">
                            {(detail.staff ?? []).slice(0, 5).map((name, idx) => (
                              <span
                                key={`${String(name)}-${idx}`}
                                title={String(name)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-none border border-white bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-[10px] font-bold text-white shadow-2xs ring-1 ring-black/5"
                              >
                                {initialsFromName(name)}
                              </span>
                            ))}
                          </div>
                          <span className="text-[11px] font-semibold text-slate-600">
                            {staffAssignedLabel(detail.category, (detail.staff ?? []).length)}
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-500">
                          No dedicated staff specified; provided directly by shop owner.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Primary CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    aria-label="Book this service now"
                    title={bookingFieldsTooltip(detail.type)}
                    className="h-10 flex-1 gap-2 rounded-none bg-linear-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-5 text-xs font-bold uppercase tracking-wider text-white shadow-[0_2px_6px_rgba(8,31,92,0.4)] hover:shadow-[0_4px_10px_rgba(8,31,92,0.55)] hover:opacity-95 transition-all"
                    onClick={openBookDialog}
                  >
                    <CalendarCheck className="h-4 w-4 shrink-0" aria-hidden />
                    <span>Book Service Now</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Contact Shop"
                    className="h-10 gap-2 rounded-none border border-slate-300 bg-white px-4 text-xs font-bold uppercase tracking-wider text-[#081F5C] hover:bg-slate-100 hover:border-[#081F5C] transition-all shadow-2xs"
                    onClick={() => {
                      storeShopRecipientForMessages(detail)
                      window.location.hash = '#/customer/messages'
                    }}
                  >
                    <MessageCircle className="h-4 w-4 shrink-0 text-[#081F5C]" />
                    <span>Message Shop</span>
                  </Button>
                </div>
              </div>

              {/* RIGHT COLUMN: Key Statistics Cards with findServices.jsx Card Shadow */}
              <div
                id="customer-shop-summary-table"
                className="lg:col-span-4 flex flex-col justify-between gap-2.5"
                role="region"
                aria-label="Shop key statistics"
              >
                {/* Card 1: Total Services (Blue / Navy Theme with findServices shadow) */}
                <div className="relative flex-1 overflow-hidden rounded-none border border-blue-200/80 bg-linear-to-r from-blue-500/10 via-blue-50/50 to-white p-3 sm:p-3.5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-300 hover:border-[#081F5C] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)]">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-[#081F5C] text-white shadow-2xs">
                        <Layers className="h-4.5 w-4.5" />
                      </span>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total Services</p>
                        <p className="text-xs sm:text-sm font-extrabold text-slate-900 tabular-nums">
                          {shopContext?.activeServiceCount != null ? shopContext.activeServiceCount : '—'} Active
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-none bg-blue-100/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#081F5C] border border-blue-300">
                      Catalog
                    </span>
                  </div>
                </div>

                {/* Card 2: Operating Hours (Emerald Green Theme with findServices shadow) */}
                <div className="relative flex-1 overflow-hidden rounded-none border border-emerald-200/80 bg-linear-to-r from-emerald-500/10 via-emerald-50/50 to-white p-3 sm:p-3.5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-300 hover:border-[#081F5C] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)]">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-emerald-600 text-white shadow-2xs">
                        <Clock className="h-4.5 w-4.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Operating Hours</p>
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {detail.shopOperatingHours?.trim() ? detail.shopOperatingHours.trim() : 'Mon - Sat'}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-none bg-emerald-100/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-900 border border-emerald-300">
                      Schedule
                    </span>
                  </div>
                </div>

                {/* Card 3: Shop Rating (Amber Gold Theme with findServices shadow) */}
                <div className="relative flex-1 overflow-hidden rounded-none border border-amber-200/80 bg-linear-to-r from-amber-500/10 via-amber-50/50 to-white p-3 sm:p-3.5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-300 hover:border-[#081F5C] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)]">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-amber-500 text-white shadow-2xs">
                        <Star className="h-4.5 w-4.5 fill-white text-white" />
                      </span>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Shop Rating</p>
                        <p className="text-xs sm:text-sm font-extrabold text-slate-900 tabular-nums">
                          {(() => {
                            const shopAvg = Number(shopContext?.shopAverageRating) || 0
                            const svc = Number(detail.shopRating) || 0
                            if (shopAvg > 0) return `${shopAvg.toFixed(1)} / 5.0`
                            if (svc > 0) return `${svc.toFixed(1)} / 5.0`
                            return 'Unrated'
                          })()}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-none bg-amber-100/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-900 border border-amber-300">
                      Verified
                    </span>
                  </div>
                </div>

                {/* Card 4: Date Joined (Indigo Violet Theme with findServices shadow) */}
                <div className="relative flex-1 overflow-hidden rounded-none border border-indigo-200/80 bg-linear-to-r from-indigo-500/10 via-indigo-50/50 to-white p-3 sm:p-3.5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-300 hover:border-[#081F5C] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)]">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-indigo-600 text-white shadow-2xs">
                        <CalendarDays className="h-4.5 w-4.5" />
                      </span>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Date Joined</p>
                        <p className="text-xs font-bold text-slate-900">
                          {formatShopOwnerJoinedAt(detail.shopOwnerJoinedAt)}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-none bg-indigo-100/80 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-indigo-900 border border-indigo-300">
                      Partner
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. FULL WIDTH SERVICE DESCRIPTION CARD */}
            <div className="w-full rounded-none border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] space-y-2.5">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <FileText className="h-4 w-4 text-[#081F5C]" /> Service Description
              </h2>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium pt-0.5">
                {detail.description || 'No description available for this service.'}
              </p>

              {detail && shouldShowProviderNote(detail.requirements) ? (
                <div className="mt-2.5 rounded-none border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 font-medium">
                  <span className="font-bold uppercase tracking-wider text-amber-950">Provider Note: </span>
                  {String(detail.requirements).trim()}
                </div>
              ) : null}
            </div>

            {/* 4. TWO-COLUMN GRID: BOOKING PROCESS GUIDE (LEFT) + READY TO SCHEDULE REPAIR CTA (RIGHT) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
              {/* How Booking Works Checklist Card */}
              <div className="rounded-none border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] space-y-3 flex flex-col justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Booking Guide &amp; Process
                </h3>
                <ol className="space-y-2.5 text-xs font-medium text-slate-700 flex-1">
                  <li className="flex items-start gap-2">
                    <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center bg-[#081F5C] text-[9px] font-bold text-white">1</span>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">Choose Schedule &amp; Contact</p>
                      <p className="text-[11px] text-slate-500 leading-snug">Provide preferred date, time, and active mobile number.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center bg-[#081F5C] text-[9px] font-bold text-white">2</span>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">Select Service Option</p>
                      <p className="text-[11px] text-slate-500 leading-snug">In-shop visit or home service with optional GPS pin.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center bg-[#081F5C] text-[9px] font-bold text-white">3</span>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">Describe Issue &amp; Upload Photos</p>
                      <p className="text-[11px] text-slate-500 leading-snug">Attach clear photos of symptoms for accurate assessment.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center bg-[#081F5C] text-[9px] font-bold text-white">4</span>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">Provider Confirmation</p>
                      <p className="text-[11px] text-slate-500 leading-snug">Track booking status under "My Bookings" in real-time.</p>
                    </div>
                  </li>
                </ol>
              </div>

              {/* Direct Action Card */}
              <div className="rounded-none border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] space-y-3 text-center flex flex-col justify-center items-center">
                <div className="flex h-10 w-10 items-center justify-center bg-[#081F5C]/10 text-[#081F5C]">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900">Ready to schedule repair?</p>
                  <p className="text-[11px] font-medium text-slate-500 leading-relaxed max-w-sm mt-0.5">
                    Submit your booking request directly to <span className="font-bold text-slate-800">{detail.shopName?.trim() || 'the shop'}</span> for fast response.
                  </p>
                </div>
                <Button
                  type="button"
                  className="w-full max-w-xs h-9.5 rounded-none bg-linear-to-r from-[#04133d] to-[#081F5C] text-xs font-bold uppercase tracking-wider text-white shadow-[0_2px_6px_rgba(8,31,92,0.4)] hover:shadow-[0_4px_10px_rgba(8,31,92,0.55)] transition-all"
                  onClick={openBookDialog}
                >
                  <CalendarCheck className="mr-1.5 h-3.5 w-3.5" /> Book Service Now
                </Button>
              </div>
            </div>

            {/* 5. FULL WIDTH COMPLETED WORKS SHOWCASE WITH AUTO-SCROLL ANIMATION */}
            <section aria-labelledby="completed-works-heading" className="w-full space-y-2.5">
              <div className="flex items-center justify-between">
                <h2
                  id="completed-works-heading"
                  className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900"
                >
                  <ClipboardList className="h-4 w-4 text-[#081F5C]" aria-hidden />
                  Completed Works Showcase
                </h2>
                <span className="text-[11px] font-medium text-slate-500">Sample finished repair jobs · Auto-scrolling</span>
              </div>
              <div
                ref={completedWorksScrollRef}
                className="flex flex-nowrap gap-3 overflow-x-auto overscroll-x-contain pb-2.5 pt-0.5 scroll-smooth snap-x snap-mandatory [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="list"
                aria-label="Completed work entries"
              >
                {MOCK_COMPLETED_WORKS.map((job) => {
                  const { time, date } = formatCompletedWorkDateTime(job.completedAt)
                  return (
                    <article
                      key={job.id}
                      role="listitem"
                      className="w-[min(340px,calc(100vw-3rem))] shrink-0 snap-start rounded-none border border-slate-200 bg-white p-4 shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-300 hover:border-[#081F5C] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)]"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-bold text-white shadow-2xs"
                          aria-hidden
                        >
                          {initialsFromName(job.customerName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-slate-900">{job.customerName}</p>
                          <p className="text-[10px] font-medium text-slate-500">Verified Customer</p>
                        </div>
                      </div>
                      <div className="mt-2.5 border-t border-slate-100 pt-2.5">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          Work completed
                        </p>
                        <p className="mt-0.5 text-xs font-medium leading-relaxed text-slate-800">
                          {job.whatWasFixed}
                        </p>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px] tabular-nums">
                        <span className="shrink-0 font-bold text-[#081F5C]">{time}</span>
                        <span className="min-w-0 text-right font-semibold text-slate-500">{date}</span>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            {/* 6. BOTTOM FULL WIDTH: CUSTOMER REVIEWS & RATINGS SECTION */}
            <section aria-labelledby="service-reviews-heading" className="w-full space-y-2.5">
              <div className="w-full rounded-none border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <h2
                    id="service-reviews-heading"
                    className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900"
                  >
                    <Star className="h-4 w-4 fill-amber-300 text-amber-400" aria-hidden />
                    Customer Reviews &amp; Ratings
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.hash = '#/customer/reviews-ratings'
                    }}
                    className="text-[11px] font-bold uppercase tracking-wider text-[#081F5C] hover:underline"
                  >
                    View all ›
                  </button>
                </div>

                {/* Overall Rating Score Header */}
                <div className="flex flex-wrap items-center gap-3.5 bg-slate-50 p-3.5 border border-slate-200">
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tabular-nums">
                    {hasServiceRatings ? serviceRatingAverage.toFixed(1) : '0.0'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1" aria-hidden>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(hasServiceRatings ? serviceRatingAverage : 0)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-600">
                      Based on {serviceRatingCount} customer review{serviceRatingCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                {/* Filters Bar */}
                {serviceReviewsList.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setServiceReviewFilter('all')}
                      className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-none transition-all ${
                        serviceReviewFilter === 'all'
                          ? 'border border-[#081F5C] bg-[#081F5C] text-white shadow-2xs'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-[#081F5C] hover:bg-slate-50'
                      }`}
                    >
                      All ({serviceRatingCount})
                    </button>
                    {[5, 4, 3, 2, 1].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setServiceReviewFilter(String(star))}
                        className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-none transition-all ${
                          serviceReviewFilter === String(star)
                            ? 'border border-[#081F5C] bg-[#081F5C] text-white shadow-2xs'
                            : 'border border-slate-200 bg-white text-slate-700 hover:border-[#081F5C] hover:bg-slate-50'
                        }`}
                      >
                        {star} ★ ({serviceReviewStats.stars[star] || 0})
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setServiceReviewFilter('comments')}
                      className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-none transition-all ${
                        serviceReviewFilter === 'comments'
                          ? 'border border-[#081F5C] bg-[#081F5C] text-white shadow-2xs'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-[#081F5C] hover:bg-slate-50'
                      }`}
                    >
                      With comments ({serviceReviewStats.withComments})
                    </button>
                    <button
                      type="button"
                      onClick={() => setServiceReviewFilter('media')}
                      className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider rounded-none transition-all ${
                        serviceReviewFilter === 'media'
                          ? 'border border-[#081F5C] bg-[#081F5C] text-white shadow-2xs'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-[#081F5C] hover:bg-slate-50'
                      }`}
                    >
                      With photos ({serviceReviewStats.withMedia})
                    </button>
                  </div>
                ) : null}

                {/* Review Cards List */}
                <div className="border-t border-slate-100 pt-2.5">
                  {filteredServiceReviews.length > 0 ? (
                    <ul className="divide-y divide-slate-100">
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
                          <li key={review.id} className="flex gap-3 py-3.5 first:pt-0">
                            <div
                              className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-none bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-bold text-white shadow-2xs"
                              aria-hidden
                            >
                              {initialsFromName(displayName)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-bold text-slate-900">{displayName}</p>
                                <span className="text-[11px] font-medium text-slate-400">{dateStr}</span>
                              </div>
                              <div className="mt-0.5 flex items-center gap-0.5" aria-label={`${normalizedRating} out of 5 stars`}>
                                {[0, 1, 2, 3, 4].map((i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < normalizedRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              {typeof review.comment === 'string' && review.comment.trim().length > 0 ? (
                                <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-700">
                                  {review.comment}
                                </p>
                              ) : null}
                              {Array.isArray(review.images) && review.images.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {review.images.map((imgUrl, imgIdx) => (
                                    <div
                                      key={imgIdx}
                                      className="h-14 w-14 overflow-hidden rounded-none border border-[#081F5C] bg-slate-100 shadow-2xs"
                                    >
                                      <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                              {review.shopResponse ? (
                                <div className="mt-2.5 border-l-2 border-[#081F5C] bg-slate-50 p-2.5 text-xs rounded-none">
                                  <p className="font-bold uppercase tracking-wider text-[#081F5C] text-[9px]">
                                    Shop Response
                                  </p>
                                  <p className="mt-0.5 font-medium text-slate-700 leading-snug text-[11px]">{review.shopResponse}</p>
                                </div>
                              ) : null}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="py-5 text-center text-xs font-medium text-slate-500">
                      No reviews match the selected filter.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </main>

      {/* 7. FULL-WIDTH EDGE-TO-EDGE MODERN SHOP FOOTER */}
      {detail ? (
        <footer className="relative overflow-hidden w-full mt-8 sm:mt-10 border-t border-slate-800/90 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-2xl">
          {/* Decorative Ambient Background Glows */}
          <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-indigo-600/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-purple-600/10 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-7 sm:py-9 lg:py-10 space-y-7">
            {/* Upper Section: Shop Branding + Direct Action CTAs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <OwnerThumb
                  src={resolveOwnerThumbSrc(detail)}
                  ownerName={detail.shopOwner?.trim() || detail.shopName?.trim() || ''}
                  className="h-12 w-12 border-2 border-blue-400/40 shadow-lg shadow-blue-900/30 shrink-0"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg lg:text-xl font-black text-white leading-tight truncate">
                      {detail.shopName?.trim() || 'Verified Repair Shop'}
                    </h3>
                    <span className="inline-flex items-center gap-1 rounded-none border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-xs">
                      <ShieldCheck className="h-3 w-3 text-emerald-400" />
                      Verified Partner
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-1 flex items-center gap-2 flex-wrap">
                    <span>Owner: <strong className="text-white">{detail.shopOwner?.trim() || '—'}</strong></span>
                    <span className="text-slate-600">•</span>
                    <span>Joined <strong className="text-white">{formatShopOwnerJoinedAt(detail.shopOwnerJoinedAt)}</strong></span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  className="h-9.5 gap-2 rounded-none bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] hover:from-[#081F5C] hover:to-[#1d5ec4] text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all border border-blue-400/30 px-4"
                  onClick={() => {
                    storeShopRecipientForMessages(detail)
                    window.location.hash = '#/customer/messages'
                  }}
                >
                  <MessageCircle className="h-4 w-4 text-white" />
                  <span>Contact Shop</span>
                </Button>
              </div>
            </div>

            {/* Middle Section: 3 Columns Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 text-xs text-slate-300">
              {/* Column 1: Shop Location & Operating Hours */}
              <div className="space-y-3 p-4 rounded-none border border-white/5 bg-white/[0.02] backdrop-blur-xs">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
                  <MapPin className="h-4 w-4 text-sky-400" /> Location &amp; Hours
                </h4>
                <div className="space-y-2.5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Address</p>
                    <p className="text-xs font-medium text-white leading-relaxed mt-0.5">
                      {detail.shopAddress?.trim() || '—'}
                    </p>
                  </div>
                  {detail.shopLandmark?.trim() ? (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Landmark</p>
                      <p className="text-xs font-medium text-slate-200 mt-0.5 flex items-center gap-1">
                        <Landmark className="h-3 w-3 text-amber-400 shrink-0" />
                        {detail.shopLandmark.trim()}
                      </p>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Operating Hours</p>
                    <p className="text-xs font-bold text-emerald-300 mt-0.5 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      {detail.shopOperatingHours?.trim() || 'Mon - Sat (Operating hours available)'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Column 2: Performance Highlights */}
              <div className="space-y-3 p-4 rounded-none border border-white/5 bg-white/[0.02] backdrop-blur-xs">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
                  <Sparkles className="h-4 w-4 text-amber-400" /> Shop Performance
                </h4>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-slate-400 font-medium">Shop Rating:</span>
                    <span className="font-bold text-white flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {(() => {
                        const shopAvg = Number(shopContext?.shopAverageRating) || 0
                        const svc = Number(detail.shopRating) || 0
                        if (shopAvg > 0) return `${shopAvg.toFixed(1)} / 5.0`
                        if (svc > 0) return `${svc.toFixed(1)} / 5.0`
                        return 'Unrated'
                      })()}
                    </span>
                  </li>
                  <li className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-slate-400 font-medium">Active Services:</span>
                    <span className="font-bold text-white tabular-nums">
                      {shopContext?.activeServiceCount != null ? `${shopContext.activeServiceCount} Listed` : '1 Listing'}
                    </span>
                  </li>
                  <li className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-slate-400 font-medium">Completed Jobs:</span>
                    <span className="font-bold text-emerald-300 tabular-nums">
                      {detail.completedJobs ?? 0} finished job{detail.completedJobs === 1 ? '' : 's'}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Assigned Staff:</span>
                    <span className="font-bold text-white">
                      {staffAssignedLabel(detail.category, (detail.staff ?? []).length)}
                    </span>
                  </li>
                </ul>
              </div>

              {/* Column 3: E-Paayos Guarantee */}
              <div className="space-y-3 p-4 rounded-none border border-white/5 bg-white/[0.02] backdrop-blur-xs">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-white flex items-center gap-2 border-b border-white/10 pb-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" /> Service Guarantee
                </h4>
                <p className="text-[11px] leading-relaxed text-slate-300 font-medium">
                  All bookings placed through <strong className="text-white">E-Paayos</strong> are tracked in real-time. Direct message the owner, share GPS pins for home service, and monitor repair status online.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="rounded-none border border-indigo-400/20 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-300">
                    Real-Time Tracking
                  </span>
                  <span className="rounded-none border border-purple-400/20 bg-purple-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-purple-300">
                    Direct Messaging
                  </span>
                  <span className="rounded-none border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                    Verified Shop
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Copyright & Status Bar */}
            <div className="border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-400 font-medium">
              <p>© {new Date().getFullYear()} E-Paayos Services Platform. All rights reserved.</p>
              <p className="flex items-center gap-1.5 text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Official Shop Info · <strong className="text-white">{detail.shopName?.trim() || 'Registered Provider'}</strong>
              </p>
            </div>
          </div>
        </footer>
      ) : null}

      {/* Booking Dialog Modal */}
      <Dialog
        open={bookDialogOpen}
        onOpenChange={(open) => {
          if (!open && bookSubmitting) return
          setBookDialogOpen(open)
        }}
      >
        <DialogContent className="flex max-h-[min(92dvh,46rem)] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-none border border-slate-800 bg-white p-0 shadow-[0_12px_36px_rgba(8,31,92,0.3)] sm:max-w-2xl">
          {/* Header Banner */}
          <div className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-5 py-4 text-white shadow-md">
            <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-indigo-500/20 blur-2xl" />
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-white shadow-md border border-blue-400/30">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-white leading-tight">
                      {bookSuccess ? 'Booking Completed' : 'Service Booking Form'}
                    </h2>
                    {detail ? (
                      <span className="rounded-none border border-blue-400/30 bg-blue-500/20 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-200 backdrop-blur-xs">
                        {detail.category || 'Service'}
                      </span>
                    ) : null}
                  </div>
                  {detail ? (
                    <p className="mt-0.5 text-xs text-slate-300 font-medium truncate">
                      Requesting <span className="font-bold text-white">{detail.serviceName}</span> at{' '}
                      <span className="font-bold text-slate-200">{detail.shopName?.trim() || 'Shop'}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto overscroll-contain p-4 sm:p-6 bg-slate-50/50">
            {detail && shouldShowProviderNote(detail.requirements) && !bookSuccess ? (
              <div className="flex items-start gap-2.5 rounded-none border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-950 font-medium shadow-2xs">
                <Info className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                <div className="min-w-0 flex-1 leading-relaxed">
                  <strong className="font-bold uppercase tracking-wider text-amber-900 block text-[10px]">Provider Requirement Note:</strong>
                  {String(detail.requirements).trim()}
                </div>
              </div>
            ) : null}

            {bookSuccess ? (
              <div className="space-y-4 py-2">
                <div className="rounded-none border border-emerald-300 bg-emerald-50/90 p-5 text-center shadow-xs space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-none bg-emerald-600 text-white shadow-md">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-emerald-950 uppercase tracking-wide">Request Successfully Sent!</h3>
                    <p className="mt-1 text-xs text-emerald-800 font-medium leading-relaxed max-w-md mx-auto">
                      {detail ? (
                        <>
                          <span className="font-bold text-emerald-950">{detail.shopName?.trim() || 'The shop'}</span> has received your booking request for{' '}
                          <span className="font-bold text-emerald-950">{detail.serviceName}</span>. They will review your schedule and respond shortly.
                        </>
                      ) : (
                        'Your repair request was submitted successfully.'
                      )}
                    </p>
                  </div>
                  <div className="rounded-none border border-emerald-200 bg-white p-3 text-left text-xs space-y-1 text-slate-700 font-medium">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Submission Details</p>
                    <div className="flex items-center justify-between">
                      <span>Status:</span>
                      <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-none border border-emerald-300 text-[10px] uppercase">Pending Provider Confirmation</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Preferred Date:</span>
                      <span className="font-bold text-slate-900">{formatDateForConfirm(bookForm.preferredDate)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Contact Person:</span>
                      <span className="font-bold text-slate-900">{bookForm.contactName} ({bookForm.contactPhone})</span>
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex flex-row flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 rounded-none border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-100 shadow-2xs"
                    onClick={() => {
                      setBookDialogOpen(false)
                      window.location.hash = '#/customer/my-bookings'
                    }}
                  >
                    View My Bookings
                  </Button>
                  <Button
                    type="button"
                    className="shrink-0 gap-1.5 rounded-none bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] hover:from-[#081F5C] hover:to-[#1d5ec4] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all border border-blue-400/30"
                    onClick={() => {
                      if (detail?.shopOwnerId) storeShopRecipientForMessages(detail)
                      setBookDialogOpen(false)
                      window.location.hash = '#/customer/messages'
                    }}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>Message Shop</span>
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleBookingFormSubmit} className="space-y-4">
                {bookError ? (
                  <div className="flex items-center gap-2 rounded-none border border-rose-300 bg-rose-50 p-3 text-xs font-bold text-rose-800 shadow-2xs" role="alert">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{bookError}</span>
                  </div>
                ) : null}

                {/* Section 1: Contact Information */}
                <div className="rounded-none border border-slate-200 bg-white p-4 shadow-[0_2px_6px_rgba(15,23,42,0.06)] space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center bg-[#081F5C] text-[10px] font-bold text-white">1</span>
                      Contact Information
                    </h3>
                    <span className="text-[10px] font-semibold text-slate-400">Required</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="book-contact-name" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-[#081F5C]" />
                        Contact Full Name
                      </Label>
                      <Input
                        id="book-contact-name"
                        name="contactName"
                        autoComplete="name"
                        required
                        value={bookForm.contactName}
                        onChange={(ev) => setBookForm((f) => ({ ...f, contactName: ev.target.value }))}
                        placeholder="e.g. Juan dela Cruz"
                        className={dialogInputClass}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="book-contact-phone" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-[#081F5C]" />
                        Mobile / Phone Number
                      </Label>
                      <Input
                        id="book-contact-phone"
                        name="contactPhone"
                        type="tel"
                        autoComplete="tel"
                        required
                        value={bookForm.contactPhone}
                        onChange={(ev) => setBookForm((f) => ({ ...f, contactPhone: ev.target.value }))}
                        placeholder="e.g. 0917 123 4567"
                        className={dialogInputClass}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Preferred Schedule & Service Option */}
                <div className="rounded-none border border-slate-200 bg-white p-4 shadow-[0_2px_6px_rgba(15,23,42,0.06)] space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center bg-[#081F5C] text-[10px] font-bold text-white">2</span>
                      Preferred Schedule &amp; Option
                    </h3>
                    <span className="text-[10px] font-semibold text-slate-400">Required</span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="book-pref-date" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#081F5C]" />
                        Preferred Date
                      </Label>
                      <Input
                        id="book-pref-date"
                        name="preferredDate"
                        type="date"
                        required
                        min={localDateInputMin()}
                        value={bookForm.preferredDate}
                        onChange={(ev) => setBookForm((f) => ({ ...f, preferredDate: ev.target.value }))}
                        className={dialogInputClass}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="book-pref-time" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#081F5C]" />
                        Preferred Time
                      </Label>
                      <Input
                        id="book-pref-time"
                        name="preferredTime"
                        type="time"
                        required
                        value={bookForm.preferredTime}
                        onChange={(ev) => setBookForm((f) => ({ ...f, preferredTime: ev.target.value }))}
                        className={dialogInputClass}
                      />
                    </div>
                  </div>

                  {/* Service Mode Selector Cards */}
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                      Service Fulfillment Option
                    </Label>
                    {detail?.type === 'both' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setBookForm((f) => ({
                              ...f,
                              serviceMode: 'in-shop',
                              serviceLatitude: null,
                              serviceLongitude: null,
                            }))
                            setLocationCaptureError('')
                            setLocationCaptureLoading(false)
                          }}
                          className={`flex items-start gap-3 p-3 rounded-none text-left transition-all border ${
                            bookForm.serviceMode === 'in-shop'
                              ? 'border-[#081F5C] bg-blue-50/70 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-none text-white ${
                            bookForm.serviceMode === 'in-shop' ? 'bg-[#081F5C]' : 'bg-slate-300'
                          }`}>
                            <Store className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-extrabold text-slate-900 uppercase">In-Shop Visit</p>
                              {bookForm.serviceMode === 'in-shop' && (
                                <span className="h-2 w-2 rounded-full bg-[#081F5C]" />
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 leading-snug mt-0.5 font-medium">
                              Bring your item to the shop address.
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setBookForm((f) => ({ ...f, serviceMode: 'home' }))
                          }}
                          className={`flex items-start gap-3 p-3 rounded-none text-left transition-all border ${
                            bookForm.serviceMode === 'home'
                              ? 'border-[#081F5C] bg-blue-50/70 shadow-xs'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-none text-white ${
                            bookForm.serviceMode === 'home' ? 'bg-[#081F5C]' : 'bg-slate-300'
                          }`}>
                            <Home className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-extrabold text-slate-900 uppercase">Home Service</p>
                              {bookForm.serviceMode === 'home' && (
                                <span className="h-2 w-2 rounded-full bg-[#081F5C]" />
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 leading-snug mt-0.5 font-medium">
                              Technician visits your service address.
                            </p>
                          </div>
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-none border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700 font-medium flex items-center gap-2">
                        <Info className="h-3.5 w-3.5 text-[#081F5C] shrink-0" />
                        <span>
                          {detail?.type === 'home'
                            ? 'Fixed Option: This service is available as Home Service only.'
                            : detail?.type === 'in-shop'
                              ? 'Fixed Option: This service is available as In-Shop Visit only.'
                              : 'Service option configured by provider.'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 3: Service Address & GPS Pin (If Home Service) */}
                {bookForm.serviceMode === 'home' ? (
                  <div className="rounded-none border border-blue-200 bg-blue-50/40 p-4 shadow-[0_2px_6px_rgba(15,23,42,0.06)] space-y-3">
                    <div className="flex items-center justify-between border-b border-blue-200/80 pb-2">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[#081F5C]" />
                        Home Service Location
                      </h3>
                      <span className="text-[10px] font-bold text-blue-900 uppercase bg-blue-100 px-2 py-0.5 border border-blue-300">
                        Address Required
                      </span>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="book-service-address" className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                        Full Service Address
                      </Label>
                      <Textarea
                        id="book-service-address"
                        name="serviceAddress"
                        required
                        rows={2}
                        value={bookForm.serviceAddress}
                        onChange={(ev) => setBookForm((f) => ({ ...f, serviceAddress: ev.target.value }))}
                        placeholder="House / Unit no., Street name, Barangay, City / Municipality"
                        className={`${dialogInputClass} min-h-16 resize-y`}
                      />
                    </div>

                    {/* GPS Pin Capture Box */}
                    <div className="pt-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 border border-blue-200">
                        <div className="min-w-0">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1">
                            <Navigation className="h-3 w-3 text-[#081F5C]" /> Precise GPS Location (Optional)
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">Helps technician navigate quickly to your door.</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={locationCaptureLoading}
                          onClick={captureCustomerLocation}
                          className="h-7.5 gap-1.5 rounded-none border border-[#081F5C] bg-white text-[10px] font-bold uppercase tracking-wider text-[#081F5C] hover:bg-[#081F5C] hover:text-white transition-all shrink-0"
                        >
                          <Navigation className={`h-3 w-3 shrink-0 ${locationCaptureLoading ? 'animate-spin' : ''}`} aria-hidden />
                          {locationCaptureLoading ? 'Reading GPS…' : 'Use Current Location'}
                        </Button>
                      </div>

                      {locationCaptureError ? (
                        <p className="mt-1.5 text-xs font-bold text-rose-600" role="alert">
                          {locationCaptureError}
                        </p>
                      ) : null}

                      {typeof bookForm.serviceLatitude === 'number' &&
                      Number.isFinite(bookForm.serviceLatitude) &&
                      typeof bookForm.serviceLongitude === 'number' &&
                      Number.isFinite(bookForm.serviceLongitude) ? (
                        <div className="mt-2 flex items-center justify-between gap-2 rounded-none border border-emerald-300 bg-emerald-50 p-2.5 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-extrabold text-emerald-950 uppercase tracking-wider text-[10px]">GPS Coordinates Attached</p>
                              <p className="font-mono text-[11px] text-slate-700 truncate">
                                {bookForm.serviceLatitude.toFixed(6)}, {bookForm.serviceLongitude.toFixed(6)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setBookForm((f) => ({ ...f, serviceLatitude: null, serviceLongitude: null }))}
                            className="text-[10px] font-bold uppercase text-slate-500 hover:text-rose-600 underline shrink-0"
                          >
                            Remove GPS
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {/* Section 4: Issue Details & Photos */}
                <div className="rounded-none border border-slate-200 bg-white p-4 shadow-[0_2px_6px_rgba(15,23,42,0.06)] space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center bg-[#081F5C] text-[10px] font-bold text-white">3</span>
                      Issue Details &amp; Attachments
                    </h3>
                    <span className="text-[10px] font-semibold text-slate-400">Required</span>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="book-problem" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-[#081F5C]" />
                      Issue / Service Description
                    </Label>
                    <Textarea
                      id="book-problem"
                      name="problemDescription"
                      required
                      rows={3}
                      value={bookForm.problemDescription}
                      onChange={(ev) => setBookForm((f) => ({ ...f, problemDescription: ev.target.value }))}
                      placeholder="Describe the item or device, model/brand if known, main symptoms, and when the issue started..."
                      className={`${dialogInputClass} min-h-[4.5rem] resize-y`}
                    />
                  </div>

                  {/* Photo Upload Box */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="book-issue-photos" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Camera className="h-3.5 w-3.5 text-[#081F5C]" />
                        Upload Item Photos (Optional)
                      </Label>
                      <span className="text-[10px] font-semibold text-slate-400">Max 6 photos</span>
                    </div>

                    <label
                      htmlFor="book-issue-photos"
                      className="group flex flex-col items-center justify-center p-3 rounded-none border border-dashed border-slate-300 bg-slate-50/50 hover:bg-blue-50/50 hover:border-[#081F5C] transition-all cursor-pointer text-center"
                    >
                      <Upload className="h-5 w-5 text-slate-400 group-hover:text-[#081F5C] transition-colors" />
                      <span className="mt-1 text-xs font-bold text-slate-700 group-hover:text-[#081F5C]">
                        Click to select photo files
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">PNG, JPG, or WEBP images</span>
                      <input
                        id="book-issue-photos"
                        name="issuePhotos"
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(ev) => {
                          const files = Array.from(ev.target.files || [])
                          setIssuePhotos(files)
                        }}
                      />
                    </label>

                    {issuePhotoPreviews.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span className="flex items-center gap-1">
                            <ImageIcon className="h-3.5 w-3.5 text-[#081F5C]" />
                            {issuePhotoPreviews.length} photo{issuePhotoPreviews.length === 1 ? '' : 's'} attached
                          </span>
                          <button
                            type="button"
                            onClick={() => setIssuePhotos([])}
                            className="text-[10px] uppercase font-bold text-rose-600 hover:underline"
                          >
                            Clear all photos
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {issuePhotoPreviews.map((photo, photoIndex) => (
                            <div
                              key={photo.id}
                              className="group relative overflow-hidden rounded-none border border-slate-300 bg-white aspect-square shadow-2xs"
                            >
                              <button
                                type="button"
                                aria-label={`Remove ${photo.name}`}
                                onClick={() => {
                                  setIssuePhotos((prev) => prev.filter((_, idx) => idx !== photoIndex))
                                }}
                                className="absolute right-1 top-1 z-10 inline-flex h-5 w-5 items-center justify-center rounded-none bg-slate-900/80 text-white hover:bg-rose-600 text-xs font-bold leading-none shadow-xs transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              <img src={photo.url} alt={photo.name} className="h-full w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-1 pt-1">
                    <Label htmlFor="book-notes" className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      Additional Notes (Optional)
                    </Label>
                    <Textarea
                      id="book-notes"
                      name="notes"
                      rows={2}
                      value={bookForm.notes}
                      onChange={(ev) => setBookForm((f) => ({ ...f, notes: ev.target.value }))}
                      placeholder="e.g. preferred time to call, gate codes, parking instructions..."
                      className={`${dialogInputClass} min-h-12 resize-y`}
                    />
                  </div>
                </div>

                {/* Dialog Footer Actions */}
                <DialogFooter className="flex flex-row flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 bg-white p-2">
                  <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline-block">
                    Verify all info before proceeding to confirmation.
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 rounded-none border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-100"
                      disabled={bookSubmitting}
                      onClick={() => setBookDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={bookSubmitting}
                      className="shrink-0 gap-1.5 rounded-none bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] hover:from-[#081F5C] hover:to-[#1d5ec4] px-6 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all border border-blue-400/30"
                    >
                      {bookSubmitting ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Submitting…</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Booking Request</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Alert Dialog */}
      <AlertDialog
        open={bookingConfirmOpen}
        onOpenChange={(open) => {
          if (!open && bookSubmitting) return
          setBookingConfirmOpen(open)
        }}
      >
        <AlertDialogContent size="full" className="flex max-h-[min(90dvh,38rem)] w-[92vw] sm:w-[440px] max-w-md flex-col gap-0 overflow-hidden rounded-none border border-slate-800 bg-white p-0 shadow-[0_12px_36px_rgba(8,31,92,0.3)]">
          {/* Header Banner */}
          <div className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-4 sm:px-5 py-3 text-white shadow-md">
            <div className="relative z-10 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-none bg-emerald-600 text-white shadow-2xs">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <AlertDialogTitle className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white truncate">
                    Confirm Booking Request
                  </AlertDialogTitle>
                  <p className="text-[10px] text-slate-300 font-medium truncate">Review summary details before sending to provider.</p>
                </div>
              </div>
              {detail ? (
                <span className="hidden sm:inline-flex rounded-none border border-emerald-400/30 bg-emerald-500/20 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-300">
                  Final Review
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-x-hidden overflow-y-auto p-4 sm:p-5 bg-slate-50/50">
            <AlertDialogDescription className="text-xs leading-relaxed font-medium text-slate-600">
              By confirming, your request will be sent directly to{' '}
              <strong className="text-slate-900">{detail?.shopName?.trim() || 'the service provider'}</strong> for scheduling and review.
            </AlertDialogDescription>

            {detail ? (
              <div
                className="rounded-none border border-slate-200 bg-white p-4 shadow-2xs space-y-3.5 text-slate-900"
                role="region"
                aria-label="Request summary"
              >
                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Service</span>
                    <span className="font-extrabold text-slate-900 leading-tight text-sm block">{detail.serviceName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Provider Shop</span>
                    <span className="font-bold text-slate-800 text-sm truncate block">{detail.shopName?.trim() || '—'}</span>
                  </div>
                  <div className="border-t border-slate-100 pt-2.5 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Contact Person</span>
                      <span className="font-bold text-slate-800 text-xs block truncate">{bookForm.contactName.trim() || '—'}</span>
                      <span className="text-xs font-medium text-slate-500 block truncate">{bookForm.contactPhone.trim() || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Preferred Schedule</span>
                      <span className="font-bold text-slate-900 text-xs block">{formatDateForConfirm(bookForm.preferredDate)}</span>
                      <span className="text-xs font-bold text-[#081F5C] block">{bookForm.preferredTime || '—'}</span>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Service Option</span>
                    <span className="inline-flex items-center gap-1 font-bold text-slate-900 bg-slate-100 px-2 py-0.5 border border-slate-200 text-xs">
                      {bookForm.serviceMode === 'home' ? 'Home Service' : 'In-Shop Visit'}
                    </span>
                  </div>
                </div>

                {/* Additional info rows */}
                {(bookForm.serviceMode === 'home' || bookForm.problemDescription || issuePhotos.length > 0) ? (
                  <div className="space-y-2.5 border-t border-slate-100 pt-3 text-xs">
                    {bookForm.serviceMode === 'home' ? (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Service Address</span>
                        <span className="whitespace-pre-wrap font-semibold text-slate-800 text-xs block leading-relaxed">
                          {truncateForSummary(bookForm.serviceAddress, 180)}
                        </span>
                        {typeof bookForm.serviceLatitude === 'number' && (
                          <span className="text-[10px] font-mono text-emerald-700 font-bold block mt-0.5">
                            ✓ GPS: {bookForm.serviceLatitude.toFixed(5)}, {bookForm.serviceLongitude?.toFixed(5)}
                          </span>
                        )}
                      </div>
                    ) : null}

                    {bookForm.problemDescription ? (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Issue Description</span>
                        <span className="whitespace-pre-wrap font-medium text-slate-700 text-xs block leading-relaxed">
                          {truncateForSummary(bookForm.problemDescription, 220)}
                        </span>
                        {issuePhotos.length > 0 ? (
                          <span className="text-xs font-bold text-slate-800 block mt-1">
                            📸 {issuePhotos.length} photo{issuePhotos.length === 1 ? '' : 's'} attached
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}

            <AlertDialogFooter className="shrink-0 border-t border-slate-200 bg-white p-3 flex flex-row flex-wrap items-center justify-end gap-2">
              <AlertDialogCancel
                type="button"
                disabled={bookSubmitting}
                className="mt-0 border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-100 rounded-none h-8.5"
              >
                Go Back &amp; Edit
              </AlertDialogCancel>
              <Button
                type="button"
                disabled={bookSubmitting}
                className="h-8.5 gap-1.5 rounded-none bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] hover:from-[#081F5C] hover:to-[#1d5ec4] px-5 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all border border-blue-400/30"
                onClick={() => {
                  void performBookingSubmit()
                }}
              >
                {bookSubmitting ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Submitting…</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Confirm &amp; Submit Request</span>
                  </>
                )}
              </Button>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </CustomerLayout>
  )
}
