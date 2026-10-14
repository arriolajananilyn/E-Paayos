import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Spinner } from '../ui/spinner'
import {
  AlertTriangle,
  Building2,
  Camera,
  CheckCircle,
  FileText,
  Info,
  ShieldAlert,
  Trash2,
  Upload,
  Wrench,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { getApiBaseUrl } from '../../lib/apiBaseUrl'

const API_URL = getApiBaseUrl()

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export default function CustomerComplaintDialog({
  open,
  onOpenChange,
  booking = null,
  targetShopName = '',
  targetShopId = null,
  onSuccess,
}) {
  const [submitting, setSubmitting] = useState(false)
  const [category, setCategory] = useState('poor_service')
  const [priority, setPriority] = useState('medium')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [evidencePhotos, setEvidencePhotos] = useState([])
  const [customerBookings, setCustomerBookings] = useState([])
  const [selectedBookingId, setSelectedBookingId] = useState(booking?.id || booking?._id || '')

  useEffect(() => {
    if (!open) return
    if (booking) {
      setSelectedBookingId(booking.id || booking._id || '')
      return
    }

    // Fetch customer's recent bookings for selection if booking not provided
    const fetchBookings = async () => {
      try {
        const res = await fetch(`${API_URL}/api/catalog/bookings`, { headers: authHeaders() })
        const data = await res.json().catch(() => ({}))
        const rows = Array.isArray(data?.bookings) ? data.bookings : Array.isArray(data) ? data : []
        setCustomerBookings(rows)
        if (rows.length > 0 && !selectedBookingId) {
          setSelectedBookingId(rows[0].id || rows[0]._id || '')
        }
      } catch {
        // silent fail
      }
    }
    fetchBookings()
  }, [open, booking])

  const activeBooking =
    booking ||
    customerBookings.find((b) => String(b.id || b._id) === String(selectedBookingId)) ||
    null

  const shopNameDisplay =
    targetShopName ||
    activeBooking?.shopName ||
    activeBooking?.shopOwner?.shopName ||
    activeBooking?.shopOwner?.fullName ||
    'Repair Service Provider'

  const effectiveShopId =
    targetShopId ||
    activeBooking?.shopOwnerId ||
    activeBooking?.shopOwner?._id ||
    activeBooking?.shopOwner ||
    null

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    if (evidencePhotos.length + files.length > 5) {
      toast.error('You can upload a maximum of 5 evidence photos.')
      return
    }

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file.`)
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB size limit.`)
        return
      }

      const reader = new FileReader()
      reader.onload = (event) => {
        setEvidencePhotos((prev) => [...prev, event.target.result])
      }
      reader.readAsDataURL(file)
    })

    e.target.value = ''
  }

  const removePhoto = (index) => {
    setEvidencePhotos((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!subject.trim()) {
      toast.error('Please enter a brief subject/title for your complaint.')
      return
    }
    if (!description.trim()) {
      toast.error('Please provide a detailed description of what happened.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        targetType: 'shop',
        targetShopId: effectiveShopId,
        targetShopName: shopNameDisplay,
        bookingId: activeBooking?.id || activeBooking?._id || null,
        category,
        priority,
        subject: subject.trim(),
        description: description.trim(),
        evidencePhotos,
      }

      const res = await fetch(`${API_URL}/api/users/complaints`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to submit complaint.')
      }

      toast.success(
        `Complaint filed successfully! Ticket #${data?.data?.ticketNumber || 'LOGGED'} has been transmitted to LMD-PESO Moderation.`,
        { duration: 6000 }
      )

      // Reset form
      setSubject('')
      setDescription('')
      setEvidencePhotos([])
      setCategory('poor_service')
      setPriority('medium')

      if (onOpenChange) onOpenChange(false)
      if (onSuccess) onSuccess(data?.data)
    } catch (err) {
      toast.error(err?.message || 'Error submitting complaint.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[calc(100vw-1.5rem)] sm:max-w-2xl overflow-hidden flex flex-col p-0 border border-slate-200 bg-white shadow-2xl rounded-none dark:border-slate-800 dark:bg-slate-900">
        {/* Compact Header Gradient Banner - Matching trackServices.jsx standard */}
        <div className="bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-4 py-3 sm:px-5 sm:py-3.5 text-white shrink-0 border-b border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-8 items-center justify-center bg-rose-500/20 text-rose-300 border border-rose-400/30 shrink-0">
                <ShieldAlert className="size-4 text-rose-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
                    Submit Complaint &amp; Damage Report
                  </DialogTitle>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-500/25 border border-rose-400/40 text-rose-200 text-[9px] font-black uppercase tracking-wider">
                    LMD-PESO Dispute Desk
                  </span>
                </div>
                <DialogDescription className="text-[10px] sm:text-[11px] text-blue-100/80 font-normal line-clamp-1 mt-0.5">
                  Official arbitration portal for damaged items and unsatisfactory repair services.
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="size-7 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors shrink-0 cursor-pointer"
              aria-label="Close dialog"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Form Container with Fixed Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3 bg-slate-100/50 dark:bg-slate-950/40 text-xs">
            {/* Card 1: Reported Entity & Service Context */}
            <div className="border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-3 sm:p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <Building2 className="size-3 text-[#081F5C]" />
                  Reported Entity &amp; Service Context
                </span>
                {activeBooking && (
                  <span className="font-mono text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 border border-slate-200 dark:border-slate-700">
                    Ref #{String(activeBooking.ref || activeBooking.id || activeBooking._id).slice(-8)}
                  </span>
                )}
              </div>

              {!booking && customerBookings.length > 0 ? (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 uppercase text-[10px]">
                    Select Associated Booking / Job
                  </label>
                  <select
                    value={selectedBookingId}
                    onChange={(e) => setSelectedBookingId(e.target.value)}
                    className="w-full h-8 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#081F5C]"
                  >
                    {customerBookings.map((b) => (
                      <option key={b.id || b._id} value={b.id || b._id}>
                        #{b.ref || String(b.id || b._id).slice(-6)} · {b.shopName || 'Shop'} — {b.serviceName || 'Service'} ({b.date || 'Recent'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">Shop / Technician</span>
                  <p className="font-bold text-slate-900 dark:text-white truncate">{shopNameDisplay}</p>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">Service Description</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {activeBooking?.serviceName || 'Repairs & Maintenance'}
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Dispute Details & Severity */}
            <div className="border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-3 sm:p-3.5 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <AlertTriangle className="size-3 text-amber-500" />
                Dispute Details &amp; Severity
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 uppercase text-[10px]">
                    Issue Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-8 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#081F5C]"
                  >
                    <option value="warranty_violation">Refusal to Honor Warranty / Free Refix</option>
                    <option value="poor_service">Substandard / Incomplete Repair Work</option>
                    <option value="damage_property">Damage to Item or Property During Work</option>
                    <option value="overcharging">Overcharging / Unexpected Hidden Fees</option>
                    <option value="late_no_show">Late or No-Show Technician</option>
                    <option value="unprofessional_behavior">Rude or Unprofessional Conduct</option>
                    <option value="scam_fraud">Scam or Fraudulent Behavior</option>
                    <option value="other">Other General Grievance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 uppercase text-[10px]">
                    Urgency / Severity Level <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full h-8 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-semibold focus:outline-none focus:border-[#081F5C]"
                  >
                    <option value="urgent">Urgent (Safety hazard / Critical damaged item)</option>
                    <option value="high">High (Refusal to honor warranty / Major dispute)</option>
                    <option value="medium">Medium (Defect returned / Unfinished fix)</option>
                    <option value="low">Low (Minor grievance / Query)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 uppercase text-[10px]">
                  Complaint Title / Summary <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Technician damaged motorcycle brake assembly during tune-up and refused rework"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  required
                  className="w-full h-8 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium focus:outline-none focus:border-[#081F5C]"
                />
              </div>
            </div>

            {/* Card 3: Detailed Description & Specific Damages */}
            <div className="border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-3 sm:p-3.5 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <FileText className="size-3 text-indigo-500" />
                  Detailed Damage &amp; Grievance Statement <span className="text-rose-500">*</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">{description.length}/4000</span>
              </div>
              <textarea
                rows={3}
                placeholder="Explain what happened, the specific damages caused or services neglected, date/time, and what remedy you are requesting (e.g. Free repair refix, refund, inspection)..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={4000}
                required
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs leading-relaxed focus:outline-none focus:border-[#081F5C] resize-y min-h-[75px]"
              />
            </div>

            {/* Card 4: Supporting Evidence Photos & Documents */}
            <div className="border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-3 sm:p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <Camera className="size-3 text-emerald-500" />
                  Attach Evidence Photos (Damage, Receipts, Messages)
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  {evidencePhotos.length}/5 Photos
                </span>
              </div>

              <div className="space-y-2">
                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#081F5C] bg-slate-50 dark:bg-slate-800/60 cursor-pointer transition-colors text-center">
                  <Upload className="size-4 text-slate-400" />
                  <span className="text-xs font-bold text-[#081F5C] dark:text-blue-400">
                    Upload photo or screenshot evidence
                  </span>
                  <span className="text-[10px] text-slate-400">(JPG, PNG, WebP up to 5MB each)</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>

                {evidencePhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {evidencePhotos.map((photo, index) => (
                      <div
                        key={index}
                        className="relative size-14 border border-slate-300 dark:border-slate-700 overflow-hidden group shadow-2xs"
                      >
                        <img
                          src={photo}
                          alt={`Uploaded evidence ${index + 1}`}
                          className="size-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                          title="Remove photo"
                        >
                          <Trash2 className="size-3.5 text-rose-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Card 5: Fair Hearing & Official Record Notice */}
            <div className="border border-blue-200 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-900/40 p-2.5 flex items-start gap-2 text-[11px] text-blue-950 dark:text-blue-200">
              <Info className="size-3.5 text-blue-700 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="leading-snug">
                <strong>Official LMD-PESO Mediation:</strong> Upon submission, this ticket is logged into the administrative records. The reported service provider will be notified and given the opportunity to provide counter-evidence before a binding resolution is enforced.
              </p>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="px-4 py-2.5 sm:px-5 sm:py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-none cursor-pointer text-xs font-bold h-8 px-3"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-8 px-4 rounded-none bg-[#081F5C] hover:bg-[#1447a6] text-white text-xs font-black shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Spinner className="size-3 mr-1 animate-spin" />
                  Submitting Report...
                </>
              ) : (
                <>
                  <ShieldAlert className="size-3.5 text-amber-300" />
                  Submit Report to LMD-PESO
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
