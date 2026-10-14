import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import OnCallMechanicLayout from './OnCallMechanicLayout.jsx'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Input } from '../../../components/ui/input'
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BadgeCheck,
  Bike,
  Building2,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  History,
  Home,
  Info,
  Loader2,
  Lock,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Tag,
  Trash2,
  Upload,
  User,
  WashingMachine,
  Wrench,
  X,
  XCircle,
} from 'lucide-react'
import { ServiceWarrantyDialog } from '../../../components/bookings/ServiceWarrantyDialog.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

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

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function categoryIcon(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return Bike
  if (normalized === 'gadget') return Smartphone
  if (normalized === 'appliance') return WashingMachine
  return Wrench
}

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function readStoredUser() {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const selectShell =
  'h-9 w-full appearance-none rounded-none border border-slate-200 bg-white px-3 py-1.5 pr-8 text-xs font-semibold text-slate-800 shadow-xs outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20'

const WARRANTY_PERIOD_OPTIONS = [
  { value: 7, label: '7 Days' },
  { value: 15, label: '15 Days' },
  { value: 30, label: '30 Days (1 Month)' },
  { value: 60, label: '60 Days (2 Months)' },
  { value: 90, label: '90 Days (3 Months)' },
  { value: 180, label: '180 Days (6 Months)' },
  { value: 365, label: '365 Days (1 Year)' },
]

const DEFAULT_COVERED_ITEMS = [
  { id: 'cov-1', text: 'Workmanship & repair assembly errors', enabled: true },
  { id: 'cov-2', text: 'Manufacturer-defective replacement components', enabled: true },
  { id: 'cov-3', text: 'Recurring symptoms from serviced repair scope', enabled: true },
  { id: 'cov-4', text: 'Diagnostic realignment & tuning adjustments', enabled: true },
]

const DEFAULT_VOID_CONDITIONS = [
  { id: 'void-1', text: 'Accidental drops, physical impact, or external collision', enabled: true },
  { id: 'void-2', text: 'Liquid intrusion, chemical spill, or corrosion', enabled: true },
  { id: 'void-3', text: 'Broken warranty seals or unauthorized tampering', enabled: true },
  { id: 'void-4', text: 'Third-party disassembly or unauthorized modifications', enabled: true },
]

function normalizeWarrantyList(rawList, defaultList) {
  if (Array.isArray(rawList)) {
    const list = rawList
      .filter((item) => item && typeof item === 'object')
      .map((item, idx) => ({
        id: typeof item.id === 'string' && item.id ? item.id : `item-${Date.now()}-${idx}`,
        text: typeof item.text === 'string' ? item.text.trim() : '',
        enabled: typeof item.enabled === 'boolean' ? item.enabled : true,
      }))
      .filter((item) => item.text.length > 0)
    return list.length > 0 ? list : defaultList.map((d) => ({ ...d }))
  }
  return defaultList.map((d) => ({ ...d }))
}

const DEFAULT_WARRANTY_SETTINGS = {
  laborWarrantyEnabled: true,
  laborWarrantyDays: 30,
  partsWarrantyEnabled: true,
  partsWarrantyDays: 90,
  warrantyPolicyTerms:
    'All on-call repair services performed include standard technician workmanship guarantee. Replacement parts are protected against manufacturer defects under normal operating conditions. Warranty is invalidated by physical impact, water intrusion, or unauthorized disassembly.',
  coveredItems: DEFAULT_COVERED_ITEMS,
  voidConditions: DEFAULT_VOID_CONDITIONS,
}

function normalizeWarrantySettings(raw) {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_WARRANTY_SETTINGS }
  return {
    laborWarrantyEnabled: typeof raw.laborWarrantyEnabled === 'boolean' ? raw.laborWarrantyEnabled : true,
    laborWarrantyDays: Number(raw.laborWarrantyDays) || 30,
    partsWarrantyEnabled: typeof raw.partsWarrantyEnabled === 'boolean' ? raw.partsWarrantyEnabled : true,
    partsWarrantyDays: Number(raw.partsWarrantyDays) || 90,
    warrantyPolicyTerms:
      typeof raw.warrantyPolicyTerms === 'string' && raw.warrantyPolicyTerms.trim()
        ? raw.warrantyPolicyTerms
        : DEFAULT_WARRANTY_SETTINGS.warrantyPolicyTerms,
    coveredItems: normalizeWarrantyList(raw.coveredItems, DEFAULT_COVERED_ITEMS),
    voidConditions: normalizeWarrantyList(raw.voidConditions, DEFAULT_VOID_CONDITIONS),
  }
}

function getBookingWarrantyInfo(b, defaultWs) {
  if (!b) return null
  const ws = b.warrantySettings || b.shopOwner?.warrantySettings || defaultWs || DEFAULT_WARRANTY_SETTINGS
  const laborWarrantyEnabled = ws.laborWarrantyEnabled !== false
  const partsWarrantyEnabled = ws.partsWarrantyEnabled !== false

  const laborDays = Number.isFinite(Number(ws.laborWarrantyDays)) ? Number(ws.laborWarrantyDays) : 30
  const partsDays = Number.isFinite(Number(ws.partsWarrantyDays)) ? Number(ws.partsWarrantyDays) : 90
  const maxDays = Math.max(laborWarrantyEnabled ? laborDays : 0, partsWarrantyEnabled ? partsDays : 0, 1)

  const baseDateRaw = b.completedAt || b.paidAt || b.fixedAt || b.updatedAt || b.createdAt
  const baseDate = baseDateRaw ? new Date(baseDateRaw) : new Date()
  const validBaseDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate

  const laborExpiry = new Date(validBaseDate.getTime() + laborDays * 24 * 60 * 60 * 1000)
  const partsExpiry = new Date(validBaseDate.getTime() + partsDays * 24 * 60 * 60 * 1000)
  const overallExpiry = new Date(validBaseDate.getTime() + maxDays * 24 * 60 * 60 * 1000)

  const nowMs = Date.now()
  const laborRemainingMs = laborExpiry.getTime() - nowMs
  const partsRemainingMs = partsExpiry.getTime() - nowMs
  const overallRemainingMs = overallExpiry.getTime() - nowMs

  const isLaborActive = laborWarrantyEnabled && laborRemainingMs > 0
  const isPartsActive = partsWarrantyEnabled && partsRemainingMs > 0
  const isActive = isLaborActive || isPartsActive

  const laborDaysLeft = isLaborActive ? Math.max(0, Math.ceil(laborRemainingMs / (1000 * 60 * 60 * 24))) : 0
  const partsDaysLeft = isPartsActive ? Math.max(0, Math.ceil(partsRemainingMs / (1000 * 60 * 60 * 24))) : 0
  const daysLeft = Math.max(laborDaysLeft, partsDaysLeft)

  const totalDurationMs = maxDays * 24 * 60 * 60 * 1000
  const elapsedMs = Math.max(0, nowMs - validBaseDate.getTime())
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)))

  const isExpiringSoon = isActive && daysLeft <= 7
  const isExpired = !isActive

  const claim = b.warrantyClaim
  const hasClaim = claim && claim.status && claim.status !== 'none'

  return {
    laborWarrantyEnabled,
    partsWarrantyEnabled,
    laborDays,
    partsDays,
    maxDays,
    isLaborActive,
    isPartsActive,
    isActive,
    isExpiringSoon,
    isExpired,
    daysLeft,
    laborDaysLeft,
    partsDaysLeft,
    startDate: validBaseDate,
    laborExpiry,
    partsExpiry,
    overallExpiry,
    progressPercent,
    hasClaim,
    claim,
  }
}

function mapBookingFromApi(row) {
  if (!row || !row.id) return null
  return {
    id: String(row.id),
    ref: String(row.ref || `BK-${String(row.id).slice(-8).toUpperCase()}`),
    isWalkIn: Boolean(row.isWalkIn),
    status: String(row.status || '').toLowerCase(),
    contactName: row.contactName || '',
    contactPhone: row.contactPhone || '',
    preferredDate: row.preferredDate,
    preferredTime: row.preferredTime || '',
    serviceMode: row.serviceMode === 'home' ? 'home' : 'in-shop',
    serviceAddress: row.serviceAddress || '',
    problemDescription: row.problemDescription || '',
    notes: row.notes || '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    customer: row.customer || null,
    shopService: row.shopService || null,
    shopOwner: row.shopOwner || null,
    shopName: row.shopName || row.shopOwner?.shopName || '',
    serviceName: row.serviceName || row.shopService?.name || 'On-Call Repair Service',
    serviceCategory: row.serviceCategory || row.shopService?.category || '',
    serviceFeeLaborRateAtCalc:
      row.serviceFeeLaborRateAtCalc != null && Number.isFinite(Number(row.serviceFeeLaborRateAtCalc))
        ? Number(row.serviceFeeLaborRateAtCalc)
        : null,
    serviceFeeMaterialsAmount:
      row.serviceFeeMaterialsAmount != null && Number.isFinite(Number(row.serviceFeeMaterialsAmount))
        ? Number(row.serviceFeeMaterialsAmount)
        : null,
    serviceFeeReplacementParts: Array.isArray(row.serviceFeeReplacementParts)
      ? row.serviceFeeReplacementParts.filter((x) => x?.name)
      : [],
    completedAt: row.completedAt || row.paidAt || (row.status === 'completed' ? row.updatedAt : null),
    paidAt: row.paidAt || null,
    paymentStatus: row.paymentStatus || 'paid',
    paymentMethod: row.paymentMethod || '',
    paymentProofImage: row.paymentProofImage || '',
    warrantyClaim: row.warrantyClaim || null,
    warrantySettings: row.warrantySettings || row.shopOwner?.warrantySettings || null,
    assignedTechnicianName: row.assignedTechnicianName || '',
  }
}

export default function OnCallMechanicManageWarranty() {
  const [user, setUser] = useState(() => readStoredUser())
  const [activeTab, setActiveTab] = useState('works') // 'works' | 'settings'

  // Completed works / warranty list state
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'expiring' | 'expired' | 'claims'
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent') // 'recent' | 'expiringSoonest' | 'oldest'

  // Dialog states
  const [selectedWarrantyBooking, setSelectedWarrantyBooking] = useState(null)

  // Warranty Policy Settings state
  const [warrantySettings, setWarrantySettings] = useState(() =>
    normalizeWarrantySettings(readStoredUser()?.warrantySettings),
  )
  const [warrantyNotice, setWarrantyNotice] = useState({ type: '', message: '' })
  const [isSavingWarranty, setIsSavingWarranty] = useState(false)
  const [newCoveredItemInput, setNewCoveredItemInput] = useState('')
  const [newVoidConditionInput, setNewVoidConditionInput] = useState('')

  // Load completed bookings
  const loadBookings = useCallback(async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch(`${API_URL}/api/shop/bookings?status=completed`, {
        headers: authHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || 'Could not load completed service bookings.')
      }
      const raw = Array.isArray(data?.bookings) ? data.bookings : []
      setBookings(raw.map(mapBookingFromApi).filter(Boolean))
    } catch (err) {
      setBookings([])
      setErrorMsg(err?.message || 'Failed to fetch completed service records.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Sync user profile & warranty settings
  useEffect(() => {
    const nextUser = readStoredUser()
    setUser(nextUser)
    if (nextUser?.warrantySettings) {
      setWarrantySettings(normalizeWarrantySettings(nextUser.warrantySettings))
    }

    const hydrateFromServer = async () => {
      const token = localStorage.getItem('token')
      if (!token) return
      try {
        const meRes = await fetch(`${API_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const meData = await meRes.json().catch(() => ({}))
        if (!meRes.ok) return
        const merged = { ...(nextUser || {}), ...meData }
        localStorage.setItem('user', JSON.stringify(merged))
        setUser(merged)
        if (merged?.warrantySettings) {
          setWarrantySettings(normalizeWarrantySettings(merged.warrantySettings))
        }
      } catch {
        // keep fallback
      }
    }

    void hydrateFromServer()
    void loadBookings()
  }, [loadBookings])

  useEffect(() => {
    if (!warrantyNotice.message) return undefined
    const timer = setTimeout(() => {
      setWarrantyNotice({ type: '', message: '' })
    }, 5000)
    return () => clearTimeout(timer)
  }, [warrantyNotice.message])

  // Save warranty settings
  const handleSaveWarranty = async (e) => {
    if (e) e.preventDefault()
    setWarrantyNotice({ type: '', message: '' })
    setIsSavingWarranty(true)
    try {
      const current = readStoredUser() || {}
      const merged = { ...current, warrantySettings }
      localStorage.setItem('user', JSON.stringify(merged))
      setUser(merged)

      const token = localStorage.getItem('token')
      if (token) {
        const res = await fetch(`${API_URL}/api/users/me/warranty-settings`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ warrantySettings }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(data?.message || 'Failed to sync warranty settings with server.')
        }
        if (data?.warrantySettings) {
          const synced = normalizeWarrantySettings(data.warrantySettings)
          setWarrantySettings(synced)
          merged.warrantySettings = synced
          localStorage.setItem('user', JSON.stringify(merged))
        }
      }

      setWarrantyNotice({
        type: 'success',
        message: 'Technician warranty policies & guarantee configurations saved successfully.',
      })
    } catch (err) {
      setWarrantyNotice({
        type: 'error',
        message: err?.message || 'Failed to save warranty settings.',
      })
    } finally {
      setIsSavingWarranty(false)
    }
  }

  const handleResetWarrantyToDefault = () => {
    setWarrantySettings({ ...DEFAULT_WARRANTY_SETTINGS })
    setWarrantyNotice({
      type: 'success',
      message: 'Warranty settings restored to platform default template.',
    })
  }

  const handleAddCoveredItem = () => {
    const text = newCoveredItemInput.trim()
    if (!text) return
    const newItem = {
      id: `cov-${Date.now()}`,
      text,
      enabled: true,
    }
    setWarrantySettings((prev) => ({
      ...prev,
      coveredItems: [...prev.coveredItems, newItem],
    }))
    setNewCoveredItemInput('')
  }

  const handleRemoveCoveredItem = (id) => {
    setWarrantySettings((prev) => ({
      ...prev,
      coveredItems: prev.coveredItems.filter((item) => item.id !== id),
    }))
  }

  const handleToggleCoveredItem = (id) => {
    setWarrantySettings((prev) => ({
      ...prev,
      coveredItems: prev.coveredItems.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item,
      ),
    }))
  }

  const handleAddVoidCondition = () => {
    const text = newVoidConditionInput.trim()
    if (!text) return
    const newItem = {
      id: `void-${Date.now()}`,
      text,
      enabled: true,
    }
    setWarrantySettings((prev) => ({
      ...prev,
      voidConditions: [...prev.voidConditions, newItem],
    }))
    setNewVoidConditionInput('')
  }

  const handleRemoveVoidCondition = (id) => {
    setWarrantySettings((prev) => ({
      ...prev,
      voidConditions: prev.voidConditions.filter((item) => item.id !== id),
    }))
  }

  const handleToggleVoidCondition = (id) => {
    setWarrantySettings((prev) => ({
      ...prev,
      voidConditions: prev.voidConditions.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item,
      ),
    }))
  }



  // Pre-calculate warranty statistics
  const bookingsWithWarranty = useMemo(() => {
    return bookings.map((b) => {
      const warrantyInfo = getBookingWarrantyInfo(b, warrantySettings)
      return {
        ...b,
        warrantyInfo,
      }
    })
  }, [bookings, warrantySettings])

  const stats = useMemo(() => {
    let total = bookingsWithWarranty.length
    let active = 0
    let expiring = 0
    let expired = 0
    let claims = 0

    bookingsWithWarranty.forEach((b) => {
      if (b.warrantyInfo.isActive) active += 1
      if (b.warrantyInfo.isExpiringSoon) expiring += 1
      if (b.warrantyInfo.isExpired) expired += 1
      if (b.warrantyInfo.hasClaim) claims += 1
    })

    return { total, active, expiring, expired, claims }
  }, [bookingsWithWarranty])

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    return bookingsWithWarranty
      .filter((b) => {
        // Status filter
        if (statusFilter === 'active' && !b.warrantyInfo.isActive) return false
        if (statusFilter === 'expiring' && !b.warrantyInfo.isExpiringSoon) return false
        if (statusFilter === 'expired' && !b.warrantyInfo.isExpired) return false
        if (statusFilter === 'claims' && !b.warrantyInfo.hasClaim) return false

        // Category filter
        if (categoryFilter !== 'all') {
          const cat = String(b.serviceCategory || '').toLowerCase()
          if (cat !== categoryFilter.toLowerCase()) return false
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          const name = String(b.contactName || b.customer?.fullName || '').toLowerCase()
          const phone = String(b.contactPhone || '').toLowerCase()
          const ref = String(b.ref || '').toLowerCase()
          const svc = String(b.serviceName || '').toLowerCase()
          const prob = String(b.problemDescription || '').toLowerCase()
          if (!name.includes(q) && !phone.includes(q) && !ref.includes(q) && !svc.includes(q) && !prob.includes(q)) {
            return false
          }
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'expiringSoonest') {
          if (a.warrantyInfo.isActive && !b.warrantyInfo.isActive) return -1
          if (!a.warrantyInfo.isActive && b.warrantyInfo.isActive) return 1
          return a.warrantyInfo.daysLeft - b.warrantyInfo.daysLeft
        }
        if (sortBy === 'oldest') {
          return new Date(a.completedAt || 0) - new Date(b.completedAt || 0)
        }
        return new Date(b.completedAt || 0) - new Date(a.completedAt || 0)
      })
  }, [bookingsWithWarranty, statusFilter, categoryFilter, searchQuery, sortBy])

  return (
    <OnCallMechanicLayout
      activeSection="manage-warranty"
      pageMeta={{
        title: 'Warranty Management',
        description: 'Track completed works, monitor active warranties, handle refix claims, and configure your service warranty policies.',
      }}
      wrapContent={false}
    >
      <main className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-10">
        {/* Top Hero Card & Nav Tabs */}
        <div className="overflow-hidden rounded-none border border-slate-200/90 bg-white shadow-xs">
          <div className="relative h-24 sm:h-28 w-full bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] p-4 sm:p-5 flex items-center justify-between text-white overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.2),transparent_60%)]" />
            <div className="relative z-10 space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0" />
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white drop-shadow-sm">
                  Technician Warranty &amp; Guarantee Center
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-blue-100 max-w-xl line-clamp-1 sm:line-clamp-none">
                Oversee completed customer service warranties, inspect active coverage timelines, and manage guarantee terms.
              </p>
            </div>

            <div className="relative z-10 hidden md:flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-none bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-bold text-white border border-white/20">
                <Wrench className="h-3.5 w-3.5 text-blue-200" />
                On-Call Technician Guarantee
              </span>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50/80 px-3 sm:px-6 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab('works')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer',
                activeTab === 'works'
                  ? 'border-[#081F5C] text-[#081F5C] bg-white rounded-none shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60',
              )}
            >
              <CalendarCheck className="h-4 w-4" />
              <span>Completed Works &amp; Warranties</span>
              <span className="rounded-none bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                {stats.active} Active
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition cursor-pointer',
                activeTab === 'settings'
                  ? 'border-[#081F5C] text-[#081F5C] bg-white rounded-none shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/60',
              )}
            >
              <Sliders className="h-4 w-4" />
              <span>Warranty Policies &amp; Settings</span>
              <span className="rounded-none bg-blue-100 px-2 py-0.5 text-[10px] font-black text-[#081F5C]">
                Config
              </span>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* VIEW 1: COMPLETED WORKS & WARRANTIES                                    */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'works' && (
          <div className="space-y-6 sm:space-y-7">
            {/* Search and Filters (aligned with admin userManagement.jsx) */}
            <div className="mb-6 sm:mb-8 flex min-w-0 max-w-full flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-stretch lg:justify-between">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-1 sm:flex-row sm:flex-wrap sm:gap-3 min-w-0 w-full max-w-full">
                <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[210px]">
                  <select
                    className={selectShell}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All statuses ({stats.total})</option>
                    <option value="active">Active warranty ({stats.active})</option>
                    <option value="expiring">Expiring soon ({stats.expiring})</option>
                    <option value="expired">Expired ({stats.expired})</option>
                    <option value="claims">Refix claims ({stats.claims})</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[140px] sm:flex-1 sm:max-w-[190px]">
                  <select
                    className={selectShell}
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="all">All categories</option>
                    <option value="vehicle">Vehicles</option>
                    <option value="gadget">Gadgets</option>
                    <option value="appliance">Appliances</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[200px]">
                  <select
                    className={selectShell}
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="recent">Recent completed</option>
                    <option value="expiringSoonest">Expiring soonest</option>
                    <option value="oldest">Oldest completed</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadBookings}
                  disabled={loading}
                  className="h-9 rounded-none border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 cursor-pointer"
                  title="Refresh data"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin text-[#081F5C]')} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>

              <div className="relative min-w-0 w-full max-w-full lg:max-w-lg lg:flex-1">
                <div className="relative w-full min-w-0 max-w-full">
                  <Input
                    className="h-9 w-full min-w-0 rounded-none border border-slate-200 bg-white pr-12 pl-3.5 text-xs font-medium text-slate-800 shadow-xs focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                    placeholder="Search by customer name, phone, ref, service…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search warranty records"
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
            </div>

            {/* Error Message */}
            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-none border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center rounded-none border border-slate-200 bg-white p-12 text-center shadow-xs">
                <Loader2 className="h-8 w-8 animate-spin text-[#081F5C]" />
                <p className="mt-3 text-xs font-bold text-slate-700">Loading completed works &amp; warranties...</p>
                <p className="text-[11px] text-slate-400">Inspecting service records and guarantee timers.</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredBookings.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-none border border-slate-200 bg-white p-12 text-center shadow-xs">
                <ShieldCheck className="h-12 w-12 text-slate-300" />
                <h3 className="mt-3 text-sm font-bold text-slate-800">No completed service records found</h3>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                    ? 'No completed works match your active filter criteria. Try resetting filters or search query.'
                    : 'Once you complete service requests or repair jobs, their warranty cards and countdown timers will automatically display here.'}
                </p>
                {(searchQuery || statusFilter !== 'all' || categoryFilter !== 'all') && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('')
                      setStatusFilter('all')
                      setCategoryFilter('all')
                    }}
                    className="mt-3 rounded-none text-xs font-semibold cursor-pointer"
                  >
                    Reset Filters
                  </Button>
                )}
              </div>
            )}

            {/* Booking & Warranty Cards List */}
            {!loading && filteredBookings.length > 0 && (
              <div className="space-y-3.5 sm:space-y-4 pt-1 sm:pt-2">
                {filteredBookings.map((b) => {
                  const w = b.warrantyInfo
                  const CategoryIcon = categoryIcon(b.serviceCategory)

                  return (
                    <div
                      key={b.id}
                      className={cn(
                        'overflow-hidden rounded-none border bg-white shadow-xs transition hover:shadow-md',
                        w.hasClaim
                          ? 'border-purple-300 ring-1 ring-purple-400/30'
                          : w.isActive
                            ? w.isExpiringSoon
                              ? 'border-amber-300'
                              : 'border-slate-200/90'
                            : 'border-slate-200/80 bg-slate-50/40',
                      )}
                    >
                      {/* Top banner if warranty claim exists */}
                      {w.hasClaim && (
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 px-4 py-2 text-white">
                          <div className="flex items-center gap-2 text-xs font-bold">
                            <ShieldAlert className="h-4 w-4 text-purple-200 animate-pulse shrink-0" />
                            <span>Customer Refix Claim Filed:</span>
                            <span className="rounded-none bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-purple-100">
                              Status: {w.claim?.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-purple-200">
                            <span>Claimed on {formatDate(w.claim?.claimedAt)}</span>
                          </div>
                        </div>
                      )}

                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          {/* Left: Booking & Customer Details */}
                          <div className="space-y-2 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-extrabold text-[#081F5C] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-none">
                                {b.ref}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-none bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
                                <CategoryIcon className="h-3 w-3 text-slate-500" />
                                <span className="capitalize">{b.serviceCategory || 'Service'}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-none bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Completed
                              </span>
                              <span className="text-xs text-slate-400">
                                Completed: <span className="text-slate-600 font-medium">{formatDate(b.completedAt)}</span>
                              </span>
                            </div>

                            <div className="flex items-start gap-3 pt-1">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-none bg-gradient-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-white font-bold text-sm shadow-xs">
                                {(b.contactName || b.customer?.fullName || 'C').charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 space-y-0.5">
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                                  {b.contactName || b.customer?.fullName || 'Customer'}
                                </h3>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                  {b.contactPhone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3 text-slate-400" />
                                      {b.contactPhone}
                                    </span>
                                  )}
                                  {b.serviceAddress && (
                                    <span className="flex items-center gap-1 truncate max-w-xs">
                                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                                      <span className="truncate">{b.serviceAddress}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="rounded-none bg-slate-50 border border-slate-100 p-2.5 text-xs text-slate-700 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-900">Service: {b.serviceName}</span>
                                <span className="inline-flex items-center gap-1 rounded-none px-2 py-0.5 text-[11px] font-bold bg-blue-50 text-[#081F5C] border border-blue-200">
                                  <ShieldCheck className="h-3 w-3 text-[#081F5C]" />
                                  <span>{w.isActive ? 'Warranty Protected' : 'Coverage Expired'}</span>
                                </span>
                              </div>
                              {b.problemDescription && (
                                <p className="text-slate-500 line-clamp-1 italic text-[11px]">
                                  Issue: "{b.problemDescription}"
                                </p>
                              )}
                              <p className="text-[11px] text-slate-600 font-medium">
                                Mode: <span className="text-[#081F5C] font-semibold">{b.serviceMode === 'home' ? 'Home Service (On-Call)' : 'In-Shop / Drop-off'}</span>
                              </p>
                            </div>
                          </div>

                          {/* Right: Warranty Timeline & Live Status */}
                          <div className="lg:w-80 shrink-0 rounded-none border border-slate-200/90 bg-slate-50/70 p-3.5 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Guarantee Status
                              </span>
                              {w.isActive ? (
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-none px-2 py-0.5 text-[10px] font-black',
                                    w.isExpiringSoon
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300',
                                  )}
                                >
                                  <ShieldCheck className="h-3 w-3" />
                                  {w.isExpiringSoon ? 'Expiring Soon' : 'Active Warranty'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-none bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-300">
                                  <History className="h-3 w-3" />
                                  Expired Guarantee
                                </span>
                              )}
                            </div>

                            {/* Live Countdown & Progress */}
                            {w.isActive ? (
                              <div className="space-y-1.5">
                                <div className="flex items-baseline justify-between">
                                  <span className="text-xs text-slate-600">Remaining Coverage:</span>
                                  <span className="text-sm font-black text-emerald-700 tabular-nums">
                                    {w.daysLeft} {w.daysLeft === 1 ? 'day' : 'days'} left
                                  </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-none bg-slate-200">
                                  <div
                                    className={cn(
                                      'h-full transition-all duration-500',
                                      w.isExpiringSoon ? 'bg-amber-500' : 'bg-emerald-500',
                                    )}
                                    style={{ width: `${w.progressPercent}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                                  <span>Start: {formatDate(w.startDate)}</span>
                                  <span>Expires: {formatDate(w.overallExpiry)}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1 text-xs text-slate-500">
                                <p className="text-[11px] font-medium text-slate-600">
                                  Warranty ended on {formatDate(w.overallExpiry)}.
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  Standard {w.maxDays}-day coverage window has passed.
                                </p>
                              </div>
                            )}

                            {/* Labor & Parts breakdown badges */}
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80 text-[11px]">
                              <div className="rounded-none bg-white p-1.5 border border-slate-200/70 text-center">
                                <span className="block text-[9px] uppercase font-bold text-slate-400">
                                  Workmanship
                                </span>
                                <span
                                  className={cn(
                                    'font-bold text-xs',
                                    w.isLaborActive ? 'text-emerald-700' : 'text-slate-400 line-through',
                                  )}
                                >
                                  {w.laborWarrantyEnabled ? `${w.laborDays} Days` : 'Disabled'}
                                </span>
                              </div>
                              <div className="rounded-none bg-white p-1.5 border border-slate-200/70 text-center">
                                <span className="block text-[9px] uppercase font-bold text-slate-400">
                                  Parts / Items
                                </span>
                                <span
                                  className={cn(
                                    'font-bold text-xs',
                                    w.isPartsActive ? 'text-emerald-700' : 'text-slate-400 line-through',
                                  )}
                                >
                                  {w.partsWarrantyEnabled ? `${w.partsDays} Days` : 'Disabled'}
                                </span>
                              </div>
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="pt-1">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => setSelectedWarrantyBooking(b)}
                                className="w-full h-8 rounded-none text-xs font-semibold bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] text-white hover:brightness-110 cursor-pointer shadow-2xs gap-1.5"
                              >
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                                <span>Warranty Certificate</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* VIEW 2: WARRANTY POLICIES & GUARANTEE CONFIGURATION                      */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* Notice Banner */}
            {warrantyNotice.message && (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-none border p-3.5 text-xs',
                  warrantyNotice.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-rose-200 bg-rose-50 text-rose-800',
                )}
              >
                {warrantyNotice.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                )}
                <span className="font-medium">{warrantyNotice.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveWarranty} className="space-y-4">
              {/* Card 1: Warranty Period Durations */}
              <div className="rounded-none border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                      Technician Workmanship &amp; Parts Guarantee Durations
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Set how long completed repairs remain under warranty for your customers.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Labor Guarantee */}
                  <div
                    className={cn(
                      'rounded-none border p-4 transition',
                      warrantySettings.laborWarrantyEnabled
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : 'border-slate-200 bg-slate-50/50 opacity-75',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 cursor-pointer">
                        <Wrench className="h-4 w-4 text-emerald-600" />
                        Technician Labor &amp; Workmanship
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setWarrantySettings((prev) => ({
                            ...prev,
                            laborWarrantyEnabled: !prev.laborWarrantyEnabled,
                          }))
                        }
                        className={cn(
                          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-none transition-colors duration-200 ease-in-out focus:outline-none',
                          warrantySettings.laborWarrantyEnabled ? 'bg-emerald-600' : 'bg-slate-300',
                        )}
                        role="switch"
                        aria-checked={warrantySettings.laborWarrantyEnabled}
                      >
                        <span
                          className={cn(
                            'inline-block h-4 w-4 transform rounded-none bg-white shadow transition duration-200 ease-in-out mt-0.5 ml-0.5',
                            warrantySettings.laborWarrantyEnabled ? 'translate-x-4' : 'translate-x-0',
                          )}
                        />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Covers repair execution, diagnostic realignment, and assembly errors.
                    </p>

                    <div className="mt-3 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-600">Standard Duration:</span>
                      <select
                        disabled={!warrantySettings.laborWarrantyEnabled}
                        value={warrantySettings.laborWarrantyDays}
                        onChange={(e) =>
                          setWarrantySettings((prev) => ({
                            ...prev,
                            laborWarrantyDays: Number(e.target.value),
                          }))
                        }
                        className="w-full h-9 rounded-none border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-none disabled:opacity-50"
                      >
                        {WARRANTY_PERIOD_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Parts Guarantee */}
                  <div
                    className={cn(
                      'rounded-none border p-4 transition',
                      warrantySettings.partsWarrantyEnabled
                        ? 'border-blue-200 bg-blue-50/30'
                        : 'border-slate-200 bg-slate-50/50 opacity-75',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 cursor-pointer">
                        <Package className="h-4 w-4 text-blue-600" />
                        Replacement Parts &amp; Hardware
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setWarrantySettings((prev) => ({
                            ...prev,
                            partsWarrantyEnabled: !prev.partsWarrantyEnabled,
                          }))
                        }
                        className={cn(
                          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-none transition-colors duration-200 ease-in-out focus:outline-none',
                          warrantySettings.partsWarrantyEnabled ? 'bg-[#081F5C]' : 'bg-slate-300',
                        )}
                        role="switch"
                        aria-checked={warrantySettings.partsWarrantyEnabled}
                      >
                        <span
                          className={cn(
                            'inline-block h-4 w-4 transform rounded-none bg-white shadow transition duration-200 ease-in-out mt-0.5 ml-0.5',
                            warrantySettings.partsWarrantyEnabled ? 'translate-x-4' : 'translate-x-0',
                          )}
                        />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Covers brand-new installed spare parts against manufacturer defects.
                    </p>

                    <div className="mt-3 space-y-1">
                      <span className="text-[11px] font-semibold text-slate-600">Standard Duration:</span>
                      <select
                        disabled={!warrantySettings.partsWarrantyEnabled}
                        value={warrantySettings.partsWarrantyDays}
                        onChange={(e) =>
                          setWarrantySettings((prev) => ({
                            ...prev,
                            partsWarrantyDays: Number(e.target.value),
                          }))
                        }
                        className="w-full h-9 rounded-none border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-[#081F5C] focus:outline-none disabled:opacity-50"
                      >
                        {WARRANTY_PERIOD_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Covered Items Checklist */}
              <div className="rounded-none border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-3">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Covered Under Warranty (Included Scope)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Specify what problems and components qualify for free service re-work or part replacement.
                  </p>
                </div>

                <div className="space-y-2">
                  {warrantySettings.coveredItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-none border border-slate-200 bg-slate-50/60 p-2.5 text-xs hover:bg-slate-50"
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={() => handleToggleCoveredItem(item.id)}
                          className="h-4 w-4 rounded-none text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className={cn('truncate', !item.enabled && 'text-slate-400 line-through')}>
                          {item.text}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveCoveredItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                        title="Remove item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new covered item */}
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    type="text"
                    placeholder="Add coverage item (e.g. Free diagnostic re-inspection within 15 days)..."
                    value={newCoveredItemInput}
                    onChange={(e) => setNewCoveredItemInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddCoveredItem()
                      }
                    }}
                    className="h-8 text-xs flex-1 rounded-none"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCoveredItem}
                    className="h-8 rounded-none bg-[#081F5C] hover:bg-[#0b2b73] text-white text-xs font-bold px-3 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Card 3: Void Conditions Checklist */}
              <div className="rounded-none border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-3">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Warranty Voiding Conditions (Exclusions)
                  </h3>
                  <p className="text-xs text-slate-500">
                    State conditions that will void the warranty and release technician liability.
                  </p>
                </div>

                <div className="space-y-2">
                  {warrantySettings.voidConditions.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-none border border-slate-200 bg-slate-50/60 p-2.5 text-xs hover:bg-slate-50"
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={() => handleToggleVoidCondition(item.id)}
                          className="h-4 w-4 rounded-none text-rose-600 focus:ring-rose-500"
                        />
                        <span className={cn('truncate', !item.enabled && 'text-slate-400 line-through')}>
                          {item.text}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handleRemoveVoidCondition(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition cursor-pointer"
                        title="Remove condition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new void condition */}
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    type="text"
                    placeholder="Add voiding condition (e.g. Tampered security sticker or client unauthorized repair)..."
                    value={newVoidConditionInput}
                    onChange={(e) => setNewVoidConditionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddVoidCondition()
                      }
                    }}
                    className="h-8 text-xs flex-1 rounded-none"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddVoidCondition}
                    className="h-8 rounded-none bg-[#081F5C] hover:bg-[#0b2b73] text-white text-xs font-bold px-3 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Card 4: Detailed Policy Terms Text */}
              <div className="rounded-none border border-slate-200 bg-white p-4 sm:p-6 shadow-xs space-y-3">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#081F5C]" />
                    Official Technician Warranty Terms &amp; Conditions Statement
                  </h3>
                  <p className="text-xs text-slate-500">
                    This text is printed on customer receipts and warranty certificates generated by your service account.
                  </p>
                </div>

                <textarea
                  rows={4}
                  value={warrantySettings.warrantyPolicyTerms}
                  onChange={(e) =>
                    setWarrantySettings((prev) => ({
                      ...prev,
                      warrantyPolicyTerms: e.target.value,
                    }))
                  }
                  className="w-full rounded-none border border-slate-200 p-3 text-xs text-slate-800 focus:border-[#081F5C] focus:outline-none font-normal leading-relaxed"
                  placeholder="Enter your comprehensive warranty agreement statement..."
                />
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetWarrantyToDefault}
                  className="rounded-none text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Discard Changes
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingWarranty}
                  size="sm"
                  className="rounded-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 shadow-xs cursor-pointer"
                >
                  {isSavingWarranty ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      Saving Warranty Policy...
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1.5" />
                      Save Warranty Settings
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* MODAL 1: WARRANTY CERTIFICATE DIALOG                                     */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {selectedWarrantyBooking && (
          <ServiceWarrantyDialog
            open={Boolean(selectedWarrantyBooking)}
            onOpenChange={(open) => {
              if (!open) setSelectedWarrantyBooking(null)
            }}
            booking={selectedWarrantyBooking}
          />
        )}


      </main>
    </OnCallMechanicLayout>
  )
}
