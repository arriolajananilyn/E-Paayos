import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Bike,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  CreditCard,
  DollarSign,
  Eye,
  FileText,
  Home,
  Image as ImageIcon,
  Layers,
  Loader2,
  MapPin,
  MessageCircle,
  MessageSquare,
  Navigation,
  Package,
  Phone,
  Radio,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Star,
  Store,
  Tag,
  Truck,
  Upload,
  User,
  WashingMachine,
  Wrench,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import CustomerLayout, { readCustomerUserSession } from '../../layout/customerlayout.jsx'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { formatReadableShopAddress } from '../../lib/psgcResolve'
import { ServiceReceiptDialog } from '../../components/bookings/ServiceReceiptDialog.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

const cardShadow =
  'shadow-[0_4px_20px_-4px_rgba(15,23,42,0.16)] transition-shadow duration-200 hover:shadow-[0_8px_30px_-8px_rgba(15,23,42,0.22)]'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

// Municipality center coordinates lookup for Marinduque
const TOWN_COORDINATES = {
  boac: { lat: 13.4453, lng: 121.8403 },
  mogpog: { lat: 13.477, lng: 121.86 },
  gasan: { lat: 13.3225, lng: 121.8467 },
  buenavista: { lat: 13.255, lng: 121.947 },
  torrijos: { lat: 13.318, lng: 122.085 },
  'santa cruz': { lat: 13.4833, lng: 122.027 },
  'sta. cruz': { lat: 13.4833, lng: 122.027 },
}

// Barangay center coordinates lookup for precise Marinduque locations
const MARINDUQUE_BARANGAY_COORDINATES = {
  // Boac
  'san miguel': { lat: 13.4428, lng: 121.8422 },
  mercado: { lat: 13.4465, lng: 121.8395 },
  isok: { lat: 13.449, lng: 121.8415 },
  balimbing: { lat: 13.435, lng: 121.851 },
  balagbag: { lat: 13.428, lng: 121.847 },
  balaning: { lat: 13.421, lng: 121.862 },
  bangbang: { lat: 13.411, lng: 121.855 },
  amoingon: { lat: 13.425, lng: 121.832 },
  cawit: { lat: 13.398, lng: 121.821 },
  laylay: { lat: 13.437, lng: 121.827 },
  poras: { lat: 13.422, lng: 121.825 },
  murallon: { lat: 13.4475, lng: 121.8385 },
  buntay: { lat: 13.4495, lng: 121.837 },
  tabi: { lat: 13.456, lng: 121.843 },
  pawa: { lat: 13.468, lng: 121.849 },
  malusa: { lat: 13.472, lng: 121.838 },
  mainit: { lat: 13.385, lng: 121.858 },
  // Mogpog
  'market site': { lat: 13.476, lng: 121.8615 },
  dulangan: { lat: 13.485, lng: 121.869 },
  capayang: { lat: 13.491, lng: 121.875 },
  balanacan: { lat: 13.536, lng: 121.87 },
  silangan: { lat: 13.478, lng: 121.863 },
  sumangga: { lat: 13.468, lng: 121.867 },
  janagdong: { lat: 13.462, lng: 121.871 },
  // Gasan
  banot: { lat: 13.3225, lng: 121.8467 },
  libtangin: { lat: 13.338, lng: 121.841 },
  pinggan: { lat: 13.348, lng: 121.838 },
  bachao: { lat: 13.305, lng: 121.852 },
  mahunig: { lat: 13.315, lng: 121.862 },
  dunge: { lat: 13.298, lng: 121.865 },
  // Buenavista
  daykitin: { lat: 13.262, lng: 121.938 },
  yook: { lat: 13.242, lng: 121.965 },
  lipata: { lat: 13.235, lng: 121.972 },
  bagacay: { lat: 13.271, lng: 121.955 },
  // Torrijos
  poctoy: { lat: 13.308, lng: 122.095 },
  malakiting: { lat: 13.325, lng: 122.072 },
  marlangga: { lat: 13.288, lng: 122.092 },
  buangan: { lat: 13.332, lng: 122.062 },
  // Santa Cruz
  buyabod: { lat: 13.498, lng: 122.055 },
  mahamoc: { lat: 13.475, lng: 122.038 },
  'lapu-lapu': { lat: 13.487, lng: 122.021 },
  mantiang: { lat: 13.462, lng: 122.015 },
  banahaw: { lat: 13.491, lng: 122.042 },
}

function normalizeBookingStatus(status) {
  if (!status) return 'pending'
  const s = String(status).toLowerCase().trim()
  if (s === 'pending') return 'pending'
  if (s === 'confirmed') return 'confirmed'
  if (s === 'working') return 'working'
  if (s === 'fixed') return 'fixed'
  if (s === 'completed') return 'completed'
  if (s === 'cancelled' || s === 'canceled') return 'cancelled'
  return s
}

function getBookingStatusLabel(status, b = null) {
  if (b?.warrantyClaim && b.warrantyClaim.status === 'pending') {
    if (b.warrantyClaim.claimType === 'labor_rework' || !b.warrantyClaim.claimType) {
      return 'Refix / Re-repair Request'
    }
    return 'Warranty Claim Pending'
  }
  if (b?.warrantyClaim && b.warrantyClaim.status === 'approved') {
    return b.warrantyClaim.claimType === 'labor_rework' ? 'Refix Approved' : 'Warranty Refund Approved'
  }
  if (b?.warrantyClaim && (b.warrantyClaim.status === 'working' || b.warrantyClaim.status === 'in_progress')) {
    return 'Re-repairing'
  }
  if (b?.warrantyClaim && b.warrantyClaim.status === 'fixed') {
    return 'Refix Fixed'
  }
  if (b?.warrantyClaim && (b.warrantyClaim.status === 'resolved' || b.warrantyClaim.status === 'completed')) {
    return 'Refix Completed'
  }
  if (b?.warrantyClaim && b.warrantyClaim.status === 'rejected') {
    return b.warrantyClaim.claimType === 'labor_rework' ? 'Refix Declined' : 'Warranty Claim Rejected'
  }

  const norm = normalizeBookingStatus(status)
  if (norm === 'working') {
    if (b?.serviceFeeConfirmedAt) {
      return 'Calculating Service Fee'
    }
    return 'Working'
  }
  if (norm === 'fixed') {
    return 'Fixed'
  }
  if (norm === 'completed') {
    return 'Completed'
  }
  switch (norm) {
    case 'pending':
      return 'Booking Submitted'
    case 'confirmed':
      return 'Booking Confirmed'
    case 'cancelled':
      return 'Booking Cancelled'
    default:
      return status || 'Booking Submitted'
  }
}

function getStepIndexByStatus(status, b = null) {
  const norm = normalizeBookingStatus(status)
  switch (norm) {
    case 'pending':
      return 0
    case 'confirmed':
      return 1
    case 'working':
      return b?.serviceFeeConfirmedAt ? 3 : 2
    case 'fixed':
      return 4
    case 'completed':
      return (b?.customerReviewedAt || b?.customerReviewRating) ? 6 : 5
    case 'cancelled':
      return 1
    default:
      return 0
  }
}

function formatAssignedRole(jobTitle, category) {
  const cat = String(category || '').toLowerCase()
  const isVehicle = cat === 'vehicle'
  const defaultRole = isVehicle ? 'Mechanic' : 'Technician'
  const title = String(jobTitle || '').trim()
  if (!title) return defaultRole
  if (/^mechanic\s*[\/\-]\s*technician$/i.test(title)) {
    return defaultRole
  }
  return title
}

function formatDateTime(date) {
  if (!date) return ''
  try {
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) return String(date)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return String(date)
  }
}

function formatCurrency(amount) {
  const num = Number(amount || 0)
  return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function resolveIssuePhotoSrc(src) {
  const value = String(src ?? '').trim()
  if (!value) return ''
  if (/^(data:|blob:)/i.test(value)) return value
  if (value.startsWith('/uploads/')) return `${API_URL}${value}`
  if (/^https?:\/\//i.test(value)) return value
  return value
}

export default function CustomerBookingDetails({ bookingId: propBookingId }) {
  const user = readCustomerUserSession()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [readableShopAddress, setReadableShopAddress] = useState('')
  const [downloadingReceipt, setDownloadingReceipt] = useState(false)
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [activePhotoSrc, setActivePhotoSrc] = useState('')
  const [photoModalTitle, setPhotoModalTitle] = useState('')
  const [photoModalList, setPhotoModalList] = useState([])
  const [photoModalIndex, setPhotoModalIndex] = useState(0)

  const openPhotoModal = (srcOrList, title = 'Photo Preview', initialIndex = 0) => {
    if (Array.isArray(srcOrList)) {
      const list = srcOrList.map(resolveIssuePhotoSrc).filter(Boolean)
      if (!list.length) return
      setPhotoModalList(list)
      setPhotoModalIndex(initialIndex)
      setActivePhotoSrc(list[initialIndex] || list[0])
    } else {
      const resolved = resolveIssuePhotoSrc(srcOrList)
      setPhotoModalList([resolved])
      setPhotoModalIndex(0)
      setActivePhotoSrc(resolved)
    }
    setPhotoModalTitle(title)
    setShowPhotoModal(true)
  }
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [leafletReady, setLeafletReady] = useState(() => Boolean(typeof window !== 'undefined' && window.L))

  // Pay Now dialog states
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('')
  const [paymentProofImage, setPaymentProofImage] = useState('')
  const [payError, setPayError] = useState('')
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)

  // Warranty Claim & Refund dialog states
  const [showWarrantyClaimDialog, setShowWarrantyClaimDialog] = useState(false)
  const [claimType, setClaimType] = useState('labor_rework')
  const [claimReason, setClaimReason] = useState('')
  const [claimDetails, setClaimDetails] = useState('')
  const [claimProofPhotos, setClaimProofPhotos] = useState([])
  const [refundMethod, setRefundMethod] = useState('gcash')
  const [refundAccountName, setRefundAccountName] = useState('')
  const [refundAccountNumber, setRefundAccountNumber] = useState('')
  const [claimError, setClaimError] = useState('')
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false)

  const mapInstanceRef = useRef(null)
  const mapLayersRef = useRef(null)
  const routeSignatureRef = useRef('')

  // Determine booking ID from prop, hash, or localStorage
  const activeBookingId = useMemo(() => {
    if (propBookingId) return propBookingId
    const hash = window.location.hash || ''
    if (hash.startsWith('#/customer/booking-details/')) {
      const raw = hash.slice('#/customer/booking-details/'.length)
      return decodeURIComponent(raw.split('?')[0] || '')
    }
    const params = new URLSearchParams(hash.split('?')[1] || '')
    return params.get('id') || params.get('bookingId') || ''
  }, [propBookingId])

  const fetchBooking = useCallback(async () => {
    if (!activeBookingId) {
      setLoading(false)
      setError('No booking ID specified.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/catalog/bookings/${activeBookingId}`, {
        headers: authHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.booking) {
        setBooking(data.booking)
        if (data.booking.shopAddress) {
          setReadableShopAddress(data.booking.shopAddress)
        }
      } else {
        // Fallback: search in listCustomerBookings
        const listRes = await fetch(`${API_URL}/api/catalog/bookings`, {
          headers: authHeaders(),
        })
        const listData = await listRes.json().catch(() => ({}))
        const found = Array.isArray(listData?.bookings)
          ? listData.bookings.find((b) => String(b.id) === String(activeBookingId) || String(b.ref) === String(activeBookingId))
          : null
        if (found) {
          setBooking(found)
          if (found.shopAddress) setReadableShopAddress(found.shopAddress)
        } else {
          throw new Error(data?.message || 'Could not load booking details.')
        }
      }
    } catch (e) {
      setError(e?.message || 'Failed to fetch booking details.')
    } finally {
      setLoading(false)
    }
  }, [activeBookingId])

  useEffect(() => {
    fetchBooking()
  }, [fetchBooking])

  // Resolve readable address using PSGC helper if geo fields are present
  useEffect(() => {
    if (!booking) return
    let active = true
    ;(async () => {
      try {
        const line = await formatReadableShopAddress({
          shopRegion: booking.shopRegion,
          shopProvince: booking.shopProvince,
          shopCityMunicipality: booking.shopCityMunicipality,
          shopBarangay: booking.shopBarangay,
          shopDetailedAddress: booking.shopDetailedAddress,
        })
        if (active && line && line !== '—') {
          setReadableShopAddress(line)
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      active = false
    }
  }, [booking])

  const isHomeService = booking?.serviceMode === 'home'
  const status = normalizeBookingStatus(booking?.status)
  const currentStepIndex = getStepIndexByStatus(status, booking)
  const isWorking = status === 'working' || status === 'fixed' || status === 'completed'
  const isFixed = status === 'fixed' || status === 'completed'
  const isCompleted = status === 'completed'
  const isMapActive = status !== 'cancelled' && (isHomeService || status === 'confirmed' || status === 'working')

  // Coordinates resolution
  const originCoords = useMemo(() => {
    const raw = (readableShopAddress || booking?.shopAddress || '').toLowerCase()
    for (const [key, coords] of Object.entries(MARINDUQUE_BARANGAY_COORDINATES)) {
      if (raw.includes(key)) return coords
    }
    for (const [key, coords] of Object.entries(TOWN_COORDINATES)) {
      if (raw.includes(key)) return coords
    }
    return { lat: 13.3225, lng: 121.8467 } // default Gasan/Marinduque
  }, [readableShopAddress, booking?.shopAddress])

  const destinationCoords = useMemo(() => {
    if (!isHomeService) return originCoords
    const raw = (booking?.serviceAddress || '').toLowerCase()
    for (const [key, coords] of Object.entries(MARINDUQUE_BARANGAY_COORDINATES)) {
      if (raw.includes(key)) return coords
    }
    for (const [key, coords] of Object.entries(TOWN_COORDINATES)) {
      if (raw.includes(key)) return coords
    }
    return { lat: 13.4428, lng: 121.8422 } // Boac default
  }, [isHomeService, booking?.serviceAddress, originCoords])

  const [roadRouteCoords, setRoadRouteCoords] = useState([])

  useEffect(() => {
    if (!originCoords || !destinationCoords || !isHomeService) {
      setRoadRouteCoords([])
      return
    }

    let isMounted = true
    const fetchRealRoadRoute = async () => {
      try {
        const start = originCoords
        const end = destinationCoords
        const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          if (data.routes && data.routes[0]?.geometry?.coordinates) {
            const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng])
            if (coords.length > 1 && isMounted) {
              setRoadRouteCoords(coords)
              return
            }
          }
        }
      } catch {
        // Fallback interpolation
      }

      const start = originCoords
      const end = destinationCoords
      const steps = 15
      const points = []
      for (let i = 0; i <= steps; i++) {
        const ratio = i / steps
        const lat = start.lat + (end.lat - start.lat) * ratio
        const lng = start.lng + (end.lng - start.lng) * ratio
        points.push([lat, lng])
      }
      if (isMounted) setRoadRouteCoords(points)
    }

    fetchRealRoadRoute()
    return () => {
      isMounted = false
    }
  }, [originCoords, destinationCoords, isHomeService])

  // Mount Leaflet script/css dynamically
  useEffect(() => {
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    if (!window.L && !document.getElementById('leaflet-js')) {
      const script = document.createElement('script')
      script.id = 'leaflet-js'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => setLeafletReady(true)
      document.head.appendChild(script)
    } else if (window.L) {
      setLeafletReady(true)
    }
  }, [])

  // Initialize and update map
  useEffect(() => {
    if (!leafletReady || !window.L || !originCoords) return
    const L = window.L
    const container = document.getElementById('leaflet-booking-map')
    if (!container) return

    if (!mapInstanceRef.current) {
      if (container._leaflet_id) container._leaflet_id = null
      container.innerHTML = ''

      const centerLat = (originCoords.lat + (destinationCoords?.lat || originCoords.lat)) / 2
      const centerLng = (originCoords.lng + (destinationCoords?.lng || originCoords.lng)) / 2
      const map = L.map('leaflet-booking-map', {
        center: [centerLat, centerLng],
        zoom: 14,
        zoomControl: false,
      })
      mapInstanceRef.current = map

      L.control.zoom({ position: 'topright' }).addTo(map)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map)

      mapLayersRef.current = {
        routePolyline: L.polyline([], { color: '#4f46e5', weight: 6, opacity: 0.85, lineCap: 'round' }).addTo(map),
        shopMarker: L.marker([originCoords.lat, originCoords.lng]).addTo(map),
        customerMarker: isHomeService ? L.marker([destinationCoords.lat, destinationCoords.lng]).addTo(map) : null,
      }

      setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize()
      }, 300)
    }

    const map = mapInstanceRef.current
    const layers = mapLayersRef.current
    if (!map || !layers) return

    layers.shopMarker.setLatLng([originCoords.lat, originCoords.lng])
    layers.shopMarker.setIcon(
      L.divIcon({
        className: 'leaflet-shop-pin',
        html: `<div style="display:flex;flex-direction:column;align-items:center;"><div style="background:#081F5C;color:white;padding:4px 8px;font-weight:900;font-size:11px;border-radius:2px;border:2px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.3);white-space:nowrap;">🏪 ${booking?.shopName || 'Service Shop'}</div><div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #081F5C;"></div></div>`,
        iconSize: [160, 42],
        iconAnchor: [80, 42],
      })
    )

    if (isHomeService && layers.customerMarker) {
      layers.customerMarker.setLatLng([destinationCoords.lat, destinationCoords.lng])
      layers.customerMarker.setIcon(
        L.divIcon({
          className: 'leaflet-home-pin',
          html: `<div style="display:flex;flex-direction:column;align-items:center;"><div style="background:#1e293b;color:white;padding:4px 8px;font-weight:900;font-size:11px;border-radius:2px;border:2px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.3);white-space:nowrap;">📍 Service Location</div><div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #1e293b;"></div></div>`,
          iconSize: [160, 42],
          iconAnchor: [80, 42],
        })
      )

      if (roadRouteCoords.length > 1) {
        layers.routePolyline.setLatLngs(roadRouteCoords)
        map.fitBounds(L.latLngBounds(roadRouteCoords), { padding: [50, 50] })
      } else {
        map.fitBounds(
          L.latLngBounds([
            [originCoords.lat, originCoords.lng],
            [destinationCoords.lat, destinationCoords.lng],
          ]),
          { padding: [50, 50] }
        )
      }
    } else {
      map.setView([originCoords.lat, originCoords.lng], 15)
    }
  }, [leafletReady, originCoords, destinationCoords, isHomeService, booking?.shopName, roadRouteCoords])

  const handleCopyRef = () => {
    if (booking?.ref) {
      navigator.clipboard.writeText(booking.ref)
      toast.success(`Booking reference ${booking.ref} copied to clipboard!`)
    }
  }

  const handleDownloadReceipt = () => {
    setShowReceiptDialog(true)
  }

  const laborFee = Number(booking?.serviceFeeLaborRateAtCalc || 0)
  const partsFee = Number(booking?.serviceFeeMaterialsAmount || 0)
  const hasFeeQuote = booking?.serviceFeeLaborRateAtCalc != null || booking?.serviceFeeMaterialsAmount != null
  const totalFee = laborFee + partsFee
  const isPaid = String(booking?.paymentStatus || '').toLowerCase() === 'paid'

  const assignedStaffRole = formatAssignedRole(booking?.assignedTechnicianJobTitle, booking?.category)

  const payBreakdown = useMemo(() => {
    if (!booking) return { labor: 0, parts: 0, total: 0 }
    const labor = Number.isFinite(Number(booking.serviceFeeLaborRateAtCalc)) ? Number(booking.serviceFeeLaborRateAtCalc) : 0
    const parts = Number.isFinite(Number(booking.serviceFeeMaterialsAmount)) ? Number(booking.serviceFeeMaterialsAmount) : 0
    return { labor, parts, total: labor + parts }
  }, [booking])

  const paymentMethodsForDialog = useMemo(() => {
    const list =
      booking && Array.isArray(booking.acceptedPaymentMethods)
        ? booking.acceptedPaymentMethods.filter((m) => m && typeof m === 'object' && typeof m.id === 'string')
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
    return list.length > 0
      ? list
      : [
          {
            id: 'cash_on_service',
            type: 'cash_on_service',
            accountName: '',
            details: '',
            notes: 'Pay face-to-face upon service completion.',
            qrImage: '',
          },
        ]
  }, [booking])

  const selectedPaymentMethod = useMemo(
    () => paymentMethodsForDialog.find((m) => m.id === selectedPaymentMethodId) || null,
    [paymentMethodsForDialog, selectedPaymentMethodId]
  )

  useEffect(() => {
    if (!selectedPaymentMethod || selectedPaymentMethod.type !== 'cash_on_service') return
    setPaymentProofImage('')
  }, [selectedPaymentMethod])

  const submitPayNow = useCallback(async () => {
    if (!booking || !activeBookingId) return
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
      const res = await fetch(`${API_URL}/api/catalog/bookings/${encodeURIComponent(activeBookingId)}/pay`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          paymentMethod: selectedPaymentMethodId,
          paymentProofImage: selectedPaymentMethod?.type === 'cash_on_service' ? '' : paymentProofImage,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Payment failed.')
      if (data?.booking) {
        setBooking(data.booking)
      } else {
        await fetchBooking()
      }
      setShowPayDialog(false)
      setSelectedPaymentMethodId('')
      setPaymentProofImage('')
      setPayError('')
      toast.success('Payment submitted successfully!')
    } catch (e) {
      setPayError(e?.message || 'Payment failed.')
    } finally {
      setIsSubmittingPayment(false)
    }
  }, [booking, activeBookingId, selectedPaymentMethodId, selectedPaymentMethod, paymentProofImage, fetchBooking])

  const warrantyCoverage = useMemo(() => {
    if (!booking) return null
    const completedDate = booking.completedAt
      ? new Date(booking.completedAt)
      : booking.paidAt
        ? new Date(booking.paidAt)
        : booking.updatedAt
          ? new Date(booking.updatedAt)
          : null
    if (!completedDate || Number.isNaN(completedDate.getTime())) return null

    const ws = booking.warrantySettings || {}
    const laborDays = Number.isFinite(Number(ws.laborWarrantyDays)) ? Number(ws.laborWarrantyDays) : 30
    const partsDays = Number.isFinite(Number(ws.partsWarrantyDays)) ? Number(ws.partsWarrantyDays) : 90

    const laborExpiry = new Date(completedDate.getTime() + laborDays * 24 * 60 * 60 * 1000)
    const partsExpiry = new Date(completedDate.getTime() + partsDays * 24 * 60 * 60 * 1000)
    const now = new Date()

    const laborRemainingMs = laborExpiry.getTime() - now.getTime()
    const partsRemainingMs = partsExpiry.getTime() - now.getTime()

    const isLaborActive = laborRemainingMs > 0
    const isPartsActive = partsRemainingMs > 0

    const laborDaysLeft = isLaborActive ? Math.max(0, Math.ceil(laborRemainingMs / (1000 * 60 * 60 * 24))) : 0
    const partsDaysLeft = isPartsActive ? Math.max(0, Math.ceil(partsRemainingMs / (1000 * 60 * 60 * 24))) : 0

    return {
      completedDate,
      laborDays,
      partsDays,
      laborExpiry,
      partsExpiry,
      isLaborActive,
      isPartsActive,
      laborDaysLeft,
      partsDaysLeft,
      claim: booking.warrantyClaim || { status: 'none' },
    }
  }, [booking])

  const openWarrantyClaimDialog = useCallback(() => {
    setClaimType('labor_rework')
    setClaimReason('Recurring issue after service')
    setClaimDetails('')
    setClaimProofPhotos([])
    setRefundMethod('gcash')
    setRefundAccountName('')
    setRefundAccountNumber('')
    setClaimError('')
    setShowWarrantyClaimDialog(true)
  }, [])

  const submitWarrantyClaim = useCallback(async () => {
    if (!booking || !activeBookingId) return
    setClaimError('')
    if (!claimReason.trim()) {
      setClaimError('Please select or describe a claim reason.')
      return
    }
    if (!claimDetails.trim() || claimDetails.trim().length < 10) {
      setClaimError('Please provide more details about the issue (at least 10 characters).')
      return
    }
    if (claimType === 'refund') {
      if (!refundAccountName.trim() || !refundAccountNumber.trim()) {
        setClaimError('Please provide the account holder name and account/phone number for your refund transfer.')
        return
      }
    }
    setIsSubmittingClaim(true)
    try {
      const res = await fetch(`${API_URL}/api/catalog/bookings/${encodeURIComponent(activeBookingId)}/warranty-claim`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          claimType,
          reason: claimReason,
          details: claimDetails,
          proofPhotos: claimProofPhotos,
          refundPaymentMethod: claimType === 'refund' ? refundMethod : '',
          refundAccountName: claimType === 'refund' ? refundAccountName : '',
          refundAccountNumber: claimType === 'refund' ? refundAccountNumber : '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Failed to submit warranty claim.')
      if (data?.booking) {
        setBooking(data.booking)
      } else {
        await fetchBooking()
      }
      setShowWarrantyClaimDialog(false)
      toast.success('Warranty claim submitted successfully! The service provider has been notified.')
    } catch (e) {
      setClaimError(e?.message || 'Failed to submit warranty claim.')
    } finally {
      setIsSubmittingClaim(false)
    }
  }, [
    booking,
    activeBookingId,
    claimType,
    claimReason,
    claimDetails,
    claimProofPhotos,
    refundMethod,
    refundAccountName,
    refundAccountNumber,
    fetchBooking,
  ])

  if (loading) {
    return (
      <CustomerLayout activePage="booking-details">
        <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 space-y-4 sm:space-y-5 pb-24 sm:pb-6 overflow-x-hidden min-w-0">
          <div className="flex flex-col items-center justify-center p-12 sm:p-20 bg-white border border-slate-200 shadow-sm">
            <RefreshCw className="size-8 sm:size-10 animate-spin text-indigo-600 mb-3" />
            <h3 className="text-sm sm:text-base font-bold text-slate-800">Loading Booking Details...</h3>
            <p className="text-xs text-slate-500 mt-1">Connecting to database telemetry</p>
          </div>
        </main>
      </CustomerLayout>
    )
  }

  if (error || !booking) {
    return (
      <CustomerLayout activePage="booking-details">
        <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 space-y-4 sm:space-y-5 pb-24 sm:pb-6 overflow-x-hidden min-w-0">
          <div className="p-8 sm:p-12 bg-white border border-slate-200 text-center space-y-3 shadow-sm">
            <AlertCircle className="size-10 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Booking Request Not Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">{error || 'The requested booking could not be located.'}</p>
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#/customer/my-bookings'
              }}
              className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-none shadow-md cursor-pointer"
            >
              Back to My Bookings
            </button>
          </div>
        </main>
      </CustomerLayout>
    )
  }

  const isRated = Boolean(booking?.customerReviewedAt || booking?.customerReviewRating)
  const isCancelled = status === 'cancelled'

  const steps = [
    {
      label: 'Booking Submitted',
      icon: Calendar,
      date: booking.createdAt,
    },
    {
      label: isCancelled ? 'Booking Cancelled' : 'Booking Confirmed',
      icon: isCancelled ? X : CheckCircle2,
      date: isCancelled
        ? (booking.cancelledAt || booking.updatedAt)
        : (status === 'confirmed' || isWorking || isFixed || isCompleted ? booking.updatedAt : null),
    },
    {
      label: 'Working',
      icon: Wrench,
      date: !isCancelled && isWorking ? booking.updatedAt : null,
    },
    {
      label: 'Calculating Service Fee',
      icon: DollarSign,
      date: !isCancelled && booking.serviceFeeConfirmedAt ? booking.serviceFeeConfirmedAt : null,
    },
    {
      label: 'Fixed',
      icon: CheckCircle2,
      date: !isCancelled && isFixed ? (booking.fixedAt || booking.updatedAt) : null,
    },
    {
      label: 'Completed',
      icon: ShieldCheck,
      date: !isCancelled && isCompleted ? (booking.paidAt || booking.updatedAt) : null,
    },
    {
      label: isRated ? 'Rated' : 'Rate Service',
      icon: Star,
      date: !isCancelled && booking.customerReviewedAt ? booking.customerReviewedAt : null,
    },
  ]

  return (
    <CustomerLayout activePage="booking-details">
      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 space-y-4 sm:space-y-5 pb-24 sm:pb-6 overflow-x-hidden min-w-0">
        <div className="mx-auto max-w-none space-y-4">
          {/* Main Container */}
          <div className={cn('rounded-none bg-white border border-slate-200/80 p-3 sm:p-6 overflow-hidden', cardShadow)}>
            {/* HERO HEADER: OPENSTREETMAP LIVE MAP OR LOCATION BANNER */}
            <div className="-mx-3 sm:-mx-6 -mt-3 sm:-mt-6 mb-4 sm:mb-6 border-b border-slate-300 bg-slate-100 overflow-hidden shadow-sm">
              {/* Top Bar Header Overlay */}
              <div className="p-2.5 sm:p-3.5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.hash = '#/customer/my-bookings'
                    }}
                    className="size-7 rounded-none bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer border border-slate-700 mr-0.5 sm:mr-1 shrink-0"
                    title="Back to Bookings"
                  >
                    <ArrowLeft className="size-3.5" />
                  </button>

                  <span className="text-slate-400">
                    BOOKING REF:{' '}
                    <span className="text-white font-extrabold font-mono">{booking.ref || `BK-${booking.id.slice(-8).toUpperCase()}`}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyRef}
                    className="text-slate-400 hover:text-white p-0.5 transition-colors cursor-pointer"
                    title="Copy Reference"
                  >
                    <Copy className="size-3.5" />
                  </button>

                  <span className="text-slate-700">|</span>

                  <span
                    className={cn(
                      'px-2 py-0.5 sm:px-2.5 sm:py-0.5 rounded-none font-black text-[10px] sm:text-[11px] uppercase tracking-wider border',
                      status === 'completed'
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                        : status === 'fixed'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : status === 'working'
                            ? booking?.serviceFeeConfirmedAt
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                              : 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : status === 'confirmed'
                              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                              : status === 'cancelled'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    )}
                  >
                    {getBookingStatusLabel(booking.status, booking)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {status === 'cancelled' ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-mono font-bold text-rose-300 bg-rose-950/70 border border-rose-500/40">
                      <AlertCircle className="size-3 text-rose-400" />
                      <span>Booking Cancelled</span>
                    </span>
                  ) : isMapActive ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-mono font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/40">
                      <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{isHomeService ? 'Home Service GPS: Active' : 'In-Shop GPS: Ready'}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-mono font-bold text-amber-300 bg-amber-950/70 border border-amber-500/40">
                      <Clock className="size-3 text-amber-400" />
                      <span>Awaiting Shop Confirmation</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Map Canvas */}
              <div className="relative w-full h-[260px] sm:h-[380px] md:h-[420px] bg-slate-100 overflow-hidden group">
                <div id="leaflet-booking-map" className="w-full h-full z-0" />

                <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-wrap items-center gap-1 sm:gap-2 z-10 pointer-events-none max-w-[calc(100%-110px)] sm:max-w-none">
                  <div className="bg-slate-900/90 text-white px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold backdrop-blur-md shadow-md flex items-center gap-1.5 border border-white/10 truncate">
                    <span className="size-1.5 sm:size-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="truncate">Shop: {booking.shopName}</span>
                  </div>
                  {isHomeService && booking.serviceAddress && (
                    <div className="bg-indigo-900/90 text-indigo-200 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-semibold backdrop-blur-md shadow-md flex items-center gap-1.5 border border-indigo-500/30 truncate">
                      <MapPin className="size-3 sm:size-3.5 text-rose-400 shrink-0" />
                      <span className="truncate">Home: {booking.serviceAddress}</span>
                    </div>
                  )}
                </div>

                <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-slate-900/90 text-indigo-300 px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-extrabold backdrop-blur-md shadow-md flex items-center gap-1.5 border border-indigo-500/30 z-10 pointer-events-none">
                  <span>{isHomeService ? '📍 Home Service Route' : '🏪 In-Shop Location'}</span>
                </div>
              </div>

              {/* Assigned Staff Action Banner under Map */}
              {booking.assignedTechnicianName ? (
                <div className="p-3 sm:p-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="size-9 sm:size-10 rounded-none bg-indigo-600 text-white font-black flex items-center justify-center text-sm shrink-0">
                      {booking.assignedTechnicianName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-tight flex items-center gap-1.5">
                        <span>{booking.assignedTechnicianName}</span>
                        <span className="text-[9px] sm:text-[10px] bg-indigo-100 text-indigo-900 px-1.5 py-0.2 font-extrabold border border-indigo-200">
                          {assignedStaffRole}
                        </span>
                      </h4>
                      <p className="text-[10.5px] sm:text-[11px] text-slate-500 font-mono mt-0.5">
                        {booking.assignedTechnicianPhone ? `Phone: ${booking.assignedTechnicianPhone}` : 'Assigned by shop'}
                      </p>
                    </div>
                  </div>

                  <div className="w-full sm:w-auto flex items-center gap-2">
                    {booking.assignedTechnicianPhone ? (
                      <a
                        href={`tel:${booking.assignedTechnicianPhone.replace(/\s/g, '')}`}
                        className="flex-1 sm:flex-initial justify-center px-3 sm:px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Phone className="size-3.5 text-emerald-400" />
                        <span>Call {assignedStaffRole}</span>
                      </a>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        window.location.hash = '#/customer/messages'
                      }}
                      className="flex-1 sm:flex-initial justify-center px-3.5 sm:px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
                    >
                      <MessageSquare className="size-3.5" />
                      <span>Chat Shop</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Active Refix / Warranty Claim Notice Banner */}
            {booking.warrantyClaim && booking.warrantyClaim.status !== 'none' && (
              <div className="mb-6 p-3.5 sm:p-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md border-l-4 border-indigo-500">
                <div className="flex items-start gap-3">
                  <RotateCcw className="size-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-extrabold text-white">
                        Active Refix / Warranty Claim
                      </h4>
                      <span className="text-[10px] bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 px-2 py-0.2 font-mono font-bold uppercase">
                        {booking.warrantyClaim.status === 'pending'
                          ? 'Under Review'
                          : booking.warrantyClaim.status === 'approved'
                          ? 'Approved'
                          : booking.warrantyClaim.status === 'working' || booking.warrantyClaim.status === 'in_progress'
                          ? 'Re-repairing'
                          : booking.warrantyClaim.status === 'fixed'
                          ? 'Fixed'
                          : booking.warrantyClaim.status === 'resolved' || booking.warrantyClaim.status === 'completed'
                          ? 'Completed'
                          : booking.warrantyClaim.status === 'rejected'
                          ? 'Declined'
                          : booking.warrantyClaim.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {booking.warrantyClaim.reason || 'Customer requested service rework under warranty coverage.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    window.location.hash = `#/customer/track-refix/${encodeURIComponent(booking.id)}`
                  }}
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
                >
                  <RotateCcw className="size-3.5" />
                  <span>Track Refix Progress</span>
                </button>
              </div>
            )}

            {/* Stepper Section */}
            <div className="my-6 w-full overflow-x-auto no-scrollbar pb-3 pt-1">
              <div className="flex items-start justify-between min-w-[780px] sm:min-w-[840px] px-2">
                {steps.map((s, idx) => {
                  const Icon = s.icon
                  const isCancelledStep = isCancelled && idx === 1
                  const isDone = isCancelled ? idx === 0 : idx <= currentStepIndex
                  const isCurrent = idx === currentStepIndex
                  const lineActive = isCancelled ? idx === 0 : idx < currentStepIndex

                  const boxClass = isCancelledStep
                    ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-600/30 ring-4 ring-rose-100 scale-105'
                    : isCurrent
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-700 text-white border-indigo-600 shadow-lg shadow-indigo-600/30 ring-4 ring-indigo-100 scale-105'
                      : isDone
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-500 font-bold'
                        : 'bg-white text-slate-300 border-slate-200'

                  return (
                    <div key={s.label} className="relative flex-1 flex flex-col items-center text-center px-1">
                      {/* Connector Line behind boxes */}
                      {idx < steps.length - 1 && (
                        <div
                          className={cn(
                            'absolute top-6 sm:top-7 left-1/2 w-full h-1 -translate-y-1/2 z-0 transition-colors duration-300',
                            lineActive ? (isCancelled ? 'bg-rose-500' : 'bg-indigo-600') : 'bg-slate-200'
                          )}
                        />
                      )}

                      {/* Step Box */}
                      <div
                        className={cn(
                          'relative z-10 size-12 sm:size-14 rounded-none border-2 flex items-center justify-center transition-all',
                          boxClass
                        )}
                      >
                        <Icon className={cn('size-5 sm:size-6 shrink-0', isCancelledStep ? 'text-white' : '')} strokeWidth={isCancelledStep ? 2.5 : 2} />
                      </div>

                      {/* Status Label */}
                      <div className="mt-3 min-h-[36px] flex items-center justify-center px-1">
                        <span
                          className={cn(
                            'text-xs sm:text-[13px] font-black leading-tight',
                            isCancelledStep
                              ? 'text-rose-600'
                              : isCurrent
                                ? 'text-indigo-900'
                                : isDone
                                  ? 'text-slate-900'
                                  : 'text-slate-400'
                          )}
                        >
                          {s.label}
                        </span>
                      </div>

                      {/* Date Timestamp */}
                      <div className="mt-1">
                        {s.date ? (
                          <span
                            className={cn(
                              'text-[11px] sm:text-xs font-mono font-semibold block',
                              isCancelledStep ? 'text-rose-600 font-bold' : 'text-slate-500'
                            )}
                          >
                            {formatDateTime(s.date)}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-300 block">—</span>
                        )}
                      </div>

                      {/* Action buttons (View Proof / Rate Now) */}
                      <div className="mt-2 min-h-[28px] flex items-center justify-center">
                        {s.label === 'Working' && Array.isArray(booking.startJobProofPhotos) && booking.startJobProofPhotos.length > 0 && (
                          <button
                            type="button"
                            onClick={() => openPhotoModal(booking.startJobProofPhotos, 'Start of Job Photo Proof', 0)}
                            className="px-2.5 sm:px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 text-[11px] sm:text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-xs hover:shadow"
                            title="View Start Job Photo Proof"
                          >
                            <Eye className="size-3.5 text-purple-700" />
                            <span>View Proof</span>
                          </button>
                        )}

                        {s.label === 'Completed' && Array.isArray(booking.completionProofPhotos) && booking.completionProofPhotos.length > 0 && (
                          <button
                            type="button"
                            onClick={() => openPhotoModal(booking.completionProofPhotos, 'Item Handover & Completion Photo Proof', 0)}
                            className="px-2.5 sm:px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 text-[11px] sm:text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-xs hover:shadow"
                            title="View Item Handover & Completion Photo Proof"
                          >
                            <Eye className="size-3.5 text-emerald-700" />
                            <span>View Proof</span>
                          </button>
                        )}

                        {(s.label === 'Rate Service' || s.label === 'Rated') && isCompleted && (
                          isRated ? (
                            <div className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-300 text-[11px] sm:text-xs font-black inline-flex items-center gap-1 shadow-xs">
                              <Star className="size-3.5 text-amber-500 fill-amber-400" />
                              <span>{booking.customerReviewRating} ★</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                window.location.hash = `#/customer/reviews-ratings?tab=to-review&bookingId=${encodeURIComponent(booking.id)}`
                              }}
                              className="px-3 sm:px-3.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] sm:text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-xs hover:shadow"
                              title="Rate this Service"
                            >
                              <Star className="size-3.5 text-amber-100" />
                              <span>Rate</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Schedule Notice Bar */}
            <div className="-mx-3 sm:-mx-6 mt-4 sm:mt-6 border-y border-indigo-200/80 bg-indigo-50/70 p-3 sm:p-4 text-xs text-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-indigo-600 shrink-0" />
                <div>
                  <span>Preferred Service Schedule:</span>
                  <span className="text-indigo-900 font-extrabold ml-1">
                    {booking.date || '—'} {booking.preferredTime ? `• ${booking.preferredTime}` : ''} ({isHomeService ? 'Home Service' : 'In-Shop Service'})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge className={cn('rounded-none text-[10px] uppercase font-bold', isHomeService ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-sky-100 text-sky-900 border-sky-300')}>
                  {isHomeService ? 'Home Service' : 'In-Shop Service'}
                </Badge>
              </div>
            </div>

            {/* E-Invoice & Documents Row */}
            <div className="py-3 my-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                <FileText className="size-4 text-indigo-600" />
                <span>Official Service Quotation &amp; Receipt</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadReceipt}
                  disabled={downloadingReceipt}
                  className={cn(
                    'w-full sm:w-auto inline-flex items-center justify-center rounded-none border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-50 cursor-pointer',
                    downloadingReceipt && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {downloadingReceipt ? 'Generating...' : 'View / Print Receipt'}
                </button>
              </div>
            </div>

            {/* Gradient Line Divider */}
            <div
              className="-mx-3 sm:-mx-6 my-4 h-[3px] rounded-none"
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, #4f46e5 0 64px, transparent 64px 76px, #081F5C 76px 140px, transparent 140px 152px)',
              }}
            />

            {/* Address & Service Timeline Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1px_1fr] gap-4 sm:gap-6 my-4 sm:my-6">
              {/* Left Column: Service & Customer Details */}
              <div className="space-y-2 text-xs">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <MapPin className="size-4 text-indigo-600" />
                  <span>Service Location &amp; Contact</span>
                </h3>

                <div className="font-extrabold text-slate-900 text-sm">{booking.contactName || user?.fullName || 'Customer'}</div>
                {booking.contactPhone && <div className="text-slate-700 font-mono font-bold">{booking.contactPhone}</div>}

                <div className="text-slate-600 leading-relaxed font-medium">
                  {isHomeService ? booking.serviceAddress || 'Home Address' : `In-Shop Service at ${booking.shopName}`}
                </div>

                {readableShopAddress && (
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span className="font-bold text-slate-700">Shop Address:</span> {readableShopAddress}
                  </div>
                )}

                {booking.problemDescription && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-700 block">Issue Description:</span>
                    <p className="text-slate-600 italic mt-0.5">"{booking.problemDescription}"</p>
                  </div>
                )}

                {Array.isArray(booking.issuePhotos) && booking.issuePhotos.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-700 block mb-1">Uploaded Issue Photos ({booking.issuePhotos.length}):</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {booking.issuePhotos.map((src, pIdx) => {
                        const resolved = resolveIssuePhotoSrc(src)
                        return (
                          <img
                            key={pIdx}
                            src={resolved}
                            alt={`Issue ${pIdx + 1}`}
                            className="size-14 object-cover border border-indigo-200 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => openPhotoModal(booking.issuePhotos, 'Uploaded Issue Photo', pIdx)}
                          />
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Vertical Line Divider */}
              <div className="hidden sm:block w-px bg-slate-200" />

              {/* Right Column: Service Activity Timeline */}
              <div className="space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider mb-3">Service Timeline</h3>

                <div className="space-y-3">
                  <div className="grid grid-cols-[24px_95px_1fr] sm:grid-cols-[24px_120px_1fr] items-start gap-2.5 text-xs">
                    <div className="relative flex justify-center">
                      <div className="size-6 rounded-none flex items-center justify-center bg-indigo-600 text-white">
                        <Calendar className="size-3.5" />
                      </div>
                      {(status === 'confirmed' || isWorking || isCompleted || status === 'cancelled') && (
                        <div
                          className={cn(
                            'absolute left-1/2 -translate-x-1/2 w-px',
                            status === 'cancelled' ? 'bg-rose-300' : 'bg-slate-200'
                          )}
                          style={{ top: '1.5rem', height: 'calc(100% + 12px)' }}
                        />
                      )}
                    </div>
                    <div className="font-mono text-[10px] sm:text-[11px] text-slate-500 whitespace-nowrap pt-0.5">
                      {formatDateTime(booking.createdAt)}
                    </div>
                    <div>
                      <div className="font-extrabold text-slate-900 text-xs">Booking Submitted</div>
                      <div className="text-[11px] text-slate-600">Service request submitted by customer</div>
                    </div>
                  </div>

                  {(status === 'confirmed' || isWorking || isCompleted) && (
                    <div className="grid grid-cols-[24px_95px_1fr] sm:grid-cols-[24px_120px_1fr] items-start gap-2.5 text-xs">
                      <div className="relative flex justify-center">
                        <div className="size-6 rounded-none flex items-center justify-center bg-sky-600 text-white">
                          <CheckCircle2 className="size-3.5" />
                        </div>
                        {(isWorking || isCompleted) && (
                          <div className="absolute left-1/2 -translate-x-1/2 w-px bg-slate-200" style={{ top: '1.5rem', height: 'calc(100% + 12px)' }} />
                        )}
                      </div>
                      <div className="font-mono text-[10px] sm:text-[11px] text-slate-500 whitespace-nowrap pt-0.5">
                        {formatDateTime(booking.updatedAt)}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs">Booking Confirmed</div>
                        <div className="text-[11px] text-slate-600">
                          {booking.assignedTechnicianName ? `Assigned to ${booking.assignedTechnicianName} (${assignedStaffRole})` : 'Booking confirmed by service provider'}
                        </div>
                      </div>
                    </div>
                  )}

                  {(isWorking || isCompleted) && (
                    <div className="grid grid-cols-[24px_95px_1fr] sm:grid-cols-[24px_120px_1fr] items-start gap-2.5 text-xs">
                      <div className="relative flex justify-center">
                        <div className="size-6 rounded-none flex items-center justify-center bg-purple-600 text-white">
                          <Wrench className="size-3.5" />
                        </div>
                        {(booking.serviceFeeConfirmedAt || isCompleted) && (
                          <div className="absolute left-1/2 -translate-x-1/2 w-px bg-slate-200" style={{ top: '1.5rem', height: 'calc(100% + 12px)' }} />
                        )}
                      </div>
                      <div className="font-mono text-[10px] sm:text-[11px] text-slate-500 whitespace-nowrap pt-0.5">
                        {formatDateTime(booking.updatedAt)}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs">Working</div>
                        <div className="text-[11px] text-slate-600">Technician started work and diagnostics</div>
                        {Array.isArray(booking.startJobProofPhotos) && booking.startJobProofPhotos.length > 0 && (
                          <div className="mt-2 space-y-1.5 p-2 bg-purple-50/70 border border-purple-200">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10.5px] font-extrabold text-purple-900 flex items-center gap-1">
                                <ImageIcon className="size-3 text-purple-700" />
                                Start Job Proof Photo ({booking.startJobProofPhotos.length})
                              </span>
                              <button
                                type="button"
                                onClick={() => openPhotoModal(booking.startJobProofPhotos, 'Start of Job Photo Proof', 0)}
                                className="text-[10px] font-extrabold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                              >
                                View Fullscreen
                              </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {booking.startJobProofPhotos.map((src, pIdx) => {
                                const resolved = resolveIssuePhotoSrc(src)
                                return (
                                  <img
                                    key={pIdx}
                                    src={resolved}
                                    alt={`Start proof ${pIdx + 1}`}
                                    className="size-14 object-cover border-2 border-purple-300 hover:border-purple-600 cursor-pointer shadow-xs transition-colors"
                                    onClick={() => openPhotoModal(booking.startJobProofPhotos, 'Start of Job Photo Proof', pIdx)}
                                  />
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {booking.serviceFeeConfirmedAt && (
                    <div className="grid grid-cols-[24px_95px_1fr] sm:grid-cols-[24px_120px_1fr] items-start gap-2.5 text-xs">
                      <div className="relative flex justify-center">
                        <div className="size-6 rounded-none flex items-center justify-center bg-indigo-600 text-white">
                          <DollarSign className="size-3.5" />
                        </div>
                        {isCompleted && (
                          <div className="absolute left-1/2 -translate-x-1/2 w-px bg-slate-200" style={{ top: '1.5rem', height: 'calc(100% + 12px)' }} />
                        )}
                      </div>
                      <div className="font-mono text-[10px] sm:text-[11px] text-slate-500 whitespace-nowrap pt-0.5">
                        {formatDateTime(booking.serviceFeeConfirmedAt)}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs">Calculating Service Fee</div>
                        <div className="text-[11px] text-slate-600">Service fee and materials computed by technician</div>
                      </div>
                    </div>
                  )}

                  {(isFixed || isCompleted) && (
                    <div className="grid grid-cols-[24px_95px_1fr] sm:grid-cols-[24px_120px_1fr] items-start gap-2.5 text-xs">
                      <div className="relative flex justify-center">
                        <div className="size-6 rounded-none flex items-center justify-center bg-emerald-600 text-white">
                          <CheckCircle2 className="size-3.5" />
                        </div>
                        {isCompleted && (
                          <div className="absolute left-1/2 -translate-x-1/2 w-px bg-slate-200" style={{ top: '1.5rem', height: 'calc(100% + 12px)' }} />
                        )}
                      </div>
                      <div className="font-mono text-[10px] sm:text-[11px] text-slate-500 whitespace-nowrap pt-0.5">
                        {formatDateTime(booking.fixedAt || booking.updatedAt)}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs text-emerald-700">Fixed</div>
                        <div className="text-[11px] text-slate-600">Service completed and verified fixed</div>
                      </div>
                    </div>
                  )}

                  {isCompleted && (
                    <div className="grid grid-cols-[24px_95px_1fr] sm:grid-cols-[24px_120px_1fr] items-start gap-2.5 text-xs">
                      <div className="relative flex justify-center">
                        <div className="size-6 rounded-none flex items-center justify-center bg-teal-600 text-white">
                          <ShieldCheck className="size-3.5" />
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 w-px bg-slate-200" style={{ top: '1.5rem', height: 'calc(100% + 12px)' }} />
                      </div>
                      <div className="font-mono text-[10px] sm:text-[11px] text-slate-500 whitespace-nowrap pt-0.5">
                        {formatDateTime(booking.paidAt || booking.updatedAt)}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs text-teal-700">Completed</div>
                        <div className="text-[11px] text-slate-600">Payment marked and service transaction completed</div>
                        {Array.isArray(booking.completionProofPhotos) && booking.completionProofPhotos.length > 0 && (
                          <div className="mt-2 space-y-1.5 p-2 bg-emerald-50/70 border border-emerald-200">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10.5px] font-extrabold text-emerald-900 flex items-center gap-1">
                                <CheckCircle2 className="size-3 text-emerald-700" />
                                Item Handover &amp; Completion Proof ({booking.completionProofPhotos.length})
                              </span>
                              <button
                                type="button"
                                onClick={() => openPhotoModal(booking.completionProofPhotos, 'Item Handover & Completion Photo Proof', 0)}
                                className="text-[10px] font-extrabold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                              >
                                View Fullscreen
                              </button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {booking.completionProofPhotos.map((src, pIdx) => {
                                const resolved = resolveIssuePhotoSrc(src)
                                return (
                                  <img
                                    key={pIdx}
                                    src={resolved}
                                    alt={`Handover proof ${pIdx + 1}`}
                                    className="size-14 object-cover border-2 border-emerald-300 hover:border-emerald-600 cursor-pointer shadow-xs transition-colors"
                                    onClick={() => openPhotoModal(booking.completionProofPhotos, 'Item Handover & Completion Photo Proof', pIdx)}
                                  />
                                )
                              })}
                            </div>
                            {booking.completionNotes?.trim() && (
                              <p className="text-[10.5px] text-emerald-950/90 italic pt-1 border-t border-emerald-200/60 mt-1">
                                &ldquo;{booking.completionNotes.trim()}&rdquo;
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {isCompleted && (
                    <div className="grid grid-cols-[24px_95px_1fr] sm:grid-cols-[24px_120px_1fr] items-start gap-2.5 text-xs">
                      <div className="relative flex justify-center">
                        <div className={cn("size-6 rounded-none flex items-center justify-center text-white", isRated ? "bg-amber-500" : "bg-slate-300")}>
                          <Star className={cn("size-3.5", isRated ? "fill-white" : "")} />
                        </div>
                      </div>
                      <div className="font-mono text-[10px] sm:text-[11px] text-slate-500 whitespace-nowrap pt-0.5">
                        {booking.customerReviewedAt ? formatDateTime(booking.customerReviewedAt) : 'Pending Rating'}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs text-amber-700">
                          {isRated ? `Rated (${booking.customerReviewRating} Stars)` : 'Rate Service'}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {isRated ? (booking.customerReviewComment || 'Customer submitted rating and feedback') : 'Customer feedback and service review'}
                        </div>
                        {!isRated && (
                          <button
                            type="button"
                            onClick={() => {
                              window.location.hash = `#/customer/reviews-ratings?tab=to-review&bookingId=${encodeURIComponent(booking.id)}`
                            }}
                            className="mt-1.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10.5px] inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                          >
                            <Star className="size-3 text-amber-100" />
                            <span>Rate Service</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {status === 'cancelled' && (
                    <div className="grid grid-cols-[24px_95px_1fr] sm:grid-cols-[24px_120px_1fr] items-start gap-2.5 text-xs">
                      <div className="relative flex justify-center">
                        <div className="size-6 rounded-none flex items-center justify-center bg-rose-600 text-white">
                          <X className="size-3.5" />
                        </div>
                      </div>
                      <div className="font-mono text-[10px] sm:text-[11px] text-rose-600 font-bold whitespace-nowrap pt-0.5">
                        {formatDateTime(booking.cancelledAt || booking.updatedAt)}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-xs text-rose-600">Booking Cancelled</div>
                        <div className="text-[11px] text-slate-600">{booking.rejectionReason || booking.cancellationReason || 'Booking was cancelled.'}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Shop Provider Banner */}
            <div className="-mx-3 sm:-mx-6 bg-slate-900 text-white p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-y border-slate-800">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="size-8 rounded-none bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-md shrink-0">
                  {booking.shopName ? booking.shopName.charAt(0).toUpperCase() : 'S'}
                </div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-white text-sm truncate">{booking.shopName}</h4>
                  <p className="text-[11px] text-slate-400 font-medium truncate">{readableShopAddress || booking.shopAddress || 'Service Provider'}</p>
                </div>
              </div>

              <div className="w-full sm:w-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.location.hash = '#/customer/messages'
                  }}
                  className="flex-1 sm:flex-initial justify-center rounded-none border border-indigo-500/50 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="size-3.5" />
                  <span>Message Shop</span>
                </button>

                {booking.shopServiceId && (
                  <button
                    type="button"
                    onClick={() => {
                      window.location.hash = `#/customer/shop/${encodeURIComponent(booking.shopServiceId)}`
                    }}
                    className="flex-1 sm:flex-initial justify-center rounded-none border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Store className="size-3.5" />
                    <span>View Service</span>
                  </button>
                )}
              </div>
            </div>

            {/* Service & Parts Item Breakdown */}
            <div className="mt-4 divide-y divide-slate-100">
              <div className="py-3 grid grid-cols-[1fr_auto] items-center gap-4 text-xs">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">{booking.serviceName}</h4>
                  <p className="text-slate-500 text-[11px]">{booking.category || 'Service'} {booking.subcategory ? `• ${booking.subcategory}` : ''}</p>
                </div>
                <div className="text-right">
                  <span className="font-black text-slate-900 text-xs sm:text-sm">
                    {booking.serviceFeeLaborRateAtCalc != null ? formatCurrency(booking.serviceFeeLaborRateAtCalc) : 'Labor Quote Pending'}
                  </span>
                </div>
              </div>

              {Array.isArray(booking.serviceFeeReplacementParts) &&
                booking.serviceFeeReplacementParts.map((part, idx) => (
                  <div key={idx} className="py-2.5 grid grid-cols-[1fr_auto] items-center gap-4 text-xs">
                    <div>
                      <h5 className="font-bold text-slate-800">{part.name}</h5>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Replacement Part / Material</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-800">{formatCurrency(part.price)}</span>
                    </div>
                  </div>
                ))}
            </div>

            {/* Totals Section */}
            <div className="mt-4 pt-3 border-t border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Labor Rate / Service Fee:</span>
                <span className="font-bold text-slate-800">
                  {booking.serviceFeeLaborRateAtCalc != null ? formatCurrency(laborFee) : 'TBD (Quote Pending)'}
                </span>
              </div>

              {partsFee > 0 && (
                <div className="flex items-center justify-between text-slate-600">
                  <span>Materials &amp; Replacement Parts:</span>
                  <span className="font-bold text-slate-800">{formatCurrency(partsFee)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Estimated Fee</span>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-700 text-base">{hasFeeQuote ? formatCurrency(totalFee) : 'Awaiting Quote'}</span>
                  {isPaid ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ Paid
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-none text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      Unpaid
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="mt-4 pt-3 border-t border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Payment Method:</span>
                <span className="font-bold text-slate-800">{booking.paymentMethod || 'Cash on Service'}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Amount Paid:</span>
                <span className={cn('font-extrabold', isPaid ? 'text-emerald-700' : 'text-amber-700')}>
                  {isPaid ? formatCurrency(totalFee) : `${formatCurrency(0)} (Pay upon service)`}
                </span>
              </div>
            </div>

            {/* Pay Now or Rating Actions */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              {(isFixed || isCompleted || (isWorking && booking.serviceFeeConfirmedAt)) && !isPaid && (
                <Button
                  type="button"
                  onClick={() => setShowPayDialog(true)}
                  className="rounded-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <CreditCard className="size-4" />
                  <span>Pay Now ({formatCurrency(totalFee)})</span>
                </Button>
              )}

              {isCompleted && isPaid && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1.5 border border-teal-200 flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-teal-600" />
                    Service Completed &amp; Paid
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.hash = `#/customer/reviews-ratings?tab=to-review&bookingId=${encodeURIComponent(booking.id)}`
                    }}
                    className="rounded-none bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
                  >
                    <Star className="size-3.5 text-amber-100" />
                    <span>Rate Service</span>
                  </button>
                </div>
              )}
            </div>

            {/* Warranty & Guarantee Coverage Section (When Completed) */}
            {isCompleted && (
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4.5 text-indigo-600 shrink-0" />
                    <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">Service Warranty &amp; Guarantee</h4>
                  </div>
                  {warrantyCoverage?.claim?.status && warrantyCoverage.claim.status !== 'none' ? (
                    <Badge
                      className={cn(
                        'text-[10px] font-extrabold uppercase tracking-wider rounded-none px-2 py-0.5',
                        warrantyCoverage.claim.status === 'pending' && 'bg-amber-100 text-amber-900 border-amber-300',
                        warrantyCoverage.claim.status === 'approved' && 'bg-emerald-100 text-emerald-900 border-emerald-300',
                        warrantyCoverage.claim.status === 'rejected' && 'bg-rose-100 text-rose-900 border-rose-300',
                        warrantyCoverage.claim.status === 'resolved' && 'bg-teal-100 text-teal-900 border-teal-300'
                      )}
                    >
                      Claim: {warrantyCoverage.claim.status}
                    </Badge>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Labor Warranty */}
                  <div className={cn('p-3 border rounded-none flex items-start gap-2.5', warrantyCoverage?.isLaborActive ? 'bg-indigo-50/70 border-indigo-200' : 'bg-slate-50 border-slate-200')}>
                    <Wrench className={cn('size-4 shrink-0 mt-0.5', warrantyCoverage?.isLaborActive ? 'text-indigo-600' : 'text-slate-400')} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">Labor Warranty</span>
                        {warrantyCoverage?.isLaborActive ? (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-emerald-600 text-white">ACTIVE</span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-200 text-slate-600">EXPIRED</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {warrantyCoverage?.isLaborActive
                          ? `${warrantyCoverage.laborDaysLeft} days remaining (${warrantyCoverage.laborDays}-day coverage). Walang bayad ang labor sa rework.`
                          : `Expired (${warrantyCoverage?.laborDays || 30} days passed)`}
                      </p>
                    </div>
                  </div>

                  {/* Parts Warranty */}
                  <div className={cn('p-3 border rounded-none flex items-start gap-2.5', warrantyCoverage?.isPartsActive ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200')}>
                    <Package className={cn('size-4 shrink-0 mt-0.5', warrantyCoverage?.isPartsActive ? 'text-emerald-600' : 'text-slate-400')} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">Parts Warranty</span>
                        {warrantyCoverage?.isPartsActive ? (
                          <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-emerald-600 text-white">ACTIVE</span>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-200 text-slate-600">EXPIRED</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {warrantyCoverage?.isPartsActive
                          ? `${warrantyCoverage.partsDaysLeft} days remaining (${warrantyCoverage.partsDays}-day coverage on replaced parts).`
                          : `Expired (${warrantyCoverage?.partsDays || 90} days passed)`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* If there is an active warranty claim */}
                {warrantyCoverage?.claim && warrantyCoverage.claim.status !== 'none' && (
                  <div className={cn(
                    'p-3.5 border rounded-none space-y-2 text-xs',
                    warrantyCoverage.claim.status === 'pending' && 'bg-amber-50 border-amber-200',
                    warrantyCoverage.claim.status === 'approved' && 'bg-emerald-50 border-emerald-200',
                    warrantyCoverage.claim.status === 'rejected' && 'bg-rose-50 border-rose-200',
                    warrantyCoverage.claim.status === 'resolved' && 'bg-teal-50 border-teal-200'
                  )}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <span className="font-extrabold text-slate-900">
                          {warrantyCoverage.claim.claimType === 'refund' ? '💰 Refund Request' : '🔧 Free Warranty Labor Rework Claim'}
                        </span>
                        <p className="text-slate-700 text-[11px]">
                          <strong>Reason:</strong> {warrantyCoverage.claim.reason}
                        </p>
                        {warrantyCoverage.claim.details && (
                          <p className="text-slate-600 text-[11px]">{warrantyCoverage.claim.details}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono text-slate-500">
                          {formatDateTime(warrantyCoverage.claim.claimedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Resolution details for Approved/Rejected */}
                    {warrantyCoverage.claim.status === 'approved' && (
                      <div className="pt-2 border-t border-emerald-200/60 text-emerald-950">
                        <p className="font-bold text-emerald-800">✓ Claim Approved by Provider</p>
                        {warrantyCoverage.claim.claimType === 'refund' && (
                          <p className="text-xs font-black text-emerald-900 mt-0.5">
                            Approved Refund Amount: {formatCurrency(warrantyCoverage.claim.approvedAmount || warrantyCoverage.claim.requestedAmount)}
                          </p>
                        )}
                        {warrantyCoverage.claim.resolutionNotes && (
                          <p className="text-[11px] text-emerald-800 mt-1 italic">
                            Provider Note: {warrantyCoverage.claim.resolutionNotes}
                          </p>
                        )}
                        {warrantyCoverage.claim.refundProofImage && (
                          <div className="mt-2">
                            <span className="text-[10px] font-bold uppercase text-emerald-800 block mb-1">Proof of Refund Transfer:</span>
                            <img
                              src={resolveIssuePhotoSrc(warrantyCoverage.claim.refundProofImage)}
                              alt="Proof of Refund"
                              onClick={() => openPhotoModal(warrantyCoverage.claim.refundProofImage, 'Refund Transfer Proof')}
                              className="h-20 w-32 object-cover border border-emerald-300 rounded-none cursor-pointer hover:opacity-90"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {warrantyCoverage.claim.status === 'rejected' && (
                      <div className="pt-2 border-t border-rose-200/60 text-rose-950">
                        <p className="font-bold text-rose-800">✕ Claim Rejected by Provider</p>
                        <p className="text-[11px] text-rose-700 mt-0.5">
                          <strong>Reason:</strong> {warrantyCoverage.claim.rejectionReason || 'Does not meet warranty terms & conditions.'}
                        </p>
                      </div>
                    )}

                    {/* Proof Photos uploaded by customer */}
                    {Array.isArray(warrantyCoverage.claim.proofPhotos) && warrantyCoverage.claim.proofPhotos.length > 0 && (
                      <div className="pt-2 border-t border-slate-200">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Uploaded Claim Proof Photos:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {warrantyCoverage.claim.proofPhotos.map((p, idx) => (
                            <img
                              key={idx}
                              src={resolveIssuePhotoSrc(p)}
                              alt={`Claim proof ${idx + 1}`}
                              onClick={() => openPhotoModal(warrantyCoverage.claim.proofPhotos, 'Warranty Claim Proof Photos', idx)}
                              className="size-12 object-cover border border-slate-300 rounded-none cursor-pointer hover:scale-105 transition-transform"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Claim Warranty Button (Available if no pending claim and under warranty) */}
                {(!warrantyCoverage?.claim || warrantyCoverage.claim.status === 'none' || warrantyCoverage.claim.status === 'rejected') && (
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-slate-500 italic">
                      May problema ba pagkatapos maayos? Mag-request ng libreng rework o refund habang sakop pa ng warranty.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={openWarrantyClaimDialog}
                      className="rounded-none border-indigo-600 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold text-xs px-3.5 py-1.5 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <RotateCcw className="size-3.5 text-indigo-700" />
                      <span>Claim Warranty / Refund</span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Cancellation Note */}
            {status === 'cancelled' && (
              <div className="mt-4 pt-4 border-t-2 border-rose-200">
                <div className="bg-rose-50 border border-rose-200 rounded-none p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="size-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">Cancellation Notice</h4>
                      <p className="text-xs text-slate-800 bg-white p-2.5 rounded-none border border-rose-200">
                        {booking.rejectionReason || booking.cancellationReason || 'This booking has been cancelled.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Warranty Claim & Refund Request Dialog Modal */}
      <Dialog
        open={showWarrantyClaimDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowWarrantyClaimDialog(false)
            setClaimError('')
          }
        }}
      >
        <DialogContent className="max-w-md w-[calc(100vw-2rem)] rounded-none bg-white p-4 sm:p-6 shadow-2xl">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="size-7 bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <ShieldAlert className="size-4" />
              </div>
              <DialogTitle className="text-sm sm:text-base font-extrabold text-slate-900">
                Warranty Claim &amp; Refund Request
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-600">
              Humiling ng libreng labor rework o refund batay sa warranty coverage ng iyong serbisyo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            {/* Warranty Coverage Notice */}
            <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-950 space-y-1">
              <div className="flex items-center justify-between font-bold text-xs">
                <span>Labor Warranty Status:</span>
                <span className={warrantyCoverage?.isLaborActive ? 'text-emerald-700 font-extrabold' : 'text-slate-600'}>
                  {warrantyCoverage?.isLaborActive ? `✓ Active (${warrantyCoverage.laborDaysLeft} days left)` : 'Expired'}
                </span>
              </div>
              <p className="text-[11px] text-indigo-800">
                {warrantyCoverage?.isLaborActive
                  ? '💡 Dahil sakop pa ng warranty, 100% LIBRE (₱0) ang labor fee sa warranty rework!'
                  : 'Paalala: Lumagpas na sa standard labor warranty period ang serbisyo.'}
              </p>
            </div>

            {/* Claim Type Selection */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Uri ng Claim (Claim Type):</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setClaimType('labor_rework')}
                  className={cn(
                    'p-2.5 border text-left flex flex-col justify-between transition-colors cursor-pointer',
                    claimType === 'labor_rework'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-1 ring-indigo-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <Wrench className="size-3.5 text-indigo-600" />
                    <span className="text-xs">Free Labor Rework</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold mt-1">₱0 Labor Fee (Libre)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setClaimType('refund')}
                  className={cn(
                    'p-2.5 border text-left flex flex-col justify-between transition-colors cursor-pointer',
                    claimType === 'refund'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-1 ring-indigo-600'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="size-3.5 text-indigo-600" />
                    <span className="text-xs">Refund Request</span>
                  </div>
                  <span className="text-[10px] text-indigo-700 font-bold mt-1">
                    Up to {formatCurrency(laborFee || totalFee)}
                  </span>
                </button>
              </div>
            </div>

            {/* Reason Selection */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Dahilan (Reason):</label>
              <select
                value={claimReason}
                onChange={(e) => setClaimReason(e.target.value)}
                className="w-full h-8 px-2 border border-slate-300 rounded-none bg-white text-xs text-slate-800 outline-none focus:border-indigo-600"
              >
                <option value="Recurring issue after service">Bumalik ang parehong problema pagkatapos ayusin (Recurring issue)</option>
                <option value="Appliance or vehicle stopped working">Huminto sa paggana ang appliance / sasakyan</option>
                <option value="Improper installation or diagnostic error">Hindi maayos ang pagkakabit / diagnostic error</option>
                <option value="Defective replacement part">May sira o depektibo ang pinalitang piyesa (Defective part)</option>
                <option value="Other warranty concern">Iba pang warranty concern</option>
              </select>
            </div>

            {/* Detailed Description */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Paliwanag / Detalye (Issue Details):</label>
              <textarea
                rows={3}
                value={claimDetails}
                onChange={(e) => setClaimDetails(e.target.value)}
                placeholder="Ilarawan nang detalyado kung ano ang nangyari o naging problema..."
                className="w-full p-2 border border-slate-300 rounded-none text-xs text-slate-800 resize-none outline-none focus:border-indigo-600"
              />
            </div>

            {/* Refund Account Info (If Refund Request) */}
            {claimType === 'refund' && (
              <div className="p-3 bg-amber-50 border border-amber-200 space-y-2">
                <span className="font-bold text-slate-800 block text-xs">Payment Details for Refund:</span>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="h-8 px-2 border border-slate-300 bg-white text-xs outline-none"
                  >
                    <option value="gcash">GCash</option>
                    <option value="maya">Maya</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                  <Input
                    placeholder="Account Name"
                    value={refundAccountName}
                    onChange={(e) => setRefundAccountName(e.target.value)}
                    className="h-8 rounded-none border-slate-300 text-xs col-span-2"
                  />
                </div>
                <Input
                  placeholder="GCash / Maya / Account Number"
                  value={refundAccountNumber}
                  onChange={(e) => setRefundAccountNumber(e.target.value)}
                  className="h-8 rounded-none border-slate-300 text-xs"
                />
              </div>
            )}

            {/* Proof Photos Upload */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Mag-upload ng Litrato / Proof (Photo Proof):</label>
              <Input
                type="file"
                accept="image/*"
                multiple
                className="rounded-none border-slate-300 text-xs"
                onChange={async (e) => {
                  const files = Array.from(e.target.files || [])
                  if (!files.length) return
                  for (const file of files) {
                    if (file.size > 5 * 1024 * 1024) {
                      setClaimError('Each photo must be 5MB or less.')
                      return
                    }
                    try {
                      const dataUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader()
                        reader.onload = () => resolve(String(reader.result || ''))
                        reader.onerror = () => reject(new Error('Failed to read image.'))
                        reader.readAsDataURL(file)
                      })
                      setClaimProofPhotos((prev) => [...prev, dataUrl])
                    } catch {
                      setClaimError('Unable to read image.')
                    }
                  }
                  e.target.value = ''
                }}
              />
              {claimProofPhotos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {claimProofPhotos.map((src, idx) => (
                    <div key={idx} className="relative size-14 border border-slate-300">
                      <img src={src} alt={`Preview ${idx + 1}`} className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setClaimProofPhotos((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-1.5 -right-1.5 size-4 bg-rose-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {claimError && (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 border border-rose-200">
                {claimError}
              </p>
            )}
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-none border-slate-300 text-xs font-bold"
              onClick={() => setShowWarrantyClaimDialog(false)}
              disabled={isSubmittingClaim}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-none bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50"
              disabled={isSubmittingClaim || !claimReason.trim()}
              onClick={() => void submitWarrantyClaim()}
            >
              {isSubmittingClaim ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Submitting Claim...
                </>
              ) : (
                'Submit Warranty Claim'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Now Dialog Modal */}
      <Dialog
        open={showPayDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowPayDialog(false)
            setSelectedPaymentMethodId('')
            setPaymentProofImage('')
            setPayError('')
          }
        }}
      >
        <DialogContent className="flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden sm:max-w-lg rounded-none" showCloseButton>
          <DialogHeader className="border-b border-slate-100 pb-3">
            <DialogTitle className="text-lg font-black text-slate-900">Pay Now</DialogTitle>
            <DialogDescription className="text-xs">
              Service fee payment for <span className="font-bold text-slate-900">{booking.serviceName}</span> from{' '}
              <span className="font-bold text-slate-900">{booking.shopName}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 text-xs sm:text-sm">
            <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-none space-y-2">
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Service Fee Breakdown</p>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Labor Price:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(payBreakdown.labor)}</span>
                </div>
                {Array.isArray(booking.serviceFeeReplacementParts) && booking.serviceFeeReplacementParts.length > 0 ? (
                  <div className="pt-1">
                    <p className="mb-1 text-[11px] font-bold text-slate-500">Replacement Parts:</p>
                    <div className="space-y-1 pl-2">
                      {booking.serviceFeeReplacementParts.map((part, idx) => (
                        <div key={`${booking.id}-part-${idx}`} className="flex items-center justify-between text-xs">
                          <span className="text-slate-700">{part.name}</span>
                          <span className="font-semibold text-slate-900">{formatCurrency(part.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 font-bold text-sm">
                  <span className="text-slate-900">Total Amount Due:</span>
                  <span className="font-black text-emerald-700">{formatCurrency(payBreakdown.total)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Payment Method</p>
              <select
                value={selectedPaymentMethodId}
                onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
                className="h-10 w-full rounded-none border border-slate-300 bg-white px-3 text-xs font-bold outline-none focus:border-indigo-600"
              >
                <option value="" disabled>
                  Choose payment option
                </option>
                {paymentMethodsForDialog.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.type === 'cash_on_service' ? 'Cash on Service (Pay Face-to-Face)' : method.type === 'maya' ? 'Maya' : 'GCash'}
                  </option>
                ))}
              </select>

              {selectedPaymentMethod ? (
                <div className="bg-white p-3.5 border border-slate-200 text-xs space-y-2">
                  {selectedPaymentMethod.type === 'cash_on_service' ? (
                    <p className="text-slate-600 font-medium">Cash on Service: Pay face-to-face to the service technician upon completion.</p>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-slate-700">
                        <span className="font-bold">Account Number:</span> {selectedPaymentMethod.details?.trim() || '—'}
                      </p>
                      <p className="text-slate-700">
                        <span className="font-bold">Account Name:</span> {selectedPaymentMethod.accountName?.trim() || '—'}
                      </p>
                      {selectedPaymentMethod.qrImage ? (
                        <div className="pt-1 text-center">
                          <p className="mb-1 text-[11px] font-bold text-slate-500">Scan QR Code to Pay</p>
                          <img
                            src={selectedPaymentMethod.qrImage}
                            alt="Payment QR"
                            className="mx-auto size-44 border border-slate-300 object-cover"
                          />
                        </div>
                      ) : null}
                      {selectedPaymentMethod.notes?.trim() && (
                        <p className="text-slate-500 italic text-[11px]">Note: {selectedPaymentMethod.notes.trim()}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : null}

              {selectedPaymentMethod && selectedPaymentMethod.type !== 'cash_on_service' ? (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Upload Proof of Payment (Receipt Screenshot)</p>
                  <Input
                    type="file"
                    accept="image/*"
                    className="rounded-none border-slate-300 text-xs"
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
                      className="h-36 w-full rounded-none border border-slate-300 bg-slate-50 object-contain"
                    />
                  ) : null}
                </div>
              ) : null}
            </div>

            {payError ? <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 border border-rose-200">{payError}</p> : null}
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-none border-slate-300 text-xs font-bold"
              onClick={() => setShowPayDialog(false)}
              disabled={isSubmittingPayment}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50"
              disabled={isSubmittingPayment || !selectedPaymentMethodId}
              onClick={() => void submitPayNow()}
            >
              {isSubmittingPayment ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Processing...
                </>
              ) : (
                'Confirm Payment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo Preview Modal - Exact 1:1 Square Box Design */}
      {showPhotoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4"
          onClick={() => setShowPhotoModal(false)}
        >
          <div
            className="relative w-full max-w-[450px] aspect-square bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Fixed height) */}
            <div className="shrink-0 flex items-center justify-between px-3.5 py-2.5 bg-white border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="size-6 bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <ImageIcon className="size-3.5" />
                </div>
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">{photoModalTitle || 'Photo Preview'}</h4>
                {photoModalList.length > 1 && (
                  <span className="text-[10px] font-mono font-extrabold bg-slate-100 text-slate-700 px-1.5 py-0.5 border border-slate-200">
                    {photoModalIndex + 1} / {photoModalList.length}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="size-6 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Center Image Canvas (Fills remaining square space) */}
            <div className="relative flex-1 min-h-0 bg-slate-50 flex items-center justify-center p-2.5 sm:p-3 overflow-hidden">
              <img
                src={activePhotoSrc}
                alt="Proof Preview"
                className="max-h-full max-w-full object-contain mx-auto drop-shadow-sm"
              />
            </div>

            {/* Thumbnail Strip if multiple photos */}
            {photoModalList.length > 1 && (
              <div className="shrink-0 px-3 py-1.5 bg-white border-t border-slate-200 flex items-center justify-center gap-1.5 overflow-x-auto no-scrollbar">
                {photoModalList.map((src, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPhotoModalIndex(idx)
                      setActivePhotoSrc(src)
                    }}
                    className={cn(
                      'size-10 border-2 shrink-0 cursor-pointer overflow-hidden transition-all bg-slate-50',
                      photoModalIndex === idx
                        ? 'border-purple-600 shadow-xs scale-105'
                        : 'border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-400'
                    )}
                  >
                    <img src={src} alt={`Thumbnail ${idx + 1}`} className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Modal Footer (Fixed height) */}
            <div className="shrink-0 px-3.5 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium truncate max-w-[250px]">Start job proof photo</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPhotoModal(false)}
                className="h-6 px-2.5 text-[11px] font-bold border-slate-300 bg-white hover:bg-slate-100 text-slate-800 rounded-none cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Official Service E-Receipt Dialog */}
      <ServiceReceiptDialog
        open={showReceiptDialog}
        onOpenChange={setShowReceiptDialog}
        booking={booking}
      />
    </CustomerLayout>
  )
}
