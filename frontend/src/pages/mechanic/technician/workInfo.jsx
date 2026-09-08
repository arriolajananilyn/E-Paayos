import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../components/ui/dialog'
import { Input } from '../../../components/ui/input'
import { Label } from '../../../components/ui/label'
import { Textarea } from '../../../components/ui/textarea'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
} from '../../../components/ui/sidebar'
import { TooltipProvider } from '../../../components/ui/tooltip'
import {
  BadgeCheck,
  Bell,
  Bike,
  Briefcase,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Edit3,
  FileText,
  History,
  Home,
  Layers,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Settings,
  ShieldCheck,
  Smartphone,
  Store,
  User,
  WashingMachine,
  Wrench,
} from 'lucide-react'
import Elogo from '../../../assets/Elogo.png'
import { API_URL, MechanicMobileNav, MechanicTopBar, authHeaders } from './mechanicBookingShared.jsx'
import { useLogoutConfirmation } from '@/hooks/useLogoutConfirmation.jsx'

const navyDeep = '#04133d'
const navy = '#081F5C'
const navyMuted = '#0b2b73'
const navyBright = '#1447a6'
const pageBaseNavyGradient = `linear-gradient(145deg, ${navyDeep} 0%, ${navy} 35%, ${navyMuted} 65%, ${navyBright} 100%)`

const WORK_INFO_META = {
  title: 'Work Info',
  description: 'Manage your professional technician details, schedule, and assigned services.',
}
let mechanicTechnicianSidebarOpenState = false

const sidebarMenuButtonClass =
  'h-9 gap-3 rounded-sm px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap'

function categoryIcon(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return Bike
  if (normalized === 'gadget') return Smartphone
  if (normalized === 'appliance') return WashingMachine
  return Wrench
}

function MechanicTechnicianWorkInfo() {
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(mechanicTechnicianSidebarOpenState)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileMenuRef = useRef(null)

  // Booking stats and shop services
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [assignedServices, setAssignedServices] = useState([])

  // Edit Modal State
  const [editOpen, setEditOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [experience, setExperience] = useState('')
  const [schedule, setSchedule] = useState('')
  const [notes, setNotes] = useState('')
  const [savedSuccess, setSavedSuccess] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/mechanic/bookings`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(data?.bookings)) {
        setBookings(data.bookings)
        // Extract unique assigned services
        const svcsMap = new Map()
        for (const b of data.bookings) {
          if (b.shopService && b.shopService._id && !svcsMap.has(b.shopService._id)) {
            svcsMap.set(b.shopService._id, b.shopService)
          }
        }
        setAssignedServices(Array.from(svcsMap.values()))
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const raw = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!token || !raw) {
      window.location.hash = '#/login'
      return
    }
    try {
      const parsed = JSON.parse(raw)
      if (parsed.role !== 'mechanic-technician') {
        window.location.hash = '#/login'
        return
      }
      setUser(parsed)
      setPhone(parsed.phone || parsed.phoneNumber || '+63 917 892 4102')
      setSpecialization(parsed.specialization || 'Vehicle & Appliance Diagnostic Repair')
      setExperience(parsed.experience || '4+ Years Professional Practice')
      setSchedule(parsed.schedule || 'Mon - Sat (8:00 AM - 5:00 PM)')
      setNotes(parsed.notes || 'Specialized in multi-brand diagnostics, preventative maintenance, and component replacement.')
    } catch {
      window.location.hash = '#/login'
    }
  }, [])

  useEffect(() => {
    if (!user) return
    void loadData()
  }, [user, loadData])

  useEffect(() => {
    mechanicTechnicianSidebarOpenState = sidebarOpen
  }, [sidebarOpen])

  useEffect(() => {
    if (!profileOpen) return

    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [profileOpen])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.hash = '#/'
  }

  const { requestLogout, LogoutDialog } = useLogoutConfirmation(handleLogout)

  const shopName = useMemo(() => {
    return bookings[0]?.shopOwner?.shopName || user?.shopName || 'E-Paayos Partner Shop'
  }, [bookings, user])

  const handleSaveWorkInfo = () => {
    if (!user) return
    const updated = {
      ...user,
      phone,
      phoneNumber: phone,
      specialization,
      experience,
      schedule,
      notes,
    }
    setUser(updated)
    try {
      localStorage.setItem('user', JSON.stringify(updated))
    } catch { }
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3500)
    setEditOpen(false)
  }

  if (!user) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="h-svh max-h-svh min-h-0 w-full overflow-hidden" style={{ backgroundImage: pageBaseNavyGradient }}>
      <TooltipProvider delayDuration={0}>
        <SidebarProvider
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          className="h-svh max-h-svh min-h-0 w-full max-w-full overflow-hidden bg-transparent"
          style={{ '--sidebar': 'transparent', '--sidebar-width': '17.5rem', '--sidebar-width-icon': '3.35rem' }}
        >
          <Sidebar
            collapsible="icon"
            variant="inset"
            className="border-r-0"
            onMouseEnter={() => setSidebarOpen(true)}
            onMouseLeave={() => setSidebarOpen(false)}
          >
            <SidebarHeader className="gap-2 border-b border-sidebar-border/80 py-2 px-3">
              <div className="flex items-center gap-3 md:group-data-[collapsible=icon]:justify-center md:group-data-[collapsible=icon]:gap-0">
                <img
                  src={Elogo}
                  alt="E-Paayos icon"
                  className="h-14 w-14 min-h-14 min-w-14 -mt-1 flex-none object-contain"
                  decoding="async"
                />
                <div className="grid min-w-0 flex-1 text-left leading-tight md:group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-xl font-bold tracking-wide text-white">E-Paayos</span>
                </div>
              </div>
            </SidebarHeader>

            <SidebarContent className="gap-0 px-2 py-4">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-2.5">
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip="Dashboard"
                        onClick={() => {
                          window.location.hash = '#/mechanic/technician/dashboard'
                        }}
                        className={sidebarMenuButtonClass}
                      >
                        <LayoutDashboard className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Dashboard</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip="Assigned Request"
                        onClick={() => {
                          window.location.hash = '#/mechanic/technician/assigned-request'
                        }}
                        className={sidebarMenuButtonClass}
                      >
                        <ClipboardList className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Assigned Request</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip="Service History"
                        onClick={() => {
                          window.location.hash = '#/mechanic/technician/service-history'
                        }}
                        className={sidebarMenuButtonClass}
                      >
                        <History className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Service History</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip="Messages"
                        onClick={() => {
                          window.location.hash = '#/mechanic/technician/messages'
                        }}
                        className={sidebarMenuButtonClass}
                      >
                        <MessageSquare className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Messages</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive
                        tooltip="Work Info"
                        onClick={() => {
                          window.location.hash = '#/mechanic/technician/work-info'
                        }}
                        className={sidebarMenuButtonClass}
                      >
                        <Briefcase className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Work Info</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarSeparator className="mx-0 bg-sidebar-border/80" />

            <SidebarFooter className="gap-2 px-3 py-2 group-data-[collapsible=icon]:items-center">
              <div className="flex items-center gap-2 overflow-hidden rounded-sm border border-white/15 bg-white/10 px-2.5 py-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-1">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-[#081F5C]">
                  {(user.fullName || user.email || 'M').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-[11px] font-normal uppercase tracking-wide text-white/80">Mechanic / Technician</p>
                  <p className="truncate text-[11px] text-white/75">{user.email}</p>
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>

          <SidebarInset className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-linear-to-br from-blue-50 via-violet-100 to-indigo-100 dark:from-slate-900 dark:via-violet-950/40 dark:to-indigo-950/50">
            <MechanicTopBar
              title={WORK_INFO_META.title}
              description={WORK_INFO_META.description}
              user={user}
              profileOpen={profileOpen}
              setProfileOpen={setProfileOpen}
              profileMenuRef={profileMenuRef}
              requestLogout={requestLogout}
            />

            <div
              id="mechanic-main-scroll"
              className="scrollbar-hidden flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-y-auto overflow-x-hidden overscroll-contain p-3 sm:p-4 md:p-6"
            >
              <div className="w-full min-w-0 max-w-full space-y-3.5 sm:space-y-4">
                {savedSuccess ? (
                  <div className="flex items-center justify-between gap-2 rounded-none border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs font-bold text-emerald-800 shadow-2xs">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      <span>Work Information successfully updated!</span>
                    </span>
                  </div>
                ) : null}

                {/* Section Header & Action Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 border-b border-slate-200/80 pb-2.5 sm:pb-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-50">Work Information</h2>
                    <p className="text-[11px] sm:text-xs text-muted-foreground">Official technician profile and shop assignment details.</p>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void loadData()}
                      className="flex-1 sm:flex-initial h-8 sm:h-9 text-xs font-bold rounded-none border-slate-300 bg-white/90 text-slate-700 hover:bg-white shadow-2xs gap-1.5 cursor-pointer justify-center"
                    >
                      <RefreshCw className="size-3.5" />
                      <span>Refresh</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setEditOpen(true)}
                      className="flex-1 sm:flex-initial h-8 sm:h-9 text-xs font-bold rounded-none bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs gap-1.5 cursor-pointer justify-center"
                    >
                      <Edit3 className="size-3.5" />
                      <span>Edit Details</span>
                    </Button>
                  </div>
                </div>

                {/* 4 Main Structured Information Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  {/* Card 1: Basic & Professional Details */}
                  <Card className="rounded-none border border-slate-200 bg-white shadow-[0_3px_8px_rgba(15,23,42,0.12)] p-3.5 sm:p-5 space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 sm:pb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 sm:size-8 items-center justify-center bg-indigo-50 text-indigo-700 rounded-none border border-indigo-200">
                          <Briefcase className="size-3.5 sm:size-4" />
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Basic & Professional Details</h3>
                      </div>
                      <Badge className="rounded-none bg-indigo-100 text-indigo-800 border-indigo-300 text-[10px] uppercase font-bold">
                        Verified Technician
                      </Badge>
                    </div>

                    <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                        <div className="bg-slate-50 p-2.5 sm:p-3 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                            Full Name
                          </span>
                          <p className="font-extrabold text-slate-900">{user.fullName || 'Certified Technician'}</p>
                        </div>
                        <div className="bg-slate-50 p-2.5 sm:p-3 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                            Account Role
                          </span>
                          <p className="font-bold text-slate-800">Mechanic Technician</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                        <div className="bg-slate-50 p-2.5 sm:p-3 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                            Employee Badge ID
                          </span>
                          <p className="font-mono font-extrabold text-indigo-800">
                            TECH-{(user._id || user.id || '88421').slice(-6).toUpperCase()}
                          </p>
                        </div>
                        <div className="bg-slate-50 p-2.5 sm:p-3 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                            Shop Affiliation
                          </span>
                          <p className="font-bold text-slate-800">{shopName}</p>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2.5 sm:p-3 border border-slate-200 space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                          Primary Specialization
                        </span>
                        <p className="font-extrabold text-slate-900 text-xs sm:text-sm">{specialization}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                        <div className="bg-slate-50 p-2.5 sm:p-3 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block flex items-center gap-1">
                            <Clock className="size-3 text-indigo-600" />
                            <span>Experience</span>
                          </span>
                          <p className="font-bold text-slate-800">{experience}</p>
                        </div>
                        <div className="bg-slate-50 p-2.5 sm:p-3 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block flex items-center gap-1">
                            <ShieldCheck className="size-3 text-emerald-600" />
                            <span>Certification</span>
                          </span>
                          <p className="font-bold text-emerald-800">TESDA NC II Certified</p>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Card 2: Shift Schedule & Operating Availability */}
                  <Card className="rounded-none border border-slate-200 bg-white shadow-[0_3px_8px_rgba(15,23,42,0.12)] p-3.5 sm:p-5 space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 sm:pb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 sm:size-8 items-center justify-center bg-indigo-50 text-indigo-700 rounded-none border border-indigo-200">
                          <Calendar className="size-3.5 sm:size-4" />
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Shift Schedule & Availability</h3>
                      </div>
                      <Badge className="rounded-none bg-sky-100 text-sky-800 border-sky-300 text-[10px] uppercase font-bold">
                        Full-Time
                      </Badge>
                    </div>

                    <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
                      <div className="bg-slate-50 p-2.5 sm:p-3 border border-slate-200 space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block flex items-center gap-1">
                          <CalendarClock className="size-3 text-indigo-600" />
                          <span>Standard Shift Hours</span>
                        </span>
                        <p className="font-extrabold text-slate-900 text-xs sm:text-sm">{schedule}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                        <div className="bg-slate-50 p-2.5 sm:p-3 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block flex items-center gap-1">
                            <Store className="size-3 text-indigo-600" />
                            <span>Primary Work Hub</span>
                          </span>
                          <p className="font-bold text-slate-800">{shopName}</p>
                        </div>
                        <div className="bg-slate-50 p-2.5 sm:p-3 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block flex items-center gap-1">
                            <MapPin className="size-3 text-rose-500" />
                            <span>Service Capabilities</span>
                          </span>
                          <p className="font-bold text-slate-800">In-Shop Repair & Home Visits</p>
                        </div>
                      </div>

                      <div className="bg-emerald-50/80 p-2.5 sm:p-3 border border-emerald-200 text-emerald-950 space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block flex items-center gap-1">
                          <CheckCircle2 className="size-3 text-emerald-600" />
                          <span>Duty Status</span>
                        </span>
                        <p className="text-xs font-semibold">
                          Active · Ready to receive confirmed customer booking assignments.
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Card 3: Contact Information & Notes */}
                  <Card className="rounded-none border border-slate-200 bg-white shadow-[0_3px_8px_rgba(15,23,42,0.12)] p-3.5 sm:p-5 space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 sm:pb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 sm:size-8 items-center justify-center bg-indigo-50 text-indigo-700 rounded-none border border-indigo-200">
                          <User className="size-3.5 sm:size-4" />
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Contact Details & Summary</h3>
                      </div>
                      <Badge className="rounded-none bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] uppercase font-bold">
                        Verified Profile
                      </Badge>
                    </div>

                    <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                        <div className="bg-slate-50 p-2.5 sm:p-3 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block flex items-center gap-1">
                            <Phone className="size-3 text-indigo-600" />
                            <span>Contact Phone</span>
                          </span>
                          <p className="font-mono font-bold text-slate-900">{phone}</p>
                        </div>
                        <div className="bg-slate-50 p-2.5 sm:p-3 border border-slate-200 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block flex items-center gap-1">
                            <Mail className="size-3 text-indigo-600" />
                            <span>Email Address</span>
                          </span>
                          <p className="font-mono font-bold text-slate-900 truncate">{user.email}</p>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2.5 sm:p-3 border border-slate-200 space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                          Technician Summary / Bio Notes
                        </span>
                        <p className="text-xs text-slate-700 italic leading-relaxed">"{notes}"</p>
                      </div>
                    </div>
                  </Card>

                  {/* Card 4: Assigned Shop Service Catalog */}
                  <Card className="rounded-none border border-slate-200 bg-white shadow-[0_3px_8px_rgba(15,23,42,0.12)] p-3.5 sm:p-5 space-y-3 sm:space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 sm:pb-3">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 sm:size-8 items-center justify-center bg-indigo-50 text-indigo-700 rounded-none border border-indigo-200">
                          <Layers className="size-3.5 sm:size-4" />
                        </div>
                        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">Assigned Services ({assignedServices.length})</h3>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void loadData()}
                        className="h-7 text-xs font-bold rounded-none border-slate-300 cursor-pointer gap-1"
                      >
                        <RefreshCw className="size-3" />
                        <span>Refresh</span>
                      </Button>
                    </div>

                    <div className="space-y-2 sm:space-y-2.5">
                      {loading ? (
                        <div className="flex min-h-[120px] flex-col items-center justify-center rounded-none border border-dashed border-slate-300 p-4 text-center">
                          <Loader2 className="mb-2 size-6 animate-spin text-[#081F5C]" />
                          <p className="text-xs font-bold text-slate-700">Loading assigned services…</p>
                        </div>
                      ) : assignedServices.length === 0 ? (
                        <div className="flex min-h-[120px] flex-col items-center justify-center rounded-none border border-dashed border-slate-300 p-4 text-center">
                          <ClipboardCheck className="size-8 text-slate-400 mb-1" />
                          <p className="text-xs font-bold text-slate-800">All Shop Listings Available</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            You are eligible to be assigned by the shop owner on any customer service booking.
                          </p>
                        </div>
                      ) : (
                        assignedServices.map((svc) => {
                          const IconComp = categoryIcon(svc.category)
                          return (
                            <div key={svc._id} className="flex items-center justify-between gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-none">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex size-7 sm:size-8 items-center justify-center bg-indigo-100 text-indigo-800 rounded-none shrink-0">
                                  <IconComp className="size-3.5 sm:size-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-extrabold text-slate-900 truncate">{svc.name || 'Service Listing'}</p>
                                  <p className="text-[11px] text-slate-500 font-medium capitalize">{svc.category || 'General Repair'}</p>
                                </div>
                              </div>
                              <Badge className="rounded-none bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] uppercase font-bold shrink-0">
                                Assigned
                              </Badge>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>

      {/* Edit Work Details Modal Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-none border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl sm:max-w-lg max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full" showCloseButton>
          <DialogHeader className="shrink-0 border-b border-slate-100 pb-2.5 sm:pb-3">
            <DialogTitle className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Edit3 className="size-4 sm:size-5 text-indigo-600" />
              <span>Edit Professional Work Info</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              Update your contact info, primary specialization, work shift hours, and technician notes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 text-xs sm:text-sm py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-phone" className="text-xs font-extrabold uppercase text-slate-700">
                Contact Phone Number
              </Label>
              <Input
                id="edit-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+63 9XX XXX XXXX"
                className="rounded-none border-slate-300 text-xs font-mono"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="edit-spec" className="text-xs font-extrabold uppercase text-slate-700">
                Primary Specialization
              </Label>
              <Input
                id="edit-spec"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                placeholder="e.g. Vehicle Diagnostics & Overhaul"
                className="rounded-none border-slate-300 text-xs font-medium"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="edit-exp" className="text-xs font-extrabold uppercase text-slate-700">
                Professional Experience
              </Label>
              <Input
                id="edit-exp"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="e.g. 5+ Years Professional Practice"
                className="rounded-none border-slate-300 text-xs font-medium"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="edit-schedule" className="text-xs font-extrabold uppercase text-slate-700">
                Shift Schedule
              </Label>
              <Input
                id="edit-schedule"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="e.g. Mon - Sat (8:00 AM - 5:00 PM)"
                className="rounded-none border-slate-300 text-xs font-medium"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="edit-notes" className="text-xs font-extrabold uppercase text-slate-700">
                Technician Notes / Bio
              </Label>
              <Textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter summary notes regarding your technical expertise..."
                rows={3}
                className="rounded-none border-slate-300 text-xs font-medium resize-y"
              />
            </div>
          </div>

          <DialogFooter className="shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-slate-100 pt-3 sm:pt-3.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditOpen(false)}
              className="rounded-none border-slate-300 text-xs font-bold px-4 py-2 cursor-pointer w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveWorkInfo}
              className="rounded-none bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2 shadow-md cursor-pointer w-full sm:w-auto"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {LogoutDialog}
    </div>
  )
}

export default MechanicTechnicianWorkInfo
