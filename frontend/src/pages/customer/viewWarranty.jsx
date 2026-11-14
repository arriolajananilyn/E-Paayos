import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  Bike,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  History,
  Home,
  Image as ImageIcon,
  Layers,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Tag,
  UploadCloud,
  User,
  WashingMachine,
  Wrench,
  X,
} from 'lucide-react'
import CustomerLayout, { readCustomerUserSession } from '../../layout/customerlayout.jsx'
import { SERVICE_TYPES } from './findServices.jsx'
import { toast } from 'sonner'
import { ServiceWarrantyDialog } from '../../components/bookings/ServiceWarrantyDialog.jsx'
import CustomerComplaintsModal from '../../components/complaints/CustomerComplaintsModal.jsx'
import CustomerComplaintDialog from '../../components/complaints/CustomerComplaintDialog.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

const WARRANTY_TABS = ['All Warranties', 'Active Warranty', 'Expiring Soon', 'Expired']

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

function mapBookingFromApi(row) {
  if (!row || !row.id) return null
  return {
    id: String(row.id),
    ref: String(row.ref || ''),
    shopServiceId: String(row.shopServiceId || ''),
    shopOwnerId: String(row.shopOwnerId || ''),
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
    shopOwnerName: row.shopOwnerName || '',
    shopPhone: row.shopPhone || '',
    shopAddress: row.shopAddress || '',
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
    completedAt: row.completedAt || null,
    warrantyClaim: row.warrantyClaim || null,
    warrantySettings: row.warrantySettings || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function formatPhp(amount) {
  const n = Number(amount || 0)
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(n)
  } catch {
    return `₱${Math.round(n).toLocaleString('en-PH')}`
  }
}

function resolveIssuePhotoSrc(src) {
  const value = String(src ?? '').trim()
  if (!value) return ''
  if (/^(data:|blob:)/i.test(value)) return value
  if (value.startsWith('/uploads/')) return `${API_URL}${value}`
  if (/^https?:\/\//i.test(value)) {
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
  const boxClass = size === 'lg' ? 'h-20 w-20' : 'h-14 w-14'

  return (
    <a href={resolvedSrc || '#'} target="_blank" rel="noopener noreferrer" className="group block" title={label}>
      <div className={cn('relative overflow-hidden rounded-none border border-indigo-200 bg-slate-100', boxClass)}>
        {!failed ? (
          <img
            src={resolvedSrc}
            alt={label}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] font-medium text-slate-500">
            No preview
          </div>
        )}
      </div>
    </a>
  )
}

const selectShell =
  'h-10 w-full appearance-none rounded-none border-0 bg-white px-3 py-2 pr-8 text-xs font-bold text-slate-700 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.16)] outline-none focus-visible:ring-1 focus-visible:ring-indigo-600 transition-shadow hover:shadow-[0_4px_24px_-4px_rgba(79,70,229,0.28)]'

function getWarrantyDetails(b) {
  if (!b) return null
  const ws = b.warrantySettings || b.shopOwner?.warrantySettings || {}
  const laborWarrantyEnabled = ws.laborWarrantyEnabled !== false
  const partsWarrantyEnabled = ws.partsWarrantyEnabled !== false

  const laborDays = Number.isFinite(Number(ws.laborWarrantyDays)) ? Number(ws.laborWarrantyDays) : 30
  const partsDays = Number.isFinite(Number(ws.partsWarrantyDays)) ? Number(ws.partsWarrantyDays) : 90
  const primaryDays = laborWarrantyEnabled ? laborDays : (partsWarrantyEnabled ? partsDays : 30)

  const baseDateRaw = b.completedAt || b.paidAt || b.updatedAt || b.createdAt
  const baseDate = baseDateRaw ? new Date(baseDateRaw) : new Date()
  const validBaseDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate

  const laborExpiry = new Date(validBaseDate.getTime() + laborDays * 24 * 60 * 60 * 1000)
  const partsExpiry = new Date(validBaseDate.getTime() + partsDays * 24 * 60 * 60 * 1000)
  const primaryExpiry = new Date(validBaseDate.getTime() + primaryDays * 24 * 60 * 60 * 1000)

  const nowMs = Date.now()
  const laborRemainingMs = laborExpiry.getTime() - nowMs
  const partsRemainingMs = partsExpiry.getTime() - nowMs
  const primaryRemainingMs = primaryExpiry.getTime() - nowMs

  const isLaborActive = laborWarrantyEnabled && laborRemainingMs > 0
  const isPartsActive = partsWarrantyEnabled && partsRemainingMs > 0
  const isActive = isLaborActive || isPartsActive

  const laborDaysLeft = isLaborActive ? Math.max(0, Math.ceil(laborRemainingMs / (1000 * 60 * 60 * 24))) : 0
  const partsDaysLeft = isPartsActive ? Math.max(0, Math.ceil(partsRemainingMs / (1000 * 60 * 60 * 24))) : 0
  const daysLeft = Math.max(laborDaysLeft, partsDaysLeft)

  // Progress percentage (elapsed time vs total duration)
  const totalDurationMs = primaryDays * 24 * 60 * 60 * 1000
  const elapsedMs = Math.max(0, nowMs - validBaseDate.getTime())
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)))

  return {
    isEnabled: laborWarrantyEnabled || partsWarrantyEnabled,
    laborWarrantyEnabled,
    partsWarrantyEnabled,
    laborDays,
    partsDays,
    primaryDays,
    isLaborActive,
    isPartsActive,
    isActive,
    isExpired: !isActive,
    isExpiringSoon: isActive && daysLeft <= 7,
    daysLeft,
    laborDaysLeft,
    partsDaysLeft,
    startDate: validBaseDate,
    expiryDate: primaryExpiry,
    laborExpiry,
    partsExpiry,
    progressPercent,
    startDateFormatted: validBaseDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    expiryDateFormatted: primaryExpiry.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
  }
}

function warrantyStatusBadge(b, onClick) {
  const w = getWarrantyDetails(b)
  if (!w || !w.isEnabled) {
    return (
      <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-bold uppercase rounded-none bg-slate-100 text-slate-500 border border-slate-300 shadow-2xs shrink-0">
        <ShieldAlert className="size-3.5 text-slate-400 shrink-0" />
        <span>No Warranty</span>
      </span>
    )
  }

  if (w.isExpired) {
    return (
      <button
        type="button"
        onClick={() => onClick?.(b)}
        title={`Warranty expired on ${w.expiryDateFormatted}. Click to view warranty certificate.`}
        className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-extrabold uppercase rounded-none bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 shadow-2xs transition-colors cursor-pointer shrink-0"
      >
        <ShieldAlert className="size-3.5 text-slate-500 shrink-0" />
        <span>Warranty Expired</span>
      </button>
    )
  }

  if (w.isExpiringSoon) {
    return (
      <button
        type="button"
        onClick={() => onClick?.(b)}
        title={`Warranty expires soon on ${w.expiryDateFormatted} (${w.daysLeft} days remaining). Click to view warranty certificate.`}
        className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-extrabold uppercase rounded-none bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 shadow-2xs transition-all cursor-pointer shrink-0"
      >
        <Clock className="size-3.5 text-amber-600 shrink-0 animate-pulse" />
        <span>Warranty: {w.daysLeft > 0 ? `${w.daysLeft} ${w.daysLeft === 1 ? 'Day' : 'Days'} Left` : 'Expires Today'}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onClick?.(b)}
      title={`Warranty Active: Valid until ${w.expiryDateFormatted} (${w.daysLeft} days remaining). Click to view warranty certificate.`}
      className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-extrabold uppercase rounded-none bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border border-indigo-300 shadow-2xs transition-all cursor-pointer shrink-0"
    >
      <ShieldCheck className="size-3.5 text-indigo-600 shrink-0" />
      <span>Warranty: {w.daysLeft} {w.daysLeft === 1 ? 'Day' : 'Days'} Left</span>
    </button>
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
  if (normalized === 'vehicle') return 'bg-gradient-to-r from-sky-600 to-blue-700 text-white'
  if (normalized === 'gadget') return 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
  if (normalized === 'appliance') return 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white'
  if (normalized === 'others') return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
  return 'bg-gradient-to-r from-slate-600 to-slate-700 text-white'
}

function serviceModeBadge(mode) {
  const label = SERVICE_TYPES.find((x) => x.value === mode)?.label ?? 'In-Shop'
  return (
    <Badge variant="outline" className="rounded-none border-indigo-200 bg-indigo-50 text-[11px] font-bold text-indigo-900">
      {label}
    </Badge>
  )
}

function listingTypeBadge(listingType) {
  const label = SERVICE_TYPES.find((x) => x.value === listingType)?.label ?? '—'
  return (
    <Badge variant="outline" className="rounded-none border-slate-200 bg-slate-50 text-[10px] font-medium text-slate-600">
      Listing: {label}
    </Badge>
  )
}

function formatSubmittedLine(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${date} · ${time}`
}

export default function CustomerViewWarranty() {
  const [user, setUser] = useState(readCustomerUserSession)
  const [activeTab, setActiveTab] = useState('All Warranties')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [sortBy, setSortBy] = useState('expiring-soonest')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewing, setViewing] = useState(null)
  const [warrantyCertBooking, setWarrantyCertBooking] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  // Refix claim state
  const [refixBooking, setRefixBooking] = useState(null)
  const [refixReason, setRefixReason] = useState('Same issue persists (problem returned after repair)')
  const [refixDetails, setRefixDetails] = useState('')
  const [refixProofPhotos, setRefixProofPhotos] = useState([])
  const [refixError, setRefixError] = useState('')
  const [isSubmittingRefix, setIsSubmittingRefix] = useState(false)

  // Complaint & damage report state
  const [showComplaintsModal, setShowComplaintsModal] = useState(false)
  const [complaintBooking, setComplaintBooking] = useState(null)

  const loadWarranties = useCallback(async () => {
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
        throw new Error(data?.message || 'Could not load your warranty records.')
      }
      const raw = Array.isArray(data?.bookings) ? data.bookings : []
      const mapped = raw.map(mapBookingFromApi).filter(Boolean)
      // Warranty page focuses on completed bookings where warranty was activated
      const completedOnly = mapped.filter((b) => b.status === 'completed')
      setBookings(completedOnly)
    } catch (e) {
      setBookings([])
      setListError(e?.message || 'Could not load warranty records.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    void loadWarranties()
  }, [user, loadWarranties])

  const stats = useMemo(() => {
    const total = bookings.length
    let active = 0
    let expiringSoon = 0
    let expired = 0

    bookings.forEach((b) => {
      const w = getWarrantyDetails(b)
      if (!w || !w.isEnabled) {
        expired++
        return
      }
      if (w.isActive) {
        active++
        if (w.isExpiringSoon) expiringSoon++
      } else {
        expired++
      }
    })

    return { total, active, expiringSoon, expired }
  }, [bookings])

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    const base = bookings.filter((b) => {
      const w = getWarrantyDetails(b)

      if (activeTab === 'Active Warranty' && (!w || !w.isActive)) return false
      if (activeTab === 'Expiring Soon' && (!w || !w.isExpiringSoon)) return false
      if (activeTab === 'Expired' && (!w || w.isActive)) return false

      if (categoryFilter && String(b.category || '').trim().toLowerCase() !== categoryFilter.trim().toLowerCase()) {
        return false
      }

      if (!query) return true
      const hay = `${b.serviceName} ${b.shopName} ${b.ref} ${b.category} ${b.subcategory ?? ''} ${b.problemDescription} ${b.notes} ${b.contactName} ${b.contactPhone}`.toLowerCase()
      return hay.includes(query)
    })

    const sorted = [...base]
    switch (sortBy) {
      case 'expiring-soonest':
        sorted.sort((a, b) => {
          const wA = getWarrantyDetails(a)
          const wB = getWarrantyDetails(b)
          const daysA = wA?.isActive ? wA.daysLeft : 99999
          const daysB = wB?.isActive ? wB.daysLeft : 99999
          return daysA - daysB
        })
        break
      case 'most-days-left':
        sorted.sort((a, b) => {
          const wA = getWarrantyDetails(a)
          const wB = getWarrantyDetails(b)
          const daysA = wA?.daysLeft || 0
          const daysB = wB?.daysLeft || 0
          return daysB - daysA
        })
        break
      case 'oldest':
        sorted.sort((a, b) => {
          const tA = new Date(a.completedAt || a.createdAt || 0).getTime()
          const tB = new Date(b.completedAt || b.createdAt || 0).getTime()
          return tA - tB
        })
        break
      case 'newest':
      default:
        sorted.sort((a, b) => {
          const tB = new Date(b.completedAt || b.createdAt || 0).getTime()
          const tA = new Date(a.completedAt || a.createdAt || 0).getTime()
          return tB - tA
        })
        break
    }
    return sorted
  }, [bookings, activeTab, categoryFilter, searchQuery, sortBy])

  const openRefixDialog = useCallback((b) => {
    setRefixBooking(b)
    setRefixReason('Same issue persists (problem returned after repair)')
    setRefixDetails('')
    setRefixProofPhotos([])
    setRefixError('')
  }, [])

  const submitRefixClaim = useCallback(async () => {
    if (!refixBooking) return
    setRefixError('')
    if (!refixReason.trim()) {
      setRefixError('Please select a reason for the re-repair request.')
      return
    }
    if (!refixDetails.trim() || refixDetails.trim().length < 10) {
      setRefixError('Please describe the issue in detail (at least 10 characters).')
      return
    }

    setIsSubmittingRefix(true)
    try {
      const res = await fetch(`${API_URL}/api/catalog/bookings/${encodeURIComponent(refixBooking.id)}/warranty-claim`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          claimType: 'labor_rework',
          reason: refixReason.trim(),
          details: refixDetails.trim(),
          proofPhotos: refixProofPhotos,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Failed to submit re-repair request.')

      toast.success('Warranty re-repair request submitted! The service provider has been notified.')
      setRefixBooking(null)
      await loadWarranties()
    } catch (e) {
      setRefixError(e?.message || 'Failed to submit re-repair request.')
    } finally {
      setIsSubmittingRefix(false)
    }
  }, [refixBooking, refixReason, refixDetails, refixProofPhotos, loadWarranties])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <Loader2 className="size-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  return (
    <CustomerLayout activePage="view-warranty">
      <main className="w-full px-4 sm:px-8 md:px-12 lg:px-16 pt-5 sm:pt-6 pb-8 space-y-5 sm:space-y-6 max-w-[1440px] mx-auto">
        {/* Hero Header Banner */}
        <header className="relative overflow-hidden rounded-none bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-5 text-white shadow-lg space-y-4 border border-slate-800">
          <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-emerald-600/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 size-80 rounded-full bg-indigo-600/10 blur-3xl" />

          {/* Top Row: Info & Nav Buttons */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative flex size-12 shrink-0 items-center justify-center rounded-none bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-800 shadow-md shadow-emerald-500/30">
                <ShieldCheck className="size-6 text-white" aria-hidden />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Service Warranties &amp; Guarantees
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold uppercase tracking-wider">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Coverage Active
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5 font-medium">
                  Review repair warranties, check remaining protection days, and print official guarantee certificates.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  window.location.hash = '#/customer/my-bookings'
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold rounded-none border border-indigo-500 shadow-md shadow-indigo-900/30 transition-all cursor-pointer shrink-0"
              >
                <ArrowLeft className="size-4" />
                <span>Active Bookings</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.hash = '#/customer/booking-history'
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold rounded-none border border-slate-700 shadow-md transition-all cursor-pointer shrink-0"
              >
                <History className="size-4" />
                <span>Booking History</span>
              </button>

              <button
                type="button"
                onClick={() => setShowComplaintsModal(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold rounded-none border border-rose-500 shadow-md shadow-rose-950/30 transition-all cursor-pointer shrink-0"
              >
                <ShieldAlert className="size-4 text-amber-300" />
                <span>Damage Reports &amp; Complaints</span>
              </button>
            </div>
          </div>

          {/* Warranty Stats Summary Bar */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
            {/* Total Warranties */}
            <div className="bg-slate-800/80 p-3 rounded-none border border-slate-700/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium block text-[11px]">Total Protected Jobs</span>
                <Layers className="size-3.5 text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-white">{stats.total}</span>
                <span className="text-[11px] text-slate-400 font-medium">Completed</span>
              </div>
            </div>

            {/* Active Warranties */}
            <div className="bg-slate-800/80 p-3 rounded-none border border-slate-700/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-emerald-300 font-medium block text-[11px]">Active Guarantees</span>
                <ShieldCheck className="size-3.5 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-emerald-400">{stats.active}</span>
                <span className="text-[11px] text-emerald-400/70 font-medium">Protected</span>
              </div>
            </div>

            {/* Expiring Soon */}
            <div className="bg-slate-800/80 p-3 rounded-none border border-slate-700/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-amber-300 font-medium block text-[11px]">Expiring Soon (&le; 7d)</span>
                <Clock className="size-3.5 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-amber-300">{stats.expiringSoon}</span>
                <span className="text-[11px] text-amber-400/70 font-medium">Needs Attention</span>
              </div>
            </div>

            {/* Expired */}
            <div className="bg-slate-800/80 p-3 rounded-none border border-slate-700/80 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium block text-[11px]">Expired Coverage</span>
                <ShieldAlert className="size-3.5 text-slate-400" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-slate-300">{stats.expired}</span>
                <span className="text-[11px] text-slate-400 font-medium">Lapsed</span>
              </div>
            </div>
          </div>
        </header>

        {listError ? (
          <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-none">
            <span>{listError}</span>
            <button
              type="button"
              onClick={() => void loadWarranties()}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-none cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : null}

        {/* Filter & Controls Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            {WARRANTY_TABS.map((t) => {
              const count =
                t === 'All Warranties'
                  ? stats.total
                  : t === 'Active Warranty'
                    ? stats.active
                    : t === 'Expiring Soon'
                      ? stats.expiringSoon
                      : stats.expired

              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveTab(t)}
                  className={cn(
                    'px-3.5 py-2.5 text-xs font-bold rounded-none border-0 transition-all cursor-pointer whitespace-nowrap',
                    activeTab === t
                      ? 'bg-gradient-to-r from-[#081F5C] to-[#123B9B] text-white shadow-md shadow-[#081F5C]/35'
                      : 'bg-white text-slate-700 hover:bg-slate-50 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.16)]'
                  )}
                >
                  {t} ({count})
                </button>
              )
            })}
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full sm:w-36">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={selectShell}
              >
                <option value="">Categories</option>
                <option value="Appliance">Appliance</option>
                <option value="Gadget">Gadget</option>
                <option value="Vehicle">Vehicle</option>
                <option value="Others">Others</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative w-full sm:w-44">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={selectShell}
              >
                <option value="expiring-soonest">Expiring Soonest</option>
                <option value="most-days-left">Most Days Left</option>
                <option value="newest">Newest Service</option>
                <option value="oldest">Oldest Service</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search ref, service, shop"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-none border-0 bg-white px-4 py-2.5 pr-10 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none shadow-[0_4px_20px_-4px_rgba(15,23,42,0.16)] font-medium"
              />
              <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Content Body */}
        {loading && bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 text-slate-400 space-y-3 shadow-xs">
            <RefreshCw className="size-10 animate-spin text-indigo-600 mb-3" />
            <p className="text-sm font-semibold text-slate-700">Connecting to Warranty Database...</p>
            <p className="text-xs text-slate-400 mt-1">Calculating your active guarantee periods</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 bg-white border border-slate-200 text-center">
            <ShieldCheck className="size-14 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Warranty Records Found</h3>
            <p className="text-xs text-slate-500 max-w-md mt-1 leading-relaxed">
              {searchQuery
                ? 'No warranties match your search filter.'
                : activeTab !== 'All Warranties'
                  ? `No service warranties found under "${activeTab}".`
                  : 'You do not have any completed services with warranty records yet.'}
            </p>
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#/customer/find-services'
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-none shadow-md transition-colors cursor-pointer"
            >
              Browse Services
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((b) => {
              const CategoryIcon = categoryIcon(b.category)
              const w = getWarrantyDetails(b)
              const labor = b.serviceFeeLaborRateAtCalc != null ? Number(b.serviceFeeLaborRateAtCalc) : 0
              const parts = b.serviceFeeMaterialsAmount != null ? Number(b.serviceFeeMaterialsAmount) : 0
              const totalFee = labor + parts

              return (
                <article
                  key={b.id}
                  className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5 space-y-4 rounded-none"
                >
                  {/* Top Bar Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-none bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                        <CategoryIcon className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-black text-slate-900">{b.serviceName}</span>
                          <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-none border border-slate-200 inline-flex items-center gap-1">
                            <Tag className="size-3 text-indigo-600" />
                            Ref: {b.ref}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          Completed on {w ? w.startDateFormatted : formatSubmittedLine(b.completedAt || b.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Warranty Indicator Badge on top-right */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-extrabold uppercase rounded-none bg-teal-100 text-teal-800 border border-teal-300 shadow-2xs">
                        <CheckCircle2 className="size-3.5 text-teal-600 shrink-0" />
                        <span>Completed</span>
                      </span>
                      {warrantyStatusBadge(b, (target) => setWarrantyCertBooking(target))}
                    </div>
                  </div>

                  {/* 3-Column Grid: Provider, Warranty Timeline, Fee */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 text-xs sm:text-sm">
                    {/* 1. Service Provider Details */}
                    <div className="bg-slate-50/80 p-3.5 border border-slate-200 space-y-2.5 rounded-none flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-1">
                          <span className="font-extrabold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                            <Store className="size-4 text-indigo-600" />
                            <span>Service Provider</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              window.location.hash = '#/customer/messages'
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer"
                          >
                            <MessageCircle className="size-3" />
                            <span>Message Shop</span>
                          </button>
                        </div>

                        <div className="space-y-1.5 text-xs pt-1">
                          <p className="text-slate-900 font-bold text-sm">{b.shopName}</p>
                          {b.subcategory?.trim() && (
                            <p className="text-slate-600 font-medium">Subcategory: {b.subcategory.trim()}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <Badge className={cn('rounded-none text-[10px] uppercase font-bold', categoryBadgeClass(b.category))}>
                              {b.category || 'Service'}
                            </Badge>
                            {serviceModeBadge(b.serviceMode)}
                          </div>
                          {b.shopOwnerName && (
                            <p className="text-slate-700 flex items-center gap-1.5 pt-1">
                              <User className="size-3.5 text-slate-400" />
                              <span>Owner: <strong>{b.shopOwnerName}</strong></span>
                            </p>
                          )}
                          {b.contactPhone && (
                            <p className="text-slate-600 flex items-center gap-1.5">
                              <Phone className="size-3.5 text-slate-400" />
                              <span>Phone: {b.contactPhone}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 2. Warranty Period & Timeline */}
                    <div className="bg-indigo-50/40 p-3.5 border border-indigo-200/80 space-y-2.5 rounded-none flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-1">
                          <span className="font-extrabold text-indigo-950 uppercase tracking-wider text-xs flex items-center gap-1.5">
                            <Award className="size-4 text-indigo-600" />
                            <span>Warranty Protection Period</span>
                          </span>
                          {w?.isActive && (
                            <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 border border-emerald-300">
                              Active
                            </span>
                          )}
                        </div>

                        <div className="space-y-2 text-xs pt-1">
                          {/* Live Timeline Dates */}
                          <div className="flex justify-between items-center text-[11px] font-medium text-slate-600">
                            <div>
                              <span className="block text-slate-400 text-[10px]">Activated</span>
                              <strong className="text-slate-800">{w ? w.startDateFormatted : '—'}</strong>
                            </div>
                            <div className="text-right">
                              <span className="block text-slate-400 text-[10px]">Expires On</span>
                              <strong className={w?.isActive ? 'text-indigo-900 font-bold' : 'text-slate-600'}>
                                {w ? w.expiryDateFormatted : '—'}
                              </strong>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          {w && (
                            <div className="space-y-1">
                              <div className="h-2 w-full bg-slate-200 overflow-hidden rounded-none">
                                <div
                                  className={cn(
                                    'h-full transition-all duration-300',
                                    !w.isActive
                                      ? 'bg-slate-400'
                                      : w.isExpiringSoon
                                        ? 'bg-amber-500'
                                        : 'bg-indigo-600'
                                  )}
                                  style={{ width: `${Math.min(100, Math.max(5, 100 - w.progressPercent))}%` }}
                                />
                              </div>
                              <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                                <span>{w.isActive ? `${w.daysLeft} days remaining` : 'Coverage period completed'}</span>
                                <span>{w.primaryDays} Days Total</span>
                              </div>
                            </div>
                          )}

                          {/* Coverage Badges */}
                          <div className="pt-1 flex flex-wrap gap-1.5">
                            {w?.laborWarrantyEnabled && (
                              <span className="text-[10px] font-bold bg-white text-indigo-900 border border-indigo-200 px-2 py-0.5 inline-flex items-center gap-1">
                                <CheckCircle2 className="size-3 text-indigo-600" />
                                {w.laborDays}d Free Labor Rework
                              </span>
                            )}
                            {w?.partsWarrantyEnabled && b.serviceFeeReplacementParts?.length > 0 && (
                              <span className="text-[10px] font-bold bg-white text-teal-900 border border-teal-200 px-2 py-0.5 inline-flex items-center gap-1">
                                <CheckCircle2 className="size-3 text-teal-600" />
                                {w.partsDays}d Replacement Parts Defect
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3. Fee & Parts Summary */}
                    <div className="bg-slate-50/80 p-3.5 border border-slate-200 space-y-2.5 rounded-none flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-1">
                          <span className="font-extrabold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5">
                            <DollarSign className="size-4 text-indigo-600" />
                            <span>Service Settlement</span>
                          </span>
                          <span className="px-2 py-0.5 text-[11px] font-extrabold uppercase rounded-none bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ Paid
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs pt-1">
                          <div className="flex justify-between items-center text-slate-600">
                            <span>Labor Fee:</span>
                            <span className="font-semibold text-slate-800">
                              {b.serviceFeeLaborRateAtCalc != null ? formatPhp(b.serviceFeeLaborRateAtCalc) : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-slate-600">
                            <span>Materials &amp; Parts:</span>
                            <span className="font-semibold text-slate-800">
                              {b.serviceFeeMaterialsAmount != null ? formatPhp(b.serviceFeeMaterialsAmount) : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-1 font-bold border-t border-slate-200">
                            <span className="text-slate-900">Total Covered Value:</span>
                            <span className="font-black text-indigo-700 text-base">
                              {formatPhp(totalFee)}
                            </span>
                          </div>

                          {b.serviceFeeReplacementParts?.length > 0 && (
                            <div className="pt-1.5 text-[11px] text-slate-600">
                              <span className="font-bold text-slate-700 block">Covered Components ({b.serviceFeeReplacementParts.length}):</span>
                              <p className="truncate text-slate-600 italic">
                                {b.serviceFeeReplacementParts.map((p) => p.name).join(', ')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active Warranty Claim Banner if in progress */}
                  {b.warrantyClaim && b.warrantyClaim.status && b.warrantyClaim.status !== 'none' && (
                    <div className="bg-purple-50 border border-purple-200 p-3 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="size-4 text-purple-600 shrink-0" />
                        <div>
                          <strong className="text-purple-900 uppercase">
                            Warranty Re-repair Status: {b.warrantyClaim.status}
                          </strong>
                          <p className="text-purple-700 text-[11px]">Reason: {b.warrantyClaim.reason}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          window.location.hash = `#/customer/track-refix/${encodeURIComponent(b.id)}`
                        }}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-none shadow-2xs transition-colors shrink-0"
                      >
                        Track Refix
                      </button>
                    </div>
                  )}

                  {/* Action Controls */}
                  <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100">
                    {/* View / Print Official Certificate */}
                    <button
                      type="button"
                      onClick={() => setWarrantyCertBooking(b)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="size-3.5" />
                      <span>View / Print Warranty Certificate</span>
                    </button>

                    {/* Request Re-repair (Refix) button if labor warranty is active and no claim pending */}
                    {w?.isLaborActive && (!b.warrantyClaim || !b.warrantyClaim.status || b.warrantyClaim.status === 'none') && (
                      <button
                        type="button"
                        onClick={() => openRefixDialog(b)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer"
                      >
                        <RotateCcw className="size-3.5 text-purple-600" />
                        <span>Request Free Re-repair</span>
                      </button>
                    )}

                    {/* Report Damage / File Complaint */}
                    <button
                      type="button"
                      onClick={() => setComplaintBooking(b)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer"
                      title="File a damage or dispute report with LMD-PESO"
                    >
                      <ShieldAlert className="size-3.5 text-rose-600" />
                      <span>Report Damage</span>
                    </button>

                    {/* View Shop Service */}
                    <button
                      type="button"
                      disabled={!b.shopServiceId?.trim()}
                      onClick={() => {
                        if (!b.shopServiceId?.trim()) return
                        window.location.hash = `#/customer/view-shop/${encodeURIComponent(b.shopServiceId)}`
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Store className="size-3.5 text-slate-500" />
                      <span>View Shop</span>
                    </button>

                    {/* Full Details Modal */}
                    <button
                      type="button"
                      onClick={() => setViewing(b)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white border border-slate-900 text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer"
                    >
                      <FileText className="size-3.5" />
                      <span>Service Details</span>
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* Full Details Dialog */}
        <Dialog open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
          <DialogContent className="flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden sm:max-w-2xl rounded-none" showCloseButton>
            {viewing ? (
              <>
                <DialogHeader className="shrink-0 pr-8 border-b border-slate-100 pb-3">
                  <DialogTitle className="text-lg font-black text-slate-900">
                    Warranty &amp; Service Summary
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Booking Ref: <strong className="font-mono text-slate-800">{viewing.ref}</strong> • Completed Service Record
                  </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-4 text-xs sm:text-sm">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-teal-100 text-teal-800 border border-teal-300">
                        <CheckCircle2 className="size-4 text-teal-600 shrink-0" />
                        <span>Completed</span>
                      </span>
                      {warrantyStatusBadge(viewing, (target) => {
                        setViewing(null)
                        setWarrantyCertBooking(target)
                      })}
                      <Badge className={cn('rounded-none text-[10px] uppercase font-bold', categoryBadgeClass(viewing.category))}>
                        {viewing.category || '—'}
                      </Badge>
                      {serviceModeBadge(viewing.serviceMode)}
                      {listingTypeBadge(viewing.listingType)}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 border border-slate-200 space-y-1">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Service Provider &amp; Shop</p>
                    <p className="text-sm font-bold text-slate-900">{viewing.shopName}</p>
                    {viewing.shopOwnerName && (
                      <p className="text-xs text-slate-700">Owner: <strong className="text-slate-800">{viewing.shopOwnerName}</strong></p>
                    )}
                    {viewing.shopAddress && (
                      <p className="text-xs text-slate-600 flex items-start gap-1 mt-1">
                        <MapPin className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{viewing.shopAddress}</span>
                      </p>
                    )}
                  </div>

                  {viewing.problemDescription && (
                    <div className="bg-slate-50 p-3.5 border border-slate-200 space-y-1">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Issue Addressed</p>
                      <p className="text-sm text-slate-800 leading-relaxed">{viewing.problemDescription}</p>
                    </div>
                  )}

                  {Array.isArray(viewing.serviceFeeReplacementParts) && viewing.serviceFeeReplacementParts.length > 0 && (
                    <div className="bg-slate-50 p-3.5 border border-slate-200 space-y-2">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Replacement Parts Covered</p>
                      <ul className="divide-y divide-slate-200 border border-slate-200 bg-white">
                        {viewing.serviceFeeReplacementParts.map((p, idx) => (
                          <li key={idx} className="flex justify-between items-center px-3 py-2 text-xs">
                            <span className="font-medium text-slate-800">{p.name}</span>
                            <span className="font-bold text-slate-900">{formatPhp(p.price)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <DialogFooter className="m-0 gap-2 border-t border-slate-200 pt-3 flex flex-col-reverse sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" className="rounded-none border-slate-300 text-xs font-bold" onClick={() => setViewing(null)}>
                    Close
                  </Button>
                  <Button
                    type="button"
                    className="rounded-none bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                    onClick={() => {
                      const target = viewing
                      setViewing(null)
                      setWarrantyCertBooking(target)
                    }}
                  >
                    <ShieldCheck className="size-3.5 mr-1.5" />
                    View Warranty Certificate
                  </Button>
                </DialogFooter>
              </>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Free Refix / Re-repair (Warranty Claim) Dialog */}
        <Dialog open={Boolean(refixBooking)} onOpenChange={(open) => !open && setRefixBooking(null)}>
          <DialogContent
            showCloseButton={false}
            className="flex max-h-[calc(100vh-3rem)] w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg rounded-none border border-slate-200 bg-white shadow-2xl"
          >
            <div className="bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-4 py-3 sm:px-5 sm:py-3.5 text-white shrink-0 border-b border-white/10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 bg-white/15 flex items-center justify-center border border-white/20 shrink-0">
                    <RotateCcw className="size-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight">
                      Request Free Warranty Re-repair
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-blue-100/85 mt-0.5">
                      Request a free re-repair if the same problem came back.
                    </DialogDescription>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isSubmittingRefix}
                  onClick={() => setRefixBooking(null)}
                  className="size-8 flex items-center justify-center text-white/75 hover:text-white hover:bg-white/15 transition-colors shrink-0 cursor-pointer disabled:opacity-40"
                  aria-label="Close dialog"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5 text-xs sm:text-sm">
              {refixBooking && (
                <div className="bg-indigo-50/70 p-3 border border-indigo-200 space-y-1 text-xs">
                  <p className="font-bold text-indigo-950">{refixBooking.serviceName}</p>
                  <p className="text-slate-600">Ref: <strong className="font-mono text-slate-800">{refixBooking.ref}</strong></p>
                  <p className="text-slate-600">Shop: <strong className="text-slate-800">{refixBooking.shopName}</strong></p>
                </div>
              )}

              {refixError && (
                <div className="bg-rose-50 border border-rose-200 p-2.5 text-xs font-bold text-rose-700">
                  {refixError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Select Issue Reason *
                </label>
                <select
                  value={refixReason}
                  onChange={(e) => setRefixReason(e.target.value)}
                  className="w-full border border-slate-300 bg-white p-2 text-xs font-medium rounded-none focus:outline-none focus:border-indigo-600"
                >
                  <option value="Same issue persists (problem returned after repair)">Same issue came back</option>
                  <option value="Repaired part malfunctioned / became loose">Repaired part failed</option>
                  <option value="Performance degradation after service">Worse after service</option>
                  <option value="Incomplete or defective assembly workmanship">Incomplete repair</option>
                  <option value="Other recurring symptom under repair scope">Other warranty issue</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Details *
                </label>
                <textarea
                  rows={4}
                  value={refixDetails}
                  onChange={(e) => setRefixDetails(e.target.value)}
                  placeholder="What symptoms do you see?"
                  className="w-full border border-slate-300 bg-white p-2 text-xs text-slate-800 rounded-none focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Photos (optional)
                </label>
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  className="rounded-none border-slate-300 text-xs"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files || [])
                    if (!files.length) return
                    try {
                      const dataUrls = await Promise.all(
                        files.slice(0, 3).map(
                          (file) =>
                            new Promise((resolve, reject) => {
                              const reader = new FileReader()
                              reader.onload = () => resolve(String(reader.result || ''))
                              reader.onerror = () => reject(new Error('Failed to read image.'))
                              reader.readAsDataURL(file)
                            })
                        )
                      )
                      setRefixProofPhotos(dataUrls.filter(Boolean))
                    } catch {
                      setRefixError('Failed to read selected photos.')
                    }
                  }}
                />
                {refixProofPhotos.length > 0 && (
                  <div className="flex gap-2 pt-1">
                    {refixProofPhotos.map((src, i) => (
                      <img key={i} src={src} alt="proof" className="size-12 object-cover border border-slate-300" />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="m-0 mx-0 mb-0 shrink-0 border-t border-slate-200 bg-slate-50/70 px-4 sm:px-5 py-3.5 gap-2 flex flex-col-reverse sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="rounded-none text-xs font-bold" onClick={() => setRefixBooking(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-none bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                disabled={isSubmittingRefix || !refixReason.trim() || refixDetails.trim().length < 10}
                onClick={() => void submitRefixClaim()}
              >
                {isSubmittingRefix ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Submitting Claim...
                  </>
                ) : (
                  'Submit Re-Repair Claim'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Official Service Warranty Certificate Dialog */}
        <ServiceWarrantyDialog
          open={Boolean(warrantyCertBooking)}
          onOpenChange={(open) => !open && setWarrantyCertBooking(null)}
          booking={warrantyCertBooking}
          onClaimWarranty={() => {
            const target = warrantyCertBooking
            setWarrantyCertBooking(null)
            if (target) openRefixDialog(target)
          }}
        />

        {/* Customer Complaints & Damage Reports Portal Modal */}
        <CustomerComplaintsModal
          open={showComplaintsModal}
          onOpenChange={setShowComplaintsModal}
        />

        {/* Direct Complaint Filing Dialog from Warranty */}
        <CustomerComplaintDialog
          open={Boolean(complaintBooking)}
          onOpenChange={(open) => !open && setComplaintBooking(null)}
          booking={complaintBooking}
          onSuccess={() => {
            setComplaintBooking(null)
            loadWarranties()
            setShowComplaintsModal(true)
          }}
        />
      </main>
    </CustomerLayout>
  )
}
