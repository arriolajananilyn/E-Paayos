import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Award,
  BarChart3,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  DollarSign,
  Download,
  Filter,
  Flame,
  Layers,
  MapPin,
  PieChart as PieChartIcon,
  PlayCircle,
  Printer,
  RefreshCw,
  Search,
  Star,
  Store,
  TrendingUp,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import ShopOwnerDashboard from "./dashboard.jsx"
import { getApiBaseUrl } from "@/lib/apiBaseUrl"
import { printOfficialDocument, exportReportToCSV } from "@/lib/reportDocExporter"

const API_URL = getApiBaseUrl()

function authHeaders() {
  const token = localStorage.getItem("token")
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function currencyPHP(amount) {
  const n = Number(amount || 0)
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `₱${Math.round(n).toLocaleString("en-PH")}`
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
  })
}

function normalizeStatus(s) {
  return String(s || "").toLowerCase()
}

const STAT_CARD_GRADIENT = {
  revenue: "from-emerald-600 via-teal-700 to-slate-950 border-emerald-400/30",
  bookings: "from-blue-600 via-indigo-700 to-slate-950 border-blue-400/30",
  technicians: "from-purple-600 via-violet-700 to-slate-950 border-purple-400/30",
  rating: "from-amber-600 via-orange-700 to-slate-950 border-amber-400/30",
}

function StatGradientCard({ label, value, icon: Icon, variant, helper, onClick, className }) {
  const gradient = STAT_CARD_GRADIENT[variant] ?? STAT_CARD_GRADIENT.revenue
  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden bg-gradient-to-br p-3 sm:p-4 text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md rounded-none border cursor-pointer",
        gradient,
        className
      )}
    >
      <div className="pointer-events-none absolute -right-3 -top-3 size-20 sm:size-24 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-lg group-hover:scale-125 transition-transform duration-500" />
      <Icon className="pointer-events-none absolute -right-1 -top-1 size-14 sm:size-16 text-white/15 stroke-[1.2] rotate-12 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:text-white/25" />

      <div className="relative z-10 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-black/30 backdrop-blur-md border border-white/20 text-white rounded-none">
            <Icon className="size-2.5 sm:size-3 text-white/90 shrink-0" />
            <span className="truncate">{label}</span>
          </span>
          <div className="size-5 rounded-none bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/30 text-white group-hover:bg-white group-hover:text-slate-900 transition-colors shrink-0">
            <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight tabular-nums">
              {value}
            </span>
          </div>
          {helper ? (
            <p className="text-[10px] sm:text-[11px] text-white/80 font-medium mt-0.5 truncate">
              {helper}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function calculateBookingAmount(b) {
  const labor = Number(b.serviceFeeLaborRateAtCalc || 0)
  const materials = Number(b.serviceFeeMaterialsAmount || 0)
  if (labor + materials > 0) return labor + materials
  const startPrice = Number(b.shopService?.startingPrice || b.startingPrice || 0)
  return startPrice
}

export function ReportsAnalyticsContent() {
  const [activeTab, setActiveTab] = useState("overview") // overview, technicians, ledger
  const [range, setRange] = useState("thisMonth")
  const [bookings, setBookings] = useState([])
  const [services, setServices] = useState([])
  const [employees, setEmployees] = useState([])
  const [registeredMechanics, setRegisteredMechanics] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters for Table
  const [statusFilter, setStatusFilter] = useState("all")
  const [technicianFilter, setTechnicianFilter] = useState("all")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 8

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true)
    else setLoading(true)
    setLoadError("")

    try {
      const [bRes, sRes, eRes, mRes] = await Promise.all([
        fetch(`${API_URL}/api/shop/bookings`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/shop/services`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/shop/employees`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/shop/registered-mechanics`, { headers: authHeaders() }),
      ])

      const bData = await bRes.json().catch(() => ({}))
      const sData = await sRes.json().catch(() => [])
      const eData = await eRes.json().catch(() => ({}))
      const mData = await mRes.json().catch(() => ({}))

      if (!bRes.ok && bRes.status !== 404) throw new Error(bData?.message || "Could not fetch bookings records.")

      setBookings(Array.isArray(bData?.bookings) ? bData.bookings : Array.isArray(bData) ? bData : [])
      setServices(Array.isArray(sData) ? sData : [])
      setEmployees(Array.isArray(eData?.employees) ? eData.employees : Array.isArray(eData) ? eData : [])
      setRegisteredMechanics(Array.isArray(mData?.mechanics) ? mData.mechanics : Array.isArray(mData) ? mData : [])

      if (isRefresh) toast.success("Shop reports refreshed!")
    } catch (err) {
      setLoadError(err.message || "Failed to load reports and analytics.")
      toast.error(err.message || "Error loading reports")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter bookings by selected period range
  const dateFilteredBookings = useMemo(() => {
    const source = bookings
    const now = new Date()
    const getDateRange = () => {
      switch (range) {
        case "today":
          return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end: now }
        case "thisWeek": {
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          weekStart.setHours(0, 0, 0, 0)
          return { start: weekStart, end: now }
        }
        case "thisMonth":
          return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
        case "thisYear":
          return { start: new Date(now.getFullYear(), 0, 1), end: now }
        default:
          return { start: new Date(0), end: now }
      }
    }
    const { start, end } = getDateRange()
    return source.filter((o) => {
      const t = new Date(o?.preferredDate || o?.createdAt || Date.now())
      return t >= start && t <= end
    })
  }, [range, bookings])

  // KPIs
  const kpis = useMemo(() => {
    let totalRevenue = 0
    let totalLabor = 0
    let totalParts = 0
    let completedCount = 0
    let cancelledCount = 0
    let pendingCount = 0
    let activePipelineCount = 0
    let ratingSum = 0
    let ratingCount = 0

    dateFilteredBookings.forEach((b) => {
      const amt = calculateBookingAmount(b)
      const labor = Number(b.serviceFeeLaborRateAtCalc || 0)
      const parts = Number(b.serviceFeeMaterialsAmount || 0)

      if (b.status === "completed") {
        completedCount++
        totalRevenue += amt
        totalLabor += labor
        totalParts += parts
      } else if (b.status === "cancelled") {
        cancelledCount++
      } else if (b.status === "pending") {
        pendingCount++
      } else if (b.status === "confirmed" || b.status === "working") {
        activePipelineCount++
      }

      if (b.customerReviewRating && Number(b.customerReviewRating) > 0) {
        ratingSum += Number(b.customerReviewRating)
        ratingCount++
      }
    })

    const nonPendingTotal = completedCount + cancelledCount + activePipelineCount
    const completionRate = nonPendingTotal > 0 ? Math.round((completedCount / nonPendingTotal) * 100) : 0
    const avgRating = ratingCount > 0 ? (ratingSum / ratingCount).toFixed(1) : "5.0"

    return {
      totalRevenue,
      totalLabor,
      totalParts,
      completedCount,
      cancelledCount,
      pendingCount,
      activePipelineCount,
      totalBookings: dateFilteredBookings.length,
      completionRate,
      avgRating,
      ratingCount,
    }
  }, [dateFilteredBookings])

  // Technicians Performance
  const technicianReports = useMemo(() => {
    const techMap = {}

    employees.forEach((emp) => {
      const id = String(emp._id || emp.fullName)
      techMap[id] = {
        id,
        name: emp.fullName || "Technician",
        role: emp.jobTitle || emp.role || "Shop Technician",
        phone: emp.phone || emp.phoneNumber || "—",
        assignedCount: 0,
        completedCount: 0,
        workingCount: 0,
        revenueGenerated: 0,
        ratingSum: 0,
        ratingCount: 0,
      }
    })

    registeredMechanics.forEach((mech) => {
      const id = String(mech._id || mech.fullName)
      if (!techMap[id]) {
        techMap[id] = {
          id,
          name: mech.fullName || "Mechanic",
          role: "Affiliated Mechanic",
          phone: mech.phone || mech.phoneNumber || "—",
          assignedCount: 0,
          completedCount: 0,
          workingCount: 0,
          revenueGenerated: 0,
          ratingSum: 0,
          ratingCount: 0,
        }
      }
    })

    dateFilteredBookings.forEach((b) => {
      const tName = b.assignedTechnicianName || b.assignedTechnician?.fullName || ""
      const tId = b.assignedTechnician?._id ? String(b.assignedTechnician._id) : (tName || "Unassigned")

      if (!techMap[tId]) {
        techMap[tId] = {
          id: tId,
          name: tName || "Unassigned Staff",
          role: b.assignedTechnicianJobTitle || "Technician",
          phone: b.assignedTechnicianPhone || "—",
          assignedCount: 0,
          completedCount: 0,
          workingCount: 0,
          revenueGenerated: 0,
          ratingSum: 0,
          ratingCount: 0,
        }
      }

      techMap[tId].assignedCount += 1
      if (b.status === "completed") {
        techMap[tId].completedCount += 1
        techMap[tId].revenueGenerated += calculateBookingAmount(b)
      } else if (b.status === "working" || b.status === "confirmed") {
        techMap[tId].workingCount += 1
      }

      if (b.customerReviewRating && Number(b.customerReviewRating) > 0) {
        techMap[tId].ratingSum += Number(b.customerReviewRating)
        techMap[tId].ratingCount += 1
      }
    })

    return Object.values(techMap).map((t) => {
      const avg = t.ratingCount > 0 ? (t.ratingSum / t.ratingCount).toFixed(1) : "5.0"
      const compRate = t.assignedCount > 0 ? Math.round((t.completedCount / t.assignedCount) * 100) : 0
      return {
        ...t,
        avgRating: avg,
        completionRate: compRate,
      }
    }).sort((a, b) => b.completedCount - a.completedCount || b.revenueGenerated - a.revenueGenerated)
  }, [employees, registeredMechanics, dateFilteredBookings])

  // Chart Series: Revenue & Bookings
  const chartSeries = useMemo(() => {
    const source = dateFilteredBookings
    const now = new Date()

    const makeKey = (d) => {
      const dt = new Date(d)
      if (range === "today") {
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}-${String(dt.getHours()).padStart(2, "0")}`
      }
      if (range === "thisYear") {
        return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`
      }
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
    }

    const dataMap = new Map()
    source.forEach((o) => {
      const ts = o?.preferredDate || o?.createdAt || Date.now()
      const key = makeKey(ts)
      const current = dataMap.get(key) || { bookings: 0, revenue: 0 }
      current.bookings += 1
      if (o.status === "completed") {
        current.revenue += calculateBookingAmount(o)
      }
      dataMap.set(key, current)
    })

    const result = []
    if (range === "today") {
      for (let i = 0; i < 24; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), i)
        const key = makeKey(d)
        const val = dataMap.get(key) || { bookings: 0, revenue: 0 }
        result.push({ date: `${String(i).padStart(2, "0")}:00`, value: val.bookings, revenue: val.revenue })
      }
    } else if (range === "thisWeek") {
      const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      weekStart.setHours(0, 0, 0, 0)
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart)
        d.setDate(weekStart.getDate() + i)
        const val = dataMap.get(makeKey(d)) || { bookings: 0, revenue: 0 }
        result.push({ date: weekDays[d.getDay()], value: val.bookings, revenue: val.revenue })
      }
    } else if (range === "thisMonth") {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(monthStart)
        d.setDate(i)
        const val = dataMap.get(makeKey(d)) || { bookings: 0, revenue: 0 }
        result.push({ date: `D${i}`, value: val.bookings, revenue: val.revenue })
      }
    } else {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), i, 1)
        const val = dataMap.get(makeKey(d)) || { bookings: 0, revenue: 0 }
        result.push({ date: months[i], value: val.bookings, revenue: val.revenue })
      }
    }
    return result
  }, [range, dateFilteredBookings])

  // Status Pie Rows
  const statusPieRows = useMemo(() => {
    const s = {
      pending: dateFilteredBookings.filter((b) => b.status === "pending").length,
      confirmed: dateFilteredBookings.filter((b) => b.status === "confirmed").length,
      working: dateFilteredBookings.filter((b) => b.status === "working").length,
      completed: dateFilteredBookings.filter((b) => b.status === "completed").length,
      cancelled: dateFilteredBookings.filter((b) => b.status === "cancelled").length,
    }
    return [
      { key: "pending", name: "Pending", value: s.pending, fill: "url(#gradShopPiePending)" },
      { key: "confirmed", name: "Confirmed", value: s.confirmed, fill: "url(#gradShopPieConfirmed)" },
      { key: "working", name: "Working", value: s.working, fill: "url(#gradShopPieWorking)" },
      { key: "completed", name: "Completed", value: s.completed, fill: "url(#gradShopPieCompleted)" },
      { key: "cancelled", name: "Cancelled", value: s.cancelled, fill: "url(#gradShopPieCancelled)" },
    ]
  }, [dateFilteredBookings])

  const statusPieTotal = useMemo(
    () => statusPieRows.reduce((sum, entry) => sum + entry.value, 0),
    [statusPieRows]
  )

  // Top Services Demand
  const servicesDemandData = useMemo(() => {
    const map = {}
    const totalBookingsCount = dateFilteredBookings.length || 1

    dateFilteredBookings.forEach((b) => {
      const sName = b.shopService?.name || b.serviceCategory || "General Repair"
      const category = b.shopService?.category || b.serviceCategory || "General"
      if (!map[sName]) {
        map[sName] = {
          name: sName,
          category,
          count: 0,
          completedCount: 0,
          activeCount: 0,
          revenue: 0,
        }
      }
      map[sName].count += 1
      if (b.status === "completed" || b.status === "fixed") {
        map[sName].completedCount += 1
        map[sName].revenue += calculateBookingAmount(b)
      } else if (b.status === "working" || b.status === "confirmed") {
        map[sName].activeCount += 1
      }
    })

    const list = Object.values(map)
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
      .slice(0, 5)

    const maxCount = list.length > 0 ? Math.max(...list.map((i) => i.count), 1) : 1

    return list.map((item, idx) => ({
      ...item,
      rank: idx + 1,
      sharePercent: Math.round((item.count / totalBookingsCount) * 100),
      relativePercent: Math.round((item.count / maxCount) * 100),
      avgTicket: item.completedCount > 0 ? Math.round(item.revenue / item.completedCount) : 0,
    }))
  }, [dateFilteredBookings])

  // Filtered Table Records
  const tableRecords = useMemo(() => {
    return dateFilteredBookings.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false
      if (paymentFilter !== "all") {
        const pStatus = b.paymentStatus || "unpaid"
        if (paymentFilter === "paid" && pStatus !== "paid") return false
        if (paymentFilter === "unpaid" && pStatus === "paid") return false
      }
      if (technicianFilter !== "all") {
        const tName = b.assignedTechnicianName || b.assignedTechnician?.fullName || ""
        const tId = b.assignedTechnician?._id ? String(b.assignedTechnician._id) : tName
        if (tId !== technicianFilter && tName !== technicianFilter) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const idMatch = String(b._id || "").toLowerCase().includes(q)
        const nameMatch = String(b.contactName || b.customer?.fullName || "").toLowerCase().includes(q)
        const techMatch = String(b.assignedTechnicianName || "").toLowerCase().includes(q)
        const serviceMatch = String(b.shopService?.name || "").toLowerCase().includes(q)
        return idMatch || nameMatch || techMatch || serviceMatch
      }
      return true
    })
  }, [dateFilteredBookings, statusFilter, paymentFilter, technicianFilter, searchQuery])

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return tableRecords.slice(start, start + pageSize)
  }, [tableRecords, currentPage])

  const totalPages = Math.max(1, Math.ceil(tableRecords.length / pageSize))

  const periodLabel = useMemo(() => {
    if (range === 'today') return `Today (${new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })})`
    if (range === 'thisWeek') return 'Current Week'
    if (range === 'thisMonth') return `Current Month (${new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })})`
    if (range === 'thisYear') return `Current Year (${new Date().getFullYear()})`
    return 'All Time Shop History'
  }, [range])

  // Export CSV
  const handleExportCSV = () => {
    if (tableRecords.length === 0) {
      toast.error("No records to export.")
      return
    }

    const headers = [
      "Booking Reference / ID",
      "Date",
      "Customer Name",
      "Customer Phone",
      "Assigned Technician",
      "Service Rendered",
      "Service Mode",
      "Labor Amount (PHP)",
      "Materials / Parts (PHP)",
      "Total Amount (PHP)",
      "Booking Status",
      "Payment Status",
      "Customer Review Rating",
    ]

    const rows = tableRecords.map((b) => [
      b.ref || b._id || "",
      formatDateDisplay(b.preferredDate || b.createdAt),
      b.contactName || b.customer?.fullName || "Customer",
      b.contactPhone || "—",
      b.assignedTechnicianName || b.assignedTechnician?.fullName || "Unassigned",
      b.shopService?.name || b.serviceCategory || "Repair Service",
      b.serviceMode === "home" ? "Home Service" : "Shop Service",
      Number(b.serviceFeeLaborRateAtCalc || 0),
      Number(b.serviceFeeMaterialsAmount || 0),
      calculateBookingAmount(b),
      (b.status || "").toUpperCase(),
      (b.paymentStatus || "unpaid").toUpperCase(),
      b.customerReviewRating ? `${b.customerReviewRating} Star` : "N/A",
    ])

    exportReportToCSV({
      filename: `Shop_Operations_Report_${range}_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows,
    })
    toast.success("Shop service report exported to CSV!")
  }

  // Official Documentation Print / PDF Generator
  const handlePrint = () => {
    if (dateFilteredBookings.length === 0 && tableRecords.length === 0) {
      toast.error("No records available to generate report documentation.")
      return
    }

    let currentShop = {}
    try {
      const rawUser = localStorage.getItem("user")
      currentShop = rawUser ? JSON.parse(rawUser) : {}
    } catch {
      /* ignore */
    }

    const shopName = currentShop.shopName || "Auto Repair & Service Center"
    const ownerName = currentShop.fullName || "Shop Proprietor"

    const rows = tableRecords.map((b, idx) => [
      `#${idx + 1}`,
      b.ref ? `#${b.ref}` : (b._id?.slice(-8) || "—"),
      formatDateDisplay(b.preferredDate || b.createdAt),
      b.contactName || b.customer?.fullName || "Customer",
      b.assignedTechnicianName || b.assignedTechnician?.fullName || "Unassigned",
      b.shopService?.name || b.serviceCategory || "Service",
      b.serviceMode === "home" ? "Home Service" : "Shop Service",
      currencyPHP(b.serviceFeeLaborRateAtCalc || 0),
      currencyPHP(b.serviceFeeMaterialsAmount || 0),
      currencyPHP(calculateBookingAmount(b)),
      b.status ? b.status.toUpperCase() : "PENDING",
      b.paymentStatus ? b.paymentStatus.toUpperCase() : "UNPAID",
      b.customerReviewRating ? `${b.customerReviewRating} ★` : "—",
    ])

    const totalRevenueCalc = tableRecords.reduce((sum, b) => sum + calculateBookingAmount(b), 0)
    const totalLaborCalc = tableRecords.reduce((sum, b) => sum + Number(b.serviceFeeLaborRateAtCalc || 0), 0)
    const totalPartsCalc = tableRecords.reduce((sum, b) => sum + Number(b.serviceFeeMaterialsAmount || 0), 0)

    printOfficialDocument({
      systemName: `${shopName.toUpperCase()} • E-PAAYOS SERVICE CENTER`,
      systemTagline: "Official Automotive & Electronics Repair Management Documentation",
      docTitle: "AUTO SHOP PERFORMANCE & FINANCIAL AUDIT REPORT",
      docSubtitle: "Executive Operations Summary, Staff Workload & Financial Documentation",
      docCode: `DOC-SHP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`,
      periodLabel: `${periodLabel} (Scope: ${statusFilter !== "all" ? `Status=${statusFilter}` : "All Statuses"}, ${technicianFilter !== "all" ? `Staff=${technicianFilter}` : "All Staff"})`,
      entity: {
        name: `${shopName} (Proprietor: ${ownerName})`,
        role: "Auto Repair Shop Owner & Service Center",
        contact: currentShop.phone || currentShop.phoneNumber || currentShop.email || "—",
        address: currentShop.shopAddress || currentShop.address || "Registered Service Facility",
        extra: `Active Team Size: ${employees.length + registeredMechanics.length} Service Technicians`,
      },
      kpis: [
        { label: "Total Shop Revenue", value: currencyPHP(kpis.totalRevenue), helper: `Labor: ${currencyPHP(kpis.totalLabor)} • Parts: ${currencyPHP(kpis.totalParts)}` },
        { label: "Completed Service Jobs", value: String(kpis.completedCount), helper: `${kpis.completionRate}% completion rate` },
        { label: "Active Jobs in Queue", value: String(kpis.activePipelineCount + kpis.pendingCount), helper: `${kpis.activePipelineCount} working, ${kpis.pendingCount} pending` },
        { label: "Customer Satisfaction", value: `${kpis.avgRating} ★`, helper: `Rated across ${kpis.ratingCount} customer reviews` },
      ],
      sections: [
        {
          title: "Section 1: Service Technician Workload & Performance Summary",
          subtitle: "Performance breakdown by assigned staff member and revenue impact",
          headers: ["Technician Name", "Specialization / Role", "Assigned", "Completed", "Total Revenue (PHP)", "Customer Rating"],
          rows: technicianReports.map((t) => [
            t.name,
            t.role,
            `${t.assignedCount} jobs`,
            `${t.completedCount} jobs`,
            currencyPHP(t.revenueGenerated),
            t.ratingCount > 0 ? `${(t.ratingSum / t.ratingCount).toFixed(1)} ★ (${t.ratingCount})` : "5.0 ★ (New)",
          ]),
          aligns: ["", "", "text-center", "text-center", "text-right", "text-center"],
        },
        {
          title: "Section 2: High-Demand Shop Service Categories",
          subtitle: "Service volume count and revenue contributions",
          headers: ["Service Name / Offering", "Bookings Handled", "Gross Revenue (PHP)", "Revenue Share (%)"],
          rows: servicesDemandData.map((s) => [
            s.name,
            `${s.count} requests`,
            currencyPHP(s.revenue),
            kpis.totalRevenue > 0 ? `${Math.round((s.revenue / kpis.totalRevenue) * 100)}%` : "0%",
          ]),
          aligns: ["", "text-center", "text-right", "text-center"],
        },
      ],
      ledger: {
        title: "Section 3: Itemized Master Service & Billing Ledger",
        subtitle: `Complete historical logs (${tableRecords.length} records matching current filter parameters)`,
        headers: ["#", "Ref Code", "Date", "Customer Name", "Assigned Tech", "Service", "Mode", "Labor Fee", "Parts / Mats", "Total Bill", "Status", "Payment", "Rating"],
        rows,
        amountColIdxs: [7, 8, 9],
        statusColIdx: 10,
        aligns: ["text-center", "", "", "", "", "", "text-center", "text-right", "text-right", "text-right", "text-center", "text-center", "text-center"],
        totals: [
          "Summary Total",
          `${tableRecords.length} records`,
          "—",
          "—",
          "—",
          "—",
          "—",
          currencyPHP(totalLaborCalc),
          currencyPHP(totalPartsCalc),
          currencyPHP(totalRevenueCalc),
          `${kpis.completedCount} Completed`,
          "—",
          `${kpis.avgRating} ★ Avg`,
        ],
      },
      signOff: {
        preparedBy: ownerName,
        preparedRole: "Shop Owner / Managing Partner",
        verifiedBy: "Service Operations & QA Supervisor",
        verifiedRole: "Certified Lead Technician",
        notes: "This official documentation represents verified financial records and service job fulfillment logs for the designated reporting period.",
      },
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Spinner className="size-8 text-[#081F5C]" />
        <p className="mt-3 text-sm font-medium text-slate-600">Loading Shop & Technician Reports...</p>
      </div>
    )
  }

  return (
    <main className="w-full min-w-0 max-w-full space-y-3 sm:space-y-4 overflow-x-hidden">
      {/* Load Error Banner */}
      {loadError ? (
        <div className="rounded-none border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
          {loadError}
        </div>
      ) : null}

      {/* Top Header Bar: Clean Title & Easy Period Preset Buttons */}
      <div className="rounded-none bg-white p-3 sm:p-4 shadow-xs border border-slate-200/80 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Store className="size-4.5 text-[#081F5C]" />
            Shop Reports & Technician Analytics
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Financial revenue, technician performance attribution, and service history.
          </p>
        </div>

        {/* Quick Range Presets & Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex bg-slate-100 p-0.5 border border-slate-200">
            {[
              { id: "today", label: "Today" },
              { id: "thisWeek", label: "Week" },
              { id: "thisMonth", label: "Month" },
              { id: "thisYear", label: "Year" },
              { id: "all", label: "All" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setRange(p.id)
                  setCurrentPage(1)
                }}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold transition-all cursor-pointer",
                  range === p.id
                    ? "bg-[#081F5C] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="h-8 rounded-none border-slate-200 text-xs font-bold gap-1 cursor-pointer"
          >
            <RefreshCw className={cn("size-3", isRefreshing && "animate-spin")} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-8 rounded-none border-slate-200 text-xs font-bold gap-1.5 text-slate-700 hover:bg-slate-50 cursor-pointer"
            title="Download full shop operational dataset in CSV format"
          >
            <Download className="size-3.5 text-slate-600" />
            <span>Export CSV</span>
          </Button>

          <Button
            size="sm"
            onClick={handlePrint}
            className="h-8 rounded-none bg-[#081F5C] hover:bg-[#04133d] text-white text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
            title="Open official shop financial and technician documentation for direct printing or saving as PDF"
          >
            <Printer className="size-3.5" />
            <span>Print / PDF Report</span>
          </Button>
        </div>
      </div>

      {/* 4 Compact Modern Stat Cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatGradientCard
          label="Shop Revenue"
          value={currencyPHP(kpis.totalRevenue)}
          icon={DollarSign}
          variant="revenue"
          helper={`₱${Math.round(kpis.totalLabor).toLocaleString()} labor • ₱${Math.round(kpis.totalParts).toLocaleString()} parts`}
        />
        <StatGradientCard
          label="Total Bookings"
          value={kpis.totalBookings}
          icon={ClipboardList}
          variant="bookings"
          helper={`${kpis.completedCount} completed (${kpis.completionRate}%)`}
        />
        <StatGradientCard
          label="Staff & Techs"
          value={technicianReports.length}
          icon={Users}
          variant="technicians"
          helper={`${employees.length} employees • ${registeredMechanics.length} mechanics`}
        />
        <StatGradientCard
          label="Shop Rating"
          value={`${kpis.avgRating} ★`}
          icon={Star}
          variant="rating"
          helper={`From ${kpis.ratingCount} customer reviews`}
        />
      </div>

      {/* Modern Simple Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white p-1">
        {[
          { id: "overview", label: "Shop Overview & Revenue", icon: BarChart3 },
          { id: "technicians", label: `Technicians' Performance (${technicianReports.length})`, icon: Users },
          { id: "ledger", label: `Booking Ledger (${tableRecords.length})`, icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 text-xs font-bold transition-all rounded-none cursor-pointer",
                isActive
                  ? "bg-[#081F5C] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              <Icon className="size-3.5" />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* TAB 1: SHOP OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <section className="grid gap-4 lg:grid-cols-3">
            {/* Revenue Trend Area Chart */}
            <div className="rounded-none bg-white p-4 shadow-xs border border-slate-200 lg:col-span-2 flex flex-col justify-between">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Revenue & Booking Trends</p>
                  <p className="text-xs text-slate-500">Earnings and job volume in selected period</p>
                </div>
                <span className="text-[10px] font-bold text-[#081F5C] uppercase tracking-wider bg-blue-50 px-2 py-0.5 border border-blue-200/50">
                  {range}
                </span>
              </div>

              <div className="flex-1 rounded-none bg-slate-50/70 p-2.5 border border-slate-200/50 flex flex-col justify-center">
                <div className="h-[210px] sm:h-[230px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartSeries} margin={{ top: 10, right: 12, left: -20, bottom: 4 }}>
                      <defs>
                        <linearGradient id="fillShopReportsBookingsSimple" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#047857" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgb(148 163 184 / 0.35)" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 11, fontWeight: 500 }} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={6} tick={{ fontSize: 11 }} allowDecimals={false} />
                      <RechartsTooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-none bg-slate-900 text-white p-2 text-xs shadow-xl space-y-0.5">
                                <p className="font-bold text-slate-200">{label}</p>
                                <p className="text-blue-300">Bookings: <span className="font-bold">{payload[0]?.value}</span></p>
                                <p className="text-emerald-400">Revenue: <span className="font-bold">{currencyPHP(payload[0]?.payload?.revenue)}</span></p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#fillShopReportsBookingsSimple)"
                        activeDot={{ r: 5, strokeWidth: 2, stroke: "#ffffff", fill: "#10b981" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Summary Metric Bar */}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 rounded-none bg-slate-50 px-2.5 py-1.5 border border-slate-200/60">
                  <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                  <span className="text-slate-500">Period Bookings:</span>
                  <span className="font-bold text-slate-900 tabular-nums ml-auto">
                    {chartSeries.reduce((acc, curr) => acc + curr.value, 0)}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-none bg-slate-50 px-2.5 py-1.5 border border-slate-200/60">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-500">Period Revenue:</span>
                  <span className="font-bold text-emerald-700 tabular-nums ml-auto">
                    {currencyPHP(chartSeries.reduce((acc, curr) => acc + (curr.revenue || 0), 0))}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-none bg-slate-50 px-2.5 py-1.5 border border-slate-200/60">
                  <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
                  <span className="text-slate-500">Avg / Slot:</span>
                  <span className="font-bold text-slate-900 tabular-nums ml-auto">
                    {chartSeries.length > 0
                      ? (chartSeries.reduce((acc, curr) => acc + curr.value, 0) / chartSeries.length).toFixed(1)
                      : 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Bookings By Status Donut Chart */}
            <div className="rounded-none bg-white p-4 shadow-xs border border-slate-200 flex flex-col justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Service Status Breakdown</p>
                <p className="text-xs text-slate-500">Shop booking fulfillment metrics</p>
              </div>

              <div className="relative mx-auto my-2 h-[180px] w-full max-w-[220px] flex items-center justify-center">
                <PieChart width={200} height={180}>
                  <defs>
                    <linearGradient id="gradShopPiePending" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                    <linearGradient id="gradShopPieConfirmed" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#0ea5e9" />
                      <stop offset="100%" stopColor="#0369a1" />
                    </linearGradient>
                    <linearGradient id="gradShopPieWorking" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#5b21b6" />
                    </linearGradient>
                    <linearGradient id="gradShopPieCompleted" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="gradShopPieCancelled" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#64748b" />
                      <stop offset="100%" stopColor="#334155" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={statusPieRows}
                    cx={100}
                    cy={90}
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    stroke="#ffffff"
                    strokeWidth={2}
                    dataKey="value"
                  >
                    {statusPieRows.map((row) => (
                      <Cell key={row.key} fill={row.fill} />
                    ))}
                  </Pie>
                </PieChart>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xl font-bold tracking-tight text-slate-900 tabular-nums">
                      {statusPieTotal}
                    </p>
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                      Total
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                {statusPieRows.map((row) => (
                  <div key={row.key} className="flex min-w-0 items-center gap-1.5 rounded-none bg-slate-50 px-2 py-1 border border-slate-200/50">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          row.key === "pending"
                            ? "#f59e0b"
                            : row.key === "confirmed"
                            ? "#0ea5e9"
                            : row.key === "working"
                            ? "#8b5cf6"
                            : row.key === "completed"
                            ? "#10b981"
                            : "#64748b",
                      }}
                    />
                    <span className="truncate text-slate-600">{row.name}</span>
                    <span className="ml-auto font-bold text-slate-900 tabular-nums">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Top Performing Repair Packages - Modern Rich Card List & Stats */}
          <div className="rounded-none bg-white p-4 shadow-xs border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black tracking-tight text-slate-900">Top Performing Repair Packages</p>
                  <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    <Flame className="size-3 text-indigo-600" />
                    High Demand
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Most requested services by volume & revenue impact</p>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-500">Total Analyzed: </span>
                <span className="text-xs font-black text-slate-900">{dateFilteredBookings.length} requests</span>
              </div>
            </div>

            {servicesDemandData.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 bg-slate-50/50">
                <Wrench className="size-8 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-slate-700">No Service Records in Selected Period</p>
                <p className="text-slate-400 mt-0.5">When bookings are created, top requested repair packages will rank here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {servicesDemandData.map((pkg) => {
                  const isTopRank = pkg.rank === 1
                  return (
                    <div
                      key={pkg.name}
                      className={cn(
                        "group relative rounded-none border p-3 sm:p-3.5 transition-all duration-200 hover:shadow-xs",
                        isTopRank
                          ? "border-indigo-200 bg-linear-to-r from-indigo-50/40 via-white to-slate-50/50"
                          : "border-slate-200/80 bg-white hover:bg-slate-50/40"
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                        {/* Left: Rank + Name + Category */}
                        <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                          <div
                            className={cn(
                              "size-7 sm:size-8 shrink-0 flex items-center justify-center font-black text-xs rounded-none shadow-2xs",
                              isTopRank
                                ? "bg-[#081F5C] text-white ring-2 ring-indigo-200"
                                : pkg.rank === 2
                                ? "bg-slate-800 text-white"
                                : pkg.rank === 3
                                ? "bg-slate-700 text-white"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            )}
                          >
                            #{pkg.rank}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                {pkg.name}
                              </h4>
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 border border-slate-200 uppercase tracking-wider">
                                {pkg.category}
                              </span>
                              {isTopRank && (
                                <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 border border-amber-300 inline-flex items-center gap-0.5">
                                  <Award className="size-2.5 text-amber-600" />
                                  #1 Demand
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                              <span>
                                <strong className="text-slate-900 font-bold">{pkg.count}</strong> requests ({pkg.sharePercent}% of total)
                              </span>
                              <span>•</span>
                              <span>
                                <strong className="text-emerald-700 font-bold">{pkg.completedCount}</strong> completed
                              </span>
                              {pkg.activeCount > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-indigo-600 font-bold">{pkg.activeCount} in progress</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Revenue & Avg Ticket */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 border-t sm:border-t-0 border-slate-100 pt-1.5 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Generated Revenue</span>
                            <span className="text-xs sm:text-sm font-black text-emerald-700 tabular-nums">
                              {currencyPHP(pkg.revenue)}
                            </span>
                          </div>
                          {pkg.avgTicket > 0 && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              Avg: {currencyPHP(pkg.avgTicket)} / job
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Comparative Progress Bar */}
                      <div className="mt-2.5 w-full bg-slate-100 h-1.5 rounded-none overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all duration-500",
                            isTopRank
                              ? "bg-linear-to-r from-[#081F5C] to-indigo-600"
                              : "bg-linear-to-r from-slate-600 to-[#081F5C]"
                          )}
                          style={{ width: `${Math.max(pkg.relativePercent, 6)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: TECHNICIANS' PERFORMANCE */}
      {activeTab === "technicians" && (
        <div className="space-y-4">
          {/* Technicians Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {technicianReports.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-white rounded-none border border-slate-200 text-slate-400 text-xs">
                No technicians or mechanics registered to this shop yet.
              </div>
            ) : (
              technicianReports.map((tech, idx) => (
                <div
                  key={tech.id + idx}
                  className="rounded-none bg-white p-3.5 shadow-xs border border-slate-200 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="size-9 rounded-none bg-[#081F5C] text-white flex items-center justify-center font-black text-xs">
                        {tech.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{tech.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{tech.role}</p>
                      </div>
                    </div>
                    {idx === 0 && tech.completedCount > 0 && (
                      <span className="inline-flex items-center gap-1 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 uppercase tracking-wider">
                        <Award className="size-3" />
                        Top Tech
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 py-2 border-y border-slate-100 text-center text-xs">
                    <div className="bg-slate-50 p-1.5 border border-slate-200/50">
                      <p className="text-[9px] uppercase font-bold text-slate-400">Assigned</p>
                      <p className="font-black text-slate-900">{tech.assignedCount}</p>
                    </div>
                    <div className="bg-emerald-50/60 p-1.5 border border-emerald-200/50">
                      <p className="text-[9px] uppercase font-bold text-emerald-700">Completed</p>
                      <p className="font-black text-emerald-700">{tech.completedCount}</p>
                    </div>
                    <div className="bg-blue-50/60 p-1.5 border border-blue-200/50">
                      <p className="text-[9px] uppercase font-bold text-blue-700">Rate</p>
                      <p className="font-black text-blue-700">{tech.completionRate}%</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <div>
                      <span className="text-slate-500 text-[10px]">Revenue: </span>
                      <span className="font-bold text-slate-900">{currencyPHP(tech.revenueGenerated)}</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-amber-200 px-1.5 py-0.5 text-amber-700 text-xs font-bold shadow-2xs">
                      <Star className="size-3 fill-amber-400 text-amber-400" />
                      <span>{tech.avgRating}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Full Technician Comparison Table */}
          <div className="rounded-none bg-white p-4 shadow-xs border border-slate-200">
            <div className="mb-2">
              <p className="text-sm font-semibold text-slate-900">Technician Staff Workload & Performance Summary</p>
              <p className="text-xs text-slate-500">Comprehensive breakdown for all shop employees and affiliated mechanics</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5">Technician Name</th>
                    <th className="px-3.5 py-2.5">Role</th>
                    <th className="px-3.5 py-2.5">Phone</th>
                    <th className="px-3.5 py-2.5 text-center">Assigned</th>
                    <th className="px-3.5 py-2.5 text-center">Completed</th>
                    <th className="px-3.5 py-2.5 text-center">Active</th>
                    <th className="px-3.5 py-2.5 text-center">Success %</th>
                    <th className="px-3.5 py-2.5">Revenue Earned</th>
                    <th className="px-3.5 py-2.5 text-right">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {technicianReports.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-2.5 font-bold text-slate-900">{t.name}</td>
                      <td className="px-3.5 py-2.5 text-slate-600">{t.role}</td>
                      <td className="px-3.5 py-2.5 text-slate-500">{t.phone}</td>
                      <td className="px-3.5 py-2.5 text-center font-bold text-slate-900">{t.assignedCount}</td>
                      <td className="px-3.5 py-2.5 text-center font-bold text-emerald-600">{t.completedCount}</td>
                      <td className="px-3.5 py-2.5 text-center font-bold text-blue-600">{t.workingCount}</td>
                      <td className="px-3.5 py-2.5 text-center">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px]">
                          {t.completionRate}%
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-bold text-slate-900">{currencyPHP(t.revenueGenerated)}</td>
                      <td className="px-3.5 py-2.5 text-right">
                        <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                          <Star className="size-3 fill-amber-400 text-amber-400" />
                          {t.avgRating}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSACTION & SERVICE LEDGER */}
      {activeTab === "ledger" && (
        <section className="rounded-none bg-white p-4 shadow-xs border border-slate-200">
          <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Shop Service & Transaction Ledger</h3>
              <p className="text-xs text-slate-500">Itemized audit of customer bookings, fees, and assigned technicians</p>
            </div>

            {/* Table Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search booking, customer..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-none border border-slate-200 bg-white text-slate-900 w-44 sm:w-56 focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="text-xs px-2.5 py-1.5 rounded-none border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="working">In Progress</option>
                <option value="confirmed">Confirmed</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value)
                  setCurrentPage(1)
                }}
                className="text-xs px-2.5 py-1.5 rounded-none border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5">Booking ID</th>
                  <th className="px-3.5 py-2.5">Date</th>
                  <th className="px-3.5 py-2.5">Customer</th>
                  <th className="px-3.5 py-2.5">Assigned Tech</th>
                  <th className="px-3.5 py-2.5">Service</th>
                  <th className="px-3.5 py-2.5">Labor</th>
                  <th className="px-3.5 py-2.5">Parts</th>
                  <th className="px-3.5 py-2.5">Total (PHP)</th>
                  <th className="px-3.5 py-2.5">Status</th>
                  <th className="px-3.5 py-2.5">Payment</th>
                  <th className="px-3.5 py-2.5 text-right">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-3.5 py-8 text-center text-slate-400">
                      No matching booking records found.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((b) => {
                    const amt = calculateBookingAmount(b)
                    const st = normalizeStatus(b.status)
                    return (
                      <tr key={b._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3.5 py-2.5 font-mono font-bold text-slate-700">
                          BK-{String(b._id || "").slice(-6).toUpperCase()}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600 whitespace-nowrap">
                          {formatDateDisplay(b.preferredDate || b.createdAt)}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <p className="font-bold text-slate-900">{b.contactName || b.customer?.fullName || "Customer"}</p>
                          <p className="text-[10px] text-slate-500">{b.contactPhone || ""}</p>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-800 font-medium">
                          {b.assignedTechnicianName || b.assignedTechnician?.fullName || "Unassigned"}
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-800">
                          {b.shopService?.name || "Repair Service"}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600">
                          ₱{Number(b.serviceFeeLaborRateAtCalc || 0).toLocaleString()}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600">
                          ₱{Number(b.serviceFeeMaterialsAmount || 0).toLocaleString()}
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-slate-900">
                          {currencyPHP(amt)}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-none border",
                              st === "completed"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : st === "working"
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : st === "confirmed"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : st === "cancelled"
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            )}
                          >
                            {st}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 text-[10px] font-bold uppercase",
                              b.paymentStatus === "paid" ? "text-emerald-700 bg-emerald-50" : "text-slate-500 bg-slate-100"
                            )}
                          >
                            {b.paymentStatus || "unpaid"}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          {b.customerReviewRating ? (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                              <Star className="size-3 fill-amber-400 text-amber-400" />
                              {b.customerReviewRating}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 text-xs text-slate-500">
              <p>
                Page <span className="font-bold text-slate-900">{currentPage}</span> of{" "}
                <span className="font-bold text-slate-900">{totalPages}</span>
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-7 text-xs px-2.5 rounded-none cursor-pointer"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-7 text-xs px-2.5 rounded-none cursor-pointer"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  )
}

export default function ReportsAnalyticsPage() {
  return (
    <ShopOwnerDashboard activeSection="reportsAnalytics">
      <ReportsAnalyticsContent />
    </ShopOwnerDashboard>
  )
}
