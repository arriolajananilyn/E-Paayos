import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  Ban,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Layers,
  Mail,
  MessageSquare,
  Phone,
  Printer,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  User,
  Users,
  Wrench,
  X,
} from "lucide-react"
import {
  IssueWarningDialog,
  LiftRestrictionDialog,
  RestrictUserDialog,
} from "@/components/admin/UserModerationDialogs.jsx"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import { cn } from "@/lib/utils"
import AdminDashboard from "./dashboard.jsx"
import { printOfficialDocument, exportReportToCSV } from "@/lib/reportDocExporter"

const API_URL = getApiBaseUrl()

function authHeaders() {
  const token = localStorage.getItem("token")
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function formatDateDisplay(d) {
  if (!d) return "—"
  const date = new Date(d)
  if (isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function timeAgo(dateString) {
  if (!dateString) return "Recently"
  const d = new Date(dateString)
  const diffMs = Date.now() - d.getTime()
  if (isNaN(diffMs)) return "Recently"
  const sec = Math.floor(diffMs / 1000)
  const min = Math.floor(sec / 60)
  const hr = Math.floor(min / 60)
  const day = Math.floor(hr / 24)
  if (sec < 60) return "Just now"
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  return `${day}d ago`
}

const CATEGORY_META = {
  warranty_violation: {
    label: "Warranty Refusal / Violation",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300",
    icon: ShieldAlert,
  },
  overcharging: {
    label: "Overcharging / Hidden Fees",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300",
    icon: AlertTriangle,
  },
  poor_service: {
    label: "Unsatisfactory / Poor Quality Work",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300",
    icon: Wrench,
  },
  damage_property: {
    label: "Property / Item Damage",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300",
    icon: AlertCircle,
  },
  late_no_show: {
    label: "Late / No-Show Service",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300",
    icon: Clock,
  },
  unprofessional_behavior: {
    label: "Rude / Unprofessional Conduct",
    badgeClass: "bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950/60 dark:text-pink-300",
    icon: Users,
  },
  scam_fraud: {
    label: "Fraudulent Activity / Scam",
    badgeClass: "bg-red-100 text-red-900 border-red-400 dark:bg-red-950 dark:text-red-200",
    icon: ShieldAlert,
  },
  harassment: {
    label: "Safety Concern / Harassment",
    badgeClass: "bg-red-200 text-red-950 border-red-500 dark:bg-red-950 dark:text-red-100",
    icon: AlertCircle,
  },
  fake_booking: {
    label: "Bogus / Fake Booking",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950 dark:text-rose-200",
    icon: AlertTriangle,
  },
  non_payment: {
    label: "Non-Payment / Fee Refusal",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200",
    icon: AlertTriangle,
  },
  abusive_customer: {
    label: "Abusive Customer Conduct",
    badgeClass: "bg-pink-100 text-pink-900 border-pink-300 dark:bg-pink-950 dark:text-pink-200",
    icon: Users,
  },
  policy_violation: {
    label: "Platform Policy Violation",
    badgeClass: "bg-indigo-100 text-indigo-900 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-200",
    icon: ShieldAlert,
  },
  other: {
    label: "General Platform Concern",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
    icon: FileText,
  },
}

const STATUS_META = {
  pending: {
    label: "Pending Review",
    badgeClass: "bg-amber-500/15 text-amber-700 border-amber-400/40 dark:bg-amber-400/20 dark:text-amber-300",
    dotClass: "bg-amber-500 animate-pulse",
  },
  under_investigation: {
    label: "Under Investigation",
    badgeClass: "bg-blue-500/15 text-blue-700 border-blue-400/40 dark:bg-blue-400/20 dark:text-blue-300",
    dotClass: "bg-blue-500",
  },
  action_taken: {
    label: "Action Taken",
    badgeClass: "bg-indigo-500/15 text-indigo-700 border-indigo-400/40 dark:bg-indigo-400/20 dark:text-indigo-300",
    dotClass: "bg-indigo-500",
  },
  resolved: {
    label: "Resolved & Closed",
    badgeClass: "bg-emerald-500/15 text-emerald-700 border-emerald-400/40 dark:bg-emerald-400/20 dark:text-emerald-300",
    dotClass: "bg-emerald-500",
  },
  dismissed: {
    label: "Dismissed / Inactive",
    badgeClass: "bg-slate-500/15 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400",
    dotClass: "bg-slate-400",
  },
}

const PRIORITY_META = {
  urgent: {
    label: "Urgent",
    badgeClass: "bg-rose-600 text-white font-extrabold shadow-xs",
  },
  high: {
    label: "High",
    badgeClass: "bg-orange-500 text-white font-bold",
  },
  medium: {
    label: "Medium",
    badgeClass: "bg-amber-500 text-white font-semibold",
  },
  low: {
    label: "Low",
    badgeClass: "bg-slate-500 text-white font-medium",
  },
}

function statusBadgeClass(status) {
  switch (status) {
    case 'pending':
      return 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
    case 'under_investigation':
      return 'border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
    case 'action_taken':
      return 'border-indigo-300 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
    case 'resolved':
      return 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
    case 'dismissed':
      return 'border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700'
  }
}

function priorityBadgeClass(priority) {
  switch (priority) {
    case 'urgent':
      return 'border-rose-300 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
    case 'high':
      return 'border-orange-300 bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300'
    case 'medium':
      return 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
    case 'low':
    default:
      return 'border-slate-300 bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  }
}

const QUICK_RULINGS = [
  {
    id: "warranty_refix",
    label: "Mandate Warranty Refix",
    action: "Mandatory Free Labor Re-fix Ordered under Warranty",
    status: "action_taken",
    remarks: "Our investigation confirmed that your service is covered under active warranty. The service provider has been officially instructed to perform the necessary re-fix free of labor charges.",
  },
  {
    id: "labor_refund",
    label: "Authorize Labor Refund",
    action: "Customer Labor Fee Refund Authorized",
    status: "action_taken",
    remarks: "A refund for the disputed labor service charge has been approved and endorsed to the shop for processing. Please coordinate with the shop or platform support for the disbursement.",
  },
  {
    id: "formal_warning",
    label: "Issue Formal Warning",
    action: "Official Violation Warning Issued to Provider",
    status: "action_taken",
    remarks: "An official violation warning notice has been formally recorded against the service provider regarding platform service standards.",
  },
  {
    id: "mutual_settlement",
    label: "Mutual Settlement",
    action: "Amicable Settlement Facilitated Between Parties",
    status: "resolved",
    remarks: "Both parties have reached an amicable agreement and the complaint has been concluded and settled.",
  },
  {
    id: "dismiss_no_violation",
    label: "Dismiss (No Breach)",
    action: "Dismissed - No Policy or Warranty Violation Established",
    status: "dismissed",
    remarks: "After reviewing the submitted statement and evidence, no platform policy or active warranty breach could be substantiated. The case is now closed.",
  },
]

const ACTION_PRESETS = [
  "Issue Formal Warning Notice to Shop / Technician",
  "Mandate Immediate Free Refix Under Active Warranty",
  "Facilitate Partial or Full Customer Labor Fee Refund",
  "Order Mandatory Shop Diagnostic Re-inspection",
  "Temporary Account Suspension (7-Day Investigative Hold)",
  "Permanent Revocation of Platform Accreditation & Ban",
  "Dismissal: Inconclusive Evidence or Force Majeure Weather Event",
  "Amicable Mutual Settlement Facilitated Between Parties",
]

const selectShell =
  "h-9 w-full appearance-none rounded-none border border-slate-200 bg-white px-3 py-1.5 pr-8 text-xs font-semibold text-slate-800 shadow-xs outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"

function getRangeDates(range) {
  if (!range || range === "all") return { from: null, to: null }
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)
  const firstDayOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1)
  const lastDayOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0)
  switch (range) {
    case "today":
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      return { from: start, to: end }
    case "this-week": {
      const day = now.getDay()
      const diffToMonday = (day + 6) % 7
      start.setDate(now.getDate() - diffToMonday)
      start.setHours(0, 0, 0, 0)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      return { from: start, to: end }
    }
    case "this-month":
      return { from: firstDayOfMonth(now), to: lastDayOfMonth(now) }
    case "last-month": {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return { from: firstDayOfMonth(lastMonth), to: lastDayOfMonth(lastMonth) }
    }
    case "this-year":
      return {
        from: new Date(now.getFullYear(), 0, 1),
        to: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      }
    default:
      return { from: null, to: null }
  }
}

export function AdminComplaintReportContent() {
  const [complaints, setComplaints] = useState([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    underInvestigation: 0,
    actionTaken: 0,
    resolved: 0,
    dismissed: 0,
    urgentOrHigh: 0,
  })
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [loadError, setLoadError] = useState("")

  // Filter States
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [reporterRoleFilter, setReporterRoleFilter] = useState("all")
  const [dateRange, setDateRange] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // User Moderation Dialogs linked from Complaint Investigation
  const [modTargetUser, setModTargetUser] = useState(null)
  const [warnDialogOpen, setWarnDialogOpen] = useState(false)
  const [restrictDialogOpen, setRestrictDialogOpen] = useState(false)
  const [liftDialogOpen, setLiftDialogOpen] = useState(false)

  const filteredComplaints = useMemo(() => {
    let list = complaints
    if (dateRange && dateRange !== "all") {
      const { from, to } = getRangeDates(dateRange)
      if (from && to) {
        list = list.filter((c) => {
          const t = new Date(c.createdAt).getTime()
          return t >= from.getTime() && t <= to.getTime()
        })
      }
    }
    return list
  }, [complaints, dateRange])

  // Modal / Detail States
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [copiedTicket, setCopiedTicket] = useState(false)
  const [resolveForm, setResolveForm] = useState({
    status: "under_investigation",
    priority: "high",
    adminAction: "",
    resolutionRemarks: "",
    adminNotes: "",
    notifyCustomer: true,
  })

  const handleCopyTicket = (ticketNum) => {
    if (!ticketNum) return
    navigator.clipboard?.writeText(ticketNum)
    setCopiedTicket(true)
    toast.success(`Copied ticket #${ticketNum} to clipboard`)
    setTimeout(() => setCopiedTicket(false), 2000)
  }

  const handleApplyRuling = (preset) => {
    setResolveForm((prev) => ({
      ...prev,
      status: preset.status,
      adminAction: preset.action,
      resolutionRemarks: preset.remarks,
    }))
    toast.info(`Applied "${preset.label}" ruling preset`)
  }

  const [isRequestingExplanation, setIsRequestingExplanation] = useState(false)

  const handleRequestProviderExplanation = async () => {
    if (!selectedComplaint) return
    setIsRequestingExplanation(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/complaints/${selectedComplaint._id}/request-explanation`, {
        method: "POST",
        headers: authHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || "Failed to send explanation request.")

      toast.success(data?.message || "Official explanation request sent to service provider!")
      setSelectedComplaint((prev) => ({
        ...prev,
        ...(data?.data || {}),
        explanationRequestedAt: data?.data?.explanationRequestedAt || new Date().toISOString(),
        status: data?.data?.status || (prev.status === "pending" ? "under_investigation" : prev.status),
      }))
      fetchComplaints(true)
    } catch (err) {
      toast.error(err?.message || "Failed to send inquiry notice")
    } finally {
      setIsRequestingExplanation(false)
    }
  }

  // Lightbox Preview
  const [previewPhoto, setPreviewPhoto] = useState(null)

  const fetchComplaints = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    else setIsRefreshing(true)
    setLoadError("")

    try {
      const queryParams = new URLSearchParams()
      if (statusFilter !== "all") queryParams.set("status", statusFilter)
      if (categoryFilter !== "all") queryParams.set("category", categoryFilter)
      if (priorityFilter !== "all") queryParams.set("priority", priorityFilter)
      if (reporterRoleFilter !== "all") queryParams.set("reporterRole", reporterRoleFilter)
      if (searchQuery.trim()) queryParams.set("search", searchQuery.trim())

      const [listRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/complaints?${queryParams.toString()}`, {
          headers: authHeaders(),
        }),
        fetch(`${API_URL}/api/admin/complaints/stats`, {
          headers: authHeaders(),
        }),
      ])

      const listJson = await listRes.json().catch(() => ({}))
      const statsJson = await statsRes.json().catch(() => ({}))

      if (!listRes.ok) throw new Error(listJson?.message || "Could not fetch complaints.")

      setComplaints(Array.isArray(listJson?.data) ? listJson.data : [])
      if (statsJson?.success && statsJson?.data) {
        setStats(statsJson.data)
      }
    } catch (err) {
      setLoadError(err?.message || "Failed to load customer complaints.")
      toast.error(err?.message || "Failed to load complaints")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [statusFilter, categoryFilter, priorityFilter, reporterRoleFilter, searchQuery])

  useEffect(() => {
    fetchComplaints()
  }, [fetchComplaints])

  const openComplaintModal = async (comp) => {
    setSelectedComplaint(comp)
    setResolveForm({
      status: comp.status || "pending",
      priority: comp.priority || "medium",
      adminAction: comp.adminAction || "",
      resolutionRemarks: comp.resolutionRemarks || "",
      adminNotes: comp.adminNotes || "",
      notifyCustomer: true,
    })
    setIsDetailOpen(true)
    try {
      const res = await fetch(`${API_URL}/api/admin/complaints/${comp._id}`, {
        headers: authHeaders(),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json?.data) {
        setSelectedComplaint(json.data)
        setResolveForm((prev) => ({
          ...prev,
          status: json.data.status || prev.status,
          priority: json.data.priority || prev.priority,
          adminAction: json.data.adminAction || "",
          resolutionRemarks: json.data.resolutionRemarks || "",
          adminNotes: json.data.adminNotes || "",
        }))
      }
    } catch {
      // keep initial row data on network error
    }
  }

  const handleSaveResolution = async () => {
    if (!selectedComplaint) return
    setIsResolving(true)

    try {
      const res = await fetch(`${API_URL}/api/admin/complaints/${selectedComplaint._id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(resolveForm),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || "Failed to update complaint resolution.")

      toast.success(`Complaint #${selectedComplaint.ticketNumber} successfully updated!`)
      setIsDetailOpen(false)
      fetchComplaints(true)
    } catch (err) {
      toast.error(err?.message || "Error updating complaint")
    } finally {
      setIsResolving(false)
    }
  }

  // Official CSV Export
  const handleExportCSV = () => {
    if (!filteredComplaints.length) {
      toast.error("No complaints matching current filters to export.")
      return
    }

    const headers = [
      "Ticket Number",
      "Date Filed",
      "Status",
      "Priority",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Target Entity",
      "Category",
      "Subject",
      "Description",
      "Admin Action",
      "Resolution Remarks",
    ]

    const rows = filteredComplaints.map((c) => [
      c.ticketNumber || "",
      formatDateDisplay(c.createdAt),
      STATUS_META[c.status]?.label || c.status,
      c.priority?.toUpperCase() || "",
      c.customerName || "",
      c.customerEmail || "",
      c.customerPhone || "",
      c.targetShopName || c.targetTechnicianName || "Platform",
      CATEGORY_META[c.category]?.label || c.category,
      c.subject || "",
      `"${String(c.description || "").replace(/"/g, '""')}"`,
      c.adminAction || "",
      c.resolutionRemarks || "",
    ])

    exportReportToCSV({
      filename: `EPaayos_Customer_Complaints_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows,
    })
    toast.success("Complaints report exported to CSV!")
  }

  // Official Printable Document
  const handlePrintDocument = () => {
    if (!filteredComplaints.length) {
      toast.error("No complaints available to print.")
      return
    }

    printOfficialDocument({
      docTitle: "CONSUMER GRIEVANCE & DISPUTE AUDIT REPORT",
      subTitle: "E-Paayos Provincial Technical Moderation & Consumer Protection Board",
      organization: "Provincial Government of Marinduque • LMD-PESO Accreditation Division",
      preparedBy: "E-Paayos System Administrator",
      stats: [
        { label: "Total Complaints Logged", value: stats.total },
        { label: "Pending Resolution", value: stats.pending },
        { label: "Under Investigation", value: stats.underInvestigation },
        { label: "Enforced / Resolved", value: stats.resolved + stats.actionTaken },
      ],
      sections: [
        {
          title: "CUSTOMER COMPLAINTS & ARBITRATION REGISTER",
          headers: ["Ticket #", "Date Filed", "Customer", "Reported Shop / Provider", "Category", "Status", "Ruling / Action"],
          rows: filteredComplaints.map((c) => [
            c.ticketNumber,
            formatDateDisplay(c.createdAt),
            c.customerName,
            c.targetShopName || c.targetTechnicianName || "Platform",
            CATEGORY_META[c.category]?.label || c.category,
            STATUS_META[c.status]?.label || c.status,
            c.adminAction || c.resolutionRemarks || "Pending Audit",
          ]),
        },
      ],
      notes: "This official documentation represents verified customer reports submitted through the E-Paayos platform. All actions reflect statutory consumer protection standards pursuant to the Fair Trade Act and accredited provincial service warranty guidelines.",
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-5 min-w-0 max-w-full">
      {/* Top Banner & Header */}
      <div className="relative overflow-hidden rounded-none border border-[#081F5C]/30 bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] p-4 sm:p-6 text-white shadow-md">
        <div className="pointer-events-none absolute -right-6 -bottom-6 size-48 rounded-full bg-white/10 blur-2xl" />
        <ShieldAlert className="pointer-events-none absolute right-4 top-4 size-24 text-white/10 stroke-[1.2]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider bg-white/15 border border-white/20 backdrop-blur-md rounded-none">
              <Shield className="size-3 text-amber-300" />
              <span>LMD-PESO Dispute Resolution Board</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight drop-shadow-sm">
              Complaint and Damage Reports Oversight
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 font-medium max-w-2xl leading-relaxed">
              LMD-PESO administrative oversight: review, monitor, manage, and coordinate between customers and accredited repair service providers to resolve complaints, enforce warranty obligations, and maintain dispute documentation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchComplaints(true)}
              disabled={isRefreshing}
              className="h-8.5 rounded-none bg-white/10 hover:bg-white/20 border-white/25 text-white text-xs font-bold cursor-pointer"
            >
              <RefreshCw className={cn("size-3.5 mr-1.5", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-8.5 rounded-none bg-white/10 hover:bg-white/20 border-white/25 text-white text-xs font-bold cursor-pointer"
            >
              <Download className="size-3.5 mr-1.5" />
              Export CSV
            </Button>
            <Button
              size="sm"
              onClick={handlePrintDocument}
              className="h-8.5 rounded-none bg-white text-[#081F5C] hover:bg-blue-50 font-black text-xs shadow-xs cursor-pointer"
            >
              <Printer className="size-3.5 mr-1.5" />
              Print Official Report
            </Button>
          </div>
        </div>
      </div>



      {/* Filters & Search - Aligned with userManagement.jsx (Not placed inside a card container) */}
      <div className="mb-1 flex min-w-0 max-w-full flex-col gap-2.5 sm:gap-3 lg:flex-row lg:items-stretch lg:justify-between">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-1 sm:flex-row sm:flex-wrap sm:gap-3 min-w-0 w-full max-w-full">
          {/* Status */}
          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[140px] sm:flex-1 sm:max-w-[200px]">
            <select
              className={selectShell}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending ({stats.pending})</option>
              <option value="under_investigation">Under Investigation ({stats.underInvestigation})</option>
              <option value="action_taken">Action Taken ({stats.actionTaken})</option>
              <option value="resolved">Resolved ({stats.resolved})</option>
              <option value="dismissed">Dismissed ({stats.dismissed})</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Category */}
          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[210px]">
            <select
              className={selectShell}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All categories</option>
              <option value="warranty_violation">Warranty violation</option>
              <option value="overcharging">Overcharging / fees</option>
              <option value="poor_service">Poor quality work</option>
              <option value="damage_property">Property damage</option>
              <option value="late_no_show">Late / no-show</option>
              <option value="unprofessional_behavior">Unprofessional conduct</option>
              <option value="fake_booking">Bogus / fake booking</option>
              <option value="non_payment">Non-payment</option>
              <option value="abusive_customer">Abusive customer</option>
              <option value="scam_fraud">Scam / fraud</option>
              <option value="harassment">Safety concern</option>
              <option value="policy_violation">Policy violation</option>
              <option value="other">General concern</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Reporter Source */}
          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[140px] sm:flex-1 sm:max-w-[200px]">
            <select
              className={selectShell}
              value={reporterRoleFilter}
              onChange={(e) => setReporterRoleFilter(e.target.value)}
            >
              <option value="all">All reporters</option>
              <option value="customer">Customer reports</option>
              <option value="provider">Shop / Tech reports</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Severity */}
          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[130px] sm:flex-1 sm:max-w-[180px]">
            <select
              className={selectShell}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All severities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Date Range */}
          <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[130px] sm:flex-1 sm:max-w-[180px]">
            <select
              className={selectShell}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="this-week">This week</option>
              <option value="this-month">This month</option>
              <option value="last-month">Last month</option>
              <option value="this-year">This year</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-slate-400" />
          </div>

          {(statusFilter !== "all" || categoryFilter !== "all" || priorityFilter !== "all" || reporterRoleFilter !== "all" || dateRange !== "all" || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("all")
                setCategoryFilter("all")
                setPriorityFilter("all")
                setReporterRoleFilter("all")
                setDateRange("all")
                setSearchQuery("")
              }}
              className="h-9 px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-none cursor-pointer"
            >
              Reset
            </Button>
          )}
        </div>

        {/* Search Bar - Matching userManagement.jsx */}
        <div className="relative min-w-0 w-full max-w-full lg:max-w-lg lg:flex-1">
          <div className="relative w-full min-w-0 max-w-full">
            <Input
              className="h-9 w-full min-w-0 rounded-none border border-slate-200 bg-white pr-12 pl-3.5 text-xs font-medium text-slate-800 shadow-xs focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100"
              placeholder="Search ticket, customer, shop"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search complaints"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 right-9 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
            <Button
              type="button"
              size="icon-sm"
              onClick={() => fetchComplaints(true)}
              className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-none bg-gradient-to-br from-[#081F5C] to-[#1447a6] p-0 shadow-xs hover:opacity-95 cursor-pointer"
              aria-label="Search"
            >
              <Search className="h-3.5 w-3.5 text-white" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500">
          <Spinner className="size-8 text-[#081F5C] animate-spin" />
          <p className="mt-3 text-sm font-semibold">Loading customer complaints & reports...</p>
        </div>
      ) : loadError ? (
        <div className="p-8 text-center bg-rose-50 border border-rose-200 text-rose-700">
          <AlertCircle className="size-8 mx-auto mb-2 text-rose-600" />
          <p className="font-bold text-sm">{loadError}</p>
          <Button
            size="sm"
            onClick={() => fetchComplaints()}
            className="mt-3 bg-rose-600 text-white rounded-none cursor-pointer"
          >
            Retry
          </Button>
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
          <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
            <CheckCircle className="size-8 text-emerald-500" />
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-white">
            No Complaints Found
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-md">
            No customer complaints match the current filter selection. All customer reports and disputes are resolved or none have been filed under this query.
          </p>
          {(statusFilter !== "all" || categoryFilter !== "all" || priorityFilter !== "all" || dateRange !== "all" || searchQuery) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStatusFilter("all")
                setCategoryFilter("all")
                setPriorityFilter("all")
                setDateRange("all")
                setSearchQuery("")
              }}
              className="mt-4 rounded-none text-xs font-bold cursor-pointer"
            >
              Clear All Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
            <span>Showing {filteredComplaints.length} Report{filteredComplaints.length === 1 ? "" : "s"}</span>
            <span>Sorted by Latest Incident</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredComplaints.map((comp) => {
              const catMeta = CATEGORY_META[comp.category] || CATEGORY_META.other
              const statMeta = STATUS_META[comp.status] || STATUS_META.pending
              const prioMeta = PRIORITY_META[comp.priority] || PRIORITY_META.medium
              const CatIcon = catMeta.icon

              return (
                <div
                  key={comp._id}
                  className={cn(
                    "group relative overflow-hidden bg-white dark:bg-slate-900 border transition-all duration-200 hover:shadow-md p-4 sm:p-5",
                    comp.status === "pending"
                      ? "border-amber-300/80 dark:border-amber-900/60"
                      : comp.priority === "urgent"
                      ? "border-rose-300 dark:border-rose-900/60"
                      : "border-slate-200 dark:border-slate-800"
                  )}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                    {/* Top Row: Ticket number, Badges, Date */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-extrabold tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded-none">
                        {comp.ticketNumber}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold border rounded-none",
                          statMeta.badgeClass
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", statMeta.dotClass)} />
                        <span>{statMeta.label}</span>
                      </span>

                      {/* Priority */}
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[10px] uppercase tracking-wider rounded-none",
                          prioMeta.badgeClass
                        )}
                      >
                        {prioMeta.label} Severity
                      </span>

                      {/* Category Chip */}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold border rounded-none",
                          catMeta.badgeClass
                        )}
                      >
                        <CatIcon className="size-3" />
                        <span>{catMeta.label}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium shrink-0">
                      <Clock className="size-3.5 text-slate-400" />
                      <span>{timeAgo(comp.createdAt)}</span>
                      <span className="text-slate-300">•</span>
                      <span>{formatDateDisplay(comp.createdAt)}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="mt-3.5 grid grid-cols-1 lg:grid-cols-12 gap-4">
                    {/* Left & Middle Column (8 cols): Subject, Description & Evidence */}
                    <div className="lg:col-span-8 space-y-2">
                      <h4 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                        {comp.subject}
                      </h4>
                      <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed font-normal line-clamp-3">
                        {comp.description}
                      </p>

                      {/* Evidence Photo Thumbnails */}
                      {Array.isArray(comp.evidencePhotos) && comp.evidencePhotos.length > 0 && (
                        <div className="pt-2 flex items-center gap-2 overflow-x-auto">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                            Evidence ({comp.evidencePhotos.length}):
                          </span>
                          {comp.evidencePhotos.map((photo, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => setPreviewPhoto(photo)}
                              className="relative size-12 shrink-0 overflow-hidden border border-slate-300 hover:border-[#081F5C] transition-all cursor-pointer group/img"
                            >
                              <img
                                src={photo}
                                alt="Complaint Evidence"
                                className="size-full object-cover group-hover/img:scale-110 transition-transform duration-300"
                              />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Admin Resolution Summary if existing */}
                      {comp.adminAction && (
                        <div className="mt-2.5 inline-flex items-center gap-2 px-2.5 py-1 text-xs bg-indigo-50 border border-indigo-200 text-indigo-900 font-semibold">
                          <ShieldCheck className="size-3.5 text-indigo-600 shrink-0" />
                          <span>Action: {comp.adminAction}</span>
                        </div>
                      )}
                    </div>

                    {/* Right Column (4 cols): Complainant & Target Party info */}
                    <div className="lg:col-span-4 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 pt-3 lg:pt-0 lg:pl-4 space-y-3">
                      <div className="space-y-2 text-xs">
                        {/* Reporter */}
                        {(() => {
                          const isProviderReporter =
                            comp.reporterRole && comp.reporterRole !== "customer"
                          const repName =
                            comp.reporterName || comp.reporter?.fullName || comp.customerName || "User"
                          const repContact =
                            comp.reporterEmail || comp.reporter?.email || comp.customerEmail || comp.customerPhone || "—"
                          return (
                            <div className="flex items-start gap-2">
                              <div className="size-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 shrink-0 text-xs">
                                {repName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                  {isProviderReporter ? "Reporter (Service Provider)" : "Complainant (Customer)"}
                                </span>
                                <p className="font-bold text-slate-900 dark:text-white truncate">{repName}</p>
                                <p className="text-[11px] text-slate-500 truncate">{repContact}</p>
                              </div>
                            </div>
                          )
                        })()}

                        {/* Target Reported Party */}
                        {(() => {
                          const isCustomerTarget = comp.targetType === "customer"
                          const targetObj = isCustomerTarget
                            ? comp.reportedUser || comp.customer
                            : comp.reportedUser || comp.targetShop || comp.targetTechnician
                          const targetName = isCustomerTarget
                            ? comp.reportedUserName || comp.customerName || targetObj?.fullName || "Customer"
                            : comp.targetShopName || comp.targetTechnicianName || comp.reportedUserName || "Platform General"
                          const targetStatus = targetObj?.moderationStatus || "active"
                          const targetStrikes = Number(targetObj?.warningCount || 0)

                          return (
                            <div className="flex items-start gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                              <div className="size-7 rounded-none bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-700 dark:text-blue-300 shrink-0">
                                {isCustomerTarget ? <User className="size-3.5" /> : <Store className="size-3.5" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                  {isCustomerTarget ? "Reported Customer" : "Reported Shop / Provider"}
                                </span>
                                <p className="font-bold text-blue-900 dark:text-blue-300 truncate">{targetName}</p>
                                <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                  {targetStatus === "restricted" ? (
                                    <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                                      Restricted
                                    </span>
                                  ) : targetStrikes > 0 ? (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                                      {targetStrikes} Strike{targetStrikes === 1 ? "" : "s"}
                                    </span>
                                  ) : null}
                                  {comp.moderationOutcome && comp.moderationOutcome !== "none" && (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-indigo-50 text-indigo-800 border border-indigo-200">
                                      {comp.moderationOutcome === "warned" ? `Warned (${comp.linkedWarningRef || "WRN"})` : "Account Restricted"}
                                    </span>
                                  )}
                                </div>
                                {comp.bookingServiceTitle && (
                                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                    Job: {comp.bookingServiceTitle}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })()}
                      </div>

                      {/* Action Button */}
                      <div className="pt-2">
                        <Button
                          onClick={() => openComplaintModal(comp)}
                          className="w-full h-8.5 rounded-none bg-[#081F5C] hover:bg-[#1447a6] text-white text-xs font-bold cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <Eye className="size-3.5" />
                          <span>Investigate & Resolve</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Investigation & Resolution Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent
          className="max-h-[90vh] max-w-[calc(100vw-1.5rem)] sm:max-w-2xl overflow-hidden flex flex-col p-0 border border-slate-200 bg-white shadow-2xl rounded-none dark:border-slate-800 dark:bg-slate-900"
          showCloseButton
        >
          {selectedComplaint ? (
            <>
              {/* Compact Header Gradient Banner */}
              <div className="bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-4 py-3 sm:px-5 sm:py-3.5 text-white shrink-0 border-b border-white/10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pr-6">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-7 sm:size-8 items-center justify-center bg-white/15 text-white border border-white/20 shrink-0">
                      <ShieldAlert className="size-3.5 sm:size-4 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <DialogTitle className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                          Complaint Details
                        </DialogTitle>
                        <button
                          type="button"
                          onClick={() => handleCopyTicket(selectedComplaint.ticketNumber)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/15 hover:bg-white/25 text-white border border-white/30 transition-colors cursor-pointer"
                          title="Click to copy ticket number"
                        >
                          <span>{selectedComplaint.ticketNumber}</span>
                          {copiedTicket ? (
                            <Check className="size-2.5 text-emerald-300" />
                          ) : (
                            <Copy className="size-2.5 text-white/70" />
                          )}
                        </button>
                      </div>
                      <DialogDescription className="text-[10px] sm:text-[11px] text-blue-100/75 font-normal">
                        Filed {formatDateDisplay(selectedComplaint.createdAt)} · Admin Resolution &amp; Audit
                      </DialogDescription>
                    </div>
                  </div>

                  {/* Badges in same compact row */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border", statusBadgeClass(selectedComplaint.status))}>
                      {STATUS_META[selectedComplaint.status]?.label || selectedComplaint.status}
                    </Badge>
                    <Badge className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border", priorityBadgeClass(selectedComplaint.priority))}>
                      {selectedComplaint.priority} Priority
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
                {/* 1. Complainant & Reported Entity Grid */}
                {(() => {
                  const isProviderReporter =
                    selectedComplaint.reporterRole && selectedComplaint.reporterRole !== "customer"
                  const repName =
                    selectedComplaint.reporterName ||
                    selectedComplaint.reporter?.fullName ||
                    selectedComplaint.customerName ||
                    "Anonymous"
                  const repEmail =
                    selectedComplaint.reporterEmail ||
                    selectedComplaint.reporter?.email ||
                    selectedComplaint.customerEmail ||
                    "No email provided"
                  const repPhone =
                    selectedComplaint.reporterPhone ||
                    selectedComplaint.reporter?.phoneNumber ||
                    selectedComplaint.customerPhone ||
                    "No phone provided"

                  const isCustomerTarget = selectedComplaint.targetType === "customer"
                  const targetUserObj = isCustomerTarget
                    ? selectedComplaint.reportedUser || selectedComplaint.customer
                    : selectedComplaint.reportedUser || selectedComplaint.targetShop || selectedComplaint.targetTechnician
                  const targetDisplayName = isCustomerTarget
                    ? selectedComplaint.reportedUserName ||
                      selectedComplaint.customerName ||
                      targetUserObj?.fullName ||
                      "Customer"
                    : selectedComplaint.targetShopName ||
                      selectedComplaint.targetTechnicianName ||
                      selectedComplaint.reportedUserName ||
                      "Platform General Entity"

                  const targetId =
                    targetUserObj?._id ||
                    (typeof targetUserObj === "string" ? targetUserObj : null)
                  const targetModStatus = targetUserObj?.moderationStatus || "active"
                  const targetWarnings = Number(targetUserObj?.warningCount || 0)

                  const normalizedModTarget = targetId
                    ? {
                        id: String(targetId),
                        _id: String(targetId),
                        fullName: targetDisplayName,
                        email: targetUserObj?.email || "",
                        role: targetUserObj?.role || (isCustomerTarget ? "customer" : "shop-owner"),
                        warningCount: targetWarnings,
                        moderationStatus: targetModStatus,
                      }
                    : null

                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {/* Reporter Card */}
                        <div className="border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 dark:border-slate-800 dark:bg-slate-800/40">
                          <div className="flex items-center gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-700">
                            <User className="size-3.5 text-[#1447a6] dark:text-blue-400 shrink-0" />
                            <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-800 dark:text-slate-200">
                              {isProviderReporter ? "Reporter (Service Provider)" : "Complainant (Customer)"}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <p className="font-bold text-slate-900 dark:text-white text-sm">{repName}</p>
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <Mail className="size-3 text-slate-400 shrink-0" />
                              <span className="truncate">{repEmail}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                              <Phone className="size-3 text-slate-400 shrink-0" />
                              <span>{repPhone}</span>
                            </div>
                          </div>
                        </div>

                        {/* Reported Party Card */}
                        <div className="border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 dark:border-slate-800 dark:bg-slate-800/40">
                          <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-1.5">
                              {isCustomerTarget ? (
                                <User className="size-3.5 text-rose-600 shrink-0" />
                              ) : (
                                <Store className="size-3.5 text-[#1447a6] dark:text-blue-400 shrink-0" />
                              )}
                              <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-800 dark:text-slate-200">
                                {isCustomerTarget ? "Reported Customer" : "Reported Party / Entity"}
                              </span>
                            </div>
                            {targetModStatus === "restricted" ? (
                              <span className="px-1.5 py-0.5 text-[9px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                                Restricted
                              </span>
                            ) : targetWarnings > 0 ? (
                              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
                                {targetWarnings} Strike{targetWarnings === 1 ? "" : "s"}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 text-[9px] font-semibold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Clean Standing
                              </span>
                            )}
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-blue-900 dark:text-blue-300 text-sm">
                                {targetDisplayName}
                              </p>
                              {(selectedComplaint.targetShop?.role === "oncall-mechanic-technician" ||
                                selectedComplaint.targetTechnician?.role === "oncall-mechanic-technician" ||
                                selectedComplaint.targetType === "technician") && (
                                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800">
                                  On-call Mechanic
                                </span>
                              )}
                            </div>
                            {selectedComplaint.targetShop?.shopAddress ? (
                              <p className="text-slate-600 dark:text-slate-300 text-[11px] line-clamp-1">
                                {selectedComplaint.targetShop.shopAddress}
                              </p>
                            ) : null}
                            {selectedComplaint.booking ? (
                              <div className="pt-0.5 flex items-center gap-1.5 text-[11px]">
                                <span className="text-slate-500">Booking Ref:</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-200/60 dark:bg-slate-700 px-1 py-0.5">
                                  #{String(selectedComplaint.booking?.ref || selectedComplaint.booking?._id || selectedComplaint.booking).slice(-8)}
                                </span>
                              </div>
                            ) : null}
                            {selectedComplaint.bookingServiceTitle ? (
                              <p className="text-[11px] text-slate-500">
                                Service: <span className="text-slate-700 dark:text-slate-300 font-semibold">{selectedComplaint.bookingServiceTitle}</span>
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Progressive Discipline Action Bar for Reported User */}
                      {normalizedModTarget && (
                        <div className="border-2 border-amber-200 bg-amber-50/60 p-3.5 space-y-2.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                                  <ShieldAlert className="size-3.5 text-amber-600" />
                                  User Discipline &amp; Account Action
                                </span>
                                {selectedComplaint.moderationOutcome && selectedComplaint.moderationOutcome !== "none" && (
                                  <Badge className="rounded-none text-[10px] font-bold uppercase bg-indigo-100 text-indigo-900 border border-indigo-300">
                                    {selectedComplaint.moderationOutcome === "warned"
                                      ? `Warning Issued (${selectedComplaint.linkedWarningRef || "WRN"})`
                                      : "Account Restricted"}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-700">
                                {targetModStatus === "restricted"
                                  ? `${targetDisplayName} is currently RESTRICTED (${targetWarnings} prior strike${targetWarnings === 1 ? "" : "s"}).`
                                  : targetWarnings > 0
                                    ? `${targetDisplayName} already has ${targetWarnings} warning strike(s) on record — repeat violations qualify for account restriction.`
                                    : `Issue a formal warning form (pops up on user's screen) or restrict account if severe.`}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 shrink-0">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  setModTargetUser(normalizedModTarget)
                                  setWarnDialogOpen(true)
                                }}
                                className="h-8 px-3 rounded-none bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                              >
                                <ShieldAlert className="size-3.5 mr-1.5" />
                                Issue Warning Form
                              </Button>

                              {targetModStatus === "restricted" ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    setModTargetUser(normalizedModTarget)
                                    setLiftDialogOpen(true)
                                  }}
                                  className="h-8 px-3 rounded-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                                >
                                  <ShieldCheck className="size-3.5 mr-1.5" />
                                  Lift Restriction
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => {
                                    setModTargetUser(normalizedModTarget)
                                    setRestrictDialogOpen(true)
                                  }}
                                  className="h-8 px-3 rounded-none bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold cursor-pointer"
                                >
                                  <Ban className="size-3.5 mr-1.5" />
                                  Restrict Account
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}

                {/* 2. Dispute Claim & Evidence */}
                <div className="border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <FileText className="size-3.5 text-[#1447a6] dark:text-blue-400 shrink-0" />
                      <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-800 dark:text-slate-200">
                        Incident Claim &amp; Statement
                      </span>
                    </div>
                    <Badge className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border", (CATEGORY_META[selectedComplaint.category] || CATEGORY_META.other).badgeClass)}>
                      {(CATEGORY_META[selectedComplaint.category] || CATEGORY_META.other).label}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                      {selectedComplaint.subject}
                    </p>
                    <div className="border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {selectedComplaint.description}
                    </div>
                  </div>

                  {/* Evidence Photos */}
                  {Array.isArray(selectedComplaint.evidencePhotos) && selectedComplaint.evidencePhotos.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                        Attached Photographic Evidence ({selectedComplaint.evidencePhotos.length}):
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {selectedComplaint.evidencePhotos.map((img, i) => (
                          <div
                            key={i}
                            onClick={() => setPreviewPhoto(img)}
                            className="group relative aspect-video overflow-hidden border border-slate-300 bg-black cursor-pointer dark:border-slate-700"
                          >
                            <img
                              src={img}
                              alt={`Evidence ${i + 1}`}
                              className="size-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
                              <Eye className="size-3 mr-1" /> View
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic pt-0.5">
                      No attached photographic evidence.
                    </p>
                  )}
                </div>

                {/* 3. Service Provider Explanation & Defense (LMD-PESO Coordination) */}
                <div className="border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-[#1447a6] dark:text-blue-400 shrink-0" />
                      <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-800 dark:text-slate-200">
                        Service Provider Explanation &amp; Defense
                      </span>
                    </div>
                    {selectedComplaint.providerRespondedAt ? (
                      <Badge className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Responded {formatDateDisplay(selectedComplaint.providerRespondedAt)}
                      </Badge>
                    ) : selectedComplaint.explanationRequestedAt ? (
                      <Badge className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        Inquiry Sent {formatDateDisplay(selectedComplaint.explanationRequestedAt)}
                      </Badge>
                    ) : (
                      <Badge className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Pending Explanation
                      </Badge>
                    )}
                  </div>

                  {selectedComplaint.providerExplanation ? (
                    <div className="space-y-2">
                      <div className="border border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30 p-3 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                        <p className="font-bold text-blue-950 dark:text-blue-200 mb-1 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                          <CheckCircle className="size-3 text-blue-600" /> Official Provider Statement:
                        </p>
                        {selectedComplaint.providerExplanation}
                      </div>

                      {Array.isArray(selectedComplaint.providerExplanationPhotos) && selectedComplaint.providerExplanationPhotos.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                            Provider Supporting Proof ({selectedComplaint.providerExplanationPhotos.length}):
                          </span>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {selectedComplaint.providerExplanationPhotos.map((img, i) => (
                              <div
                                key={i}
                                onClick={() => setPreviewPhoto(img)}
                                className="group relative aspect-video overflow-hidden border border-slate-300 bg-black cursor-pointer dark:border-slate-700"
                              >
                                <img
                                  src={img}
                                  alt={`Provider Proof ${i + 1}`}
                                  className="size-full object-cover transition-transform group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
                                  <Eye className="size-3 mr-1" /> View
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          The service provider has not yet submitted an official statement for this report.
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {selectedComplaint.explanationRequestedAt
                            ? `Official notice sent on ${formatDateDisplay(selectedComplaint.explanationRequestedAt)}. Awaiting provider submission.`
                            : "Dispatch an official LMD-PESO explanation notice to the provider via direct in-app message."}
                        </p>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        disabled={isRequestingExplanation}
                        onClick={handleRequestProviderExplanation}
                        className="h-8 px-3 text-xs font-bold rounded-none bg-blue-700 hover:bg-blue-800 text-white shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        {isRequestingExplanation ? (
                          <>
                            <Spinner className="size-3 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <MessageSquare className="size-3.5" />
                            {selectedComplaint.explanationRequestedAt ? "Resend Notice" : "Request Explanation"}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* 4. Administrative Resolution Workflow */}
                <div className="border border-slate-200 bg-slate-50/70 p-3.5 space-y-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-[#1447a6] dark:text-blue-400 shrink-0" />
                      <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-800 dark:text-slate-200">
                        Administrative Resolution Workflow
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Dispute Ruling &amp; Action
                    </span>
                  </div>

                  {/* Workflow Stage Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Workflow Stage (Status):
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase text-slate-500">Severity:</span>
                        <select
                          value={resolveForm.priority}
                          onChange={(e) => setResolveForm((prev) => ({ ...prev, priority: e.target.value }))}
                          className="h-6 px-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-[11px] font-bold uppercase"
                        >
                          <option value="urgent">Urgent</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {[
                        { id: "pending", label: "Pending", icon: Clock, activeClass: "border-amber-500 bg-amber-500 text-white" },
                        { id: "under_investigation", label: "Investigating", icon: Search, activeClass: "border-blue-600 bg-blue-600 text-white" },
                        { id: "resolved", label: "Resolved", icon: CheckCircle, activeClass: "border-emerald-600 bg-emerald-600 text-white" },
                        { id: "dismissed", label: "Dismissed", icon: X, activeClass: "border-slate-600 bg-slate-700 text-white" },
                      ].map((st) => {
                        const isCurrent = resolveForm.status === st.id
                        const StIcon = st.icon
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setResolveForm((prev) => ({ ...prev, status: st.id }))}
                            className={cn(
                              "flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-bold border transition-all cursor-pointer",
                              isCurrent
                                ? `${st.activeClass} shadow-xs`
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                            )}
                          >
                            <StIcon className="size-3" />
                            <span>{st.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Quick Ruling Presets */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                      Quick rulings
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_RULINGS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyRuling(preset)}
                          className="text-[11px] font-bold px-2 py-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-[#1447a6] hover:text-[#1447a6] dark:hover:text-blue-400 transition-colors cursor-pointer text-slate-700 dark:text-slate-300 flex items-center gap-1"
                        >
                          <Sparkles className="size-2.5 text-amber-500" />
                          <span>{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Taken input */}
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                      Action taken
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Free re-fix ordered"
                      value={resolveForm.adminAction}
                      onChange={(e) => setResolveForm((prev) => ({ ...prev, adminAction: e.target.value }))}
                      className="w-full h-8 px-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-none text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[#1447a6]"
                    />
                  </div>

                  {/* Remarks to Customer */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                      Remarks to customer
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Message for the customer"
                      value={resolveForm.resolutionRemarks}
                      onChange={(e) => setResolveForm((prev) => ({ ...prev, resolutionRemarks: e.target.value }))}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-none text-xs text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none focus:border-[#1447a6]"
                    />
                  </div>

                  {/* Internal Admin Notes */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                      Internal notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Private notes"
                      value={resolveForm.adminNotes}
                      onChange={(e) => setResolveForm((prev) => ({ ...prev, adminNotes: e.target.value }))}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-none text-xs text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none focus:border-[#1447a6]"
                    />
                  </div>

                  {/* Direct Message Notification Checkbox */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <input
                      type="checkbox"
                      id="notifyCustomerBox"
                      checked={resolveForm.notifyCustomer}
                      onChange={(e) => setResolveForm((prev) => ({ ...prev, notifyCustomer: e.target.checked }))}
                      className="size-3.5 accent-[#081F5C] cursor-pointer"
                    />
                    <label
                      htmlFor="notifyCustomerBox"
                      className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      Send automated Direct Message update to customer&apos;s E-Paayos inbox upon saving
                    </label>
                  </div>
                </div>
              </div>

              {/* Dialog Footer */}
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                  Ticket #{selectedComplaint.ticketNumber} · Created {formatDateDisplay(selectedComplaint.createdAt)}
                </p>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto h-8 px-4 text-xs font-bold rounded-none border-slate-300 hover:bg-slate-100 dark:border-slate-700 cursor-pointer"
                    onClick={() => setIsDetailOpen(false)}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    disabled={isResolving}
                    onClick={handleSaveResolution}
                    className="w-full sm:w-auto h-8 px-4 bg-[#081F5C] hover:bg-[#1447a6] text-white text-xs font-bold rounded-none shadow-xs cursor-pointer"
                  >
                    {isResolving ? (
                      <>
                        <Spinner className="size-3.5 mr-1.5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="size-3.5 mr-1.5" />
                        Save Ruling
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Lightbox Photo Preview */}
      <Dialog open={Boolean(previewPhoto)} onOpenChange={() => setPreviewPhoto(null)}>
        <DialogContent className="max-w-4xl p-1 bg-black border-none rounded-none">
          {previewPhoto && (
            <div className="relative flex flex-col items-center">
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="absolute top-2 right-2 text-white bg-black/60 hover:bg-black p-1.5 rounded-full z-10 cursor-pointer"
              >
                <X className="size-5" />
              </button>
              <img
                src={previewPhoto}
                alt="Evidence Full View"
                className="max-h-[85vh] w-auto object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Linked User Moderation Dialogs */}
      <IssueWarningDialog
        open={warnDialogOpen}
        onOpenChange={setWarnDialogOpen}
        targetUser={modTargetUser}
        defaultTicket={selectedComplaint?.ticketNumber || ""}
        defaultComplaintId={selectedComplaint?._id || null}
        defaultCategory={selectedComplaint?.category || "policy_violation"}
        defaultSubject={selectedComplaint?.subject || ""}
        onSuccess={async (resData) => {
          if (selectedComplaint?._id) {
            await openComplaintModal(selectedComplaint)
          }
          if (resData?.warning?.referenceCode) {
            setResolveForm((prev) => ({
              ...prev,
              status: "action_taken",
              adminAction: prev.adminAction || `Formal Warning (${resData.warning.referenceCode}) Issued`,
            }))
          }
          fetchComplaints(true)
        }}
      />

      <RestrictUserDialog
        open={restrictDialogOpen}
        onOpenChange={setRestrictDialogOpen}
        targetUser={modTargetUser}
        defaultTicket={selectedComplaint?.ticketNumber || ""}
        defaultComplaintId={selectedComplaint?._id || null}
        defaultCategory={selectedComplaint?.category || "repeat_violation"}
        onSuccess={async () => {
          if (selectedComplaint?._id) {
            await openComplaintModal(selectedComplaint)
          }
          fetchComplaints(true)
        }}
      />

      <LiftRestrictionDialog
        open={liftDialogOpen}
        onOpenChange={setLiftDialogOpen}
        targetUser={modTargetUser}
        onSuccess={async () => {
          if (selectedComplaint?._id) {
            await openComplaintModal(selectedComplaint)
          }
          fetchComplaints(true)
        }}
      />
    </div>
  )
}

export default function ComplaintAndReportPage({ isEmbedded = false }) {
  if (isEmbedded) {
    return <AdminComplaintReportContent />
  }

  return (
    <AdminDashboard initialSection="complaints">
      <AdminComplaintReportContent />
    </AdminDashboard>
  )
}
