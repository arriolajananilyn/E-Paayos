import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '../../../components/ui/badge'
import { Button } from '../../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card'
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
  useSidebar,
} from '../../../components/ui/sidebar'
import { TooltipProvider } from '../../../components/ui/tooltip'
import {
  Bell,
  Briefcase,
  CalendarDays,
  ClipboardList,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Star,
} from 'lucide-react'
import Elogo from '../../../assets/Elogo.png'
import { ReviewProviderReplyForm } from '../../../components/reviews/ReviewProviderReplyForm.jsx'
import { useLogoutConfirmation } from '@/hooks/useLogoutConfirmation.jsx'

const navyDeep = '#04133d'
const navy = '#081F5C'
const navyMuted = '#0b2b73'
const navyBright = '#1447a6'
const pageBaseNavyGradient = `linear-gradient(145deg, ${navyDeep} 0%, ${navy} 35%, ${navyMuted} 65%, ${navyBright} 100%)`

const REVIEW_RATINGS_META = {
  title: 'Reviews & Ratings',
  description: 'View customer feedback and your average rating performance.',
}
let mechanicTechnicianSidebarOpenState = false
const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

const sidebarMenuButtonClass =
  'h-9 gap-3 rounded-lg px-3 text-white transition-colors hover:bg-white/20 hover:text-white data-[active=true]:bg-white data-[active=true]:text-black group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:px-3! group-data-[collapsible=icon]:py-2! group-data-[collapsible=icon]:justify-start! [&>span:last-child]:overflow-visible [&>span:last-child]:text-clip [&>span:last-child]:whitespace-nowrap'

function MechanicMobileNav() {
  const { isMobile, setOpenMobile } = useSidebar()
  if (!isMobile) return null
  return (
    <button
      type="button"
      className="-ml-1 mr-2 shrink-0 rounded-md px-2 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
      onClick={() => setOpenMobile(true)}
    >
      Menu
    </button>
  )
}

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function resolveMediaSrc(src) {
  const value = String(src ?? '').trim()
  if (!value) return ''
  if (/^(https?:\/\/|data:|blob:)/i.test(value)) return value
  if (value.startsWith('/uploads/')) return `${API_URL}${value}`
  return value
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

const REVIEW_STAT_GRADIENT = {
  average: 'bg-linear-to-br from-amber-500 via-orange-500 to-amber-900',
  total: 'bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6]',
  comments: 'bg-linear-to-br from-emerald-600 via-teal-600 to-emerald-800',
  media: 'bg-linear-to-br from-sky-500 via-violet-600 to-indigo-700',
}

function StatGradientCard({ label, value, icon: Icon, variant }) {
  const gradient = REVIEW_STAT_GRADIENT[variant] ?? REVIEW_STAT_GRADIENT.total
  return (
    <div
      className={`relative min-h-[112px] min-w-0 overflow-hidden rounded-2xl border border-white/15 p-5 shadow-md transition-shadow duration-300 hover:shadow-lg sm:min-h-[128px] sm:p-6 ${gradient}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/10 to-transparent" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-white/85">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-white tabular-nums sm:text-3xl">{value}</p>
        </div>
        <div className="shrink-0 rounded-xl border border-white/25 bg-white/15 p-3 shadow-inner backdrop-blur-sm">
          <Icon className="h-5 w-5 text-white" aria-hidden />
        </div>
      </div>
    </div>
  )
}

function MechanicTechnicianReviewRatings() {
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(mechanicTechnicianSidebarOpenState)
  const [profileOpen, setProfileOpen] = useState(false)
  const [summary, setSummary] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const profileMenuRef = useRef(null)

  useEffect(() => {
    const raw = localStorage.getItem('user')
    const token = localStorage.getItem('token')
    if (!token || !raw) {
      window.location.hash = '#/login'
      return
    }
    try {
      const parsed = JSON.parse(raw)
      if (parsed.role !== 'mechanic-technician' && parsed.role !== 'independent-mechanic-technician') {
        window.location.hash = '#/login'
        return
      }
      setUser(parsed)
    } catch {
      window.location.hash = '#/login'
    }
  }, [])

  useEffect(() => {
    mechanicTechnicianSidebarOpenState = sidebarOpen
  }, [sidebarOpen])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const res = await fetch(`${API_URL}/api/mechanic/reviews-ratings`, { headers: authHeaders() })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || 'Could not load reviews.')
        if (!cancelled) {
          setSummary(data?.summary || null)
          setReviews(Array.isArray(data?.reviews) ? data.reviews : [])
        }
      } catch (e) {
        if (!cancelled) {
          setSummary(null)
          setReviews([])
          setLoadError(e?.message || 'Could not load reviews.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [user])

  const [starFilter, setStarFilter] = useState(null)
  const feedbackCardRef = useRef(null)

  const avg = useMemo(() => Number(summary?.averageRating || 0), [summary?.averageRating])
  const total = useMemo(() => Number(summary?.totalReviews || 0), [summary?.totalReviews])
  const stars = summary?.stars || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

  const reviewStarBucket = (rating) => {
    const n = Number(rating)
    if (!Number.isFinite(n)) return 0
    return Math.min(5, Math.max(1, Math.round(n)))
  }

  const filteredReviews = useMemo(() => {
    if (starFilter == null) return reviews
    return reviews.filter((r) => reviewStarBucket(r.rating) === starFilter)
  }, [reviews, starFilter])

  const onStarRowClick = (star) => {
    setStarFilter((prev) => (prev === star ? null : star))
    requestAnimationFrame(() => {
      feedbackCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const onStarRowKeyDown = (e, star) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onStarRowClick(star)
    }
  }

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
                        tooltip="Reviews & Ratings"
                        onClick={() => {
                          window.location.hash = '#/mechanic/technician/reviews-ratings'
                        }}
                        className={sidebarMenuButtonClass}
                      >
                        <Star className="size-[18px] opacity-90" />
                        <span className="whitespace-nowrap">Reviews & Ratings</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
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
              <div className="flex items-center gap-2 overflow-hidden rounded-xl border border-white/15 bg-white/10 px-2.5 py-2 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-full group-data-[collapsible=icon]:p-1">
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
            <header className="relative z-30 flex h-14 shrink-0 flex-none items-center gap-3 border-b border-border/60 bg-white/90 px-4 shadow-sm backdrop-blur-md dark:bg-background/95 md:px-6">
              <MechanicMobileNav />
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-semibold tracking-tight text-foreground md:text-xl">{REVIEW_RATINGS_META.title}</h1>
                <p className="hidden truncate text-xs text-muted-foreground sm:block">{REVIEW_RATINGS_META.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Notification"
                  onClick={() => {
                    window.location.hash = '#/mechanic/technician/notification'
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-transparent text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Bell className="h-5 w-5" />
                </button>

                <div ref={profileMenuRef} className="relative">
                  <button
                    type="button"
                    aria-label="Profile menu"
                    onClick={() => setProfileOpen((prev) => !prev)}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                      profileOpen
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-[#04133d] via-[#081F5C] to-[#1447a6] text-base font-semibold leading-none text-white">
                      {(user.fullName || user.email || 'M').charAt(0).toUpperCase()}
                    </span>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-md border border-border/80 bg-background shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false)
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Account Settings</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false)
                          requestLogout()
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Log out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            <div
              id="mechanic-main-scroll"
              className="scrollbar-hidden flex min-h-0 min-w-0 max-w-full flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden overscroll-contain py-4 pl-4 pr-1 md:py-6 md:pl-6 md:pr-2"
            >
              {loadError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{loadError}</div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <StatGradientCard
                  variant="average"
                  label="Average rating"
                  value={loading ? '—' : `${avg.toFixed(1)} / 5`}
                  icon={Star}
                />
                <StatGradientCard variant="total" label="Total reviews" value={loading ? '—' : total} icon={ClipboardList} />
                <StatGradientCard
                  variant="comments"
                  label="With comments"
                  value={loading ? '—' : Number(summary?.withCommentCount || 0)}
                  icon={MessageSquare}
                />
                <StatGradientCard
                  variant="media"
                  label="With media"
                  value={loading ? '—' : Number(summary?.withMediaCount || 0)}
                  icon={ImageIcon}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <Card className="border-[#081F5C]/10 bg-white/90 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Star breakdown</CardTitle>
                    <CardDescription>Tap a row to filter customer feedback by that rating.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const active = starFilter === star
                      const count = loading ? null : Number(stars?.[star] || 0)
                      return (
                        <button
                          key={star}
                          type="button"
                          disabled={loading}
                          onClick={() => onStarRowClick(star)}
                          onKeyDown={(e) => onStarRowKeyDown(e, star)}
                          aria-pressed={active}
                          aria-label={`Filter by ${star} star reviews, ${count ?? 0} total`}
                          className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                            active
                              ? 'border-[#1447a6]/50 bg-[#1447a6]/10 ring-2 ring-[#1447a6]/25'
                              : 'border-[#081F5C]/10 hover:border-[#1447a6]/35 hover:bg-[#081F5C]/5'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" /> {star} star
                          </span>
                          <span className="font-semibold text-[#081F5C]">{loading ? '—' : count}</span>
                        </button>
                      )
                    })}
                  </CardContent>
                </Card>

                <div ref={feedbackCardRef} className="min-w-0 lg:col-span-2 scroll-mt-4">
                <Card className="border-[#081F5C]/10 bg-white/90 shadow-sm">
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base">Recent customer feedback</CardTitle>
                        <CardDescription>
                          {starFilter != null
                            ? `Showing ${starFilter}-star reviews (${filteredReviews.length} of ${reviews.length})`
                            : 'Latest reviews from completed bookings'}
                        </CardDescription>
                      </div>
                      {starFilter != null ? (
                        <Button type="button" variant="secondary" size="sm" onClick={() => setStarFilter(null)}>
                          Clear filter
                        </Button>
                      ) : null}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {loading ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">Loading reviews...</p>
                    ) : reviews.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">No reviews yet for your assigned services.</p>
                    ) : filteredReviews.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">No reviews with this star rating.</p>
                    ) : (
                      filteredReviews.map((review) => (
                        <div key={review.id} className="rounded-xl border border-[#081F5C]/10 bg-white p-3 shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#081F5C]">{review.serviceName}</p>
                              <p className="text-xs text-muted-foreground">Customer: {review.customerName || 'Customer'}</p>
                            </div>
                            <Badge className="border-yellow-300 bg-yellow-100 text-yellow-900">{Number(review.rating || 0).toFixed(1)} ★</Badge>
                          </div>
                          {review.comment ? <p className="mt-2 text-sm text-foreground">{review.comment}</p> : null}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDateTime(review.reviewedAt)}</span>
                            {Array.isArray(review.media) && review.media.length > 0 ? (
                              <span className="inline-flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" />{review.media.length} media</span>
                            ) : null}
                          </div>
                          {Array.isArray(review.media) && review.media.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {review.media.slice(0, 4).map((m, idx) => (
                                <a key={`${review.id}-m-${idx}`} href={resolveMediaSrc(m.url)} target="_blank" rel="noreferrer" className="h-14 w-14 overflow-hidden rounded-md border border-[#081F5C]/15 bg-slate-100">
                                  <img src={resolveMediaSrc(m.url)} alt="Review media" className="h-full w-full object-cover" />
                                </a>
                              ))}
                            </div>
                          ) : null}
                          {review.bookingId ? (
                            <ReviewProviderReplyForm
                              patchUrl={`${API_URL}/api/mechanic/bookings/${encodeURIComponent(review.bookingId)}/review-response`}
                              shopResponse={review.shopResponse || ''}
                              providerReviewRespondedAt={review.providerReviewRespondedAt || null}
                              label="Your reply (visible to customers on the service page)"
                              onUpdated={({ shopResponse, providerReviewRespondedAt }) => {
                                setReviews((prev) =>
                                  prev.map((r) =>
                                    r.bookingId === review.bookingId ? { ...r, shopResponse, providerReviewRespondedAt } : r,
                                  ),
                                )
                              }}
                            />
                          ) : null}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
                </div>
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
      {LogoutDialog}
    </div>
  )
}

export default MechanicTechnicianReviewRatings
