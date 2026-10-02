import { useCallback, useEffect, useMemo, useState } from 'react'
import ShopOwnerDashboard from './dashboard.jsx'
import { cn } from '../../lib/utils'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../../components/ui/alert-dialog'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Checkbox } from '../../components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { Textarea } from '../../components/ui/textarea'
import { useSidebar } from '../../components/ui/sidebar.jsx'
import { toast } from 'sonner'
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Home,
  Mail,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  Tag,
  Trash2,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react'

const CATEGORIES = ['Appliance', 'Gadget', 'Vehicle', 'Others']
const SERVICE_LOCATIONS = [
  { value: 'home', label: 'Home service' },
  { value: 'in-shop', label: 'In-shop' },
  { value: 'both', label: 'Both Home service and in-shop' },
]

/** Same `value` keys as shop listings; labels match independent registration wording. */
const SERVICE_LOCATIONS_INDEPENDENT = [
  { value: 'home', label: 'Home Service' },
  { value: 'in-shop', label: 'On-call Mechanic/Technician location' },
  { value: 'both', label: 'Both (Home Service, On-call Mechanic/Technician location)' },
]

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

/** Navy gradient when a technician card is selected (matches shop primary actions). */
const TECH_CARD_NAVY_GRADIENT =
  'linear-gradient(135deg, #081F5C 0%, #0b2b73 42%, #1447a6 78%, #2a63cc 100%)'

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function mapServiceFromApi(doc) {
  if (!doc || !doc._id) return null
  const tid = (doc.technicianIds || []).map((x) =>
    typeof x === 'object' && x !== null && x._id != null ? String(x._id) : String(x),
  )
  const sp = doc.startingPrice
  const startingPrice =
    sp != null && Number.isFinite(Number(sp)) && Number(sp) > 0 ? Number(sp) : null
  const lm = doc.laborRatingMin
  const lx = doc.laborRatingMax
  const laborRatingMin =
    lm != null && Number.isFinite(Number(lm)) && Number(lm) >= 0 ? Number(lm) : null
  const laborRatingMax =
    lx != null && Number.isFinite(Number(lx)) && Number(lx) >= 0 ? Number(lx) : null
  return {
    id: String(doc._id),
    name: doc.name,
    category: doc.category,
    subcategory: doc.subcategory || '',
    description: doc.description,
    location: doc.location,
    status: doc.status,
    technicianIds: tid,
    createdAt: doc.createdAt,
    bookings: Number(doc.bookingsCount) || 0,
    rating: Number(doc.ratingAvg) || 0,
    startingPrice,
    laborRatingMin,
    laborRatingMax,
  }
}

function laborPriceInputsValid(minStr, maxStr) {
  const minRaw = String(minStr || '').trim()
  const maxRaw = String(maxStr || '').trim()
  const moneyPattern = /^\d{1,7}(\.\d{1,2})?$/
  if (!moneyPattern.test(minRaw) || !moneyPattern.test(maxRaw)) return false
  return Number(minRaw) <= Number(maxRaw)
}

function formatLaborPriceRangePhrase(minNum, maxNum) {
  const a = Number(minNum)
  const b = Number(maxNum)
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) return ''
  return `PHP ${a.toLocaleString()} – PHP ${b.toLocaleString()}`
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

/** Registered mechanic/technician (User) — same API as Manage Employee. */
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

/** Logged-in independent provider — assign services to yourself (API uses same `technicianIds`). */
function readProviderSelfEmployee() {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    const u = JSON.parse(raw)
    if (u.role !== 'oncall-mechanic-technician') return null
    const id = u.id != null ? String(u.id) : u._id != null ? String(u._id) : ''
    if (!id) return null
    return {
      id,
      name: u.fullName || u.email || 'You',
      skills: [],
      jobTitle: 'On-call Mechanic/Technician',
      email: (u.email && String(u.email).trim()) || '',
      phone: '',
      technicalSkillsText: '',
      rosterStatus: null,
      source: 'self',
      assignDisabled: false,
    }
  } catch {
    return null
  }
}

function rosterStatusPickerBadge(status, onNavy = false) {
  const t = 'shrink-0 text-[10px] font-medium'
  if (onNavy) {
    if (status === 'on-leave') {
      return (
        <Badge className={`${t} border border-amber-200/45 bg-amber-400/20 text-amber-50`}>
          On leave
        </Badge>
      )
    }
    if (status === 'inactive') {
      return (
        <Badge className={`${t} border border-white/35 bg-white/12 text-white/95`}>
          Inactive
        </Badge>
      )
    }
    return (
      <Badge className={`${t} border border-emerald-200/45 bg-emerald-400/20 text-emerald-50`}>
        Active
      </Badge>
    )
  }
  if (status === 'on-leave') {
    return (
      <Badge className="shrink-0 border border-amber-500/30 bg-amber-500/10 text-[10px] font-medium text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200">
        On leave
      </Badge>
    )
  }
  if (status === 'inactive') {
    return (
      <Badge className="shrink-0 border border-slate-400/30 bg-slate-100 text-[10px] font-medium text-slate-700 dark:border-white/15 dark:bg-white/10 dark:text-slate-300">
        Inactive
      </Badge>
    )
  }
  return (
    <Badge className="shrink-0 border border-emerald-500/30 bg-emerald-500/10 text-[10px] font-medium text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200">
      Active
    </Badge>
  )
}

function locationBadge(location, locations = SERVICE_LOCATIONS) {
  const label = locations.find((x) => x.value === location)?.label ?? '—'
  return (
    <Badge variant="outline" className="rounded-none border-indigo-200 bg-indigo-50/80 text-[11px] font-bold text-indigo-900">
      {label}
    </Badge>
  )
}

function statusBadge(status) {
  if (status === 'active') {
    return (
      <Badge className="rounded-none border border-emerald-300 bg-emerald-50 text-[11px] font-bold text-emerald-800">
        Active
      </Badge>
    )
  }
  return (
    <Badge className="rounded-none border border-slate-300 bg-slate-100 text-[11px] font-bold text-slate-600">
      Inactive
    </Badge>
  )
}

function categoryBadge(category) {
  const label = typeof category === 'string' && category.trim() ? category.trim() : '—'
  return (
    <Badge
      variant="outline"
      className="rounded-none border-slate-300 bg-slate-50 text-[11px] font-bold text-slate-800"
    >
      {label}
    </Badge>
  )
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

const STAT_CARD_GRADIENT = {
  services: "from-[#04133d] via-[#081F5C] to-[#1447a6] border-[#1447a6]/40",
  active: "from-emerald-600 via-teal-700 to-slate-950 border-emerald-400/30",
  inactive: "from-slate-600 via-slate-700 to-slate-900 border-slate-500/30",
  booked: "from-blue-600 via-indigo-700 to-slate-950 border-blue-400/30",
}

function StatGradientCard({ label, value, sub, helper, icon: Icon, variant, onClick, className }) {
  const gradient = STAT_CARD_GRADIENT[variant] ?? STAT_CARD_GRADIENT.services
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

const emptyForm = {
  name: '',
  category: '__',
  otherCategory: '',
  subcategory: '',
  description: '',
  location: '__',
  status: true, // switch
  laborRatingMin: '',
  laborRatingMax: '',
}

function ServicesSearchBar({ value, onChange }) {
  return (
    <div className="relative min-w-0 w-full max-w-full lg:max-w-lg lg:flex-1">
      <div className="relative w-full min-w-0 max-w-full">
        <Input
          className="h-9 w-full min-w-0 rounded-none border border-slate-200 bg-white pr-12 pl-3.5 text-xs font-medium text-slate-800 shadow-xs focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
          placeholder="Search services by title, category, subcategory…"
          value={value}
          onChange={onChange}
          aria-label="Search services"
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

export function ServicesCatalogBody({ variant = 'shop' }) {
  const sanitizePriceInput = useCallback((value) => {
    const raw = String(value || '')
    const digitsAndDot = raw.replace(/[^\d.]/g, '')
    const [whole = '', decimal = ''] = digitsAndDot.split('.')
    const cappedWhole = whole.slice(0, 7)
    return decimal ? `${cappedWhole}.${decimal.slice(0, 2)}` : cappedWhole
  }, [])

  const [services, setServices] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [actionError, setActionError] = useState('')

  const serviceLocations = useMemo(
    () => (variant === 'independent' ? SERVICE_LOCATIONS_INDEPENDENT : SERVICE_LOCATIONS),
    [variant],
  )

  /** Always you for independent listings. */
  const selfEmployee = variant === 'independent' ? readProviderSelfEmployee() : null

  const [categoryFilter, setCategoryFilter] = useState('__')
  const [statusFilter, setStatusFilter] = useState('__')
  const [locationFilter, setLocationFilter] = useState('__')
  const [sortBy, setSortBy] = useState('most-booked')
  const [q, setQ] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [viewing, setViewing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)

  // Walk-in Customer Dialog State
  const [walkInTarget, setWalkInTarget] = useState(null)
  const [walkInSubmitting, setWalkInSubmitting] = useState(false)
  const [walkInError, setWalkInError] = useState('')
  const [walkInForm, setWalkInForm] = useState({
    contactName: '',
    contactPhone: '',
    preferredDate: '',
    preferredTime: '',
    serviceMode: 'in-shop',
    serviceAddress: '',
    status: 'confirmed',
    assignedTechnician: '',
    problemDescription: '',
    notes: '',
  })

  const openWalkIn = (service) => {
    setWalkInTarget(service)
    setWalkInError('')
    const now = new Date()
    const ymd = now.toISOString().slice(0, 10)
    const hhmm = now.toTimeString().slice(0, 5)
    setWalkInForm({
      contactName: '',
      contactPhone: '',
      preferredDate: ymd,
      preferredTime: hhmm,
      serviceMode: service.location === 'home' ? 'home' : 'in-shop',
      serviceAddress: '',
      status: 'confirmed',
      assignedTechnician: '',
      problemDescription: '',
      notes: '',
    })
  }

  const submitWalkIn = async () => {
    if (!walkInTarget) return
    setWalkInSubmitting(true)
    setWalkInError('')
    try {
      const endpoint =
        variant === 'independent'
          ? `${API_URL}/api/mechanic/bookings/walkin`
          : `${API_URL}/api/shop/bookings/walkin`
      const payload = {
        shopServiceId: walkInTarget.id,
        contactName: walkInForm.contactName.trim(),
        contactPhone: walkInForm.contactPhone.trim(),
        preferredDate: walkInForm.preferredDate,
        preferredTime: walkInForm.preferredTime,
        serviceMode: walkInForm.serviceMode,
        serviceAddress: walkInForm.serviceMode === 'home' ? walkInForm.serviceAddress.trim() : '',
        status: walkInForm.status,
        assignedTechnician: walkInForm.assignedTechnician,
        problemDescription: walkInForm.problemDescription.trim(),
        notes: walkInForm.notes.trim(),
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || 'Could not record walk-in customer.')
      }
      setWalkInTarget(null)
      toast.success('Walk-in customer recorded successfully! It is now saved in Service Requests.')
      void loadCatalog()
    } catch (err) {
      setWalkInError(err?.message || 'Could not record walk-in customer.')
    } finally {
      setWalkInSubmitting(false)
    }
  }

  const loadCatalog = useCallback(async () => {
    setListError('')
    const token = localStorage.getItem('token')
    if (!token) {
      window.location.hash = '#/login'
      return
    }
    setLoading(true)
    try {
      if (variant === 'independent') {
        const svcRes = await fetch(`${API_URL}/api/shop/services`, { headers: authHeaders() })
        if (!svcRes.ok) {
          const err = await svcRes.json().catch(() => ({}))
          throw new Error(err?.message || 'Could not load services.')
        }
        const svcData = await svcRes.json()
        setServices((svcData || []).map(mapServiceFromApi).filter(Boolean))
        const selfRow = readProviderSelfEmployee()
        setEmployees(selfRow ? [selfRow] : [])
      } else {
        const [svcRes, empRes, regRes] = await Promise.all([
          fetch(`${API_URL}/api/shop/services`, { headers: authHeaders() }),
          fetch(`${API_URL}/api/shop/employees`, { headers: authHeaders() }),
          fetch(`${API_URL}/api/shop/registered-mechanics`, { headers: authHeaders() }),
        ])
        if (!svcRes.ok) {
          const err = await svcRes.json().catch(() => ({}))
          throw new Error(err?.message || 'Could not load services.')
        }
        const svcData = await svcRes.json()
        const empData = empRes.ok ? await empRes.json().catch(() => []) : []
        const regData = regRes.ok ? await regRes.json().catch(() => []) : []
        const manual = (empData || []).map(mapEmployeeFromApi).filter(Boolean)
        const registered = Array.isArray(regData) ? regData.map(mapRegisteredMechanicForPicker).filter(Boolean) : []
        setServices((svcData || []).map(mapServiceFromApi).filter(Boolean))
        setEmployees([...registered, ...manual])
      }
    } catch (e) {
      setListError(e?.message || 'Could not load catalog.')
      setServices([])
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }, [variant])

  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])

  const stats = useMemo(() => {
    const total = services.length
    const active = services.filter((s) => s.status === 'active').length
    const inactive = services.filter((s) => s.status === 'inactive').length
    const totalBookings = services.reduce((sum, s) => sum + (s.bookings || 0), 0)
    return { total, active, inactive, totalBookings }
  }, [services])

  const filtered = useMemo(() => {
    const catOk = categoryFilter === '__' || categoryFilter === '' ? null : categoryFilter
    const statusOk = statusFilter === '__' || statusFilter === '' ? null : statusFilter
    const locOk = locationFilter === '__' || locationFilter === '' ? null : locationFilter
    const query = q.trim().toLowerCase()

    const base = services.filter((s) => {
      if (catOk && s.category !== catOk) return false
      if (statusOk && s.status !== statusOk) return false
      if (locOk && s.location !== locOk) return false
      if (!query) return true
      return (
        s.name.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query) ||
        (s.subcategory && s.subcategory.toLowerCase().includes(query)) ||
        (s.description && s.description.toLowerCase().includes(query))
      )
    })

    const sorted = [...base]
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        break
      case 'most-booked':
      default:
        sorted.sort((a, b) => (b.bookings || 0) - (a.bookings || 0))
        break
    }
    return sorted
  }, [services, categoryFilter, statusFilter, locationFilter, q, sortBy])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (service) => {
    setEditingId(service.id)
    const isOther = typeof service.category === 'string' && service.category !== 'Appliance' && service.category !== 'Gadget' && service.category !== 'Vehicle' && service.category !== 'Others'
    setForm({
      name: service.name ?? '',
      category: isOther ? 'Others' : (service.category ?? CATEGORIES[2]),
      otherCategory: isOther ? String(service.category ?? '').trim() : '',
      subcategory: service.subcategory ?? '',
      description: service.description ?? '',
      location: service.location ?? '__',
      status: service.status === 'active',
      laborRatingMin:
        service.laborRatingMin != null && service.laborRatingMin !== ''
          ? String(service.laborRatingMin)
          : '',
      laborRatingMax:
        service.laborRatingMax != null && service.laborRatingMax !== ''
          ? String(service.laborRatingMax)
          : '',
    })
    setFormOpen(true)
  }

  const upsertService = async () => {
    const name = form.name.trim()
    const description = form.description.trim()
    if (!name || !description) return
    if (!form.category || form.category === '__') return
    if (!form.location || form.location === '__') return
    if (form.category === 'Others' && !form.otherCategory.trim()) return
    if (!laborPriceInputsValid(form.laborRatingMin, form.laborRatingMax)) {
      setActionError('Enter a valid labor price range (minimum and maximum in PHP).')
      return
    }

    const computedCategory = form.category === 'Others' ? form.otherCategory.trim() : form.category
    const minLabor = Number(String(form.laborRatingMin || '').trim())
    const maxLabor = Number(String(form.laborRatingMax || '').trim())
    const payload = {
      name,
      category: computedCategory,
      subcategory: form.subcategory.trim(),
      description,
      location: form.location,
      requirements: '',
      status: form.status ? 'active' : 'inactive',
      laborRatingMin: minLabor,
      laborRatingMax: maxLabor,
    }

    setActionError('')
    setSaving(true)
    try {
      if (editingId) {
        const res = await fetch(`${API_URL}/api/shop/services/${editingId}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.message || 'Could not update service.')
        }
        const doc = await res.json()
        const mapped = mapServiceFromApi(doc)
        setServices((prev) => prev.map((s) => (s.id === editingId ? mapped : s)))
      } else {
        const res = await fetch(`${API_URL}/api/shop/services`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err?.message || 'Could not create service.')
        }
        const doc = await res.json()
        const mapped = mapServiceFromApi(doc)
        setServices((prev) => [mapped, ...prev])
      }
      setFormOpen(false)
    } catch (e) {
      setActionError(e?.message || 'Request failed.')
    } finally {
      setSaving(false)
    }
  }

  const toggleServiceStatus = async (service) => {
    const nextStatus = service.status === 'active' ? 'inactive' : 'active'
    setActionError('')
    try {
      const res = await fetch(`${API_URL}/api/shop/services/${service.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.message || 'Could not update status.')
      }
      const doc = await res.json()
      const mapped = mapServiceFromApi(doc)
      setServices((prev) => prev.map((s) => (s.id === service.id ? mapped : s)))
      setViewing((v) => (v?.id === service.id ? mapped : v))
    } catch (e) {
      setActionError(e?.message || 'Request failed.')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setActionError('')
    try {
      const res = await fetch(`${API_URL}/api/shop/services/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.message || 'Could not delete service.')
      }
      setServices((prev) => prev.filter((s) => s.id !== deleteTarget.id))
      if (viewing?.id === deleteTarget.id) setViewing(null)
      setDeleteTarget(null)
    } catch (e) {
      setActionError(e?.message || 'Request failed.')
    }
  }

  return (
    <>
      <main className="w-full min-w-0 max-w-full space-y-3 sm:space-y-4 overflow-x-hidden">
        {listError ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span>{listError}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => loadCatalog()}>
              Retry
            </Button>
          </div>
        ) : null}
        {actionError ? (
          <div className="rounded-sm border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm text-amber-950 dark:text-amber-100">
            {actionError}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
          <StatGradientCard
            variant="services"
            label="Total services"
            value={stats.total}
            helper={variant === 'independent' ? 'Your listings as an independent provider' : 'Items listed in your catalog'}
            icon={Wrench}
            onClick={() => setStatusFilter('')}
          />
          <StatGradientCard
            variant="active"
            label="Active services"
            value={stats.active}
            helper="Visible to customers"
            icon={CheckCircle}
            onClick={() => setStatusFilter(statusFilter === 'active' ? '' : 'active')}
          />
          <StatGradientCard
            variant="inactive"
            label="Inactive services"
            value={stats.inactive}
            helper="Not bookable right now"
            icon={PauseCircle}
            onClick={() => setStatusFilter(statusFilter === 'inactive' ? '' : 'inactive')}
          />
          <StatGradientCard
            variant="booked"
            label="Total bookings"
            value={stats.totalBookings}
            helper={variant === 'independent' ? 'Recorded across your offered services' : 'Recorded for your catalog'}
            icon={Users}
          />
        </div>

        <div className="mb-1 flex min-w-0 max-w-full flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-stretch lg:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-1 sm:flex-row sm:flex-wrap sm:gap-3 min-w-0 w-full max-w-full">
            <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[140px] sm:flex-1 sm:max-w-[200px]">
              <select
                className={selectShell}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value === '' ? '__' : e.target.value)}
              >
                <option value="__" disabled hidden>
                  Category
                </option>
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[130px] sm:flex-1 sm:max-w-[180px]">
              <select
                className={selectShell}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value === '' ? '__' : e.target.value)}
              >
                <option value="__" disabled hidden>
                  Status
                </option>
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[210px]">
              <select
                className={selectShell}
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value === '' ? '__' : e.target.value)}
              >
                <option value="__" disabled hidden>
                  Service type
                </option>
                <option value="">All service types</option>
                {serviceLocations.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[140px] sm:flex-1 sm:max-w-[200px]">
              <select className={selectShell} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="most-booked">Sort: Most booked</option>
                <option value="newest">Sort: Newest</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <ServicesSearchBar value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="mt-3 min-w-0 max-w-full space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-[#081F5C] dark:text-slate-50">Service catalog</p>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                {variant === 'independent'
                  ? 'These services appear to customers on Find Services. You are always the performing technician for your listings.'
                  : 'Customers use these services to search and book. Use status and technicians to control assignments.'}
              </p>
            </div>
            <Button
              type="button"
              onClick={openCreate}
              className="inline-flex w-full sm:w-auto shrink-0 items-center justify-center gap-1.5 rounded-none bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 text-xs font-bold text-white shadow-md cursor-pointer transition-colors"
            >
              <Plus className="size-4" />
              <span>Add Service</span>
            </Button>
          </div>

          {loading ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-none border border-dashed border-slate-300 bg-slate-50 p-6 text-center shadow-2xs">
              <p className="text-sm font-bold text-slate-800">Loading catalog…</p>
              <p className="mt-1 max-w-md text-xs text-slate-500">Fetching services from the server.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[140px] flex-col items-center justify-center rounded-none border border-dashed border-slate-300 bg-slate-50 p-6 text-center shadow-2xs">
              <p className="text-sm font-bold text-slate-800">No services found</p>
              <p className="mt-1 max-w-md text-xs text-slate-500">
                Try adjusting your filters or search keywords, or add a new service to get started.
              </p>
              <Button
                type="button"
                onClick={openCreate}
                className="mt-3 inline-flex items-center gap-1.5 rounded-none bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-md cursor-pointer"
              >
                <Plus className="size-4" />
                <span>Add Your First Service</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((service) => (
                <article
                  key={service.id}
                  className="rounded-none border border-slate-200 bg-white p-3 sm:p-4 shadow-[0_3px_8px_rgba(15,23,42,0.12)] transition-all duration-200 hover:border-indigo-500 hover:shadow-[0_6px_16px_rgba(8,31,92,0.18)] hover:-translate-y-0.5 space-y-3 sm:space-y-4"
                >
                  {/* Card Header Row */}
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <h3 className="truncate text-sm font-black tracking-tight text-slate-900 sm:text-lg">
                          {service.name}
                        </h3>
                        {service.subcategory ? (
                          <span className="text-[10px] sm:text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 sm:px-2 py-0.5 rounded-none">
                            {service.subcategory}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                        {categoryBadge(service.category)}
                        {locationBadge(service.location, serviceLocations)}
                        {statusBadge(service.status)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 rounded-none cursor-pointer"
                            aria-label="More actions"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-none text-xs">
                          <DropdownMenuItem className="gap-2 text-xs cursor-pointer text-amber-700 font-semibold" onClick={() => openWalkIn(service)}>
                            <UserPlus className="size-4 text-amber-600" />
                            Record Walk-in
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={() => setViewing(service)}>
                            <Wrench className="size-4 text-indigo-600" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={() => openEdit(service)}>
                            <Pencil className="size-4 text-slate-600" />
                            Edit Service
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-xs cursor-pointer" onClick={() => toggleServiceStatus(service)}>
                            <CheckCircle className="size-4 text-emerald-600" />
                            {service.status === 'active' ? 'Disable Service' : 'Enable Service'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" className="gap-2 text-xs cursor-pointer" onClick={() => setDeleteTarget(service)}>
                            <Trash2 className="size-4" />
                            Delete Service
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* 3-Column Body Grid in Individual Container Boxes */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3.5 text-xs">
                    {/* Column 1: Description Container */}
                    <div className="bg-slate-50/80 p-3 sm:p-3.5 border border-slate-200 space-y-2 rounded-none flex flex-col justify-between">
                      <div>
                        <span className="font-extrabold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5 pb-1">
                          <FileText className="size-4 text-indigo-600" />
                          <span>Service Description</span>
                        </span>
                        <p className="text-slate-700 line-clamp-3 text-xs leading-relaxed pt-0.5">
                          {service.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>

                    {/* Column 2: Labor Price Container */}
                    <div className="bg-slate-50/80 p-3 sm:p-3.5 border border-slate-200 space-y-2 rounded-none flex flex-col justify-between">
                      <div>
                        <span className="font-extrabold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5 pb-1">
                          <DollarSign className="size-4 text-indigo-600" />
                          <span>Labor Price Range</span>
                        </span>
                        <div className="pt-1">
                          {formatLaborPriceRangePhrase(service.laborRatingMin, service.laborRatingMax) ? (
                            <span className="text-sm font-black text-indigo-700">
                              {formatLaborPriceRangePhrase(service.laborRatingMin, service.laborRatingMax)}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Not set</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Service Details & Availability */}
                    <div className="bg-slate-50/80 p-3 sm:p-3.5 border border-slate-200 space-y-2 rounded-none flex flex-col justify-between">
                      <div>
                        <span className="font-extrabold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5 pb-1">
                          <Home className="size-4 text-indigo-600" />
                          <span>Service Details</span>
                        </span>
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">Type:</span>
                            <span className="font-bold text-slate-800">
                              {serviceLocations.find((x) => x.value === service.location)?.label ?? 'Standard'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">Status:</span>
                            <span className={cn("font-bold", service.status === 'active' ? "text-emerald-700" : "text-slate-500")}>
                              {service.status === 'active' ? 'Active · Bookable' : 'Disabled'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">Bookings:</span>
                            <span className="font-bold text-indigo-700">
                              {service.bookings || 0} recorded
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Controls Footer */}
                  <div className="pt-2 flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => openWalkIn(service)}
                      className="flex-1 sm:flex-none justify-center rounded-none bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs cursor-pointer shadow-2xs border border-amber-600/30"
                    >
                      <UserPlus className="size-3.5 mr-1" />
                      <span>Walk-in Customer</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setViewing(service)}
                      className="flex-1 sm:flex-none justify-center rounded-none border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      <Wrench className="size-3.5 mr-1" />
                      <span>View Details</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(service)}
                      className="flex-1 sm:flex-none justify-center rounded-none border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      <Pencil className="size-3.5 mr-1" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => toggleServiceStatus(service)}
                      className={cn(
                        "flex-1 sm:flex-none justify-center rounded-none text-xs font-bold text-white cursor-pointer shadow-2xs",
                        service.status === 'active'
                          ? "bg-slate-700 hover:bg-slate-800"
                          : "bg-indigo-600 hover:bg-indigo-700"
                      )}
                    >
                      <CheckCircle className="size-3.5 mr-1" />
                      <span>{service.status === 'active' ? 'Disable' : 'Enable'}</span>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create / Edit Service Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-[calc(100vw-1rem)] flex-col gap-4 overflow-hidden sm:max-w-2xl rounded-none border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl" showCloseButton>
          <DialogHeader className="shrink-0 border-b border-slate-100 pb-3.5">
            <DialogTitle className="text-xl font-black tracking-tight text-slate-900">
              {editingId ? 'Edit Service Listing' : 'Add New Service Listing'}
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500 mt-0.5">
              {variant === 'independent'
                ? 'Changes are saved for your independent provider account.'
                : 'Changes are saved to the server for your shop catalog.'}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
            <div className="grid gap-4 text-xs sm:text-sm">
              <div className="grid gap-1.5">
                <Label htmlFor="svc-name" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Service Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="svc-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder='e.g. "Motorcycle Tune-up"'
                  className="rounded-none border-slate-300 text-xs font-semibold shadow-2xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="svc-category" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Category <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <select
                      id="svc-category"
                      className={`${selectShell} ${form.category === '__' ? 'text-slate-400' : 'text-slate-900 font-bold'}`}
                      value={form.category}
                      onChange={(e) => {
                        const nextCategory = e.target.value
                        setForm((f) => ({ ...f, category: nextCategory, otherCategory: nextCategory === 'Others' ? f.otherCategory : '' }))
                      }}
                    >
                      <option value="__" disabled hidden>
                        Select Category
                      </option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="svc-subcategory" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Subcategory (optional)
                  </Label>
                  <Input
                    id="svc-subcategory"
                    value={form.subcategory}
                    onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
                    placeholder='e.g. "Phone", "Motorcycle", "Laundry"'
                    className="rounded-none border-slate-300 text-xs font-semibold shadow-2xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {form.category === 'Others' && (
                <div className="grid gap-1.5">
                  <Label htmlFor="svc-other-category" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Other Category Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="svc-other-category"
                    value={form.otherCategory}
                    onChange={(e) => setForm((f) => ({ ...f, otherCategory: e.target.value }))}
                    placeholder='Type category (e.g. "Computer", "Plumbing")'
                    className="rounded-none border-slate-300 text-xs font-semibold shadow-2xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              )}

              <div className="grid gap-1.5">
                <Label htmlFor="svc-desc" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Short Description <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  id="svc-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe what is included in this service, procedure, and scope..."
                  rows={3}
                  className="rounded-none border-slate-300 text-xs font-medium shadow-2xs focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="bg-slate-50/80 p-3.5 border border-slate-200 rounded-none space-y-2">
                <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center justify-between">
                  <span>Labor Price Range (PHP) <span className="text-rose-500">*</span></span>
                </Label>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Shown to customers on Find Services. Enter the typical labor fee range for this service.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
                  <div className="grid gap-1">
                    <Label htmlFor="svc-labor-min" className="text-[11px] font-bold uppercase text-slate-600">
                      Minimum Fee
                    </Label>
                    <Input
                      id="svc-labor-min"
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g. 300"
                      value={form.laborRatingMin}
                      onChange={(e) => setForm((f) => ({ ...f, laborRatingMin: sanitizePriceInput(e.target.value) }))}
                      className="rounded-none border-slate-300 bg-white text-xs font-bold shadow-2xs focus:border-indigo-600"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="svc-labor-max" className="text-[11px] font-bold uppercase text-slate-600">
                      Maximum Fee
                    </Label>
                    <Input
                      id="svc-labor-max"
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g. 1500"
                      value={form.laborRatingMax}
                      onChange={(e) => setForm((f) => ({ ...f, laborRatingMax: sanitizePriceInput(e.target.value) }))}
                      className="rounded-none border-slate-300 bg-white text-xs font-bold shadow-2xs focus:border-indigo-600"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="svc-location" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Service Location Type <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <select
                    id="svc-location"
                    className={`${selectShell} ${form.location === '__' ? 'text-slate-400' : 'text-slate-900 font-bold'}`}
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  >
                    <option value="__" disabled hidden>
                      Select Type of Service
                    </option>
                    {serviceLocations.map((x) => (
                      <option key={x.value} value={x.value}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                  <Home className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="bg-slate-50/80 p-3.5 border border-slate-200 rounded-none flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Active Service Listing</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">When disabled/inactive, customers cannot book this service.</p>
                </div>
                <Switch checked={form.status} onCheckedChange={(checked) => setForm((f) => ({ ...f, status: checked }))} />
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 border-t border-slate-100 pt-3.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
              className="w-full sm:w-auto rounded-none border-slate-300 text-xs font-bold px-4 py-2 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void upsertService()}
              disabled={
                saving ||
                !form.name.trim() ||
                !form.description.trim() ||
                !form.category ||
                form.category === '__' ||
                !form.location ||
                form.location === '__' ||
                (form.category === 'Others' && !form.otherCategory.trim()) ||
                !laborPriceInputsValid(form.laborRatingMin, form.laborRatingMax)
              }
              className="w-full sm:w-auto rounded-none bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2 shadow-md shadow-indigo-900/20 cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Service Details Dialog */}
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="flex max-h-[90vh] max-w-[calc(100vw-1rem)] flex-col gap-4 overflow-hidden sm:max-w-2xl rounded-none border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl" showCloseButton>
          {viewing ? (
            <>
              <DialogHeader className="shrink-0 border-b border-slate-100 pb-3.5">
                <DialogTitle className="text-xl font-black text-slate-900">{viewing.name}</DialogTitle>
                <DialogDescription className="text-xs font-semibold text-indigo-700 mt-0.5">
                  Category: {viewing.category}
                  {viewing.subcategory ? ` • Subcategory: ${viewing.subcategory}` : ''}
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 space-y-4 text-xs sm:text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {categoryBadge(viewing.category)}
                  {locationBadge(viewing.location, serviceLocations)}
                  {statusBadge(viewing.status)}
                  <Badge
                    variant="outline"
                    className="rounded-none border-indigo-200 bg-indigo-50 text-[11px] font-bold text-indigo-900"
                  >
                    {viewing.bookings ?? 0} Bookings
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-none border-amber-200 bg-amber-50 text-[11px] font-bold text-amber-900"
                  >
                    {typeof viewing.rating === 'number' && viewing.rating > 0 ? `★ ${viewing.rating.toFixed(1)} Rating` : 'No ratings yet'}
                  </Badge>
                </div>

                <div className="bg-slate-50/80 p-4 border border-slate-200 rounded-none space-y-3">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Description</p>
                    <p className="mt-1 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">{viewing.description}</p>
                  </div>
                  {formatLaborPriceRangePhrase(viewing.laborRatingMin, viewing.laborRatingMax) ? (
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Labor Price Range</p>
                      <p className="mt-1 text-sm font-black text-indigo-700">
                        {formatLaborPriceRangePhrase(viewing.laborRatingMin, viewing.laborRatingMax)}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-none border border-slate-200 bg-slate-50/80 p-4 space-y-2 text-xs">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                    Mechanic & Technician Assignment
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    Mechanics and technicians are assigned directly per booking request when you review and confirm requests under <strong className="text-slate-800">Service Requests</strong>.
                  </p>
                </div>
              </div>

              <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 border-t border-slate-100 pt-3.5">
                <Button type="button" variant="outline" onClick={() => setViewing(null)} className="w-full sm:w-auto rounded-none border-slate-300 text-xs font-bold px-4 py-2 cursor-pointer">
                  Close
                </Button>
                <Button type="button" variant="outline" onClick={() => viewing && toggleServiceStatus(viewing)} className="w-full sm:w-auto rounded-none border-slate-300 text-xs font-bold px-4 py-2 cursor-pointer">
                  {viewing.status === 'active' ? 'Disable Service' : 'Enable Service'}
                </Button>
                <Button type="button" onClick={() => viewing && openEdit(viewing)} className="w-full sm:w-auto rounded-none bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2 shadow-md cursor-pointer">
                  Edit Service
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-none border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl max-w-[calc(100vw-1rem)] sm:max-w-md">
          <AlertDialogHeader className="border-b border-slate-100 pb-3">
            <AlertDialogTitle className="text-lg font-black text-slate-900">Delete Service Listing?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 mt-1">
              {deleteTarget ? `Are you sure you want to delete "${deleteTarget.name}"? It will be permanently removed from your catalog.` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-3 flex flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto rounded-none border-slate-300 text-xs font-bold cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete} className="w-full sm:w-auto rounded-none bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 cursor-pointer">
              Yes, Delete Service
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Record Walk-in Customer Dialog */}
      <Dialog open={!!walkInTarget} onOpenChange={(open) => !open && setWalkInTarget(null)}>
        <DialogContent
          className="flex max-h-[90vh] max-w-[calc(100vw-1rem)] flex-col gap-4 overflow-hidden sm:max-w-xl rounded-none border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl"
          showCloseButton
        >
          {walkInTarget && (
            <>
              <DialogHeader className="shrink-0 border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-none bg-amber-100 text-amber-900 border border-amber-300">
                    <UserPlus className="size-5 text-amber-700" />
                  </span>
                  <div>
                    <DialogTitle className="text-xl font-black tracking-tight text-slate-900">
                      Record Walk-in Customer
                    </DialogTitle>
                    <DialogDescription className="text-xs font-semibold text-slate-500 mt-0.5">
                      Service: <span className="font-extrabold text-indigo-700">{walkInTarget.name}</span> ({walkInTarget.category})
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {walkInError && (
                <div className="rounded-none border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  {walkInError}
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="walkin-name" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Customer Name <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="walkin-name"
                      placeholder="e.g. Juan Dela Cruz"
                      value={walkInForm.contactName}
                      onChange={(e) => setWalkInForm((f) => ({ ...f, contactName: e.target.value }))}
                      className="rounded-none border-slate-300 text-xs font-semibold focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="walkin-phone" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Contact Phone <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="walkin-phone"
                      placeholder="e.g. 0912 345 6789"
                      value={walkInForm.contactPhone}
                      onChange={(e) => setWalkInForm((f) => ({ ...f, contactPhone: e.target.value }))}
                      className="rounded-none border-slate-300 text-xs font-semibold focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="walkin-date" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Date <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="walkin-date"
                      type="date"
                      value={walkInForm.preferredDate}
                      onChange={(e) => setWalkInForm((f) => ({ ...f, preferredDate: e.target.value }))}
                      className="rounded-none border-slate-300 text-xs font-semibold focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="walkin-time" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Time <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="walkin-time"
                      type="time"
                      value={walkInForm.preferredTime}
                      onChange={(e) => setWalkInForm((f) => ({ ...f, preferredTime: e.target.value }))}
                      className="rounded-none border-slate-300 text-xs font-semibold focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="walkin-status" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Initial Status
                    </Label>
                    <div className="relative">
                      <select
                        id="walkin-status"
                        className={selectShell}
                        value={walkInForm.status}
                        onChange={(e) => setWalkInForm((f) => ({ ...f, status: e.target.value }))}
                      >
                        <option value="confirmed">Confirmed (In Queue)</option>
                        <option value="working">Working (In Progress)</option>
                        <option value="pending">Pending</option>
                      </select>
                      <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  {variant !== 'independent' && (
                    <div className="grid gap-1.5">
                      <Label htmlFor="walkin-tech" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                        Assign Technician (Optional)
                      </Label>
                      <div className="relative">
                        <select
                          id="walkin-tech"
                          className={selectShell}
                          value={walkInForm.assignedTechnician}
                          onChange={(e) => setWalkInForm((f) => ({ ...f, assignedTechnician: e.target.value }))}
                        >
                          <option value="">-- Assign Later --</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id} disabled={emp.assignDisabled}>
                              {emp.name} {emp.jobTitle ? `(${emp.jobTitle})` : ''}
                            </option>
                          ))}
                        </select>
                        <Users className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="walkin-problem" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Issue / Service Description <span className="text-rose-500">*</span>
                  </Label>
                  <Textarea
                    id="walkin-problem"
                    rows={2}
                    placeholder="Describe issue, procedure, or request requested by walk-in customer..."
                    value={walkInForm.problemDescription}
                    onChange={(e) => setWalkInForm((f) => ({ ...f, problemDescription: e.target.value }))}
                    className="rounded-none border-slate-300 text-xs font-medium focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="walkin-notes" className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Additional Notes / Device or Vehicle Details (Optional)
                  </Label>
                  <Input
                    id="walkin-notes"
                    placeholder="e.g. Model, Plate Number, Serial Number, or special instructions"
                    value={walkInForm.notes}
                    onChange={(e) => setWalkInForm((f) => ({ ...f, notes: e.target.value }))}
                    className="rounded-none border-slate-300 text-xs font-medium focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 border-t border-slate-100 pt-3.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWalkInTarget(null)}
                  className="w-full sm:w-auto rounded-none border-slate-300 text-xs font-bold px-4 py-2 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void submitWalkIn()}
                  disabled={
                    walkInSubmitting ||
                    !walkInForm.contactName.trim() ||
                    !walkInForm.contactPhone.trim() ||
                    !walkInForm.problemDescription.trim()
                  }
                  className="w-full sm:w-auto rounded-none bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-5 py-2 shadow-md shadow-amber-900/20 cursor-pointer disabled:opacity-50"
                >
                  {walkInSubmitting ? 'Recording…' : 'Save Walk-in Record'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function ServicesPage() {
  return (
    <ShopOwnerDashboard
      activeSection="services"
      pageMeta={{
        title: 'Services',
        description: 'Manage your service catalog for customer search and bookings.',
      }}
    >
      <ServicesCatalogBody variant="shop" />
    </ShopOwnerDashboard>
  )
}
