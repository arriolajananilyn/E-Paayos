import { useCallback, useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { Spinner } from "../ui/spinner"
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Store,
  User,
  Wrench,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { getApiBaseUrl } from "../../lib/apiBaseUrl"
import { cn } from "../../lib/utils"
import CustomerComplaintDialog from "./CustomerComplaintDialog.jsx"

const API_URL = getApiBaseUrl()

function authHeaders() {
  const token = localStorage.getItem("token")
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function formatDate(d) {
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

const STATUS_CONFIG = {
  pending: {
    label: "Pending Review",
    badge: "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    step: 1,
  },
  under_investigation: {
    label: "Under Investigation",
    badge: "border-blue-300 bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
    step: 2,
  },
  action_taken: {
    label: "Action Enforced",
    badge: "border-indigo-300 bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300",
    step: 3,
  },
  resolved: {
    label: "Resolved & Closed",
    badge: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    step: 4,
  },
  dismissed: {
    label: "Dismissed",
    badge: "border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    step: 4,
  },
}

export default function CustomerComplaintsModal({ open, onOpenChange, initialTicket = "" }) {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [filterStatus, setFilterStatus] = useState("all")
  const [search, setSearch] = useState("")
  const [previewPhoto, setPreviewPhoto] = useState(null)
  const [showFileNew, setShowFileNew] = useState(false)

  const fetchMyComplaints = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/users/complaints/my`, {
        headers: authHeaders(),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || "Failed to load complaints.")
      const list = Array.isArray(data?.data) ? data.data : []
      setComplaints(list)

      if (initialTicket) {
        const found = list.find((c) => c.ticketNumber === initialTicket || c._id === initialTicket)
        if (found) setSelected(found)
      } else if (list.length > 0 && !selected) {
        setSelected(list[0])
      }
    } catch (err) {
      toast.error(err?.message || "Error loading complaints")
    } finally {
      setLoading(false)
    }
  }, [initialTicket])

  useEffect(() => {
    if (open) {
      fetchMyComplaints()
    }
  }, [open, fetchMyComplaints])

  const filtered = complaints.filter((c) => {
    if (filterStatus !== "all" && c.status !== filterStatus) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const matchSubject = (c.subject || "").toLowerCase().includes(q)
      const matchTicket = (c.ticketNumber || "").toLowerCase().includes(q)
      const matchShop = (c.targetShopName || "").toLowerCase().includes(q)
      if (!matchSubject && !matchTicket && !matchShop) return false
    }
    return true
  })

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-h-[92vh] max-w-[calc(100vw-1.5rem)] sm:max-w-4xl overflow-hidden flex flex-col p-0 border border-slate-200 bg-white shadow-2xl rounded-none dark:border-slate-800 dark:bg-slate-900"
          showCloseButton
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-4 py-3 sm:px-5 sm:py-3.5 text-white shrink-0 border-b border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pr-6">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center bg-white/15 text-white border border-white/20 shrink-0">
                  <ShieldAlert className="size-4 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                    My Complaints &amp; Damage Reports
                  </DialogTitle>
                  <DialogDescription className="text-[10px] sm:text-[11px] text-blue-100/80 font-normal">
                    Track the official status, service provider responses, and LMD-PESO dispute rulings for your repair claims.
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowFileNew(true)}
                  className="h-7.5 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-none shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldAlert className="size-3" />
                  <span>File New Complaint</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fetchMyComplaints}
                  disabled={loading}
                  className="h-7.5 px-2 bg-white/10 hover:bg-white/20 border-white/30 text-white text-xs rounded-none cursor-pointer"
                  title="Refresh status"
                >
                  <RefreshCw className={cn("size-3", loading && "animate-spin")} />
                </Button>
              </div>
            </div>
          </div>

          {/* Master-Detail Body */}
          <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0 text-xs">
            {/* Left Column: Complaint Tickets List (5 cols) */}
            <div className="md:col-span-5 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden">
              {/* Search & Filter Bar */}
              <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900 shrink-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search ticket # or shop..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-7.5 pl-8 pr-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-none focus:outline-none focus:border-[#081F5C]"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  {[
                    { id: "all", label: "All" },
                    { id: "pending", label: "Pending" },
                    { id: "under_investigation", label: "Investigating" },
                    { id: "action_taken", label: "Action Taken" },
                    { id: "resolved", label: "Resolved" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setFilterStatus(st.id)}
                      className={cn(
                        "px-2 py-0.5 text-[10px] font-bold rounded-none whitespace-nowrap cursor-pointer transition-colors border",
                        filterStatus === st.id
                          ? "bg-[#081F5C] text-white border-[#081F5C]"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                      )}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tickets List */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {loading && complaints.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 space-y-2">
                    <Spinner className="size-5 mx-auto animate-spin text-[#081F5C]" />
                    <p className="text-xs">Loading your complaints...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <ShieldCheck className="size-8 mx-auto text-slate-300 stroke-[1.5]" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      No complaints found.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      When you submit a complaint or damage report regarding an unsatisfactory repair service, it will appear here.
                    </p>
                  </div>
                ) : (
                  filtered.map((item) => {
                    const isSelected = selected?._id === item._id
                    const meta = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending
                    return (
                      <div
                        key={item._id}
                        onClick={() => setSelected(item)}
                        className={cn(
                          "p-3 cursor-pointer transition-all border-l-3 space-y-1.5",
                          isSelected
                            ? "bg-white dark:bg-slate-800 border-l-[#081F5C] shadow-xs"
                            : "hover:bg-slate-100/70 dark:hover:bg-slate-800/50 border-l-transparent"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] font-black text-slate-900 dark:text-white">
                            {item.ticketNumber}
                          </span>
                          <Badge className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 border", meta.badge)}>
                            {meta.label}
                          </Badge>
                        </div>

                        <p className="font-bold text-xs text-slate-800 dark:text-slate-200 line-clamp-1">
                          {item.subject}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                          <span className="truncate max-w-[140px] text-blue-900 dark:text-blue-300 font-semibold">
                            {item.targetShopName || "Shop Entity"}
                          </span>
                          <span>{formatDate(item.createdAt).split(",")[0]}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Right Column: Selected Complaint Detail View (7 cols) */}
            <div className="md:col-span-7 flex flex-col bg-white dark:bg-slate-900 overflow-y-auto p-4 sm:p-5 space-y-4">
              {selected ? (
                <>
                  {/* Status & Progress Tracker Card */}
                  <div className="border border-slate-200 bg-slate-50/70 p-3.5 space-y-3 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Shield className="size-3.5 text-[#1447a6] dark:text-blue-400" />
                        <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-800 dark:text-slate-200">
                          Dispute Progress Tracker
                        </span>
                      </div>
                      <Badge className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border", (STATUS_CONFIG[selected.status] || STATUS_CONFIG.pending).badge)}>
                        {(STATUS_CONFIG[selected.status] || STATUS_CONFIG.pending).label}
                      </Badge>
                    </div>

                    {/* Progress Steps */}
                    <div className="grid grid-cols-4 gap-1 text-center pt-1">
                      {[
                        { step: 1, label: "Filed", active: true },
                        { step: 2, label: "Investigating", active: ["under_investigation", "action_taken", "resolved", "dismissed"].includes(selected.status) },
                        { step: 3, label: "Action Taken", active: ["action_taken", "resolved"].includes(selected.status) },
                        { step: 4, label: selected.status === "dismissed" ? "Dismissed" : "Resolved", active: ["resolved", "dismissed"].includes(selected.status) },
                      ].map((s) => (
                        <div key={s.step} className="space-y-1">
                          <div
                            className={cn(
                              "h-1.5 w-full rounded-none transition-colors",
                              s.active ? "bg-[#081F5C] dark:bg-blue-500" : "bg-slate-200 dark:bg-slate-700"
                            )}
                          />
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-tight block",
                              s.active ? "text-slate-900 dark:text-white" : "text-slate-400"
                            )}
                          >
                            {s.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-300 italic pt-1">
                      {selected.status === "pending" && "Your report has been logged and is awaiting initial audit by the LMD-PESO dispute desk."}
                      {selected.status === "under_investigation" && "LMD-PESO administration has officially opened an audit and notified the service provider to provide explanation."}
                      {selected.status === "action_taken" && "Formal administrative ruling or corrective enforcement has been ordered against the dispute."}
                      {selected.status === "resolved" && "This dispute claim has been settled, remedies enacted, and the case closed."}
                      {selected.status === "dismissed" && "Complaint closed after investigation found no active violation or inconclusive evidence."}
                    </p>
                  </div>

                  {/* LMD-PESO Administrative Ruling (If provided) */}
                  {(selected.adminAction || selected.resolutionRemarks) && (
                    <div className="border-2 border-emerald-500/40 bg-emerald-50/50 dark:border-emerald-700/50 dark:bg-emerald-950/20 p-3.5 space-y-2">
                      <div className="flex items-center gap-1.5 pb-1 border-b border-emerald-200 dark:border-emerald-800">
                        <CheckCircle className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-extrabold uppercase tracking-wider text-[11px] text-emerald-950 dark:text-emerald-200">
                          Official LMD-PESO Administrator Ruling
                        </span>
                      </div>

                      {selected.adminAction && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-emerald-800 dark:text-emerald-300 font-semibold">Remedy / Action:</span>
                          <span className="font-black text-emerald-950 dark:text-emerald-100 bg-white/70 dark:bg-slate-900 px-2 py-0.5 border border-emerald-300 dark:border-emerald-700">
                            {selected.adminAction}
                          </span>
                        </div>
                      )}

                      {selected.resolutionRemarks && (
                        <div className="text-xs text-emerald-950 dark:text-emerald-100 bg-white/70 dark:bg-slate-900 p-2.5 border border-emerald-200 dark:border-emerald-800 leading-relaxed whitespace-pre-wrap font-normal">
                          {selected.resolutionRemarks}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Service Provider Official Explanation */}
                  <div className="border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Store className="size-3.5 text-[#1447a6] dark:text-blue-400 shrink-0" />
                        <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-800 dark:text-slate-200">
                          Service Provider Response ({selected.targetShopName || "Shop"})
                        </span>
                      </div>
                      {selected.providerRespondedAt ? (
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                          Submitted {formatDate(selected.providerRespondedAt)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                          Awaiting provider statement
                        </span>
                      )}
                    </div>

                    {selected.providerExplanation ? (
                      <div className="space-y-2">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {selected.providerExplanation}
                        </div>

                        {Array.isArray(selected.providerExplanationPhotos) && selected.providerExplanationPhotos.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Provider Attached Proof:</span>
                            <div className="flex flex-wrap gap-2">
                              {selected.providerExplanationPhotos.map((img, i) => (
                                <div
                                  key={i}
                                  onClick={() => setPreviewPhoto(img)}
                                  className="size-14 overflow-hidden border border-slate-300 bg-black cursor-pointer group"
                                >
                                  <img src={img} alt="Proof" className="size-full object-cover group-hover:scale-105 transition-transform" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic py-1">
                        The service provider has been served formal notification and is given 48 hours to submit their defense and job cards for review.
                      </p>
                    )}
                  </div>

                  {/* Customer's Original Statement & Claim */}
                  <div className="border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-1.5">
                        <FileText className="size-3.5 text-[#1447a6] dark:text-blue-400 shrink-0" />
                        <span className="font-extrabold uppercase tracking-wider text-[11px] text-slate-800 dark:text-slate-200">
                          Your Incident Account
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Ref #{selected.ticketNumber}
                      </span>
                    </div>

                    <p className="font-bold text-xs text-slate-900 dark:text-white">
                      {selected.subject}
                    </p>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {selected.description}
                    </div>

                    {/* Attached Evidence */}
                    {Array.isArray(selected.evidencePhotos) && selected.evidencePhotos.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Your Evidence Photos:</span>
                        <div className="flex flex-wrap gap-2">
                          {selected.evidencePhotos.map((img, i) => (
                            <div
                              key={i}
                              onClick={() => setPreviewPhoto(img)}
                              className="size-14 overflow-hidden border border-slate-300 bg-black cursor-pointer group"
                            >
                              <img src={img} alt="Evidence" className="size-full object-cover group-hover:scale-105 transition-transform" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                  <ShieldAlert className="size-10 text-slate-300 stroke-[1.2]" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Select a complaint ticket from the list to view its complete audit progress and official rulings.
                  </p>
                </div>
              )}
            </div>
          </div>
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
                alt="Proof Full View"
                className="max-h-[85vh] w-auto object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Complaint Dialog for filing new */}
      <CustomerComplaintDialog
        open={showFileNew}
        onOpenChange={setShowFileNew}
        onSuccess={() => {
          fetchMyComplaints()
        }}
      />
    </>
  )
}
