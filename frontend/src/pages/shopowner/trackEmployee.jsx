import { useCallback, useEffect, useMemo, useState } from 'react'
import ShopOwnerDashboard from './dashboard.jsx'
import ShopAddressGoogleMap from '../../components/ShopAddressGoogleMap.jsx'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { cn } from '../../lib/utils'
import {
  Activity,
  CheckCircle2,
  Clock,
  Eye,
  MapPin,
  Navigation,
  Phone,
  Radio,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Store,
  UserCheck,
  Users,
  Wrench,
} from 'lucide-react'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/** Mock technician locations in Marinduque for live map demonstration */
const MOCK_GPS_OFFSETS = [
  { lat: 13.4447, lng: 121.8415, locationName: 'Boac, Marinduque' },
  { lat: 13.3242, lng: 122.0167, locationName: 'Gasan, Marinduque' },
  { lat: 13.2389, lng: 122.0305, locationName: 'Buenavista, Marinduque' },
  { lat: 13.4356, lng: 121.9023, locationName: 'Mogpog, Marinduque' },
  { lat: 13.3855, lng: 122.0911, locationName: 'Torrijos, Marinduque' },
]

export function TrackEmployeePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [employees, setEmployees] = useState([])
  const [bookings, setBookings] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedTech, setSelectedTech] = useState(null)
  const [detailModalTech, setDetailModalTech] = useState(null)
  const [lastRefreshed, setLastRefreshed] = useState(new Date())

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [empRes, bookRes] = await Promise.all([
        fetch(`${API_URL}/api/catalog/employees`, { headers: authHeaders() }).catch(() => null),
        fetch(`${API_URL}/api/catalog/bookings`, { headers: authHeaders() }).catch(() => null),
      ])

      let empData = []
      if (empRes && empRes.ok) {
        const d = await empRes.json()
        empData = Array.isArray(d) ? d : Array.isArray(d?.employees) ? d.employees : []
      }

      let bookData = []
      if (bookRes && bookRes.ok) {
        const b = await bookRes.json()
        bookData = Array.isArray(b) ? b : Array.isArray(b?.bookings) ? b.bookings : []
      }

      setEmployees(empData)
      setBookings(bookData)
      setLastRefreshed(new Date())
    } catch (e) {
      setError(e?.message || 'Could not load employee tracking data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /** Merge employee profiles with active assigned bookings & GPS status */
  const trackedTechnicians = useMemo(() => {
    const list = employees.length > 0 ? employees : []

    return list.map((emp, index) => {
      const empId = String(emp.id || emp._id)
      const empName = emp.name || emp.fullName || 'Technician'

      // Find active job assigned to this employee
      const activeJob = bookings.find((b) => {
        const isAssigned =
          b.technicianId === empId ||
          (Array.isArray(b.technicianIds) && b.technicianIds.includes(empId))
        const isActiveStatus = ['confirmed', 'in_progress', 'working'].includes(b.status)
        return isAssigned && isActiveStatus
      })

      // Fallback completed or pending job
      const recentJob =
        activeJob ||
        bookings.find((b) => {
          return (
            b.technicianId === empId ||
            (Array.isArray(b.technicianIds) && b.technicianIds.includes(empId))
          )
        })

      const mockGps = MOCK_GPS_OFFSETS[index % MOCK_GPS_OFFSETS.length]
      let trackingStatus = 'available'
      let statusLabel = 'Available / Idle'
      let statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200'

      if (activeJob) {
        if (activeJob.serviceMode === 'home') {
          if (activeJob.status === 'working' || activeJob.status === 'in_progress') {
            trackingStatus = 'on_site'
            statusLabel = 'On-Site (Home Service)'
            statusColor = 'bg-indigo-50 text-indigo-700 border-indigo-200'
          } else {
            trackingStatus = 'en_route'
            statusLabel = 'En Route to Customer'
            statusColor = 'bg-amber-50 text-amber-800 border-amber-200'
          }
        } else {
          trackingStatus = 'in_shop'
          statusLabel = 'In-Shop Working'
          statusColor = 'bg-blue-50 text-blue-700 border-blue-200'
        }
      } else if (emp.status === 'inactive' || emp.shopManagedStatus === 'inactive') {
        trackingStatus = 'off_duty'
        statusLabel = 'Off-Duty'
        statusColor = 'bg-slate-100 text-slate-600 border-slate-200'
      }

      return {
        id: empId,
        name: empName,
        role: emp.role || emp.shopJobTitle || 'Mechanic / Technician',
        phone: emp.phone || emp.phoneNumber || '—',
        email: emp.email || '—',
        trackingStatus,
        statusLabel,
        statusColor,
        locationName: activeJob?.serviceAddress || mockGps.locationName,
        gps: {
          lat: activeJob?.serviceLatitude || mockGps.lat,
          lng: activeJob?.serviceLongitude || mockGps.lng,
        },
        activeJob: activeJob
          ? {
              ref: activeJob.ref || activeJob.id,
              serviceName: activeJob.shopService?.name || 'Service Request',
              customerName: activeJob.contactName || 'Customer',
              customerPhone: activeJob.contactPhone || '—',
              address: activeJob.serviceAddress || 'In-Shop',
              preferredTime: activeJob.preferredTime || 'Today',
              serviceMode: activeJob.serviceMode || 'shop',
            }
          : null,
        recentJob: recentJob ? { ref: recentJob.ref || recentJob.id } : null,
      }
    })
  }, [employees, bookings])

  /** Filter technicians based on search & status filter */
  const filteredTechnicians = useMemo(() => {
    return trackedTechnicians.filter((t) => {
      const matchQuery =
        !searchTerm.trim() ||
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.activeJob?.customerName && t.activeJob.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.activeJob?.ref && String(t.activeJob.ref).toLowerCase().includes(searchTerm.toLowerCase()))

      const matchStatus = statusFilter === 'all' || t.trackingStatus === statusFilter
      return matchQuery && matchStatus
    })
  }, [trackedTechnicians, searchTerm, statusFilter])

  // Automatically select first technician for map focus if none selected
  useEffect(() => {
    if (!selectedTech && filteredTechnicians.length > 0) {
      setSelectedTech(filteredTechnicians[0])
    }
  }, [filteredTechnicians, selectedTech])

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = trackedTechnicians.length
    const onField = trackedTechnicians.filter((t) => t.trackingStatus === 'on_site' || t.trackingStatus === 'en_route').length
    const inShop = trackedTechnicians.filter((t) => t.trackingStatus === 'in_shop').length
    const available = trackedTechnicians.filter((t) => t.trackingStatus === 'available').length
    return { total, onField, inShop, available }
  }, [trackedTechnicians])

  return (
    <ShopOwnerDashboard
      activeSection="track-employee"
      pageMeta={{
        title: 'Track Employees',
        description: 'Live real-time GPS tracking and activity dispatch for your mechanics and technicians.',
      }}
    >
      <main className="w-full space-y-4 max-w-[1440px] mx-auto">
        {/* Header Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
              <Radio className="size-5 text-indigo-600 animate-pulse" />
              <span>Live Employee Tracking & Dispatch</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Real-time locations, field dispatch routes, and job assignment statuses.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 font-medium">
              Updated: {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="rounded-none border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
            >
              <RotateCcw className={cn('mr-1.5 size-3.5', loading && 'animate-spin')} />
              <span>Refresh Feed</span>
            </Button>
          </div>
        </div>

        {/* 4 KPI Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="rounded-none border border-slate-200 bg-white p-3.5 shadow-[0_3px_8px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">Total Staff</span>
              <Users className="size-4 text-indigo-600" />
            </div>
            <p className="text-xl font-black text-slate-900 mt-1">{metrics.total}</p>
            <span className="text-[10px] text-slate-500 font-medium">Registered in shop</span>
          </Card>

          <Card className="rounded-none border border-slate-200 bg-white p-3.5 shadow-[0_3px_8px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">On Field / En Route</span>
              <Navigation className="size-4 text-amber-600" />
            </div>
            <p className="text-xl font-black text-amber-900 mt-1">{metrics.onField}</p>
            <span className="text-[10px] text-slate-500 font-medium">Home service dispatch</span>
          </Card>

          <Card className="rounded-none border border-slate-200 bg-white p-3.5 shadow-[0_3px_8px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-800">In-Shop Working</span>
              <Wrench className="size-4 text-blue-600" />
            </div>
            <p className="text-xl font-black text-blue-900 mt-1">{metrics.inShop}</p>
            <span className="text-[10px] text-slate-500 font-medium">Active shop repair</span>
          </Card>

          <Card className="rounded-none border border-slate-200 bg-white p-3.5 shadow-[0_3px_8px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">Available / Idle</span>
              <UserCheck className="size-4 text-emerald-600" />
            </div>
            <p className="text-xl font-black text-emerald-900 mt-1">{metrics.available}</p>
            <span className="text-[10px] text-slate-500 font-medium">Ready for assignment</span>
          </Card>
        </div>

        {/* Filter Controls & Search Bar (myBookings.jsx style) */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Status Button Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {[
              { key: 'all', label: 'All Staff' },
              { key: 'on_site', label: 'On-Site' },
              { key: 'en_route', label: 'En Route' },
              { key: 'in_shop', label: 'In-Shop' },
              { key: 'available', label: 'Available' },
            ].map((st) => {
              const count =
                st.key === 'all'
                  ? metrics.total
                  : trackedTechnicians.filter((t) => t.trackingStatus === st.key).length

              return (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setStatusFilter(st.key)}
                  className={cn(
                    "px-3.5 py-2.5 text-xs font-bold rounded-none border-0 transition-all cursor-pointer whitespace-nowrap",
                    statusFilter === st.key
                      ? "bg-gradient-to-r from-[#081F5C] to-[#123B9B] text-white shadow-md shadow-[#081F5C]/35"
                      : "bg-white text-slate-700 hover:bg-slate-50 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.16)]"
                  )}
                >
                  {st.label} ({count})
                </button>
              )
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-[380px] md:w-[440px] shrink-0">
            <input
              type="text"
              placeholder="Search technician or job ref..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-none border-0 bg-white px-4 py-2.5 pr-12 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none shadow-[0_4px_20px_-4px_rgba(15,23,42,0.16)] transition-shadow duration-200 focus:shadow-[0_4px_24px_-4px_rgba(8,31,92,0.28)] font-medium"
            />
            <button
              type="button"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-none bg-gradient-to-r from-[#081F5C] to-[#123B9B] p-2 text-white shadow-md shadow-[#081F5C]/30 transition-all hover:from-[#0A2870] hover:to-[#1048BE] cursor-pointer"
            >
              <Search className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Main Content Split View (Left: Employee Cards List, Right: Live Map Box) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {/* Left Column: Technicians List */}
          <div className="lg:col-span-6 space-y-3">
            {loading ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-none border border-dashed border-slate-300 bg-white p-6 text-center">
                <Activity className="size-8 animate-spin text-indigo-600 mb-2" />
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">Loading tracking data...</p>
              </div>
            ) : filteredTechnicians.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center rounded-none border border-dashed border-slate-300 bg-white p-6 text-center shadow-2xs">
                <Users className="size-8 text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">No technicians found</p>
                <p className="text-xs text-slate-500 mt-1">Try adjusting your search query or status filter.</p>
              </div>
            ) : (
              filteredTechnicians.map((tech) => {
                const isSelected = selectedTech?.id === tech.id
                return (
                  <article
                    key={tech.id}
                    onClick={() => setSelectedTech(tech)}
                    className={cn(
                      'rounded-none border bg-white p-4 shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all cursor-pointer space-y-3',
                      isSelected
                        ? 'border-[#081F5C] ring-1 ring-[#081F5C] bg-slate-50/50'
                        : 'border-slate-200 hover:border-indigo-400'
                    )}
                  >
                    {/* Top Row Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-none bg-indigo-600 font-bold text-white text-xs shadow-2xs">
                          {tech.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900">{tech.name}</h3>
                          <p className="text-xs text-slate-500 font-semibold">{tech.role}</p>
                        </div>
                      </div>

                      <Badge className={cn('rounded-none text-[10px] uppercase font-bold px-2 py-0.5 border', tech.statusColor)}>
                        {tech.statusLabel}
                      </Badge>
                    </div>

                    {/* Live Assignment Info Box */}
                    {tech.activeJob ? (
                      <div className="bg-slate-50 p-3 border border-slate-200/90 space-y-1.5 rounded-none text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-900 border-b border-slate-200/60 pb-1">
                          <span className="flex items-center gap-1.5 text-indigo-700">
                            <Wrench className="size-3.5" />
                            <span>{tech.activeJob.serviceName}</span>
                          </span>
                          <span className="font-mono text-[11px] text-slate-600 bg-white px-1.5 py-0.5 border border-slate-200">
                            Ref: #{tech.activeJob.ref}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-0.5">
                          <div>
                            <span className="text-slate-500 font-medium block">Customer:</span>
                            <span className="font-bold text-slate-800">{tech.activeJob.customerName}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium block">Schedule:</span>
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <Clock className="size-3 text-indigo-600" />
                              {tech.activeJob.preferredTime}
                            </span>
                          </div>
                        </div>
                        {tech.activeJob.address && (
                          <div className="text-[11px] pt-0.5">
                            <span className="text-slate-500 font-medium block">Destination / Address:</span>
                            <span className="font-semibold text-slate-700 flex items-center gap-1 truncate">
                              <MapPin className="size-3 text-rose-500 shrink-0" />
                              {tech.activeJob.address}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-2.5 border border-slate-200/70 rounded-none text-xs text-slate-500 italic">
                        No active job currently assigned. Available for next dispatch.
                      </div>
                    )}

                    {/* Footer Controls */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="size-3 text-slate-400" />
                        <span>{tech.locationName}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        {tech.phone && tech.phone !== '—' && (
                          <a
                            href={`tel:${tech.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-none border border-slate-300 transition-colors"
                          >
                            <Phone className="size-3 text-indigo-600" />
                            <span>Call</span>
                          </a>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDetailModalTech(tech)
                          }}
                          className="h-7 rounded-none border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                        >
                          <Eye className="mr-1 size-3 text-indigo-600" />
                          <span>Details</span>
                        </Button>
                      </div>
                    </div>
                  </article>
                )
              })
            )}
          </div>

          {/* Right Column: Live GPS Map & Selected Focus */}
          <div className="lg:col-span-6 space-y-3.5 lg:sticky lg:top-4 lg:self-start">
            <Card className="rounded-none border border-slate-200 bg-white p-0 shadow-[0_3px_8px_rgba(15,23,42,0.14)]">
              <CardHeader className="border-b border-slate-100 bg-slate-50/80 p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#081F5C]">
                    <Navigation className="size-4" />
                    <CardTitle className="text-xs font-black uppercase tracking-wider">
                      Live GPS Map View
                    </CardTitle>
                  </div>
                  {selectedTech && (
                    <Badge className="rounded-none text-[10px] font-bold uppercase bg-indigo-50 text-indigo-800 border border-indigo-200">
                      Focus: {selectedTech.name}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3.5 space-y-3">
                {selectedTech ? (
                  <>
                    <ShopAddressGoogleMap
                      addressParts={{
                        detailedAddress: selectedTech.activeJob?.address || selectedTech.locationName,
                        cityMunicipality: selectedTech.locationName,
                      }}
                      mapTitle={`${selectedTech.name} (${selectedTech.statusLabel})`}
                      secondaryPin={
                        selectedTech.activeJob
                          ? { lat: selectedTech.gps.lat + 0.005, lng: selectedTech.gps.lng + 0.005, label: selectedTech.activeJob.customerName }
                          : null
                      }
                      showRouteLine={!!selectedTech.activeJob}
                    />

                    {/* Technician Summary Card Box */}
                    <div className="bg-slate-900 text-white p-3.5 rounded-none space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div>
                          <p className="font-black text-sm text-white">{selectedTech.name}</p>
                          <p className="text-[11px] text-slate-400">{selectedTech.role}</p>
                        </div>
                        <Badge className={cn('rounded-none text-[10px] uppercase font-bold px-2 py-0.5 border', selectedTech.statusColor)}>
                          {selectedTech.statusLabel}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-0.5">
                        <div>
                          <span className="text-slate-400 font-medium block">Current Position:</span>
                          <span className="font-semibold text-white truncate block">{selectedTech.locationName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium block">Contact Phone:</span>
                          <span className="font-semibold text-white block">{selectedTech.phone}</span>
                        </div>
                      </div>

                      {selectedTech.activeJob && (
                        <div className="border-t border-slate-800 pt-2 flex items-center justify-between text-[11px]">
                          <span className="text-indigo-300 font-bold">Job Ref: #{selectedTech.activeJob.ref}</span>
                          <a
                            href={`https://www.google.com/maps?q=${selectedTech.gps.lat},${selectedTech.gps.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:underline font-bold flex items-center gap-1"
                          >
                            <MapPin className="size-3" />
                            <span>Open Google Maps</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[350px] flex-col items-center justify-center text-center p-6 bg-slate-50 border border-slate-200">
                    <Store className="size-8 text-slate-400 mb-2" />
                    <p className="text-xs font-bold text-slate-700">Select a technician from the list to view map tracking.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Detailed Technician Activity Sheet Modal */}
        <Dialog open={!!detailModalTech} onOpenChange={() => setDetailModalTech(null)}>
          <DialogContent className="max-w-md rounded-none border border-slate-300 p-0 shadow-lg">
            <DialogHeader className="border-b border-slate-100 bg-slate-50/80 p-4">
              <DialogTitle className="text-base font-black text-slate-900 flex items-center gap-2">
                <UserCheck className="size-5 text-indigo-600" />
                <span>Technician Activity & Job Details</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Detailed assignment sheet and status timeline for {detailModalTech?.name}.
              </DialogDescription>
            </DialogHeader>

            {detailModalTech && (
              <div className="p-4 space-y-3.5 text-xs">
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200">
                  <div className="flex size-11 items-center justify-center bg-indigo-600 text-white font-bold text-sm">
                    {detailModalTech.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-sm text-slate-900">{detailModalTech.name}</p>
                    <p className="text-xs font-semibold text-slate-600">{detailModalTech.role}</p>
                    <p className="text-[11px] text-slate-500">{detailModalTech.phone} · {detailModalTech.email}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Current Status</span>
                  <div className="p-2.5 border border-slate-200 bg-white flex items-center justify-between">
                    <span className="font-bold text-slate-800">{detailModalTech.statusLabel}</span>
                    <Badge className={cn('rounded-none text-[10px] uppercase font-bold', detailModalTech.statusColor)}>
                      Active
                    </Badge>
                  </div>
                </div>

                {detailModalTech.activeJob ? (
                  <div className="space-y-1.5">
                    <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Assigned Job Breakdown</span>
                    <div className="p-3 border border-slate-200 bg-slate-50/80 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                        <span className="font-bold text-indigo-700">{detailModalTech.activeJob.serviceName}</span>
                        <span className="font-mono text-[11px] text-slate-700 bg-white px-1.5 py-0.5 border border-slate-200">
                          Ref: #{detailModalTech.activeJob.ref}
                        </span>
                      </div>
                      <p className="text-slate-700"><strong>Customer:</strong> {detailModalTech.activeJob.customerName}</p>
                      <p className="text-slate-700"><strong>Schedule:</strong> {detailModalTech.activeJob.preferredTime}</p>
                      <p className="text-slate-700"><strong>Service Mode:</strong> {detailModalTech.activeJob.serviceMode === 'home' ? 'Home Service Dispatch' : 'In-Shop Visit'}</p>
                      <p className="text-slate-700"><strong>Address:</strong> {detailModalTech.activeJob.address}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                    <CheckCircle2 className="size-4 inline mr-1 text-emerald-600" />
                    Technician is available for assignment on incoming customer booking requests.
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDetailModalTech(null)}
                    className="rounded-none border-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Close Sheet
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </ShopOwnerDashboard>
  )
}

export default TrackEmployeePage
