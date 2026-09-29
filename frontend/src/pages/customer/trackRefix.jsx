import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  Eye,
  FileText,
  Home,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Star,
  Store,
  Upload,
  User,
  Wrench,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import CustomerLayout from '../../layout/customerlayout.jsx'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { formatReadableShopAddress } from '../../lib/psgcResolve'

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

function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatAssignedRole(jobTitle, category) {
  const t = (jobTitle || '').toLowerCase().trim()
  if (t === 'mechanic' || t === 'technician') {
    return t.charAt(0).toUpperCase() + t.slice(1)
  }
  const c = (category || '').toLowerCase()
  if (c === 'vehicles' || c === 'vehicle' || c === 'auto') return 'Mechanic'
  return 'Technician'
}

function resolveIssuePhotoSrc(src) {
  const value = String(src ?? '').trim()
  if (!value) return ''
  if (/^(data:|blob:)/i.test(value)) return value
  if (value.startsWith('/uploads/')) return `${API_URL}${value}`
  if (/^https?:\/\//i.test(value)) return value
  return value
}

function getRefixStageIndex(claimStatus) {
  const s = String(claimStatus || '').toLowerCase().trim()
  if (s === 'pending') return 0
  if (s === 'approved') return 1
  if (s === 'working' || s === 'in_progress') return 2
  if (s === 'fixed') return 3
  if (s === 'resolved' || s === 'completed') return 4
  if (s === 'rejected') return -1
  return 0
}

export default function CustomerTrackRefix({ bookingId: propBookingId }) {
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [readableShopAddress, setReadableShopAddress] = useState('')
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [activePhotoSrc, setActivePhotoSrc] = useState('')
  const [photoModalTitle, setPhotoModalTitle] = useState('Photo Preview')
  const [photoModalSubtitle, setPhotoModalSubtitle] = useState('Proof photo')
  const [photoModalList, setPhotoModalList] = useState([])
  const [photoModalIndex, setPhotoModalIndex] = useState(0)
  const [activeNoteModal, setActiveNoteModal] = useState(null)

  // Re-apply refix claim modal state
  const [reapplyOpen, setReapplyOpen] = useState(false)
  const [claimReason, setClaimReason] = useState('')
  const [claimDetails, setClaimDetails] = useState('')
  const [claimProofPhotos, setClaimProofPhotos] = useState([])
  const [isSubmittingReapply, setIsSubmittingReapply] = useState(false)
  const [reapplyError, setReapplyError] = useState('')

  const activeBookingId = useMemo(() => {
    if (propBookingId) return propBookingId
    const hash = window.location.hash || ''
    if (hash.startsWith('#/customer/track-refix/')) {
      const raw = hash.slice('#/customer/track-refix/'.length)
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
      const res = await fetch(`${API_URL}/api/catalog/bookings/${encodeURIComponent(activeBookingId)}`, {
        headers: authHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.booking) {
        setBooking(data.booking)
        if (data.booking.shopAddress) {
          setReadableShopAddress(data.booking.shopAddress)
        }
      } else {
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
          throw new Error(data?.message || 'Could not load refix booking details.')
        }
      }
    } catch (e) {
      setError(e?.message || 'Failed to fetch refix details.')
    } finally {
      setLoading(false)
    }
  }, [activeBookingId])

  useEffect(() => {
    fetchBooking()
  }, [fetchBooking])

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

  const claim = booking?.warrantyClaim || null
  const claimStatus = String(claim?.status || 'none').toLowerCase().trim()
  const isRejected = claimStatus === 'rejected'
  const isPending = claimStatus === 'pending'
  const isApproved = claimStatus === 'approved'
  const isWorking = claimStatus === 'working' || claimStatus === 'in_progress'
  const isFixed = claimStatus === 'fixed'
  const isResolved = claimStatus === 'resolved' || claimStatus === 'completed'

  const currentStageIndex = getRefixStageIndex(claimStatus)
  const isRated = Boolean(booking?.customerReviewedAt || booking?.customerReviewRating)

  const handleCopyRef = () => {
    if (booking?.ref) {
      navigator.clipboard.writeText(booking.ref)
      toast.success(`Booking ref ${booking.ref} copied to clipboard!`)
    }
  }

  const openPhotoModal = (srcOrList, title = 'Photo Preview', initialIndex = 0, subtitle = 'Proof photo') => {
    if (Array.isArray(srcOrList)) {
      const list = srcOrList.map(resolveIssuePhotoSrc).filter(Boolean)
      if (!list.length) return
      setPhotoModalList(list)
      const validIndex = initialIndex >= 0 && initialIndex < list.length ? initialIndex : 0
      setPhotoModalIndex(validIndex)
      setActivePhotoSrc(list[validIndex] || list[0])
    } else {
      const resolved = resolveIssuePhotoSrc(srcOrList)
      if (!resolved) return
      setPhotoModalList([resolved])
      setPhotoModalIndex(0)
      setActivePhotoSrc(resolved)
    }
    setPhotoModalTitle(title)
    setPhotoModalSubtitle(subtitle)
    setShowPhotoModal(true)
  }

  // Handle image upload for re-applying refix
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (claimProofPhotos.length + files.length > 5) {
      toast.error('You can upload a maximum of 5 proof images/videos.')
      return
    }

    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setClaimProofPhotos((prev) => [...prev, reader.result])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemovePhoto = (index) => {
    setClaimProofPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const openReapplyDialog = () => {
    setClaimReason(claim?.reason || '')
    setClaimDetails(claim?.details || '')
    setClaimProofPhotos(claim?.proofPhotos || [])
    setReapplyError('')
    setReapplyOpen(true)
  }

  const submitReapplyClaim = async () => {
    if (!booking || !activeBookingId) return
    if (!claimReason.trim()) {
      setReapplyError('Please state the recurring issue or reason for refix.')
      return
    }
    setReapplyError('')
    setIsSubmittingReapply(true)

    try {
      const res = await fetch(`${API_URL}/api/catalog/bookings/${encodeURIComponent(activeBookingId)}/warranty-claim`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          claimType: 'labor_rework',
          reason: claimReason.trim(),
          details: claimDetails.trim(),
          proofPhotos: claimProofPhotos,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Failed to submit refix request.')

      toast.success('Refix request submitted successfully!')
      setReapplyOpen(false)
      await fetchBooking()
    } catch (e) {
      setReapplyError(e?.message || 'Failed to submit refix request.')
    } finally {
      setIsSubmittingReapply(false)
    }
  }

  const assignedStaffRole = formatAssignedRole(booking?.assignedTechnicianJobTitle, booking?.category)

  const reRepairProofPhotos = useMemo(() => {
    if (Array.isArray(booking?.startJobProofPhotos) && booking.startJobProofPhotos.length > 0) {
      return booking.startJobProofPhotos.filter(Boolean)
    }
    if (Array.isArray(claim?.startJobProofPhotos) && claim.startJobProofPhotos.length > 0) {
      return claim.startJobProofPhotos.filter(Boolean)
    }
    return []
  }, [booking?.startJobProofPhotos, claim?.startJobProofPhotos])

  const completionProofPhotos = useMemo(() => {
    if (Array.isArray(booking?.completionProofPhotos) && booking.completionProofPhotos.length > 0) {
      return booking.completionProofPhotos.filter(Boolean)
    }
    if (Array.isArray(claim?.completionProofPhotos) && claim.completionProofPhotos.length > 0) {
      return claim.completionProofPhotos.filter(Boolean)
    }
    return []
  }, [booking?.completionProofPhotos, claim?.completionProofPhotos])

  // Warranty calculation
  const warrantySummary = useMemo(() => {
    if (!booking) return null
    const compDate = booking.completedAt ? new Date(booking.completedAt) : new Date(booking.updatedAt || Date.now())
    const ws = booking.warrantySettings || {}
    const laborDays = Number(ws.laborWarrantyDays) || 30
    const expiry = new Date(compDate.getTime() + laborDays * 24 * 60 * 60 * 1000)
    const now = new Date()
    const remainingDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return {
      laborDays,
      expiry,
      remainingDays: remainingDays > 0 ? remainingDays : 0,
      isExpired: remainingDays <= 0,
    }
  }, [booking])

  if (loading) {
    return (
      <CustomerLayout activePage="track-refix">
        <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center min-h-[420px]">
          <Loader2 className="size-10 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-bold text-slate-700">Loading Refix / Re-repair Status...</p>
          <p className="text-xs text-slate-500 mt-1">Retrieving warranty claim and service updates</p>
        </main>
      </CustomerLayout>
    )
  }

  if (error || !booking) {
    return (
      <CustomerLayout activePage="track-refix">
        <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-8">
          <div className="p-8 sm:p-12 bg-white border border-slate-200 text-center space-y-3 shadow-sm">
            <AlertCircle className="size-10 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Refix Record Not Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">{error || 'Could not locate refix tracking details for this booking.'}</p>
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

  // Refix Stepper Steps matching exact UI from bookingdetails.jsx
  const steps = [
    {
      label: 'Refix Requested',
      icon: Calendar,
      date: claim?.claimedAt || claim?.createdAt || booking.updatedAt,
    },
    {
      label: 'Refix Approved',
      icon: CheckCircle2,
      date: claim?.approvedAt || (currentStageIndex >= 1 ? booking.updatedAt : null),
    },
    {
      label: 'Re-repairing',
      icon: Wrench,
      date: claim?.startedAt || (currentStageIndex >= 2 ? booking.updatedAt : null),
    },
    {
      label: 'Refix Fixed',
      icon: CheckCircle2,
      date: claim?.fixedAt || (currentStageIndex >= 3 ? booking.updatedAt : null),
    },
    {
      label: 'Refix Completed',
      icon: ShieldCheck,
      date: claim?.resolvedAt || (currentStageIndex >= 4 ? booking.updatedAt : null),
    },
    {
      label: isRated ? 'Rated' : 'Rate Service',
      icon: Star,
      date: booking.customerReviewedAt || null,
    },
  ]

  return (
    <CustomerLayout activePage="track-refix">
      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 space-y-4 sm:space-y-5 pb-24 sm:pb-6 overflow-x-hidden min-w-0">
        <div className="mx-auto max-w-none space-y-4">
          
          {/* Main Card Container */}
          <div className={cn('rounded-none bg-white border border-slate-200/80 p-3 sm:p-6 overflow-hidden', cardShadow)}>
            
            {/* TOP BAR HEADER OVERLAY */}
            <div className="-mx-3 sm:-mx-6 -mt-3 sm:-mt-6 mb-4 sm:mb-6 border-b border-slate-300 bg-slate-900 text-white p-2.5 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
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

                {/* Status Badge */}
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-none font-black text-[10px] sm:text-[11px] uppercase tracking-wider border',
                    isRejected
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : isResolved
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                      : isFixed
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : isWorking
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : isApproved
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  )}
                >
                  {isRejected
                    ? 'Refix Declined'
                    : isResolved
                    ? 'Refix Completed'
                    : isFixed
                    ? 'Refix Fixed'
                    : isWorking
                    ? 'Re-repairing'
                    : isApproved
                    ? 'Refix Approved'
                    : 'Refix / Re-repair Request'}
                </span>

                <span className="bg-indigo-900/60 text-indigo-200 border border-indigo-500/40 px-2 py-0.5 font-bold text-[10px] uppercase">
                  ₱0.00 Free Labor Guarantee
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.location.hash = `#/customer/booking-details/${encodeURIComponent(booking.id)}`
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
                >
                  <FileText className="size-3.5" />
                  <span>View Original Booking</span>
                </button>
                <button
                  type="button"
                  onClick={fetchBooking}
                  className="size-7 rounded-none bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer border border-slate-700 shrink-0"
                  title="Refresh Status"
                >
                  <RefreshCw className="size-3.5" />
                </button>
              </div>
            </div>

            {/* CONTEXTUAL STATUS ALERT BANNER */}
            <div className="mb-6">
              {isRejected ? (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="size-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-rose-900">Refix Request Declined</h4>
                      <p className="text-xs text-rose-700 mt-0.5">
                        {claim?.rejectionReason || claim?.resolutionNotes || 'The shop reviewed your claim and determined it is not covered or requires clarification.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={openReapplyDialog}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-none shadow-sm cursor-pointer"
                    >
                      Re-apply Refix
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.location.hash = `#/customer/messages?shopId=${encodeURIComponent(booking.shopOwner || booking.shopId || '')}`
                      }}
                      className="px-3.5 py-1.5 bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 text-xs font-bold rounded-none shadow-2xs cursor-pointer"
                    >
                      Message Shop
                    </button>
                  </div>
                </div>
              ) : isResolved ? (
                <div className="p-4 bg-teal-50 border border-teal-200 text-teal-950 flex items-start gap-3">
                  <ShieldCheck className="size-5 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-teal-900">Warranty Rework Completed & Released</h4>
                    <p className="text-xs text-teal-700 mt-0.5">
                      Your unit has been successfully re-repaired and released by {booking.shopName}. The rework was fully covered under the ₱0 Labor Guarantee.
                    </p>
                  </div>
                </div>
              ) : isFixed ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-emerald-900">Rework Fixed & Tested!</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      The technician has completed the re-repair and verified normal operation. Your item is ready for inspection and final release.
                    </p>
                  </div>
                </div>
              ) : isWorking ? (
                <div className="p-4 bg-purple-50 border border-purple-200 text-purple-950 flex items-start gap-3">
                  <Wrench className="size-5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-purple-900">Re-repair in Progress</h4>
                    <p className="text-xs text-purple-700 mt-0.5">
                      {booking.assignedTechnicianName ? `${booking.assignedTechnicianName} is actively working on re-repairing your item.` : 'The technician is actively servicing and re-repairing your item under warranty.'}
                    </p>
                  </div>
                </div>
              ) : isApproved ? (
                <div className="p-4 bg-indigo-50 border border-indigo-200 text-indigo-950 flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-indigo-900">Refix Request Approved!</h4>
                    <p className="text-xs text-indigo-700 mt-0.5">
                      {booking.serviceMode === 'home'
                        ? 'The shop has approved your rework request. The technician will arrive for the scheduled warranty service visit.'
                        : 'The shop has approved your rework request. You may bring your vehicle/appliance to the shop for rework with ₱0 Labor Fee.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-3">
                  <Clock className="size-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-amber-900">Refix Request Under Shop Review</h4>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Your rework claim has been submitted to {booking.shopName}. The shop owner and technician are reviewing your problem observations and photo attachments.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* EXACT STEPPER PROCESS SECTION (MATCHING BOOKINGDETAILS.JSX) */}
            <div className="my-6 w-full overflow-x-auto no-scrollbar pb-3 pt-1">
              <div className="flex items-start justify-between min-w-[780px] sm:min-w-[840px] px-2">
                {steps.map((s, idx) => {
                  const Icon = s.icon
                  const isCancelled = isRejected && idx === 0
                  const isDone = !isRejected && idx <= currentStageIndex
                  const isCurrent = !isRejected && idx === currentStageIndex
                  const lineActive = !isRejected && idx < currentStageIndex

                  const boxClass = isCancelled
                    ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/30'
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
                            lineActive ? 'bg-indigo-600' : 'bg-slate-200'
                          )}
                        />
                      )}

                      {/* Step Box */}
                      <div
                        className={cn(
                          'relative z-10 size-12 sm:size-14 rounded-none border-2 flex items-center justify-center transition-all bg-white',
                          boxClass
                        )}
                      >
                        <Icon className="size-5 sm:size-6" />
                      </div>

                      {/* Status Label */}
                      <div className="mt-3 min-h-[36px] flex items-center justify-center px-1">
                        <span
                          className={cn(
                            'text-xs sm:text-[13px] font-black leading-tight',
                            isCurrent
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
                          <span className="text-[11px] sm:text-xs font-mono font-semibold text-slate-500 block">
                            {formatDateTime(s.date)}
                          </span>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-300 block">—</span>
                        )}
                      </div>

                      {/* Action buttons (View Proof for Re-repairing / Refix Completed / Rate Now if completed) */}
                      <div className="mt-2 min-h-[28px] flex items-center justify-center">
                        {s.label === 'Re-repairing' && reRepairProofPhotos.length > 0 && (
                          <button
                            type="button"
                            onClick={() => openPhotoModal(reRepairProofPhotos, 'Start of Re-repair Photo Proof', 0, 'Re-repair Start Job Photo Proof')}
                            className="px-2.5 sm:px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 text-[11px] sm:text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-xs hover:shadow"
                            title="View Re-repair Start Job Photo Proof"
                          >
                            <Eye className="size-3.5 text-purple-700" />
                            <span>View Proof</span>
                          </button>
                        )}

                        {s.label === 'Refix Completed' && completionProofPhotos.length > 0 && (
                          <button
                            type="button"
                            onClick={() => openPhotoModal(completionProofPhotos, 'Item Handover & Completion Photo Proof', 0, 'Refix Handover Photo Proof')}
                            className="px-2.5 sm:px-3 py-1 bg-teal-100 hover:bg-teal-200 text-teal-900 border border-teal-300 text-[11px] sm:text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-xs hover:shadow"
                            title="View Refix Handover Photo Proof"
                          >
                            <Eye className="size-3.5 text-teal-700" />
                            <span>View Proof</span>
                          </button>
                        )}

                        {(s.label === 'Rate Service' || s.label === 'Rated') && isResolved && (
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

            {/* SERVICE & WARRANTY INFO BAR */}
            <div className="-mx-3 sm:-mx-6 mt-4 sm:mt-6 border-y border-indigo-200/80 bg-indigo-50/70 p-3 sm:p-4 text-xs text-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-indigo-600 shrink-0" />
                <div>
                  <span className="font-extrabold text-indigo-950">Warranty Rework Notice:</span>{' '}
                  <span>
                    This rework is fully covered under the 100% Free Labor Guarantee. Any required replacement parts are subject to standard shop warranty terms.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Badge className="bg-indigo-600 text-white text-[10px] font-black uppercase rounded-none">
                  ₱0.00 Labor Fee Waiver
                </Badge>
              </div>
            </div>

            {/* DETAILS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
              
              {/* LEFT & CENTER COLUMN (2 cols): REFIX DETAILS & PROBLEM REPORT */}
              <div className="lg:col-span-2 space-y-5">
                
                {/* 1. Refix & Warranty Guarantee Summary */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="size-4 text-indigo-600" />
                      <span>Warranty Rework Guarantee</span>
                    </h3>
                    <Badge className="bg-emerald-100 text-emerald-900 border-emerald-200 text-[10px] font-black uppercase rounded-none">
                      100% Free Labor Guarantee
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Claim Type</span>
                      <span className="font-extrabold text-slate-800 text-xs sm:text-sm">
                        Labor Rework (Refix & Diagnostic)
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Labor Fee Coverage</span>
                      <span className="font-black text-emerald-600 text-xs sm:text-sm flex items-center gap-1">
                        <span>₱0.00 (Waived under Warranty)</span>
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Original Service</span>
                      <span className="font-bold text-slate-800">{booking.serviceTitle || 'Repair Service'}</span>
                      {booking.brand && <span className="text-slate-500 block text-[11px]">{booking.brand} {booking.model}</span>}
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Warranty Policy</span>
                      <span className="font-bold text-slate-800">
                        {warrantySummary ? `${warrantySummary.laborDays}-Day Labor Coverage` : 'Standard Service Warranty'}
                      </span>
                      {warrantySummary?.expiry && (
                        <span className="text-slate-500 block text-[11px]">
                          Expires: {warrantySummary.expiry.toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Customer's Submitted Problem & Observations */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 space-y-3">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
                    <AlertCircle className="size-4 text-amber-600" />
                    <span>Reported Defect & Customer Observations</span>
                  </h3>

                  <div className="space-y-2">
                    <div className="text-xs">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Problem Summary / Reason:</span>
                      <p className="font-extrabold text-slate-800 bg-slate-50 p-2.5 border border-slate-100 mt-1">
                        {claim?.reason || 'Recurring defect / service rework requested'}
                      </p>
                    </div>

                    {claim?.details && (
                      <div className="text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Detailed Observations:</span>
                        <p className="text-slate-700 bg-slate-50 p-2.5 border border-slate-100 mt-1 whitespace-pre-wrap leading-relaxed">
                          {claim.details}
                        </p>
                      </div>
                    )}

                    {/* Attached Proof Photos */}
                    {Array.isArray(claim?.proofPhotos) && claim.proofPhotos.length > 0 && (
                      <div className="pt-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">
                          Photo / Video Evidence ({claim.proofPhotos.length})
                        </span>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                          {claim.proofPhotos.map((photo, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => openPhotoModal(claim.proofPhotos, 'Customer Reported Issue Proof', i, 'Customer Observation Photo')}
                              className="aspect-square bg-slate-100 border border-slate-200 hover:border-indigo-500 relative overflow-hidden group cursor-pointer"
                            >
                              <img src={photo} alt={`Proof ${i + 1}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="size-4 text-white" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Re-repair Start Job Photo Proof Card */}
                {reRepairProofPhotos.length > 0 && (
                  <div className="p-4 sm:p-5 bg-white border border-purple-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                      <h3 className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Wrench className="size-4 text-purple-600" />
                        <span>Re-repair Start Job Photo Proof ({reRepairProofPhotos.length})</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => openPhotoModal(reRepairProofPhotos, 'Start of Re-repair Photo Proof', 0, 'Re-repair Start Job Photo Proof')}
                        className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="size-3.5 text-purple-700" />
                        <span>Expand Photos</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-600">
                      Uploaded by the service provider upon starting the rework process.
                    </p>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-1">
                      {reRepairProofPhotos.map((photo, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => openPhotoModal(reRepairProofPhotos, 'Start of Re-repair Photo Proof', i, 'Re-repair Start Job Photo Proof')}
                          className="aspect-square bg-slate-100 border border-purple-200 hover:border-purple-500 relative overflow-hidden group cursor-pointer"
                        >
                          <img src={photo} alt={`Re-repair Proof ${i + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-purple-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="size-4 text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Refix Handover / Completion Photo Proof Card */}
                {completionProofPhotos.length > 0 && (
                  <div className="p-4 sm:p-5 bg-white border border-teal-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-teal-100 pb-3">
                      <h3 className="text-xs font-black text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="size-4 text-teal-600" />
                        <span>Refix Completion / Handover Proof ({completionProofPhotos.length})</span>
                      </h3>
                      <button
                        type="button"
                        onClick={() => openPhotoModal(completionProofPhotos, 'Item Handover & Completion Photo Proof', 0, 'Refix Handover Photo Proof')}
                        className="px-2.5 py-1 bg-teal-100 hover:bg-teal-200 text-teal-900 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Eye className="size-3.5 text-teal-700" />
                        <span>Expand Photos</span>
                      </button>
                    </div>

                    <p className="text-xs text-slate-600">
                      Uploaded upon completion and turnover of the re-repaired unit.
                    </p>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-1">
                      {completionProofPhotos.map((photo, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => openPhotoModal(completionProofPhotos, 'Item Handover & Completion Photo Proof', i, 'Refix Handover Photo Proof')}
                          className="aspect-square bg-slate-100 border border-teal-200 hover:border-teal-500 relative overflow-hidden group cursor-pointer"
                        >
                          <img src={photo} alt={`Completion Proof ${i + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-teal-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="size-4 text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Shop & Technician Response / Resolution Notes */}
                {(claim?.resolutionNotes || claim?.rejectionReason) && (
                  <div className="p-4 sm:p-5 bg-white border border-slate-200 space-y-3">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
                      <Store className="size-4 text-indigo-600" />
                      <span>Shop Owner & Technician Response</span>
                    </h3>

                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 text-xs space-y-1">
                      <span className="text-[10px] font-extrabold text-indigo-900 uppercase">
                        Official Response from {booking.shopName}:
                      </span>
                      <p className="text-slate-800 font-medium whitespace-pre-wrap">
                        {claim.resolutionNotes || claim.rejectionReason}
                      </p>
                      {claim.resolvedAt && (
                        <span className="text-[9px] text-slate-400 block pt-1 font-mono">
                          Recorded on: {new Date(claim.resolvedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN (1 col): SHOP & TECHNICIAN CONTACT INFO */}
              <div className="space-y-5">
                
                {/* Shop Card */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 space-y-3">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
                    <Store className="size-4 text-indigo-600" />
                    <span>Service Provider</span>
                  </h3>

                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{booking.shopName || 'E-Paayos Partner Shop'}</h4>
                    <p className="text-xs text-slate-500 mt-1 flex items-start gap-1.5">
                      <MapPin className="size-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{readableShopAddress || booking.shopAddress || 'Boac, Marinduque'}</span>
                    </p>
                    {booking.shopPhone && (
                      <p className="text-xs text-slate-700 mt-1.5 flex items-center gap-1.5 font-mono">
                        <Phone className="size-3.5 text-slate-400" />
                        <span>{booking.shopPhone}</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        window.location.hash = `#/customer/messages?shopId=${encodeURIComponent(booking.shopOwner || booking.shopId || '')}`
                      }}
                      className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-none shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageSquare className="size-3.5" />
                      <span>Chat with Shop</span>
                    </button>

                    {booking.shopPhone && (
                      <a
                        href={`tel:${booking.shopPhone}`}
                        className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-none shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Phone className="size-3.5" />
                        <span>Call Shop</span>
                      </a>
                    )}

                    {booking.shopServiceId && (
                      <button
                        type="button"
                        onClick={() => {
                          window.location.hash = `#/customer/view-shop/${encodeURIComponent(booking.shopServiceId)}`
                        }}
                        className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold rounded-none flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Store className="size-3" />
                        <span>View Shop Profile</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Assigned Technician Card */}
                {booking.assignedTechnicianName && (
                  <div className="p-4 sm:p-5 bg-white border border-slate-200 space-y-3">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
                      <User className="size-4 text-indigo-600" />
                      <span>Assigned Staff</span>
                    </h3>

                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-none bg-indigo-700 text-white font-black flex items-center justify-center text-sm shrink-0">
                        {booking.assignedTechnicianName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                          {booking.assignedTechnicianName}
                        </h4>
                        <span className="text-[10px] bg-indigo-50 text-indigo-800 px-1.5 py-0.5 font-bold border border-indigo-200">
                          {assignedStaffRole}
                        </span>
                      </div>
                    </div>

                    {booking.assignedTechnicianPhone && (
                      <p className="text-xs text-slate-700 flex items-center gap-1.5 font-mono">
                        <Phone className="size-3.5 text-slate-400" />
                        <span>{booking.assignedTechnicianPhone}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Help Box */}
                <div className="p-4 bg-slate-900 text-white space-y-2">
                  <h4 className="text-xs font-extrabold flex items-center gap-1.5 text-indigo-300">
                    <ShieldAlert className="size-4 text-amber-400" />
                    <span>Customer Warranty Assistance</span>
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Need help with your rework or experiencing recurring issues? Contact our customer support or message your service shop directly through the chat.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Photo Preview Modal - Exact 1:1 Square Box Design Matching bookingdetails.jsx */}
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
              <span className="text-slate-500 font-medium truncate max-w-[250px]">{photoModalSubtitle || 'Proof photo'}</span>
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

      {/* SHOP NOTE MODAL */}
      <Dialog open={Boolean(activeNoteModal)} onOpenChange={() => setActiveNoteModal(null)}>
        <DialogContent className="max-w-md p-5 rounded-none">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <FileText className="size-4 text-indigo-600" />
              <span>{activeNoteModal?.title || 'Shop Note'}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="my-2 p-3.5 bg-slate-50 border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
            {activeNoteModal?.content}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveNoteModal(null)}
              className="rounded-none text-xs"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RE-APPLY REFIX CLAIM DIALOG */}
      <Dialog open={reapplyOpen} onOpenChange={setReapplyOpen}>
        <DialogContent className="max-w-lg p-5 rounded-none">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <RotateCcw className="size-4 text-indigo-600" />
              <span>Re-apply Refix / Warranty Claim</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Update your issue description or provide clearer photos for {booking.shopName} to re-evaluate your warranty claim.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 my-2">
            {reapplyError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {reapplyError}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Reason for Refix / Problem Summary <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={claimReason}
                onChange={(e) => setClaimReason(e.target.value)}
                placeholder="e.g. Issue recurred, noise still present, etc."
                className="w-full px-3 py-2 border border-slate-300 text-xs rounded-none focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Detailed Observations
              </label>
              <textarea
                rows={3}
                value={claimDetails}
                onChange={(e) => setClaimDetails(e.target.value)}
                placeholder="Describe when and how the defect happens in detail..."
                className="w-full px-3 py-2 border border-slate-300 text-xs rounded-none focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Upload New Photo / Video Evidence (Max 5)
              </label>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {claimProofPhotos.map((photo, index) => (
                  <div key={index} className="size-16 relative border border-slate-200 overflow-hidden group">
                    <img src={photo} alt={`New Proof ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-0 right-0 bg-rose-600 text-white size-4 flex items-center justify-center rounded-none"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>

              {claimProofPhotos.length < 5 && (
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 cursor-pointer">
                  <Upload className="size-3.5" />
                  <span>Choose Images</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setReapplyOpen(false)}
              disabled={isSubmittingReapply}
              className="rounded-none text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitReapplyClaim}
              disabled={isSubmittingReapply}
              className="rounded-none bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              {isSubmittingReapply ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1" />
                  <span>Submitting...</span>
                </>
              ) : (
                'Submit Refix Claim'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  )
}
