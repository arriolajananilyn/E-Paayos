import { useCallback, useEffect, useMemo, useState } from 'react'
import ShopOwnerDashboard from './dashboard.jsx'
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
import {
  CheckCircle,
  Clock,
  Home,
  Mail,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
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
  { value: 'in-shop', label: 'Independent Mechanic/Technician location' },
  { value: 'both', label: 'Both (Home Service, Independent Mechanic/Technician location)' },
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
  }
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
    if (u.role !== 'independent-mechanic-technician') return null
    const id = u.id != null ? String(u.id) : u._id != null ? String(u._id) : ''
    if (!id) return null
    return {
      id,
      name: u.fullName || u.email || 'You',
      skills: [],
      jobTitle: 'Independent mechanic / technician',
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
    <Badge variant="outline" className="border-[#081F5C]/15 bg-white/90 text-[11px] font-medium text-[#081F5C] dark:border-white/10 dark:bg-white/5 dark:text-blue-100">
      {label}
    </Badge>
  )
}

function statusBadge(status) {
  if (status === 'active') {
    return (
      <Badge className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-200">
        Active
      </Badge>
    )
  }
  return (
    <Badge className="border border-slate-500/25 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
      Inactive
    </Badge>
  )
}

function categoryBadge(category) {
  const label = typeof category === 'string' && category.trim() ? category.trim() : '—'
  return (
    <Badge
      variant="outline"
      className="border-[#1447a6]/25 bg-white/95 text-[11px] font-medium text-[#081F5C] dark:border-[#1447a6]/40 dark:bg-[#04133d]/40 dark:text-blue-100"
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
  services: 'bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6]',
  active: 'bg-linear-to-br from-emerald-600 via-teal-600 to-emerald-800',
  inactive: 'bg-linear-to-br from-slate-600 via-slate-700 to-slate-900',
  booked: 'bg-linear-to-br from-sky-500 via-blue-500 to-indigo-600',
}

function StatGradientCard({ label, value, icon: Icon, variant, helper }) {
  const gradient = STAT_CARD_GRADIENT[variant] ?? STAT_CARD_GRADIENT.services
  return (
    <div className={`relative min-h-[112px] min-w-0 overflow-hidden rounded-2xl border border-white/15 p-5 shadow-md transition-shadow duration-300 hover:shadow-lg sm:min-h-[128px] sm:p-6 ${gradient}`}>
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/12 to-transparent" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-white/85">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-white tabular-nums sm:text-3xl">{value}</p>
          {helper ? <p className="mt-1 line-clamp-1 text-[11px] text-white/80">{helper}</p> : null}
        </div>
        <div className="shrink-0 rounded-xl border border-white/25 bg-white/15 p-3 shadow-inner backdrop-blur-sm">
          <Icon className="h-5 w-5 text-white" aria-hidden />
        </div>
      </div>
    </div>
  )
}

const selectShell =
  'h-9 w-full appearance-none rounded-lg border border-[#081F5C]/15 bg-white/95 px-3 py-2 pr-8 text-xs sm:text-sm shadow-sm outline-none focus-visible:border-[#1447a6]/50 focus-visible:ring-2 focus-visible:ring-[#081F5C]/20 dark:border-white/10 dark:bg-[#04133d]/30'

const emptyForm = {
  name: '',
  category: '__',
  otherCategory: '',
  subcategory: '',
  description: '',
  location: '__',
  status: true, // switch
  technicianIds: [],
}

function ServicesSearchBar({ value, onChange }) {
  const { state: sidebarState } = useSidebar()
  const lgWidthClass = sidebarState === 'collapsed' ? 'lg:w-[500px] lg:max-w-[520px]' : 'lg:w-[360px] lg:max-w-[360px]'

  return (
    <div className={`flex w-full min-w-0 flex-1 flex-col gap-2 self-stretch lg:flex-none ${lgWidthClass}`}>
      <div className="relative h-9 w-full min-w-0 shrink-0">
        <Input
          className="h-9 w-full min-w-0 rounded-lg border-[#081F5C]/15 bg-white/95 pr-12 pl-4 text-sm shadow-sm focus-visible:border-[#1447a6]/45 focus-visible:ring-[#081F5C]/15 dark:border-white/10 dark:bg-[#04133d]/25"
          placeholder="Search services…"
          value={value}
          onChange={onChange}
          aria-label="Search services"
        />
        <Button
          type="button"
          size="icon-sm"
          className="pointer-events-none absolute top-1/2 right-1.5 z-10 h-7 w-7 -translate-y-1/2 rounded-md bg-linear-to-r from-[#081F5C] to-[#1447a6] p-0 shadow-sm"
          aria-hidden
          tabIndex={-1}
        >
          <Search className="h-4 w-4 text-white" />
        </Button>
      </div>
    </div>
  )
}

export function ServicesCatalogBody({ variant = 'shop' }) {
  const [services, setServices] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [actionError, setActionError] = useState('')

  const serviceLocations = useMemo(
    () => (variant === 'independent' ? SERVICE_LOCATIONS_INDEPENDENT : SERVICE_LOCATIONS),
    [variant],
  )

  /** Always you for independent listings (even if `technicianIds` not yet backfilled). */
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
        if (!empRes.ok) {
          const err = await empRes.json().catch(() => ({}))
          throw new Error(err?.message || 'Could not load employees.')
        }
        const svcData = await svcRes.json()
        const empData = await empRes.json()
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
    const selfId = variant === 'independent' ? readProviderSelfEmployee()?.id : null
    setForm({
      ...emptyForm,
      technicianIds: selfId ? [selfId] : [],
    })
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
      technicianIds: service.technicianIds ?? [],
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

    const computedCategory = form.category === 'Others' ? form.otherCategory.trim() : form.category
    const selfId = readProviderSelfEmployee()?.id
    const technicianIds =
      variant === 'independent' ? (selfId ? [selfId] : []) : form.technicianIds
    const payload = {
      name,
      category: computedCategory,
      subcategory: form.subcategory.trim(),
      description,
      location: form.location,
      requirements: '',
      status: form.status ? 'active' : 'inactive',
      technicianIds,
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
      <div className="w-full min-w-0 max-w-full space-y-3 overflow-x-hidden">
        {listError ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span>{listError}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => loadCatalog()}>
              Retry
            </Button>
          </div>
        ) : null}
        {actionError ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm text-amber-950 dark:text-amber-100">
            {actionError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <StatGradientCard
            variant="services"
            label="Total services"
            value={stats.total}
            helper={variant === 'independent' ? 'Your listings as an independent provider' : 'Items listed in your catalog'}
            icon={Wrench}
          />
          <StatGradientCard
            variant="active"
            label="Active services"
            value={stats.active}
            helper="Visible to customers"
            icon={CheckCircle}
          />
          <StatGradientCard
            variant="inactive"
            label="Inactive services"
            value={stats.inactive}
            helper="Not bookable right now"
            icon={PauseCircle}
          />
          <StatGradientCard
            variant="booked"
            label="Total bookings"
            value={stats.totalBookings}
            helper={variant === 'independent' ? 'Recorded across your offered services' : 'Recorded for your catalog'}
            icon={Users}
          />
        </div>

        <div className="mb-1 flex min-w-0 max-w-full flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 w-full max-w-full flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-nowrap">
            <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[140px] sm:flex-1 sm:max-w-[200px]">
              <select
                className={`${selectShell} ${categoryFilter !== '__' ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-500'}`}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value === '' ? '__' : e.target.value)}
              >
                <option value="__" disabled hidden>
                  Category
                </option>
                <option value="">All</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>

            <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[130px] sm:flex-1 sm:max-w-[180px]">
              <select
                className={`${selectShell} ${statusFilter !== '__' ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-500'}`}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value === '' ? '__' : e.target.value)}
              >
                <option value="__" disabled hidden>
                  Status
                </option>
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <Clock className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>

            <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[210px]">
              <select
                className={`${selectShell} ${locationFilter !== '__' ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-500'}`}
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value === '' ? '__' : e.target.value)}
              >
                <option value="__" disabled hidden>
                  Service type
                </option>
                <option value="">All</option>
                {serviceLocations.map((x) => (
                  <option key={x.value} value={x.value}>
                    {x.label}
                  </option>
                ))}
              </select>
              <Home className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>

            <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[140px] sm:flex-1 sm:max-w-[200px]">
              <select className={`${selectShell} text-neutral-900 dark:text-neutral-100`} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="most-booked">Sort: Most booked</option>
                <option value="newest">Sort: Newest</option>
              </select>
              <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
          </div>

          <ServicesSearchBar value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="mt-3 min-w-0 max-w-full space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
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
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-linear-to-r from-[#081F5C] to-[#1447a6] px-3 py-2 text-xs font-medium text-white shadow-sm hover:opacity-95 sm:text-sm"
            >
              <Plus className="h-4 w-4" />
              Add service
            </Button>
          </div>

          {loading ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm dark:border-white/15 dark:bg-[#020818]">
              <p className="text-sm font-medium text-foreground">Loading catalog…</p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">Fetching services from the server.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[140px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm ring-1 ring-black/2 dark:border-white/15 dark:bg-[#020818] dark:ring-white/5">
              <p className="text-sm font-medium text-foreground">No services found</p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                Try adjusting your filters or search keywords, or add a new service to get started.
              </p>
              <Button
                type="button"
                onClick={openCreate}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-linear-to-r from-[#081F5C] to-[#1447a6] px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:opacity-95"
              >
                <Plus className="h-4 w-4" />
                Add your first service
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((service) => (
                <div
                  key={service.id}
                  className="flex w-full flex-col justify-between overflow-hidden rounded-2xl border border-[#081F5C]/10 bg-white shadow-sm ring-1 ring-black/2 transition-all duration-200 hover:border-[#1447a6]/35 hover:shadow-md dark:border-white/10 dark:bg-[#020818]/95 dark:ring-white/5"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-foreground sm:text-[17px]">{service.name}</p>
                        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground sm:text-sm">
                          {service.description}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="h-9 w-9 shrink-0 rounded-full p-0 text-[#081F5C]/70 opacity-80 hover:bg-[#081F5C]/8 hover:text-[#081F5C] hover:opacity-100 dark:text-blue-200/80 dark:hover:bg-white/10"
                            aria-label="More actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 text-xs">
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => setViewing(service)}>
                            <Wrench className="h-4 w-4" />
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => openEdit(service)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 text-xs" onClick={() => toggleServiceStatus(service)}>
                            <CheckCircle className="h-4 w-4" />
                            {service.status === 'active' ? 'Disable' : 'Enable'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" className="gap-2 text-xs" onClick={() => setDeleteTarget(service)}>
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {categoryBadge(service.category)}
                      {locationBadge(service.location, serviceLocations)}
                      {statusBadge(service.status)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-dashed border-[#081F5C]/12 bg-slate-50/40 px-4 py-3 text-xs text-muted-foreground dark:border-white/10 dark:bg-white/4 sm:text-sm">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium text-foreground">
                          {variant === 'independent'
                            ? 'Provider'
                            : service.technicianIds?.length === 1
                              ? 'Mechanic/Technician'
                              : 'Mechanics/Technicians'}
                        </span>
                        <div className="inline-flex shrink-0 items-center gap-2">
                          {variant === 'independent' ? (
                            selfEmployee ? (
                              <>
                                <div className="inline-flex gap-1.5">
                                  <span
                                    title={selfEmployee.name}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-[10px] font-semibold text-white shadow-sm ring-1 ring-black/5"
                                  >
                                    {initialsFromName(selfEmployee.name)}
                                  </span>
                                </div>
                                <span className="max-w-[160px] truncate text-[11px] font-medium text-muted-foreground sm:max-w-[220px] sm:text-xs">
                                  {selfEmployee.name}
                                </span>
                              </>
                            ) : (
                              <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                                Sign in again to link this listing to your account.
                              </span>
                            )
                          ) : service.technicianIds?.length ? (
                            <>
                              <div className="inline-flex gap-1.5">
                                {service.technicianIds.slice(0, 3).map((id) => {
                                  const t = employees.find((x) => x.id === id)
                                  const label = t?.name ?? 'Unknown'
                                  return (
                                    <span
                                      key={id}
                                      title={label}
                                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-[10px] font-semibold text-white shadow-sm ring-1 ring-black/5"
                                    >
                                      {initialsFromName(label)}
                                    </span>
                                  )
                                })}
                              </div>
                              {service.technicianIds.length > 3 ? (
                                <span className="text-[11px] font-medium text-muted-foreground">+{service.technicianIds.length - 3}</span>
                              ) : null}
                              <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">{service.technicianIds.length} assigned</span>
                            </>
                          ) : (
                            <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">Unassigned</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={() => setViewing(service)}
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 rounded-lg border-[#081F5C]/15 bg-white/80 px-3 text-xs text-[#081F5C] shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-blue-100 sm:text-sm"
                    >
                      View details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="flex max-h-[calc(100vh-3.5rem)] flex-col gap-4 overflow-hidden sm:max-w-2xl" showCloseButton>
          <DialogHeader className="shrink-0">
            <DialogTitle>{editingId ? 'Edit service' : 'Add new service'}</DialogTitle>
            <DialogDescription>
              {variant === 'independent'
                ? 'Changes are saved for your independent provider account.'
                : 'Changes are saved to the server for your shop.'}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="svc-name">Service name</Label>
              <Input
                id="svc-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder='e.g. "Motorcycle Tune-up"'
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="svc-category">Category</Label>
                <div className="relative">
                  <select
                    id="svc-category"
                    className={`${selectShell} ${form.category === '__' ? 'text-neutral-500' : 'text-neutral-900 dark:text-neutral-100'}`}
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
                  <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="svc-subcategory">Subcategory (optional)</Label>
                <Input
                  id="svc-subcategory"
                  value={form.subcategory}
                  onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
                  placeholder='e.g. "Phone", "Motorcycle", "Laundry"'
                />
              </div>
            </div>

            {form.category === 'Others' && (
              <div className="grid gap-1.5">
                <Label htmlFor="svc-other-category">Other category</Label>
                <Input
                  id="svc-other-category"
                  value={form.otherCategory}
                  onChange={(e) => setForm((f) => ({ ...f, otherCategory: e.target.value }))}
                  placeholder='Type the category (e.g. "Computer", "Plumbing")'
                />
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="svc-desc">Short description</Label>
              <Textarea
                id="svc-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What is included and what are the limitations?"
                rows={3}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5 sm:col-span-3">
                <Label htmlFor="svc-location">Service type</Label>
                <div className="relative">
                  <select
                    id="svc-location"
                    className={`${selectShell} ${form.location === '__' ? 'text-neutral-500' : 'text-neutral-900 dark:text-neutral-100'}`}
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  >
                    <option value="__" disabled hidden>
                      Select type of service
                    </option>
                    {serviceLocations.map((x) => (
                      <option key={x.value} value={x.value}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                  <Home className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Active</p>
                  <p className="text-xs text-muted-foreground">When inactive, customers cannot book this service.</p>
                </div>
                <Switch checked={form.status} onCheckedChange={(checked) => setForm((f) => ({ ...f, status: checked }))} />
              </div>
            </div>

            {variant !== 'independent' ? (
            <div className="grid gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">Qualified mechanics / technicians</p>
                <p className="text-xs text-muted-foreground">
                  Choose from mechanics who registered under your shop, or manual staff entries. Inactive roster members cannot be newly assigned.
                </p>
              </div>
              <div className="w-full min-w-0">
              {employees.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#081F5C]/20 bg-slate-50/60 p-4 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/4">
                  No staff listed yet. Technicians who sign up and select your shop appear here automatically. You can still create services without assignments.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {employees.map((t) => {
                    const checked = form.technicianIds.includes(t.id)
                    const checkboxDisabled = t.assignDisabled && !checked
                    const onNavy = checked
                    return (
                      <label
                        key={`${t.source}-${t.id}`}
                        className={`flex min-w-0 w-full cursor-pointer items-stretch gap-3 rounded-2xl border border-transparent p-3 transition-all duration-200 sm:p-3.5 ${checkboxDisabled ? 'opacity-75' : ''} ${
                          onNavy
                            ? 'text-white shadow-[0_8px_24px_rgba(8,31,92,0.38)] ring-2 ring-white/25 hover:brightness-[1.03]'
                            : 'bg-white/95 text-foreground shadow-[0_3px_10px_rgba(15,23,42,0.1)] hover:shadow-[0_8px_20px_rgba(15,23,42,0.12)] dark:bg-[#04133d]/40 dark:shadow-[0_3px_12px_rgba(0,0,0,0.25)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]'
                        }`}
                        style={onNavy ? { backgroundImage: TECH_CARD_NAVY_GRADIENT } : undefined}
                      >
                        <div className="flex shrink-0 items-start pt-0.5">
                          <Checkbox
                            checked={checked}
                            disabled={checkboxDisabled}
                            onCheckedChange={(next) => {
                              if (t.assignDisabled && next) return
                              setForm((f) => {
                                const set = new Set(f.technicianIds)
                                if (next) set.add(t.id)
                                else set.delete(t.id)
                                return { ...f, technicianIds: [...set] }
                              })
                            }}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex min-w-0 flex-1 gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-inner ring-1 ${
                              onNavy
                                ? 'bg-white/20 text-white ring-white/35'
                                : 'bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-white ring-white/20'
                            }`}
                          >
                            {initialsFromName(t.name)}
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2 gap-y-1">
                              <span
                                className={`text-base font-semibold leading-tight ${onNavy ? 'text-white' : 'text-foreground'}`}
                              >
                                {t.name}
                              </span>
                              {t.source === 'self' ? (
                                <Badge
                                  variant="outline"
                                  className={
                                    onNavy
                                      ? 'border-white/40 bg-white/15 text-[10px] font-semibold tracking-wide text-white'
                                      : 'border-[#1447a6]/35 bg-[#081F5C]/8 text-[10px] font-semibold text-[#081F5C] dark:border-[#1447a6]/45 dark:bg-white/8 dark:text-blue-100'
                                  }
                                >
                                  You (provider)
                                </Badge>
                              ) : t.source === 'registered' ? (
                                <Badge
                                  variant="outline"
                                  className={
                                    onNavy
                                      ? 'border-white/40 bg-white/15 text-[10px] font-semibold uppercase tracking-wide text-white'
                                      : 'border-[#1447a6]/35 bg-[#081F5C]/8 text-[10px] font-semibold uppercase tracking-wide text-[#081F5C] dark:border-[#1447a6]/45 dark:bg-white/8 dark:text-blue-100'
                                  }
                                >
                                  Registered
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className={
                                    onNavy
                                      ? 'border-white/35 bg-white/12 text-[10px] font-semibold text-white/95'
                                      : 'border-slate-400/35 bg-slate-100/90 text-[10px] font-semibold text-slate-700 dark:border-white/15 dark:bg-white/8 dark:text-slate-200'
                                  }
                                >
                                  Manual entry
                                </Badge>
                              )}
                              {t.source === 'registered' && t.rosterStatus
                                ? rosterStatusPickerBadge(t.rosterStatus, onNavy)
                                : null}
                            </div>

                            <p className={`text-xs font-medium ${onNavy ? 'text-white/95' : 'text-[#081F5C] dark:text-blue-200/95'}`}>
                              <Wrench
                                className={`mr-1 inline-block h-3.5 w-3.5 -translate-y-px align-middle ${onNavy ? 'text-white/85' : 'opacity-80'}`}
                                aria-hidden
                              />
                              {t.jobTitle || 'Technician'}
                            </p>

                            {t.source === 'registered' && (t.email || t.phone) ? (
                              <div className="flex flex-col gap-1">
                                {t.email ? (
                                  <span
                                    className={`inline-flex min-w-0 items-center gap-1.5 text-xs ${onNavy ? 'text-white/85' : 'text-muted-foreground'}`}
                                  >
                                    <Mail
                                      className={`h-3.5 w-3.5 shrink-0 ${onNavy ? 'text-white/70' : 'text-[#081F5C]/60 dark:text-blue-300/70'}`}
                                      aria-hidden
                                    />
                                    <span className="truncate" title={t.email}>
                                      {t.email}
                                    </span>
                                  </span>
                                ) : null}
                                {t.phone ? (
                                  <span
                                    className={`inline-flex min-w-0 items-center gap-1.5 text-xs ${onNavy ? 'text-white/85' : 'text-muted-foreground'}`}
                                  >
                                    <Phone
                                      className={`h-3.5 w-3.5 shrink-0 ${onNavy ? 'text-white/70' : 'text-[#081F5C]/60 dark:text-blue-300/70'}`}
                                      aria-hidden
                                    />
                                    <span className="tabular-nums">{t.phone}</span>
                                  </span>
                                ) : null}
                              </div>
                            ) : null}

                            {t.technicalSkillsText ? (
                              <p className={`text-xs leading-snug ${onNavy ? 'text-white/80' : 'text-muted-foreground'}`}>
                                <span className={`font-medium ${onNavy ? 'text-white' : 'text-foreground/85'}`}>
                                  Technical skills:
                                </span>{' '}
                                {t.technicalSkillsText}
                              </p>
                            ) : t.source === 'manual' && (t.skills || []).length ? (
                              <p className={`text-xs leading-snug ${onNavy ? 'text-white/80' : 'text-muted-foreground'}`}>
                                <span className={`font-medium ${onNavy ? 'text-white' : 'text-foreground/85'}`}>Skills:</span>{' '}
                                {(t.skills || []).join(' · ')}
                              </p>
                            ) : null}

                            {t.assignDisabled ? (
                              <p
                                className={
                                  onNavy
                                    ? 'rounded-lg border border-amber-200/35 bg-amber-950/35 px-2 py-1.5 text-[11px] leading-snug text-amber-50'
                                    : 'rounded-lg bg-amber-500/10 px-2 py-1.5 text-[11px] leading-snug text-amber-900 dark:bg-amber-500/15 dark:text-amber-200'
                                }
                              >
                                Inactive on roster — cannot be newly assigned. Uncheck to remove from this service, or re-activate in Manage Employee.
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
              </div>
            </div>
            ) : null}
            </div>
          </div>

          <DialogFooter className="shrink-0 gap-2 sm:gap-3">
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
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
                (form.category === 'Others' && !form.otherCategory.trim())
              }
              className="bg-linear-to-r from-[#081F5C] to-[#1447a6] hover:opacity-95"
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="flex max-h-[calc(100vh-3.5rem)] flex-col gap-4 overflow-hidden sm:max-w-2xl" showCloseButton>
          {viewing ? (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle>{viewing.name}</DialogTitle>
                <DialogDescription>
                  {viewing.category}
                  {viewing.subcategory ? ` • ${viewing.subcategory}` : ''}
                </DialogDescription>
              </DialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {categoryBadge(viewing.category)}
                    {locationBadge(viewing.location, serviceLocations)}
                    {statusBadge(viewing.status)}
                    <Badge
                      variant="outline"
                      className="border-[#081F5C]/15 bg-white/90 text-[11px] font-medium text-[#081F5C] dark:border-white/10 dark:bg-white/5 dark:text-blue-100"
                    >
                      {viewing.bookings ?? 0} bookings
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-[#081F5C]/15 bg-white/90 text-[11px] font-medium text-[#081F5C] dark:border-white/10 dark:bg-white/5 dark:text-blue-100"
                    >
                      {typeof viewing.rating === 'number' && viewing.rating > 0 ? `${viewing.rating.toFixed(1)} rating` : 'No ratings'}
                    </Badge>
                  </div>

                  <Card className="rounded-2xl border border-[#081F5C]/10 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/5">
                    <CardContent className="space-y-3 p-4 sm:p-5">
                      <div className="rounded-xl border border-[#081F5C]/10 bg-slate-50/60 p-3 dark:border-white/10 dark:bg-white/4">
                        <p className="text-xs font-medium text-muted-foreground">Description</p>
                        <p className="mt-1 text-sm text-foreground">{viewing.description}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {variant === 'independent' ? 'Provider' : 'Assigned technicians'}
                    </p>
                    {variant === 'independent' ? (
                      <div className="rounded-xl border border-[#081F5C]/10 bg-slate-50/60 p-4 text-sm text-foreground dark:border-white/10 dark:bg-white/4">
                        You perform this service as the independent mechanic / technician for this listing.
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-1">
                      {(viewing.technicianIds ?? []).length ? (
                        (viewing.technicianIds ?? []).map((id) => {
                          const t = employees.find((x) => x.id === id)
                          const name = t?.name ?? 'Unknown technician'
                          return (
                            <div
                              key={id}
                              className="flex gap-3 rounded-2xl bg-white/95 p-3 shadow-[0_3px_10px_rgba(15,23,42,0.08)] dark:bg-[#04133d]/50 dark:shadow-none dark:ring-1 dark:ring-white/8"
                            >
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-xs font-bold text-white">
                                {initialsFromName(name)}
                              </div>
                              <div className="min-w-0 flex-1 space-y-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                                  {t?.source === 'self' ? (
                                    <Badge variant="outline" className="text-[10px] font-semibold text-[#081F5C] dark:text-blue-100">
                                      You (provider)
                                    </Badge>
                                  ) : null}
                                  {t?.source === 'registered' ? (
                                    <Badge variant="outline" className="text-[10px] font-semibold text-[#081F5C] dark:text-blue-100">
                                      Registered
                                    </Badge>
                                  ) : null}
                                  {t?.source === 'manual' ? (
                                    <Badge variant="outline" className="text-[10px] text-slate-600 dark:text-slate-300">
                                      Manual
                                    </Badge>
                                  ) : null}
                                  {t?.source === 'registered' && t.rosterStatus ? rosterStatusPickerBadge(t.rosterStatus) : null}
                                </div>
                                {t?.jobTitle ? (
                                  <p className="text-xs font-medium text-[#081F5C] dark:text-blue-200/90">{t.jobTitle}</p>
                                ) : null}
                                {t?.email ? (
                                  <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                                    <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                    {t.email}
                                  </p>
                                ) : null}
                                {t?.phone ? (
                                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                    {t.phone}
                                  </p>
                                ) : null}
                                {t?.technicalSkillsText ? (
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground/85">Technical:</span> {t.technicalSkillsText}
                                  </p>
                                ) : (t?.skills || []).length ? (
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground/85">Skills:</span> {(t.skills || []).join(' · ')}
                                  </p>
                                ) : !t ? (
                                  <p className="text-xs text-amber-700 dark:text-amber-300">Not in current staff list — refresh the page after team changes.</p>
                                ) : null}
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="rounded-xl border border-dashed border-[#081F5C]/20 bg-slate-50/60 p-4 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/4">
                          No technicians assigned yet.
                        </div>
                      )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="shrink-0 gap-2 sm:gap-3">
                <Button type="button" variant="outline" onClick={() => setViewing(null)}>
                  Close
                </Button>
                <Button type="button" variant="outline" onClick={() => viewing && toggleServiceStatus(viewing)}>
                  {viewing.status === 'active' ? 'Disable' : 'Enable'}
                </Button>
                <Button type="button" onClick={() => viewing && openEdit(viewing)} className="bg-linear-to-r from-[#081F5C] to-[#1447a6] hover:opacity-95">
                  Edit
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `${deleteTarget.name} will be removed from your catalog.` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
