import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ServiceFeeCalculateDialog } from '../../../components/bookings/ServiceFeeCalculateDialog.jsx'
import { ServiceReceiptDialog } from '../../../components/bookings/ServiceReceiptDialog.jsx'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
} from '../../../components/ui/sidebar'
import { Textarea } from '../../../components/ui/textarea'
import { TooltipProvider } from '../../../components/ui/tooltip'
import {
  Bike,
  Briefcase,
  Calendar,
  CalendarCheck,
  CalendarClock,
  Camera,
  CheckCircle,
  CheckCircle2,
  ClipboardList,
  Clock,
  DollarSign,
  History,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Smartphone,
  Store,
  Tag,
  Upload,
  User,
  WashingMachine,
  Wrench,
  X,
  XCircle,
} from 'lucide-react'
import Elogo from '../../../assets/Elogo.png'
import { toast } from 'sonner'
import {
  API_URL,
  MechanicTopBar,
  StatGradientCard,
  authHeaders,
  mapBookingFromApi,
  preferredDateSortValue,
  selectShell,
} from './mechanicBookingShared.jsx'
import { useLogoutConfirmation } from '@/hooks/useLogoutConfirmation.jsx'

const navyDeep = '#04133d'
const navy = '#081F5C'
const navyMuted = '#0b2b73'
const navyBright = '#1447a6'
const pageBaseNavyGradient = `linear-gradient(145deg, ${navyDeep} 0%, ${navy} 35%, ${navyMuted} 65%, ${navyBright} 100%)`

const ASSIGNED_REQUEST_META = {
  title: 'Assigned requests',
  description:
    'Same bookings as the shop’s Service requests. After the owner confirms, use Working when you start the job, then finish with Complete / Fixed when the job is done.',
}
let mechanicTechnicianSidebarOpenState = false

const sidebarMenuButtonClass =
  'h-9 gap-3 rounded-sm px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap'

function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

function formatPhp(amount) {
  const n = Number(amount || 0)
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(n)
  } catch {
    return `₱${Math.round(n).toLocaleString('en-PH')}`
  }
}

function formatPreferredDate(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

function formatTime12h(hm) {
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

function formatSubmittedLine(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${date} · ${time}`
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

function bookingStatusBadge(status, b = null) {
  if (b?.warrantyClaim && b.warrantyClaim.status === 'pending') {
    if (b.warrantyClaim.claimType === 'labor_rework' || !b.warrantyClaim.claimType) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
          <RotateCcw className="size-4 text-purple-600 shrink-0" />
          <span>Refix / re-repair request</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
        <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
        <span>Warranty Claim Pending</span>
      </span>
    )
  }
  if (b?.warrantyClaim && b.warrantyClaim.status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-indigo-100 text-indigo-900 border border-indigo-300 shadow-2xs">
        <CheckCircle2 className="size-4 text-indigo-600 shrink-0" />
        <span>{b.warrantyClaim.claimType === 'labor_rework' ? 'Refix Approved' : 'Refund Approved'}</span>
      </span>
    )
  }
  if (b?.warrantyClaim && (b.warrantyClaim.status === 'working' || b.warrantyClaim.status === 'in_progress')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
        <span className="size-2 rounded-full bg-purple-500 animate-pulse" />
        <span>Re-repairing</span>
      </span>
    )
  }
  if (b?.warrantyClaim && b.warrantyClaim.status === 'fixed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
        <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
        <span>Refix Fixed</span>
      </span>
    )
  }
  if (b?.warrantyClaim && (b.warrantyClaim.status === 'resolved' || b.warrantyClaim.status === 'completed')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-teal-100 text-teal-900 border border-teal-300 shadow-2xs">
        <CheckCircle2 className="size-4 text-teal-600 shrink-0" />
        <span>Refix Completed</span>
      </span>
    )
  }
  if (b?.warrantyClaim && b.warrantyClaim.status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs">
        <X className="size-4 text-rose-600 shrink-0" />
        <span>Refix Declined</span>
      </span>
    )
  }

  const s = String(status || '').toLowerCase()
  if (s === 'fixed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
        <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
        <span>Fixed</span>
      </span>
    )
  }
  if (s === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-teal-100 text-teal-800 border border-teal-300 shadow-2xs">
        <CheckCircle2 className="size-4 text-teal-600 shrink-0" />
        <span>Completed</span>
      </span>
    )
  }
  if (s === 'cancelled' || s === 'canceled') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
        <X className="size-4 text-rose-600 shrink-0" />
        <span>Cancelled</span>
      </span>
    )
  }
  if (s === 'confirmed') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-sky-100 text-sky-800 border border-sky-300 shadow-2xs">
        <span className="size-2 rounded-full bg-sky-500 animate-pulse" />
        <span>Booking Confirmed</span>
      </span>
    )
  }
  if (s === 'working') {
    if (b?.serviceFeeConfirmedAt) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-indigo-100 text-indigo-800 border border-indigo-300 shadow-2xs">
          <span className="size-2 rounded-full bg-indigo-500 animate-pulse" />
          <span>Calculating Service Fee</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-purple-100 text-purple-800 border border-purple-300 shadow-2xs">
        <span className="size-2 rounded-full bg-purple-500 animate-pulse" />
        <span>Working</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold uppercase rounded-none bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
      <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
      <span>Booking Submitted</span>
    </span>
  )
}

function serviceModeBadge(mode) {
  const label = mode === 'home' ? 'Home Service' : 'In-Shop'
  return (
    <Badge variant="outline" className="rounded-none border-indigo-200 bg-indigo-50 text-[11px] font-bold text-indigo-900">
      {label}
    </Badge>
  )
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

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
    reader.onerror = () => reject(new Error('Failed to read image file.'))
    reader.readAsDataURL(file)
  })
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
      <div className={cn("relative overflow-hidden rounded-none border border-indigo-200 bg-slate-100", boxClass)}>
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

function MechanicTechnicianAssignedRequest() {
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(mechanicTechnicianSidebarOpenState)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileMenuRef = useRef(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [actionError, setActionError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  // Start Job (Working) Proof Dialog State
  const [confirmWorkingBooking, setConfirmWorkingBooking] = useState(null)
  const [workingProofPhotos, setWorkingProofPhotos] = useState([])
  const [workingProofError, setWorkingProofError] = useState('')

  // Completion Handover Proof Dialog State
  const [confirmCompletedBooking, setConfirmCompletedBooking] = useState(null)
  const [completionProofPhotos, setCompletionProofPhotos] = useState([])
  const [completionNotes, setCompletionNotes] = useState('')
  const [completionProofError, setCompletionProofError] = useState('')

  // Service Fee Dialog State
  const [feeBooking, setFeeBooking] = useState(null)
  const [feeDialogError, setFeeDialogError] = useState('')
  const [receiptBooking, setReceiptBooking] = useState(null)

  // Warranty Claim Review State
  const [reviewClaimBooking, setReviewClaimBooking] = useState(null)
  const [claimAction, setClaimAction] = useState('approve')
  const [approvedRefundAmount, setApprovedRefundAmount] = useState('')
  const [refundProofImage, setRefundProofImage] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [claimRejectionReason, setClaimRejectionReason] = useState('')
  const [isSubmittingClaimReview, setIsSubmittingClaimReview] = useState(false)
  const [claimReviewError, setClaimReviewError] = useState('')

  // Start Re-repair Working Dialog State
  const [confirmRefixWorkingBooking, setConfirmRefixWorkingBooking] = useState(null)
  const [refixWorkingProofPhotos, setRefixWorkingProofPhotos] = useState([])
  const [refixWorkingProofError, setRefixWorkingProofError] = useState('')
  const [refixWorkingNotes, setRefixWorkingNotes] = useState('')
  const [isSubmittingRefixWorking, setIsSubmittingRefixWorking] = useState(false)

  // Confirm Mark as Fixed State (Regular Service)
  const [confirmMarkFixedBooking, setConfirmMarkFixedBooking] = useState(null)
  const [isSubmittingMarkFixed, setIsSubmittingMarkFixed] = useState(false)

  // Confirm Mark Re-repair Fixed State
  const [confirmRefixFixedBooking, setConfirmRefixFixedBooking] = useState(null)
  const [refixFixedNotes, setRefixFixedNotes] = useState('')
  const [isSubmittingRefixFixed, setIsSubmittingRefixFixed] = useState(false)

  // Confirm Complete & Release Refix State
  const [confirmRefixResolvedBooking, setConfirmRefixResolvedBooking] = useState(null)
  const [refixResolvedNotes, setRefixResolvedNotes] = useState('')
  const [refixResolvedProofPhotos, setRefixResolvedProofPhotos] = useState([])
  const [refixResolvedProofError, setRefixResolvedProofError] = useState('')
  const [isSubmittingRefixResolved, setIsSubmittingRefixResolved] = useState(false)

  /** Default All so jobs stay visible */
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState('schedule')
  const [q, setQ] = useState('')

  const loadBookings = useCallback(async () => {
    setListError('')
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/mechanic/bookings`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || 'Could not load bookings.')
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

  const patchTechnicianBooking = useCallback(
    async (bookingId, action, extraBody = {}) => {
      setActionError('')
      setUpdatingId(bookingId)
      try {
        const res = await fetch(`${API_URL}/api/mechanic/bookings/${encodeURIComponent(bookingId)}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify({ action, ...extraBody }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.message || 'Could not update booking.')
        }
        const mapped = mapBookingFromApi(data?.booking)
        if (mapped) {
          setBookings((prev) => prev.map((x) => (x.id === mapped.id ? mapped : x)))
        } else {
          await loadBookings()
        }
        return true
      } catch (e) {
        setActionError(e?.message || 'Could not update booking.')
        return false
      } finally {
        setUpdatingId(null)
      }
    },
    [loadBookings],
  )

  const patchTechnicianServiceFee = useCallback(
    async (bookingId, body) => {
      setFeeDialogError('')
      setActionError('')
      setUpdatingId(bookingId)
      try {
        const res = await fetch(`${API_URL}/api/mechanic/bookings/${encodeURIComponent(bookingId)}/service-fee`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify(body),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.message || 'Could not save service fee.')
        }
        const mapped = mapBookingFromApi(data?.booking)
        if (mapped) {
          setBookings((prev) => prev.map((x) => (x.id === mapped.id ? mapped : x)))
        } else {
          await loadBookings()
        }
        setFeeBooking(null)
        return true
      } catch (e) {
        setFeeDialogError(e?.message || 'Could not save service fee.')
        return false
      } finally {
        setUpdatingId(null)
      }
    },
    [loadBookings],
  )

  const handleWorkingProofFiles = async (e) => {
    setWorkingProofError('')
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    e.target.value = ''

    const remainingSlots = 5 - workingProofPhotos.length
    if (remainingSlots <= 0) {
      setWorkingProofError('Maximum of 5 picture proofs reached.')
      return
    }

    const toProcess = files.slice(0, remainingSlots)
    const validPhotos = []

    for (const file of toProcess) {
      if (!file.type.startsWith('image/')) {
        setWorkingProofError('Only image files (JPG, PNG, WEBP) are allowed.')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setWorkingProofError('Each picture proof must be 5MB or less.')
        return
      }
      try {
        const dataUrl = await fileToDataUrl(file)
        if (dataUrl) validPhotos.push(dataUrl)
      } catch {
        setWorkingProofError('Failed to read selected image.')
        return
      }
    }

    setWorkingProofPhotos((prev) => [...prev, ...validPhotos])
  }

  const removeWorkingProofPhoto = (index) => {
    setWorkingProofPhotos((prev) => prev.filter((_, idx) => idx !== index))
    setWorkingProofError('')
  }

  const confirmStartWorking = async () => {
    if (!confirmWorkingBooking) return
    if (!workingProofPhotos || workingProofPhotos.length === 0) {
      setWorkingProofError('Please upload at least 1 picture proof before starting the job.')
      return
    }
    const ok = await patchTechnicianBooking(confirmWorkingBooking.id, 'working', {
      startJobProofPhotos: workingProofPhotos,
    })
    if (ok) {
      setConfirmWorkingBooking(null)
      setWorkingProofPhotos([])
      setWorkingProofError('')
    }
  }

  const handleCompletionProofFiles = async (e) => {
    setCompletionProofError('')
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    e.target.value = ''

    const remainingSlots = 5 - completionProofPhotos.length
    if (remainingSlots <= 0) {
      setCompletionProofError('Maximum of 5 photos reached.')
      return
    }

    const toProcess = files.slice(0, remainingSlots)
    const validPhotos = []

    for (const file of toProcess) {
      if (!file.type.startsWith('image/')) {
        setCompletionProofError('Only image files (JPG, PNG, WEBP) are allowed.')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setCompletionProofError('Each photo proof must be 5MB or less.')
        return
      }
      try {
        const dataUrl = await fileToDataUrl(file)
        if (dataUrl) validPhotos.push(dataUrl)
      } catch {
        setCompletionProofError('Failed to read selected image.')
        return
      }
    }

    setCompletionProofPhotos((prev) => [...prev, ...validPhotos])
  }

  const removeCompletionProofPhoto = (index) => {
    setCompletionProofPhotos((prev) => prev.filter((_, idx) => idx !== index))
    setCompletionProofError('')
  }

  const confirmFinishCompleted = async () => {
    if (!confirmCompletedBooking) return
    if (!completionProofPhotos || completionProofPhotos.length === 0) {
      setCompletionProofError('Please upload at least 1 photo proof confirming the item handover / release.')
      return
    }
    const ok = await patchTechnicianBooking(confirmCompletedBooking.id, 'completed', {
      completionProofPhotos,
      completionNotes: completionNotes.trim(),
    })
    if (ok) {
      setConfirmCompletedBooking(null)
      setCompletionProofPhotos([])
      setCompletionNotes('')
      setCompletionProofError('')
    }
  }

  const openClaimReviewDialog = (b) => {
    setReviewClaimBooking(b)
    setClaimAction('approve')
    setApprovedRefundAmount(String(b.warrantyClaim?.requestedAmount || b.serviceFeeLaborRateAtCalc || 0))
    setRefundProofImage('')
    setResolutionNotes('')
    setClaimRejectionReason('')
    setClaimReviewError('')
  }

  const handleResolveWarrantyClaim = async () => {
    if (!reviewClaimBooking) return
    setClaimReviewError('')
    if (claimAction === 'reject') {
      if (!claimRejectionReason.trim() || claimRejectionReason.trim().length < 5) {
        setClaimReviewError('Please provide a reason for declining the warranty claim (at least 5 characters).')
        return
      }
    }
    setIsSubmittingClaimReview(true)
    try {
      const res = await fetch(`${API_URL}/api/mechanic/bookings/${reviewClaimBooking.id}/warranty-claim`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          action: claimAction === 'reject' ? 'rejected' : 'approved',
          rejectionReason: claimAction === 'reject' ? claimRejectionReason : '',
          approvedAmount:
            claimAction === 'approve' && reviewClaimBooking.warrantyClaim?.claimType === 'refund'
              ? Number(approvedRefundAmount || 0)
              : 0,
          refundProofImage: claimAction === 'approve' ? refundProofImage : '',
          resolutionNotes,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Failed to update warranty claim.')
      if (data?.booking) {
        const mapped = mapBookingFromApi(data.booking)
        setBookings((prev) => prev.map((item) => (item.id === mapped.id ? mapped : item)))
      } else {
        await loadBookings()
      }
      setReviewClaimBooking(null)
      toast.success(claimAction === 'reject' ? 'Warranty Refix request has been declined.' : 'Warranty Refix request approved successfully!')
    } catch (e) {
      setClaimReviewError(e?.message || 'Failed to update warranty claim.')
    } finally {
      setIsSubmittingClaimReview(false)
    }
  }

  const handleQuickRefixTransition = async (bookingId, nextAction) => {
    setActionError('')
    setUpdatingId(bookingId)
    try {
      const res = await fetch(`${API_URL}/api/mechanic/bookings/${encodeURIComponent(bookingId)}/warranty-claim`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ action: nextAction }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Failed to update warranty refix status.')
      if (data?.booking) {
        const mapped = mapBookingFromApi(data.booking)
        setBookings((prev) => prev.map((item) => (item.id === mapped.id ? mapped : item)))
      } else {
        await loadBookings()
      }
    } catch (e) {
      setActionError(e?.message || 'Failed to update refix status.')
    } finally {
      setUpdatingId(null)
    }
  }

  const openStartRefixWorkingDialog = (b) => {
    setConfirmRefixWorkingBooking(b)
    setRefixWorkingProofPhotos([])
    setRefixWorkingProofError('')
    setRefixWorkingNotes('')
  }

  const handleRefixWorkingProofFiles = async (e) => {
    setRefixWorkingProofError('')
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    e.target.value = ''

    const remainingSlots = 5 - refixWorkingProofPhotos.length
    if (remainingSlots <= 0) {
      setRefixWorkingProofError('Maximum of 5 picture proofs reached.')
      return
    }

    const toProcess = files.slice(0, remainingSlots)
    const validPhotos = []

    for (const file of toProcess) {
      if (!file.type.startsWith('image/')) {
        setRefixWorkingProofError('Only image files (JPG, PNG, WEBP) are allowed.')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setRefixWorkingProofError('Each picture proof must be 5MB or less.')
        return
      }
      try {
        const dataUrl = await fileToDataUrl(file)
        if (dataUrl) validPhotos.push(dataUrl)
      } catch {
        setRefixWorkingProofError('Failed to read selected image.')
        return
      }
    }

    setRefixWorkingProofPhotos((prev) => [...prev, ...validPhotos])
  }

  const removeRefixWorkingProofPhoto = (index) => {
    setRefixWorkingProofPhotos((prev) => prev.filter((_, idx) => idx !== index))
    setRefixWorkingProofError('')
  }

  const confirmStartRefixWorking = async () => {
    if (!confirmRefixWorkingBooking) return
    if (!refixWorkingProofPhotos || refixWorkingProofPhotos.length === 0) {
      setRefixWorkingProofError('Please upload at least 1 picture proof before starting the re-repair.')
      return
    }
    setIsSubmittingRefixWorking(true)
    try {
      const res = await fetch(`${API_URL}/api/mechanic/bookings/${confirmRefixWorkingBooking.id}/warranty-claim`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'working',
          startJobProofPhotos: refixWorkingProofPhotos,
          resolutionNotes: refixWorkingNotes,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Failed to start warranty re-repair.')
      if (data?.booking) {
        const mapped = mapBookingFromApi(data.booking)
        setBookings((prev) => prev.map((item) => (item.id === mapped.id ? mapped : item)))
      } else {
        await loadBookings()
      }
      setConfirmRefixWorkingBooking(null)
      setRefixWorkingProofPhotos([])
      setRefixWorkingProofError('')
      setRefixWorkingNotes('')
      toast.success('Warranty re-repair started successfully! Picture proof recorded.')
    } catch (e) {
      setRefixWorkingProofError(e?.message || 'Failed to start warranty re-repair.')
    } finally {
      setIsSubmittingRefixWorking(false)
    }
  }

  const openConfirmMarkFixedDialog = (b) => {
    setConfirmMarkFixedBooking(b)
  }

  const confirmSubmitMarkFixed = async () => {
    if (!confirmMarkFixedBooking) return
    try {
      setIsSubmittingMarkFixed(true)
      await patchTechnicianBooking(confirmMarkFixedBooking.id, 'fixed')
      setConfirmMarkFixedBooking(null)
    } finally {
      setIsSubmittingMarkFixed(false)
    }
  }

  const openConfirmRefixFixedDialog = (b) => {
    setConfirmRefixFixedBooking(b)
    setRefixFixedNotes('')
  }

  const confirmSubmitRefixFixed = async () => {
    if (!confirmRefixFixedBooking) return
    try {
      setIsSubmittingRefixFixed(true)
      const res = await fetch(`${API_URL}/api/mechanic/bookings/${confirmRefixFixedBooking.id}/warranty-claim`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'fixed',
          resolutionNotes: refixFixedNotes.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Failed to update warranty refix status.')

      toast.success('Re-repair marked as Fixed & Tested!')
      setConfirmRefixFixedBooking(null)
      if (data?.booking) {
        const mapped = mapBookingFromApi(data.booking)
        setBookings((prev) => prev.map((item) => (item.id === mapped.id ? mapped : item)))
      } else {
        await loadBookings()
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to update refix status.')
    } finally {
      setIsSubmittingRefixFixed(false)
    }
  }

  const openConfirmRefixResolvedDialog = (b) => {
    setConfirmRefixResolvedBooking(b)
    setRefixResolvedNotes('')
    setRefixResolvedProofPhotos([])
    setRefixResolvedProofError('')
  }

  const handleRefixResolvedProofFiles = async (e) => {
    setRefixResolvedProofError('')
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    e.target.value = ''

    const remainingSlots = 5 - refixResolvedProofPhotos.length
    if (remainingSlots <= 0) {
      setRefixResolvedProofError('Maximum of 5 handover photos reached.')
      return
    }

    const validPhotos = []
    for (const file of files.slice(0, remainingSlots)) {
      if (!file.type.startsWith('image/')) {
        setRefixResolvedProofError('Please upload image files only (PNG, JPG, WEBP).')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setRefixResolvedProofError('Each photo must be 5MB or smaller.')
        return
      }
      try {
        const dataUrl = await fileToDataUrl(file)
        if (dataUrl) validPhotos.push(dataUrl)
      } catch {
        setRefixResolvedProofError('Failed to read selected image.')
        return
      }
    }

    setRefixResolvedProofPhotos((prev) => [...prev, ...validPhotos])
  }

  const removeRefixResolvedProofPhoto = (index) => {
    setRefixResolvedProofPhotos((prev) => prev.filter((_, idx) => idx !== index))
    setRefixResolvedProofError('')
  }

  const confirmSubmitRefixResolved = async () => {
    if (!confirmRefixResolvedBooking) return
    try {
      setIsSubmittingRefixResolved(true)
      const res = await fetch(`${API_URL}/api/mechanic/bookings/${confirmRefixResolvedBooking.id}/warranty-claim`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          action: 'resolved',
          resolutionNotes: refixResolvedNotes.trim(),
          completionProofPhotos: refixResolvedProofPhotos,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Failed to complete warranty rework.')

      toast.success('Warranty rework resolved & completed!')
      setConfirmRefixResolvedBooking(null)
      if (data?.booking) {
        const mapped = mapBookingFromApi(data.booking)
        setBookings((prev) => prev.map((item) => (item.id === mapped.id ? mapped : item)))
      } else {
        await loadBookings()
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to complete refix.')
    } finally {
      setIsSubmittingRefixResolved(false)
    }
  }

  useEffect(() => {
    const raw = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!token || !raw) {
      window.location.hash = '#/login'
      return
    }
    try {
      const parsed = JSON.parse(raw)
      if (parsed.role !== 'mechanic-technician') {
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
    void loadBookings()
  }, [user, loadBookings])

  useEffect(() => {
    mechanicTechnicianSidebarOpenState = sidebarOpen
  }, [sidebarOpen])

  useEffect(() => {
    if (!profileOpen) return

    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [profileOpen])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.hash = '#/'
  }

  const { requestLogout, LogoutDialog } = useLogoutConfirmation(handleLogout)

  const counts = useMemo(() => {
    const base = { pending: 0, confirmed: 0, working: 0, fixed: 0, completed: 0 }
    for (const b of bookings) {
      const st = String(b.status)
      if (st in base) base[st] += 1
    }
    return base
  }, [bookings])

  const filtered = useMemo(() => {
    let list = bookings
    if (['pending', 'confirmed', 'working', 'fixed', 'completed', 'cancelled'].includes(statusFilter)) {
      list = list.filter((b) => b.status === statusFilter)
    }
    const query = q.trim().toLowerCase()
    if (query) {
      list = list.filter((b) => {
        const hay = [
          b.ref,
          b.contactName,
          b.contactPhone,
          b.problemDescription,
          b.notes,
          b.shopService?.name,
          b.shopService?.category,
          b.serviceName,
          b.serviceCategory,
          b.shopName,
          b.customer?.fullName,
          b.customer?.email,
          b.customer?.phone,
          b.rejectionReason,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(query) || hay.split(/\s+/).some((w) => w.startsWith(query))
      })
    }
    const out = [...list]
    if (sortBy === 'newest') {
      out.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    } else if (sortBy === 'oldest') {
      out.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
    } else if (sortBy === 'schedule') {
      out.sort((a, b) => {
        const da = preferredDateSortValue(a)
        const db = preferredDateSortValue(b)
        if (da !== db) return da - db
        return String(a.preferredTime || '').localeCompare(String(b.preferredTime || ''))
      })
    }
    return out
  }, [bookings, statusFilter, sortBy, q])

  if (!user) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="h-svh max-h-svh min-h-0 w-full overflow-hidden" style={{ backgroundImage: pageBaseNavyGradient }}>
      <TooltipProvider delayDuration={0}>
        <SidebarProvider
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          className="h-svh max-h-svh min-h-0 w-full max-w-full overflow-hidden bg-transparent"
          style={{ '--sidebar': 'transparent', '--sidebar-width': '17.5rem', '--sidebar-width-icon': '3.35rem' }}
        >
          <Sidebar
            collapsible="icon"
            variant="inset"
            className="border-r-0"
            onMouseEnter={() => setSidebarOpen(true)}
            onMouseLeave={() => setSidebarOpen(false)}
          >
            <SidebarHeader className="gap-2 border-b border-sidebar-border/80 py-2 px-3">
              <div className="flex items-center gap-3 md:group-data-[collapsible=icon]:justify-center md:group-data-[collapsible=icon]:gap-0">
                <img
                  src={Elogo}
                  alt="E-Paayos icon"
                  className="h-14 w-14 min-h-14 min-w-14 -mt-1 flex-none object-contain"
                  decoding="async"
                />
                <div className="grid min-w-0 flex-1 text-left leading-tight md:group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-xl font-bold tracking-wide text-white">E-Paayos</span>
                </div>
              </div>
            </SidebarHeader>

            <SidebarContent className="gap-0 px-2 py-4">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-2.5">
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip="Dashboard"
                        onClick={() => {
                          window.location.hash = '#/mechanic/technician/dashboard'
                        }}
                        className={sidebarMenuButtonClass}
                      >
                        <LayoutDashboard className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Dashboard</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive
                        tooltip="Assigned Request"
                        onClick={() => {
                          window.location.hash = '#/mechanic/technician/assigned-request'
                        }}
                        className={sidebarMenuButtonClass}
                      >
                        <ClipboardList className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Assigned Request</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip="Service History"
                        onClick={() => {
                          window.location.hash = '#/mechanic/technician/service-history'
                        }}
                        className={sidebarMenuButtonClass}
                      >
                        <History className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Service History</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip="Messages"
                        onClick={() => {
                          window.location.hash = '#/mechanic/technician/messages'
                        }}
                        className={sidebarMenuButtonClass}
                      >
                        <MessageSquare className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Messages</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip="Work Info"
                        onClick={() => {
                          window.location.hash = '#/mechanic/technician/work-info'
                        }}
                        className={sidebarMenuButtonClass}
                      >
                        <Briefcase className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Work Info</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarSeparator className="mx-0 bg-sidebar-border/80" />

            <SidebarFooter className="gap-2 px-3 py-2 group-data-[collapsible=icon]:items-center">
              <div className="flex items-center gap-2 overflow-hidden rounded-sm border border-white/15 bg-white/10 px-2.5 py-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-1">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#081F5C]">
                  {(user.fullName || user.email || 'M').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-[11px] font-normal uppercase tracking-wide text-white/80">Mechanic / Technician</p>
                  <p className="truncate text-[11px] text-white/75">{user.email}</p>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-linear-to-br from-blue-50 via-violet-100 to-indigo-100 dark:from-slate-900 dark:via-violet-950/40 dark:to-indigo-950/50">
            <MechanicTopBar
              title={ASSIGNED_REQUEST_META.title}
              description={ASSIGNED_REQUEST_META.description}
              user={user}
              profileOpen={profileOpen}
              setProfileOpen={setProfileOpen}
              profileMenuRef={profileMenuRef}
              requestLogout={requestLogout}
            />

            <div
              id="mechanic-main-scroll"
              className="scrollbar-hidden flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:p-4 md:p-6"
            >
              <div className="w-full min-w-0 max-w-full space-y-3.5 sm:space-y-4">
                {listError ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    <span>{listError}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => void loadBookings()}>
                      Retry
                    </Button>
                  </div>
                ) : null}
                {actionError ? (
                  <div className="rounded-sm border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm text-amber-950 dark:text-amber-100">
                    {actionError}
                  </div>
                ) : null}

                {/* 2 columns on mobile, 5 columns on desktop */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-5">
                  <StatGradientCard
                    variant="pending"
                    label="Booking Submitted"
                    value={counts.pending}
                    helper="Awaiting shop confirmation"
                    icon={CalendarClock}
                  />
                  <StatGradientCard
                    variant="confirmed"
                    label="Booking Confirmed"
                    value={counts.confirmed}
                    helper="Accepted, ready to start"
                    icon={CalendarCheck}
                  />
                  <StatGradientCard
                    variant="working"
                    label="Working"
                    value={counts.working}
                    helper="In progress / calculating fee"
                    icon={Wrench}
                  />
                  <StatGradientCard
                    variant="completed"
                    label="Fixed"
                    value={counts.fixed}
                    helper="Fixed / Awaiting pay"
                    icon={CheckCircle}
                  />
                  <StatGradientCard
                    className="col-span-2 sm:col-span-1 lg:col-span-1"
                    variant="total"
                    label="Completed"
                    value={counts.completed}
                    helper="Finished and paid jobs"
                    icon={ClipboardList}
                  />
                </div>

                <div className="mb-1 flex min-w-0 max-w-full flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap lg:flex-nowrap gap-2 sm:gap-3 w-full min-w-0 max-w-full flex-1">
                    <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[140px] sm:flex-1 sm:max-w-[200px]">
                      <select
                        className={`${selectShell} text-neutral-900 dark:text-neutral-100`}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="">All statuses</option>
                        <option value="pending">Booking Submitted</option>
                        <option value="confirmed">Booking Confirmed</option>
                        <option value="working">Working</option>
                        <option value="fixed">Fixed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <Clock className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    </div>

                    <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[220px]">
                      <select className={`${selectShell} text-neutral-900 dark:text-neutral-100`} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="schedule">Sort: Preferred date</option>
                        <option value="newest">Sort: Newest request</option>
                        <option value="oldest">Sort: Oldest request</option>
                      </select>
                      <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                    </div>
                  </div>

                  <div className="relative h-9 w-full min-w-0 shrink-0 lg:w-[320px]">
                    <Input
                      className="h-9 w-full rounded-sm border-[#081F5C]/15 bg-white/95 pr-12 pl-4 text-xs sm:text-sm shadow-sm focus-visible:border-[#1447a6]/45 focus-visible:ring-[#081F5C]/15 dark:border-white/10 dark:bg-[#04133d]/25"
                      placeholder="Search name, phone, service, shop, notes…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      aria-label="Search assigned requests"
                    />
                    <Button
                      type="button"
                      size="icon-sm"
                      className="pointer-events-none absolute top-1/2 right-1.5 z-10 h-7 w-7 -translate-y-1/2 rounded-sm bg-linear-to-r from-[#081F5C] to-[#1447a6] p-0 shadow-sm"
                      aria-hidden
                      tabIndex={-1}
                    >
                      <Search className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                </div>

                <div className="mt-2 min-w-0 max-w-full space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[#081F5C] dark:text-slate-50">Bookings on your assigned services</p>
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground sm:text-[13px]">
                        {filtered.length} result{filtered.length === 1 ? '' : 's'}
                        {statusFilter ? ` · ${statusFilter}` : ''}
                        {statusFilter === 'confirmed'
                          ? ' · same data after the shop owner taps Confirm in Service requests'
                          : statusFilter === ''
                            ? ' · use filters to focus on one status'
                            : null}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={() => void loadBookings()}
                      className="h-9 shrink-0 gap-1.5 rounded-sm border-[#081F5C]/15 bg-white/80 px-3 text-sm text-[#081F5C] shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-blue-100"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
                      Refresh
                    </Button>
                  </div>

                  {loading ? (
                    <div className="flex min-h-[160px] flex-col items-center justify-center rounded-sm border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm dark:border-white/15 dark:bg-[#020818]">
                      <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#081F5C]/70" aria-hidden />
                      <p className="text-base font-medium text-foreground">Loading bookings…</p>
                      <p className="mt-1 max-w-md text-sm text-muted-foreground">Fetching requests from the server.</p>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex min-h-[140px] flex-col items-center justify-center rounded-sm border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm dark:border-white/15 dark:bg-[#020818]">
                      <Store className="mx-auto h-10 w-10 text-muted-foreground/45" aria-hidden />
                      <p className="mt-3 text-base font-medium text-foreground">No bookings found</p>
                      <p className="mt-1 max-w-md text-sm text-muted-foreground">
                        {statusFilter === 'confirmed'
                          ? 'Nothing confirmed yet. When the shop owner confirms a customer booking for a service you are assigned on, it will show here.'
                          : 'Try another status filter or search, or wait for customers to book your shop’s listings.'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filtered.map((b) => {
                        const CategoryIcon = b.shopService ? categoryIcon(b.shopService.category) : categoryIcon(b.serviceCategory)
                        const busy = updatingId === b.id
                        const hasPin =
                          typeof b.serviceLatitude === 'number' &&
                          Number.isFinite(b.serviceLatitude) &&
                          typeof b.serviceLongitude === 'number' &&
                          Number.isFinite(b.serviceLongitude)

                        return (
                          <article
                            key={b.id}
                            className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-3 sm:p-4 space-y-2.5 sm:space-y-3 rounded-none"
                          >
                            {/* Top Bar Header */}
                            <div className="flex flex-wrap items-start sm:items-center justify-between gap-2.5 sm:gap-3 pb-2 border-b border-slate-100">
                              <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                                <div className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-none bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 mt-0.5 sm:mt-0">
                                  <CategoryIcon className="size-4 sm:size-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                    <span className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                                      {b.shopService?.name || b.serviceName || 'Service Request'}
                                    </span>
                                    <span className="text-[10px] sm:text-[11px] font-semibold bg-slate-100 text-slate-700 px-1.5 sm:px-2 py-0.5 rounded-none border border-slate-200 inline-flex items-center gap-1">
                                      <Tag className="size-3 text-indigo-600 shrink-0" />
                                      Ref: {b.ref || b.id}
                                    </span>
                                    <span className="text-[10px] sm:text-[11px] font-bold bg-indigo-50 text-indigo-800 px-1.5 sm:px-2 py-0.5 rounded-none border border-indigo-200 inline-flex items-center gap-1">
                                      <User className="size-3 text-indigo-600 shrink-0" />
                                      {b.contactName || 'Customer'}
                                    </span>
                                    {b.shopName ? (
                                      <span className="text-[10px] sm:text-[11px] font-medium bg-slate-100 text-slate-600 px-1.5 sm:px-2 py-0.5 rounded-none border border-slate-200 inline-flex items-center gap-1">
                                        <Store className="size-3 text-slate-500 shrink-0" />
                                        {b.shopName}
                                      </span>
                                    ) : null}
                                  </div>
                                  <span className="text-[10px] sm:text-[11px] text-slate-500 block mt-0.5">
                                    Submitted {formatSubmittedLine(b.createdAt)}
                                  </span>
                                </div>
                              </div>

                              {/* Status Pill Badge */}
                              <div className="shrink-0 self-start sm:self-center">
                                {bookingStatusBadge(b.status, b)}
                              </div>
                            </div>

                            {/* Customer Info, Schedule & Location, Fee & Staff Summary 3-Column Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-3 text-xs sm:text-sm">
                              {/* 1. Customer Details */}
                              <div className="bg-slate-50/80 p-3 sm:p-3.5 border border-slate-200 space-y-2 rounded-none flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between pb-1">
                                    <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] sm:text-xs flex items-center gap-1.5">
                                      <User className="size-3.5 sm:size-4 text-indigo-600" />
                                      <span>Customer Info</span>
                                    </span>
                                    {b.contactPhone && (
                                      <a
                                        href={`tel:${b.contactPhone}`}
                                        className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] sm:text-xs font-bold rounded-none shadow-2xs transition-colors"
                                      >
                                        <Phone className="size-3" />
                                        <span>Call</span>
                                      </a>
                                    )}
                                  </div>

                                  <div className="space-y-1 sm:space-y-1.5 text-xs pt-1">
                                    <p className="text-slate-900 font-bold text-xs sm:text-sm">{b.contactName || '—'}</p>
                                    {b.contactPhone && (
                                      <p className="text-slate-700 font-mono text-[11px] sm:text-xs flex items-center gap-1.5 pt-0.5">
                                        <Phone className="size-3.5 text-slate-400" />
                                        <span>{b.contactPhone}</span>
                                      </p>
                                    )}
                                    {b.customer?.fullName && b.customer.fullName.trim() !== b.contactName?.trim() && (
                                      <p className="text-slate-600 font-medium text-[10px] sm:text-[11px]">
                                        Account: {b.customer.fullName} {b.customer.email ? `(${b.customer.email})` : ''}
                                      </p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                      <Badge className={cn("rounded-none text-[10px] uppercase font-bold", categoryBadgeClass(b.shopService?.category || b.serviceCategory))}>
                                        {b.shopService?.category || b.serviceCategory || 'Service'}
                                      </Badge>
                                      {serviceModeBadge(b.serviceMode)}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 2. Schedule & Address Details */}
                              <div className="bg-slate-50/80 p-3 sm:p-3.5 border border-slate-200 space-y-2 rounded-none flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between pb-1">
                                    <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] sm:text-xs flex items-center gap-1.5">
                                      <Calendar className="size-3.5 sm:size-4 text-indigo-600" />
                                      <span>Schedule & Location</span>
                                    </span>
                                  </div>

                                  <div className="space-y-1.5 sm:space-y-2 text-xs pt-1">
                                    <div>
                                      <span className="text-slate-500 font-medium block text-[11px] sm:text-xs">Preferred Schedule:</span>
                                      <p className="font-bold text-slate-900 text-[11px] sm:text-xs mt-0.5 flex items-center gap-1">
                                        <Clock className="size-3.5 text-indigo-600 shrink-0" />
                                        <span>{formatPreferredDate(b.preferredDate)} • {formatTime12h(b.preferredTime)}</span>
                                      </p>
                                    </div>

                                    {b.serviceMode === 'home' && b.serviceAddress ? (
                                      <div>
                                        <span className="text-slate-500 font-medium block text-[11px] sm:text-xs">Service Address:</span>
                                        <p className="text-slate-700 flex items-start gap-1 mt-0.5 leading-relaxed text-[11px] sm:text-xs">
                                          <MapPin className="size-3.5 text-rose-500 shrink-0 mt-0.5" />
                                          <span>{b.serviceAddress}</span>
                                        </p>
                                        {hasPin && (
                                          <a
                                            href={`https://www.google.com/maps?q=${b.serviceLatitude},${b.serviceLongitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline mt-1"
                                          >
                                            <MapPin className="size-3" />
                                            <span>Open in Google Maps</span>
                                          </a>
                                        )}
                                      </div>
                                    ) : (
                                      <div>
                                        <span className="text-slate-500 font-medium block text-[11px] sm:text-xs">Service Location:</span>
                                        <p className="text-slate-700 flex items-center gap-1 mt-0.5 text-[11px] sm:text-xs">
                                          <Store className="size-3.5 text-slate-400 shrink-0" />
                                          <span>In-Shop Service</span>
                                        </p>
                                      </div>
                                    )}

                                    {b.problemDescription && (
                                      <div className="pt-0.5 border-t border-slate-200/80 mt-1">
                                        <span className="text-slate-500 font-medium block text-[11px]">Issue Description:</span>
                                        <p className="text-slate-700 line-clamp-2 italic text-[11px] mt-0.5">"{b.problemDescription}"</p>
                                      </div>
                                    )}

                                    {b.notes?.trim() && (
                                      <div className="pt-0.5 border-t border-slate-200/80 mt-1">
                                        <span className="text-slate-500 font-medium block text-[11px]">Additional Notes:</span>
                                        <p className="text-slate-700 line-clamp-2 italic text-[11px] mt-0.5">"{b.notes.trim()}"</p>
                                      </div>
                                    )}

                                    {Array.isArray(b.issuePhotos) && b.issuePhotos.length > 0 && (
                                      <div className="pt-1 border-t border-slate-200/80 mt-1">
                                        <span className="text-slate-500 font-medium block text-[11px] mb-1 flex items-center gap-1">
                                          <ImageIcon className="size-3 text-indigo-600 shrink-0" />
                                          <span>Uploaded Photos ({b.issuePhotos.length}):</span>
                                        </span>
                                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                          {b.issuePhotos.map((src, photoIndex) => (
                                            <IssuePhotoThumb key={photoIndex} src={src} label={`Issue ${photoIndex + 1}`} size="sm" />
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* 3. Fee & Service Quote Summary */}
                              <div className="bg-slate-50/80 p-3 sm:p-3.5 border border-slate-200 space-y-2 rounded-none flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between pb-1">
                                    <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] sm:text-xs flex items-center gap-1.5">
                                      <DollarSign className="size-3.5 sm:size-4 text-indigo-600" />
                                      <span>Fee Summary</span>
                                    </span>
                                    <span
                                      className={cn(
                                        "px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold uppercase rounded-none border",
                                        b.serviceFeeConfirmedAt
                                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                          : "bg-amber-100 text-amber-800 border-amber-300"
                                      )}
                                    >
                                      {b.serviceFeeConfirmedAt ? "Fee Set" : "Quote Pending"}
                                    </span>
                                  </div>

                                  <div className="space-y-1 sm:space-y-1.5 text-xs pt-1">
                                    <div className="flex justify-between items-center text-slate-600 text-[11px] sm:text-xs">
                                      <span>Labor Rate / Fee:</span>
                                      <span className="font-semibold text-slate-800">
                                        {b.serviceFeeLaborRateAtCalc != null ? formatPhp(b.serviceFeeLaborRateAtCalc) : "TBD"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-600 text-[11px] sm:text-xs">
                                      <span>Materials & Parts:</span>
                                      <span className="font-semibold text-slate-800">
                                        {b.serviceFeeMaterialsAmount != null ? formatPhp(b.serviceFeeMaterialsAmount) : "TBD"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center pt-1 font-bold">
                                      <span className="text-slate-900 text-[11px] sm:text-xs">Total Fee:</span>
                                      <span className="font-black text-indigo-700 text-sm sm:text-base">
                                        {(b.serviceFeeLaborRateAtCalc != null || b.serviceFeeMaterialsAmount != null)
                                          ? formatPhp((b.serviceFeeLaborRateAtCalc || 0) + (b.serviceFeeMaterialsAmount || 0))
                                          : "Awaiting Quote"}
                                      </span>
                                    </div>

                                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/80 text-[11px] sm:text-xs">
                                      <span className="text-slate-600">Customer Payment:</span>
                                      {b.paymentStatus === 'paid' ? (
                                        <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 border border-emerald-300">
                                          <CheckCircle2 className="size-3 text-emerald-600" />
                                          <span>Paid ({b.paymentMethod === 'cash_on_service' ? 'Cash' : b.paymentMethod?.toUpperCase() || 'Paid'})</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 border border-amber-300">
                                          <Clock className="size-3 text-amber-600" />
                                          <span>Unpaid</span>
                                        </span>
                                      )}
                                    </div>

                                    {b.paymentStatus === 'paid' || b.paymentProofImage ? (
                                      <div className="pt-1 flex items-center justify-between text-[11px] sm:text-xs">
                                        <span className="text-slate-600">Official Receipt:</span>
                                        <button
                                          type="button"
                                          onClick={() => setReceiptBooking(b)}
                                          className="text-indigo-600 hover:text-indigo-800 font-bold underline text-[11px] inline-flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                                        >
                                          <FileText className="size-3 text-indigo-600" />
                                          <span>View Receipt</span>
                                        </button>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>

                                {/* Assigned Mechanic / Technician info at bottom part of Column 3 */}
                                {b.assignedTechnicianName?.trim() ? (
                                  <div className="mt-2.5 pt-2 border-t border-slate-200 bg-white p-2 border border-slate-100 shadow-2xs">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                                        <Wrench className="size-3 text-indigo-600 shrink-0" />
                                        <span>Assigned {b.shopService?.category?.toLowerCase() === 'vehicle' || b.serviceCategory?.toLowerCase() === 'vehicle' ? 'Mechanic' : 'Technician'}</span>
                                      </span>
                                      <Badge variant="outline" className="rounded-none border-sky-300 bg-sky-50 text-[9px] font-extrabold uppercase text-sky-700 px-1.5 py-0">
                                        Assigned
                                      </Badge>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between gap-1 text-[11px] sm:text-xs">
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bold text-slate-900 truncate">{b.assignedTechnicianName}</p>
                                        <p className="text-[10px] text-slate-500 truncate">
                                          {formatAssignedRole(b.assignedTechnicianJobTitle, b.shopService?.category || b.serviceCategory)}
                                        </p>
                                      </div>
                                      {b.assignedTechnicianPhone?.trim() ? (
                                        <a
                                          href={`tel:${b.assignedTechnicianPhone.trim()}`}
                                          className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 shadow-2xs"
                                          title={`Call ${b.assignedTechnicianName}`}
                                        >
                                          <Phone className="size-2.5 sm:size-3 text-indigo-600" />
                                          <span>{b.assignedTechnicianPhone.trim()}</span>
                                        </a>
                                      ) : null}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            {/* Proof Media Row: Picture Proof of Work Started (Left) & Item Handover & Completion Proof (Right) */}
                            {((Array.isArray(b.startJobProofPhotos) && b.startJobProofPhotos.length > 0) ||
                              (Array.isArray(b.completionProofPhotos) && b.completionProofPhotos.length > 0) ||
                              b.completionNotes?.trim()) && (
                              <div
                                className={cn(
                                  'grid gap-2.5',
                                  Array.isArray(b.startJobProofPhotos) &&
                                    b.startJobProofPhotos.length > 0 &&
                                    ((Array.isArray(b.completionProofPhotos) && b.completionProofPhotos.length > 0) || b.completionNotes?.trim())
                                    ? 'grid-cols-1 md:grid-cols-2'
                                    : 'grid-cols-1'
                                )}
                              >
                                {/* Left Column: Picture Proof of Work Started */}
                                {Array.isArray(b.startJobProofPhotos) && b.startJobProofPhotos.length > 0 ? (
                                  <div className="bg-purple-50/60 border border-purple-200 p-2.5 sm:p-3 text-xs space-y-1.5 rounded-none flex flex-col justify-between">
                                    <div>
                                      <span className="font-bold text-purple-900 flex items-center gap-1.5 text-[11px] sm:text-xs">
                                        <Camera className="size-3.5 sm:size-4 text-purple-600" />
                                        Picture Proof of Work Started ({b.startJobProofPhotos.length})
                                      </span>
                                      <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                                        {b.startJobProofPhotos.map((src, photoIndex) => (
                                          <IssuePhotoThumb key={photoIndex} src={src} label={`Work Proof ${photoIndex + 1}`} size="sm" />
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ) : null}

                                {/* Right Column: Item Handover & Completion Proof */}
                                {((Array.isArray(b.completionProofPhotos) && b.completionProofPhotos.length > 0) || b.completionNotes?.trim()) ? (
                                  <div className="bg-emerald-50/70 border border-emerald-200 p-2.5 sm:p-3 text-xs space-y-1.5 rounded-none flex flex-col justify-between">
                                    <div>
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <span className="font-bold text-emerald-900 flex items-center gap-1.5 text-[11px] sm:text-xs">
                                          <CheckCircle2 className="size-3.5 sm:size-4 text-emerald-600" />
                                          Item Handover & Completion Proof ({b.completionProofPhotos?.length || 0})
                                        </span>
                                      </div>
                                      {Array.isArray(b.completionProofPhotos) && b.completionProofPhotos.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                          {b.completionProofPhotos.map((src, photoIndex) => (
                                            <IssuePhotoThumb key={photoIndex} src={src} label={`Handover Proof ${photoIndex + 1}`} size="sm" />
                                          ))}
                                        </div>
                                      )}
                                      {b.completionNotes?.trim() && (
                                        <p className="text-emerald-900/90 italic text-[11px] sm:text-xs mt-1">
                                          "{b.completionNotes.trim()}"
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            )}

                            {/* Rejection Note */}
                            {b.status === 'cancelled' && b.rejectionReason?.trim() && (
                              <div className="bg-rose-50 border border-rose-200 p-2.5 sm:p-3 text-[11px] sm:text-xs space-y-1">
                                <span className="font-bold text-rose-900 block">Rejection Reason:</span>
                                <p className="text-rose-700">{b.rejectionReason.trim()}</p>
                              </div>
                            )}

                            {/* Warranty Claim Notification Banner */}
                            {b.warrantyClaim && b.warrantyClaim.status !== 'none' && (
                              <div className={cn(
                                'p-3 sm:p-3.5 border rounded-none text-xs space-y-2',
                                b.warrantyClaim.status === 'pending' && 'bg-amber-50/90 border-amber-300',
                                b.warrantyClaim.status === 'approved' && 'bg-indigo-50/90 border-indigo-300',
                                (b.warrantyClaim.status === 'working' || b.warrantyClaim.status === 'in_progress') && 'bg-purple-50/90 border-purple-300',
                                b.warrantyClaim.status === 'fixed' && 'bg-emerald-50/90 border-emerald-300',
                                (b.warrantyClaim.status === 'resolved' || b.warrantyClaim.status === 'completed') && 'bg-teal-50/90 border-teal-300',
                                b.warrantyClaim.status === 'rejected' && 'bg-rose-50/90 border-rose-300'
                              )}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                  <div className="flex items-start gap-2">
                                    <span className={cn(
                                      'size-6 shrink-0 rounded-none flex items-center justify-center font-bold text-white text-xs',
                                      b.warrantyClaim.status === 'pending' ? 'bg-amber-600' : (b.warrantyClaim.status === 'approved' ? 'bg-indigo-600' : (b.warrantyClaim.status === 'working' ? 'bg-purple-600' : (b.warrantyClaim.status === 'fixed' ? 'bg-emerald-600' : (b.warrantyClaim.status === 'rejected' ? 'bg-rose-600' : 'bg-teal-600'))))
                                    )}>
                                      {b.warrantyClaim.status === 'pending' ? '!' : '✓'}
                                    </span>
                                    <div>
                                      <div className="font-black text-slate-900 text-xs sm:text-sm">
                                        {b.warrantyClaim.claimType === 'refund' ? '💰 Warranty Refund Request' : '🔧 Free Warranty Refix / Re-repair'}
                                      </div>
                                      <div className="text-[11px] text-slate-600 mt-0.5">
                                        Status: <strong className="capitalize font-bold text-slate-800">
                                          {b.warrantyClaim.status === 'pending' ? 'Awaiting Review' : (b.warrantyClaim.status === 'approved' ? 'Refix Approved' : (b.warrantyClaim.status === 'working' ? 'Re-repairing' : (b.warrantyClaim.status === 'fixed' ? 'Refix Fixed' : (b.warrantyClaim.status === 'resolved' ? 'Refix Completed' : 'Declined'))))}
                                        </strong> • Reason: {b.warrantyClaim.reason}
                                      </div>
                                      {b.warrantyClaim.details && (
                                        <p className="text-[11px] text-slate-700 italic mt-0.5 line-clamp-2">
                                          "{b.warrantyClaim.details}"
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                    {b.warrantyClaim.status === 'pending' && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => openClaimReviewDialog(b)}
                                        className="rounded-none bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-3 cursor-pointer shadow-2xs"
                                      >
                                        Review &amp; Respond
                                      </Button>
                                    )}

                                    {b.warrantyClaim.status === 'approved' && (b.warrantyClaim.claimType === 'labor_rework' || !b.warrantyClaim.claimType) && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        disabled={busy}
                                        onClick={() => openStartRefixWorkingDialog(b)}
                                        className="rounded-none bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-8 px-3 cursor-pointer shadow-2xs inline-flex items-center gap-1"
                                      >
                                        <Wrench className="size-3.5" />
                                        <span>Start Re-repair</span>
                                      </Button>
                                    )}

                                    {(b.warrantyClaim.status === 'working' || b.warrantyClaim.status === 'in_progress') && (b.warrantyClaim.claimType === 'labor_rework' || !b.warrantyClaim.claimType) && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        disabled={busy}
                                        onClick={() => openConfirmRefixFixedDialog(b)}
                                        className="rounded-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 cursor-pointer shadow-2xs inline-flex items-center gap-1"
                                      >
                                        <CheckCircle2 className="size-3.5" />
                                        <span>Mark Re-repair Fixed</span>
                                      </Button>
                                    )}

                                    {b.warrantyClaim.status === 'fixed' && (b.warrantyClaim.claimType === 'labor_rework' || !b.warrantyClaim.claimType) && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        disabled={busy}
                                        onClick={() => openConfirmRefixResolvedDialog(b)}
                                        className="rounded-none bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-8 px-3 cursor-pointer shadow-2xs inline-flex items-center gap-1"
                                      >
                                        <CheckCircle className="size-3.5" />
                                        <span>Complete &amp; Release</span>
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Action Controls Footer */}
                            <div className="pt-2 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 w-full border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => {
                                  window.location.hash = '#/mechanic/technician/messages'
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] sm:text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer"
                              >
                                <MessageSquare className="size-3.5 text-slate-500" />
                                <span>Messages</span>
                              </button>

                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                {b.status === 'confirmed' && (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => {
                                      setWorkingProofPhotos([])
                                      setWorkingProofError('')
                                      setConfirmWorkingBooking({
                                        id: b.id,
                                        contactName: b.contactName || 'Customer',
                                        serviceName: b.shopService?.name || b.serviceName || 'Service',
                                      })
                                    }}
                                    className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 px-4 py-2 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white text-[11px] sm:text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Wrench className="size-3.5 shrink-0" />}
                                    <span>Start Job (Working)</span>
                                  </button>
                                )}

                                {b.status === 'working' && (
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 w-full sm:w-auto">
                                    <span className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 border border-slate-300 text-[11px] sm:text-xs font-bold rounded-none">
                                      <Wrench className="size-3.5 opacity-70 shrink-0" />
                                      <span>Working</span>
                                    </span>
                                    {!b.serviceFeeConfirmedAt ? (
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => {
                                          setFeeDialogError('')
                                          setFeeBooking(b)
                                        }}
                                        className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 px-4 py-2 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] sm:text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                      >
                                        <DollarSign className="size-3.5 shrink-0" />
                                        <span>Calculate Service Fee</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={busy}
                                        onClick={() => openConfirmMarkFixedDialog(b)}
                                        className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 px-4 py-2 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                      >
                                        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5 shrink-0" />}
                                        <span>Mark as Fixed</span>
                                      </button>
                                    )}
                                  </div>
                                )}

                                {b.status === 'fixed' && (
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 w-full sm:w-auto">
                                    {b.paymentStatus === 'paid' ? (
                                      <>
                                        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-800 border border-emerald-300 text-[11px] sm:text-xs font-bold rounded-none">
                                          <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                                          <span>Fixed (Customer Paid)</span>
                                        </span>
                                        <button
                                          type="button"
                                          disabled={busy}
                                          onClick={() => {
                                            setCompletionProofError('')
                                            setCompletionProofPhotos([])
                                            setCompletionNotes('')
                                            setConfirmCompletedBooking(b)
                                          }}
                                          className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 px-4 py-2 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-bold rounded-none shadow-md shadow-emerald-900/20 transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5 shrink-0" />}
                                          <span>Mark as Paid (Completed)</span>
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <span className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-800 border border-amber-300 text-[11px] sm:text-xs font-bold rounded-none">
                                          <Clock className="size-3.5 text-amber-600 shrink-0" />
                                          <span>Fixed (Awaiting Customer Payment)</span>
                                        </span>
                                        <button
                                          type="button"
                                          disabled
                                          className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 px-4 py-2 sm:py-2 bg-slate-200 text-slate-400 border border-slate-300 text-[11px] sm:text-xs font-bold rounded-none shadow-2xs cursor-not-allowed opacity-75"
                                          title="Customer must pay first before marking as Paid (Completed)"
                                        >
                                          <CheckCircle2 className="size-3.5 text-slate-400 shrink-0" />
                                          <span>Mark as Paid (Completed)</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}

                                {b.status === 'completed' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      try {
                                        sessionStorage.setItem('epaayosMechanicHistoryFocusBookingId', b.id)
                                      } catch { }
                                      window.location.hash = '#/mechanic/technician/service-history'
                                    }}
                                    className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] sm:text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer"
                                  >
                                    <History className="size-3.5" />
                                    <span>Service History</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>

      {/* Service Fee Calculation Modal */}
      <ServiceFeeCalculateDialog
        open={Boolean(feeBooking)}
        onOpenChange={(open) => {
          if (!open) {
            setFeeBooking(null)
            setFeeDialogError('')
          }
        }}
        customerName={feeBooking?.contactName || 'Customer'}
        initialLaborPrice={feeBooking?.serviceFeeLaborRateAtCalc ?? null}
        initialReplacementParts={feeBooking?.serviceFeeReplacementParts || []}
        isSubmitting={Boolean(feeBooking) && updatingId === feeBooking.id}
        error={feeDialogError}
        onSave={(payload) => {
          if (!feeBooking) return
          void patchTechnicianServiceFee(feeBooking.id, payload)
        }}
      />

      {/* Start Job (Working) Dialog with Required Picture Proof */}
      <Dialog
        open={!!confirmWorkingBooking}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmWorkingBooking(null)
            setWorkingProofPhotos([])
            setWorkingProofError('')
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-[calc(100vw-1.5rem)] flex-col gap-3 overflow-hidden sm:max-w-lg rounded-none border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl" showCloseButton>
          <DialogHeader className="shrink-0 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center bg-purple-100 text-purple-700 shrink-0">
                <Wrench className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base sm:text-lg font-black text-slate-900 leading-tight">Start Service Job</DialogTitle>
                <DialogDescription className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                  Begin work for <span className="font-bold text-slate-900">{confirmWorkingBooking?.contactName}</span> ({confirmWorkingBooking?.serviceName || 'Service'})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-3 text-xs sm:text-sm">
            {/* Confirmation Note */}
            <div className="rounded-none border border-purple-200 bg-purple-50/70 p-2.5 sm:p-3 text-xs text-purple-950">
              <p className="font-bold">Mark status as "Working"</p>
              <p className="mt-0.5 text-purple-900/85 leading-relaxed text-[11px]">
                Service is actively in progress. Please upload at least 1 picture proof of the initial condition before starting work.
              </p>
            </div>

            {/* Picture Proof Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Camera className="size-3.5 text-purple-600 shrink-0" />
                  <span>Picture Proof of Work Started <span className="text-rose-500">*</span></span>
                </Label>
                <span className="text-[11px] font-semibold text-slate-500">
                  {workingProofPhotos.length} / 5 photos
                </span>
              </div>

              {/* Upload Dropzone Button */}
              <label
                htmlFor="working-proof-upload"
                className={cn(
                  "flex items-center justify-between gap-2.5 border-2 border-dashed p-3 cursor-pointer transition-colors rounded-none",
                  workingProofPhotos.length >= 5
                    ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                    : "border-purple-300 bg-purple-50/30 hover:bg-purple-50/60 hover:border-purple-500"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-8 shrink-0 items-center justify-center bg-purple-100 text-purple-700">
                    <Upload className="size-4" />
                  </div>
                  <div className="text-left min-w-0">
                    <span className="text-xs font-bold text-purple-950 block truncate">
                      Click to upload picture proof
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      PNG, JPG, WEBP up to 5MB (Max 5)
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-purple-700 bg-purple-100/80 px-2.5 py-1 border border-purple-300 shrink-0">
                  Browse
                </span>
                <input
                  id="working-proof-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={workingProofPhotos.length >= 5}
                  className="sr-only"
                  onChange={handleWorkingProofFiles}
                />
              </label>

              {/* Image Previews */}
              {workingProofPhotos.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-bold text-slate-700 block">Uploaded Proof:</span>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {workingProofPhotos.map((dataUrl, idx) => (
                      <div key={idx} className="group relative aspect-square border border-slate-200 bg-slate-100 overflow-hidden shadow-2xs">
                        <img
                          src={dataUrl}
                          alt={`Proof ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeWorkingProofPhoto(idx)}
                          className="absolute top-1 right-1 size-4.5 bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xs cursor-pointer"
                          title="Remove image"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {workingProofError && (
                <div className="rounded-none border border-rose-200 bg-rose-50 p-2 text-xs font-bold text-rose-700 flex items-center gap-2">
                  <XCircle className="size-4 shrink-0 text-rose-600" />
                  <span>{workingProofError}</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row gap-2 border-t border-slate-100 pt-3 sm:justify-end w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmWorkingBooking(null)
                setWorkingProofPhotos([])
                setWorkingProofError('')
              }}
              className="w-full sm:w-auto justify-center rounded-none border-slate-300 text-xs font-bold px-4 py-2 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto justify-center rounded-none bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-5 py-2 shadow-md shadow-purple-900/20 cursor-pointer disabled:opacity-50"
              disabled={!confirmWorkingBooking || updatingId === confirmWorkingBooking?.id}
              onClick={() => void confirmStartWorking()}
            >
              {confirmWorkingBooking && updatingId === confirmWorkingBooking.id ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden />
                  Starting Job…
                </>
              ) : (
                'Start Job (Working)'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid & Complete Service Job (Item Handover Proof) Dialog */}
      <Dialog
        open={!!confirmCompletedBooking}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmCompletedBooking(null)
            setCompletionProofPhotos([])
            setCompletionNotes('')
            setCompletionProofError('')
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-[calc(100vw-1.5rem)] flex-col gap-3 overflow-hidden sm:max-w-lg rounded-none border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl" showCloseButton>
          <DialogHeader className="shrink-0 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center bg-emerald-100 text-emerald-700 shrink-0">
                <CheckCircle2 className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Mark as Paid & Completed
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                  Handover proof for <span className="font-bold text-slate-900">{confirmCompletedBooking?.contactName}</span> ({confirmCompletedBooking?.shopService?.name || confirmCompletedBooking?.serviceName || 'Service'})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-3 text-xs sm:text-sm">
            {/* Payment & Turnover Summary Note */}
            <div className="rounded-none border border-emerald-200 bg-emerald-50/80 p-2.5 sm:p-3 text-xs text-emerald-950 space-y-1">
              <div className="flex items-center justify-between">
                <p className="font-bold flex items-center gap-1.5 text-emerald-900 text-xs">
                  <DollarSign className="size-3.5 text-emerald-600 shrink-0" />
                  <span>Customer Payment Confirmed</span>
                </p>
                <span className="text-[10px] font-extrabold uppercase bg-emerald-600 text-white px-1.5 py-0.5">
                  Paid
                </span>
              </div>
              <p className="text-emerald-900/85 leading-relaxed text-[11px]">
                Please attach at least 1 photo of the item handover / release (e.g. customer receiving the item or finished product turnover) to complete this service request.
              </p>
            </div>

            {/* Handover / Completion Photo Proof Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Camera className="size-3.5 text-emerald-600 shrink-0" />
                  <span>Item Handover Photo Proof <span className="text-rose-500">*</span></span>
                </Label>
                <span className="text-[11px] font-semibold text-slate-500">
                  {completionProofPhotos.length} / 5 photos
                </span>
              </div>

              {/* Upload Dropzone Button */}
              <label
                htmlFor="completion-proof-upload"
                className={cn(
                  "flex items-center justify-between gap-2.5 border-2 border-dashed p-3 cursor-pointer transition-colors rounded-none",
                  completionProofPhotos.length >= 5
                    ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                    : "border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/60 hover:border-emerald-500"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-8 shrink-0 items-center justify-center bg-emerald-100 text-emerald-700">
                    <Upload className="size-4" />
                  </div>
                  <div className="text-left min-w-0">
                    <span className="text-xs font-bold text-emerald-950 block truncate">
                      Click to upload handover photo proof
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      PNG, JPG, WEBP up to 5MB (Max 5)
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-1 border border-emerald-300 shrink-0">
                  Browse
                </span>
                <input
                  id="completion-proof-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={completionProofPhotos.length >= 5}
                  className="sr-only"
                  onChange={handleCompletionProofFiles}
                />
              </label>

              {/* Image Previews */}
              {completionProofPhotos.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-bold text-slate-700 block">Uploaded Photos:</span>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {completionProofPhotos.map((dataUrl, idx) => (
                      <div key={idx} className="group relative aspect-square border border-slate-200 bg-slate-100 overflow-hidden shadow-2xs">
                        <img
                          src={dataUrl}
                          alt={`Handover Proof ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeCompletionProofPhoto(idx)}
                          className="absolute top-1 right-1 size-4.5 bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xs cursor-pointer"
                          title="Remove image"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {completionProofError && (
                <div className="rounded-none border border-rose-200 bg-rose-50 p-2 text-xs font-bold text-rose-700 flex items-center gap-2">
                  <XCircle className="size-4 shrink-0 text-rose-600" />
                  <span>{completionProofError}</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row gap-2 border-t border-slate-100 pt-3 sm:justify-end w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmCompletedBooking(null)
                setCompletionProofPhotos([])
                setCompletionNotes('')
                setCompletionProofError('')
              }}
              className="w-full sm:w-auto justify-center rounded-none border-slate-300 text-xs font-bold px-4 py-2 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!confirmCompletedBooking || updatingId === confirmCompletedBooking?.id}
              onClick={() => void confirmFinishCompleted()}
              className="w-full sm:w-auto justify-center rounded-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2 shadow-md shadow-emerald-900/20 cursor-pointer disabled:opacity-50"
            >
              {confirmCompletedBooking && updatingId === confirmCompletedBooking.id ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden />
                  Completing…
                </>
              ) : (
                'Confirm & Mark Completed'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Official Service E-Receipt Dialog */}
      <ServiceReceiptDialog
        open={Boolean(receiptBooking)}
        onOpenChange={(open) => {
          if (!open) setReceiptBooking(null)
        }}
        booking={receiptBooking}
      />

      {/* Warranty Claim Review & Decision Dialog */}
      <Dialog open={Boolean(reviewClaimBooking)} onOpenChange={(open) => !open && setReviewClaimBooking(null)}>
        <DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col gap-0 overflow-hidden sm:max-w-xl rounded-none p-0 border border-slate-300" showCloseButton>
          <div className="bg-gradient-to-r from-[#081F5C] to-[#123B9B] px-4 sm:px-6 py-4 text-white shrink-0">
            <div className="flex items-center gap-2">
              <RotateCcw className="size-5 text-purple-300 shrink-0" />
              <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-white">
                Warranty Claim Review &amp; Response
              </DialogTitle>
            </div>
            <DialogDescription className="text-slate-200 text-xs mt-1">
              Booking Ref: {reviewClaimBooking?.ref || reviewClaimBooking?.id} • Customer: {reviewClaimBooking?.contactName}
            </DialogDescription>
          </div>

          {reviewClaimBooking && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              {/* Warranty Policy Reminder */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                <div className="flex items-center justify-between font-extrabold text-xs text-emerald-950">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
                    <span>Warranty Labor Policy:</span>
                  </span>
                  <span className="bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-bold">
                    ₱0 Labor Fee (Waived)
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-800">
                  Under warranty coverage, approved re-repair labor is 100% free of charge to the customer (Original labor: {formatPhp(reviewClaimBooking.serviceFeeLaborRateAtCalc || 0)}).
                </p>
              </div>

              {/* Customer Claim Information Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                  <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <FileText className="size-3.5 text-indigo-600" />
                    <span>Claim Request Details</span>
                  </span>
                  <Badge
                    className={cn(
                      'text-[10px] font-bold uppercase rounded-none px-2 py-0.5',
                      reviewClaimBooking.warrantyClaim?.status === 'pending' && 'bg-amber-100 text-amber-900 border-amber-300',
                      reviewClaimBooking.warrantyClaim?.status === 'approved' && 'bg-emerald-100 text-emerald-900 border-emerald-300',
                      reviewClaimBooking.warrantyClaim?.status === 'rejected' && 'bg-rose-100 text-rose-900 border-rose-300',
                      reviewClaimBooking.warrantyClaim?.status === 'resolved' && 'bg-teal-100 text-teal-900 border-teal-300'
                    )}
                  >
                    {reviewClaimBooking.warrantyClaim?.status || 'pending'}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-semibold">Reason:</span>
                    <span className="font-bold text-slate-900 bg-white px-2 py-0.5 border border-slate-200">
                      {reviewClaimBooking.warrantyClaim?.reason || 'Warranty Issue'}
                    </span>
                  </div>

                  {reviewClaimBooking.warrantyClaim?.details && (
                    <div className="mt-2 space-y-1">
                      <span className="text-slate-500 font-semibold block text-[11px]">Customer Observations:</span>
                      <p className="text-slate-800 italic bg-white p-2.5 border border-slate-200 leading-relaxed">
                        "{reviewClaimBooking.warrantyClaim.details}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Proof Media (Photos & Videos) */}
                {Array.isArray(reviewClaimBooking.warrantyClaim?.proofPhotos) && reviewClaimBooking.warrantyClaim.proofPhotos.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                    <span className="text-[11px] font-extrabold text-slate-700 block">
                      Customer Proof Media ({reviewClaimBooking.warrantyClaim.proofPhotos.length} file{reviewClaimBooking.warrantyClaim.proofPhotos.length > 1 ? 's' : ''}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {reviewClaimBooking.warrantyClaim.proofPhotos.map((p, idx) => {
                        const isVid = typeof p === 'string' && (p.startsWith('data:video') || p.includes('.mp4') || p.includes('.webm') || p.includes('.mov'))
                        return (
                          <a
                            key={idx}
                            href={p}
                            target="_blank"
                            rel="noreferrer"
                            className="block relative size-16 border border-slate-300 bg-slate-900 overflow-hidden hover:opacity-85 shadow-2xs group"
                            title="Click to view full media"
                          >
                            {isVid ? (
                              <>
                                <video src={p} className="size-full object-cover opacity-80" muted playsInline />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white font-bold text-[9px] gap-0.5">
                                  <Film className="size-3" />
                                  <span>Video</span>
                                </div>
                              </>
                            ) : (
                              <img src={p} alt={`Claim proof ${idx + 1}`} className="size-full object-cover" />
                            )}
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Provider Decision Controls */}
              {reviewClaimBooking.warrantyClaim?.status === 'pending' ? (
                <div className="space-y-3 pt-1">
                  <Label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                    Your Response / Decision:
                  </Label>

                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setClaimAction('approve')}
                      className={cn(
                        'p-3 border text-left flex items-center justify-center gap-2 font-bold transition-all cursor-pointer shadow-2xs',
                        claimAction === 'approve'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-600'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <CheckCircle2 className="size-4.5 text-emerald-600" />
                      <span>Approve Claim</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setClaimAction('reject')}
                      className={cn(
                        'p-3 border text-left flex items-center justify-center gap-2 font-bold transition-all cursor-pointer shadow-2xs',
                        claimAction === 'reject'
                          ? 'border-rose-600 bg-rose-50 text-rose-950 ring-2 ring-rose-600'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <XCircle className="size-4.5 text-rose-600" />
                      <span>Decline Claim</span>
                    </button>
                  </div>

                  {claimAction === 'approve' ? (
                    <div className="space-y-3 p-3.5 bg-emerald-50/50 border border-emerald-200">
                      <div>
                        <Label className="text-[11px] font-bold text-slate-800 block mb-1">
                          Resolution Note &amp; Re-repair Arrangement:
                        </Label>
                        <Textarea
                          rows={2}
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="e.g. We will inspect and fix the unit at ₱0 labor fee..."
                          className="rounded-none border-slate-300 text-xs bg-white focus:border-emerald-600 leading-relaxed"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 p-3.5 bg-rose-50/60 border border-rose-200">
                      <Label className="text-[11px] font-bold text-rose-950 block">
                        Reason for Declining Claim <span className="text-rose-600">*</span>:
                      </Label>
                      <Textarea
                        rows={3}
                        value={claimRejectionReason}
                        onChange={(e) => setClaimRejectionReason(e.target.value)}
                        placeholder="e.g. The issue was caused by unauthorized tampering not covered by warranty..."
                        className="rounded-none border-rose-300 text-xs bg-white focus:border-rose-600 leading-relaxed"
                      />
                      <p className="text-[10px] text-slate-500">Minimum 5 characters ({claimRejectionReason.trim().length}/5).</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-slate-100 border border-slate-200 space-y-1 text-slate-700">
                  <span className="font-bold text-slate-900 block text-xs">Claim Outcome Summary:</span>
                  <p>
                    Status: <strong className="capitalize text-slate-900">{reviewClaimBooking.warrantyClaim?.status}</strong>
                  </p>
                  {reviewClaimBooking.warrantyClaim?.resolutionNotes && (
                    <p className="italic text-slate-600">Note: "{reviewClaimBooking.warrantyClaim.resolutionNotes}"</p>
                  )}
                </div>
              )}

              {claimReviewError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 text-rose-600 shrink-0" />
                  <span>{claimReviewError}</span>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-none border-slate-300 text-xs font-bold hover:bg-white cursor-pointer"
              onClick={() => setReviewClaimBooking(null)}
              disabled={isSubmittingClaimReview}
            >
              Close
            </Button>
            {reviewClaimBooking?.warrantyClaim?.status === 'pending' && (
              <Button
                type="button"
                className={cn(
                  'rounded-none text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50',
                  claimAction === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                )}
                disabled={isSubmittingClaimReview}
                onClick={() => void handleResolveWarrantyClaim()}
              >
                {isSubmittingClaimReview ? (
                  <>
                    <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : claimAction === 'approve' ? (
                  'Confirm & Approve'
                ) : (
                  'Confirm & Decline'
                )}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Start Re-repair under Warranty (Picture Proof Upload) Dialog */}
      <Dialog
        open={!!confirmRefixWorkingBooking}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmRefixWorkingBooking(null)
            setRefixWorkingProofPhotos([])
            setRefixWorkingProofError('')
            setRefixWorkingNotes('')
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-[calc(100vw-1.5rem)] flex-col gap-3 overflow-hidden sm:max-w-lg rounded-none border border-slate-200 bg-white p-4 sm:p-5 shadow-2xl" showCloseButton>
          <DialogHeader className="shrink-0 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center bg-purple-100 text-purple-700 shrink-0">
                <Wrench className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Start Warranty Re-repair
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-slate-500 mt-0.5 truncate">
                  Rework for <span className="font-bold text-slate-900">{confirmRefixWorkingBooking?.contactName}</span> ({confirmRefixWorkingBooking?.serviceName || 'Service'})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-3.5 text-xs sm:text-sm">
            {/* Warranty Rework Notice Banner */}
            <div className="rounded-none border border-purple-200 bg-purple-50/80 p-3 text-xs text-purple-950 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold flex items-center gap-1.5 text-purple-900">
                  <ShieldCheck className="size-4 text-purple-600" />
                  <span>Free Warranty Rework (₱0 Labor)</span>
                </span>
                <Badge className="bg-purple-600 text-white text-[10px] font-bold rounded-none">
                  Refix in Progress
                </Badge>
              </div>
              <p className="text-purple-900/85 leading-relaxed text-[11px]">
                Please upload at least 1 clear photo proving the item received / rework started. The status will update to "Re-repairing" and notify the customer.
              </p>
            </div>

            {/* Customer Complaint Recap */}
            {confirmRefixWorkingBooking?.warrantyClaim?.reason && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 space-y-1 text-xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Reported Issue:</span>
                <p className="font-bold text-slate-900">
                  {confirmRefixWorkingBooking.warrantyClaim.reason}
                </p>
                {confirmRefixWorkingBooking.warrantyClaim.details && (
                  <p className="text-slate-600 text-[11px] italic mt-0.5">
                    "{confirmRefixWorkingBooking.warrantyClaim.details}"
                  </p>
                )}
              </div>
            )}

            {/* Re-repair Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Diagnostic & Work Notes (Optional)
              </Label>
              <Input
                value={refixWorkingNotes}
                onChange={(e) => setRefixWorkingNotes(e.target.value)}
                placeholder="e.g. Disassembling unit to check motor brushes / replace component..."
                className="rounded-none text-xs"
              />
            </div>

            {/* Picture Proof Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Camera className="size-3.5 text-purple-600 shrink-0" />
                  <span>Picture Proof of Work Started <span className="text-rose-500">*</span></span>
                </Label>
                <span className="text-[11px] font-semibold text-slate-500">
                  {refixWorkingProofPhotos.length} / 5 photos
                </span>
              </div>

              {/* Upload Dropzone */}
              <label
                htmlFor="mech-refix-working-proof-upload"
                className={cn(
                  "flex items-center justify-between gap-2.5 border-2 border-dashed p-3 cursor-pointer transition-colors rounded-none",
                  refixWorkingProofPhotos.length >= 5
                    ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                    : "border-purple-300 bg-purple-50/30 hover:bg-purple-50/60 hover:border-purple-500"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-8 shrink-0 items-center justify-center bg-purple-100 text-purple-700">
                    <Upload className="size-4" />
                  </div>
                  <div className="text-left min-w-0">
                    <span className="text-xs font-bold text-purple-950 block truncate">
                      Click to upload re-repair start photo
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      PNG, JPG, WEBP up to 5MB (Max 5)
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-purple-700 bg-purple-100/80 px-2.5 py-1 border border-purple-300 shrink-0">
                  Browse
                </span>
                <input
                  id="mech-refix-working-proof-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={refixWorkingProofPhotos.length >= 5}
                  className="sr-only"
                  onChange={handleRefixWorkingProofFiles}
                />
              </label>

              {/* Image Previews */}
              {refixWorkingProofPhotos.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[11px] font-bold text-slate-700 block">Uploaded Photos:</span>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {refixWorkingProofPhotos.map((dataUrl, idx) => (
                      <div key={idx} className="group relative aspect-square border border-slate-200 bg-slate-100 overflow-hidden shadow-2xs">
                        <img
                          src={dataUrl}
                          alt={`Refix Proof ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeRefixWorkingProofPhoto(idx)}
                          className="absolute top-1 right-1 size-4.5 bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xs cursor-pointer"
                          title="Remove image"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {refixWorkingProofError && (
                <div className="rounded-none border border-rose-200 bg-rose-50 p-2 text-xs font-bold text-rose-700 flex items-center gap-2">
                  <XCircle className="size-4 shrink-0 text-rose-600" />
                  <span>{refixWorkingProofError}</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row gap-2 border-t border-slate-100 pt-3 sm:justify-end w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmRefixWorkingBooking(null)
                setRefixWorkingProofPhotos([])
                setRefixWorkingProofError('')
                setRefixWorkingNotes('')
              }}
              className="w-full sm:w-auto justify-center rounded-none border-slate-300 text-xs font-bold px-4 py-2 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!confirmRefixWorkingBooking || isSubmittingRefixWorking}
              onClick={() => void confirmStartRefixWorking()}
              className="w-full sm:w-auto justify-center rounded-none bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-5 py-2 shadow-md shadow-purple-900/20 cursor-pointer disabled:opacity-50"
            >
              {isSubmittingRefixWorking ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden />
                  Starting Re-repair…
                </>
              ) : (
                'Start Re-repair (Working)'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Mark Service as Fixed Dialog (Regular Service) */}
      <Dialog
        open={!!confirmMarkFixedBooking}
        onOpenChange={(open) => {
          if (!open) setConfirmMarkFixedBooking(null)
        }}
      >
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-none p-5 shadow-2xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-9 bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-slate-900">
                  Confirm Mark as Fixed
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Booking #{confirmMarkFixedBooking?.ref || confirmMarkFixedBooking?.id?.slice(-6)} • {confirmMarkFixedBooking?.contactName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="my-2 space-y-3 text-xs">
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-1">
              <span className="font-bold block">Service Completion Verification</span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Are you sure you want to mark this repair work as <strong className="text-emerald-900">Fixed</strong>? This will notify the customer that testing is complete and the item is ready for handover / payment.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Service:</span>
                <span className="font-bold text-slate-900">{confirmMarkFixedBooking?.serviceName || confirmMarkFixedBooking?.shopService?.name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Fee:</span>
                <span className="font-extrabold text-emerald-700">{formatPhp(confirmMarkFixedBooking?.serviceFeeLaborRateAtCalc || 0)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmMarkFixedBooking(null)}
              disabled={isSubmittingMarkFixed}
              className="rounded-none text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void confirmSubmitMarkFixed()}
              disabled={isSubmittingMarkFixed}
              className="rounded-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              {isSubmittingMarkFixed ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Updating…
                </>
              ) : (
                'Yes, Mark as Fixed'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Mark Re-repair Fixed & Tested Dialog */}
      <Dialog
        open={!!confirmRefixFixedBooking}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmRefixFixedBooking(null)
            setRefixFixedNotes('')
          }
        }}
      >
        <DialogContent className="max-w-md bg-white border border-slate-200 rounded-none p-5 shadow-2xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="size-9 bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-slate-900">
                  Mark Re-repair Fixed &amp; Tested
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Booking #{confirmRefixFixedBooking?.ref || confirmRefixFixedBooking?.id?.slice(-6)} • {confirmRefixFixedBooking?.contactName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="my-2 space-y-3 text-xs">
            <div className="p-3 bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-emerald-900">
                <ShieldCheck className="size-4 text-emerald-600" />
                <span>Warranty Rework Verification</span>
              </span>
              <p className="text-emerald-950/85 text-[11px] leading-relaxed">
                Confirm that the reported issue has been diagnosed, repaired, and verified through testing. Under warranty, this labor is 100% free of charge.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">
                Testing Notes &amp; Observations (Optional)
              </Label>
              <Textarea
                rows={3}
                value={refixFixedNotes}
                onChange={(e) => setRefixFixedNotes(e.target.value)}
                placeholder="e.g. Completed rework and load-tested for 30 minutes. Operational parameters normal..."
                className="rounded-none text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmRefixFixedBooking(null)
                setRefixFixedNotes('')
              }}
              disabled={isSubmittingRefixFixed}
              className="rounded-none text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void confirmSubmitRefixFixed()}
              disabled={isSubmittingRefixFixed}
              className="rounded-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              {isSubmittingRefixFixed ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Updating…
                </>
              ) : (
                'Confirm Re-repair Fixed'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Release & Complete Re-repair Dialog */}
      <Dialog
        open={!!confirmRefixResolvedBooking}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmRefixResolvedBooking(null)
            setRefixResolvedNotes('')
            setRefixResolvedProofPhotos([])
            setRefixResolvedProofError('')
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[85vh] flex flex-col bg-white border border-slate-200 rounded-none p-4 sm:p-5 shadow-2xl overflow-hidden" showCloseButton>
          <DialogHeader className="border-b border-slate-100 pb-2.5 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="size-9 bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <CheckCircle className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Release &amp; Complete Warranty Rework
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5 truncate">
                  Booking #{confirmRefixResolvedBooking?.ref || confirmRefixResolvedBooking?.id?.slice(-6)} • <span className="font-bold text-slate-800">{confirmRefixResolvedBooking?.contactName}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1 my-1 space-y-3 text-xs">
            <div className="p-2.5 bg-teal-50/90 border border-teal-200 text-teal-950 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-extrabold flex items-center gap-1.5 text-teal-900 text-xs">
                  <ShieldCheck className="size-4 text-teal-600 shrink-0" />
                  <span>Turnover &amp; Final Warranty Release</span>
                </span>
                <Badge className="bg-teal-600 text-white text-[10px] font-bold rounded-none">
                  ₱0 Labor
                </Badge>
              </div>
              <p className="text-teal-950/85 text-[11px] leading-relaxed">
                Confirm that the re-repaired unit has been released back to the customer. This will finalize the rework request under the Free Labor Guarantee.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-800">
                Handover / Resolution Remarks (Optional)
              </Label>
              <Textarea
                rows={2}
                value={refixResolvedNotes}
                onChange={(e) => setRefixResolvedNotes(e.target.value)}
                placeholder="e.g. Unit tested and handed over to customer in good working order."
                className="rounded-none text-xs"
              />
            </div>

            {/* Optional Handover Proof Upload */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Camera className="size-3.5 text-teal-600 shrink-0" />
                  <span>Turnover / Handover Photo Proof (Optional)</span>
                </Label>
                <span className="text-[11px] font-semibold text-slate-500">
                  {refixResolvedProofPhotos.length} / 5 photos
                </span>
              </div>

              <label
                htmlFor="tech-refix-resolved-proof-upload"
                className={cn(
                  "flex items-center justify-between gap-2.5 border-2 border-dashed p-2.5 cursor-pointer transition-colors rounded-none",
                  refixResolvedProofPhotos.length >= 5
                    ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                    : "border-teal-300 bg-teal-50/30 hover:bg-teal-50/60 hover:border-teal-500"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-7 shrink-0 items-center justify-center bg-teal-100 text-teal-700">
                    <Upload className="size-3.5" />
                  </div>
                  <div className="text-left min-w-0">
                    <span className="text-xs font-bold text-teal-950 block truncate">
                      Upload handover / testing proof photo
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      PNG, JPG, WEBP up to 5MB (Max 5)
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-teal-700 bg-teal-100/80 px-2.5 py-1 border border-teal-300 shrink-0">
                  Browse
                </span>
                <input
                  id="tech-refix-resolved-proof-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={refixResolvedProofPhotos.length >= 5}
                  className="sr-only"
                  onChange={handleRefixResolvedProofFiles}
                />
              </label>

              {refixResolvedProofPhotos.length > 0 && (
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {refixResolvedProofPhotos.map((dataUrl, idx) => (
                    <div key={idx} className="group relative size-14 sm:size-16 border border-slate-200 bg-slate-100 overflow-hidden shadow-2xs">
                      <img src={dataUrl} alt={`Handover Proof ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeRefixResolvedProofPhoto(idx)}
                        className="absolute top-0.5 right-0.5 size-4 bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xs cursor-pointer"
                        title="Remove image"
                      >
                        <X className="size-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {refixResolvedProofError && (
                <div className="rounded-none border border-rose-200 bg-rose-50 p-2 text-xs font-bold text-rose-700 flex items-center gap-2">
                  <XCircle className="size-4 shrink-0 text-rose-600" />
                  <span>{refixResolvedProofError}</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2.5 border-t border-slate-100 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmRefixResolvedBooking(null)
                setRefixResolvedNotes('')
                setRefixResolvedProofPhotos([])
                setRefixResolvedProofError('')
              }}
              disabled={isSubmittingRefixResolved}
              className="rounded-none text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void confirmSubmitRefixResolved()}
              disabled={isSubmittingRefixResolved}
              className="rounded-none bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 shadow-sm"
            >
              {isSubmittingRefixResolved ? (
                <>
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  Finalizing…
                </>
              ) : (
                'Confirm Complete & Release'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {LogoutDialog}
    </div>
  )
}

export default MechanicTechnicianAssignedRequest
