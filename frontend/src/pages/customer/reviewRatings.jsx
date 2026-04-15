import { useEffect, useRef, useState } from 'react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { ArrowLeft, Bell, CalendarDays, Camera, Clock3, Image as ImageIcon, LogOut, MapPin, MessageSquareText, Phone, Settings, Star, User, Video as VideoIcon } from 'lucide-react'
import logoEpaayos from '../../assets/epaayos_logo.png'
import {
  NotificationBellIndicator,
  useCustomerNotificationUnreadCount,
} from '../../components/notifications/NotificationFeed.jsx'

const MAX_MEDIA = 5
const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function mapBookingFromApi(row) {
  if (!row || !row.id) return null
  return {
    id: String(row.id),
    shopServiceId: String(row.shopServiceId || ''),
    orderId: String(row.ref || ''),
    shop: row.shopName || 'Service Provider',
    service: row.serviceName || 'Vehicle Service',
    completedAt: row.updatedAt || row.createdAt || '',
    images: Array.isArray(row.issuePhotos) ? row.issuePhotos.filter(Boolean) : [],
    bookingDate: row.date || '',
    preferredTime: row.preferredTime || '',
    serviceAddress: row.serviceAddress || '',
    contactName: row.contactName || '',
    contactPhone: row.contactPhone || '',
    problemDescription: row.problemDescription || '',
    notes: row.notes || '',
    status: String(row.status || '').toLowerCase(),
    customerReviewRating: row.customerReviewRating ?? null,
    customerReviewComment: row.customerReviewComment || '',
    customerReviewMedia: Array.isArray(row.customerReviewMedia) ? row.customerReviewMedia : [],
    customerReviewedAt: row.customerReviewedAt || '',
    shopResponse: typeof row.shopResponse === 'string' ? row.shopResponse.trim() : '',
    providerReviewRespondedAt: row.providerReviewRespondedAt || null,
  }
}

function resolveMediaSrc(src) {
  const value = String(src ?? '').trim()
  if (!value) return ''
  if (/^(https?:\/\/|data:|blob:)/i.test(value)) return value
  if (value.startsWith('/uploads/')) return `${API_URL}${value}`
  return value
}

function Stars({ value, interactive = false, onChange = null, size = 'h-4 w-4' }) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0))
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const active = i < rating
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => onChange && onChange(i + 1)}
            className={interactive ? 'cursor-pointer' : 'cursor-default'}
          >
            <Star className={`${size} ${active ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`} />
          </button>
        )
      })}
    </div>
  )
}

function ServiceMediaPreview({ images = [] }) {
  const pics = images.slice(0, 6)
  const extra = images.length - pics.length
  if (pics.length === 0) {
    return (
      <div className="grid h-16 w-16 place-items-center rounded-md border border-[#081F5C]/20 bg-slate-100">
        <div className="flex items-center gap-1 text-slate-500">
          <Camera className="h-3.5 w-3.5" />
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {pics.map((src, idx) => (
        <div key={idx} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-[#081F5C]/20 bg-slate-100">
          <img src={src} alt="Booked service" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        </div>
      ))}
      {extra > 0 && (
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-md border border-[#081F5C]/20 bg-slate-100 text-xs font-semibold text-[#081F5C]">
          +{extra}
        </div>
      )}
    </div>
  )
}

function formatDateLabel(value) {
  if (!value) return 'N/A'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10)
  return d.toLocaleDateString()
}

function CustomerReviewsRatings() {
  const [user, setUser] = useState(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('toRate')
  const [toRate, setToRate] = useState([])
  const [myReviews, setMyReviews] = useState([])
  const [openRateId, setOpenRateId] = useState(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [ratingMedia, setRatingMedia] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(true)
  const [bookingsError, setBookingsError] = useState('')
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
      if (parsed.role !== 'customer') {
        window.location.hash = '#/login'
        return
      }
      setUser(parsed)
    } catch {
      window.location.hash = '#/login'
    }
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const loadCompletedBookings = async () => {
      try {
        setBookingsError('')
        setLoadingBookings(true)
        const res = await fetch(`${API_URL}/api/catalog/bookings`, { headers: authHeaders() })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || 'Could not load completed services.')
        const raw = Array.isArray(data?.bookings) ? data.bookings : []

        const serverReviews = raw
          .map(mapBookingFromApi)
          .filter(Boolean)
          .filter((item) => Number(item.customerReviewRating) > 0)
          .map((item) => ({
            id: `rv-${item.id}`,
            sourceId: item.id,
            shopServiceId: item.shopServiceId || '',
            orderId: item.orderId,
            shop: item.shop,
            service: item.service,
            bookingDate: item.bookingDate,
            preferredTime: item.preferredTime,
            serviceAddress: item.serviceAddress,
            rating: Number(item.customerReviewRating),
            text: item.customerReviewComment || '',
            date: item.customerReviewedAt ? String(item.customerReviewedAt).slice(0, 10) : '',
            createdAt: item.customerReviewedAt || '',
            media: Array.isArray(item.customerReviewMedia) ? item.customerReviewMedia : [],
            shopResponse: item.shopResponse || '',
            providerReviewRespondedAt: item.providerReviewRespondedAt || null,
          }))

        const completed = raw
          .map(mapBookingFromApi)
          .filter(Boolean)
          .filter((item) => item.status === 'completed')
          .map((item) => ({
            ...item,
            images: (item.images || []).map(resolveMediaSrc).filter(Boolean),
            isReviewed: Number(item.customerReviewRating) > 0,
          }))
        if (!cancelled) {
          setToRate(completed)
          setMyReviews(serverReviews)
        }
      } catch (error) {
        if (!cancelled) {
          setToRate([])
          setMyReviews([])
          setBookingsError(error?.message || 'Could not load completed services.')
        }
      } finally {
        if (!cancelled) setLoadingBookings(false)
      }
    }

    void loadCompletedBookings()
    return () => { cancelled = true }
  }, [user])

  useEffect(() => {
    if (!profileOpen) return
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileOpen])

  const { unreadCount: customerNotifUnread } = useCustomerNotificationUnreadCount(user)

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.hash = '#/'
  }

  const resetForm = () => {
    ratingMedia.forEach((file) => file.url && URL.revokeObjectURL(file.url))
    setRatingValue(0)
    setRatingComment('')
    setRatingMedia([])
    setOpenRateId(null)
  }

  const handleAddMedia = (files) => {
    const list = Array.from(files || [])
    if (list.length === 0) return
    setRatingMedia((prev) => {
      const next = [...prev]
      for (let i = 0; i < list.length; i += 1) {
        if (next.length >= MAX_MEDIA) break
        const f = list[i]
        next.push({
          file: f,
          name: f.name,
          type: f.type.startsWith('video') ? 'video' : 'image',
          url: URL.createObjectURL(f),
        })
      }
      return next
    })
  }

  const handleToggleRateForm = (itemId) => {
    setOpenRateId((prev) => {
      const next = prev === itemId ? null : itemId
      if (next === null) {
        resetForm()
        return null
      }
      // Start fresh when opening another booking to avoid cross-card draft confusion.
      setRatingValue(0)
      setRatingComment('')
      setRatingMedia([])
      return next
    })
  }

  const submitReview = async (bookingId) => {
    if (!user) return
    if (!bookingId || ratingValue === 0 || !ratingComment.trim()) {
      alert('Please complete your rating and comment first.')
      return
    }

    const target = toRate.find((item) => item.id === bookingId)
    if (!target) return

    const toDataUrl = (file) =>
      new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result || '')
        reader.onerror = () => resolve('')
        reader.readAsDataURL(file)
      })
    const media = []
    for (const m of ratingMedia) {
      if (m.file instanceof File) {
        const dataUrl = await toDataUrl(m.file)
        if (dataUrl) media.push({ type: m.type, url: dataUrl, name: m.name })
      } else if (m.url) {
        media.push({ type: m.type, url: m.url, name: m.name })
      }
    }

    try {
      const res = await fetch(`${API_URL}/api/catalog/bookings/${encodeURIComponent(bookingId)}/review`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ rating: ratingValue, comment: ratingComment.trim(), media }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || 'Could not submit review.')
      }
      const review = data?.review
        ? { ...data.review, media: Array.isArray(data.review.media) ? data.review.media : [] }
        : null
      if (review) {
        setMyReviews((prev) => [review, ...prev.filter((rv) => rv.sourceId !== target.id)])
      }
      setToRate((prev) => prev.map((item) => (item.id === target.id ? { ...item, isReviewed: true } : item)))
      resetForm()
      alert(data?.message || 'Review submitted successfully.')
    } catch (error) {
      alert(error?.message || 'Could not submit review.')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-b from-sky-50 via-violet-50 to-indigo-100">
        <p className="text-gray-600 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-100 min-h-16 border-b border-transparent bg-linear-to-r from-[#04133d] via-[#081F5C] to-[#1447a6]">
        <div className="mx-auto flex h-full min-h-16 max-w-7xl items-center justify-between gap-3 px-1 py-2 sm:px-3 sm:py-2.5">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => {
                window.location.hash = '#/customer/dashboard'
              }}
              aria-label="Back"
              className="text-white hover:text-white/90 shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="flex shrink-0 items-center min-w-0"
              aria-label="E-PAAYOS"
              onClick={() => {
                window.location.hash = '#/customer/dashboard'
              }}
            >
              <img
                src={logoEpaayos}
                alt="E-PAAYOS"
                className="h-8 w-auto max-h-10 max-w-[min(48vw,200px)] object-contain object-left sm:h-9"
                decoding="async"
              />
            </button>
            <span className="hidden sm:block h-6 w-px bg-white/40 ml-1 mr-1 shrink-0" />
            <div className="hidden sm:grid h-10 w-10 rounded-lg bg-white/15 border border-white/30 place-items-center shrink-0">
              <MessageSquareText className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight min-w-0">
              <div className="text-base sm:text-xl font-bold text-white truncate">Reviews &amp; Ratings</div>
              <div className="text-[10px] sm:text-xs text-white/90 leading-snug sm:max-w-md truncate">
                Share feedback and manage your service reviews.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              aria-label="Notification"
              onClick={() => {
                window.location.hash = '#/customer/notification'
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-white transition-colors hover:bg-white/10"
            >
              <NotificationBellIndicator unreadCount={customerNotifUnread} countOnDarkBg>
                <Bell className="h-5 w-5" />
              </NotificationBellIndicator>
            </button>

            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                aria-label="Profile menu"
                onClick={() => setProfileOpen((prev) => !prev)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  profileOpen ? 'bg-white/15 text-white' : 'bg-transparent text-white hover:bg-white/10'
                }`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-semibold leading-none text-white ring-1 ring-white/30">
                  {(user.fullName || user.email || 'C').charAt(0).toUpperCase()}
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 z-110 mt-2 w-44 overflow-hidden rounded-md border border-border/80 bg-white shadow-lg">
                  <button type="button" onClick={() => { setProfileOpen(false); window.location.hash = '#/customer/reviews-ratings' }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                    <Star className="h-4 w-4" />
                    <span className="whitespace-nowrap">Reviews &amp; Ratings</span>
                  </button>
                  <button type="button" onClick={() => { setProfileOpen(false); window.location.hash = '#/customer/account-settings' }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                    <Settings className="h-4 w-4" />
                    <span>Account Settings</span>
                  </button>
                  <button type="button" onClick={() => { setProfileOpen(false); handleLogout() }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                    <LogOut className="h-4 w-4" />
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-screen overflow-x-hidden bg-linear-to-b from-sky-50 via-violet-50 to-indigo-100 pt-16">
        <main className="w-full px-6 sm:px-10 md:px-14 lg:px-20 pt-4 pb-5 space-y-4">
        <section
          className="mb-1 flex w-full items-stretch overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 shadow-sm sm:overflow-visible"
          role="tablist"
          aria-label="Review tabs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'toRate'}
            onClick={() => setActiveTab('toRate')}
            className={`flex-none whitespace-nowrap rounded-md px-3 py-2 text-center text-xs transition-colors sm:flex-1 sm:px-4 sm:text-sm ${
              activeTab === 'toRate'
                ? 'bg-linear-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] text-white shadow-sm ring-1 ring-[#081F5C]/25'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            To Rate
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'myReviews'}
            onClick={() => setActiveTab('myReviews')}
            className={`flex-none whitespace-nowrap rounded-md px-3 py-2 text-center text-xs transition-colors sm:flex-1 sm:px-4 sm:text-sm ${
              activeTab === 'myReviews'
                ? 'bg-linear-to-r from-[#04133d] via-[#081F5C] to-[#1447a6] text-white shadow-sm ring-1 ring-[#081F5C]/25'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            My Reviews
          </button>
        </section>

        {activeTab === 'toRate' && (
          <section className="grid gap-4">
            {bookingsError && (
              <Card className="border-destructive/25 bg-destructive/5">
                <CardContent className="py-4 text-center text-sm text-destructive">{bookingsError}</CardContent>
              </Card>
            )}
            {loadingBookings && (
              <Card>
                <CardContent className="py-10 text-center text-sm text-slate-500">Loading completed services...</CardContent>
              </Card>
            )}
            {!loadingBookings && !bookingsError && toRate.length === 0 && (
              <Card>
                <CardContent className="py-10 text-center text-sm text-slate-500">No completed services yet. Completed bookings will appear here for rating.</CardContent>
              </Card>
            )}

            {!loadingBookings && toRate.map((item) => (
              <Card key={item.id} className="gap-0 overflow-hidden rounded-2xl border border-[#081F5C]/10 bg-white/95 py-0 shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:border-[#1447a6]/30 hover:shadow-md">
                <CardHeader className="border-b border-slate-100 bg-slate-50/65 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-[15px] font-semibold text-[#081F5C]">{item.shop}</CardTitle>
                      <CardDescription className="truncate text-[13px] text-slate-600">{item.service}</CardDescription>
                    </div>
                    <Badge variant="outline" className="border-[#081F5C]/20 bg-white/90 font-mono text-[11px] text-[#081F5C]">{item.orderId || 'N/A'}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-start gap-3">
                    <ServiceMediaPreview images={item.images} />
                    <p className="pt-1 text-xs text-slate-500">Uploaded issue photos</p>
                  </div>
                  <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2"><CalendarDays className="h-3.5 w-3.5 text-slate-500" />Completed: {formatDateLabel(item.completedAt)}</div>
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2"><Clock3 className="h-3.5 w-3.5 text-slate-500" />Preferred: {item.preferredTime || 'N/A'}</div>
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2"><User className="h-3.5 w-3.5 text-slate-500" />Contact: {item.contactName || 'N/A'}</div>
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2"><Phone className="h-3.5 w-3.5 text-slate-500" />Phone: {item.contactPhone || 'N/A'}</div>
                  </div>
                  {item.serviceAddress && (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-700"><MapPin className="h-3.5 w-3.5" />Service address</span>
                      <p className="mt-1">{item.serviceAddress}</p>
                    </div>
                  )}
                  {item.problemDescription && (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                      <p className="font-medium text-slate-700">Issue reported</p>
                      <p className="mt-1">{item.problemDescription}</p>
                    </div>
                  )}
                  {item.isReviewed ? (
                    <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                      <span>Review submitted</span>
                      <Button variant="ghost" size="sm" onClick={() => setActiveTab('myReviews')}>View</Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm text-slate-600">Rate your experience for this completed service.</p>
                        <Button variant="outline" size="sm" onClick={() => handleToggleRateForm(item.id)}>
                          {openRateId === item.id ? 'Close Form' : 'Rate Service'}
                        </Button>
                      </div>

                      {openRateId === item.id && (
                        <div className="space-y-4 rounded-xl border border-[#081F5C]/15 bg-slate-50/80 p-4">
                          <div>
                            <p className="text-xs font-medium text-slate-600 mb-1">Overall Rating</p>
                            <Stars value={ratingValue} interactive onChange={setRatingValue} size="h-5 w-5" />
                          </div>

                          <div>
                            <p className="text-xs font-medium text-slate-600 mb-1">Comment</p>
                            <textarea
                              rows={4}
                              value={ratingComment}
                              onChange={(e) => setRatingComment(e.target.value)}
                              placeholder="Write your honest feedback..."
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-300"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-slate-600">Attach media (optional)</p>
                              <p className="text-xs text-slate-500">{ratingMedia.length}/{MAX_MEDIA}</p>
                            </div>
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50">
                              <ImageIcon className="h-3.5 w-3.5" />
                              <VideoIcon className="h-3.5 w-3.5" />
                              Upload photos/videos
                              <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => handleAddMedia(e.target.files)} />
                            </label>
                            {ratingMedia.length > 0 && (
                              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                                {ratingMedia.map((file, index) => (
                                  <div key={`${file.name}-${index}`} className="relative h-20 overflow-hidden rounded-md border border-slate-200 bg-white">
                                    {file.type === 'video' ? (
                                      <video src={file.url} className="h-full w-full object-cover" />
                                    ) : (
                                      <img src={file.url} alt={file.name} className="h-full w-full object-cover" />
                                    )}
                                    <button
                                      type="button"
                                      className="absolute right-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white"
                                      onClick={() => setRatingMedia((prev) => prev.filter((_, idx) => idx !== index))}
                                    >
                                      x
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-3">
                            <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
                            <Button size="sm" onClick={() => submitReview(item.id)}>Submit Review</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {activeTab === 'myReviews' && (
          <section className="grid gap-4">
            {myReviews.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-slate-500">No reviews yet. Start rating your completed bookings.</CardContent>
              </Card>
            ) : (
              myReviews.map((review) => (
                <Card key={review.id} className="gap-0 overflow-hidden rounded-2xl border border-[#081F5C]/10 bg-white/95 py-0 shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:border-[#1447a6]/30 hover:shadow-md">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/65 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-[15px] font-semibold text-[#081F5C]">{review.shop}</CardTitle>
                        <CardDescription className="truncate text-[13px] text-slate-600">{review.service}</CardDescription>
                      </div>
                      <Badge variant="outline" className="border-[#081F5C]/20 bg-white/90 text-[11px] text-[#081F5C]">{review.date}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 py-4">
                    <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2"><CalendarDays className="h-3.5 w-3.5 text-slate-500" />Booking date: {formatDateLabel(review.bookingDate)}</div>
                      <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-2"><Clock3 className="h-3.5 w-3.5 text-slate-500" />Preferred: {review.preferredTime || 'N/A'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Stars value={review.rating} />
                      <span className="text-sm font-semibold text-slate-700">{Number(review.rating).toFixed(1)}</span>
                    </div>
                    <p className="text-sm text-slate-700">{review.text}</p>
                    {typeof review.shopResponse === 'string' && review.shopResponse.trim().length > 0 ? (
                      <div className="rounded-lg border border-[#081F5C]/15 bg-[#081F5C]/4 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#081F5C]/80">Reply from provider</p>
                        <p className="mt-1 text-sm text-slate-800">{review.shopResponse.trim()}</p>
                        {review.providerReviewRespondedAt ? (
                          <p className="mt-1 text-[11px] text-slate-500">
                            {new Date(review.providerReviewRespondedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {review.serviceAddress && (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700"><MapPin className="h-3.5 w-3.5" />Service address</span>
                        <p className="mt-1">{review.serviceAddress}</p>
                      </div>
                    )}
                    {Array.isArray(review.media) && review.media.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {review.media.map((item, idx) => (
                          <div key={`${review.id}-${idx}`} className="h-20 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                            {item.type === 'video' ? (
                              <video src={item.url} className="h-full w-full object-cover" />
                            ) : (
                              <img src={item.url} alt={item.name || 'uploaded media'} className="h-full w-full object-cover" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </section>
        )}
        </main>
      </div>
    </>
  )
}

export default CustomerReviewsRatings
