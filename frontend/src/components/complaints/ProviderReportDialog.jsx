import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../ui/dialog"
import { Button } from "../ui/button"
import { Spinner } from "../ui/spinner"
import {
  AlertTriangle,
  Camera,
  FileText,
  Info,
  ShieldAlert,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { getApiBaseUrl } from "../../lib/apiBaseUrl"

const API_URL = getApiBaseUrl()

function authHeaders() {
  const token = localStorage.getItem("token")
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function getProviderBookingsEndpoint() {
  try {
    const raw = localStorage.getItem("user")
    const parsed = raw ? JSON.parse(raw) : null
    if (parsed?.role === "oncall-mechanic-technician") {
      return `${API_URL}/api/mechanic/bookings`
    }
  } catch {
    // fallback
  }
  return `${API_URL}/api/shop/bookings`
}

export default function ProviderReportDialog({ open, onOpenChange, onSuccess }) {
  const [submitting, setSubmitting] = useState(false)
  const [bookings, setBookings] = useState([])
  const [selectedBookingId, setSelectedBookingId] = useState("")
  const [category, setCategory] = useState("fake_booking")
  const [priority, setPriority] = useState("medium")
  const [subject, setSubject] = useState("")
  const [description, setDescription] = useState("")
  const [evidencePhotos, setEvidencePhotos] = useState([])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const loadBookings = async () => {
      try {
        const res = await fetch(getProviderBookingsEndpoint(), { headers: authHeaders() })
        const data = await res.json().catch(() => ({}))
        const rows = Array.isArray(data?.bookings)
          ? data.bookings
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : []
        if (!cancelled) {
          setBookings(rows)
          if (rows.length > 0 && !selectedBookingId) {
            setSelectedBookingId(String(rows[0].id || rows[0]._id || ""))
          }
        }
      } catch {
        // silent fail
      }
    }
    void loadBookings()
    return () => {
      cancelled = true
    }
  }, [open, selectedBookingId])

  const activeBooking =
    bookings.find((b) => String(b.id || b._id) === String(selectedBookingId)) || null

  const customerNameDisplay =
    activeBooking?.customer?.fullName ||
    activeBooking?.contactName ||
    "Customer"

  const customerId =
    activeBooking?.customer?._id ||
    (typeof activeBooking?.customer === "string" ? activeBooking.customer : null)

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    if (evidencePhotos.length + files.length > 5) {
      toast.error("You can upload a maximum of 5 evidence photos.")
      return
    }
    files.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file.`)
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB size limit.`)
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
    if (!subject.trim()) {
      toast.error("Please enter a subject/title for your report.")
      return
    }
    if (!description.trim()) {
      toast.error("Please provide a detailed description of the incident.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/users/complaints/provider`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          bookingId: activeBooking?.id || activeBooking?._id || null,
          targetCustomerId: customerId,
          targetCustomerName: customerNameDisplay,
          category,
          priority,
          subject: subject.trim(),
          description: description.trim(),
          evidencePhotos,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || "Failed to submit report.")

      toast.success(
        data?.message || "Incident report submitted to E-Paayos Administration.",
        { duration: 5000 }
      )
      setSubject("")
      setDescription("")
      setEvidencePhotos([])
      setCategory("fake_booking")
      setPriority("medium")
      onOpenChange?.(false)
      onSuccess?.(data?.data)
    } catch (err) {
      toast.error(err?.message || "Could not submit report.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100vw-1.5rem)] sm:max-w-2xl overflow-hidden flex flex-col p-0 border border-slate-200 bg-white shadow-2xl rounded-none">
        <div className="bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-4 py-3 sm:px-5 sm:py-3.5 text-white shrink-0 border-b border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-8 items-center justify-center bg-amber-400/20 text-amber-300 border border-amber-300/40 shrink-0">
                <ShieldAlert className="size-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                  Report a Customer / Booking Incident
                </DialogTitle>
                <DialogDescription className="text-[10px] sm:text-[11px] text-blue-100/80 line-clamp-1 mt-0.5">
                  Submit bogus bookings, non-payment, no-shows, or abusive customer incidents to Admin for investigation.
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange?.(false)}
              className="size-7 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 bg-slate-100/50 text-xs">
            <div className="border border-slate-200 bg-white p-3.5 space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <User className="size-3 text-[#081F5C]" />
                Associated Booking &amp; Customer
              </span>

              {bookings.length > 0 ? (
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">
                    Select Booking / Customer
                  </label>
                  <select
                    value={selectedBookingId}
                    onChange={(e) => setSelectedBookingId(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-slate-50 border border-slate-300 text-xs font-semibold focus:outline-none focus:border-[#081F5C]"
                  >
                    {bookings.map((b) => (
                      <option key={b.id || b._id} value={b.id || b._id}>
                        #{b.ref || String(b.id || b._id).slice(-6)} · {b.customer?.fullName || b.contactName || "Customer"} — {b.serviceName || b.problemDescription || "Service"}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">No bookings loaded — report will be logged directly to Admin.</p>
              )}

              {activeBooking && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Reported Customer</span>
                    <p className="font-bold text-slate-900 truncate">{customerNameDisplay}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase block">Service</span>
                    <p className="font-semibold text-slate-800 truncate">
                      {activeBooking.serviceName || activeBooking.problemDescription || "Repair Booking"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="border border-slate-200 bg-white p-3.5 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <AlertTriangle className="size-3 text-amber-500" />
                Violation Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">
                    Violation Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-slate-50 border border-slate-300 text-xs font-semibold focus:outline-none focus:border-[#081F5C]"
                  >
                    <option value="fake_booking">Bogus / Fake Booking</option>
                    <option value="late_no_show">Customer No-Show / Ghosting</option>
                    <option value="non_payment">Refusal / Failure to Pay</option>
                    <option value="abusive_customer">Abusive / Disrespectful Customer</option>
                    <option value="harassment">Harassment / Safety Threat</option>
                    <option value="scam_fraud">Fraudulent Claim / Scam</option>
                    <option value="other">Other Platform Violation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">
                    Severity Level <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full h-8.5 px-2.5 bg-slate-50 border border-slate-300 text-xs font-semibold focus:outline-none focus:border-[#081F5C]"
                  >
                    <option value="urgent">Urgent (Safety / Fraud)</option>
                    <option value="high">High (Non-payment / Repeated Bogus Booking)</option>
                    <option value="medium">Medium (No-show / Conduct)</option>
                    <option value="low">Low (Minor issue)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1 uppercase text-[10px]">
                  Report Title / Summary <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Customer booked home repair and failed to pay / bogus address"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  required
                  className="w-full h-8.5 px-2.5 bg-slate-50 border border-slate-300 text-xs font-medium focus:outline-none focus:border-[#081F5C]"
                />
              </div>
            </div>

            <div className="border border-slate-200 bg-white p-3.5 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <FileText className="size-3 text-indigo-500" />
                Detailed Incident Description <span className="text-rose-500">*</span>
              </span>
              <textarea
                rows={3}
                placeholder="Describe what happened, dates/times, and any attempts to contact the customer..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={4000}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-300 text-xs leading-relaxed focus:outline-none focus:border-[#081F5C]"
              />
            </div>

            <div className="border border-slate-200 bg-white p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <Camera className="size-3 text-emerald-500" />
                  Supporting Evidence (Screenshots, Call Logs)
                </span>
                <span className="text-[10px] text-slate-400">{evidencePhotos.length}/5</span>
              </div>
              <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 hover:border-[#081F5C] bg-slate-50 cursor-pointer">
                <Upload className="size-4 text-slate-400" />
                <span className="text-xs font-bold text-[#081F5C]">Upload screenshot or photo proof</span>
                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
              </label>
              {evidencePhotos.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {evidencePhotos.map((photo, idx) => (
                    <div key={idx} className="relative size-14 border border-slate-300 overflow-hidden group">
                      <img src={photo} alt="Proof" className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setEvidencePhotos((p) => p.filter((_, i) => i !== idx))}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white"
                      >
                        <Trash2 className="size-3.5 text-rose-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-blue-200 bg-blue-50/70 p-2.5 flex items-start gap-2 text-[11px] text-blue-950">
              <Info className="size-3.5 text-blue-700 shrink-0 mt-0.5" />
              <p className="leading-snug">
                E-Paayos Administration will investigate this report and may issue an official warning or account restriction to repeat offenders.
              </p>
            </div>
          </div>

          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange?.(false)} className="rounded-none text-xs font-bold">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-8 px-4 rounded-none bg-[#081F5C] hover:bg-[#1447a6] text-white text-xs font-black cursor-pointer"
            >
              {submitting ? (
                <>
                  <Spinner className="size-3 mr-1.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <ShieldAlert className="size-3.5 mr-1.5 text-amber-300" />
                  Submit Report to Admin
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
