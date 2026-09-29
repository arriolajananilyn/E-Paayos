import { useEffect, useMemo, useRef, useState } from 'react'
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
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Eye,
  FileCheck,
  FileText,
  Home,
  Image as ImageIcon,
  Info,
  MapPin,
  Maximize2,
  Phone,
  Printer,
  Receipt,
  RotateCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Store,
  Tag,
  User,
  WashingMachine,
  Wrench,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import Elogo from '../../assets/Elogo.png'

function formatPhp(amount) {
  const n = Number(amount || 0)
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(n)
  } catch {
    return `₱${Math.round(n).toLocaleString('en-PH')}`
  }
}

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

function formatTime12h(hm) {
  const s = String(hm ?? '').trim()
  if (!/^([01]?\d|2[0-3]):([0-5]\d)$/.test(s)) return s || '—'
  const [hStr, mStr] = s.split(':')
  let h = parseInt(hStr, 10)
  const m = mStr
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12
  if (h === 0) h = 12
  return `${h}:${m} ${ampm}`
}

function categoryIcon(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return Bike
  if (normalized === 'gadget') return Smartphone
  if (normalized === 'appliance') return WashingMachine
  return Wrench
}

function resolvePhotoSrc(src) {
  const value = String(src ?? '').trim()
  if (!value) return ''
  if (/^(data:|blob:)/i.test(value)) return value
  const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'
  if (value.startsWith('/uploads/')) return `${API_URL}${value}`
  return value
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

export function ServiceReceiptDialog({ open, onOpenChange, booking }) {
  const receiptRef = useRef(null)
  const [activeTab, setActiveTab] = useState('slip') // 'slip' | 'invoice'
  const [isPrinting, setIsPrinting] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const [rotation, setRotation] = useState(0)

  const proofSlipSrc = resolvePhotoSrc(booking?.paymentProofImage)

  // Default to slip if payment proof exists, otherwise invoice
  useEffect(() => {
    if (open) {
      setIsZoomed(false)
      setRotation(0)
      if (proofSlipSrc) {
        setActiveTab('slip')
      } else {
        setActiveTab('invoice')
      }
    }
  }, [open, proofSlipSrc])

  if (!booking) return null

  const laborAmount = Number(booking.serviceFeeLaborRateAtCalc || 0)
  const materialsAmount = Number(booking.serviceFeeMaterialsAmount || 0)
  const replacementParts = Array.isArray(booking.serviceFeeReplacementParts)
    ? booking.serviceFeeReplacementParts.filter((p) => p && (p.name || p.price))
    : []
  const totalAmount = laborAmount + materialsAmount

  const isPaid = String(booking.paymentStatus || '').toLowerCase() === 'paid'
  const paymentMethodLabel = (() => {
    const method = String(booking.paymentMethod || '').toLowerCase()
    if (method === 'cash_on_service') return 'Cash on Service'
    if (method === 'gcash') return 'GCash e-Wallet'
    if (method === 'maya') return 'Maya e-Wallet'
    if (method === 'bank_transfer') return 'Bank Transfer'
    if (method) return method.toUpperCase()
    return isPaid ? 'Settled (E-Payment)' : 'Pending Payment'
  })()

  const serviceCategory = booking.shopService?.category || booking.serviceCategory || 'Service'
  const CategoryIcon = categoryIcon(serviceCategory)
  const serviceName = booking.shopService?.name || booking.serviceName || 'Professional Repair Service'
  const shopName = booking.shopName || booking.shopOwner?.shopName || 'E-Paayos Certified Service Center'
  const receiptNo = booking.ref || `BK-${String(booking.id || '').slice(-8).toUpperCase()}`
  const receiptDate = booking.paidAt || booking.completedAt || booking.fixedAt || booking.updatedAt || booking.createdAt

  // Warranty calculations from Shop Owner settings
  const ws = booking.warrantySettings || booking.shopOwner?.warrantySettings || {}
  const laborWarrantyEnabled = ws.laborWarrantyEnabled !== false
  const laborWarrantyDays = Number.isFinite(Number(ws.laborWarrantyDays)) ? Number(ws.laborWarrantyDays) : 30
  const partsWarrantyEnabled = ws.partsWarrantyEnabled !== false
  const partsWarrantyDays = Number.isFinite(Number(ws.partsWarrantyDays)) ? Number(ws.partsWarrantyDays) : 30

  const baseDateObj = (() => {
    const raw = booking.completedAt || booking.paidAt || booking.fixedAt || booking.updatedAt || booking.createdAt
    const d = raw ? new Date(raw) : new Date()
    return Number.isNaN(d.getTime()) ? new Date() : d
  })()

  const laborExpiryDate = new Date(baseDateObj.getTime() + laborWarrantyDays * 24 * 60 * 60 * 1000)
  const partsExpiryDate = new Date(baseDateObj.getTime() + partsWarrantyDays * 24 * 60 * 60 * 1000)
  const nowMs = Date.now()

  const isLaborActive = laborWarrantyEnabled && laborExpiryDate.getTime() >= nowMs
  const isPartsActive = partsWarrantyEnabled && partsExpiryDate.getTime() >= nowMs

  const laborDaysLeft = isLaborActive
    ? Math.max(0, Math.ceil((laborExpiryDate.getTime() - nowMs) / (1000 * 60 * 60 * 24)))
    : 0
  const partsDaysLeft = isPartsActive
    ? Math.max(0, Math.ceil((partsExpiryDate.getTime() - nowMs) / (1000 * 60 * 60 * 24)))
    : 0

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

  const handleDownloadProofImage = async () => {
    if (!proofSlipSrc) return
    try {
      const res = await fetch(proofSlipSrc)
      const blob = await res.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `Receipt-${receiptNo}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      const a = document.createElement('a')
      a.href = proofSlipSrc
      a.download = `Receipt-${receiptNo}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const handlePrint = () => {
    setIsPrinting(true)
    const printContent = receiptRef.current
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
          <title>Receipt-${receiptNo}</title>
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
        {/* Top Header Bar with Tab Navigation */}
        <div className="border-b border-slate-200 bg-slate-50 px-4 sm:px-6 pt-3 pb-2 shrink-0">
          <div className="flex items-center justify-between pb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center bg-indigo-600 text-white font-bold text-xs">
                <Receipt className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                  Payment Receipt &amp; Proof
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-500 mt-0.5">
                  Ref: <span className="font-mono font-bold text-indigo-700">{receiptNo}</span> • Customer: <span className="font-bold text-slate-800">{booking.contactName || 'Customer'}</span>
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 border-t border-slate-200/80 pt-2">
            {proofSlipSrc ? (
              <button
                type="button"
                onClick={() => setActiveTab('slip')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer border-b-2 ${
                  activeTab === 'slip'
                    ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ImageIcon className="size-3.5 text-indigo-600" />
                <span>Customer Uploaded E-Receipt / Slip</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setActiveTab('invoice')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer border-b-2 ${
                activeTab === 'invoice'
                  ? 'border-indigo-600 text-indigo-700 bg-white shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="size-3.5 text-indigo-600" />
              <span>Official E-Receipt &amp; Breakdown</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Customer Uploaded E-Receipt Slip View */}
        {activeTab === 'slip' && proofSlipSrc ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 text-xs sm:text-sm bg-slate-50/50">
            {/* Payment Summary Overview Card */}
            <div className="bg-white border border-slate-200 p-3 sm:p-3.5 space-y-2 rounded-none shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-none border font-black text-xs uppercase bg-emerald-50 text-emerald-800 border-emerald-300">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    <span>{isPaid ? 'Customer Payment Settled' : 'Payment Submitted'}</span>
                  </span>
                  <Badge className="rounded-none bg-indigo-600 text-white font-bold text-[10px]">
                    {paymentMethodLabel}
                  </Badge>
                </div>

                <span className="text-[11px] text-slate-500">
                  {formatDateTime(receiptDate)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Total Amount Paid</span>
                  <p className="font-black text-slate-900 text-sm sm:text-base text-indigo-700 font-mono">
                    {formatPhp(totalAmount)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Customer</span>
                  <p className="font-bold text-slate-800 truncate">{booking.contactName || '—'}</p>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Service Rendered</span>
                  <p className="font-bold text-slate-800 truncate">{serviceName}</p>
                </div>
              </div>
            </div>

            {/* Receipt Image Preview Container */}
            <div className="bg-white border border-slate-200 p-3 rounded-none space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="size-4 text-indigo-600" />
                  <span>Customer E-Payment Slip / GCash Receipt</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                    title="Rotate image"
                  >
                    <RotateCw className="size-3" />
                    <span>Rotate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsZoomed((prev) => !prev)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                    title="Zoom in/out"
                  >
                    {isZoomed ? <ZoomOut className="size-3" /> : <ZoomIn className="size-3" />}
                    <span>{isZoomed ? 'Fit' : 'Zoom'}</span>
                  </button>
                </div>
              </div>

              {/* Image Frame */}
              <div className="relative flex items-center justify-center bg-slate-900/5 border border-slate-200 min-h-[260px] max-h-[460px] overflow-auto p-2">
                <img
                  src={proofSlipSrc}
                  alt="Customer Payment Receipt"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease-in-out',
                  }}
                  className={`object-contain rounded-none shadow-md transition-all ${
                    isZoomed ? 'w-auto max-w-none max-h-none' : 'w-full max-h-[420px]'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-slate-500">
                  Uploaded by customer during checkout / payment completion.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleDownloadProofImage}
                  className="rounded-none bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-7.5 px-3 gap-1.5 cursor-pointer"
                >
                  <Download className="size-3" />
                  <span>Download Receipt Image</span>
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Tab 2: Itemized Official E-Receipt & Printable Invoice */}
        {(activeTab === 'invoice' || !proofSlipSrc) && (
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 text-xs sm:text-sm">
            <div
              ref={receiptRef}
              className="bg-white border border-slate-200 p-4 sm:p-6 space-y-4 rounded-none shadow-xs text-slate-900"
            >
              {/* Header with Elogo, Shop Branding & Official Stamp */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b-2 border-dashed border-slate-200">
                <div className="flex items-start gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center bg-[#081F5C] p-2 text-white">
                    <img src={Elogo} alt="E-Paayos" className="size-full object-contain" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base sm:text-lg font-black tracking-tight text-[#081F5C] leading-none">
                        E-Paayos
                      </span>
                      <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 bg-indigo-100 text-indigo-900 border border-indigo-200">
                        Official Receipt
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 mt-1">{shopName}</p>
                    <p className="text-[11px] text-slate-500">Service Repair &amp; Maintenance Network</p>
                  </div>
                </div>

                <div className="text-left sm:text-right space-y-0.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none border font-black text-xs uppercase tracking-wider bg-emerald-50 text-emerald-800 border-emerald-300">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    <span>{isPaid ? 'PAID &amp; SETTLED' : 'OFFICIAL INVOICE'}</span>
                  </div>
                  <p className="text-[11px] font-mono font-bold text-slate-700 pt-1">
                    Receipt #: <span className="text-indigo-700">{receiptNo}</span>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Issued: {formatDateTime(receiptDate)}
                  </p>
                </div>
              </div>

              {/* Customer & Job Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/90 border border-slate-200 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                    Customer / Billed To
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
                    Service &amp; Assigned Staff
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
                      <span className="font-semibold text-slate-500">Handled by: </span>
                      <span className="font-bold text-slate-900">{booking.assignedTechnicianName}</span>
                      {booking.assignedTechnicianJobTitle ? ` (${booking.assignedTechnicianJobTitle})` : ''}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-500 pt-0.5">
                    Schedule: {formatDate(booking.preferredDate)} • {formatTime12h(booking.preferredTime)}
                  </p>
                </div>
              </div>

              {/* Itemized Charges Table */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                  Itemized Service Charges &amp; Materials
                </span>
                <div className="border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-extrabold text-[11px] uppercase">
                      <tr>
                        <th className="py-2 px-3">Description</th>
                        <th className="py-2 px-3 text-right">Amount (PHP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Labor Rate */}
                      <tr>
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900">Professional Labor Fee / Service Charge</p>
                          <p className="text-[10px] text-slate-500">Diagnostic, repair execution &amp; testing service</p>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                          {formatPhp(laborAmount)}
                        </td>
                      </tr>

                      {/* Replacement Parts */}
                      {replacementParts.map((part, index) => (
                        <tr key={index} className="bg-slate-50/50">
                          <td className="py-2 px-3 pl-5">
                            <p className="font-semibold text-slate-800 text-[11px] flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-indigo-500 shrink-0" />
                              <span>{part.name}</span>
                            </p>
                            <p className="text-[9px] text-slate-400 pl-3">Replacement Part / Material</p>
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-800 font-mono text-[11px]">
                            {formatPhp(part.price)}
                          </td>
                        </tr>
                      ))}

                      {materialsAmount > 0 && replacementParts.length === 0 && (
                        <tr className="bg-slate-50/50">
                          <td className="py-2 px-3 pl-5">
                            <p className="font-semibold text-slate-800 text-[11px]">
                              {booking.serviceFeeMaterialsDescription || 'Materials, Consumables & Parts'}
                            </p>
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-800 font-mono text-[11px]">
                            {formatPhp(materialsAmount)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                      <tr>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">Subtotal (Labor &amp; Parts)</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-800">{formatPhp(totalAmount)}</td>
                      </tr>
                      <tr className="border-t border-slate-200 bg-indigo-50/60">
                        <td className="py-2.5 px-3 text-sm font-black text-slate-900">Total Amount Paid</td>
                        <td className="py-2.5 px-3 text-right text-base font-black text-indigo-800 font-mono">
                          {formatPhp(totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Payment Settlement Info */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 border border-emerald-200 bg-emerald-50/70 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 block">
                    Payment Method &amp; Status
                  </span>
                  <p className="font-bold text-emerald-950 text-xs sm:text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                    <span>{paymentMethodLabel}</span>
                  </p>
                </div>
                <div className="text-right text-[11px] text-emerald-900">
                  <span className="font-bold">Date Settled: </span>
                  <span>{formatDate(receiptDate)}</span>
                </div>
              </div>

              {/* Warranty & Guarantee Certificate Section (From Shop Settings) */}
              <div className="border border-indigo-200 bg-indigo-50/40 p-3.5 space-y-3 rounded-none">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex size-6 items-center justify-center bg-indigo-600 text-white rounded-none">
                      <ShieldCheck className="size-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Service Warranty &amp; Guarantee Certificate
                      </h4>
                      <p className="text-[10px] text-slate-600">
                        Official warranty validity based on provider policies under E-Paayos Guarantee
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-indigo-900 bg-indigo-100 px-2 py-0.5 border border-indigo-300">
                    Coverage Start: {formatDate(baseDateObj.toISOString())}
                  </span>
                </div>

                {/* Warranty Status Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Labor Warranty */}
                  <div className="bg-white border border-slate-200 p-2.5 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 flex items-center gap-1">
                        <Wrench className="size-3 text-indigo-600" />
                        <span>Labor / Workmanship</span>
                      </span>
                      {laborWarrantyEnabled ? (
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.5 border ${
                            isLaborActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          {isLaborActive ? `Active • ${laborDaysLeft}d left` : 'Warranty Expired'}
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200">
                          Not Included
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5 text-xs">
                      <p className="font-bold text-slate-900">
                        {laborWarrantyEnabled ? `${laborWarrantyDays} Days Free Labor Guarantee` : 'No Labor Warranty'}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        {laborWarrantyEnabled ? (
                          <>
                            Expiration Date:{' '}
                            <strong className="font-mono font-bold text-indigo-800">
                              {formatDate(laborExpiryDate.toISOString())}
                            </strong>
                          </>
                        ) : (
                          'Standard service terms apply'
                        )}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-500 border-t border-slate-100 pt-1">
                      Covers 100% free rework labor if initial repair defect persists within the warranty window.
                    </p>
                  </div>

                  {/* Parts Warranty */}
                  <div className="bg-white border border-slate-200 p-2.5 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-600 flex items-center gap-1">
                        <Tag className="size-3 text-indigo-600" />
                        <span>Parts &amp; Components</span>
                      </span>
                      {partsWarrantyEnabled ? (
                        <span
                          className={`text-[9px] font-black uppercase px-1.5 py-0.5 border ${
                            isPartsActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}
                        >
                          {isPartsActive ? `Active • ${partsDaysLeft}d left` : 'Warranty Expired'}
                        </span>
                      ) : (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200">
                          Not Included
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5 text-xs">
                      <p className="font-bold text-slate-900">
                        {partsWarrantyEnabled ? `${partsWarrantyDays} Days Component Protection` : 'No Parts Warranty'}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        {partsWarrantyEnabled ? (
                          <>
                            Expiration Date:{' '}
                            <strong className="font-mono font-bold text-indigo-800">
                              {formatDate(partsExpiryDate.toISOString())}
                            </strong>
                          </>
                        ) : (
                          'Third-party part terms apply'
                        )}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-500 border-t border-slate-100 pt-1">
                      Protects replaced parts against manufacturer defects under normal operating conditions.
                    </p>
                  </div>
                </div>

                {/* Warranty Coverage Terms & Conditions Details */}
                <div className="bg-white/90 border border-indigo-100 p-2.5 space-y-2 text-[11px]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="font-bold text-emerald-900 flex items-center gap-1 text-[10px] uppercase">
                        <CheckCircle2 className="size-3 text-emerald-600" />
                        <span>Covered Under Warranty</span>
                      </span>
                      <ul className="mt-1 space-y-0.5 text-[10px] text-slate-600 pl-4 list-disc">
                        {coveredItems.slice(0, 4).map((item, idx) => (
                          <li key={idx}>{item.text || item}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="font-bold text-rose-900 flex items-center gap-1 text-[10px] uppercase">
                        <AlertTriangle className="size-3 text-rose-600" />
                        <span>Void Conditions</span>
                      </span>
                      <ul className="mt-1 space-y-0.5 text-[10px] text-slate-600 pl-4 list-disc">
                        {voidConditions.slice(0, 4).map((item, idx) => (
                          <li key={idx}>{item.text || item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {warrantyPolicyTerms && (
                    <div className="border-t border-indigo-100/80 pt-1.5">
                      <p className="text-[10px] text-slate-600 italic">
                        <strong className="not-italic font-bold text-slate-700">Policy Note: </strong>
                        &ldquo;{warrantyPolicyTerms}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Terms */}
              <div className="pt-2 border-t border-slate-200 text-center text-[10px] text-slate-500 space-y-0.5">
                <p className="font-semibold text-slate-600">
                  Thank you for choosing {shopName} through the E-Paayos platform.
                </p>
                <p>
                  This electronic receipt serves as official proof of service payment. Reference number: <span className="font-mono font-bold text-slate-700">{receiptNo}</span>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Bottom Footer Actions */}
        <DialogFooter className="border-t border-slate-200 bg-slate-50 px-4 sm:px-6 py-3 shrink-0 flex flex-col-reverse sm:flex-row gap-2 sm:justify-between items-center w-full">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            Ref: <span className="font-mono font-semibold">{receiptNo}</span>
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto rounded-none border-slate-300 text-xs font-bold px-4 py-2 cursor-pointer"
            >
              Close
            </Button>
            {activeTab === 'slip' && proofSlipSrc ? (
              <Button
                type="button"
                onClick={handleDownloadProofImage}
                className="w-full sm:w-auto rounded-none bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 shadow-md shadow-indigo-900/20 cursor-pointer gap-1.5"
              >
                <Download className="size-3.5" />
                <span>Download Image</span>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handlePrint}
                className="w-full sm:w-auto rounded-none bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 shadow-md shadow-indigo-900/20 cursor-pointer gap-1.5"
              >
                <Printer className="size-3.5" />
                <span>Print / Download PDF</span>
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

