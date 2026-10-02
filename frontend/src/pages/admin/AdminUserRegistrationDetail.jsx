import ImageWithFallback from '@/components/ImageWithFallback'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buildAdminFileUrl, isLikelyImageFilename, uploadsBasename } from '@/lib/adminUploads'
import { resolveProfilePsgcLabels } from '@/lib/psgcResolve'
import {
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  GraduationCap,
  HardHat,
  Info,
  Mail,
  MapPin,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Phone,
  RotateCcw,
  RotateCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  Wrench,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const ROLE_LABELS = {
  customer: 'Customer',
  'shop-owner': 'Shop Owner',
  'oncall-mechanic-technician': 'On-call Mechanic / Technician',
  'mechanic-technician': 'Mechanic / Technician',
}

const GENDER_LABELS = {
  male: 'Male',
  female: 'Female',
  'prefer-not': 'Prefer not to say',
}

const CIVIL_LABELS = {
  single: 'Single',
  married: 'Married',
  widowed: 'Widowed',
  separated: 'Separated',
}

const EMPLOYMENT_CAT_LABELS = {
  employed: 'Employed',
  unemployed: 'Unemployed',
}

function formatDate(value) {
  if (value == null || value === '') return '—'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d)
  } catch {
    return String(value)
  }
}

function formatList(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '—'
  return arr.map((x) => String(x)).join(', ')
}

function scalar(value) {
  if (value == null || value === '') return '—'
  return String(value)
}

function formatGeoLine(geoLabels, profile, keys) {
  if (geoLabels === null) return '…'
  const parts = []
  for (const key of keys) {
    const resolved = geoLabels?.[key]
    let v =
      resolved !== undefined && resolved !== ''
        ? resolved
        : profile[key] != null && profile[key] !== ''
          ? String(profile[key]).trim()
          : ''
    if (v && v !== '—') parts.push(v)
  }
  return parts.length ? parts.join(', ') : '—'
}

function calculateAge(birthdate) {
  if (!birthdate) return null
  const birth = new Date(birthdate)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function formatIdTypeLabel(idType) {
  if (!idType) return 'Valid ID'
  return String(idType)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatEmployer(emp) {
  if (!emp || typeof emp !== 'object') return '—'
  const shop = emp.shopName ? String(emp.shopName).trim() : ''
  const name = emp.fullName ? String(emp.fullName).trim() : ''
  const mail = emp.email ? String(emp.email).trim() : ''
  const line = [shop, name].filter(Boolean).join(' — ')
  if (line && mail) return `${line} (${mail})`
  if (line) return line
  if (mail) return mail
  return '—'
}

/** Form Section Card styled in pristine Light Mode */
function FormSection({ stepNumber, title, icon: Icon, badge, children }) {
  return (
    <div className="overflow-hidden rounded-none border border-slate-200 bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-slate-100/80 to-slate-50 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          {stepNumber != null && (
            <span className="flex size-5.5 items-center justify-center rounded-none bg-[#081F5C] text-[10px] font-black text-white">
              {stepNumber}
            </span>
          )}
          {Icon && <Icon className="size-4 text-[#081F5C]" />}
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            {title}
          </h3>
        </div>
        {badge && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-200/90 text-slate-700 border border-slate-300/80">
            {badge}
          </span>
        )}
      </div>
      <div className="p-4 space-y-3 divide-y divide-slate-100 bg-white">{children}</div>
    </div>
  )
}

/** Form Field Row in crisp Light Mode */
function FormField({ label, value, copyable = false, highlight = false }) {
  const [copied, setCopied] = useState(false)
  const valText = value == null || value === '' ? '—' : String(value)
  const isPresent = valText !== '—'

  const handleCopy = () => {
    if (!isPresent) return
    navigator.clipboard?.writeText(valText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(11rem,14rem)_1fr] gap-x-4 gap-y-1 text-xs sm:text-sm pt-2.5 first:pt-0 sm:items-baseline">
      <span className="font-semibold text-slate-600 text-xs flex items-center gap-1.5">
        <span>{label}:</span>
      </span>
      <div className="flex items-baseline justify-between gap-2 min-w-0">
        <span
          className={`font-medium break-words whitespace-pre-wrap ${
            highlight ? 'font-bold text-[#081F5C]' : 'text-slate-900'
          }`}
        >
          {valText}
        </span>
        {copyable && isPresent && (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shrink-0"
            title="Copy value"
          >
            {copied ? (
              <>
                <Check className="size-2.5 text-emerald-600" />
                <span className="text-emerald-600 font-bold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-2.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

/** Document Card with Interactive Full Screen Button & Click to Expand in Light Mode */
function DocumentCard({
  id,
  title,
  subtitle,
  storedPath,
  dataUrl,
  apiBaseUrl,
  onViewFullscreen,
}) {
  const name = uploadsBasename(storedPath) || (dataUrl ? 'Uploaded document' : '')
  const url = dataUrl || buildAdminFileUrl(storedPath, apiBaseUrl)
  const isImage =
    (typeof dataUrl === 'string' && /^data:image\//i.test(dataUrl)) ||
    (!dataUrl && Boolean(name) && isLikelyImageFilename(name))

  const handleOpenFullscreen = () => {
    if (!url) return
    onViewFullscreen?.({
      id,
      title,
      subtitle,
      url,
      isImage,
      name,
    })
  }

  return (
    <div className="group overflow-hidden rounded-none border border-slate-200 bg-white shadow-xs transition-all hover:border-slate-300 hover:shadow-md">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="min-w-0 flex-1 pr-2">
          <div className="text-xs font-bold text-slate-800 truncate">{title}</div>
          {subtitle && (
            <div className="text-[10px] text-slate-500 truncate">{subtitle}</div>
          )}
        </div>
        {url && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenFullscreen}
              className="h-6.5 px-2 text-[10px] font-bold rounded-none border-blue-200 bg-blue-50 text-[#081F5C] hover:bg-blue-100"
            >
              <Maximize2 className="size-3 mr-1" />
              <span>Full Screen</span>
            </Button>
          </div>
        )}
      </div>

      <div className="relative p-2.5 bg-slate-50/80 flex items-center justify-center min-h-[170px]">
        {!url ? (
          <div className="flex h-44 w-full flex-col items-center justify-center gap-1.5 rounded-none bg-slate-100 text-xs text-slate-400">
            <FileText className="size-6 text-slate-300" />
            <span className="font-semibold text-slate-500">No file uploaded</span>
          </div>
        ) : isImage ? (
          <button
            type="button"
            onClick={handleOpenFullscreen}
            className="group/img relative block h-44 w-full overflow-hidden border border-slate-200 bg-white text-left focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            title="Click to view full screen"
          >
            <ImageWithFallback
              src={url}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-slate-900/40 transition-all flex flex-col items-center justify-center gap-1.5 text-white">
              <div className="flex size-9 items-center justify-center rounded-none bg-slate-900/80 backdrop-blur-xs text-white opacity-0 group-hover/img:opacity-100 transition-opacity border border-white/30">
                <Maximize2 className="size-4.5" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider opacity-0 group-hover/img:opacity-100 transition-opacity drop-shadow">
                Click for Full Screen
              </span>
            </div>
          </button>
        ) : (
          <div className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-none bg-white p-3 border border-slate-200">
            <FileText className="size-8 text-[#1447a6]" aria-hidden />
            <span className="max-w-full truncate text-center text-xs font-semibold text-slate-700">
              {name || 'Attached Document File'}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenFullscreen}
                className="h-7 text-xs font-bold rounded-none border-blue-300 text-[#081F5C] hover:bg-blue-50"
              >
                <Maximize2 className="size-3.5 mr-1" />
                <span>Full View</span>
              </Button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline"
              >
                <span>New tab</span>
                <ExternalLink className="size-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Fullscreen Document Viewer Modal in Crisp Light Mode */
function FullscreenDocumentViewer({
  doc,
  allDocs = [],
  profile,
  geoLabels,
  onClose,
  onSelectDoc,
  onApprove,
  onReject,
}) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isFormOpen, setIsFormOpen] = useState(true)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0 })

  // Reset transform when changing document
  useEffect(() => {
    setZoom(1)
    setRotation(0)
    setPan({ x: 0, y: 0 })
  }, [doc?.url])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      } else if (e.key === '+' || e.key === '=') {
        setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))
      } else if (e.key === '-' || e.key === '_') {
        setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))
      } else if (e.key === '0') {
        setZoom(1)
        setRotation(0)
        setPan({ x: 0, y: 0 })
      } else if (e.key === 'r' || e.key === 'R') {
        setRotation((r) => (r + 90) % 360)
      } else if (e.key === 'ArrowRight') {
        if (allDocs.length > 1) {
          const idx = allDocs.findIndex((d) => d.id === doc?.id)
          const next = allDocs[(idx + 1) % allDocs.length]
          if (next) onSelectDoc?.(next)
        }
      } else if (e.key === 'ArrowLeft') {
        if (allDocs.length > 1) {
          const idx = allDocs.findIndex((d) => d.id === doc?.id)
          const prev = allDocs[(idx - 1 + allDocs.length) % allDocs.length]
          if (prev) onSelectDoc?.(prev)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [allDocs, doc?.id, onClose, onSelectDoc])

  const handleMouseDown = (e) => {
    if (zoom <= 1) return
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  const handleMouseMove = (e) => {
    if (!isDragging || zoom <= 1) return
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  if (!doc) return null

  const isPending = profile?.accountApprovalStatus === 'pending'
  const isRejected = profile?.accountApprovalStatus === 'rejected'

  const GEO_PRESENT = ['region', 'province', 'cityMunicipality', 'barangay']
  const GEO_SHOP = ['shopRegion', 'shopProvince', 'shopCityMunicipality', 'shopBarangay']
  const presentAddressLine = formatGeoLine(geoLabels, profile, GEO_PRESENT)
  const shopLocationLine = formatGeoLine(geoLabels, profile, GEO_SHOP)
  const age = calculateAge(profile?.birthdate)
  const phoneDisplay = [profile?.phoneCode, profile?.phoneNumber].filter(Boolean).join(' ').trim() || '—'

  return (
    <div
      className="fixed inset-0 z-[99999] flex flex-col bg-slate-900/60 backdrop-blur-md select-none animate-in fade-in duration-200"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Top Header Bar in Navy Gradient */}
      <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] px-4 py-3 shrink-0 text-white shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-8 items-center justify-center bg-white/20 text-white font-bold text-xs border border-white/30 shrink-0">
            <Maximize2 className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white truncate">{doc.title}</h2>
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-white/20 text-blue-100 border border-white/30 shrink-0">
                {doc.subtitle || 'Document Preview'}
              </span>
            </div>
            <p className="text-[11px] text-blue-100/85 truncate">
              {profile?.fullName} • {ROLE_LABELS[profile?.role] || profile?.role}
            </p>
          </div>
        </div>

        {/* Document Switcher Tabs in Header */}
        {allDocs.length > 1 && (
          <div className="hidden md:flex items-center gap-1.5 bg-black/25 p-1 border border-white/20">
            {allDocs.map((d, idx) => {
              const active = d.id === doc.id
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onSelectDoc?.(d)}
                  className={`px-2.5 py-1 text-xs font-bold transition-colors ${
                    active
                      ? 'bg-white text-[#081F5C] shadow-xs'
                      : 'text-blue-100 hover:text-white hover:bg-white/15'
                  }`}
                >
                  <span>
                    {idx + 1}. {d.title}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsFormOpen((prev) => !prev)}
            className={`h-8 px-2.5 text-xs font-bold rounded-none border ${
              isFormOpen
                ? 'bg-white text-[#081F5C] border-white'
                : 'border-white/30 text-white hover:bg-white/15'
            }`}
            title="Toggle Registration Form Details"
          >
            {isFormOpen ? <PanelRightClose className="size-4 mr-1" /> : <PanelRightOpen className="size-4 mr-1" />}
            <span className="hidden sm:inline">{isFormOpen ? 'Hide Form' : 'Show Form'}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="size-8 text-white rounded-none hover:bg-rose-600 hover:text-white transition-colors"
            title="Close Full Screen (Esc)"
          >
            <X className="size-5" />
          </Button>
        </div>
      </div>

      {/* Main Content Area (Split View: Light Viewport + Light Form Panel) */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left/Center: Clean Light Viewport Canvas */}
        <div
          className="flex-1 min-h-0 relative flex flex-col items-center justify-center overflow-hidden bg-slate-200/90 p-3 sm:p-6"
          onMouseDown={handleMouseDown}
          style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          {doc.isImage ? (
            <div
              className="transition-transform duration-75 flex items-center justify-center max-h-full max-w-full"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
            >
              <img
                src={doc.url}
                alt={doc.title}
                draggable={false}
                className="max-h-[75vh] max-w-[85vw] object-contain shadow-2xl border-2 border-white bg-white select-none pointer-events-none"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 bg-white p-8 border border-slate-300 shadow-xl max-w-md text-center">
              <FileText className="size-16 text-[#1447a6]" />
              <div>
                <h4 className="text-base font-bold text-slate-900">{doc.name || doc.title}</h4>
                <p className="text-xs text-slate-500 mt-1">Non-image file (PDF / Document)</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#081F5C] hover:bg-[#1447a6] text-white font-bold text-xs shadow-xs"
                >
                  <span>Open in Browser</span>
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Floating Image Toolbar in Clean Light Mode */}
          {doc.isImage && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/95 backdrop-blur-md px-3 py-1.5 border border-slate-300 shadow-2xl z-20">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-none"
                onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
                title="Zoom Out (-)"
              >
                <ZoomOut className="size-4" />
              </Button>
              <span className="text-[11px] font-mono font-bold text-slate-800 px-1 min-w-[42px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-none"
                onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))}
                title="Zoom In (+)"
              >
                <ZoomIn className="size-4" />
              </Button>

              <div className="h-4 w-px bg-slate-200 mx-1" />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-none"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title="Rotate 90° (R)"
              >
                <RotateCw className="size-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-none"
                onClick={() => {
                  setZoom(1)
                  setRotation(0)
                  setPan({ x: 0, y: 0 })
                }}
                title="Reset View (0)"
              >
                <RotateCcw className="size-4" />
              </Button>

              <div className="h-4 w-px bg-slate-200 mx-1" />

              <a
                href={doc.url}
                download={doc.name || 'document-preview'}
                className="flex size-7 items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Download image"
              >
                <Download className="size-4" />
              </a>

              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-7 items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Open original file in new tab"
              >
                <ExternalLink className="size-4" />
              </a>
            </div>
          )}
        </div>

        {/* Right Side: Form Verification Panel in Pristine Light Mode */}
        {isFormOpen && (
          <div className="w-full lg:w-[400px] xl:w-[440px] border-t lg:border-t-0 lg:border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <ClipboardList className="size-4 text-[#081F5C]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Applicant Form Details
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-[#081F5C] border border-blue-200">
                Verification Form
              </span>
            </div>

            {/* Scrollable Form Content in Light Mode */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-slate-50/50">
              {/* Profile Overview Card */}
              <div className="border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 truncate">{profile?.fullName}</h4>
                    <p className="text-xs text-slate-600 truncate">{profile?.email}</p>
                    <p className="text-xs text-slate-600 truncate">{phoneDisplay}</p>
                  </div>
                  <Badge className="text-[10px] font-bold uppercase bg-[#081F5C] text-white shrink-0">
                    {ROLE_LABELS[profile?.role] || profile?.role}
                  </Badge>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-500 font-semibold">Account Status:</span>
                  <span
                    className={`font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 ${
                      isPending
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : isRejected
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {profile?.accountApprovalStatus || 'Approved'}
                  </span>
                </div>
              </div>

              {/* ID & Verification Match Data */}
              <div className="border border-slate-200 bg-white p-3 space-y-2 shadow-xs">
                <div className="text-[11px] font-black uppercase tracking-wider text-[#081F5C] border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-[#081F5C]" />
                  <span>Submitted Identification Info</span>
                </div>
                <div className="space-y-1.5 text-slate-700 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">ID Type:</span>
                    <span className="font-bold text-slate-900">{formatIdTypeLabel(profile?.idType)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Date of Birth:</span>
                    <span className="font-medium text-slate-900">{formatDate(profile?.birthdate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Age:</span>
                    <span className="font-medium text-slate-900">{age != null ? `${age} years old` : '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Gender / Sex:</span>
                    <span className="font-medium text-slate-900">
                      {GENDER_LABELS[profile?.gender] || scalar(profile?.gender)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Civil Status:</span>
                    <span className="font-medium text-slate-900">
                      {CIVIL_LABELS[profile?.civilStatus] || scalar(profile?.civilStatus)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Address Form Data */}
              <div className="border border-slate-200 bg-white p-3 space-y-2 shadow-xs">
                <div className="text-[11px] font-black uppercase tracking-wider text-[#081F5C] border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-[#081F5C]" />
                  <span>Address & Location</span>
                </div>
                <div className="space-y-1.5 text-slate-700 text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold block text-[11px]">Present Address:</span>
                    <span className="font-medium text-slate-900 break-words">{presentAddressLine}</span>
                  </div>
                  {profile?.detailedAddress && (
                    <div>
                      <span className="text-slate-500 font-semibold block text-[11px]">Street / Detailed:</span>
                      <span className="font-medium text-slate-900 break-words">{profile.detailedAddress}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Business / Shop Info if applicable */}
              {(profile?.shopName || profile?.businessType || profile?.dtiSecRegistrationNumber) && (
                <div className="border border-slate-200 bg-white p-3 space-y-2 shadow-xs">
                  <div className="text-[11px] font-black uppercase tracking-wider text-[#081F5C] border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-[#081F5C]" />
                    <span>Shop & Registration Numbers</span>
                  </div>
                  <div className="space-y-1.5 text-slate-700 text-xs">
                    {profile?.shopName && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Shop Name:</span>
                        <span className="font-bold text-slate-900">{profile.shopName}</span>
                      </div>
                    )}
                    {profile?.businessType && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Business Type:</span>
                        <span className="font-medium text-slate-900">{profile.businessType}</span>
                      </div>
                    )}
                    {profile?.dtiSecRegistrationNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">DTI / SEC #:</span>
                        <span className="font-mono font-bold text-[#081F5C]">
                          {profile.dtiSecRegistrationNumber}
                        </span>
                      </div>
                    )}
                    {profile?.businessPermitNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">Permit #:</span>
                        <span className="font-mono font-bold text-[#081F5C]">
                          {profile.businessPermitNumber}
                        </span>
                      </div>
                    )}
                    {profile?.tinNumber && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-semibold">TIN:</span>
                        <span className="font-mono font-bold text-[#081F5C]">{profile.tinNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions Footer inside Form Panel */}
            {(isPending || isRejected) && (
              <div className="border-t border-slate-200 bg-slate-50 p-3 flex items-center justify-end gap-2 shrink-0">
                {isPending && onReject && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-bold rounded-none border-rose-300 text-rose-700 hover:bg-rose-50"
                    onClick={() => {
                      onClose?.()
                      onReject?.()
                    }}
                  >
                    Reject
                  </Button>
                )}
                {onApprove && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs font-bold rounded-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    onClick={() => {
                      onClose?.()
                      onApprove?.()
                    }}
                  >
                    {isRejected ? 'Re-evaluate & Approve' : 'Approve Application'}
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Main Registration Detail View (Clean & Crisp Light Mode Form Layout + Light Fullscreen Viewer)
 */
export function AdminRegistrationDetailView({ profile, apiBaseUrl, onApprove, onReject }) {
  const [geoLabels, setGeoLabels] = useState(null)
  const [fullscreenDoc, setFullscreenDoc] = useState(null)

  useEffect(() => {
    if (!profile) return
    let cancelled = false
    setGeoLabels(null)
    resolveProfilePsgcLabels(profile)
      .then((labels) => {
        if (!cancelled) setGeoLabels(labels)
      })
      .catch(() => {
        if (!cancelled) setGeoLabels({})
      })
    return () => {
      cancelled = true
    }
  }, [profile])

  if (!profile) {
    return <p className="py-8 text-center text-sm text-slate-500 font-medium">No data available.</p>
  }

  const GEO_PRESENT = ['region', 'province', 'cityMunicipality', 'barangay']
  const GEO_POB = ['pobRegion', 'pobProvince', 'pobCityMunicipality', 'pobBarangay']
  const GEO_PERMANENT = ['permanentRegion', 'permanentProvince', 'permanentCityMunicipality', 'permanentBarangay']
  const GEO_SHOP = ['shopRegion', 'shopProvince', 'shopCityMunicipality', 'shopBarangay']

  const placeOfBirthLine = formatGeoLine(geoLabels, profile, GEO_POB)
  const presentAddressLine = formatGeoLine(geoLabels, profile, GEO_PRESENT)
  const permanentAddressLine = formatGeoLine(geoLabels, profile, GEO_PERMANENT)
  const shopLocationLine = formatGeoLine(geoLabels, profile, GEO_SHOP)

  const isCustomer = profile.role === 'customer'
  const isMech = profile.role === 'mechanic-technician'
  const isOnCall = profile.role === 'oncall-mechanic-technician'

  const genderLabel = GENDER_LABELS[profile.gender] || scalar(profile.gender)
  const civilLabel = CIVIL_LABELS[profile.civilStatus] || scalar(profile.civilStatus)
  const empCatLabel = EMPLOYMENT_CAT_LABELS[profile.employmentStatusCategory] || scalar(profile.employmentStatusCategory)
  const roleLabel = ROLE_LABELS[profile.role] || scalar(profile.role)
  const age = calculateAge(profile.birthdate)
  const idTypeLabel = formatIdTypeLabel(profile.idType)
  const phoneDisplay = [profile.phoneCode, profile.phoneNumber].filter(Boolean).join(' ').trim() || '—'

  // Aggregate all uploaded documents for quick gallery navigation
  const allDocuments = useMemo(() => {
    const list = []
    if (profile.validIdPath || profile.validIdDataUrl) {
      list.push({
        id: 'validId',
        title: idTypeLabel,
        subtitle: 'Valid ID Card',
        storedPath: profile.validIdPath,
        dataUrl: profile.validIdDataUrl,
        url: profile.validIdDataUrl || buildAdminFileUrl(profile.validIdPath, apiBaseUrl),
        isImage:
          (typeof profile.validIdDataUrl === 'string' && /^data:image\//i.test(profile.validIdDataUrl)) ||
          isLikelyImageFilename(uploadsBasename(profile.validIdPath)),
        name: uploadsBasename(profile.validIdPath) || 'Valid ID',
      })
    }
    if (profile.selfiePath || profile.selfieDataUrl) {
      list.push({
        id: 'selfie',
        title: 'Selfie Photo',
        subtitle: 'Face Verification',
        storedPath: profile.selfiePath,
        dataUrl: profile.selfieDataUrl,
        url: profile.selfieDataUrl || buildAdminFileUrl(profile.selfiePath, apiBaseUrl),
        isImage:
          (typeof profile.selfieDataUrl === 'string' && /^data:image\//i.test(profile.selfieDataUrl)) ||
          isLikelyImageFilename(uploadsBasename(profile.selfiePath)),
        name: uploadsBasename(profile.selfiePath) || 'Selfie Photo',
      })
    }
    if (profile.businessPermitCertificatePath || profile.businessPermitCertificateDataUrl) {
      list.push({
        id: 'businessPermit',
        title: 'Business Permit / Certificate',
        subtitle: 'Registration Certificate',
        storedPath: profile.businessPermitCertificatePath,
        dataUrl: profile.businessPermitCertificateDataUrl,
        url:
          profile.businessPermitCertificateDataUrl ||
          buildAdminFileUrl(profile.businessPermitCertificatePath, apiBaseUrl),
        isImage:
          (typeof profile.businessPermitCertificateDataUrl === 'string' &&
            /^data:image\//i.test(profile.businessPermitCertificateDataUrl)) ||
          isLikelyImageFilename(uploadsBasename(profile.businessPermitCertificatePath)),
        name: uploadsBasename(profile.businessPermitCertificatePath) || 'Business Permit Certificate',
      })
    }
    return list
  }, [profile, apiBaseUrl, idTypeLabel])

  const handleOpenFullscreen = (docObj) => {
    setFullscreenDoc(docObj)
  }

  const idVerificationSection = (
    <FormSection
      stepNumber={isCustomer ? 4 : isMech ? 6 : isOnCall ? 5 : 6}
      title="ID Verification & Uploaded Photos"
      icon={ShieldCheck}
      badge={idTypeLabel}
    >
      <FormField label="Selected ID Type" value={idTypeLabel} highlight />
      <div className="pt-2">
        <p className="text-xs text-slate-500 font-medium mb-3">
          Click on any photo below to inspect in high definition full screen with zoom and verification details.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <DocumentCard
            id="validId"
            title={idTypeLabel}
            subtitle="Valid Government / Official ID"
            storedPath={profile.validIdPath}
            dataUrl={profile.validIdDataUrl}
            apiBaseUrl={apiBaseUrl}
            onViewFullscreen={handleOpenFullscreen}
          />
          <DocumentCard
            id="selfie"
            title="Selfie Photo"
            subtitle="Verification Headshot"
            storedPath={profile.selfiePath}
            dataUrl={profile.selfieDataUrl}
            apiBaseUrl={apiBaseUrl}
            onViewFullscreen={handleOpenFullscreen}
          />
        </div>
      </div>
    </FormSection>
  )

  const accountDetailsSection = (
    <FormSection
      stepNumber={isCustomer ? 3 : isMech ? 5 : isOnCall ? 4 : 5}
      title="Account Credentials & Information"
      icon={Mail}
    >
      <FormField label="Email Address" value={profile.email} copyable />
      <FormField label="Phone Number" value={phoneDisplay} copyable />
      <FormField label="Date Registered" value={formatDate(profile.createdAt)} />
      <FormField label="Last Profile Update" value={formatDate(profile.updatedAt)} />
    </FormSection>
  )

  return (
    <div className="space-y-4">
      {/* Fullscreen Interactive Lightbox Modal in Light Mode */}
      {fullscreenDoc && (
        <FullscreenDocumentViewer
          doc={fullscreenDoc}
          allDocs={allDocuments}
          profile={profile}
          geoLabels={geoLabels}
          onClose={() => setFullscreenDoc(null)}
          onSelectDoc={(d) => setFullscreenDoc(d)}
          onApprove={onApprove}
          onReject={onReject}
        />
      )}

      {/* Customer Layout */}
      {isCustomer && (
        <>
          <FormSection stepNumber={1} title="Personal Information" icon={User}>
            <FormField label="Full Name" value={profile.fullName} highlight />
            <FormField label="Gender / Sex" value={genderLabel} />
            <FormField label="Date of Birth" value={formatDate(profile.birthdate)} />
            <FormField label="Age" value={age != null ? `${age} years old` : '—'} />
          </FormSection>

          <FormSection stepNumber={2} title="Address & Contact Details" icon={MapPin}>
            <FormField label="Address (PSGC)" value={presentAddressLine} />
            <FormField label="Detailed Address / Street" value={profile.detailedAddress} />
            <FormField label="Postal Code" value={profile.postalCode} />
            <FormField label="Contact Phone" value={phoneDisplay} copyable />
          </FormSection>

          {accountDetailsSection}
          {idVerificationSection}
        </>
      )}

      {/* Mechanic / Technician Layout */}
      {isMech && (
        <>
          <FormSection title="Employed Shop Assignment" icon={Building2} badge="Roster Status">
            <FormField
              label="Registered Under (Shop)"
              value={formatEmployer(profile.employedByShopOwner)}
              highlight
            />
            {profile.shopJobTitle && <FormField label="Shop Job Title" value={profile.shopJobTitle} />}
          </FormSection>

          <FormSection stepNumber={1} title="Personal Information" icon={User}>
            <FormField label="Last Name" value={profile.lastName} />
            <FormField label="First Name" value={profile.firstName} />
            <FormField label="Middle Name" value={profile.middleName} />
            <FormField label="Full Name (Record)" value={profile.fullName} highlight />
            <FormField label="Date of Birth" value={formatDate(profile.birthdate)} />
            <FormField label="Age" value={age != null ? `${age} years old` : '—'} />
            <FormField label="Sex" value={genderLabel} />
            <FormField label="Civil Status" value={civilLabel} />
            <FormField label="Place of Birth" value={placeOfBirthLine} />
            <FormField label="Present Address" value={presentAddressLine} />
            <FormField label="Detailed Present Address" value={profile.detailedAddress} />
            <FormField label="Permanent Address" value={permanentAddressLine} />
            <FormField label="Phone" value={phoneDisplay} copyable />
            <FormField label="Email" value={profile.email} copyable />
            <FormField label="Employment Status (Category)" value={empCatLabel} />
            <FormField label="Employment Status (Detail)" value={profile.employmentStatusDetail} />
          </FormSection>

          <FormSection stepNumber={2} title="Educational Background" icon={GraduationCap}>
            <FormField label="Highest Educational Level" value={profile.highestEducationalLevel} />
            <FormField label="Year Graduated / Last Attended" value={profile.yearGraduatedLastAttended} />
            <FormField label="School / University" value={profile.schoolUniversity} />
            <FormField label="Course / Program" value={profile.courseProgram} />
          </FormSection>

          <FormSection stepNumber={3} title="Work Experience" icon={Wrench}>
            <FormField label="Company Name" value={profile.workCompanyName} />
            <FormField label="Company Address" value={profile.workCompanyAddress} />
            <FormField label="Position Held" value={profile.workPositionHeld} />
            <FormField label="Inclusive Dates" value={`${profile.workInclusiveFrom || '—'} to ${profile.workInclusiveTo || '—'}`} />
            <FormField label="Appointment Status" value={profile.workAppointmentStatus} />
          </FormSection>

          <FormSection stepNumber={4} title="Skills & Competencies" icon={Sparkles}>
            <FormField label="21st Century Skills Self-Assessment" value={formatList(profile.skillsSelfAssessment)} />
            <FormField label="Technical Skills (Without Formal Training)" value={formatList(profile.technicalSkillsNoFormalTraining)} />
          </FormSection>

          {accountDetailsSection}
          {idVerificationSection}
        </>
      )}

      {/* Shop Owner & Independent Provider Layout */}
      {!isCustomer && !isMech && (
        <>
          <FormSection stepNumber={1} title="Personal Information" icon={User}>
            <FormField label="Last Name" value={profile.lastName} />
            <FormField label="First Name" value={profile.firstName} />
            <FormField label="Middle Name" value={profile.middleName} />
            <FormField label="Full Name (Record)" value={profile.fullName} highlight />
            <FormField label="Date of Birth" value={formatDate(profile.birthdate)} />
            <FormField label="Age" value={age != null ? `${age} years old` : '—'} />
            <FormField label="Sex" value={genderLabel} />
            <FormField label="Civil Status" value={civilLabel} />
            <FormField label="Place of Birth" value={placeOfBirthLine} />
            <FormField label="Present Address" value={presentAddressLine} />
            <FormField label="Detailed Address" value={profile.detailedAddress} />
            <FormField label="Permanent Address" value={permanentAddressLine} />
            <FormField label="Phone" value={phoneDisplay} copyable />
            <FormField label="Email" value={profile.email} copyable />
            <FormField label="Employment Status" value={empCatLabel} />
          </FormSection>

          <FormSection
            stepNumber={2}
            title={isOnCall ? 'Business / Provider Profile' : 'Shop & Business Profile'}
            icon={Building2}
          >
            {!isOnCall && <FormField label="Shop Name" value={profile.shopName} highlight />}
            <FormField label="Type of Business" value={profile.businessType} />
            <FormField label="Repair Services Offered" value={formatList(profile.repairServicesOffered)} />
            <FormField label="Service Type" value={profile.serviceType} />
            <FormField label="Years of Operation" value={profile.yearsOfOperation} />
            {!isOnCall && (
              <FormField label="Number of Employees" value={profile.numberOfEmployees} />
            )}
            <FormField label="Operating Hours" value={profile.operatingHours} />
            <FormField label="Days of Operation" value={formatList(profile.daysOfOperation)} />
            <FormField label="Shop Description" value={profile.shopDescription} />
          </FormSection>

          <FormSection
            stepNumber={3}
            title={isOnCall ? 'Service Location' : 'Shop Location & Address'}
            icon={MapPin}
          >
            <FormField label="Location (PSGC)" value={shopLocationLine} />
            <FormField label="Detailed Address" value={profile.shopDetailedAddress} />
            <FormField label="Landmark" value={profile.shopLandmark} />
          </FormSection>

          {isOnCall ? (
            <FormSection stepNumber={4} title="Educational Background & Skills" icon={GraduationCap}>
              <FormField label="Highest Educational Level" value={profile.highestEducationalLevel} />
              <FormField label="Year Graduated / Last Attended" value={profile.yearGraduatedLastAttended} />
              <FormField label="School / University" value={profile.schoolUniversity} />
              <FormField label="Course / Program" value={profile.courseProgram} />
              <FormField label="21st Century Skills" value={formatList(profile.skillsSelfAssessment)} />
              <FormField label="Technical Skills (No Formal Training)" value={formatList(profile.technicalSkillsNoFormalTraining)} />
            </FormSection>
          ) : (
            <FormSection stepNumber={4} title="Business Registration & Permits" icon={FileCheck}>
              <FormField label="DTI / SEC Registration #" value={profile.dtiSecRegistrationNumber} copyable highlight />
              <FormField label="Business Permit #" value={profile.businessPermitNumber} copyable highlight />
              <FormField label="TIN" value={profile.tinNumber} copyable highlight />

              <div className="pt-2">
                <p className="text-xs text-slate-500 font-medium mb-3">
                  Business Permit / Certificate Document:
                </p>
                <div className="max-w-md">
                  <DocumentCard
                    id="businessPermit"
                    title="Business Permit / Certificate"
                    subtitle="Official Registration Certificate"
                    storedPath={profile.businessPermitCertificatePath}
                    dataUrl={profile.businessPermitCertificateDataUrl}
                    apiBaseUrl={apiBaseUrl}
                    onViewFullscreen={handleOpenFullscreen}
                  />
                </div>
              </div>
            </FormSection>
          )}

          {accountDetailsSection}
          {idVerificationSection}
        </>
      )}
    </div>
  )
}
