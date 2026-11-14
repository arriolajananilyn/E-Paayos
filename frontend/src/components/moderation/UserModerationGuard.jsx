import { useCallback, useEffect, useState } from "react"
import {
  AlertOctagon,
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Ticket,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import { cn } from "@/lib/utils"

const API_URL = getApiBaseUrl()

const CATEGORY_LABELS = {
  warranty_violation: "Warranty Policy Violation",
  overcharging: "Overcharging / Unauthorized Fees",
  poor_service: "Substandard Service Quality",
  damage_property: "Property / Item Damage",
  late_no_show: "Late / No-Show Violation",
  unprofessional_behavior: "Unprofessional Conduct",
  scam_fraud: "Fraudulent Activity / Scam",
  harassment: "Harassment / Safety Concern",
  fake_booking: "Bogus / Fake Booking",
  non_payment: "Refusal / Failure to Pay",
  abusive_customer: "Abusive Behavior Toward Provider",
  policy_violation: "Platform Rules & Policy Violation",
  repeat_violation: "Repeated Platform Violations",
  other: "Administrative Violation",
}

const SEVERITY_META = {
  minor: {
    label: "Minor Notice",
    badge: "bg-sky-100 text-sky-900 border-sky-300",
    banner: "from-slate-900 via-[#081F5C] to-[#1447a6]",
  },
  moderate: {
    label: "Formal Warning",
    badge: "bg-amber-100 text-amber-900 border-amber-300",
    banner: "from-amber-900 via-amber-800 to-slate-900",
  },
  severe: {
    label: "Severe Violation Warning",
    badge: "bg-orange-100 text-orange-950 border-orange-400",
    banner: "from-orange-900 via-red-900 to-slate-950",
  },
  final_warning: {
    label: "Final Warning (Pre-Restriction)",
    badge: "bg-rose-100 text-rose-900 border-rose-400",
    banner: "from-rose-950 via-red-900 to-slate-950",
  },
}

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

function readSignedInUser() {
  if (typeof window === "undefined") return null
  const token = localStorage.getItem("token")
  const raw = localStorage.getItem("user")
  if (!token || !raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.role === "admin") return null
    return { token, user: parsed }
  } catch {
    return null
  }
}

export default function UserModerationGuard({ currentRoute }) {
  const [moderation, setModeration] = useState(null)
  const [sessionUser, setSessionUser] = useState(null)
  const [ackChecked, setAckChecked] = useState(false)
  const [ackNote, setAckNote] = useState("")
  const [submittingAck, setSubmittingAck] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

  const checkModeration = useCallback(async () => {
    const session = readSignedInUser()
    if (!session) {
      setSessionUser(null)
      setModeration(null)
      return
    }
    setSessionUser(session.user)

    try {
      const res = await fetch(`${API_URL}/api/users/me/moderation`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
      })
      if (res.status === 401) {
        return
      }
      const data = await res.json().catch(() => ({}))
      if (res.status === 403 && data?.code === "ACCOUNT_RESTRICTED") {
        setModeration({
          moderationStatus: "restricted",
          restrictionReason: data.reason || data.message || "Your account has been restricted.",
          restrictionCategory: data.category || "",
          restrictionRelatedTicket: data.relatedTicket || "",
          restrictedAt: data.restrictedAt || null,
          restrictedUntil: data.restrictedUntil || null,
          warningCount: Number(data.warningCount || 0),
          unacknowledgedWarnings: [],
          warnings: [],
        })
        return
      }
      if (res.ok && data?.success) {
        setModeration(data)
      }
    } catch {
      // silent network retry on next poll
    }
  }, [])

  useEffect(() => {
    void checkModeration()
  }, [checkModeration, currentRoute])

  useEffect(() => {
    const onFocus = () => void checkModeration()
    const onCheckEvent = () => void checkModeration()
    const onOpenHistory = () => {
      void checkModeration()
      setHistoryOpen(true)
    }

    window.addEventListener("focus", onFocus)
    window.addEventListener("epaayos:check-moderation", onCheckEvent)
    window.addEventListener("epaayos:open-moderation-history", onOpenHistory)

    const timer = setInterval(() => {
      void checkModeration()
    }, 20000)

    return () => {
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("epaayos:check-moderation", onCheckEvent)
      window.removeEventListener("epaayos:open-moderation-history", onOpenHistory)
      clearInterval(timer)
    }
  }, [checkModeration])

  const isRestricted = moderation?.moderationStatus === "restricted"
  const unacknowledged = Array.isArray(moderation?.unacknowledgedWarnings)
    ? moderation.unacknowledgedWarnings
    : []
  const activeWarning = !isRestricted && unacknowledged.length > 0 ? unacknowledged[0] : null

  useEffect(() => {
    setAckChecked(false)
    setAckNote("")
  }, [activeWarning?._id, activeWarning?.referenceCode])

  const handleAcknowledgeWarning = async (e) => {
    e.preventDefault()
    if (!activeWarning) return
    if (!ackChecked) {
      toast.error("Please check the confirmation box to acknowledge this official warning notice.")
      return
    }

    const session = readSignedInUser()
    if (!session) return

    setSubmittingAck(true)
    try {
      const warningId = activeWarning._id || activeWarning.referenceCode
      const res = await fetch(`${API_URL}/api/users/me/warnings/${warningId}/acknowledge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ note: ackNote.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || "Could not acknowledge warning.")
      }

      toast.success("Official warning acknowledged. Please continue following E-Paayos guidelines.")
      setAckChecked(false)
      setAckNote("")
      await checkModeration()
    } catch (err) {
      toast.error(err?.message || "Failed to acknowledge warning.")
    } finally {
      setSubmittingAck(false)
    }
  }

  const handleForceSignOut = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    setModeration(null)
    setSessionUser(null)
    window.location.hash = "#/login"
  }

  const sevMeta = SEVERITY_META[activeWarning?.severity] || SEVERITY_META.moderate

  return (
    <>
      {/* 1. ACCOUNT RESTRICTED BLOCKING NOTICE FORM */}
      <Dialog open={Boolean(isRestricted && sessionUser)} onOpenChange={() => {}}>
        <DialogContent
          showCloseButton={false}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="max-h-[92vh] max-w-[calc(100vw-1.5rem)] sm:max-w-lg overflow-hidden flex flex-col p-0 border-2 border-rose-500 bg-white shadow-2xl rounded-none z-[9999]"
        >
          <div className="bg-gradient-to-r from-rose-950 via-red-900 to-slate-950 px-5 py-4 text-white border-b border-rose-700/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center bg-rose-500/25 border border-rose-400/50 text-rose-200 shrink-0">
                <Ban className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base font-black text-white tracking-tight">
                    Account Restricted
                  </DialogTitle>
                  <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white border border-rose-400">
                    Access Suspended
                  </span>
                </div>
                <DialogDescription className="text-xs text-rose-100/85 mt-0.5">
                  E-Paayos &amp; LMD-PESO Administrative Enforcement Notice
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs bg-slate-50/60">
            <div className="border border-rose-200 bg-rose-50 p-3.5 space-y-2 text-rose-950">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-black uppercase tracking-wider text-[11px] text-rose-800 flex items-center gap-1.5">
                  <AlertOctagon className="size-4 text-rose-600" />
                  Restriction Details
                </span>
                {moderation?.warningCount > 0 && (
                  <Badge className="rounded-none bg-rose-700 text-white text-[10px] font-bold">
                    {moderation.warningCount} Recorded Strike{moderation.warningCount > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <p className="text-xs leading-relaxed font-semibold text-slate-900 bg-white border border-rose-200 p-3 whitespace-pre-wrap">
                {moderation?.restrictionReason ||
                  "Your account has been restricted due to repeated or severe violations of E-Paayos platform rules."}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                <div>
                  <span className="text-rose-700 font-bold uppercase block text-[10px]">Effective Since</span>
                  <span className="font-semibold text-slate-900">
                    {formatDateTime(moderation?.restrictedAt)}
                  </span>
                </div>
                <div>
                  <span className="text-rose-700 font-bold uppercase block text-[10px]">Restriction Duration</span>
                  <span className="font-bold text-rose-900">
                    {moderation?.restrictedUntil
                      ? `Until ${formatDateTime(moderation.restrictedUntil)}`
                      : "Indefinite (Until Lifted by Admin)"}
                  </span>
                </div>
              </div>
              {moderation?.restrictionRelatedTicket && (
                <div className="pt-1 flex items-center gap-1.5 text-[11px] text-rose-800">
                  <Ticket className="size-3.5" />
                  <span>Related Report Ticket:</span>
                  <span className="font-mono font-bold">#{moderation.restrictionRelatedTicket}</span>
                </div>
              )}
            </div>

            <div className="border border-slate-200 bg-white p-3.5 text-slate-700 leading-relaxed space-y-1.5">
              <p className="font-bold text-slate-900">What does this mean?</p>
              <p>
                While your account is restricted, you cannot book services, accept jobs, list services, or perform platform transactions. Please contact E-Paayos / LMD-PESO Administration for appeal or reinstatement instructions.
              </p>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 bg-white px-5 py-3.5 flex justify-end shrink-0">
            <Button
              type="button"
              onClick={handleForceSignOut}
              className="h-9 px-5 rounded-none bg-rose-700 hover:bg-rose-800 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              <LogOut className="size-3.5 mr-1.5" />
              Sign Out of Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. FORMAL ADMINISTRATIVE WARNING NOTICE FORM (Auto-pops on warned user's screen) */}
      <Dialog open={Boolean(activeWarning && sessionUser)} onOpenChange={() => {}}>
        <DialogContent
          showCloseButton={false}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="max-h-[92vh] max-w-[calc(100vw-1.5rem)] sm:max-w-xl overflow-hidden flex flex-col p-0 border-2 border-amber-400 bg-white shadow-2xl rounded-none z-[9998]"
        >
          {activeWarning && (
            <form onSubmit={handleAcknowledgeWarning} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Header Banner */}
              <div className={cn("bg-gradient-to-r px-5 py-4 text-white border-b border-white/15 shrink-0", sevMeta.banner)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-10 items-center justify-center bg-amber-400/20 border border-amber-300/40 text-amber-300 shrink-0">
                      <ShieldAlert className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <DialogTitle className="text-sm sm:text-base font-black text-white tracking-tight">
                          Official Administrative Warning Notice
                        </DialogTitle>
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-400 text-[#04133d]">
                          Strike #{activeWarning.warningNumber || 1}
                        </span>
                      </div>
                      <DialogDescription className="text-[11px] text-amber-100/90 mt-0.5">
                        E-Paayos &amp; LMD-PESO Moderation Form · Action Required Before Continuing
                      </DialogDescription>
                    </div>
                  </div>
                  {unacknowledged.length > 1 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-white/15 border border-white/25 text-white shrink-0">
                      1 of {unacknowledged.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Scrollable Warning Form Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/70 text-xs">
                {/* Metadata Card */}
                <div className="border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black bg-slate-900 text-white px-2 py-0.5">
                        {activeWarning.referenceCode}
                      </span>
                      <span className={cn("px-2 py-0.5 text-[10px] font-bold uppercase border", sevMeta.badge)}>
                        {sevMeta.label}
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                      <Calendar className="size-3" />
                      {formatDateTime(activeWarning.issuedAt)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Issued To</span>
                      <p className="font-bold text-slate-900">{sessionUser?.fullName || "Account Holder"}</p>
                      <p className="text-slate-500 truncate">{sessionUser?.email}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Violation Category</span>
                      <p className="font-bold text-slate-900">
                        {CATEGORY_LABELS[activeWarning.category] || activeWarning.category || "Policy Violation"}
                      </p>
                      {activeWarning.relatedTicketNumber && (
                        <p className="text-[11px] font-mono font-bold text-[#081F5C]">
                          Linked Report: #{activeWarning.relatedTicketNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Official Warning Statement */}
                <div className="border border-amber-300 bg-white p-3.5 space-y-2 shadow-2xs">
                  <div className="flex items-center gap-1.5 border-b border-amber-100 pb-1.5">
                    <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                    <span className="font-black uppercase tracking-wider text-[11px] text-amber-900">
                      Warning Subject &amp; Details
                    </span>
                  </div>
                  <p className="text-sm font-black text-slate-900 leading-snug">
                    {activeWarning.title}
                  </p>
                  <div className="border border-amber-200 bg-amber-50/70 p-3 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {activeWarning.reason}
                  </div>
                </div>

                {/* Required Corrective Action */}
                {activeWarning.correctiveAction && (
                  <div className="border border-blue-200 bg-blue-50/60 p-3.5 space-y-1.5">
                    <span className="font-black uppercase tracking-wider text-[10px] text-[#081F5C] flex items-center gap-1.5">
                      <FileText className="size-3.5" />
                      Required Corrective Action &amp; Compliance
                    </span>
                    <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {activeWarning.correctiveAction}
                    </p>
                  </div>
                )}

                {/* Escalation Policy Notice */}
                <div className="border border-rose-200 bg-rose-50/80 p-3 flex items-start gap-2.5 text-rose-950">
                  <ShieldAlert className="size-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-[11px] leading-relaxed">
                    <p className="font-extrabold uppercase tracking-wider text-[10px] text-rose-800">
                      Repeat Violation Policy (Account Restriction Warning)
                    </p>
                    <p>
                      Please observe all E-Paayos platform rules and service standards.{" "}
                      <strong>
                        If this violation is repeated or another rule breach occurs, the Administrator may restrict or suspend your account.
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Acknowledgment Form Section */}
                <div className="border border-slate-300 bg-white p-3.5 space-y-3 shadow-2xs">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
                      Your Acknowledgment Note / Commitment (Optional)
                    </label>
                    <Textarea
                      rows={2}
                      placeholder="e.g. I understand this warning and will follow platform rules strictly."
                      value={ackNote}
                      onChange={(e) => setAckNote(e.target.value)}
                      maxLength={800}
                      className="rounded-none text-xs border-slate-300 resize-none"
                    />
                  </div>

                  <label className="flex items-start gap-2.5 p-2.5 bg-slate-50 border border-slate-200 cursor-pointer select-none">
                    <Checkbox
                      checked={ackChecked}
                      onCheckedChange={(v) => setAckChecked(Boolean(v))}
                      className="mt-0.5 rounded-none border-slate-400"
                    />
                    <span className="text-[11px] font-semibold text-slate-800 leading-snug">
                      I confirm that I have read and understood this official Administrative Warning Notice, and I agree to follow E-Paayos rules. I understand that repeated violations may result in{" "}
                      <span className="text-rose-700 font-bold">account restriction</span>.
                    </span>
                  </label>
                </div>
              </div>

              {/* Footer Submit */}
              <DialogFooter className="border-t border-slate-200 bg-white px-5 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
                <span className="text-[10px] text-slate-500 font-medium">
                  Issued by: {activeWarning.issuedByName || "E-Paayos Administrator"}
                </span>
                <Button
                  type="submit"
                  disabled={submittingAck || !ackChecked}
                  className="w-full sm:w-auto h-9 px-5 rounded-none bg-[#081F5C] hover:bg-[#1447a6] disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-xs"
                >
                  {submittingAck ? (
                    <>
                      <Spinner className="size-3.5 mr-1.5 animate-spin" />
                      Submitting Acknowledgment...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.5 mr-1.5 text-emerald-300" />
                      Acknowledge Warning &amp; Continue
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 3. OPTIONAL STANDING & WARNING HISTORY MODAL (Triggerable via event) */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[88vh] max-w-[calc(100vw-1.5rem)] sm:max-w-xl overflow-hidden flex flex-col p-0 rounded-none border border-slate-200 bg-white">
          <div className="bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-5 py-3.5 text-white shrink-0">
            <DialogTitle className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-300" />
              Account Standing &amp; Warning History
            </DialogTitle>
            <DialogDescription className="text-[11px] text-blue-100/80">
              Current moderation record for {sessionUser?.fullName || "your account"}
            </DialogDescription>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs bg-slate-50/50">
            <div className="border border-slate-200 bg-white p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Current Standing</span>
                <span className="font-black text-sm uppercase text-slate-900">
                  {moderation?.moderationStatus === "warned"
                    ? `Warned (${moderation?.warningCount || 0} Strike${moderation?.warningCount === 1 ? "" : "s"})`
                    : moderation?.moderationStatus === "restricted"
                      ? "Restricted"
                      : "Good Standing (Active)"}
                </span>
              </div>
              <Badge
                className={cn(
                  "rounded-none text-[10px] font-bold uppercase",
                  moderation?.moderationStatus === "warned"
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : moderation?.moderationStatus === "restricted"
                      ? "bg-rose-100 text-rose-900 border border-rose-300"
                      : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                )}
              >
                {moderation?.moderationStatus || "active"}
              </Badge>
            </div>

            {Array.isArray(moderation?.warnings) && moderation.warnings.length > 0 ? (
              moderation.warnings.map((w) => (
                <div key={w._id || w.referenceCode} className="border border-slate-200 bg-white p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold bg-slate-900 text-white px-1.5 py-0.5">
                        {w.referenceCode}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200">
                        Strike #{w.warningNumber}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatDateTime(w.issuedAt)}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900">{w.title}</p>
                  <p className="text-slate-600 leading-relaxed">{w.reason}</p>
                  <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <span className={w.acknowledged ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                      {w.acknowledged
                        ? `Acknowledged on ${formatDateTime(w.acknowledgedAt)}`
                        : "Pending Acknowledgment"}
                    </span>
                    {w.relatedTicketNumber && (
                      <span className="font-mono text-slate-500">Ticket #{w.relatedTicketNumber}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="border border-slate-200 bg-white p-6 text-center text-slate-500">
                <ShieldCheck className="size-8 mx-auto text-emerald-500 mb-2" />
                <p className="font-bold text-slate-800">No warnings on record</p>
                <p className="text-[11px] mt-0.5">Your account is in clean good standing.</p>
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-slate-200 bg-white px-4 py-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(false)}
              className="rounded-none text-xs font-bold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
