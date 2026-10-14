import { useMemo, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  AlertTriangle,
  Award,
  Bike,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Info,
  MapPin,
  Phone,
  Printer,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tag,
  WashingMachine,
  Wrench,
  X,
} from 'lucide-react'
import Elogo from '../../assets/Elogo.png'

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function categoryIcon(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return Bike
  if (normalized === 'gadget') return Smartphone
  if (normalized === 'appliance') return WashingMachine
  return Wrench
}

const DEFAULT_COVERED_ITEMS = [
  { text: 'Workmanship & repair assembly errors' },
  { text: 'Manufacturer-defective replacement components' },
  { text: 'Recurring symptoms from serviced repair scope' },
  { text: 'Diagnostic realignment & tuning adjustments' },
]

const DEFAULT_VOID_CONDITIONS = [
  { text: 'Accidental drops, physical impact, or external collision' },
  { text: 'Liquid intrusion, chemical spill, or corrosion' },
  { text: 'Broken warranty seals or unauthorized tampering' },
  { text: 'Third-party disassembly or unauthorized modifications' },
]

export function ServiceWarrantyDialog({ open, onOpenChange, booking, onClaimWarranty }) {
  const certificateRef = useRef(null)
  const [isPrinting, setIsPrinting] = useState(false)

  if (!booking) return null

  const serviceCategory = booking.shopService?.category || booking.serviceCategory || booking.category || 'Service'
  const CategoryIcon = categoryIcon(serviceCategory)
  const serviceName = booking.shopService?.name || booking.serviceName || 'Professional Repair Service'
  const shopName = booking.shopName || booking.shopOwner?.shopName || 'E-Paayos Certified Service Center'
  const receiptNo = booking.ref || `BK-${String(booking.id || '').slice(-8).toUpperCase()}`
  const certificateNo = `WARR-${String(booking.ref || booking.id || '').replace(/^BK-/, '').slice(-8).toUpperCase()}`

  // Status flags
  const statusStr = String(booking.status || '').toLowerCase()
  const isCompleted = statusStr === 'completed'
  const isFixed = statusStr === 'fixed'
  const isPaid = String(booking.paymentStatus || '').toLowerCase() === 'paid'
  const isServiceFinalized = isCompleted || (isFixed && isPaid)

  // Warranty calculations from Shop Owner settings
  const ws = booking.warrantySettings || booking.shopOwner?.warrantySettings || {}
  const laborWarrantyEnabled = ws.laborWarrantyEnabled !== false
  const laborWarrantyDays = Number.isFinite(Number(ws.laborWarrantyDays)) ? Number(ws.laborWarrantyDays) : 30
  const partsWarrantyEnabled = ws.partsWarrantyEnabled !== false
  const partsWarrantyDays = Number.isFinite(Number(ws.partsWarrantyDays)) ? Number(ws.partsWarrantyDays) : 90

  const baseDateObj = (() => {
    const raw = booking.completedAt || booking.paidAt || booking.fixedAt || booking.updatedAt || booking.createdAt
    const d = raw ? new Date(raw) : new Date()
    return Number.isNaN(d.getTime()) ? new Date() : d
  })()

  const laborExpiryDate = new Date(baseDateObj.getTime() + laborWarrantyDays * 24 * 60 * 60 * 1000)
  const partsExpiryDate = new Date(baseDateObj.getTime() + partsWarrantyDays * 24 * 60 * 60 * 1000)
  const nowMs = Date.now()

  const isLaborActive = isServiceFinalized && laborWarrantyEnabled && laborExpiryDate.getTime() >= nowMs
  const isPartsActive = isServiceFinalized && partsWarrantyEnabled && partsExpiryDate.getTime() >= nowMs

  const laborDaysLeft = isLaborActive
    ? Math.max(0, Math.ceil((laborExpiryDate.getTime() - nowMs) / (1000 * 60 * 60 * 24)))
    : 0
  const partsDaysLeft = isPartsActive
    ? Math.max(0, Math.ceil((partsExpiryDate.getTime() - nowMs) / (1000 * 60 * 60 * 24)))
    : 0

  const replacementParts = Array.isArray(booking.serviceFeeReplacementParts)
    ? booking.serviceFeeReplacementParts.filter((p) => p && (p.name || p.price))
    : []

  const warrantyPolicyTerms =
    typeof ws.warrantyPolicyTerms === 'string' && ws.warrantyPolicyTerms.trim()
      ? ws.warrantyPolicyTerms.trim()
      : 'All repair services performed include standard workmanship warranty. Replacement parts are protected against manufacturer defects under normal operating conditions. Warranty is invalidated by physical impact, water intrusion, or unauthorized disassembly.'

  const coveredItems =
    Array.isArray(ws.coveredItems) && ws.coveredItems.length > 0
      ? ws.coveredItems.filter((i) => i && i.enabled !== false && i.active !== false)
      : DEFAULT_COVERED_ITEMS

  const voidConditions =
    Array.isArray(ws.voidConditions) && ws.voidConditions.length > 0
      ? ws.voidConditions.filter((i) => i && i.enabled !== false && i.active !== false)
      : DEFAULT_VOID_CONDITIONS

  const warrantyClaim = booking.warrantyClaim || null
  const hasClaim = Boolean(warrantyClaim && warrantyClaim.status && warrantyClaim.status !== 'none')

  const handlePrint = () => {
    setIsPrinting(true)
    const printContent = certificateRef.current
    if (!printContent) {
      setIsPrinting(false)
      window.print()
      return
    }

    const printWindow = window.open('', '_blank', 'width=850,height=950')
    if (!printWindow) {
      setIsPrinting(false)
      window.print()
      return
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Warranty-Certificate-${certificateNo}</title>
          <meta charset="utf-8" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm;
            }
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background-color: #ffffff;
              color: #0f172a;
            }
          </style>
        </head>
        <body class="p-4 bg-white">
          <div class="max-w-2xl mx-auto">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
    setIsPrinting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[92vh] max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden sm:max-w-xl md:max-w-2xl rounded-none border border-slate-300 bg-white p-0 shadow-2xl"
        showCloseButton
      >
        {/* Top Header Bar */}
        <div className="border-b border-slate-200 bg-slate-50 px-4 sm:px-6 py-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center bg-indigo-600 text-white font-bold text-xs shadow-2xs">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-sm sm:text-base font-black text-slate-900 leading-tight flex items-center gap-2">
                  <span>Official Service Warranty &amp; Guarantee</span>
                  <Badge className="rounded-none bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider hidden sm:inline-flex">
                    {isServiceFinalized ? (isLaborActive || isPartsActive ? 'Active Coverage' : 'Expired') : 'Guaranteed upon Service'}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-500 mt-0.5">
                  Cert #: <span className="font-mono font-bold text-indigo-700">{certificateNo}</span> • Booking Ref: <span className="font-mono font-bold text-slate-700">{receiptNo}</span>
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        {/* Certificate Scrollable Container */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 text-xs sm:text-sm bg-slate-50/40">
          <div
            ref={certificateRef}
            className="bg-white border-2 border-indigo-200 p-4 sm:p-6 space-y-4 rounded-none shadow-xs text-slate-900 relative"
          >
            {/* Top Ornamental Bar */}
            <div
              className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-4 h-2"
              style={{
                backgroundImage: 'repeating-linear-gradient(90deg, #4f46e5 0 32px, #081F5C 32px 64px, #059669 64px 96px)',
              }}
            />

            {/* Header with Logo, Shop & Certificate Badge */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-slate-200">
              <div className="flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center bg-[#081F5C] p-2 text-white">
                  <img src={Elogo} alt="E-Paayos" className="size-full object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base sm:text-lg font-black tracking-tight text-[#081F5C] leading-none">
                      E-Paayos
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Warranty Certificate
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-1">{shopName}</p>
                  <p className="text-[11px] text-slate-500">Official Service Partner &amp; Guarantee Issuer</p>
                </div>
              </div>

              <div className="text-left sm:text-right space-y-0.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none border font-black text-xs uppercase tracking-wider bg-indigo-50 text-indigo-900 border-indigo-300">
                  <Award className="size-3.5 text-indigo-600" />
                  <span>{isLaborActive || isPartsActive ? 'ACTIVE GUARANTEE' : isServiceFinalized ? 'WARRANTY EXPIRED' : 'STANDARD GUARANTEE'}</span>
                </div>
                <p className="text-[11px] font-mono font-bold text-slate-700 pt-1">
                  Cert No: <span className="text-indigo-700">{certificateNo}</span>
                </p>
                <p className="text-[10px] text-slate-500">
                  Issued: {formatDateTime(baseDateObj.toISOString())}
                </p>
              </div>
            </div>

            {/* Customer & Service Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/90 border border-slate-200 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                  Beneficiary / Customer
                </span>
                <p className="font-bold text-slate-900 text-sm">{booking.contactName || 'Customer'}</p>
                {booking.contactPhone && (
                  <p className="text-slate-700 font-mono text-[11px] flex items-center gap-1">
                    <Phone className="size-3 text-slate-400" />
                    <span>{booking.contactPhone}</span>
                  </p>
                )}
                {booking.customer?.email && (
                  <p className="text-slate-600 text-[10px] truncate">{booking.customer.email}</p>
                )}
                <p className="text-slate-600 text-[11px] pt-0.5">
                  <span className="font-semibold text-slate-700">Service Mode: </span>
                  {booking.serviceMode === 'home' ? 'Home Service' : 'In-Shop Service'}
                </p>
                {booking.serviceMode === 'home' && booking.serviceAddress && (
                  <p className="text-slate-600 text-[10px] leading-snug">
                    <span className="font-semibold text-slate-700">Location: </span>
                    {booking.serviceAddress}
                  </p>
                )}
              </div>

              <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                  Serviced Unit &amp; Provider
                </span>
                <div className="flex items-center gap-1.5">
                  <CategoryIcon className="size-3.5 text-indigo-600" />
                  <span className="font-bold text-slate-900 text-xs">{serviceName}</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Category: <span className="font-semibold text-slate-800">{serviceCategory}</span>
                </p>
                {booking.assignedTechnicianName && (
                  <p className="text-[11px] text-slate-700 pt-0.5">
                    <span className="font-semibold text-slate-500">Certified Specialist: </span>
                    <span className="font-bold text-slate-900">{booking.assignedTechnicianName}</span>
                    {booking.assignedTechnicianJobTitle ? ` (${booking.assignedTechnicianJobTitle})` : ''}
                  </p>
                )}
                <p className="text-[10px] text-slate-500 pt-0.5">
                  Booking Ref: <span className="font-mono font-bold text-slate-700">{receiptNo}</span>
                </p>
              </div>
            </div>

            {/* WARRANTY COVERAGE TIERS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-indigo-600" />
                  <span>Warranty Coverage Guarantees</span>
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Coverage Start: {formatDate(baseDateObj.toISOString())}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Labor & Workmanship Warranty Card */}
                <div className="bg-white border-2 border-indigo-200 p-3 space-y-2 rounded-none shadow-2xs">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                    <span className="text-[11px] font-black uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
                      <Wrench className="size-3.5 text-indigo-600" />
                      <span>Labor &amp; Workmanship</span>
                    </span>
                    {laborWarrantyEnabled ? (
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 border ${
                          isLaborActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : isServiceFinalized
                              ? 'bg-slate-100 text-slate-600 border-slate-300'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-300'
                        }`}
                      >
                        {isLaborActive
                          ? `Active • ${laborDaysLeft}d left`
                          : isServiceFinalized
                            ? 'Warranty Expired'
                            : `${laborWarrantyDays} Days Included`}
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200">
                        Not Included
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="font-extrabold text-slate-900 text-sm text-indigo-950">
                      {laborWarrantyEnabled ? `${laborWarrantyDays} Days 100% Free Labor Guarantee` : 'No Labor Warranty'}
                    </p>
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <p>
                        Effective: <strong className="font-mono text-slate-800">{formatDate(baseDateObj.toISOString())}</strong>
                      </p>
                      <p>
                        Expiration:{' '}
                        <strong className="font-mono font-bold text-indigo-700">
                          {formatDate(laborExpiryDate.toISOString())}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="p-2 bg-indigo-50/60 border border-indigo-100 text-[10.5px] text-indigo-950 leading-relaxed">
                    <strong>Coverage: </strong>
                    Covers 100% free rework labor if the initial defect recurs from the serviced repair scope. Zero diagnostic and labor charges upon re-service.
                  </div>
                </div>

                {/* 2. Parts & Components Warranty Card */}
                <div className="bg-white border-2 border-emerald-200 p-3 space-y-2 rounded-none shadow-2xs">
                  <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                    <span className="text-[11px] font-black uppercase tracking-wide text-slate-900 flex items-center gap-1.5">
                      <Tag className="size-3.5 text-emerald-600" />
                      <span>Parts &amp; Components</span>
                    </span>
                    {partsWarrantyEnabled ? (
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 border ${
                          isPartsActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : isServiceFinalized
                              ? 'bg-slate-100 text-slate-600 border-slate-300'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {isPartsActive
                          ? `Active • ${partsDaysLeft}d left`
                          : isServiceFinalized
                            ? 'Warranty Expired'
                            : `${partsWarrantyDays} Days Included`}
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200">
                        Not Included
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="font-extrabold text-slate-900 text-sm text-emerald-950">
                      {partsWarrantyEnabled ? `${partsWarrantyDays} Days Component Protection` : 'No Parts Warranty'}
                    </p>
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <p>
                        Effective: <strong className="font-mono text-slate-800">{formatDate(baseDateObj.toISOString())}</strong>
                      </p>
                      <p>
                        Expiration:{' '}
                        <strong className="font-mono font-bold text-emerald-700">
                          {formatDate(partsExpiryDate.toISOString())}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="p-2 bg-emerald-50/60 border border-emerald-100 text-[10.5px] text-emerald-950 leading-relaxed">
                    <strong>Coverage: </strong>
                    Protects installed replacement components against premature failure and manufacturer defects under normal operating conditions.
                  </div>
                </div>
              </div>
            </div>

            {/* Replacement Parts Covered Table (If Any) */}
            {replacementParts.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 block">
                  Replaced Components Covered Under This Certificate
                </span>
                <div className="border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold text-[10px] uppercase">
                      <tr>
                        <th className="py-1.5 px-3">Component / Material</th>
                        <th className="py-1.5 px-3">Warranty Term</th>
                        <th className="py-1.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {replacementParts.map((part, index) => (
                        <tr key={index} className="bg-white">
                          <td className="py-2 px-3 font-bold text-slate-800">
                            {part.name}
                          </td>
                          <td className="py-2 px-3 text-slate-600 text-[11px]">
                            {partsWarrantyDays} Days Protection
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className="inline-flex items-center px-1.5 py-0.2 text-[9px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {isPartsActive ? 'Covered' : isServiceFinalized ? 'Expired' : 'Eligible'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Terms, Inclusions & Void Conditions */}
            <div className="bg-white border border-slate-200 p-3.5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Covered */}
                <div className="space-y-1.5">
                  <span className="font-extrabold text-emerald-950 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    <span>Covered Under Warranty</span>
                  </span>
                  <ul className="space-y-1 text-[11px] text-slate-700 pl-4 list-disc">
                    {coveredItems.map((item, idx) => (
                      <li key={idx}>{item.text || item}</li>
                    ))}
                  </ul>
                </div>

                {/* Void Conditions */}
                <div className="space-y-1.5">
                  <span className="font-extrabold text-rose-950 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                    <AlertTriangle className="size-3.5 text-rose-600" />
                    <span>Warranty Voiding Conditions</span>
                  </span>
                  <ul className="space-y-1 text-[11px] text-slate-700 pl-4 list-disc">
                    {voidConditions.map((item, idx) => (
                      <li key={idx}>{item.text || item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {warrantyPolicyTerms && (
                <div className="border-t border-slate-200 pt-2 text-[10.5px] text-slate-600 italic">
                  <strong className="not-italic font-bold text-slate-800">Provider Policy Statement: </strong>
                  &ldquo;{warrantyPolicyTerms}&rdquo;
                </div>
              )}
            </div>

            {/* How to Claim Procedure Box */}
            <div className="p-3 bg-indigo-50/50 border border-indigo-200 text-xs space-y-1.5">
              <span className="font-extrabold text-indigo-950 uppercase tracking-wide text-[10.5px] flex items-center gap-1.5">
                <FileCheck className="size-3.5 text-indigo-600" />
                <span>Warranty Claim &amp; Rework Procedure</span>
              </span>
              <p className="text-[11px] text-slate-700 leading-snug">
                If the serviced unit experiences recurring issues within the warranty period, present this certificate or reference number <strong className="font-mono text-indigo-800">{receiptNo}</strong> to your service provider or submit a claim directly through the E-Paayos customer portal.
              </p>
            </div>

            {/* Official Platform Stamp & Verification Footer */}
            <div className="pt-3 border-t-2 border-dashed border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="space-y-0.5">
                <p className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                  E-Paayos Platform Guarantee Verified
                </p>
                <p className="text-[10px] text-slate-500">
                  Certified Electronic Warranty Certificate • Reference: <span className="font-mono font-bold text-slate-700">{certificateNo}</span>
                </p>
              </div>

              <div className="px-3 py-1 bg-slate-100 border border-slate-300 text-[10px] font-mono text-slate-600 font-bold shrink-0">
                VERIFIED DOCUMENT
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer Actions */}
        <DialogFooter className="m-0 mx-0 mb-0 border-t border-slate-200 bg-slate-50 px-4 sm:px-6 py-3.5 sm:py-4 pb-4 sm:pb-4.5 shrink-0 flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-between items-center w-full">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Cert Ref: <span className="font-mono font-semibold">{certificateNo}</span>
          </p>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto rounded-none border-slate-300 text-xs font-bold px-4 py-2 cursor-pointer"
            >
              Close
            </Button>

            {onClaimWarranty && (isLaborActive || isPartsActive) && !hasClaim && (
              <Button
                type="button"
                onClick={onClaimWarranty}
                className="w-full sm:w-auto rounded-none border border-indigo-600 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-bold px-4 py-2 cursor-pointer gap-1.5"
              >
                <RotateCcw className="size-3.5 text-indigo-700" />
                <span>Refix / Re-repair</span>
              </Button>
            )}

            <Button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="w-full sm:w-auto rounded-none bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 shadow-md shadow-indigo-900/20 cursor-pointer gap-1.5"
            >
              <Printer className="size-3.5" />
              <span>{isPrinting ? 'Printing...' : 'Print / Download Certificate'}</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
