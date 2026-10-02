import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  FileText,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  Users,
} from 'lucide-react'
import { getApiBaseUrl } from '@/lib/apiBaseUrl'
import { cn } from '@/lib/utils'

const API_URL = getApiBaseUrl()

const STAT_CARD_GRADIENT = {
  total: "from-[#04133d] via-[#081F5C] to-[#1447a6] border-[#1447a6]/40",
  published: "from-emerald-600 via-teal-700 to-slate-950 border-emerald-400/30",
  draft: "from-amber-600 via-orange-700 to-slate-950 border-amber-400/30",
  views: "from-purple-600 via-violet-700 to-slate-950 border-purple-400/30",
}

const selectShell =
  "h-9 w-full appearance-none rounded-none border border-slate-200 bg-white px-3 py-1.5 pr-8 text-xs font-semibold text-slate-800 shadow-xs outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function apiJson(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  })
  if (res.status === 401) {
    window.location.hash = '#/login'
    throw new Error('Not authorized')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof data?.message === 'string' ? data.message : 'Request failed')
  }
  return data
}

function StatGradientCard({ label, value, sub, helper, icon: Icon, variant, onClick, className = '' }) {
  const gradient = STAT_CARD_GRADIENT[variant] ?? STAT_CARD_GRADIENT.total
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

function getDateRange(range) {
  if (range === 'all') return { from: null, to: null }
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)
  const firstDayOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1)
  const lastDayOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0)

  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      return { from: start, to: end }
    case 'this-week': {
      const day = now.getDay()
      const diffToMonday = (day + 6) % 7
      start.setDate(now.getDate() - diffToMonday)
      start.setHours(0, 0, 0, 0)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      return { from: start, to: end }
    }
    case 'this-month':
      return { from: firstDayOfMonth(now), to: lastDayOfMonth(now) }
    case 'last-month': {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return { from: firstDayOfMonth(lastMonth), to: lastDayOfMonth(lastMonth) }
    }
    case 'this-year':
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      }
    case 'last-year':
      return {
        from: new Date(now.getFullYear() - 1, 0, 1),
        to: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
      }
    default:
      return { from: null, to: null }
  }
}

function formatDate(dateString) {
  if (!dateString) return '—'
  try {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateString))
  } catch {
    return '—'
  }
}

function getPriorityBadgeClass(priority) {
  switch (priority) {
    case 'high':
      return 'border-rose-200 bg-rose-50 text-rose-700'
    case 'normal':
      return 'border-blue-200 bg-blue-50 text-blue-700'
    case 'low':
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700'
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'published':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'draft':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'scheduled':
      return 'border-sky-200 bg-sky-50 text-sky-700'
    default:
      return 'border-slate-200 bg-slate-100 text-slate-700'
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'published':
      return <CheckCircle className="h-3 w-3 shrink-0 text-emerald-600" />
    case 'draft':
      return <Edit className="h-3 w-3 shrink-0 text-amber-600" />
    case 'scheduled':
      return <Clock className="h-3 w-3 shrink-0 text-sky-600" />
    default:
      return <AlertCircle className="h-3 w-3 shrink-0 text-slate-500" />
  }
}

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All users' },
  { value: 'customer', label: 'Customers' },
  { value: 'shop-owner', label: 'Shop owners' },
  { value: 'mechanic-technician', label: 'Mechanics / technicians' },
  { value: 'admin', label: 'Admins only' },
]

/** Admin: announcements — layout aligned with User management palette and table. */
export default function AdminAnnouncement() {
  const [loading, setLoading] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [summaryData, setSummaryData] = useState({
    totalAnnouncements: 0,
    published: 0,
    draft: 0,
    scheduled: 0,
    totalViews: 0,
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
    targetAudience: 'all',
    scheduledDate: '',
    status: 'draft',
  })

  const loadAnnouncements = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const qs = new URLSearchParams()
      if (statusFilter !== 'all') qs.set('status', statusFilter)
      const q = qs.toString()
      const listPath = `/api/admin/announcements${q ? `?${q}` : ''}`

      const [announcementsRes, statsRes] = await Promise.all([
        apiJson(listPath),
        apiJson('/api/admin/announcements/stats'),
      ])

      const announcementsList = Array.isArray(announcementsRes?.data) ? announcementsRes.data : []
      setAnnouncements(announcementsList)

      if (statsRes?.data) {
        setSummaryData({
          totalAnnouncements: statsRes.data.totalAnnouncements ?? 0,
          published: statsRes.data.published ?? 0,
          draft: statsRes.data.draft ?? 0,
          scheduled: statsRes.data.scheduled ?? 0,
          totalViews: statsRes.data.totalViews ?? 0,
        })
      }
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to load announcements')
      setAnnouncements([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void loadAnnouncements()
  }, [loadAnnouncements])

  const filteredAnnouncements = announcements.filter((announcement) => {
    const q = searchTerm.trim().toLowerCase()
    const matchesSearch =
      !q ||
      (announcement.title && announcement.title.toLowerCase().includes(q)) ||
      (announcement.content && announcement.content.toLowerCase().includes(q))

    const { from, to } = getDateRange(dateFilter)
    const announcementDate = announcement.createdAt ? new Date(announcement.createdAt) : null
    const matchesDate =
      !from ||
      !to ||
      !announcementDate ||
      (announcementDate >= from && announcementDate <= to)

    return matchesSearch && matchesDate
  })

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      priority: 'normal',
      targetAudience: 'all',
      scheduledDate: '',
      status: 'draft',
    })
    setError('')
  }

  const handleCreateAnnouncement = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required')
      return
    }
    try {
      setLoading(true)
      setError('')
      const body = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        priority: formData.priority,
        targetAudience: formData.targetAudience,
        status: formData.status,
      }
      if (formData.status === 'scheduled' && formData.scheduledDate) {
        body.scheduledDate = new Date(formData.scheduledDate).toISOString()
      }
      await apiJson('/api/admin/announcements', { method: 'POST', body: JSON.stringify(body) })
      setIsCreateOpen(false)
      resetForm()
      await loadAnnouncements()
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to create announcement')
    } finally {
      setLoading(false)
    }
  }

  const handleEditAnnouncement = (announcement) => {
    setSelectedAnnouncement(announcement)
    setFormData({
      title: announcement.title || '',
      content: announcement.content || '',
      priority: announcement.priority || 'normal',
      targetAudience: announcement.targetAudience || 'all',
      scheduledDate: announcement.scheduledDate
        ? new Date(announcement.scheduledDate).toISOString().slice(0, 16)
        : '',
      status: announcement.status || 'draft',
    })
    setError('')
    setIsEditOpen(true)
  }

  const handleUpdateAnnouncement = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Title and content are required')
      return
    }
    if (!selectedAnnouncement?._id) return
    try {
      setLoading(true)
      setError('')
      const body = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        priority: formData.priority,
        targetAudience: formData.targetAudience,
        status: formData.status,
      }
      if (formData.status === 'scheduled' && formData.scheduledDate) {
        body.scheduledDate = new Date(formData.scheduledDate).toISOString()
      }
      await apiJson(`/api/admin/announcements/${selectedAnnouncement._id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      setIsEditOpen(false)
      setSelectedAnnouncement(null)
      resetForm()
      await loadAnnouncements()
    } catch (err) {
      console.error(err)
      setError(err?.message || 'Failed to update announcement')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAnnouncement = async (announcementId) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return
    try {
      setLoading(true)
      await apiJson(`/api/admin/announcements/${announcementId}`, { method: 'DELETE' })
      await loadAnnouncements()
    } catch (err) {
      console.error(err)
      alert(err?.message || 'Failed to delete announcement')
    } finally {
      setLoading(false)
    }
  }

  const audienceLabel = (value) => AUDIENCE_OPTIONS.find((o) => o.value === value)?.label || value || '—'

  const formFields = (
    <div className="grid gap-3.5 text-xs sm:text-sm">
      {error ? (
        <div className="border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ann-title" className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Title <span className="text-rose-600">*</span>
          </Label>
          <Input
            id="ann-title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g. Scheduled System Maintenance Notice"
            className="h-9 rounded-none border-slate-200 text-xs bg-white focus-visible:ring-[#1447a6] dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ann-priority" className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Priority
          </Label>
          <div className="relative">
            <select
              id="ann-priority"
              className={`${selectShell} text-slate-800 dark:text-slate-200 capitalize`}
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ann-content" className="text-xs font-bold text-slate-800 dark:text-slate-200">
          Content <span className="text-rose-600">*</span>
        </Label>
        <Textarea
          id="ann-content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Write the full announcement message here..."
          className="min-h-[140px] resize-y rounded-none border-slate-200 text-xs bg-white focus-visible:ring-[#1447a6] dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ann-audience" className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Target Audience
          </Label>
          <div className="relative">
            <select
              id="ann-audience"
              className={`${selectShell} text-slate-800 dark:text-slate-200`}
              value={formData.targetAudience}
              onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
            >
              {AUDIENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ann-status" className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Publishing Status
          </Label>
          <div className="relative">
            <select
              id="ann-status"
              className={`${selectShell} text-slate-800 dark:text-slate-200 capitalize`}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      {formData.status === 'scheduled' ? (
        <div className="space-y-1.5">
          <Label htmlFor="ann-sched" className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Scheduled Publish Date &amp; Time
          </Label>
          <Input
            id="ann-sched"
            type="datetime-local"
            value={formData.scheduledDate}
            onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
            className="h-9 max-w-md rounded-none border-slate-200 text-xs bg-white focus-visible:ring-[#1447a6] dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
      ) : null}
    </div>
  )

  return (
    <div className="w-full min-w-0 max-w-full space-y-3.5 sm:space-y-4 overflow-x-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5 min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 truncate">Announcements</h1>
          <p className="text-xs text-slate-500 font-medium">Manage platform announcements and notifications.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-8 sm:h-9 shrink-0 rounded-none border border-slate-200 bg-white px-2.5 sm:px-3 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          onClick={() => void loadAnnouncements()}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 sm:mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {error && !loading && !isCreateOpen && !isEditOpen ? (
        <div className="rounded-none border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <StatGradientCard
          variant="total"
          label="Total announcements"
          value={summaryData.totalAnnouncements}
          sub="All announcements"
          icon={Megaphone}
          onClick={() => setStatusFilter('all')}
        />
        <StatGradientCard
          variant="published"
          label="Published"
          value={summaryData.published}
          sub="Live and visible"
          icon={CheckCircle}
          onClick={() => setStatusFilter('published')}
        />
        <StatGradientCard
          variant="draft"
          label="Drafts"
          value={summaryData.draft}
          sub={summaryData.scheduled ? `${summaryData.scheduled} scheduled` : 'Pending review'}
          icon={Edit}
          onClick={() => setStatusFilter('draft')}
        />
        <StatGradientCard
          variant="views"
          label="Total views"
          value={summaryData.totalViews}
          sub="Read views by users"
          icon={Eye}
        />
      </div>

      <div className="mb-1 flex min-w-0 max-w-full flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-stretch lg:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap sm:gap-3 min-w-0 w-full lg:w-auto">
          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[200px]">
            <select
              className={selectShell}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[220px]">
            <select
              className={selectShell}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">Date created</option>
              <option value="today">Today</option>
              <option value="this-week">This week</option>
              <option value="this-month">This month</option>
              <option value="last-month">Last month</option>
              <option value="this-year">This year</option>
              <option value="last-year">Last year</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        <div className="flex min-w-0 w-full max-w-full flex-col gap-2 sm:flex-row sm:items-stretch lg:max-w-xl lg:flex-1">
          <div className="relative min-w-0 flex-1">
            <Input
              className="h-9 w-full min-w-0 rounded-none border border-slate-200 bg-white pr-12 pl-3.5 text-xs font-medium text-slate-800 shadow-xs focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
              placeholder="Search title or content…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void loadAnnouncements()
              }}
              aria-label="Search announcements"
            />
            <Button
              type="button"
              size="icon-sm"
              className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-none bg-gradient-to-br from-[#081F5C] to-[#1447a6] p-0 shadow-xs hover:opacity-95"
              aria-label="Search"
              onClick={() => void loadAnnouncements()}
            >
              <Search className="h-3.5 w-3.5 text-white" />
            </Button>
          </div>
          <Button
            type="button"
            className="h-9 shrink-0 rounded-none bg-gradient-to-br from-[#081F5C] to-[#1447a6] px-3.5 sm:px-4 text-xs font-semibold text-white shadow-xs hover:opacity-95"
            onClick={() => {
              resetForm()
              setIsCreateOpen(true)
            }}
          >
            <Plus className="mr-1.5 size-3.5" />
            Create announcement
          </Button>
        </div>
      </div>

      <div className="mt-3 min-w-0 max-w-full overflow-hidden rounded-none border border-slate-200/60 bg-white/90 shadow-sm ring-1 ring-slate-200/45 backdrop-blur-sm dark:border-white/10 dark:bg-[#0c1929]/90">
        <div className="min-w-0 p-0">
          {/* Desktop Table View */}
          <div className="scrollbar-thin hidden max-w-full overflow-x-auto scroll-smooth md:block">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead className="[&_tr]:border-0">
                <tr className="border-0 bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6]">
                  <th className="w-[26%] border-0 px-4 py-3 text-left text-[11px] font-black tracking-wider text-white uppercase">
                    Title
                  </th>
                  <th className="w-[12%] border-0 px-3 py-3 text-left text-[11px] font-black tracking-wider text-white uppercase">
                    Priority
                  </th>
                  <th className="w-[16%] border-0 px-3 py-3 text-left text-[11px] font-black tracking-wider text-white uppercase">
                    Status
                  </th>
                  <th className="w-[16%] border-0 px-3 py-3 text-left text-[11px] font-black tracking-wider text-white uppercase">
                    Target
                  </th>
                  <th className="w-[16%] border-0 px-3 py-3 text-left text-[11px] font-black tracking-wider text-white uppercase">
                    Created
                  </th>
                  <th className="w-[14%] border-0 px-3 py-3 text-center text-[11px] font-black tracking-wider text-white uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#04133d]/35">
                {loading && announcements.length === 0 ? (
                  <tr>
                    <td className="px-6 py-14 text-center text-xs font-semibold text-slate-500" colSpan={6}>
                      Loading announcements…
                    </td>
                  </tr>
                ) : filteredAnnouncements.length === 0 ? (
                  <tr>
                    <td className="px-6 py-14 text-center text-xs font-semibold text-slate-500" colSpan={6}>
                      {announcements.length === 0
                        ? 'No announcements yet. Create one to get started.'
                        : 'No rows match your filters or search.'}
                    </td>
                  </tr>
                ) : (
                  filteredAnnouncements.map((row, idx) => (
                    <tr
                      key={row._id || row.id}
                      className={`transition-colors duration-150 hover:bg-slate-50/80 ${idx % 2 === 1 ? 'bg-slate-50/40' : ''} ${idx < filteredAnnouncements.length - 1 ? 'border-b border-slate-100' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="truncate font-semibold text-xs text-slate-900">{row.title}</div>
                        <div className="mt-0.5 truncate text-[11px] text-slate-500 font-medium">
                          by {row.authorName || row.author?.fullName || 'Admin'}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span className={cn("inline-flex items-center rounded-none border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", getPriorityBadgeClass(row.priority))}>
                          {row.priority || 'normal'}
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle">
                        <span className={cn("inline-flex items-center gap-1 rounded-none border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", getStatusBadgeClass(row.status))}>
                          {getStatusIcon(row.status)}
                          <span>{row.status}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 align-middle text-xs font-medium capitalize text-slate-700">
                        {audienceLabel(row.targetAudience)}
                      </td>
                      <td className="px-3 py-3 align-middle text-xs tabular-nums text-slate-500">
                        <div className="font-medium text-slate-800">{formatDate(row.createdAt)}</div>
                        {(row.viewCount ?? 0) > 0 ? (
                          <div className="text-[10px] text-slate-400 font-medium">{row.viewCount} views</div>
                        ) : null}
                      </td>
                      <td className="px-2 py-3 text-center align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 rounded-none p-0 text-[#081F5C] hover:bg-slate-100 transition-colors"
                            onClick={() => {
                              setSelectedAnnouncement(row)
                              setIsViewOpen(true)
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 rounded-none p-0 text-emerald-700 hover:bg-emerald-50 transition-colors"
                            onClick={() => handleEditAnnouncement(row)}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 rounded-none p-0 text-rose-600 hover:bg-rose-50 transition-colors"
                            onClick={() => void handleDeleteAnnouncement(row._id || row.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="block divide-y divide-slate-100 dark:divide-white/5 md:hidden">
            {loading && announcements.length === 0 ? (
              <div className="px-4 py-12 text-center text-xs font-medium text-slate-500">
                Loading announcements…
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <div className="px-4 py-12 text-center text-xs font-medium text-slate-500">
                {announcements.length === 0
                  ? 'No announcements yet. Create one to get started.'
                  : 'No rows match your filters or search.'}
              </div>
            ) : (
              filteredAnnouncements.map((row) => (
                <div
                  key={row._id || row.id}
                  className="space-y-2 p-3 sm:p-3.5 transition-colors bg-gradient-to-r from-white via-slate-50/40 to-blue-50/20 hover:bg-slate-50/80"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-1 text-xs sm:text-sm font-bold text-slate-900">{row.title}</h3>
                      <p className="mt-0.5 text-[10px] sm:text-xs text-slate-500 font-medium">
                        by {row.authorName || row.author?.fullName || 'Admin'} • {formatDate(row.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 rounded-none p-0 text-[#081F5C] hover:bg-white border border-slate-200 shadow-xs"
                        onClick={() => {
                          setSelectedAnnouncement(row)
                          setIsViewOpen(true)
                        }}
                        title="View"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 rounded-none p-0 text-emerald-700 hover:bg-white border border-slate-200 shadow-xs"
                        onClick={() => handleEditAnnouncement(row)}
                        title="Edit"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 rounded-none p-0 text-rose-600 hover:bg-white border border-slate-200 shadow-xs"
                        onClick={() => void handleDeleteAnnouncement(row._id || row.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {row.content ? (
                    <p className="line-clamp-2 text-xs text-slate-600 font-normal">{row.content}</p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs border-t border-slate-100">
                    <span className={cn("inline-flex items-center rounded-none border px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider", getPriorityBadgeClass(row.priority))}>
                      {row.priority || 'normal'}
                    </span>
                    <span className={cn("inline-flex items-center gap-1 rounded-none border px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider", getStatusBadgeClass(row.status))}>
                      {getStatusIcon(row.status)}
                      <span>{row.status}</span>
                    </span>
                    <span className="inline-flex items-center rounded-none border border-slate-200 bg-slate-50 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-slate-700 capitalize">
                      {audienceLabel(row.targetAudience)}
                    </span>
                    {(row.viewCount ?? 0) > 0 ? (
                      <span className="ml-auto flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-slate-500">
                        <Eye className="size-3" />
                        {row.viewCount} views
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 1. Create Announcement Dialog */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent
          className="max-h-[90vh] max-w-[calc(100vw-1.5rem)] sm:max-w-xl md:max-w-2xl overflow-hidden flex flex-col p-0 border border-slate-200 bg-white shadow-2xl rounded-none dark:border-slate-800 dark:bg-slate-900"
          showCloseButton
        >
          <div className="bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-4 py-3 sm:px-5 sm:py-3.5 text-white shrink-0 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 sm:size-8 items-center justify-center bg-white/15 text-white border border-white/20 shrink-0">
                <Plus className="size-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                  Create Announcement
                </DialogTitle>
                <DialogDescription className="text-[10px] sm:text-[11px] text-blue-100/75 font-normal">
                  Publish or schedule platform notices across user roles
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            {formFields}
          </div>

          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end shrink-0 dark:border-slate-800 dark:bg-slate-950">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              className="h-8 px-4 text-xs font-bold rounded-none border-slate-300 hover:bg-slate-100 dark:border-slate-700"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading}
              className="h-8 px-4 text-xs font-bold rounded-none bg-[#1447a6] text-white hover:bg-[#081F5C] shadow-xs"
              onClick={() => void handleCreateAnnouncement()}
            >
              {loading ? 'Creating…' : 'Create Announcement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Edit Announcement Dialog */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open)
          if (!open) {
            setSelectedAnnouncement(null)
            resetForm()
          }
        }}
      >
        <DialogContent
          className="max-h-[90vh] max-w-[calc(100vw-1.5rem)] sm:max-w-xl md:max-w-2xl overflow-hidden flex flex-col p-0 border border-slate-200 bg-white shadow-2xl rounded-none dark:border-slate-800 dark:bg-slate-900"
          showCloseButton
        >
          <div className="bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-4 py-3 sm:px-5 sm:py-3.5 text-white shrink-0 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 sm:size-8 items-center justify-center bg-white/15 text-white border border-white/20 shrink-0">
                <Edit className="size-4 text-white" />
              </div>
              <div>
                <DialogTitle className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                  Edit Announcement
                </DialogTitle>
                <DialogDescription className="text-[10px] sm:text-[11px] text-blue-100/75 font-normal">
                  Update content, priority, and target audience
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            {formFields}
          </div>

          <DialogFooter className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end shrink-0 dark:border-slate-800 dark:bg-slate-950">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              className="h-8 px-4 text-xs font-bold rounded-none border-slate-300 hover:bg-slate-100 dark:border-slate-700"
              onClick={() => {
                setIsEditOpen(false)
                setSelectedAnnouncement(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading}
              className="h-8 px-4 text-xs font-bold rounded-none bg-[#1447a6] text-white hover:bg-[#081F5C] shadow-xs"
              onClick={() => void handleUpdateAnnouncement()}
            >
              {loading ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. View Announcement Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent
          className="max-h-[90vh] max-w-[calc(100vw-1.5rem)] sm:max-w-xl md:max-w-2xl overflow-hidden flex flex-col p-0 border border-slate-200 bg-white shadow-2xl rounded-none dark:border-slate-800 dark:bg-slate-900"
          showCloseButton
        >
          {selectedAnnouncement ? (
            <>
              {/* Compact Sleek Header Banner */}
              <div className="bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-4 py-3 sm:px-5 sm:py-3.5 text-white shrink-0 border-b border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pr-6">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 sm:size-8 items-center justify-center bg-white/15 text-white border border-white/20 shrink-0">
                      <Megaphone className="size-3.5 sm:size-4 text-white" />
                    </div>
                    <div>
                      <DialogTitle className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                        Announcement Details
                      </DialogTitle>
                      <DialogDescription className="text-[10px] sm:text-[11px] text-blue-100/75 font-normal">
                        Published {formatDate(selectedAnnouncement.createdAt)}
                      </DialogDescription>
                    </div>
                  </div>

                  {/* Badges in same compact row */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cn("inline-flex items-center rounded-none border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", getPriorityBadgeClass(selectedAnnouncement.priority))}>
                      {selectedAnnouncement.priority || 'normal'}
                    </span>
                    <span className={cn("inline-flex items-center gap-1 rounded-none border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", getStatusBadgeClass(selectedAnnouncement.status))}>
                      {getStatusIcon(selectedAnnouncement.status)}
                      <span>{selectedAnnouncement.status}</span>
                    </span>
                    <span className="inline-flex items-center rounded-none border border-white/20 bg-white/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white tracking-wider">
                      {audienceLabel(selectedAnnouncement.targetAudience)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scrollable Announcement Body */}
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                    {selectedAnnouncement.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Author: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedAnnouncement.authorName || selectedAnnouncement.author?.fullName || 'Admin'}</span>
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    Announcement Message:
                  </span>
                  <div className="bg-slate-50 border-l-2 border-[#1447a6] p-3.5 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap dark:bg-slate-800/60 dark:border-blue-500 dark:text-slate-200 font-normal">
                    {selectedAnnouncement.content}
                  </div>
                </div>

                {/* Meta details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-200/80 pt-3 dark:border-slate-800">
                  <div className="border border-slate-200 bg-slate-50/70 p-3 space-y-1.5 rounded-none dark:border-slate-800 dark:bg-slate-800/40">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Target Audience
                    </span>
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {audienceLabel(selectedAnnouncement.targetAudience)}
                    </p>
                  </div>

                  <div className="border border-slate-200 bg-slate-50/70 p-3 space-y-1.5 rounded-none dark:border-slate-800 dark:bg-slate-800/40">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                      Engagement / Views
                    </span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                      <Eye className="size-3.5 text-[#1447a6] dark:text-blue-400" />
                      <span>{selectedAnnouncement.viewCount ?? selectedAnnouncement.views ?? 0} user views</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                  Created {formatDate(selectedAnnouncement.createdAt)}
                </p>
                <div className="flex w-full sm:w-auto items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto h-8 px-4 text-xs font-bold rounded-none border-slate-300 hover:bg-slate-100 dark:border-slate-700"
                    onClick={() => setIsViewOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    className="w-full sm:w-auto h-8 px-4 text-xs font-bold rounded-none bg-[#1447a6] text-white hover:bg-[#081F5C] shadow-xs"
                    onClick={() => {
                      setIsViewOpen(false)
                      handleEditAnnouncement(selectedAnnouncement)
                    }}
                  >
                    <Edit className="size-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
