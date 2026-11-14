import { useState } from "react"
import {
  AlertOctagon,
  ArrowLeft,
  Ban,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  LogOut,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Ticket,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DialogFooter, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function formatDateTime(d) {
  if (!d) return "—"
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return "—"
  return dt.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const APPEAL_TEMPLATES = [
  {
    id: "resolved",
    label: "Issue Already Resolved",
    subject: "Appeal: Issue Resolved & Commitment to Follow Rules",
    reason:
      "I have already addressed the concern with the other party and sincerely apologize for the misunderstanding. I commit to strictly following all E-Paayos guidelines moving forward.",
  },
  {
    id: "misunderstanding",
    label: "Misunderstanding / Inaccurate Report",
    subject: "Appeal: Clarification & Evidence Regarding Report",
    reason:
      "I believe this restriction was triggered by a misunderstanding or inaccurate report. Below are the details and supporting proof showing what actually occurred.",
  },
  {
    id: "first_time",
    label: "Request Reinstatement",
    subject: "Appeal: Request for Account Review & Reinstatement",
    reason:
      "I value my E-Paayos account and take full responsibility for improving my service/conduct. Please consider reviewing and lifting my account restriction.",
  },
]

function AppealStatusTimeline({ appeal }) {
  const status = appeal?.status || "submitted"
  const isReviewing = status === "under_review"
  const isApproved = status === "approved"
  const isRejected = status === "rejected"
  const isDecided = isApproved || isRejected

  return (
    <div className="border border-slate-200 bg-white p-4 space-y-3 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-black bg-slate-900 text-white px-2 py-0.5">
            {appeal.appealRef || "APPEAL"}
          </span>
          <Badge
            className={cn(
              "rounded-none text-[10px] font-black uppercase tracking-wider border",
              isApproved
                ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                : isRejected
                  ? "bg-rose-100 text-rose-900 border-rose-300"
                  : isReviewing
                    ? "bg-blue-100 text-blue-900 border-blue-300"
                    : "bg-amber-100 text-amber-900 border-amber-300"
            )}
          >
            {isApproved
              ? "Approved"
              : isRejected
                ? "Rejected"
                : isReviewing
                  ? "Under Review"
                  : "Submitted · Pending Review"}
          </Badge>
        </div>
        <span className="text-[11px] text-slate-500 font-medium">
          Updated {formatDateTime(appeal.reviewedAt || appeal.reviewStartedAt || appeal.submittedAt)}
        </span>
      </div>

      {/* 3-Step Vertical Progress Tracker */}
      <div className="space-y-3 pt-1">
        {/* Step 1: Submitted */}
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div className="flex size-6 items-center justify-center rounded-full bg-emerald-600 text-white shrink-0">
              <CheckCircle2 className="size-3.5" />
            </div>
            <div className="w-0.5 h-6 bg-slate-200 mt-1" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs font-black text-slate-900">1. Appeal Submitted</p>
              <span className="text-[11px] font-semibold text-slate-500">
                {formatDateTime(appeal.submittedAt)}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Your appeal has been logged and transmitted to E-Paayos Administration.
            </p>
          </div>
        </div>

        {/* Step 2: Admin Review */}
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex size-6 items-center justify-center rounded-full shrink-0",
                isDecided
                  ? "bg-emerald-600 text-white"
                  : isReviewing
                    ? "bg-blue-600 text-white"
                    : "bg-amber-500 text-white"
              )}
            >
              {isDecided ? (
                <CheckCircle2 className="size-3.5" />
              ) : isReviewing ? (
                <Eye className="size-3.5" />
              ) : (
                <Clock className="size-3.5" />
              )}
            </div>
            <div className="w-0.5 h-6 bg-slate-200 mt-1" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-xs font-black text-slate-900">
                2. Administrative Review
              </p>
              <span className="text-[11px] font-semibold text-slate-500">
                {appeal.reviewStartedAt
                  ? formatDateTime(appeal.reviewStartedAt)
                  : isDecided
                    ? formatDateTime(appeal.reviewedAt)
                    : "In Queue"}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {isDecided
                ? `Reviewed by ${appeal.reviewedByName || "Administrator"} on ${formatDateTime(appeal.reviewedAt)}.`
                : isReviewing
                  ? `Administrator (${appeal.reviewedByName || "Admin"}) is currently evaluating your explanation and evidence.`
                  : "Waiting for an E-Paayos Administrator to open and review your appeal."}
            </p>
          </div>
        </div>

        {/* Step 3: Outcome (Approved / Rejected) */}
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-6 items-center justify-center rounded-full shrink-0",
              isApproved
                ? "bg-emerald-600 text-white"
                : isRejected
                  ? "bg-rose-600 text-white"
                  : "bg-slate-200 text-slate-500"
            )}
          >
            {isApproved ? (
              <ShieldCheck className="size-3.5" />
            ) : isRejected ? (
              <XCircle className="size-3.5" />
            ) : (
              <Clock className="size-3.5" />
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p
                className={cn(
                  "text-xs font-black",
                  isApproved
                    ? "text-emerald-800"
                    : isRejected
                      ? "text-rose-800"
                      : "text-slate-500"
                )}
              >
                3. Final Decision:{" "}
                {isApproved
                  ? "Appeal Approved (Account Reinstated)"
                  : isRejected
                    ? "Appeal Rejected"
                    : "Pending Decision"}
              </p>
              {appeal.reviewedAt && (
                <span className="text-[11px] font-semibold text-slate-500">
                  {formatDateTime(appeal.reviewedAt)}
                </span>
              )}
            </div>
            {isDecided ? (
              <div
                className={cn(
                  "mt-1.5 border p-2.5 text-[11px] leading-relaxed",
                  isApproved
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                    : "border-rose-200 bg-rose-50 text-rose-950"
                )}
              >
                <span className="font-bold uppercase text-[10px] block mb-0.5">
                  Admin Decision Remarks:
                </span>
                {appeal.adminRemarks ||
                  (isApproved
                    ? "Your restriction has been lifted."
                    : "Restriction remains in effect.")}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 mt-0.5">
                You will see the Admin&apos;s approval or rejection notice right here once reviewed.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Reusable TikTok-style Restriction + Appeal Form + Appeal Status Monitor view.
 * Can be rendered inside a DialogContent (UserModerationGuard or Login Modal).
 */
export default function RestrictedAppealPanel({
  restriction,
  onSubmitAppeal,
  onRefreshStatus,
  onSignOut,
  onContinueApproved,
  signOutLabel = "Sign Out of Account",
}) {
  const [composeMode, setComposeMode] = useState(false)
  const [subject, setSubject] = useState("")
  const [reason, setReason] = useState("")
  const [evidencePhotos, setEvidencePhotos] = useState([])
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const latestAppeal = restriction?.latestAppeal || null
  const hasAppeal = Boolean(latestAppeal)
  const isApproved = latestAppeal?.status === "approved"
  const isRejected = latestAppeal?.status === "rejected"

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (evidencePhotos.length + files.length > 4) {
      toast.error("Maximum of 4 supporting photos allowed.")
      return
    }
    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file.`)
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit.`)
        return
      }
      const reader = new FileReader()
      reader.onload = (ev) => {
        setEvidencePhotos((prev) => [...prev, ev.target.result])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ""
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !reason.trim()) {
      toast.error("Please enter both an appeal subject and detailed explanation.")
      return
    }
    if (!agreed) {
      toast.error("Please confirm the truthfulness declaration before submitting.")
      return
    }

    setSubmitting(true)
    try {
      await onSubmitAppeal({
        subject: subject.trim(),
        reason: reason.trim(),
        evidencePhotos,
      })
      setComposeMode(false)
      setSubject("")
      setReason("")
      setEvidencePhotos([])
      setAgreed(false)
    } catch (err) {
      toast.error(err?.message || "Failed to submit appeal.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRefresh = async () => {
    if (!onRefreshStatus) return
    setRefreshing(true)
    try {
      await onRefreshStatus()
      toast.success("Appeal status refreshed.")
    } catch {
      // silent
    } finally {
      setRefreshing(false)
    }
  }

  // Header styling adapts to status (Approved = Emerald, Compose = Navy/Amber, Restricted = Rose)
  const headerGradient = isApproved
    ? "from-emerald-950 via-emerald-800 to-[#081F5C] border-emerald-600/40"
    : composeMode
      ? "from-[#04133d] via-[#081F5C] to-[#1447a6] border-white/15"
      : "from-rose-950 via-red-900 to-slate-950 border-rose-700/40"

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Banner Header */}
      <div className={cn("bg-gradient-to-r px-5 py-4 text-white border-b shrink-0", headerGradient)}>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-10 items-center justify-center border shrink-0",
              isApproved
                ? "bg-emerald-500/25 border-emerald-400/50 text-emerald-200"
                : composeMode
                  ? "bg-amber-400/20 border-amber-300/40 text-amber-300"
                  : "bg-rose-500/25 border-rose-400/50 text-rose-200"
            )}
          >
            {isApproved ? (
              <ShieldCheck className="size-5" />
            ) : composeMode ? (
              <ShieldAlert className="size-5" />
            ) : (
              <Ban className="size-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-base font-black text-white tracking-tight">
                {isApproved
                  ? "Appeal Approved — Account Reinstated"
                  : composeMode
                    ? "Submit Account Restriction Appeal"
                    : hasAppeal
                      ? "Account Restricted · Appeal Monitor"
                      : "Account Restricted"}
              </DialogTitle>
              <span
                className={cn(
                  "px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border",
                  isApproved
                    ? "bg-emerald-600 text-white border-emerald-400"
                    : hasAppeal
                      ? isRejected
                        ? "bg-rose-700 text-white border-rose-400"
                        : "bg-amber-400 text-[#04133d] border-amber-300"
                      : "bg-rose-600 text-white border-rose-400"
                )}
              >
                {isApproved
                  ? "Access Restored"
                  : hasAppeal
                    ? latestAppeal.status === "under_review"
                      ? "Under Review"
                      : isRejected
                        ? "Appeal Rejected"
                        : "Appeal Submitted"
                    : "Access Suspended"}
              </span>
            </div>
            <DialogDescription className="text-xs text-white/80 mt-0.5">
              {isApproved
                ? "Your appeal has been approved by E-Paayos Administration."
                : composeMode
                  ? "Explain your side and attach proof for LMD-PESO & Admin review."
                  : hasAppeal
                    ? "Monitor your appeal progress below from submission to final decision."
                    : "E-Paayos & LMD-PESO Administrative Enforcement Notice"}
            </DialogDescription>
          </div>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs bg-slate-50/70">
        {composeMode && !hasAppeal ? (
          /* COMPOSE APPEAL FORM */
          <form id="restriction-appeal-form" onSubmit={handleSubmit} className="space-y-3.5">
            <div className="border border-slate-200 bg-white p-3 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Quick Appeal Templates
              </span>
              <div className="flex flex-wrap gap-1.5">
                {APPEAL_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setSubject(tpl.subject)
                      setReason(tpl.reason)
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold border border-slate-300 bg-slate-50 hover:border-[#081F5C] hover:bg-blue-50 text-slate-700 cursor-pointer"
                  >
                    <Sparkles className="size-2.5 text-amber-500" />
                    <span>{tpl.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-slate-200 bg-white p-3.5 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-700 block">
                  Appeal Subject / Title <span className="text-rose-600">*</span>
                </label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Request for account review & proof of resolved repair"
                  required
                  maxLength={200}
                  className="h-9 rounded-none text-xs border-slate-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-700 block">
                  Your Explanation &amp; Clarification <span className="text-rose-600">*</span>
                </label>
                <Textarea
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Clearly explain why your restriction should be reviewed or lifted, what corrective steps you took, and any context the Admin should check..."
                  required
                  maxLength={3000}
                  className="rounded-none text-xs border-slate-300"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase text-slate-700 flex items-center gap-1.5">
                    <Camera className="size-3.5 text-[#081F5C]" />
                    Supporting Proof / Screenshots (Optional)
                  </label>
                  <span className="text-[10px] text-slate-400">{evidencePhotos.length}/4 photos</span>
                </div>
                <label className="flex items-center justify-center gap-2 p-2.5 border-2 border-dashed border-slate-300 hover:border-[#081F5C] bg-slate-50 cursor-pointer">
                  <Upload className="size-4 text-slate-400" />
                  <span className="text-xs font-bold text-[#081F5C]">Upload supporting image</span>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                </label>
                {evidencePhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {evidencePhotos.map((img, i) => (
                      <div key={i} className="relative size-14 border border-slate-300 overflow-hidden group">
                        <img src={img} alt="Appeal Proof" className="size-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setEvidencePhotos((p) => p.filter((_, idx) => idx !== i))}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"
                        >
                          <Trash2 className="size-3.5 text-rose-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex items-start gap-2.5 p-2.5 bg-slate-50 border border-slate-200 cursor-pointer select-none">
                <Checkbox
                  checked={agreed}
                  onCheckedChange={(v) => setAgreed(Boolean(v))}
                  className="mt-0.5 rounded-none"
                />
                <span className="text-[11px] font-semibold text-slate-800 leading-snug">
                  I certify that the information and evidence in this appeal are truthful, and I agree to strictly comply with E-Paayos platform rules.
                </span>
              </label>
            </div>
          </form>
        ) : hasAppeal ? (
          /* APPEAL STATUS MONITOR (Displayed once appeal is submitted) */
          <div className="space-y-3.5">
            <AppealStatusTimeline appeal={latestAppeal} />

            {/* Submitted Appeal Summary Card */}
            <div className="border border-slate-200 bg-white p-3.5 space-y-2 shadow-2xs">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <FileText className="size-3.5 text-[#081F5C]" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                  Your Submitted Appeal Details
                </span>
              </div>
              <p className="font-bold text-slate-900">{latestAppeal.subject}</p>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 border border-slate-200 p-2.5">
                {latestAppeal.reason}
              </p>
              {Array.isArray(latestAppeal.evidencePhotos) && latestAppeal.evidencePhotos.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {latestAppeal.evidencePhotos.map((img, i) => (
                    <div key={i} className="size-12 border border-slate-300 overflow-hidden">
                      <img src={img} alt="Appeal Proof" className="size-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isApproved && restriction?.restrictionReason && (
              <div className="border border-rose-200 bg-rose-50/70 p-3 space-y-1 text-rose-950">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 block">
                  Original Restriction Notice
                </span>
                <p className="text-[11px] font-medium">{restriction.restrictionReason}</p>
              </div>
            )}
          </div>
        ) : (
          /* DEFAULT RESTRICTION NOTICE (Before any appeal is submitted) */
          <div className="space-y-3.5">
            <div className="border border-rose-200 bg-rose-50 p-3.5 space-y-2 text-rose-950">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-black uppercase tracking-wider text-[11px] text-rose-800 flex items-center gap-1.5">
                  <AlertOctagon className="size-4 text-rose-600" />
                  Restriction Details
                </span>
                {restriction?.warningCount > 0 && (
                  <Badge className="rounded-none bg-rose-700 text-white text-[10px] font-bold">
                    {restriction.warningCount} Recorded Strike{restriction.warningCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <p className="text-xs leading-relaxed font-semibold text-slate-900 bg-white border border-rose-200 p-3 whitespace-pre-wrap">
                {restriction?.restrictionReason ||
                  restriction?.reason ||
                  "Your account has been restricted due to repeated or severe violations of E-Paayos platform rules."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                <div>
                  <span className="text-rose-700 font-bold uppercase block text-[10px]">Effective Since</span>
                  <span className="font-semibold text-slate-900">
                    {formatDateTime(restriction?.restrictedAt)}
                  </span>
                </div>
                <div>
                  <span className="text-rose-700 font-bold uppercase block text-[10px]">Restriction Duration</span>
                  <span className="font-bold text-rose-900">
                    {restriction?.restrictedUntil
                      ? `Until ${formatDateTime(restriction.restrictedUntil)}`
                      : "Indefinite (Until Lifted by Admin)"}
                  </span>
                </div>
              </div>
              {(restriction?.restrictionRelatedTicket || restriction?.relatedTicket) && (
                <div className="pt-1 flex items-center gap-1.5 text-[11px] text-rose-800">
                  <Ticket className="size-3.5" />
                  <span>Related Report Ticket:</span>
                  <span className="font-mono font-bold">
                    #{restriction.restrictionRelatedTicket || restriction.relatedTicket}
                  </span>
                </div>
              )}
            </div>

            <div className="border border-slate-200 bg-white p-3.5 text-slate-700 leading-relaxed space-y-1.5">
              <p className="font-bold text-slate-900">Believe this was a mistake or already resolved?</p>
              <p>
                Click <strong>Appeal</strong> below to submit an explanation and supporting evidence to E-Paayos Administration. Once submitted, you can monitor whether your appeal is <strong>Submitted</strong>, <strong>Under Review</strong>, or <strong>Approved / Rejected</strong>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <DialogFooter className="border-t border-slate-200 bg-white px-5 py-3.5 flex flex-col-reverse sm:flex-row items-center justify-between gap-2 shrink-0">
        {isApproved ? (
          <Button
            type="button"
            onClick={onContinueApproved}
            className="w-full sm:w-auto sm:ml-auto h-9 px-5 rounded-none bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
          >
            <CheckCircle2 className="size-3.5 mr-1.5" />
            Continue to My Account
          </Button>
        ) : composeMode && !hasAppeal ? (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setComposeMode(false)}
              className="w-full sm:w-auto h-9 px-4 rounded-none text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="size-3.5 mr-1.5" />
              Back
            </Button>
            <Button
              type="submit"
              form="restriction-appeal-form"
              disabled={submitting || !agreed}
              className="w-full sm:w-auto h-9 px-5 rounded-none bg-[#081F5C] hover:bg-[#1447a6] disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              {submitting ? (
                <>
                  <Spinner className="size-3.5 mr-1.5 animate-spin" />
                  Submitting Appeal...
                </>
              ) : (
                <>
                  <Send className="size-3.5 mr-1.5" />
                  Submit Appeal
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="flex flex-col-reverse sm:flex-row w-full items-center justify-between gap-2">
            {hasAppeal && onRefreshStatus ? (
              <Button
                type="button"
                variant="outline"
                disabled={refreshing}
                onClick={handleRefresh}
                className="w-full sm:w-auto h-9 px-4 rounded-none text-xs font-bold border-slate-300 cursor-pointer"
              >
                <RefreshCw className={cn("size-3.5 mr-1.5", refreshing && "animate-spin")} />
                Refresh Status
              </Button>
            ) : (
              <div />
            )}

            <div className="flex flex-col-reverse sm:flex-row w-full sm:w-auto items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onSignOut}
                className="w-full sm:w-auto h-9 px-4 rounded-none border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                <LogOut className="size-3.5 mr-1.5" />
                {signOutLabel}
              </Button>

              {!hasAppeal && (
                <Button
                  type="button"
                  onClick={() => setComposeMode(true)}
                  className="w-full sm:w-auto h-9 px-5 rounded-none bg-[#081F5C] hover:bg-[#1447a6] text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-xs"
                >
                  <ShieldAlert className="size-3.5 mr-1.5 text-amber-300" />
                  Appeal
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogFooter>
    </div>
  )
}
