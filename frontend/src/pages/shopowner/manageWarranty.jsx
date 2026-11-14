import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ShopOwnerDashboard from './dashboard.jsx'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
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
import { ServiceWarrantyDialog } from '../../components/bookings/ServiceWarrantyDialog.jsx'

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
    'All repair services performed include standard workmanship warranty. Replacement parts are protected against manufacturer defects under normal operating conditions. Warranty is invalidated by physical impact, water intrusion, or unauthorized disassembly.',
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
    serviceName: row.serviceName || row.shopService?.name || 'Repair Service',
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

export default function ShopOwnerManageWarranty() {
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

  // Load bookings
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
        message: 'Warranty policies & guarantee configurations saved successfully.',
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
      id: `cov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
      id: `void-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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

    for (const b of bookingsWithWarranty) {
      if (b.warrantyInfo.isActive) active++
      if (b.warrantyInfo.isExpiringSoon) expiring++
      if (b.warrantyInfo.isExpired) expired++
      if (b.warrantyInfo.hasClaim) claims++
    }

    return { total, active, expiring, expired, claims }
  }, [bookingsWithWarranty])

  // Filtered & sorted bookings
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
          // Put active first, sorted by days left ascending
          if (a.warrantyInfo.isActive && !b.warrantyInfo.isActive) return -1
          if (!a.warrantyInfo.isActive && b.warrantyInfo.isActive) return 1
          return a.warrantyInfo.daysLeft - b.warrantyInfo.daysLeft
        }
        if (sortBy === 'oldest') {
          return new Date(a.completedAt || 0) - new Date(b.completedAt || 0)
        }
        // default: recent completed first
        return new Date(b.completedAt || 0) - new Date(a.completedAt || 0)
      })
  }, [bookingsWithWarranty, statusFilter, categoryFilter, searchQuery, sortBy])

  return (
    <ShopOwnerDashboard
      activeSection="manage-warranty"
      pageMeta={{
        title: 'Warranty Management',
        description: 'Track active warranties, monitor guarantee expirations, handle refix claims, and configure warranty policies.',
      }}
    >
      <main className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden pb-10">
        {/* Top Hero Card & Nav Tabs */}
        <div className="overflow-hidden rounded-none border border-slate-200 bg-white shadow-xs">
          <div className="relative h-24 sm:h-28 w-full bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] p-4 sm:p-5 flex items-center justify-between text-white overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.2),transparent_60%)]" />
            <div className="relative z-10 space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0" />
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white drop-shadow-sm">
                  Warranty &amp; Service Guarantee Center
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-blue-100 max-w-xl line-clamp-1 sm:line-clamp-none">
                Oversee completed customer service warranties, inspect coverage timelines, and manage customer guarantee terms.
              </p>
            </div>

            <div className="relative z-10 hidden md:flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-none bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-bold text-white border border-white/20">
                <Store className="h-3.5 w-3.5 text-blue-200" />
                Shop Warranty Operations
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
                    placeholder="Search customer, phone, ref"
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

            {/* Error notice if any */}
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-none border border-red-200 bg-red-50 p-3 text-xs sm:text-sm text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Loading state */}
            {loading ? (
              <div className="rounded-none border border-slate-200 bg-white p-12 text-center space-y-3">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#081F5C]" />
                <p className="text-sm font-semibold text-slate-700">Loading warranty service records...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="rounded-none border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center space-y-2">
                <ShieldCheck className="mx-auto h-10 w-10 text-slate-400" />
                <p className="text-sm font-bold text-slate-800">No matching completed warranties found</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                    ? 'Try clearing or relaxing your search query and filters to see more completed work warranties.'
                    : 'When you finalize and complete customer service requests, their active warranties and guarantees will be listed here automatically.'}
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
                    className="mt-2 rounded-none text-xs font-semibold cursor-pointer"
                  >
                    Reset All Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((b) => {
                  const CategoryIcon = categoryIcon(b.serviceCategory)
                  const w = b.warrantyInfo

                  return (
                    <div
                      key={b.id}
                      className={cn(
                        'overflow-hidden rounded-none border bg-white shadow-2xs transition-all hover:shadow-xs',
                        w.hasClaim
                          ? 'border-rose-300 ring-1 ring-rose-200/60'
                          : w.isActive
                            ? 'border-emerald-200/90'
                            : 'border-slate-200',
                      )}
                    >
                      {/* Top Header Strip */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-[#081F5C] bg-blue-50 border border-blue-200/80 px-2 py-0.5 rounded-none text-[11px]">
                            {b.ref}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-none bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            <CategoryIcon className="h-3 w-3 text-[#081F5C]" />
                            {b.serviceCategory || 'Service'}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                            {b.serviceMode === 'home' ? (
                              <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded-none text-[10px] font-semibold">
                                <Home className="h-2.5 w-2.5" /> Home Service
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.2 rounded-none text-[10px] font-semibold">
                                <Store className="h-2.5 w-2.5" /> In-Shop
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                          <span>Completed:</span>
                          <span className="font-semibold text-slate-800">{formatDate(b.completedAt)}</span>
                        </div>
                      </div>

                      {/* Main Card Body */}
                      <div className="p-4 sm:p-5 space-y-4">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                          {/* Left: Customer & Service Info */}
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none bg-gradient-to-br from-[#04133d] to-[#1447a6] text-white text-xs font-bold shadow-xs">
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
                              {b.assignedTechnicianName && (
                                <p className="text-[11px] text-slate-600 font-medium">
                                  Assigned Tech: <span className="text-[#081F5C] font-semibold">{b.assignedTechnicianName}</span>
                                </p>
                              )}
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
                                  Expired
                                </span>
                              )}
                            </div>

                            {/* Remaining Days Banner */}
                            <div>
                              {w.isActive ? (
                                <div className="space-y-1">
                                  <div className="flex items-baseline justify-between">
                                    <span className="text-base sm:text-lg font-black text-slate-900 tabular-nums">
                                      {w.daysLeft} {w.daysLeft === 1 ? 'Day' : 'Days'} Remaining
                                    </span>
                                    <span className="text-[11px] font-medium text-slate-500">
                                      Until {formatDate(w.overallExpiry)}
                                    </span>
                                  </div>

                                  {/* Progress Bar */}
                                  <div className="h-2 w-full overflow-hidden rounded-none bg-slate-200">
                                    <div
                                      className={cn(
                                        'h-full transition-all duration-500',
                                        w.isExpiringSoon
                                          ? 'bg-amber-500'
                                          : w.progressPercent > 70
                                            ? 'bg-blue-500'
                                            : 'bg-emerald-500',
                                      )}
                                      style={{ width: `${Math.min(100, Math.max(5, 100 - w.progressPercent))}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs font-semibold text-slate-600">
                                  Warranty coverage ended on {formatDate(w.overallExpiry)}.
                                </p>
                              )}
                            </div>

                            {/* Guarantee Periods Chips */}
                            <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-200/80 text-[10px]">
                              <div className="rounded-none bg-white p-1.5 border border-slate-200/60">
                                <span className="text-slate-400 block font-medium">Labor:</span>
                                <span className={cn('font-bold', w.isLaborActive ? 'text-emerald-700' : 'text-slate-500')}>
                                  {w.laborWarrantyEnabled ? `${w.laborDays}d (${w.isLaborActive ? `${w.laborDaysLeft}d left` : 'Expired'})` : 'No warranty'}
                                </span>
                              </div>
                              <div className="rounded-none bg-white p-1.5 border border-slate-200/60">
                                <span className="text-slate-400 block font-medium">Parts:</span>
                                <span className={cn('font-bold', w.isPartsActive ? 'text-blue-700' : 'text-slate-500')}>
                                  {w.partsWarrantyEnabled ? `${w.partsDays}d (${w.isPartsActive ? `${w.partsDaysLeft}d left` : 'Expired'})` : 'No warranty'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Customer Warranty Claim Alert Banner (if filed) */}
                        {w.hasClaim && (
                          <div className="rounded-none border border-rose-200 bg-rose-50/70 p-3 sm:p-3.5 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 font-bold text-rose-900 text-xs sm:text-sm">
                                <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                                <span>Customer Warranty Claim Filed</span>
                                <Badge
                                  className={cn(
                                    'rounded-none text-[10px] font-extrabold uppercase tracking-wide',
                                    w.claim.status === 'pending'
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : w.claim.status === 'approved'
                                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                                        : w.claim.status === 'working'
                                          ? 'bg-purple-100 text-purple-900 border-purple-300'
                                          : w.claim.status === 'fixed'
                                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                            : w.claim.status === 'resolved'
                                              ? 'bg-emerald-200 text-emerald-950 border-emerald-400'
                                              : 'bg-rose-100 text-rose-900 border-rose-300',
                                  )}
                                >
                                  {w.claim.status === 'working' ? 'Rework In Progress' : w.claim.status}
                                </Badge>
                              </div>
                            </div>

                            <p className="text-xs text-rose-800">
                              <span className="font-semibold">Reason:</span> "{w.claim.reason || 'Recurring defect'}"
                              {w.claim.details ? ` — ${w.claim.details}` : ''}
                            </p>
                          </div>
                        )}

                        {/* Card Action Buttons */}
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setSelectedWarrantyBooking(b)}
                            className="h-8 rounded-none gap-1.5 text-xs font-semibold bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] text-white hover:brightness-110 cursor-pointer shadow-2xs"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                            <span>Warranty Certificate</span>
                          </Button>
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
        {/* VIEW 2: WARRANTY POLICIES & GUARANTEE SETTINGS                           */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'settings' && (
          <div className="rounded-none border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Shop Warranty Policies &amp; Service Guarantee
                </h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Define your default labor guarantee periods, replaced component protections, inclusions, and voiding terms.
                </p>
              </div>
              <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-none bg-amber-50 text-amber-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>

            {warrantyNotice.message && (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-none border px-3.5 py-2.5 text-xs sm:text-sm',
                  warrantyNotice.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-800',
                )}
              >
                {warrantyNotice.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <Info className="h-4 w-4 shrink-0 text-red-600" />
                )}
                <span>{warrantyNotice.message}</span>
              </div>
            )}

            {/* Quick Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-none border border-slate-200 bg-slate-50/70 p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Labor Guarantee</span>
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-none',
                      warrantySettings.laborWarrantyEnabled
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-200 text-slate-600',
                    )}
                  >
                    {warrantySettings.laborWarrantyEnabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <p className="text-lg font-black text-slate-900">
                  {warrantySettings.laborWarrantyEnabled ? `${warrantySettings.laborWarrantyDays} Days` : 'No Warranty'}
                </p>
                <p className="text-[11px] text-slate-500">Workmanship &amp; repair labor protection</p>
              </div>

              <div className="rounded-none border border-slate-200 bg-slate-50/70 p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Parts Guarantee</span>
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-none',
                      warrantySettings.partsWarrantyEnabled
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-slate-200 text-slate-600',
                    )}
                  >
                    {warrantySettings.partsWarrantyEnabled ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <p className="text-lg font-black text-slate-900">
                  {warrantySettings.partsWarrantyEnabled ? `${warrantySettings.partsWarrantyDays} Days` : 'No Warranty'}
                </p>
                <p className="text-[11px] text-slate-500">Replaced components &amp; factory defects</p>
              </div>

              <div className="rounded-none border border-slate-200 bg-slate-50/70 p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Claim Response</span>
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-none bg-amber-100 text-amber-800 border border-amber-200">
                    Fast-Track
                  </span>
                </div>
                <p className="text-lg font-black text-slate-900">24 – 48 Hours</p>
                <p className="text-[11px] text-slate-500">Inspection &amp; refix fulfillment target</p>
              </div>
            </div>

            <form onSubmit={handleSaveWarranty} className="space-y-5">
              {/* Coverage Duration Settings */}
              <div className="rounded-none border border-slate-200/90 bg-slate-50/50 p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-[#081F5C]" />
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Warranty Durations &amp; Toggles
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">Customer-facing guarantee</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Labor Warranty Card */}
                  <div className="rounded-none border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Wrench className="h-3.5 w-3.5 text-[#081F5C]" />
                          Workmanship &amp; Labor Warranty
                        </label>
                        <p className="text-[11px] text-slate-500">Guarantees service quality and repair durability.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={warrantySettings.laborWarrantyEnabled}
                          onChange={(e) =>
                            setWarrantySettings((prev) => ({ ...prev, laborWarrantyEnabled: e.target.checked }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-none after:h-4 after:w-4 after:transition-all peer-checked:bg-[#081F5C]"></div>
                      </label>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">Duration Period</label>
                      <select
                        disabled={!warrantySettings.laborWarrantyEnabled}
                        value={warrantySettings.laborWarrantyDays}
                        onChange={(e) =>
                          setWarrantySettings((prev) => ({ ...prev, laborWarrantyDays: Number(e.target.value) }))
                        }
                        className="w-full rounded-none border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#081F5C] focus:ring-2 focus:ring-[#081F5C]/15 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                      >
                        {WARRANTY_PERIOD_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Parts Warranty Card */}
                  <div className="rounded-none border border-slate-200 bg-white p-3.5 sm:p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <BadgeCheck className="h-3.5 w-3.5 text-[#081F5C]" />
                          Replaced Parts Warranty
                        </label>
                        <p className="text-[11px] text-slate-500">Covers defects in new components supplied by shop.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={warrantySettings.partsWarrantyEnabled}
                          onChange={(e) =>
                            setWarrantySettings((prev) => ({ ...prev, partsWarrantyEnabled: e.target.checked }))
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-none after:h-4 after:w-4 after:transition-all peer-checked:bg-[#081F5C]"></div>
                      </label>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">Duration Period</label>
                      <select
                        disabled={!warrantySettings.partsWarrantyEnabled}
                        value={warrantySettings.partsWarrantyDays}
                        onChange={(e) =>
                          setWarrantySettings((prev) => ({ ...prev, partsWarrantyDays: Number(e.target.value) }))
                        }
                        className="w-full rounded-none border border-slate-300 bg-white px-3 py-2 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#081F5C] focus:ring-2 focus:ring-[#081F5C]/15 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
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

              {/* Coverage Scope & Exclusions Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Covered Items Card */}
                <div className="rounded-none border border-slate-200/90 bg-white p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5 text-emerald-800">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">Covered Under Warranty</h4>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-none border border-emerald-200">
                        {warrantySettings.coveredItems.filter((i) => i.enabled).length} Active
                      </span>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs text-slate-700">
                      {warrantySettings.coveredItems.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No covered items added yet. Add one below.</p>
                      ) : (
                        warrantySettings.coveredItems.map((item) => (
                          <div
                            key={item.id}
                            className="group flex items-center justify-between gap-2 p-1.5 rounded-none hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
                          >
                            <label className="flex items-start gap-2 cursor-pointer select-none flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={item.enabled}
                                onChange={() => handleToggleCoveredItem(item.id)}
                                className="mt-0.5 h-4 w-4 accent-[#081F5C] rounded-none cursor-pointer shrink-0"
                              />
                              <span className={cn('text-xs break-words', item.enabled ? 'text-slate-800 font-medium' : 'text-slate-400 line-through')}>
                                {item.text}
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemoveCoveredItem(item.id)}
                              title="Remove item"
                              className="opacity-60 hover:opacity-100 text-slate-400 hover:text-red-600 p-1 transition cursor-pointer shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Add New Covered Item Input Form */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newCoveredItemInput}
                        onChange={(e) => setNewCoveredItemInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddCoveredItem()
                          }
                        }}
                        placeholder="Add covered item"
                        className="flex-1 rounded-none border border-slate-300 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#081F5C] focus:ring-1 focus:ring-[#081F5C]"
                      />
                      <button
                        type="button"
                        onClick={handleAddCoveredItem}
                        disabled={!newCoveredItemInput.trim()}
                        className="inline-flex items-center gap-1 rounded-none bg-[#081F5C] hover:bg-[#04133d] disabled:opacity-50 disabled:cursor-not-allowed text-white px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition cursor-pointer shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Void / Non-Covered Conditions Card */}
                <div className="rounded-none border border-slate-200/90 bg-white p-4 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5 text-amber-800">
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">Warranty Voiding Conditions</h4>
                      </div>
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-none border border-amber-200">
                        {warrantySettings.voidConditions.filter((i) => i.enabled).length} Active
                      </span>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs text-slate-700">
                      {warrantySettings.voidConditions.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2">No void conditions added yet. Add one below.</p>
                      ) : (
                        warrantySettings.voidConditions.map((item) => (
                          <div
                            key={item.id}
                            className="group flex items-center justify-between gap-2 p-1.5 rounded-none hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
                          >
                            <label className="flex items-start gap-2 cursor-pointer select-none flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={item.enabled}
                                onChange={() => handleToggleVoidCondition(item.id)}
                                className="mt-0.5 h-4 w-4 accent-amber-600 rounded-none cursor-pointer shrink-0"
                              />
                              <span className={cn('text-xs break-words', item.enabled ? 'text-slate-800 font-medium' : 'text-slate-400 line-through')}>
                                {item.text}
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleRemoveVoidCondition(item.id)}
                              title="Remove condition"
                              className="opacity-60 hover:opacity-100 text-slate-400 hover:text-red-600 p-1 transition cursor-pointer shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Add New Void Condition Input Form */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newVoidConditionInput}
                        onChange={(e) => setNewVoidConditionInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddVoidCondition()
                          }
                        }}
                        placeholder="Add void condition"
                        className="flex-1 rounded-none border border-slate-300 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-amber-600 focus:ring-1 focus:ring-amber-600"
                      />
                      <button
                        type="button"
                        onClick={handleAddVoidCondition}
                        disabled={!newVoidConditionInput.trim()}
                        className="inline-flex items-center gap-1 rounded-none bg-amber-700 hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition cursor-pointer shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer-Facing Warranty Policy Terms */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-[#081F5C]" />
                    Official Warranty Policy &amp; Terms
                  </label>
                  <button
                    type="button"
                    onClick={handleResetWarrantyToDefault}
                    className="inline-flex items-center gap-1 text-[11px] text-[#081F5C] hover:underline cursor-pointer font-semibold"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset to Default Template
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={warrantySettings.warrantyPolicyTerms}
                  onChange={(e) =>
                    setWarrantySettings((prev) => ({ ...prev, warrantyPolicyTerms: e.target.value }))
                  }
                  className="w-full rounded-none border border-slate-300 px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#081F5C] focus:ring-2 focus:ring-[#081F5C]/15"
                  placeholder="Warranty terms"
                />
              </div>

              {/* Claim Resolution Flow Information */}
              <p className="text-[11px] text-slate-500">
                Customers file claims from completed bookings. Eligible rework is free of labor.
              </p>

              {/* Actions Footer */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
                <span className="text-xs text-slate-500 hidden sm:inline">
                  All changes are saved and applied to future customer bookings.
                </span>
                <button
                  type="submit"
                  disabled={isSavingWarranty}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-none bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  {isSavingWarranty ? 'Saving Policy...' : 'Save Warranty Settings'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* MODAL 1: OFFICIAL WARRANTY CERTIFICATE DIALOG                            */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        <ServiceWarrantyDialog
          open={Boolean(selectedWarrantyBooking)}
          onOpenChange={(open) => {
            if (!open) setSelectedWarrantyBooking(null)
          }}
          booking={selectedWarrantyBooking}
        />


      </main>
    </ShopOwnerDashboard>
  )
}
