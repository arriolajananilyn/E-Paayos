import { useCallback, useEffect, useMemo, useState } from 'react'
import ShopOwnerDashboard from './dashboard.jsx'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { useSidebar } from '../../components/ui/sidebar.jsx'
import { toast } from 'sonner'
import {
  AlertCircle,
  Bike,
  Calendar,
  CalendarCheck,
  CalendarClock,
  Camera,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  DollarSign,
  FileText,
  Film,
  History,
  Home,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Store,
  Tag,
  Upload,
  User,
  UserPlus,
  WashingMachine,
  Wrench,
  X,
  XCircle,
} from 'lucide-react'

import { completionOutcomeLabel } from '../mechanic/technician/mechanicBookingShared.jsx'
import { ServiceFeeCalculateDialog } from '../../components/bookings/ServiceFeeCalculateDialog.jsx'
import { ServiceReceiptDialog } from '../../components/bookings/ServiceReceiptDialog.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

/** Must match backend `MIN_REJECTION_REASON_LEN` when rejecting a booking. */
const MIN_REJECTION_REASON_LEN = 10

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

const REQUEST_STAT_GRADIENT = {
  pending: "from-amber-600 via-orange-700 to-slate-950 border-amber-400/30",
  confirmed: "from-blue-600 via-indigo-700 to-slate-950 border-blue-400/30",
  working: "from-purple-600 via-violet-700 to-slate-950 border-purple-400/30",
  fixed: "from-emerald-600 via-teal-700 to-slate-950 border-emerald-400/30",
  completed: "from-[#04133d] via-[#081F5C] to-[#1447a6] border-[#1447a6]/40",
  total: "from-[#04133d] via-[#081F5C] to-[#1447a6] border-[#1447a6]/40",
}

function StatGradientCard({ label, value, sub, helper, icon: Icon, variant, onClick, className }) {
  const gradient = REQUEST_STAT_GRADIENT[variant] ?? REQUEST_STAT_GRADIENT.total
  const helperText = helper || sub
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden bg-gradient-to-br p-2.5 sm:p-4 text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg rounded-none border",
        onClick ? "cursor-pointer" : "",
        gradient,
        className
      )}
    >
      <div className="pointer-events-none absolute -right-3 -top-3 size-20 sm:size-28 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-lg group-hover:scale-125 transition-transform duration-500" />
      <Icon className="pointer-events-none absolute -right-1 -top-1 size-14 sm:size-20 text-white/15 stroke-[1.2] rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:text-white/25" />

      <div className="relative z-10 space-y-1.5 sm:space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[11px] font-black uppercase tracking-wider bg-black/25 backdrop-blur-md border border-white/25 text-white rounded-none shadow-xs truncate max-w-[110px] sm:max-w-none">
            <Icon className="size-2.5 sm:size-3 text-white/90 shrink-0" />
            <span className="truncate">{label}</span>
          </span>
          <div className="size-5 sm:size-6 rounded-none bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/30 text-white group-hover:bg-white group-hover:text-slate-900 transition-colors shadow-xs shrink-0">
            <ChevronRight className="size-3 sm:size-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-3xl font-black text-white tracking-tight drop-shadow-sm tabular-nums">
              {value}
            </span>
          </div>
          {helperText ? (
            <p className="text-[10px] sm:text-[11px] text-white/85 font-medium mt-0.5 sm:mt-1 leading-snug truncate">
              {helperText}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

const selectShell =
  "h-9 w-full appearance-none rounded-none border border-slate-200 bg-white px-3 py-1.5 pr-8 text-xs font-semibold text-slate-800 shadow-xs outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"

function BookingSearchBar({ value, onChange }) {
  return (
    <div className="relative min-w-0 w-full max-w-full lg:max-w-lg lg:flex-1">
      <div className="relative w-full min-w-0 max-w-full">
        <Input
          className="h-9 w-full min-w-0 rounded-none border border-slate-200 bg-white pr-12 pl-3.5 text-xs font-medium text-slate-800 shadow-xs focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
          placeholder="Search by name, phone, service, notes…"
          value={value}
          onChange={onChange}
          aria-label="Search booking requests"
        />
        <Button
          type="button"
          size="icon-sm"
          className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-none bg-gradient-to-br from-[#081F5C] to-[#1447a6] p-0 shadow-xs hover:opacity-95 cursor-pointer"
          aria-label="Search"
        >
          <Search className="h-3.5 w-3.5 text-white" />
        </Button>
      </div>
    </div>
  )
}

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function initialsFromName(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return (a + b).toUpperCase()
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

function formatRequestedAt(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

/** One line for card header: date · time */
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

function mapEmployeeFromApi(doc) {
  if (!doc || !doc._id) return null
  const skills = Array.isArray(doc.skills) ? doc.skills.filter(Boolean) : []
  return {
    id: String(doc._id),
    name: doc.name,
    skills,
    jobTitle: 'Directory staff',
    email: '',
    phone: '',
    technicalSkillsText: skills.length ? skills.join(' · ') : '',
    rosterStatus: null,
    source: 'manual',
    assignDisabled: false,
  }
}

function mapRegisteredMechanicForPicker(u) {
  if (!u || !u._id) return null
  const title = u.shopJobTitle && String(u.shopJobTitle).trim()
  const tech = Array.isArray(u.technicalSkillsNoFormalTraining) ? u.technicalSkillsNoFormalTraining.filter(Boolean) : []
  const techText = tech.slice(0, 5).join(' · ')
  const status = u.shopManagedStatus || 'active'
  const phone = [u.phoneCode, u.phoneNumber].filter(Boolean).join(' ').trim()
  return {
    id: String(u._id),
    name: u.fullName || '—',
    skills: [title, ...tech.slice(0, 2)].filter(Boolean),
    jobTitle: title || 'Mechanic / Technician',
    email: (u.email && String(u.email).trim()) || '',
    phone,
    technicalSkillsText: techText,
    rosterStatus: status,
    source: 'registered',
    assignDisabled: status === 'inactive',
  }
}

function mapBookingFromApi(row) {
  if (!row || !row.id) return null
  return {
    id: String(row.id),
    ref: String(row.ref || ''),
    isWalkIn: Boolean(row.isWalkIn),
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
    startJobProofPhotos: Array.isArray(row.startJobProofPhotos) ? row.startJobProofPhotos.filter(Boolean) : [],
    completionProofPhotos: Array.isArray(row.completionProofPhotos) ? row.completionProofPhotos.filter(Boolean) : [],
    completionNotes: row.completionNotes || '',
    problemDescription: row.problemDescription || '',
    notes: row.notes || '',
    rejectionReason: row.rejectionReason || '',
    assignedTechnician: row.assignedTechnician || null,
    assignedTechnicianName: row.assignedTechnicianName || '',
    assignedTechnicianJobTitle: row.assignedTechnicianJobTitle || '',
    assignedTechnicianPhone: row.assignedTechnicianPhone || '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    customer: row.customer || null,
    shopService: row.shopService || null,
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
    fixedAt: row.fixedAt || null,
    paymentStatus: row.paymentStatus || 'unpaid',
    paymentMethod: row.paymentMethod || '',
    paymentProofImage: row.paymentProofImage || '',
    paidAt: row.paidAt || null,
    completedAt: row.completedAt || null,
    warrantyClaim: row.warrantyClaim || null,
    warrantySettings: row.warrantySettings || null,
  }
}

function preferredDateSortValue(b) {
  const d = b.preferredDate ? new Date(b.preferredDate) : null
  if (!d || Number.isNaN(d.getTime())) return 0
  return d.getTime()
}

function ServiceRequestPage() {
  const [bookings, setBookings] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [actionError, setActionError] = useState('')
  const [statusFilter, setStatusFilter] = useState('__')
  const [sortBy, setSortBy] = useState('newest')
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [confirmBooking, setConfirmBooking] = useState(null)
  const [selectedTechId, setSelectedTechId] = useState('')
  const [assignDialogBooking, setAssignDialogBooking] = useState(null)
  const [confirmWorkingBooking, setConfirmWorkingBooking] = useState(null)
  const [workingProofPhotos, setWorkingProofPhotos] = useState([])
  const [workingProofError, setWorkingProofError] = useState('')
  const [confirmCompletedBooking, setConfirmCompletedBooking] = useState(null)
  const [completionPaymentMethod, setCompletionPaymentMethod] = useState('cash')
  const [completionProofPhotos, setCompletionProofPhotos] = useState([])
  const [completionNotes, setCompletionNotes] = useState('')
  const [completionProofError, setCompletionProofError] = useState('')
  const [rejectBooking, setRejectBooking] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectReasonError, setRejectReasonError] = useState('')
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

  const loadBookings = useCallback(async () => {
    setListError('')
    setLoading(true)
    try {
      const [bookRes, empRes, regRes] = await Promise.all([
        fetch(`${API_URL}/api/shop/bookings`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/shop/employees`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/shop/registered-mechanics`, { headers: authHeaders() }),
      ])
      const data = await bookRes.json().catch(() => ({}))
      if (!bookRes.ok) {
        throw new Error(data?.message || 'Could not load bookings.')
      }
      const raw = Array.isArray(data?.bookings) ? data.bookings : []
      setBookings(raw.map(mapBookingFromApi).filter(Boolean))

      const empData = empRes.ok ? await empRes.json().catch(() => []) : []
      const regData = regRes.ok ? await regRes.json().catch(() => []) : []
      const manual = (empData || []).map(mapEmployeeFromApi).filter(Boolean)
      const registered = Array.isArray(regData) ? regData.map(mapRegisteredMechanicForPicker).filter(Boolean) : []
      setEmployees([...registered, ...manual])
    } catch (e) {
      setBookings([])
      setListError(e?.message || 'Could not load bookings.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBookings()
  }, [loadBookings])

  const activeBookings = useMemo(() => {
    const ONE_DAY_MS = 24 * 60 * 60 * 1000
    const now = Date.now()
    return bookings.filter((b) => {
      // Always keep bookings with active/pending warranty/refix claims visible
      if (b.warrantyClaim && b.warrantyClaim.status === 'pending') {
        return true
      }
      if (b.status === 'completed') {
        const completedTime = new Date(b.completedAt || b.updatedAt || b.createdAt || 0).getTime()
        if (completedTime && !Number.isNaN(completedTime) && now - completedTime > ONE_DAY_MS) {
          return false
        }
      }
      return true
    })
  }, [bookings])

  const counts = useMemo(() => {
    const base = { all: 0, pending: 0, confirmed: 0, working: 0, fixed: 0, completed: 0, cancelled: 0, refix: 0 }
    for (const b of activeBookings) {
      base.all += 1
      if (b.warrantyClaim && b.warrantyClaim.status === 'pending') {
        base.refix += 1
      }
      const st = String(b.status)
      if (st in base) base[st] += 1
    }
    return base
  }, [activeBookings])

  const filtered = useMemo(() => {
    let list = activeBookings
    if (statusFilter !== '__' && statusFilter !== '') {
      if (statusFilter === 'refix') {
        list = list.filter((b) => b.warrantyClaim && b.warrantyClaim.status === 'pending')
      } else {
        list = list.filter((b) => b.status === statusFilter)
      }
    }
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((b) => {
        const hay = [
          b.ref,
          b.id,
          b.contactName,
          b.contactPhone,
          b.problemDescription,
          b.notes,
          b.assignedTechnicianName,
          b.assignedTechnicianJobTitle,
          b.shopService?.name,
          b.shopService?.category,
          b.customer?.fullName,
          b.customer?.email,
          b.customer?.phone,
          b.rejectionReason,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return hay.includes(q) || hay.split(/\s+/).some((w) => w.startsWith(q))
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
  }, [activeBookings, statusFilter, search, sortBy])

  const patchBooking = async (bookingId, nextStatus, extraBody = {}) => {
    setActionError('')
    setUpdatingId(bookingId)
    try {
      const payload = { ...extraBody }
      if (nextStatus) {
        payload.status = nextStatus
      }
      const res = await fetch(`${API_URL}/api/shop/bookings/${encodeURIComponent(bookingId)}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || 'Could not update booking.')
      }
      const mapped = mapBookingFromApi(data?.booking)
      if (mapped) {
        setBookings((prev) => prev.map((b) => (b.id === mapped.id ? mapped : b)))
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
  }

  const patchBookingServiceFee = async (bookingId, body) => {
    setFeeDialogError('')
    setActionError('')
    setUpdatingId(bookingId)
    try {
      const res = await fetch(`${API_URL}/api/shop/bookings/${encodeURIComponent(bookingId)}/service-fee`, {
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
        setBookings((prev) => prev.map((b) => (b.id === mapped.id ? mapped : b)))
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
  }

  const openRejectDialog = (b) => {
    setRejectReasonError('')
    setRejectReason('')
    setRejectBooking({ id: b.id, contactName: b.contactName || 'Customer' })
  }

  const submitReject = async () => {
    const trimmed = rejectReason.trim()
    if (trimmed.length < MIN_REJECTION_REASON_LEN) {
      setRejectReasonError(`Please enter at least ${MIN_REJECTION_REASON_LEN} characters.`)
      return
    }
    if (!rejectBooking) return
    const ok = await patchBooking(rejectBooking.id, 'cancelled', { rejectionReason: trimmed })
    if (ok) {
      setRejectBooking(null)
      setRejectReason('')
      setRejectReasonError('')
    }
  }

  const openConfirmDialog = (b) => {
    setSelectedTechId(b.assignedTechnician || (employees.find((e) => !e.assignDisabled)?.id || ''))
    setConfirmBooking(b)
  }

  const confirmAcceptBooking = async () => {
    if (!confirmBooking) return
    const ok = await patchBooking(confirmBooking.id, 'confirmed', {
      assignedTechnician: selectedTechId || undefined,
    })
    if (ok) {
      setConfirmBooking(null)
      setSelectedTechId('')
    }
  }

  const openAssignDialog = (b) => {
    setSelectedTechId(b.assignedTechnician || (employees.find((e) => !e.assignDisabled)?.id || ''))
    setAssignDialogBooking(b)
  }

  const submitReassignStaff = async () => {
    if (!assignDialogBooking) return
    const ok = await patchBooking(assignDialogBooking.id, undefined, {
      assignedTechnician: selectedTechId || '',
    })
    if (ok) {
      setAssignDialogBooking(null)
      setSelectedTechId('')
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
      const res = await fetch(`${API_URL}/api/shop/bookings/${reviewClaimBooking.id}/warranty-claim`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({
          action: (claimAction === 'reject' || claimAction === 'rejected') ? 'rejected' : 'approved',
          rejectionReason: (claimAction === 'reject' || claimAction === 'rejected') ? claimRejectionReason : '',
          approvedAmount:
            (claimAction === 'approve' || claimAction === 'approved') && reviewClaimBooking.warrantyClaim?.claimType === 'refund'
              ? Number(approvedRefundAmount || 0)
              : 0,
          refundProofImage: (claimAction === 'approve' || claimAction === 'approved') ? refundProofImage : '',
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
      const res = await fetch(`${API_URL}/api/shop/bookings/${encodeURIComponent(bookingId)}/warranty-claim`, {
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

  const openConfirmMarkFixedDialog = (b) => {
    setConfirmMarkFixedBooking(b)
  }

  const confirmSubmitMarkFixed = async () => {
    if (!confirmMarkFixedBooking) return
    try {
      setIsSubmittingMarkFixed(true)
      await patchBooking(confirmMarkFixedBooking.id, 'fixed')
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
      const res = await fetch(`${API_URL}/api/shop/bookings/${confirmRefixFixedBooking.id}/warranty-claim`, {
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
      const res = await fetch(`${API_URL}/api/shop/bookings/${confirmRefixResolvedBooking.id}/warranty-claim`, {
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
      const res = await fetch(`${API_URL}/api/shop/bookings/${confirmRefixWorkingBooking.id}/warranty-claim`, {
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
    const ok = await patchBooking(confirmWorkingBooking.id, 'working', {
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
    const ok = await patchBooking(confirmCompletedBooking.id, 'completed', {
      completionProofPhotos,
      completionNotes: completionNotes.trim(),
      paymentMethod: completionPaymentMethod || confirmCompletedBooking.paymentMethod || 'cash',
      markPaid: true,
    })
    if (ok) {
      setConfirmCompletedBooking(null)
      setCompletionProofPhotos([])
      setCompletionNotes('')
      setCompletionProofError('')
      setCompletionPaymentMethod('cash')
    }
  }

  return (
    <ShopOwnerDashboard
      activeSection="service-request"
      pageMeta={{
        title: 'Service requests',
        description: 'Review and manage customer booking requests from your catalog (same data as customer Book Now).',
      }}
    >
      <main className="w-full min-w-0 max-w-full space-y-3 sm:space-y-4 overflow-x-hidden">
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

        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3 xl:grid-cols-5">
          <StatGradientCard
            variant="pending"
            label="Booking Submitted"
            value={counts.pending}
            helper="Needs your response"
            icon={CalendarClock}
            onClick={() => setStatusFilter(statusFilter === 'pending' ? '' : 'pending')}
          />
          <StatGradientCard
            variant="confirmed"
            label="Booking Confirmed"
            value={counts.confirmed}
            helper="Accepted, ready to start"
            icon={CalendarCheck}
            onClick={() => setStatusFilter(statusFilter === 'confirmed' ? '' : 'confirmed')}
          />
          <StatGradientCard
            variant="working"
            label="Working"
            value={counts.working}
            helper="Service in progress"
            icon={Wrench}
            onClick={() => setStatusFilter(statusFilter === 'working' ? '' : 'working')}
          />
          <StatGradientCard
            variant="fixed"
            label="Fixed"
            value={counts.fixed}
            helper="Fixed / Awaiting pay"
            icon={CheckCircle}
            onClick={() => setStatusFilter(statusFilter === 'fixed' ? '' : 'fixed')}
          />
          <StatGradientCard
            className="col-span-2 sm:col-span-1 lg:col-span-1"
            variant="total"
            label="Completed"
            value={counts.completed}
            helper={`${counts.all} total requests`}
            icon={ClipboardList}
            onClick={() => setStatusFilter(statusFilter === 'completed' ? '' : 'completed')}
          />
        </div>

        <div className="mb-1 flex min-w-0 max-w-full flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-stretch lg:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-1 sm:flex-row sm:flex-wrap sm:gap-3 min-w-0 w-full max-w-full">
            <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[220px]">
              <select
                className={selectShell}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value === '' ? '__' : e.target.value)}
              >
                <option value="__" disabled hidden>
                  Status
                </option>
                <option value="">All statuses</option>
                <option value="pending">Booking Submitted</option>
                <option value="confirmed">Booking Confirmed</option>
                <option value="working">Working</option>
                <option value="fixed">Fixed</option>
                <option value="completed">Completed</option>
                <option value="refix">Refix / Re-repair Request</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[220px]">
              <select className={selectShell} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="newest">Sort: Newest request</option>
                <option value="oldest">Sort: Oldest request</option>
                <option value="schedule">Sort: By preferred date</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <BookingSearchBar value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="mt-2 min-w-0 max-w-full space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[#081F5C] dark:text-slate-50">Incoming requests</p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground sm:text-[13px]">
                {filtered.length} result{filtered.length === 1 ? '' : 's'}
                {statusFilter && statusFilter !== '__' && statusFilter !== '' ? ` · ${statusFilter}` : ''}
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
            <div className="flex min-h-[140px] flex-col items-center justify-center rounded-sm border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm ring-1 ring-black/2 dark:border-white/15 dark:bg-[#020818] dark:ring-white/5">
              <Store className="mx-auto h-10 w-10 text-muted-foreground/45" aria-hidden />
              <p className="mt-3 text-base font-medium text-foreground">No requests found</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Try adjusting status or search, or wait for customers to book from your service listings.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((b) => {
                const CategoryIcon = b.shopService ? categoryIcon(b.shopService.category) : Wrench
                const busy = updatingId === b.id
                const hasPin =
                  typeof b.serviceLatitude === 'number' &&
                  Number.isFinite(b.serviceLatitude) &&
                  typeof b.serviceLongitude === 'number' &&
                  Number.isFinite(b.serviceLongitude)

                return (
                  <article key={b.id} className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-3 sm:p-4 space-y-2.5 sm:space-y-3 rounded-none">
                    {/* Top Bar Header */}
                    <div className="flex flex-wrap items-start sm:items-center justify-between gap-2.5 sm:gap-3 pb-2 border-b border-slate-100">
                      <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-none bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 mt-0.5 sm:mt-0">
                          <CategoryIcon className="size-4 sm:size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                              {b.shopService?.name || 'Service Request'}
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-semibold bg-slate-100 text-slate-700 px-1.5 sm:px-2 py-0.5 rounded-none border border-slate-200 inline-flex items-center gap-1">
                              <Tag className="size-3 text-indigo-600 shrink-0" />
                              Ref: {b.ref || b.id}
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-bold bg-indigo-50 text-indigo-800 px-1.5 sm:px-2 py-0.5 rounded-none border border-indigo-200 inline-flex items-center gap-1">
                              <User className="size-3 text-indigo-600 shrink-0" />
                              {b.contactName || 'Customer'}
                            </span>
                            {b.isWalkIn && (
                              <span className="text-[10px] sm:text-[11px] font-extrabold bg-amber-100 text-amber-900 px-1.5 sm:px-2 py-0.5 rounded-none border border-amber-300 inline-flex items-center gap-1">
                                <UserPlus className="size-3 text-amber-700 shrink-0" />
                                Walk-in Customer
                              </span>
                            )}
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
                              <Badge className={cn("rounded-none text-[10px] uppercase font-bold", categoryBadgeClass(b.shopService?.category))}>
                                {b.shopService?.category || 'Service'}
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
                                <span>Assigned {b.category?.toLowerCase() === 'vehicle' ? 'Mechanic' : 'Technician'}</span>
                              </span>
                              {(b.status === 'pending' || b.status === 'confirmed' || b.status === 'working' || b.status === 'fixed') ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => openAssignDialog(b)}
                                  className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-1.5 py-0.5 shadow-2xs cursor-pointer"
                                  title="Change assigned staff"
                                >
                                  <span>Change</span>
                                </button>
                              ) : (
                                <Badge variant="outline" className="rounded-none border-sky-300 bg-sky-50 text-[9px] font-extrabold uppercase text-sky-700 px-1.5 py-0">
                                  Assigned
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-1 text-[11px] sm:text-xs">
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-900 truncate">{b.assignedTechnicianName}</p>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {formatAssignedRole(b.assignedTechnicianJobTitle, b.category)}
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
                                Review & Respond
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
                                <span>Complete & Release</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Controls Footer */}
                    {(b.status === 'pending' || b.status === 'confirmed' || b.status === 'working' || b.status === 'fixed') && (
                      <div className="pt-2 flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 w-full border-t border-slate-100">
                        {b.status === 'pending' && (
                          <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:justify-end">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openRejectDialog(b)}
                              className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 px-3.5 py-2 sm:py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] sm:text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <XCircle className="size-3.5 text-rose-600 shrink-0" />
                              <span>Reject</span>
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openConfirmDialog(b)}
                              className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 px-4 py-2 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5 shrink-0" />}
                              <span>Confirm & Assign</span>
                            </button>
                          </div>
                        )}

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
                                serviceName: b.shopService?.name || 'Service',
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
                                    setCompletionPaymentMethod(b.paymentMethod || 'cash')
                                    setConfirmCompletedBooking(b)
                                  }}
                                  className="inline-flex w-full sm:w-auto justify-center items-center gap-1.5 px-4 py-2 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-bold rounded-none shadow-md shadow-emerald-900/20 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5 shrink-0" />}
                                  <span>Mark as Paid (Completed)</span>
                                </button>
                              </>
                            ) : b.isWalkIn ? (
                              <>
                                <span className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-900 border border-amber-300 text-[11px] sm:text-xs font-bold rounded-none">
                                  <UserPlus className="size-3.5 text-amber-700 shrink-0" />
                                  <span>Fixed (Walk-in Customer)</span>
                                </span>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => {
                                    setCompletionProofError('')
                                    setCompletionProofPhotos([])
                                    setCompletionNotes('')
                                    setCompletionPaymentMethod(b.paymentMethod || 'cash')
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
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Confirm Request & Assign Staff Dialog */}
      <Dialog
        open={!!confirmBooking}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmBooking(null)
            setSelectedTechId('')
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-[calc(100vw-1rem)] flex-col gap-4 overflow-hidden sm:max-w-xl rounded-none border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl" showCloseButton>
          <DialogHeader className="shrink-0 border-b border-slate-100 pb-3.5">
            <DialogTitle className="text-xl font-black text-slate-900">Confirm Booking & Assign Staff</DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-600 mt-0.5">
              Confirm request for <span className="font-bold text-slate-900">{confirmBooking?.contactName}</span> ({confirmBooking?.serviceName || 'Service'}) and assign the mechanic / technician who will manage this job.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-3.5 text-xs sm:text-sm">
            <div>
              <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Select Mechanic / Technician <span className="text-indigo-600">*</span>
              </Label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Choose which mechanic or staff member will handle and perform this booking.
              </p>
            </div>

            {employees.length === 0 ? (
              <div className="rounded-none border border-dashed border-amber-300 bg-amber-50/70 p-4 text-xs font-medium text-amber-900">
                <p className="font-bold">No mechanics registered yet under your shop</p>
                <p className="mt-1 text-amber-800">
                  You can still confirm this booking now, and assign a technician later when staff join your shop roster.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {employees.map((t) => {
                  const isSelected = selectedTechId === t.id
                  const isDisabled = t.assignDisabled
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (!isDisabled) setSelectedTechId(t.id)
                      }}
                      className={cn(
                        "flex items-center gap-3 p-3 border rounded-none cursor-pointer transition-all",
                        isDisabled && "opacity-50 cursor-not-allowed",
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/90 ring-1 ring-indigo-600 shadow-sm"
                          : "border-slate-200 bg-white hover:border-indigo-300 shadow-2xs"
                      )}
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center bg-indigo-600 text-white font-bold text-xs">
                        {initialsFromName(t.name)}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">{t.name}</span>
                          <Badge variant="outline" className="text-[10px] font-bold border-slate-300 uppercase">
                            {t.jobTitle || 'Staff'}
                          </Badge>
                          {t.rosterStatus === 'on-leave' ? (
                            <Badge className="text-[10px] bg-amber-100 text-amber-900 border-amber-300">On-leave</Badge>
                          ) : t.rosterStatus === 'inactive' ? (
                            <Badge className="text-[10px] bg-slate-100 text-slate-700 border-slate-300">Inactive</Badge>
                          ) : (
                            <Badge className="text-[10px] bg-emerald-100 text-emerald-900 border-emerald-300">Active</Badge>
                          )}
                        </div>
                        {t.technicalSkillsText ? (
                          <p className="text-[11px] text-slate-500 truncate">{t.technicalSkillsText}</p>
                        ) : null}
                      </div>
                      <div className="shrink-0">
                        <input
                          type="radio"
                          name="selected-mechanic"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => setSelectedTechId(t.id)}
                          className="size-4 text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {actionError ? (
              <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 border border-rose-200 rounded-none">
                {actionError}
              </p>
            ) : null}
          </div>

          <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 border-t border-slate-100 pt-3.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmBooking(null)
                setSelectedTechId('')
              }}
              className="w-full sm:w-auto rounded-none border-slate-300 text-xs font-bold px-4 py-2 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!confirmBooking || updatingId === confirmBooking?.id}
              onClick={() => void confirmAcceptBooking()}
              className="w-full sm:w-auto rounded-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2 shadow-md shadow-emerald-900/20 cursor-pointer disabled:opacity-50"
            >
              {confirmBooking && updatingId === confirmBooking.id ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden />
                  Confirming…
                </>
              ) : (
                'Confirm & Assign Booking'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign / Change Staff Dialog */}
      <Dialog
        open={!!assignDialogBooking}
        onOpenChange={(open) => {
          if (!open) {
            setAssignDialogBooking(null)
            setSelectedTechId('')
          }
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-[calc(100vw-1rem)] flex-col gap-4 overflow-hidden sm:max-w-xl rounded-none border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl" showCloseButton>
          <DialogHeader className="shrink-0 border-b border-slate-100 pb-3.5">
            <DialogTitle className="text-xl font-black text-slate-900">Assign / Change Staff</DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-600 mt-0.5">
              Select or change the mechanic/technician assigned to booking for <span className="font-bold text-slate-900">{assignDialogBooking?.contactName}</span> ({assignDialogBooking?.shopService?.name || 'Service'}).
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-3.5 text-xs sm:text-sm">
            <div>
              <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                Choose Staff Member
              </Label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Staff member will see this booking under their assigned requests dashboard.
              </p>
            </div>

            {employees.length === 0 ? (
              <div className="rounded-none border border-dashed border-amber-300 bg-amber-50/70 p-4 text-xs font-medium text-amber-900">
                <p className="font-bold">No mechanics registered yet</p>
                <p className="mt-1 text-amber-800">
                  Mechanics who register and select your shop will automatically show up here.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {employees.map((t) => {
                  const isSelected = selectedTechId === t.id
                  const isDisabled = t.assignDisabled
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (!isDisabled) setSelectedTechId(t.id)
                      }}
                      className={cn(
                        "flex items-center gap-3 p-3 border rounded-none cursor-pointer transition-all",
                        isDisabled && "opacity-50 cursor-not-allowed",
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/90 ring-1 ring-indigo-600 shadow-sm"
                          : "border-slate-200 bg-white hover:border-indigo-300 shadow-2xs"
                      )}
                    >
                      <div className="flex size-9 shrink-0 items-center justify-center bg-indigo-600 text-white font-bold text-xs">
                        {initialsFromName(t.name)}
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">{t.name}</span>
                          <Badge variant="outline" className="text-[10px] font-bold border-slate-300 uppercase">
                            {t.jobTitle || 'Staff'}
                          </Badge>
                          {t.rosterStatus === 'on-leave' ? (
                            <Badge className="text-[10px] bg-amber-100 text-amber-900 border-amber-300">On-leave</Badge>
                          ) : t.rosterStatus === 'inactive' ? (
                            <Badge className="text-[10px] bg-slate-100 text-slate-700 border-slate-300">Inactive</Badge>
                          ) : (
                            <Badge className="text-[10px] bg-emerald-100 text-emerald-900 border-emerald-300">Active</Badge>
                          )}
                        </div>
                        {t.technicalSkillsText ? (
                          <p className="text-[11px] text-slate-500 truncate">{t.technicalSkillsText}</p>
                        ) : null}
                      </div>
                      <div className="shrink-0">
                        <input
                          type="radio"
                          name="reassign-mechanic"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => setSelectedTechId(t.id)}
                          className="size-4 text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 border-t border-slate-100 pt-3.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAssignDialogBooking(null)
                setSelectedTechId('')
              }}
              className="w-full sm:w-auto rounded-none border-slate-300 text-xs font-bold px-4 py-2 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!assignDialogBooking || updatingId === assignDialogBooking?.id}
              onClick={() => void submitReassignStaff()}
              className="w-full sm:w-auto rounded-none bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2 shadow-md shadow-indigo-900/20 cursor-pointer disabled:opacity-50"
            >
              {assignDialogBooking && updatingId === assignDialogBooking.id ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                'Save Staff Assignment'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-none border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl" showCloseButton>
          <DialogHeader className="shrink-0 border-b border-slate-100 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center bg-purple-100 text-purple-700 shrink-0">
                <Wrench className="size-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-black text-slate-900">Start Service Job</DialogTitle>
                <DialogDescription className="text-xs font-medium text-slate-500 mt-0.5">
                  Begin work for <span className="font-bold text-slate-900">{confirmWorkingBooking?.contactName}</span> ({confirmWorkingBooking?.serviceName || 'Service'}).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs sm:text-sm">
            {/* Confirmation Note */}
            <div className="rounded-none border border-purple-200 bg-purple-50/70 p-3 text-xs text-purple-950">
              <p className="font-bold">Mark status as "Working"</p>
              <p className="mt-0.5 text-purple-900/85 leading-relaxed">
                Service is actively in progress. A status notification with your picture proof will be sent to the customer.
              </p>
            </div>

            {/* Picture Proof Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Camera className="size-4 text-purple-600" />
                  <span>Picture Proof of Work Started <span className="text-rose-500">*</span></span>
                </Label>
                <span className="text-[11px] font-semibold text-slate-500">
                  {workingProofPhotos.length} / 5 photos
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Upload at least 1 clear photo proving the initial condition or start of the service job.
              </p>

              {/* Upload Dropzone Button */}
              <div className="mt-1">
                <label
                  htmlFor="working-proof-upload"
                  className={cn(
                    "flex flex-col items-center justify-center border-2 border-dashed p-4 text-center cursor-pointer transition-colors",
                    workingProofPhotos.length >= 5
                      ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                      : "border-purple-300 bg-purple-50/30 hover:bg-purple-50/60 hover:border-purple-500"
                  )}
                >
                  <Upload className="size-6 text-purple-600 mb-1" />
                  <span className="text-xs font-bold text-purple-900">
                    Click or tap to upload picture proof
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    PNG, JPG, WEBP up to 5MB each (Max 5 photos)
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
              </div>

              {/* Image Previews */}
              {workingProofPhotos.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-bold text-slate-700 block">Uploaded Proof:</span>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {workingProofPhotos.map((dataUrl, idx) => (
                      <div key={idx} className="group relative aspect-square border border-slate-200 bg-slate-100 overflow-hidden">
                        <img
                          src={dataUrl}
                          alt={`Proof ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeWorkingProofPhoto(idx)}
                          className="absolute top-1 right-1 size-5 bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xs cursor-pointer"
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
                <div className="rounded-none border border-rose-200 bg-rose-50 p-2.5 text-xs font-bold text-rose-700 flex items-center gap-2">
                  <XCircle className="size-4 shrink-0 text-rose-600" />
                  <span>{workingProofError}</span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 border-t border-slate-100 pt-3.5 sm:justify-end w-full">
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
                  Handover proof for <span className="font-bold text-slate-900">{confirmCompletedBooking?.contactName}</span> ({confirmCompletedBooking?.shopService?.name || 'Service'})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1 space-y-3 text-xs sm:text-sm">
            {/* Payment Method / Summary */}
            {confirmCompletedBooking?.isWalkIn || confirmCompletedBooking?.paymentStatus !== 'paid' ? (
              <div className="rounded-none border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-950 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold flex items-center gap-1.5 text-amber-950 text-xs uppercase tracking-wider">
                    <DollarSign className="size-3.5 text-amber-700 shrink-0" />
                    <span>Payment Method Received <span className="text-rose-500">*</span></span>
                  </p>
                  <span className="text-[10px] font-extrabold uppercase bg-amber-600 text-white px-2 py-0.5">
                    Walk-in Payment
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                  {[
                    { value: 'cash', label: 'Cash' },
                    { value: 'gcash', label: 'GCash' },
                    { value: 'maya', label: 'Maya' },
                    { value: 'bank_transfer', label: 'Bank Transfer' },
                  ].map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setCompletionPaymentMethod(m.value)}
                      className={cn(
                        "p-2 text-center text-xs font-bold border transition-all cursor-pointer rounded-none",
                        completionPaymentMethod === m.value
                          ? "border-amber-700 bg-amber-600 text-white shadow-xs"
                          : "border-amber-300/80 bg-white text-slate-800 hover:bg-amber-100/50"
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 text-[11px] text-amber-900 font-semibold border-t border-amber-200">
                  <span>Total Service Fee:</span>
                  <span className="font-black text-slate-900 text-xs sm:text-sm">
                    {formatPhp(
                      (confirmCompletedBooking?.serviceFeeLaborRateAtCalc || 0) +
                      (confirmCompletedBooking?.serviceFeeMaterialsAmount || 0)
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-none border border-emerald-200 bg-emerald-50/80 p-2.5 sm:p-3 text-xs text-emerald-950 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold flex items-center gap-1.5 text-emerald-900 text-xs">
                    <DollarSign className="size-3.5 text-emerald-600 shrink-0" />
                    <span>Customer Payment Confirmed</span>
                  </p>
                  <span className="text-[10px] font-extrabold uppercase bg-emerald-600 text-white px-1.5 py-0.5">
                    Paid ({confirmCompletedBooking?.paymentMethod?.toUpperCase() || 'PAID'})
                  </span>
                </div>
                <p className="text-emerald-900/85 leading-relaxed text-[11px]">
                  Payment has already been confirmed. Please attach the product handover photo proof to finalize.
                </p>
              </div>
            )}

            {/* Handover / Completion Photo Proof Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Camera className="size-3.5 text-emerald-600 shrink-0" />
                  <span>Item Handover / Claiming Photo Proof <span className="text-rose-500">*</span></span>
                </Label>
                <span className="text-[11px] font-semibold text-slate-500">
                  {completionProofPhotos.length} / 5 photos
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">
                Upload proof confirming that the customer claimed and received the repaired product.
              </p>

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

      {/* Calculate Service Fee Dialog */}
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
          void patchBookingServiceFee(feeBooking.id, payload)
        }}
      />

      {/* Reject Booking Dialog */}
      <Dialog
        open={!!rejectBooking}
        onOpenChange={(open) => {
          if (!open) {
            setRejectBooking(null)
            setRejectReason('')
            setRejectReasonError('')
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-none border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl" showCloseButton>
          <DialogHeader className="shrink-0 border-b border-slate-100 pb-3.5">
            <DialogTitle className="text-xl font-black text-slate-900">Decline Service Request</DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500 mt-0.5">
              Please explain why you are declining this request. This reason is saved with the booking record.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 text-xs sm:text-sm">
            <Label htmlFor="reject-reason" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              Rejection Reason <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value)
                if (rejectReasonError) setRejectReasonError('')
              }}
              placeholder="e.g. Fully booked on that schedule, outside service area, parts unavailable..."
              rows={4}
              className="rounded-none border-slate-300 text-xs font-medium min-h-[100px] resize-y focus:border-rose-600 focus:ring-1 focus:ring-rose-600 shadow-2xs"
              aria-invalid={!!rejectReasonError}
            />
            <p className="text-[11px] text-slate-500">
              Minimum {MIN_REJECTION_REASON_LEN} characters ({rejectReason.trim().length}/{MIN_REJECTION_REASON_LEN}).
            </p>
            {rejectReasonError ? <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 border border-rose-200 rounded-none">{rejectReasonError}</p> : null}
          </div>
          <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 border-t border-slate-100 pt-3.5 sm:justify-end w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRejectBooking(null)
                setRejectReason('')
                setRejectReasonError('')
              }}
              className="w-full sm:w-auto justify-center rounded-none border-slate-300 text-xs font-bold px-4 py-2 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!rejectBooking || updatingId === rejectBooking?.id}
              onClick={() => void submitReject()}
              className="w-full sm:w-auto justify-center rounded-none bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 shadow-md shadow-rose-900/20 cursor-pointer disabled:opacity-50"
            >
              {rejectBooking && updatingId === rejectBooking.id ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden />
                  Rejecting…
                </>
              ) : (
                'Decline Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Warranty Claim Dialog */}
      <Dialog
        open={Boolean(reviewClaimBooking)}
        onOpenChange={(open) => {
          if (!open) {
            setReviewClaimBooking(null)
            setClaimReviewError('')
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] max-w-xl md:max-w-2xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-white shadow-2xl border border-slate-200 rounded-none">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#081F5C] via-[#0E2E85] to-[#123B9B] px-5 py-4 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-9 bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
                <RotateCcw className="size-4.5 text-white" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                  Review Warranty &amp; Re-Repair Claim
                </DialogTitle>
                <DialogDescription className="text-xs text-blue-100 mt-0.5 truncate">
                  Booking #{reviewClaimBooking?.ref || reviewClaimBooking?.id?.slice(-6)} • {reviewClaimBooking?.contactName}
                </DialogDescription>
              </div>
            </div>
          </div>

          {reviewClaimBooking && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              {/* Booking & Customer Summary Strip */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-extrabold text-slate-900 text-xs sm:text-sm block">
                      {reviewClaimBooking.serviceName}
                    </span>
                    <span className="text-[11px] text-indigo-700 font-semibold">
                      Ref: #{reviewClaimBooking.ref} • {reviewClaimBooking.category || 'Service'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Original Service Fee</span>
                    <span className="text-xs font-black text-slate-900">
                      {formatPhp((reviewClaimBooking.serviceFeeLaborRateAtCalc || 0) + (reviewClaimBooking.serviceFeeMaterialsAmount || 0))}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5 font-medium">
                    <User className="size-3.5 text-indigo-600 shrink-0" />
                    <span>Customer: <strong className="text-slate-900 font-bold">{reviewClaimBooking.contactName}</strong></span>
                  </div>
                  {reviewClaimBooking.contactPhone && (
                    <a
                      href={`tel:${reviewClaimBooking.contactPhone}`}
                      className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2 py-0.5 border border-slate-200 shadow-2xs"
                    >
                      <Phone className="size-3 text-indigo-600" />
                      <span>{reviewClaimBooking.contactPhone}</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Warranty Coverage Notice */}
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-1">
                <div className="flex items-center justify-between font-bold text-xs">
                  <span className="flex items-center gap-1.5 font-black text-emerald-900">
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

                {/* Refund Account Info (If refund claim) */}
                {reviewClaimBooking.warrantyClaim?.claimType === 'refund' && (
                  <div className="pt-2 border-t border-slate-200/80 text-slate-800 space-y-1 bg-amber-50/50 p-2.5 border border-amber-200">
                    <p className="font-extrabold text-xs text-amber-900">Customer Refund Payout Account:</p>
                    <div className="grid grid-cols-3 gap-1 text-[11px]">
                      <p><strong>Method:</strong> {reviewClaimBooking.warrantyClaim.refundPaymentMethod?.toUpperCase()}</p>
                      <p className="col-span-2"><strong>Name:</strong> {reviewClaimBooking.warrantyClaim.refundAccountName}</p>
                      <p className="col-span-3"><strong>Account #:</strong> {reviewClaimBooking.warrantyClaim.refundAccountNumber}</p>
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
                      {reviewClaimBooking.warrantyClaim?.claimType === 'refund' && (
                        <div>
                          <Label className="text-[11px] font-bold text-slate-800 block mb-1">
                            Approved Refund Amount (PHP):
                          </Label>
                          <Input
                            type="number"
                            value={approvedRefundAmount}
                            onChange={(e) => setApprovedRefundAmount(e.target.value)}
                            placeholder="e.g. 500"
                            className="h-8.5 rounded-none border-slate-300 text-xs bg-white focus:border-emerald-600"
                          />
                        </div>
                      )}

                      {reviewClaimBooking.warrantyClaim?.claimType === 'refund' && (
                        <div>
                          <Label className="text-[11px] font-bold text-slate-800 block mb-1">
                            Upload Proof of Refund Payment (Receipt / GCash Screenshot):
                          </Label>
                          <Input
                            type="file"
                            accept="image/*"
                            className="rounded-none border-slate-300 text-xs bg-white"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              try {
                                const dataUrl = await new Promise((resolve, reject) => {
                                  const reader = new FileReader()
                                  reader.onload = () => resolve(String(reader.result || ''))
                                  reader.onerror = () => reject(new Error('Failed to read image.'))
                                  reader.readAsDataURL(file)
                                })
                                setRefundProofImage(dataUrl)
                              } catch {
                                setClaimReviewError('Failed to read payment proof image.')
                              }
                              e.target.value = ''
                            }}
                          />
                          {refundProofImage && (
                            <img src={refundProofImage} alt="Proof preview" className="h-20 w-32 object-cover border border-slate-300 mt-1.5 shadow-2xs" />
                          )}
                        </div>
                      )}

                      <div>
                        <Label className="text-[11px] font-bold text-slate-800 block mb-1">
                          Resolution Note &amp; Re-repair Arrangement:
                        </Label>
                        <Textarea
                          rows={2}
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="e.g. We will dispatch a technician on Monday morning to inspect and fix the unit at ₱0 labor fee..."
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
                        placeholder="e.g. The issue was caused by unauthorized physical tampering or external factors not covered by the warranty policy..."
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
                  {reviewClaimBooking.warrantyClaim?.adminNotes && (
                    <p className="italic text-slate-600">Note: "{reviewClaimBooking.warrantyClaim.adminNotes}"</p>
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
                    Submitting...
                  </>
                ) : claimAction === 'approve' ? (
                  'Confirm Approval'
                ) : (
                  'Decline Claim'
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
                htmlFor="refix-working-proof-upload"
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
                  id="refix-working-proof-upload"
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
                htmlFor="refix-resolved-proof-upload"
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
                  id="refix-resolved-proof-upload"
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

      {/* Official Service E-Receipt Dialog */}
      <ServiceReceiptDialog
        open={Boolean(receiptBooking)}
        onOpenChange={(open) => {
          if (!open) setReceiptBooking(null)
        }}
        booking={receiptBooking}
      />
    </ShopOwnerDashboard>
  )
}

export default ServiceRequestPage
