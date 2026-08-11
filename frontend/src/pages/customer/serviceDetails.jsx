import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Bike,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Landmark,
  Layers,
  MapPin,
  MessageCircle,
  Navigation,
  Smartphone,
  Star,
  Store,
  Tag,
  User,
  Users,
  WashingMachine,
  Wrench,
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

function goBackOrCustomerFallback() {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    window.history.back()
  } else {
    window.location.hash = '#/customer/find-services'
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

function OwnerThumb({ src, ownerName, className = 'h-10 w-10' }) {
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
    <Badge variant="outline" className="rounded-none border border-slate-200 bg-slate-100/90 text-[10px] font-bold uppercase tracking-wider text-[#081F5C]">
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
  if (normalized === 'vehicle') return 'rounded-none bg-linear-to-r from-sky-600 to-blue-700 text-white'
  if (normalized === 'gadget') return 'rounded-none bg-linear-to-r from-violet-600 to-fuchsia-600 text-white'
  if (normalized === 'appliance') return 'rounded-none bg-linear-to-r from-emerald-600 to-teal-600 text-white'
  if (normalized === 'others') return 'rounded-none bg-linear-to-r from-amber-600 to-orange-600 text-white'
  return 'rounded-none bg-linear-to-r from-slate-600 to-slate-800 text-white'
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
        <p className="text-slate-600 text-sm font-medium">Loading…</p>
      </div>
    )
  }

  const CategoryIcon = detail ? categoryIcon(detail.category) : Wrench

  const dialogInputClass =
    'h-9 w-full rounded-none border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm shadow-[0_2px_5px_rgba(15,23,42,0.14)] outline-none focus-visible:ring-1 focus-visible:ring-[#081F5C] focus-visible:border-[#081F5C] transition-all hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)] hover:border-slate-300'

  return (
    <CustomerLayout activePage="find-services">

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {detailLoading ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-none border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-2xs">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#081F5C]" />
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-900">Loading service details…</p>
            <p className="mt-1 max-w-md text-xs text-slate-500">Fetching shop and service information.</p>
          </div>
        ) : detailError ? (
          <div className="rounded-none border border-rose-300 bg-rose-50 px-6 py-8 text-center text-xs font-medium text-rose-900 shadow-2xs">
            <p className="text-sm font-bold text-rose-800">{detailError}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 rounded-none border-rose-300 text-xs font-bold uppercase tracking-wider hover:bg-rose-100"
              onClick={() => {
                window.location.hash = '#/customer/find-services'
              }}
            >
              Back to Find Services
            </Button>
          </div>
        ) : detail ? (
          <div className="space-y-6 sm:space-y-8">
            {/* Split Modern Hero Section: Service Details (Left) + Interactive Map & Shop Card (Right) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Column: Primary Service Info Banner */}
              <div className="lg:col-span-7 flex flex-col justify-between rounded-none border border-slate-200 bg-white p-6 sm:p-7 shadow-[0_3px_8px_rgba(15,23,42,0.14)]">
                <div className="space-y-4">
                  {/* Badges Bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={categoryBadgeClass(detail.category)}>{detail.category || '—'}</Badge>
                    {serviceTypeBadge(detail.type)}
                    <span className="inline-flex items-center gap-1.5 rounded-none border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Active Listing
                    </span>
                    <Badge
                      variant="outline"
                      className="rounded-none border border-slate-200 bg-slate-100/90 text-[10px] font-bold uppercase tracking-wider text-[#081F5C]"
                    >
                      <CalendarCheck className="mr-1 h-3 w-3 text-[#081F5C]" aria-hidden />
                      {detail.completedJobs ?? 0} jobs done
                    </Badge>
                  </div>

                  {/* Title & Category Header */}
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-none bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-white shadow-2xs">
                        <CategoryIcon className="h-6 w-6" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold uppercase tracking-wide text-slate-900 leading-tight">
                          {detail.serviceName}
                        </h1>
                        <p className="text-xs font-bold text-[#081F5C] mt-0.5">
                          Category: <span className="text-slate-800">{detail.category || '—'}</span>
                          {detail.subcategory?.trim() ? ` · ${detail.subcategory.trim()}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Quick specs pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-b border-slate-100 py-3.5 text-xs">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rating</p>
                      <p className="flex items-center gap-1 font-bold text-slate-900 mt-0.5">
                        <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-400 shrink-0" />
                        {typeof detail.shopRating === 'number' && detail.shopRating > 0
                          ? `${detail.shopRating.toFixed(1)} / 5.0`
                          : 'New listing'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Service Scope</p>
                      <p className="font-bold text-slate-900 truncate mt-0.5">
                        {SERVICE_TYPES.find((x) => x.value === detail.type)?.label ?? 'Standard'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Staff Assigned</p>
                      <p className="font-bold text-slate-900 mt-0.5">
                        {(detail.staff ?? []).length} {noOfTechnicianMechanicLabel(detail.category).toLowerCase().replace('no. of ', '')}
                      </p>
                    </div>
                  </div>

                  {/* Assigned Staff Preview */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Assigned Personnel
                    </p>
                    <div className="flex items-center gap-2">
                      {(detail.staff ?? []).length ? (
                        <>
                          <div className="inline-flex items-center gap-1.5">
                            {(detail.staff ?? []).slice(0, 4).map((name, idx) => (
                              <span
                                key={`${String(name)}-${idx}`}
                                title={String(name)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-none border border-white bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-[11px] font-bold text-white shadow-2xs ring-1 ring-black/5"
                              >
                                {initialsFromName(name)}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs font-semibold text-slate-600">
                            {staffAssignedLabel(detail.category, (detail.staff ?? []).length)}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs font-medium text-slate-500">
                          No dedicated staff specified; provided directly by shop owner.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Primary CTA Buttons */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    aria-label="Book this service now"
                    title={bookingFieldsTooltip(detail.type)}
                    className="h-11 flex-1 gap-2 rounded-none bg-linear-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-6 text-xs sm:text-sm font-bold uppercase tracking-wider text-white shadow-[0_4px_12px_rgba(8,31,92,0.35)] hover:shadow-[0_6px_16px_rgba(8,31,92,0.5)] transition-all hover:scale-[1.005] hover:opacity-95"
                    onClick={openBookDialog}
                  >
                    <CalendarCheck className="h-4 w-4 shrink-0" aria-hidden />
                    Book Service Now
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Contact Shop"
                    className="h-11 gap-2 rounded-none border border-slate-300 bg-white px-5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#081F5C] hover:bg-slate-100 hover:border-[#081F5C] transition-all"
                    onClick={() => {
                      storeShopRecipientForMessages(detail)
                      window.location.hash = '#/customer/messages'
                    }}
                  >
                    <MessageCircle className="h-4 w-4 shrink-0 text-[#081F5C]" />
                    Message Shop
                  </Button>
                </div>
              </div>

              {/* Right Column: Google Map + Shop Profile Card */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="overflow-hidden rounded-none border border-slate-200 bg-white shadow-[0_3px_8px_rgba(15,23,42,0.14)]">
                  {/* Shop Header Bar */}
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <OwnerThumb
                        src={resolveOwnerThumbSrc(detail)}
                        ownerName={detail.shopOwner?.trim() || detail.shopName?.trim() || ''}
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold leading-snug text-slate-900 truncate">
                          {detail.shopName?.trim() || 'Shop Location'}
                        </h3>
                        <p className="text-[11px] font-medium text-slate-500 truncate">
                          Owner: {detail.shopOwner?.trim() || '—'}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 rounded-none border-slate-300 text-[11px] font-bold uppercase tracking-wider text-[#081F5C] hover:border-[#081F5C]"
                      onClick={() => {
                        if (serviceId) window.location.hash = `#/customer/view-shop/${encodeURIComponent(serviceId)}`
                      }}
                    >
                      <Store className="mr-1 h-3.5 w-3.5" /> View Shop
                    </Button>
                  </div>

                  {/* Google Map Box */}
                  <div className="relative isolate z-0 h-[260px] sm:h-[290px] w-full bg-slate-100">
                    {mapPartsResolving ? (
                      <div className="flex h-full w-full items-center justify-center text-xs font-bold uppercase tracking-wider text-slate-500">
                        Preparing map from shop address…
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
                        <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex flex-col items-end gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="pointer-events-auto h-8 gap-1.5 rounded-none border border-slate-200 bg-white/95 text-[11px] font-bold text-[#081F5C] shadow-[0_2px_5px_rgba(15,23,42,0.14)] hover:bg-white hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)]"
                            disabled={mapLocationLoading}
                            onClick={captureMapUserLocation}
                          >
                            <Navigation className="h-3 w-3 shrink-0" aria-hidden />
                            {mapLocationLoading ? 'Getting location…' : headerMapSecondaryPin ? 'Update location' : 'Route from my location'}
                          </Button>
                          {headerMapSecondaryPin ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="pointer-events-auto h-6 rounded-none bg-white/90 px-2 text-[10px] font-semibold text-slate-600 shadow-2xs hover:bg-white"
                              onClick={clearMapUserLocation}
                            >
                              Clear route
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Shop Location Info Footer */}
                  <div className="p-4 space-y-2 border-t border-slate-200 bg-white text-xs">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#081F5C]" />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shop Address</p>
                        <p className="font-semibold text-slate-800 leading-snug">{detail.shopAddress?.trim() || '—'}</p>
                      </div>
                    </div>
                    {detail.shopLandmark?.trim() ? (
                      <div className="flex items-start gap-2 pt-1 border-t border-slate-100">
                        <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-[#081F5C]" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Landmark</p>
                          <p className="font-semibold text-slate-800 leading-snug">{detail.shopLandmark.trim()}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Key Statistics Strip Grid */}
            <div
              id="customer-shop-summary-table"
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
              role="region"
              aria-label="Shop key statistics"
            >
              <div className="rounded-none border border-slate-200 bg-white p-4 shadow-[0_2px_5px_rgba(15,23,42,0.12)]">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-[#081F5C]/10 text-[#081F5C]">
                    <Layers className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Services</p>
                    <p className="text-sm font-extrabold text-slate-900 tabular-nums">
                      {shopContext?.activeServiceCount != null ? shopContext.activeServiceCount : '—'} Active
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-none border border-slate-200 bg-white p-4 shadow-[0_2px_5px_rgba(15,23,42,0.12)]">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-[#081F5C]/10 text-[#081F5C]">
                    <Clock className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Operating Hours</p>
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {detail.shopOperatingHours?.trim() ? detail.shopOperatingHours.trim() : 'Mon - Sat'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-none border border-slate-200 bg-white p-4 shadow-[0_2px_5px_rgba(15,23,42,0.12)]">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-[#081F5C]/10 text-[#081F5C]">
                    <Star className="h-4 w-4 fill-amber-300 text-amber-400" />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shop Rating</p>
                    <p className="text-sm font-extrabold text-slate-900 tabular-nums">
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
              </div>

              <div className="rounded-none border border-slate-200 bg-white p-4 shadow-[0_2px_5px_rgba(15,23,42,0.12)]">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-[#081F5C]/10 text-[#081F5C]">
                    <CalendarDays className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date Joined</p>
                    <p className="text-xs font-bold text-slate-900">
                      {formatShopOwnerJoinedAt(detail.shopOwnerJoinedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Structured 2-Column Content Layout: Main Info (Left) + How It Works / Overview (Right) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left Main Content Column */}
              <div className="lg:col-span-8 space-y-6 sm:space-y-8">
                {/* Description Card */}
                <div className="rounded-none border border-slate-200 bg-white p-6 shadow-[0_3px_8px_rgba(15,23,42,0.14)] space-y-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5">
                    <FileText className="h-4 w-4 text-[#081F5C]" /> Service Description
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium pt-1">
                    {detail.description || 'No description available for this service.'}
                  </p>
                </div>

                {/* Completed Works Showcase */}
                <section aria-labelledby="completed-works-heading" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2
                      id="completed-works-heading"
                      className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900 sm:text-base"
                    >
                      <ClipboardList className="h-5 w-5 text-[#081F5C]" aria-hidden />
                      Completed Works Showcase
                    </h2>
                    <span className="text-xs font-medium text-slate-500">Sample finished repair jobs</span>
                  </div>
                  <div
                    className="flex flex-nowrap gap-4 overflow-x-auto overscroll-x-contain pb-2 scroll-smooth snap-x snap-mandatory [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    role="list"
                    aria-label="Completed work entries"
                  >
                    {MOCK_COMPLETED_WORKS.map((job) => {
                      const { time, date } = formatCompletedWorkDateTime(job.completedAt)
                      return (
                        <article
                          key={job.id}
                          role="listitem"
                          className="w-[min(380px,calc(100vw-3rem))] shrink-0 snap-start rounded-none border border-slate-200 bg-white p-5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-300 hover:border-[#081F5C] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)]"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-bold text-white shadow-2xs"
                              aria-hidden
                            >
                              {initialsFromName(job.customerName)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-slate-900">{job.customerName}</p>
                              <p className="text-[11px] font-medium text-slate-500">Verified Customer</p>
                            </div>
                          </div>
                          <div className="mt-3 border-t border-slate-100 pt-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Work completed
                            </p>
                            <p className="mt-1 text-xs sm:text-sm font-medium leading-relaxed text-slate-800">
                              {job.whatWasFixed}
                            </p>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-xs tabular-nums">
                            <span className="shrink-0 font-bold text-[#081F5C]">{time}</span>
                            <span className="min-w-0 text-right font-semibold text-slate-500">{date}</span>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </section>
              </div>

              {/* Right Sidebar Column */}
              <div className="lg:col-span-4 space-y-6">
                {/* How Booking Works Checklist Card */}
                <div className="rounded-none border border-slate-200 bg-white p-5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Booking Guide &amp; Process
                  </h3>
                  <ol className="space-y-3 text-xs font-medium text-slate-700">
                    <li className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-[#081F5C] text-[10px] font-bold text-white">1</span>
                      <div>
                        <p className="font-bold text-slate-900">Choose Schedule &amp; Contact</p>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">Provide preferred date, time, and active mobile number.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-[#081F5C] text-[10px] font-bold text-white">2</span>
                      <div>
                        <p className="font-bold text-slate-900">Select Service Option</p>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">In-shop visit or home service with optional GPS pin.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-[#081F5C] text-[10px] font-bold text-white">3</span>
                      <div>
                        <p className="font-bold text-slate-900">Describe Issue &amp; Upload Photos</p>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">Attach clear photos of symptoms for accurate assessment.</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-[#081F5C] text-[10px] font-bold text-white">4</span>
                      <div>
                        <p className="font-bold text-slate-900">Provider Confirmation</p>
                        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">Track booking status under "My Bookings" in real-time.</p>
                      </div>
                    </li>
                  </ol>
                </div>

                {/* Direct Action Card */}
                <div className="rounded-none border border-slate-200 bg-white p-5 shadow-[0_3px_8px_rgba(15,23,42,0.14)] space-y-3 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-900">Ready to schedule repair?</p>
                  <p className="text-xs font-medium text-slate-500 leading-relaxed">
                    Submit your booking request directly to <span className="font-bold text-slate-800">{detail.shopName?.trim() || 'the shop'}</span>.
                  </p>
                  <Button
                    type="button"
                    className="w-full h-10 rounded-none bg-linear-to-r from-[#04133d] to-[#081F5C] text-xs font-bold uppercase tracking-wider text-white shadow-[0_2px_6px_rgba(8,31,92,0.4)] hover:shadow-[0_4px_10px_rgba(8,31,92,0.55)] transition-all"
                    onClick={openBookDialog}
                  >
                    <CalendarCheck className="mr-1.5 h-4 w-4" /> Book Service Now
                  </Button>
                </div>
              </div>
            </div>

            {/* Full Width: Customer Reviews & Ratings Section */}
            <section aria-labelledby="service-reviews-heading" className="w-full space-y-3">
              <div className="w-full rounded-none border border-slate-200 bg-white p-6 shadow-[0_3px_8px_rgba(15,23,42,0.14)] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
                  <h2
                    id="service-reviews-heading"
                    className="flex items-center gap-2 text-base sm:text-lg font-bold uppercase tracking-wider text-slate-900"
                  >
                    <Star className="h-5 w-5 fill-amber-300 text-amber-400" aria-hidden />
                    Customer Reviews &amp; Ratings
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.hash = '#/customer/reviews-ratings'
                    }}
                    className="text-xs font-bold uppercase tracking-wider text-[#081F5C] hover:underline"
                  >
                    View all ›
                  </button>
                </div>

                {/* Overall Rating Score Header */}
                <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 border border-slate-200">
                  <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tabular-nums">
                    {hasServiceRatings ? serviceRatingAverage.toFixed(1) : '0.0'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1" aria-hidden>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 sm:h-5 sm:w-5 ${
                            i < Math.floor(hasServiceRatings ? serviceRatingAverage : 0)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-600">
                      Based on {serviceRatingCount} customer review{serviceRatingCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                {/* Filters Bar */}
                {serviceReviewsList.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setServiceReviewFilter('all')}
                      className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all ${
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
                        className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all ${
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
                      className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all ${
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
                      className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all ${
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
                <div className="border-t border-slate-100 pt-3">
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
                          <li key={review.id} className="flex gap-3 py-4 first:pt-0">
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-bold text-white shadow-2xs"
                              aria-hidden
                            >
                              {initialsFromName(displayName)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-bold text-slate-900">{displayName}</p>
                                <span className="text-xs font-medium text-slate-400">{dateStr}</span>
                              </div>
                              <div className="mt-1 flex items-center gap-1" aria-label={`${normalizedRating} out of 5 stars`}>
                                {[0, 1, 2, 3, 4].map((i) => (
                                  <Star
                                    key={i}
                                    className={`h-3.5 w-3.5 ${
                                      i < normalizedRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                                    }`}
                                  />
                                ))}
                              </div>
                              {typeof review.comment === 'string' && review.comment.trim().length > 0 ? (
                                <p className="mt-2 text-xs sm:text-sm font-medium leading-relaxed text-slate-700">
                                  {review.comment}
                                </p>
                              ) : null}
                              {Array.isArray(review.images) && review.images.length > 0 ? (
                                <div className="mt-2.5 flex flex-wrap gap-2">
                                  {review.images.map((imgUrl, imgIdx) => (
                                    <div
                                      key={imgIdx}
                                      className="h-16 w-16 overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs"
                                    >
                                      <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                              {review.shopResponse ? (
                                <div className="mt-3 border-l-2 border-[#081F5C] bg-slate-50 p-3 text-xs">
                                  <p className="font-bold uppercase tracking-wider text-[#081F5C] text-[10px]">
                                    Shop Response
                                  </p>
                                  <p className="mt-1 font-medium text-slate-700 leading-snug">{review.shopResponse}</p>
                                </div>
                              ) : null}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="py-6 text-center text-xs font-medium text-slate-500">
                      No reviews match the selected filter.
                    </p>
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </main>

      {/* Booking Dialog Modal */}
      <Dialog
        open={bookDialogOpen}
        onOpenChange={(open) => {
          if (!open && bookSubmitting) return
          setBookDialogOpen(open)
        }}
      >
        <DialogContent className="flex max-h-[min(90dvh,42rem)] w-full max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden rounded-none border border-slate-200 bg-white p-0 shadow-[0_6px_16px_rgba(8,31,92,0.22)] sm:max-w-xl">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto overscroll-contain p-5 sm:p-6">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-base font-bold uppercase tracking-wider text-[#081F5C] sm:text-lg">
                {bookSuccess ? 'Booking Completed' : 'Book this service'}
              </DialogTitle>
              <DialogDescription className="text-xs leading-relaxed text-slate-600 font-medium sm:text-sm">
                {bookSuccess ? (
                  <>
                    Thank you — your request has been sent successfully.{' '}
                    {detail ? (
                      <>
                        <span className="font-bold text-slate-900">{detail.shopName?.trim() || 'The shop'}</span> has
                        received your booking for <span className="font-bold text-slate-900">{detail.serviceName}</span> and
                        will review it shortly.
                      </>
                    ) : (
                      'The service provider has received your booking and will review it shortly.'
                    )}{' '}
                    They may reach out using the contact details you provided. You can review this and other requests anytime under{' '}
                    <span className="font-bold text-slate-900">My bookings</span>.
                  </>
                ) : detail ? (
                  <>
                    Complete all required fields so{' '}
                    <span className="font-bold text-slate-900">{detail.shopName?.trim() || 'the shop'}</span> can review your
                    request for <span className="font-bold text-slate-900">{detail.serviceName}</span>. Include your contact
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
              <div className="rounded-none border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 font-medium">
                <span className="font-bold uppercase tracking-wider text-amber-950">Provider note: </span>
                {String(detail.requirements).trim()}
              </div>
            ) : null}

            {bookSuccess ? (
              <div className="space-y-4 pt-2">
                <p className="rounded-none border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900 sm:text-sm">
                  {bookSuccess}
                </p>
                <DialogFooter className="flex flex-row flex-wrap items-center justify-end gap-2 border-0 bg-transparent p-0 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 rounded-none border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-100"
                    onClick={() => {
                      setBookDialogOpen(false)
                      window.location.hash = '#/customer/my-bookings'
                    }}
                  >
                    View my bookings
                  </Button>
                  <Button
                    type="button"
                    className="shrink-0 rounded-none bg-linear-to-r from-[#04133d] to-[#081F5C] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[0_2px_6px_rgba(8,31,92,0.4)] hover:shadow-[0_4px_10px_rgba(8,31,92,0.55)] transition-all"
                    onClick={() => {
                      if (detail?.shopOwnerId) storeShopRecipientForMessages(detail)
                      setBookDialogOpen(false)
                      window.location.hash = '#/customer/messages'
                    }}
                  >
                    Close
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleBookingFormSubmit} className="space-y-3.5">
                {bookError ? (
                  <p className="rounded-none border border-rose-300 bg-rose-50 p-3 text-xs font-bold text-rose-800" role="alert">
                    {bookError}
                  </p>
                ) : null}

                <div className="space-y-1">
                  <Label htmlFor="book-contact-name" className="text-xs font-bold uppercase tracking-wider text-slate-700">Contact full name</Label>
                  <Input
                    id="book-contact-name"
                    name="contactName"
                    autoComplete="name"
                    required
                    value={bookForm.contactName}
                    onChange={(ev) => setBookForm((f) => ({ ...f, contactName: ev.target.value }))}
                    placeholder="Enter the name we should use for this booking"
                    className={dialogInputClass}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="book-contact-phone" className="text-xs font-bold uppercase tracking-wider text-slate-700">Mobile / phone number</Label>
                  <Input
                    id="book-contact-phone"
                    name="contactPhone"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={bookForm.contactPhone}
                    onChange={(ev) => setBookForm((f) => ({ ...f, contactPhone: ev.target.value }))}
                    placeholder="e.g. 09XX XXX XXXX"
                    className={dialogInputClass}
                  />
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="book-pref-date" className="text-xs font-bold uppercase tracking-wider text-slate-700">Preferred service date</Label>
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
                    <Label htmlFor="book-pref-time" className="text-xs font-bold uppercase tracking-wider text-slate-700">Preferred time</Label>
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

                {detail?.type === 'both' ? (
                  <div className="space-y-1">
                    <Label htmlFor="book-service-mode" className="text-xs font-bold uppercase tracking-wider text-slate-700">Service option</Label>
                    <NativeSelect
                      id="book-service-mode"
                      name="serviceMode"
                      className={dialogInputClass}
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
                  <p className="text-xs font-medium text-slate-500">
                    {detail?.type === 'home'
                      ? 'This service is offered as home service only.'
                      : detail?.type === 'in-shop'
                        ? 'This service is in-shop only — please bring your item to the shop.'
                        : null}
                  </p>
                )}

                {bookForm.serviceMode === 'home' ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="book-service-address" className="text-xs font-bold uppercase tracking-wider text-slate-700">Service address</Label>
                      <Textarea
                        id="book-service-address"
                        name="serviceAddress"
                        required
                        rows={2}
                        value={bookForm.serviceAddress}
                        onChange={(ev) => setBookForm((f) => ({ ...f, serviceAddress: ev.target.value }))}
                        placeholder="Street, barangay, city, landmarks or building access details"
                        className={`${dialogInputClass} min-h-[4.25rem] resize-y`}
                      />
                    </div>
                    <div className="rounded-none border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-900">Location pin (GPS)</p>
                          <p className="text-[11px] leading-snug font-medium text-slate-500">
                            Share your current position so the technician can open it on a map. Your browser will ask for
                            permission. The written address above is still required.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 shrink-0 gap-1.5 rounded-none border border-slate-200 bg-white text-xs font-bold uppercase tracking-wider text-[#081F5C] shadow-2xs hover:bg-slate-100"
                          disabled={locationCaptureLoading || bookSubmitting}
                          onClick={captureCustomerLocation}
                        >
                          <Navigation className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {locationCaptureLoading ? 'Getting location…' : 'Use current location'}
                        </Button>
                      </div>
                      {locationCaptureError ? (
                        <p className="mt-2 text-xs font-bold text-rose-600" role="alert">
                          {locationCaptureError}
                        </p>
                      ) : null}
                      {typeof bookForm.serviceLatitude === 'number' &&
                      Number.isFinite(bookForm.serviceLatitude) &&
                      typeof bookForm.serviceLongitude === 'number' &&
                      Number.isFinite(bookForm.serviceLongitude) ? (
                        <div className="mt-2 flex flex-col gap-2 rounded-none border border-emerald-300 bg-emerald-50 p-2.5 text-xs">
                          <p className="font-bold text-emerald-900 uppercase tracking-wider">
                            Location saved for this request
                          </p>
                          <p className="font-mono text-[11px] text-slate-600">
                            {bookForm.serviceLatitude.toFixed(6)}, {bookForm.serviceLongitude.toFixed(6)}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={`https://www.google.com/maps?q=${bookForm.serviceLatitude},${bookForm.serviceLongitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#081F5C] underline-offset-2 hover:underline"
                            >
                              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                              Open in Google Maps
                            </a>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100"
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

                <div className="space-y-1">
                  <Label htmlFor="book-issue-photos" className="text-xs font-bold uppercase tracking-wider text-slate-700">Upload photos of the item to be repaired (optional)</Label>
                  <Input
                    id="book-issue-photos"
                    name="issuePhotos"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(ev) => {
                      const files = Array.from(ev.target.files || [])
                      setIssuePhotos(files)
                    }}
                    className={dialogInputClass}
                  />
                  <p className="text-[11px] font-medium text-slate-500">
                    Add clear photos so the service provider can better assess the issue before your schedule.
                  </p>
                  {issuePhotoPreviews.length > 0 ? (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-bold text-slate-800">
                        {issuePhotoPreviews.length} photo{issuePhotoPreviews.length === 1 ? '' : 's'} selected
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {issuePhotoPreviews.map((photo, photoIndex) => (
                          <div
                            key={photo.id}
                            className="group relative overflow-hidden rounded-none border border-slate-200 bg-white"
                          >
                            <button
                              type="button"
                              aria-label={`Remove ${photo.name}`}
                              onClick={() => {
                                setIssuePhotos((prev) => prev.filter((_, idx) => idx !== photoIndex))
                              }}
                              className="absolute right-1.5 top-1.5 z-10 inline-flex h-6 w-6 items-center justify-center rounded-none bg-black/65 text-sm font-bold leading-none text-white opacity-0 shadow-sm transition-opacity hover:bg-black/80 group-hover:opacity-100 focus-visible:opacity-100"
                            >
                              ×
                            </button>
                            <div className="aspect-square w-full bg-slate-100">
                              <img src={photo.url} alt={photo.name} className="h-full w-full object-cover" />
                            </div>
                            <p className="truncate border-t border-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">
                              {photo.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="book-problem" className="text-xs font-bold uppercase tracking-wider text-slate-700">Issue or service description</Label>
                  <Textarea
                    id="book-problem"
                    name="problemDescription"
                    required
                    rows={3}
                    value={bookForm.problemDescription}
                    onChange={(ev) => setBookForm((f) => ({ ...f, problemDescription: ev.target.value }))}
                    placeholder="Describe the device or item, brand/model if known, symptoms, and when the issue began"
                    className={`${dialogInputClass} min-h-[5rem] resize-y`}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="book-notes" className="text-xs font-bold uppercase tracking-wider text-slate-700">Additional notes (optional)</Label>
                  <Textarea
                    id="book-notes"
                    name="notes"
                    rows={2}
                    value={bookForm.notes}
                    onChange={(ev) => setBookForm((f) => ({ ...f, notes: ev.target.value }))}
                    placeholder="e.g. gate codes, parking, preferred times to call"
                    className={`${dialogInputClass} min-h-12 resize-y`}
                  />
                </div>

                <DialogFooter className="flex flex-row flex-wrap items-center justify-end gap-2 border-0 bg-transparent p-0 pt-3">
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
                    className="shrink-0 rounded-none bg-linear-to-r from-[#04133d] to-[#081F5C] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[0_2px_6px_rgba(8,31,92,0.4)] hover:shadow-[0_4px_10px_rgba(8,31,92,0.55)] transition-all"
                  >
                    {bookSubmitting ? 'Submitting…' : 'Submit booking request'}
                  </Button>
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
        <AlertDialogContent className="flex max-h-[min(90dvh,32rem)] w-full max-w-[calc(100%-1.5rem)] flex-col gap-3 overflow-hidden rounded-none border border-slate-200 bg-white p-5 shadow-[0_6px_16px_rgba(8,31,92,0.22)] sm:max-w-xl">
          <AlertDialogHeader className="shrink-0 space-y-1 text-left">
            <AlertDialogTitle className="text-base font-bold uppercase tracking-wider text-[#081F5C]">
              Confirm your booking request
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left text-xs leading-snug font-medium text-slate-600">
              Please review the summary below. By confirming, you certify that the information is correct to the best of your
              knowledge and that you wish to submit this booking request to the service provider for review.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {detail ? (
            <div
              className="min-h-0 shrink overflow-y-auto overscroll-contain rounded-none border border-slate-200 bg-slate-50 p-3.5 text-left text-slate-900"
              role="region"
              aria-label="Request summary"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Request summary</p>
              <dl className="mt-2 space-y-2 text-xs sm:text-sm">
                <div>
                  <dt className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Service</dt>
                  <dd className="font-bold text-slate-900">{detail.serviceName}</dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Provider</dt>
                  <dd className="font-semibold text-slate-800">{detail.shopName?.trim() || '—'}</dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Contact</dt>
                  <dd className="font-semibold text-slate-800">
                    {bookForm.contactName.trim() || '—'} · {bookForm.contactPhone.trim() || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Preferred schedule</dt>
                  <dd className="font-semibold text-slate-800">
                    {formatDateForConfirm(bookForm.preferredDate)} · {bookForm.preferredTime || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Service option</dt>
                  <dd className="font-semibold text-slate-800">{bookForm.serviceMode === 'home' ? 'Home service' : 'In-shop visit'}</dd>
                </div>
                {bookForm.serviceMode === 'home' ? (
                  <div>
                    <dt className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Service address</dt>
                    <dd className="whitespace-pre-wrap font-semibold text-slate-800">{truncateForSummary(bookForm.serviceAddress, 220)}</dd>
                  </div>
                ) : null}
                {bookForm.serviceMode === 'home' &&
                typeof bookForm.serviceLatitude === 'number' &&
                Number.isFinite(bookForm.serviceLatitude) &&
                typeof bookForm.serviceLongitude === 'number' &&
                Number.isFinite(bookForm.serviceLongitude) ? (
                  <div>
                    <dt className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Location pin</dt>
                    <dd className="font-bold text-emerald-800">
                      GPS coordinates will be shared with this request.
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Issue / service details</dt>
                  <dd className="whitespace-pre-wrap font-semibold text-slate-800">{truncateForSummary(bookForm.problemDescription, 280)}</dd>
                </div>
                {bookForm.notes.trim() ? (
                  <div>
                    <dt className="font-bold text-slate-500 text-[10px] uppercase tracking-wider">Additional notes</dt>
                    <dd className="whitespace-pre-wrap font-semibold text-slate-800">{truncateForSummary(bookForm.notes, 180)}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          ) : null}
          <AlertDialogFooter className="shrink-0 border-0 bg-transparent p-0 pt-1 flex flex-row flex-wrap items-center justify-end gap-2">
            <AlertDialogCancel
              type="button"
              disabled={bookSubmitting}
              className="mt-0 border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-100"
            >
              Go back and edit
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={bookSubmitting}
              className="bg-linear-to-r from-[#04133d] to-[#081F5C] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[0_2px_6px_rgba(8,31,92,0.4)] hover:shadow-[0_4px_10px_rgba(8,31,92,0.55)] transition-all"
              onClick={() => {
                void performBookingSubmit()
              }}
            >
              {bookSubmitting ? 'Submitting…' : 'Confirm and submit request'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CustomerLayout>
  )
}
