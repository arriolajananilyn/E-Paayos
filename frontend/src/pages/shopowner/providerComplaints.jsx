import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Image as ImageIcon,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Store,
  Upload,
  User,
  Wrench,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import ShopOwnerDashboard from "./dashboard.jsx"
import OnCallMechanicLayout from "../oncallmechanic/technician/OnCallMechanicLayout.jsx"
import ProviderReportDialog from "../../components/complaints/ProviderReportDialog.jsx"
import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import { cn } from "@/lib/utils"

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

const CATEGORY_META = {
  warranty_violation: { label: "Warranty Dispute", color: "bg-purple-100 text-purple-800 border-purple-300" },
  overcharging: { label: "Pricing / Fees", color: "bg-amber-100 text-amber-800 border-amber-300" },
  poor_service: { label: "Work Quality", color: "bg-orange-100 text-orange-800 border-orange-300" },
  damage_property: { label: "Item Damage", color: "bg-rose-100 text-rose-800 border-rose-300" },
  late_no_show: { label: "Delay / No-Show", color: "bg-blue-100 text-blue-800 border-blue-300" },
  unprofessional_behavior: { label: "Conduct", color: "bg-pink-100 text-pink-800 border-pink-300" },
  scam_fraud: { label: "Platform Violation", color: "bg-red-100 text-red-900 border-red-400" },
  fake_booking: { label: "Bogus Booking", color: "bg-rose-100 text-rose-900 border-rose-300" },
  non_payment: { label: "Non-Payment", color: "bg-amber-100 text-amber-900 border-amber-300" },
  abusive_customer: { label: "Abusive Customer", color: "bg-pink-100 text-pink-900 border-pink-300" },
  harassment: { label: "Harassment", color: "bg-red-200 text-red-950 border-red-400" },
  policy_violation: { label: "Policy Violation", color: "bg-indigo-100 text-indigo-900 border-indigo-300" },
  other: { label: "General", color: "bg-slate-100 text-slate-800 border-slate-300" },
}

const PROVIDER_STATUS_META = {
  pending: { label: "Pending Review", cls: "bg-amber-50 text-amber-800 border-amber-300" },
  under_investigation: { label: "Under Investigation", cls: "bg-blue-50 text-blue-800 border-blue-300" },
  action_taken: { label: "Action Taken", cls: "bg-indigo-50 text-indigo-800 border-indigo-300" },
  resolved: { label: "Resolved", cls: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  dismissed: { label: "Dismissed", cls: "bg-slate-100 text-slate-700 border-slate-300" },
}

export function ProviderComplaintsContent() {
  const [complaints, setComplaints] = useState([])
  const [filedReports, setFiledReports] = useState([])
  const [activeTab, setActiveTab] = useState("incoming") // "incoming" | "filed"
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")

  // Respond Modal State
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [isRespondOpen, setIsRespondOpen] = useState(false)
  const [explanationText, setExplanationText] = useState("")
  const [explanationPhotos, setExplanationPhotos] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Lightbox Preview
  const [previewPhoto, setPreviewPhoto] = useState(null)

  const fetchProviderComplaints = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    else setIsRefreshing(true)
    try {
      const [incomingRes, filedRes] = await Promise.all([
        fetch(`${API_URL}/api/users/complaints/provider`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/users/complaints/provider/filed`, { headers: authHeaders() }),
      ])
      const data = await incomingRes.json().catch(() => ({}))
      const filedData = await filedRes.json().catch(() => ({}))
      if (!incomingRes.ok) throw new Error(data?.message || "Failed to load complaints.")
      setComplaints(Array.isArray(data?.data) ? data.data : [])
      setFiledReports(Array.isArray(filedData?.data) ? filedData.data : [])
      window.dispatchEvent(new CustomEvent("epaayos:provider-complaints-updated"))
    } catch (err) {
      toast.error(err?.message || "Failed to load complaints")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchProviderComplaints()
  }, [fetchProviderComplaints])

  const openRespondModal = (comp) => {
    setSelectedComplaint(comp)
    setExplanationText(comp.providerExplanation || "")
    setExplanationPhotos(comp.providerExplanationPhotos || [])
    setIsRespondOpen(true)
  }

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    if (explanationPhotos.length + files.length > 5) {
      toast.error("You can upload a maximum of 5 supporting photos/receipts.")
      return
    }

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image.`)
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB size limit.`)
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        setExplanationPhotos((prev) => [...prev, event.target.result])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ""
  }

  const removePhoto = (index) => {
    setExplanationPhotos((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSubmitResponse = async (e) => {
    e.preventDefault()
    if (!selectedComplaint) return

    if (!explanationText.trim()) {
      toast.error("Please provide your official explanation or defense statement.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/users/complaints/provider/${selectedComplaint._id}/respond`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          explanation: explanationText.trim(),
          explanationPhotos,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || "Failed to submit explanation.")

      toast.success("Official explanation and counter-evidence submitted for LMD-PESO review!")
      setIsRespondOpen(false)
      await fetchProviderComplaints(true)
      window.dispatchEvent(new CustomEvent("epaayos:provider-complaints-updated"))
    } catch (err) {
      toast.error(err?.message || "Failed to submit response")
    } finally {
      setIsSubmitting(false)
    }
  }

  const stats = useMemo(() => {
    const total = complaints.length
    let pendingExplanation = 0
    let adminRequested = 0
    let underInvestigation = 0
    let resolved = 0

    complaints.forEach((c) => {
      if (!c.providerExplanation) pendingExplanation++
      if (c.explanationRequestedAt && !c.providerExplanation) adminRequested++
      if (c.status === "under_investigation") underInvestigation++
      if (c.status === "resolved" || c.status === "action_taken" || c.status === "dismissed") resolved++
    })

    return { total, pendingExplanation, adminRequested, underInvestigation, resolved }
  }, [complaints])

  const filtered = complaints.filter((c) => {
    if (statusFilter === "admin_requested" && !(c.explanationRequestedAt && !c.providerExplanation)) return false
    if (statusFilter === "pending_explanation" && c.providerExplanation) return false
    if (statusFilter === "explained" && !c.providerExplanation) return false
    if (statusFilter === "resolved" && !["resolved", "action_taken", "dismissed"].includes(c.status)) return false

    if (search.trim()) {
      const q = search.toLowerCase()
      const matchSubject = (c.subject || "").toLowerCase().includes(q)
      const matchTicket = (c.ticketNumber || "").toLowerCase().includes(q)
      const matchCust = (c.customerName || "").toLowerCase().includes(q)
      if (!matchSubject && !matchTicket && !matchCust) return false
    }
    return true
  })

  return (
    <div className="flex flex-1 flex-col gap-4 min-w-0 max-w-full">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-none border border-[#081F5C]/30 bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] p-4 sm:p-5 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-white/15 border border-white/20 rounded-none">
              <ShieldAlert className="size-3 text-amber-300" />
              <span>Provider Dispute Desk</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Customer Complaints &amp; Damage Reports
            </h2>
            <p className="text-xs text-blue-100/90 font-medium max-w-2xl leading-relaxed">
              Review grievances filed by customers regarding your repair services, attach job card proofs, and submit official statements for LMD-PESO dispute arbitration.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              onClick={() => setIsReportDialogOpen(true)}
              className="h-8 rounded-none bg-amber-400 hover:bg-amber-300 text-[#04133d] text-xs font-black cursor-pointer shadow-xs"
            >
              <ShieldAlert className="size-3.5 mr-1.5" />
              Report Customer / Incident
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fetchProviderComplaints(true)}
              disabled={isRefreshing}
              className="h-8 rounded-none bg-white/10 hover:bg-white/20 border-white/25 text-white text-xs font-bold cursor-pointer"
            >
              <RefreshCw className={cn("size-3.5 mr-1.5", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Mode Switcher: Complaints Against You vs Reports You Filed */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("incoming")}
          className={cn(
            "px-3.5 py-2 text-xs font-black uppercase tracking-wider border transition-colors cursor-pointer",
            activeTab === "incoming"
              ? "bg-[#081F5C] text-white border-[#081F5C]"
              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          )}
        >
          Complaints Against You ({complaints.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("filed")}
          className={cn(
            "px-3.5 py-2 text-xs font-black uppercase tracking-wider border transition-colors cursor-pointer",
            activeTab === "filed"
              ? "bg-[#081F5C] text-white border-[#081F5C]"
              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
          )}
        >
          Reports You Filed ({filedReports.length})
        </button>
      </div>

      {activeTab === "filed" ? (
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-500 bg-white border border-slate-200 space-y-2">
              <Spinner className="size-6 mx-auto animate-spin text-[#081F5C]" />
              <p className="text-xs">Loading filed reports...</p>
            </div>
          ) : filedReports.length === 0 ? (
            <div className="py-12 text-center bg-white border border-slate-200 space-y-2">
              <ShieldCheck className="size-10 mx-auto text-emerald-500 stroke-[1.5]" />
              <p className="text-sm font-bold text-slate-900">No reports filed against customers yet</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Use the &ldquo;Report Customer / Incident&rdquo; button above if you encounter bogus bookings, non-payment, or abusive conduct.
              </p>
            </div>
          ) : (
            filedReports.map((item) => {
              const cat = CATEGORY_META[item.category] || CATEGORY_META.other
              const statusMeta = PROVIDER_STATUS_META[item.status] || PROVIDER_STATUS_META.pending
              return (
                <div key={item._id} className="p-4 bg-white border border-slate-200 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-black bg-slate-900 text-white px-2 py-0.5">
                        {item.ticketNumber}
                      </span>
                      <Badge className={cn("text-[10px] font-bold uppercase px-2 py-0.5 border rounded-none", statusMeta.cls)}>
                        {statusMeta.label}
                      </Badge>
                      <Badge className={cn("text-[10px] font-bold uppercase px-2 py-0.5 border rounded-none", cat.color)}>
                        {cat.label}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="size-3.5" />
                      {formatDateDisplay(item.createdAt)}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-900">{item.subject}</h4>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{item.description}</p>
                    <p className="text-[11px] text-slate-500 pt-1">
                      Reported Customer:{" "}
                      <span className="font-bold text-slate-800">
                        {item.reportedUserName || item.customerName || "Customer"}
                      </span>
                    </p>
                  </div>
                  {(item.adminAction || item.resolutionRemarks) && (
                    <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 space-y-1">
                      <span className="text-[10px] font-black uppercase text-indigo-800 block">
                        Admin Investigation Outcome
                      </span>
                      {item.adminAction && <p className="font-bold">{item.adminAction}</p>}
                      {item.resolutionRemarks && <p>{item.resolutionRemarks}</p>}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      ) : (
        <>
      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 space-y-1">
          <span className="text-slate-500 font-semibold block text-[11px]">Total Filed Reports</span>
          <span className="text-xl font-black text-slate-900 dark:text-white">{stats.total}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800/80 p-3 space-y-1 bg-amber-50/20">
          <span className="text-amber-800 dark:text-amber-300 font-bold block text-[11px] flex items-center gap-1">
            <AlertTriangle className="size-3 text-amber-500" /> Pending Your Statement
          </span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400">{stats.pendingExplanation}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 space-y-1">
          <span className="text-blue-700 dark:text-blue-300 font-semibold block text-[11px]">Under LMD-PESO Audit</span>
          <span className="text-xl font-black text-blue-600 dark:text-blue-400">{stats.underInvestigation}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 space-y-1">
          <span className="text-emerald-700 dark:text-emerald-300 font-semibold block text-[11px]">Resolved &amp; Closed</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.resolved}</span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: "all", label: `All Reports (${complaints.length})` },
            { id: "admin_requested", label: `Admin Inquiry (${stats.adminRequested})` },
            { id: "pending_explanation", label: `Requires Statement (${stats.pendingExplanation})` },
            { id: "explained", label: "Statement Submitted" },
            { id: "resolved", label: `Settled (${stats.resolved})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-none whitespace-nowrap cursor-pointer transition-colors border",
                statusFilter === tab.id
                  ? "bg-[#081F5C] text-white border-[#081F5C]"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search ticket or customer"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8.5 pl-8 pr-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-none focus:outline-none focus:border-[#081F5C]"
          />
        </div>
      </div>

      {/* Complaints List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <Spinner className="size-6 mx-auto animate-spin text-[#081F5C]" />
            <p className="text-xs">Loading complaints list...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <ShieldCheck className="size-10 mx-auto text-emerald-500 stroke-[1.5]" />
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              No customer complaints matching current criteria!
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your service ratings and dispute records are clear. When a customer files a warranty grievance or service report, it will appear here for your formal response.
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const cat = CATEGORY_META[item.category] || CATEGORY_META.other
            const statusMeta = PROVIDER_STATUS_META[item.status] || PROVIDER_STATUS_META.pending
            const hasResponded = Boolean(item.providerExplanation)
            const hasAdminInquiry = Boolean(item.explanationRequestedAt) && !hasResponded
            const isCaseClosed = item.status === "resolved" || item.status === "dismissed"
            return (
              <div
                key={item._id}
                className={cn(
                  "p-4 bg-white dark:bg-slate-900 border transition-all space-y-3",
                  hasAdminInquiry
                    ? "border-rose-400 shadow-xs dark:border-rose-700"
                    : !hasResponded
                      ? "border-amber-400/80 shadow-xs dark:border-amber-700/80"
                      : "border-slate-200 dark:border-slate-800"
                )}
              >
                {/* Official LMD-PESO Inquiry Alert Banner */}
                {hasAdminInquiry && (
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-start sm:items-center gap-2 text-rose-900 dark:text-rose-200">
                      <AlertCircle className="size-4 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
                      <div>
                        <span className="font-extrabold uppercase tracking-wider text-[10px] block sm:inline sm:mr-1.5 text-rose-700 dark:text-rose-300">
                          LMD-PESO Official Inquiry:
                        </span>
                        <span className="font-medium">
                          Notice sent on {formatDateDisplay(item.explanationRequestedAt)}. Admin is awaiting your official statement and supporting proof.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Top Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-black bg-slate-900 text-white px-2 py-0.5 rounded-none">
                      {item.ticketNumber}
                    </span>
                    <Badge className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-none", statusMeta.cls)}>
                      {statusMeta.label}
                    </Badge>
                    <Badge className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-none", cat.color)}>
                      {cat.label}
                    </Badge>
                    <Badge className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border rounded-none", item.priority === "urgent" ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-800")}>
                      {item.priority} Priority
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium shrink-0">
                    <Clock className="size-3.5 text-slate-400" />
                    <span>Filed: {formatDateDisplay(item.createdAt)}</span>
                  </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                  {/* Customer Claim & Statement (8 cols) */}
                  <div className="lg:col-span-8 space-y-2">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {item.subject}
                    </h4>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Customer Statement:</span>
                      {item.description}
                    </div>

                    {/* Customer Evidence Photos */}
                    {Array.isArray(item.evidencePhotos) && item.evidencePhotos.length > 0 && (
                      <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                        <span className="text-[10px] font-bold text-slate-500 uppercase shrink-0">
                          Evidence ({item.evidencePhotos.length}):
                        </span>
                        {item.evidencePhotos.map((img, i) => (
                          <div
                            key={i}
                            onClick={() => setPreviewPhoto(img)}
                            className="size-12 overflow-hidden border border-slate-300 bg-black cursor-pointer group shrink-0"
                          >
                            <img src={img} alt="Evidence" className="size-full object-cover group-hover:scale-105 transition-transform" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Provider's Submitted Response if present */}
                    {hasResponded && (
                      <div className="mt-2.5 p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-950 dark:text-blue-200 uppercase text-[10px] flex items-center gap-1">
                            <CheckCircle className="size-3 text-blue-600" /> Your Submitted Statement
                          </span>
                          <span className="text-[10px] text-blue-600 dark:text-blue-300">
                            {formatDateDisplay(item.providerRespondedAt)}
                          </span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {item.providerExplanation}
                        </p>
                        {Array.isArray(item.providerExplanationPhotos) && item.providerExplanationPhotos.length > 0 && (
                          <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                            <span className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase shrink-0">
                              Your Proof ({item.providerExplanationPhotos.length}):
                            </span>
                            {item.providerExplanationPhotos.map((img, i) => (
                              <div
                                key={i}
                                onClick={() => setPreviewPhoto(img)}
                                className="size-12 overflow-hidden border border-blue-300 bg-black cursor-pointer group shrink-0"
                              >
                                <img src={img} alt="Provider Proof" className="size-full object-cover group-hover:scale-105 transition-transform" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Customer Info & Action (4 cols) */}
                  <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 pt-3 lg:pt-0 lg:pl-3.5 flex flex-col justify-between space-y-3 text-xs">
                    <div className="space-y-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Complainant (Customer)</span>
                        <p className="font-bold text-slate-900 dark:text-white">{item.customerName}</p>
                        <p className="text-[11px] text-slate-500">{item.customerPhone || item.customerEmail || "—"}</p>
                      </div>

                      {item.bookingServiceTitle && (
                        <div className="space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Associated Job</span>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{item.bookingServiceTitle}</p>
                        </div>
                      )}

                      {(item.adminAction || item.resolutionRemarks) && (
                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">LMD-PESO Ruling</span>
                          {item.adminAction && (
                            <Badge className="text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-900 mt-0.5">
                              {item.adminAction}
                            </Badge>
                          )}
                          {item.resolutionRemarks && (
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                              {item.resolutionRemarks}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      {isCaseClosed ? (
                        <div className="w-full h-8.5 px-3 rounded-none border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5">
                          <ShieldCheck className="size-3.5" />
                          <span>Case Closed</span>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          onClick={() => openRespondModal(item)}
                          className={cn(
                            "w-full h-8.5 rounded-none text-xs font-bold cursor-pointer shadow-xs flex items-center justify-center gap-1.5",
                            !hasResponded
                              ? hasAdminInquiry
                                ? "bg-rose-600 hover:bg-rose-700 text-white"
                                : "bg-amber-600 hover:bg-amber-700 text-white"
                              : "bg-[#081F5C] hover:bg-[#1447a6] text-white"
                          )}
                        >
                          <MessageSquare className="size-3.5" />
                          <span>{hasResponded ? "Update Statement" : "Provide Official Response"}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
        </>
      )}

      {/* Provider Explanation Response Dialog */}
      <Dialog open={isRespondOpen} onOpenChange={setIsRespondOpen}>
        <DialogContent
          className="max-h-[92vh] max-w-[calc(100vw-1.5rem)] sm:max-w-xl overflow-hidden flex flex-col p-0 border border-slate-200 bg-white shadow-2xl rounded-none dark:border-slate-800 dark:bg-slate-900"
          showCloseButton
        >
          {selectedComplaint ? (
            <form onSubmit={handleSubmitResponse} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-4 py-3 sm:px-5 sm:py-3.5 text-white shrink-0 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7.5 items-center justify-center bg-white/15 text-white border border-white/20 shrink-0">
                    <Store className="size-3.5 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                      Service Provider Official Statement
                    </DialogTitle>
                    <DialogDescription className="text-[10px] sm:text-[11px] text-blue-100/80 font-normal">
                      Ticket #{selectedComplaint.ticketNumber}
                    </DialogDescription>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs">
                {/* Complainant's Claim Summary */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-bold uppercase">Customer Grievance:</span>
                    <span>By: {selectedComplaint.customerName}</span>
                  </div>
                  <p className="font-bold text-slate-900 dark:text-white text-xs">
                    {selectedComplaint.subject}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                    "{selectedComplaint.description}"
                  </p>
                </div>

                {/* Explanation Textarea */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                    Your explanation <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="What was done, and your proposed fix"
                    value={explanationText}
                    onChange={(e) => setExplanationText(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-none text-xs leading-relaxed focus:outline-none focus:border-[#081F5C]"
                  />
                </div>

                {/* Counter-Evidence Photos Upload */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                      Attach Counter-Evidence (Job Cards, Inspection Photos, Receipts):
                    </label>
                    <span className="text-[10px] text-slate-400">Max 5 photos</span>
                  </div>

                  <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#081F5C] bg-slate-50/50 dark:bg-slate-800 cursor-pointer transition-colors">
                    <Upload className="size-4 text-slate-400" />
                    <span className="text-xs font-semibold text-[#081F5C] dark:text-blue-400">
                      Upload supporting image proof
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  {explanationPhotos.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {explanationPhotos.map((photo, pIdx) => (
                        <div
                          key={pIdx}
                          className="relative size-14 border border-slate-300 overflow-hidden group"
                        >
                          <img src={photo} alt="Proof" className="size-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhoto(pIdx)}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                          >
                            <X className="size-4 text-rose-300" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fair Process Note */}
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2 text-amber-900 dark:text-amber-200 text-[11px]">
                  <AlertCircle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    Your explanation will be archived in the official dispute record and reviewed by LMD-PESO administration. Both parties are encouraged to uphold professional service integrity.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 sm:px-5 flex items-center justify-between gap-2.5 shrink-0 dark:border-slate-800 dark:bg-slate-950">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRespondOpen(false)}
                  className="rounded-none cursor-pointer text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-8.5 px-4 bg-[#081F5C] hover:bg-[#1447a6] text-white text-xs font-bold rounded-none shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner className="size-3.5 mr-1.5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="size-3.5 mr-1.5" />
                      Submit Official Response
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Lightbox Preview */}
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
              <img src={previewPhoto} alt="Full View" className="max-h-[85vh] w-auto object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ProviderReportDialog
        open={isReportDialogOpen}
        onOpenChange={setIsReportDialogOpen}
        onSuccess={() => {
          setActiveTab("filed")
          void fetchProviderComplaints(true)
        }}
      />
    </div>
  )
}

export default function ProviderComplaintsPage({ isEmbedded = false }) {
  if (isEmbedded) {
    return <ProviderComplaintsContent />
  }

  let role = ""
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("user") : null
    role = raw ? JSON.parse(raw)?.role || "" : ""
  } catch {
    role = ""
  }

  if (role === "oncall-mechanic-technician") {
    return (
      <OnCallMechanicLayout
        activeSection="complaints"
        pageMeta={{
          title: "Complaints & Reports",
          description: "Review customer reports, respond to LMD-PESO inquiries, and submit your official statement.",
        }}
      >
        <ProviderComplaintsContent />
      </OnCallMechanicLayout>
    )
  }

  return (
    <ShopOwnerDashboard activeSection="complaints">
      <ProviderComplaintsContent />
    </ShopOwnerDashboard>
  )
}
