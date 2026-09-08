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
  CheckCircle,
  ChevronDown,
  Clock,
  Edit,
  Eye,
  Megaphone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

const STAT_CARD_GRADIENT = {
  total: 'bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6]',
  published: 'bg-linear-to-br from-emerald-600 via-teal-600 to-emerald-900',
  draft: 'bg-linear-to-br from-sky-600 via-blue-600 to-indigo-900',
  views: 'bg-linear-to-br from-violet-600 via-purple-700 to-fuchsia-950',
}

const selectShell =
  'h-9 w-full appearance-none rounded-md border border-[#081F5C]/15 bg-white/95 px-2.5 sm:px-3 py-1.5 sm:py-2 pr-7 sm:pr-8 text-xs sm:text-sm shadow-sm outline-none focus-visible:border-[#1447a6]/50 focus-visible:ring-2 focus-visible:ring-[#081F5C]/20 dark:border-white/10 dark:bg-[#04133d]/30'

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

function StatGradientCard({ label, value, sub, icon: Icon, variant, className = '' }) {
  const gradient = STAT_CARD_GRADIENT[variant] ?? STAT_CARD_GRADIENT.total
  return (
    <div
      className={`relative min-h-[84px] sm:min-h-[112px] min-w-0 overflow-hidden rounded-lg border border-white/15 p-3 sm:p-5 shadow-md transition-shadow duration-300 hover:shadow-lg sm:min-h-[128px] sm:p-6 ${gradient} ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/10 to-transparent" />
      <div className="relative z-10 flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-white/85 sm:text-xs truncate">{label}</p>
          <p className="mt-0.5 sm:mt-1 text-xl font-bold tracking-tight text-white tabular-nums sm:text-3xl">{value}</p>
          {sub ? <p className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-white/70 truncate">{sub}</p> : null}
        </div>
        <div className="shrink-0 rounded-md border border-white/25 bg-white/15 p-2 sm:p-3 shadow-inner backdrop-blur-sm">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" aria-hidden />
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
      return 'border border-rose-500/30 bg-rose-500/10 font-medium text-rose-900 hover:bg-rose-500/15 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-100'
    case 'normal':
      return 'border border-[#1447a6]/25 bg-blue-500/10 font-medium text-[#081F5C] hover:bg-blue-500/15 dark:border-[#1447a6]/35 dark:bg-blue-500/15 dark:text-blue-100'
    case 'low':
    default:
      return 'border border-muted-foreground/25 bg-muted/40 font-medium text-foreground hover:bg-muted/55'
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'published':
      return 'border border-emerald-500/25 bg-emerald-500/10 font-medium text-emerald-900 hover:bg-emerald-500/15 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-100'
    case 'draft':
      return 'border border-amber-500/30 bg-amber-500/10 font-medium text-amber-950 hover:bg-amber-500/15 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-100'
    case 'scheduled':
      return 'border border-sky-500/30 bg-sky-500/10 font-medium text-sky-950 hover:bg-sky-500/15 dark:border-sky-500/35 dark:bg-sky-500/15 dark:text-sky-100'
    default:
      return 'border border-muted-foreground/25 bg-muted/40 font-medium text-foreground'
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'published':
      return <CheckCircle className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
    case 'draft':
      return <Edit className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
    case 'scheduled':
      return <Clock className="h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300" />
    default:
      return <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
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
    <div className="grid gap-4">
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ann-title" className="text-foreground">
            Title *
          </Label>
          <Input
            id="ann-title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Announcement title"
            className="h-9 rounded-md border-[#081F5C]/15 bg-white/95 shadow-sm focus-visible:border-[#1447a6]/45 focus-visible:ring-[#081F5C]/15 dark:border-white/10 dark:bg-[#04133d]/25"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ann-priority" className="text-foreground">
            Priority
          </Label>
          <div className="relative">
            <select
              id="ann-priority"
              className={`${selectShell} text-foreground`}
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ann-content" className="text-foreground">
          Content *
        </Label>
        <Textarea
          id="ann-content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder="Announcement body"
          className="min-h-[180px] resize-y rounded-md border-[#081F5C]/15 bg-white/95 shadow-sm focus-visible:border-[#1447a6]/45 focus-visible:ring-[#081F5C]/15 dark:border-white/10 dark:bg-[#04133d]/25"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ann-audience" className="text-foreground">
            Target audience
          </Label>
          <div className="relative">
            <select
              id="ann-audience"
              className={`${selectShell} text-foreground`}
              value={formData.targetAudience}
              onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
            >
              {AUDIENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ann-status" className="text-foreground">
            Status
          </Label>
          <div className="relative">
            <select
              id="ann-status"
              className={`${selectShell} text-foreground`}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          </div>
        </div>
      </div>

      {formData.status === 'scheduled' ? (
        <div className="space-y-2">
          <Label htmlFor="ann-sched" className="text-foreground">
            Schedule date
          </Label>
          <Input
            id="ann-sched"
            type="datetime-local"
            value={formData.scheduledDate}
            onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
            className="h-9 max-w-md rounded-md border-[#081F5C]/15 bg-white/95 shadow-sm focus-visible:border-[#1447a6]/45 dark:border-white/10 dark:bg-[#04133d]/25"
          />
        </div>
      ) : null}
    </div>
  )

  return (
    <div className="w-full min-w-0 max-w-full space-y-3 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold tracking-tight text-foreground md:text-xl">Announcements</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage platform announcements and notifications.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-9 shrink-0 self-start border-[#081F5C]/20 bg-white/90 px-3 text-xs sm:text-sm hover:bg-[#081F5C]/5 dark:border-white/15 dark:bg-transparent"
          onClick={() => void loadAnnouncements()}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && !loading && !isCreateOpen && !isEditOpen ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatGradientCard
          variant="total"
          label="Total announcements"
          value={summaryData.totalAnnouncements}
          sub="All time"
          icon={Megaphone}
        />
        <StatGradientCard
          variant="published"
          label="Published"
          value={summaryData.published}
          sub="Live"
          icon={CheckCircle}
        />
        <StatGradientCard
          variant="draft"
          label="Drafts"
          value={summaryData.draft}
          sub={summaryData.scheduled ? `${summaryData.scheduled} scheduled` : 'Pending review'}
          icon={Edit}
        />
        <StatGradientCard
          variant="views"
          label="Total views"
          value={summaryData.totalViews}
          sub="All announcements"
          icon={Eye}
        />
      </div>

      <div className="mb-1 flex min-w-0 max-w-full flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-stretch lg:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:flex-wrap sm:gap-3 min-w-0 w-full lg:w-auto">
          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[200px]">
            <select
              className={`${selectShell} ${statusFilter !== 'all' ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-500'}`}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-neutral-400" />
          </div>
          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[220px]">
            <select
              className={`${selectShell} ${dateFilter !== 'all' ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-500'}`}
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
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-neutral-400" />
          </div>
        </div>

        <div className="flex min-w-0 w-full max-w-full flex-col gap-2 sm:flex-row sm:items-stretch lg:max-w-xl lg:flex-1">
          <div className="relative min-w-0 flex-1">
            <Input
              className="h-9 w-full min-w-0 rounded-md border-[#081F5C]/15 bg-white/95 pr-12 pl-3 sm:pl-4 text-xs sm:text-sm shadow-sm focus-visible:border-[#1447a6]/45 focus-visible:ring-[#081F5C]/15 dark:border-white/10 dark:bg-[#04133d]/25"
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
              className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-sm bg-linear-to-r from-[#081F5C] to-[#1447a6] p-0 shadow-sm hover:opacity-95"
              aria-label="Search"
              onClick={() => void loadAnnouncements()}
            >
              <Search className="h-3.5 w-3.5 text-white" />
            </Button>
          </div>
          <Button
            type="button"
            className="h-9 shrink-0 bg-linear-to-r from-[#081F5C] to-[#1447a6] px-3 sm:px-4 text-xs sm:text-sm text-white shadow-sm hover:opacity-95"
            onClick={() => {
              resetForm()
              setIsCreateOpen(true)
            }}
          >
            <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Create announcement
          </Button>
        </div>
      </div>

      <Card className="mt-3 min-w-0 max-w-full overflow-hidden rounded-lg border border-[#081F5C]/12 bg-white shadow-lg ring-1 ring-black/3 backdrop-blur-sm dark:border-white/10 dark:bg-[#0c1929]/90 dark:ring-white/6">
        <CardContent className="min-w-0 p-0">
          {/* Desktop Table View */}
          <div className="scrollbar-thin hidden max-w-full overflow-x-auto scroll-smooth md:block">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead className="[&_tr]:border-0">
                <tr className="border-0 bg-linear-to-r from-[#081F5C] to-[#1447a6]">
                  <th className="w-[26%] border-0 px-4 py-3.5 text-left text-[11px] font-semibold tracking-widest text-white/95 uppercase">
                    Title
                  </th>
                  <th className="w-[12%] border-0 px-3 py-3.5 text-left text-[11px] font-semibold tracking-widest text-white/95 uppercase">
                    Priority
                  </th>
                  <th className="w-[16%] border-0 px-3 py-3.5 text-left text-[11px] font-semibold tracking-widest text-white/95 uppercase">
                    Status
                  </th>
                  <th className="w-[16%] border-0 px-3 py-3.5 text-left text-[11px] font-semibold tracking-widest text-white/95 uppercase">
                    Target
                  </th>
                  <th className="w-[16%] border-0 px-3 py-3.5 text-left text-[11px] font-semibold tracking-widest text-white/95 uppercase">
                    Created
                  </th>
                  <th className="w-[14%] border-0 px-3 py-3.5 text-center text-[11px] font-semibold tracking-widest text-white/95 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#04133d]/35">
                {loading && announcements.length === 0 ? (
                  <tr>
                    <td className="px-6 py-14 text-center text-sm text-muted-foreground" colSpan={6}>
                      Loading…
                    </td>
                  </tr>
                ) : filteredAnnouncements.length === 0 ? (
                  <tr>
                    <td className="px-6 py-14 text-center text-sm text-muted-foreground" colSpan={6}>
                      {announcements.length === 0
                        ? 'No announcements yet. Create one to get started.'
                        : 'No rows match your filters or search.'}
                    </td>
                  </tr>
                ) : (
                  filteredAnnouncements.map((row, idx) => (
                    <tr
                      key={row._id || row.id}
                      className={`transition-colors duration-150 hover:bg-[#081F5C]/5 dark:hover:bg-white/6 ${idx % 2 === 1 ? 'bg-[#081F5C]/2.5 dark:bg-white/2' : ''} ${idx < filteredAnnouncements.length - 1 ? 'border-b border-[#081F5C]/8 dark:border-white/5' : ''}`}
                    >
                      <td className="px-4 py-3.5">
                        <div className="truncate font-semibold text-foreground">{row.title}</div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          by {row.authorName || row.author?.fullName || 'Admin'}
                        </div>
                      </td>
                      <td className="px-3 py-3.5 align-middle">
                        <Badge className={`text-xs capitalize ${getPriorityBadgeClass(row.priority)}`}>
                          {row.priority || 'normal'}
                        </Badge>
                      </td>
                      <td className="px-3 py-3.5 align-middle">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(row.status)}
                          <Badge className={`text-xs capitalize ${getStatusBadgeClass(row.status)}`}>
                            {row.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 align-middle text-sm capitalize text-foreground">
                        {audienceLabel(row.targetAudience)}
                      </td>
                      <td className="px-3 py-3.5 align-middle text-sm tabular-nums text-muted-foreground">
                        {formatDate(row.createdAt)}
                        {(row.viewCount ?? 0) > 0 ? (
                          <div className="text-xs text-muted-foreground">{row.viewCount} views</div>
                        ) : null}
                      </td>
                      <td className="px-2 py-3 text-center align-middle">
                        <div className="flex items-center justify-center gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-[#081F5C] hover:bg-[#081F5C]/10 dark:text-blue-200"
                            onClick={() => {
                              setSelectedAnnouncement(row)
                              setIsViewOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                            onClick={() => handleEditAnnouncement(row)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                            onClick={() => void handleDeleteAnnouncement(row._id || row.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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
          <div className="block divide-y divide-[#081F5C]/8 dark:divide-white/5 md:hidden">
            {loading && announcements.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : filteredAnnouncements.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                {announcements.length === 0
                  ? 'No announcements yet. Create one to get started.'
                  : 'No rows match your filters or search.'}
              </div>
            ) : (
              filteredAnnouncements.map((row) => (
                <div
                  key={row._id || row.id}
                  className="space-y-2 p-3.5 transition-colors hover:bg-[#081F5C]/5 dark:hover:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{row.title}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        by {row.authorName || row.author?.fullName || 'Admin'} • {formatDate(row.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-[#081F5C] hover:bg-[#081F5C]/10 dark:text-blue-200"
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
                        className="h-7 w-7 p-0 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                        onClick={() => handleEditAnnouncement(row)}
                        title="Edit"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                        onClick={() => void handleDeleteAnnouncement(row._id || row.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {row.content ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{row.content}</p>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
                    <Badge className={`px-2 py-0.5 text-[10px] capitalize ${getPriorityBadgeClass(row.priority)}`}>
                      {row.priority || 'normal'}
                    </Badge>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(row.status)}
                      <Badge className={`px-2 py-0.5 text-[10px] capitalize ${getStatusBadgeClass(row.status)}`}>
                        {row.status}
                      </Badge>
                    </div>
                    <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">
                      {audienceLabel(row.targetAudience)}
                    </span>
                    {(row.viewCount ?? 0) > 0 ? (
                      <span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {row.viewCount} views
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open)
          if (!open) resetForm()
        }}
      >
        <DialogContent
          className="max-h-[90vh] max-w-[calc(100vw-1rem)] overflow-y-auto p-4 sm:p-6 border-[#081F5C]/12 sm:max-w-2xl dark:border-white/10"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">Create announcement</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Title and content are required. Drafts stay internal until you publish.
            </DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter className="mx-0 mb-0 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={loading} onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading}
              className="bg-linear-to-r from-[#081F5C] to-[#1447a6] text-white shadow-sm hover:opacity-95"
              onClick={() => void handleCreateAnnouncement()}
            >
              {loading ? 'Creating…' : 'Create announcement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          className="max-h-[90vh] max-w-[calc(100vw-1rem)] overflow-y-auto p-4 sm:p-6 border-[#081F5C]/12 sm:max-w-2xl dark:border-white/10"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit announcement</DialogTitle>
            <DialogDescription className="text-muted-foreground">Update fields and save changes.</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter className="mx-0 mb-0 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
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
              className="bg-linear-to-r from-[#081F5C] to-[#1447a6] text-white shadow-sm hover:opacity-95"
              onClick={() => void handleUpdateAnnouncement()}
            >
              {loading ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent
          className="max-h-[90vh] max-w-[calc(100vw-1rem)] overflow-y-auto p-4 sm:p-6 border-[#081F5C]/12 sm:max-w-2xl dark:border-white/10"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">Announcement details</DialogTitle>
            <DialogDescription className="text-muted-foreground">Read-only summary.</DialogDescription>
          </DialogHeader>
          {selectedAnnouncement ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{selectedAnnouncement.title}</h3>
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{selectedAnnouncement.content}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 border-t border-border pt-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Priority</p>
                  <Badge className={`mt-1 text-xs capitalize ${getPriorityBadgeClass(selectedAnnouncement.priority)}`}>
                    {selectedAnnouncement.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Status</p>
                  <div className="mt-1 flex items-center gap-2">
                    {getStatusIcon(selectedAnnouncement.status)}
                    <Badge className={`text-xs capitalize ${getStatusBadgeClass(selectedAnnouncement.status)}`}>
                      {selectedAnnouncement.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Target audience</p>
                  <p className="mt-1 text-sm text-foreground">{audienceLabel(selectedAnnouncement.targetAudience)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Author</p>
                  <p className="mt-1 text-sm text-foreground">
                    {selectedAnnouncement.authorName || selectedAnnouncement.author?.fullName || 'Admin'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Created</p>
                  <p className="mt-1 text-sm text-foreground">{formatDate(selectedAnnouncement.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Views</p>
                  <p className="mt-1 text-sm text-foreground">
                    {selectedAnnouncement.viewCount ?? selectedAnnouncement.views ?? 0}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setIsViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
