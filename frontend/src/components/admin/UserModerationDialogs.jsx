import { useEffect, useState } from "react"
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Ticket,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
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

const WARNING_PRESETS = [
  {
    id: "warranty",
    label: "Warranty Refusal",
    severity: "severe",
    category: "warranty_violation",
    title: "Official Warning: Failure to Honor Active Service Warranty",
    reason:
      "A verified report shows refusal or unreasonable delay in honoring an active E-Paayos repair warranty for a completed service.",
    correctiveAction:
      "Honor the active warranty immediately and coordinate with the customer for free re-repair / corrective service.",
  },
  {
    id: "overcharge",
    label: "Overcharging / Hidden Fees",
    severity: "moderate",
    category: "overcharging",
    title: "Official Warning: Unauthorized Charges / Pricing Discrepancy",
    reason:
      "Complaints indicate service fees or replacement parts charges exceeded the agreed quote without prior customer approval.",
    correctiveAction:
      "Always provide transparent itemized quotes in-app before starting work and issue any approved fee adjustments.",
  },
  {
    id: "poor_work",
    label: "Substandard Work",
    severity: "moderate",
    category: "poor_service",
    title: "Official Warning: Substandard Repair Quality",
    reason:
      "Inspection and customer evidence indicate incomplete or improper workmanship on a recent repair booking.",
    correctiveAction:
      "Perform thorough quality checks before marking jobs fixed and resolve the pending rework with the customer.",
  },
  {
    id: "fake_booking",
    label: "Bogus Booking / No-Show",
    severity: "moderate",
    category: "fake_booking",
    title: "Official Warning: Bogus Booking / Repeated No-Show",
    reason:
      "A service provider reported a false booking or unannounced absence at the confirmed appointment schedule.",
    correctiveAction:
      "Only submit legitimate repair bookings and notify providers promptly if you need to reschedule or cancel.",
  },
  {
    id: "conduct",
    label: "Unprofessional Conduct",
    severity: "severe",
    category: "unprofessional_behavior",
    title: "Official Warning: Unprofessional Conduct / Policy Breach",
    reason:
      "Reported disrespectful language, harassment, or failure to follow E-Paayos community conduct guidelines.",
    correctiveAction:
      "Maintain respectful and professional communication across all platform interactions.",
  },
]

const selectCls =
  "h-9 w-full rounded-none border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#081F5C]"

export function IssueWarningDialog({
  open,
  onOpenChange,
  targetUser,
  defaultTicket = "",
  defaultComplaintId = null,
  defaultCategory = "policy_violation",
  defaultSubject = "",
  onSuccess,
}) {
  const [severity, setSeverity] = useState("moderate")
  const [category, setCategory] = useState("policy_violation")
  const [title, setTitle] = useState("")
  const [reason, setReason] = useState("")
  const [correctiveAction, setCorrectiveAction] = useState("")
  const [ticketNumber, setTicketNumber] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    const priorCount = Number(targetUser?.warningCount || 0)
    setSeverity(priorCount >= 1 ? "final_warning" : "moderate")
    setCategory(defaultCategory || "policy_violation")
    setTitle(defaultSubject ? `Official Warning: ${defaultSubject}` : "")
    setReason("")
    setCorrectiveAction(
      "Comply strictly with E-Paayos platform rules and resolve any pending obligations. Repeat violations will result in account restriction."
    )
    setTicketNumber(defaultTicket || "")
  }, [open, targetUser?.id, targetUser?._id, targetUser?.warningCount, defaultTicket, defaultCategory, defaultSubject])

  const userId = targetUser?.id || targetUser?._id
  const priorWarnings = Number(targetUser?.warningCount || 0)

  const applyPreset = (preset) => {
    setSeverity(priorWarnings >= 1 ? "final_warning" : preset.severity)
    setCategory(preset.category)
    setTitle(preset.title)
    setReason(preset.reason)
    setCorrectiveAction(preset.correctiveAction)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userId) return
    if (!title.trim() || !reason.trim()) {
      toast.error("Please provide both a warning title and detailed violation reason.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/users/admin/${userId}/warn`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          severity,
          category,
          title: title.trim(),
          reason: reason.trim(),
          correctiveAction: correctiveAction.trim(),
          relatedComplaintId: defaultComplaintId || undefined,
          relatedTicketNumber: ticketNumber.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || "Failed to issue warning.")

      toast.success(data?.message || "Formal warning issued! User will see the warning form on screen.")
      onOpenChange?.(false)
      onSuccess?.(data)
    } catch (err) {
      toast.error(err?.message || "Could not issue warning.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[calc(100vw-1.5rem)] sm:max-w-xl overflow-hidden flex flex-col p-0 border border-amber-300 bg-white shadow-2xl rounded-none">
        <div className="bg-gradient-to-r from-amber-800 via-amber-700 to-[#081F5C] px-4 py-3.5 text-white shrink-0 border-b border-white/15">
          <div className="flex items-center gap-2.5 pr-6">
            <div className="flex size-8 items-center justify-center bg-white/15 border border-white/25 shrink-0">
              <ShieldAlert className="size-4 text-amber-200" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm sm:text-base font-bold text-white leading-tight">
                Issue Formal Administrative Warning
              </DialogTitle>
              <DialogDescription className="text-[11px] text-amber-100/85">
                Displays a mandatory warning notice form directly on the user&apos;s screen
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs bg-slate-50/50">
            {/* Target User Banner */}
            {targetUser && (
              <div className="border border-slate-200 bg-white p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="size-9 rounded-none border border-slate-300">
                    <AvatarFallback className="rounded-none bg-amber-600 text-white font-bold text-xs">
                      {(targetUser.fullName || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate text-sm">{targetUser.fullName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{targetUser.email}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="outline" className="rounded-none text-[10px] font-bold uppercase">
                    {targetUser.role || "User"}
                  </Badge>
                  <span
                    className={cn(
                      "px-1.5 py-0.5 text-[10px] font-bold uppercase border",
                      priorWarnings > 0
                        ? "bg-rose-50 text-rose-800 border-rose-300"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    )}
                  >
                    Prior Strikes: {priorWarnings}
                  </span>
                </div>
              </div>
            )}

            {priorWarnings > 0 && (
              <div className="border border-rose-300 bg-rose-50 p-3 flex items-start gap-2 text-rose-900">
                <AlertTriangle className="size-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-snug">
                  <strong>Repeat Offender Notice:</strong> This user already has{" "}
                  <strong>{priorWarnings}</strong> warning strike{priorWarnings > 1 ? "s" : ""} on record. You may issue a{" "}
                  <strong>Final Warning</strong> or escalate to <strong>Account Restriction</strong>.
                </p>
              </div>
            )}

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                Quick Warning Templates
              </span>
              <div className="flex flex-wrap gap-1.5">
                {WARNING_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold border border-slate-300 bg-white hover:border-amber-500 hover:bg-amber-50 text-slate-700 cursor-pointer"
                  >
                    <Sparkles className="size-2.5 text-amber-500" />
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-700 block">
                  Warning Severity <span className="text-rose-600">*</span>
                </label>
                <select value={severity} onChange={(e) => setSeverity(e.target.value)} className={selectCls}>
                  <option value="minor">Minor Notice (Strike #{priorWarnings + 1})</option>
                  <option value="moderate">Formal Warning (Strike #{priorWarnings + 1})</option>
                  <option value="severe">Severe Violation Warning</option>
                  <option value="final_warning">Final Warning (Pre-Restriction)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-700 block">
                  Violation Category <span className="text-rose-600">*</span>
                </label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
                  <option value="warranty_violation">Warranty Violation</option>
                  <option value="overcharging">Overcharging / Hidden Fees</option>
                  <option value="poor_service">Substandard Repair Work</option>
                  <option value="damage_property">Item / Property Damage</option>
                  <option value="late_no_show">Late / No-Show</option>
                  <option value="unprofessional_behavior">Unprofessional Conduct</option>
                  <option value="fake_booking">Bogus / Fake Booking</option>
                  <option value="non_payment">Non-Payment / Fee Dispute</option>
                  <option value="abusive_customer">Abusive Behavior</option>
                  <option value="scam_fraud">Fraud / Scam</option>
                  <option value="harassment">Harassment / Safety</option>
                  <option value="policy_violation">Platform Policy Violation</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-700 block">
                  Warning Title / Subject <span className="text-rose-600">*</span>
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Official Warning: Warranty Refusal"
                  required
                  maxLength={200}
                  className="h-9 rounded-none text-xs border-slate-300 bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-700 block">
                  Linked Ticket # (Optional)
                </label>
                <div className="relative">
                  <Ticket className="size-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input
                    value={ticketNumber}
                    onChange={(e) => setTicketNumber(e.target.value)}
                    placeholder="CMP-202611-..."
                    className="h-9 pl-8 rounded-none text-xs font-mono border-slate-300 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-700 block">
                Official Warning Statement &amp; Violation Details <span className="text-rose-600">*</span>
              </label>
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain clearly what rule was violated, findings from the report investigation, and why this warning is issued..."
                required
                maxLength={3000}
                className="rounded-none text-xs border-slate-300 bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-700 block">
                Required Corrective Action / Rules Reminder
              </label>
              <Textarea
                rows={2}
                value={correctiveAction}
                onChange={(e) => setCorrectiveAction(e.target.value)}
                placeholder="Specify what the user must do to comply and avoid account restriction..."
                maxLength={1500}
                className="rounded-none text-xs border-slate-300 bg-white"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 bg-white px-4 py-3 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end shrink-0">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => onOpenChange?.(false)}
              className="h-8 px-4 text-xs font-bold rounded-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-8 px-4 text-xs font-bold rounded-none bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            >
              {submitting ? (
                <>
                  <Spinner className="size-3.5 mr-1.5 animate-spin" />
                  Sending Warning...
                </>
              ) : (
                <>
                  <ShieldAlert className="size-3.5 mr-1.5" />
                  Send Warning Notice Form
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function RestrictUserDialog({
  open,
  onOpenChange,
  targetUser,
  defaultTicket = "",
  defaultComplaintId = null,
  defaultCategory = "repeat_violation",
  onSuccess,
}) {
  const [durationDays, setDurationDays] = useState("7")
  const [category, setCategory] = useState("repeat_violation")
  const [reason, setReason] = useState("")
  const [ticketNumber, setTicketNumber] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setDurationDays("7")
    setCategory(defaultCategory || "repeat_violation")
    setReason("")
    setTicketNumber(defaultTicket || "")
  }, [open, targetUser?.id, targetUser?._id, defaultTicket, defaultCategory])

  const userId = targetUser?.id || targetUser?._id
  const priorWarnings = Number(targetUser?.warningCount || 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userId) return
    if (!reason.trim()) {
      toast.error("Please provide a specific reason for restricting this account.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/users/admin/${userId}/restrict`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          durationDays: Number(durationDays),
          category,
          reason: reason.trim(),
          relatedComplaintId: defaultComplaintId || undefined,
          relatedTicketNumber: ticketNumber.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || "Failed to restrict account.")

      toast.success(data?.message || "User account restricted successfully.")
      onOpenChange?.(false)
      onSuccess?.(data)
    } catch (err) {
      toast.error(err?.message || "Could not restrict account.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[calc(100vw-1.5rem)] sm:max-w-lg overflow-hidden flex flex-col p-0 border border-rose-300 bg-white shadow-2xl rounded-none">
        <div className="bg-gradient-to-r from-rose-950 via-red-800 to-slate-950 px-4 py-3.5 text-white shrink-0 border-b border-rose-700/40">
          <div className="flex items-center gap-2.5 pr-6">
            <div className="flex size-8 items-center justify-center bg-white/15 border border-white/25 shrink-0">
              <Ban className="size-4 text-rose-200" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold text-white leading-tight">
                Restrict User Account
              </DialogTitle>
              <DialogDescription className="text-[11px] text-rose-100/80">
                Suspend platform access due to repeated or severe violations
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs bg-slate-50/50">
            {targetUser && (
              <div className="border border-slate-200 bg-white p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar className="size-9 rounded-none border border-slate-300">
                    <AvatarFallback className="rounded-none bg-rose-700 text-white font-bold text-xs">
                      {(targetUser.fullName || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate text-sm">{targetUser.fullName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{targetUser.email}</p>
                  </div>
                </div>
                <Badge
                  className={cn(
                    "rounded-none text-[10px] font-bold uppercase shrink-0",
                    priorWarnings > 0 ? "bg-rose-100 text-rose-900 border border-rose-300" : "bg-slate-100 text-slate-700"
                  )}
                >
                  {priorWarnings} Warning Strike{priorWarnings === 1 ? "" : "s"}
                </Badge>
              </div>
            )}

            {priorWarnings === 0 && (
              <div className="border border-amber-300 bg-amber-50 p-3 flex items-start gap-2 text-amber-900">
                <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-snug">
                  <strong>Progressive Discipline Note:</strong> This user currently has{" "}
                  <strong>0 prior warnings</strong>. For non-severe first offenses, consider issuing a{" "}
                  <strong>Formal Warning</strong> first before restricting their account.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-700 block">
                  Restriction Duration <span className="text-rose-600">*</span>
                </label>
                <select value={durationDays} onChange={(e) => setDurationDays(e.target.value)} className={selectCls}>
                  <option value="3">3 Days (Short Suspension)</option>
                  <option value="7">7 Days (1 Week Suspension)</option>
                  <option value="14">14 Days (2 Weeks Suspension)</option>
                  <option value="30">30 Days (1 Month Suspension)</option>
                  <option value="0">Indefinite (Until Admin Lifts)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-700 block">
                  Linked Ticket # (Optional)
                </label>
                <Input
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  placeholder="CMP-202611-..."
                  className="h-9 rounded-none text-xs font-mono border-slate-300 bg-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-700 block">
                Restriction Category
              </label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
                <option value="repeat_violation">Repeated Rule Violations (After Warnings)</option>
                <option value="warranty_violation">Persistent Warranty Refusal</option>
                <option value="scam_fraud">Fraud / Scam Activity</option>
                <option value="harassment">Severe Harassment / Safety Threat</option>
                <option value="fake_booking">Repeated Bogus Bookings / Abuse</option>
                <option value="policy_violation">Severe Platform Policy Breach</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-700 block">
                Official Restriction Reason <span className="text-rose-600">*</span>
              </label>
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State the violations committed, prior warnings ignored, and requirements for reinstatement..."
                required
                maxLength={3000}
                className="rounded-none text-xs border-slate-300 bg-white"
              />
            </div>

            <div className="border border-rose-200 bg-rose-50/70 p-2.5 text-[11px] text-rose-900 leading-snug">
              Restricted users are immediately blocked from booking, accepting jobs, or signing in, and their shop listings are hidden from customers until the restriction expires or is lifted.
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 bg-white px-4 py-3 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end shrink-0">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => onOpenChange?.(false)}
              className="h-8 px-4 text-xs font-bold rounded-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-8 px-4 text-xs font-bold rounded-none bg-rose-700 hover:bg-rose-800 text-white cursor-pointer"
            >
              {submitting ? (
                <>
                  <Spinner className="size-3.5 mr-1.5 animate-spin" />
                  Restricting...
                </>
              ) : (
                <>
                  <Ban className="size-3.5 mr-1.5" />
                  Confirm Account Restriction
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function LiftRestrictionDialog({ open, onOpenChange, targetUser, onSuccess }) {
  const [reason, setReason] = useState("")
  const [clearWarnings, setClearWarnings] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setReason("Restriction lifted after administrative review. Account reinstated.")
    setClearWarnings(false)
  }, [open, targetUser?.id, targetUser?._id])

  const userId = targetUser?.id || targetUser?._id

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userId) return

    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/users/admin/${userId}/unrestrict`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          reason: reason.trim() || "Restriction lifted by Administrator.",
          clearWarnings,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || "Failed to lift restriction.")

      toast.success(data?.message || "Account restriction lifted.")
      onOpenChange?.(false)
      onSuccess?.(data)
    } catch (err) {
      toast.error(err?.message || "Could not lift restriction.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100vw-1.5rem)] sm:max-w-md overflow-hidden flex flex-col p-0 border border-emerald-300 bg-white shadow-2xl rounded-none">
        <div className="bg-gradient-to-r from-[#04133d] via-[#081F5C] to-emerald-700 px-4 py-3.5 text-white shrink-0">
          <div className="flex items-center gap-2.5 pr-6">
            <div className="flex size-8 items-center justify-center bg-white/15 border border-white/25 shrink-0">
              <ShieldCheck className="size-4 text-emerald-300" />
            </div>
            <div>
              <DialogTitle className="text-sm sm:text-base font-bold text-white leading-tight">
                Lift Account Restriction
              </DialogTitle>
              <DialogDescription className="text-[11px] text-emerald-100/85">
                Restore platform access for {targetUser?.fullName || "user"}
              </DialogDescription>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 text-xs">
          {targetUser?.restrictionReason && (
            <div className="border border-slate-200 bg-slate-50 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Current Restriction Reason</span>
              <p className="text-xs text-slate-800">{targetUser.restrictionReason}</p>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold uppercase text-slate-700 block">
              Reinstatement Notes
            </label>
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-none text-xs border-slate-300"
            />
          </div>

          <label className="flex items-start gap-2.5 p-2.5 border border-slate-200 bg-slate-50 cursor-pointer select-none">
            <Checkbox
              checked={clearWarnings}
              onCheckedChange={(v) => setClearWarnings(Boolean(v))}
              className="mt-0.5 rounded-none"
            />
            <span className="text-[11px] font-semibold text-slate-800 leading-snug">
              Also reset warning strike count to 0 (restore completely clean standing)
            </span>
          </label>

          <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => onOpenChange?.(false)}
              className="h-8 px-4 text-xs font-bold rounded-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-8 px-4 text-xs font-bold rounded-none bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {submitting ? "Restoring..." : "Confirm & Lift Restriction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
