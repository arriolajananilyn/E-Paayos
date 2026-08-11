import { useEffect, useRef, useState } from 'react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { CalendarDays, Camera, Clock3, Image as ImageIcon, MapPin, MessageSquareText, Phone, Star, User, Video as VideoIcon } from 'lucide-react'
import CustomerLayout, { readCustomerUserSession } from '../../layout/customerlayout.jsx'

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
  if (/^(data:|blob:)/i.test(value)) return value
  if (value.startsWith('/uploads/')) return `${API_URL}${value}`
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value)
      const host = (parsed.hostname || '').toLowerCase()
      if (host === 'localhost' || host === '127.0.0.1') {
        const api = new URL(API_URL)
        parsed.protocol = api.protocol
        parsed.host = api.host
        return parsed.toString()
      }
    } catch {
      // ignore
    }
    return value
  }
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
  const [user, setUser] = useState(readCustomerUserSession)
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
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '')
        reader.onerror = () => resolve('')
        reader.readAsDataURL(file)
      })

    // Persist only portable URLs (data: or /uploads). Never send blob: URLs to the API.
    const media = []
    for (const m of ratingMedia) {
      if (!(m?.file instanceof File)) continue
      const dataUrl = await toDataUrl(m.file)
      if (!dataUrl) continue
      media.push({ type: m.type, url: dataUrl, name: m.name })
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider">Loading reviews…</p>
      </div>
    )
  }

  return (
    <CustomerLayout activePage="reviews-ratings">
      <main className="w-full px-6 sm:px-10 md:px-16 pt-6 pb-8 space-y-6 max-w-[1440px] mx-auto">
        {/* Sharp Tab Switcher matching findServices.jsx */}
        <div
          className="mb-4 flex w-full items-stretch overflow-x-auto rounded-none border border-slate-200 bg-white p-1 shadow-[0_2px_5px_rgba(15,23,42,0.08)] sm:overflow-visible"
          role="tablist"
          aria-label="Review tabs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'toRate'}
            onClick={() => setActiveTab('toRate')}
            className={`flex-none whitespace-nowrap rounded-none px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider transition-all sm:flex-1 sm:px-4 sm:text-xs ${
              activeTab === 'toRate'
                ? 'bg-linear-to-r from-[#081F5C] to-[#1447a6] text-white shadow-sm ring-1 ring-[#081F5C]/25'
                : 'text-slate-600 hover:bg-slate-50 hover:text-[#081F5C]'
            }`}
          >
            To Rate ({toRate.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'myReviews'}
            onClick={() => setActiveTab('myReviews')}
            className={`flex-none whitespace-nowrap rounded-none px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-wider transition-all sm:flex-1 sm:px-4 sm:text-xs ${
              activeTab === 'myReviews'
                ? 'bg-linear-to-r from-[#081F5C] to-[#1447a6] text-white shadow-sm ring-1 ring-[#081F5C]/25'
                : 'text-slate-600 hover:bg-slate-50 hover:text-[#081F5C]'
            }`}
          >
            My Reviews ({myReviews.length})
          </button>
        </div>

        {activeTab === 'toRate' && (
          <section className="grid gap-4">
            {bookingsError && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-none border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800 shadow-2xs">
                <span>{bookingsError}</span>
              </div>
            )}
            {loadingBookings && (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-none border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Loading completed services…</p>
              </div>
            )}
            {!loadingBookings && !bookingsError && toRate.length === 0 && (
              <div className="flex min-h-[180px] flex-col items-center justify-center rounded-none border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm">
                <Star className="h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-foreground">No completed services yet</p>
                <p className="mt-1 max-w-md text-xs text-muted-foreground">
                  Completed booking requests will automatically show up here for rating and feedback.
                </p>
              </div>
            )}

            {!loadingBookings &&
              toRate.map((item) => (
                <Card
                  key={item.id}
                  className="rounded-none border border-slate-200 bg-white shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-300 hover:border-[#081F5C] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)] hover:-translate-y-0.5"
                >
                  <CardHeader className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base font-bold uppercase tracking-wide text-[#081F5C]">
                          {item.shop}
                        </CardTitle>
                        <CardDescription className="truncate text-xs font-medium text-slate-600">
                          {item.service}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="rounded-none border border-slate-300 bg-white font-mono text-xs font-bold text-[#081F5C]">
                        {item.orderId || 'N/A'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-start gap-3">
                      <ServiceMediaPreview images={item.images} />
                      <p className="pt-1 text-xs font-medium text-slate-500">Uploaded issue photos</p>
                    </div>
                    <div className="grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                      <div className="inline-flex items-center gap-1.5 rounded-none border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium">
                        <CalendarDays className="h-3.5 w-3.5 text-[#081F5C]" />
                        <span>Completed: {formatDateLabel(item.completedAt)}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-none border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium">
                        <Clock3 className="h-3.5 w-3.5 text-[#081F5C]" />
                        <span>Preferred: {item.preferredTime || 'N/A'}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-none border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium">
                        <User className="h-3.5 w-3.5 text-[#081F5C]" />
                        <span>Contact: {item.contactName || 'N/A'}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-none border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium">
                        <Phone className="h-3.5 w-3.5 text-[#081F5C]" />
                        <span>Phone: {item.contactPhone || 'N/A'}</span>
                      </div>
                    </div>

                    {item.serviceAddress && (
                      <div className="rounded-none border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-700">
                        <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#081F5C]">
                          <MapPin className="h-3.5 w-3.5" />
                          Service address
                        </span>
                        <p className="mt-1 font-medium">{item.serviceAddress}</p>
                      </div>
                    )}

                    {item.problemDescription && (
                      <div className="rounded-none border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-700">
                        <p className="font-bold uppercase tracking-wider text-[#081F5C]">Issue reported</p>
                        <p className="mt-1 font-medium">{item.problemDescription}</p>
                      </div>
                    )}

                    {item.isReviewed ? (
                      <div className="flex items-center justify-between rounded-none border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold uppercase tracking-wider text-emerald-800">
                        <span>Review submitted</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab('myReviews')}
                          className="rounded-none border-emerald-400 bg-white text-emerald-800 hover:bg-emerald-100"
                        >
                          View Review
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-1 border-t border-slate-100">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-slate-700">
                            Rate your repair experience for this completed service.
                          </p>
                          <Button
                            type="button"
                            onClick={() => handleToggleRateForm(item.id)}
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-none bg-[#081F5C] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-[0_2px_5px_rgba(15,23,42,0.14)] hover:bg-[#0a2770]"
                          >
                            <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                            {openRateId === item.id ? 'Close Form' : 'Rate Service'}
                          </Button>
                        </div>

                        {openRateId === item.id && (
                          <div className="space-y-4 rounded-none border border-[#081F5C]/20 bg-slate-50/90 p-4 shadow-sm">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-[#081F5C] mb-1.5">
                                Overall Rating
                              </p>
                              <Stars value={ratingValue} interactive onChange={setRatingValue} size="h-5 w-5" />
                            </div>

                            <div>
                              <p className="text-xs font-bold uppercase tracking-wider text-[#081F5C] mb-1.5">
                                Comment &amp; Feedback
                              </p>
                              <textarea
                                rows={4}
                                value={ratingComment}
                                onChange={(e) => setRatingComment(e.target.value)}
                                placeholder="Write your honest review and repair feedback…"
                                className="w-full rounded-none border border-slate-200 bg-white p-3 text-xs sm:text-sm outline-none shadow-2xs focus-visible:ring-1 focus-visible:ring-[#081F5C] focus-visible:border-[#081F5C]"
                              />
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold uppercase tracking-wider text-[#081F5C]">
                                  Attach photos/videos (optional)
                                </p>
                                <p className="text-xs font-semibold text-slate-500">
                                  {ratingMedia.length}/{MAX_MEDIA}
                                </p>
                              </div>
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-none border border-dashed border-slate-300 bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-[#081F5C] hover:bg-slate-50 transition-colors shadow-2xs">
                                <ImageIcon className="h-4 w-4" />
                                <VideoIcon className="h-4 w-4" />
                                Upload photos or videos
                                <input
                                  type="file"
                                  accept="image/*,video/*"
                                  multiple
                                  className="hidden"
                                  onChange={(e) => handleAddMedia(e.target.files)}
                                />
                              </label>

                              {ratingMedia.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 pt-1">
                                  {ratingMedia.map((file, index) => (
                                    <div
                                      key={`${file.name}-${index}`}
                                      className="relative h-20 overflow-hidden rounded-none border border-slate-200 bg-white shadow-2xs"
                                    >
                                      {file.type === 'video' ? (
                                        <video src={file.url} className="h-full w-full object-cover" />
                                      ) : (
                                        <img src={file.url} alt={file.name} className="h-full w-full object-cover" />
                                      )}
                                      <button
                                        type="button"
                                        className="absolute right-1 top-1 rounded-none bg-[#081F5C] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
                                        onClick={() =>
                                          setRatingMedia((prev) => prev.filter((_, idx) => idx !== index))
                                        }
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-3">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={resetForm}
                                className="rounded-none border border-slate-300 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-2xs hover:bg-slate-50"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => submitReview(item.id)}
                                className="rounded-none bg-[#081F5C] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[0_2px_5px_rgba(15,23,42,0.14)] hover:bg-[#0a2770]"
                              >
                                Submit Review
                              </Button>
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
              <div className="flex min-h-[180px] flex-col items-center justify-center rounded-none border border-dashed border-[#081F5C]/20 bg-slate-50/60 px-6 text-center shadow-sm">
                <Star className="h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-foreground">No submitted reviews yet</p>
                <p className="mt-1 max-w-md text-xs text-muted-foreground">
                  Your submitted ratings and shop feedback will appear here.
                </p>
              </div>
            ) : (
              myReviews.map((review) => (
                <Card
                  key={review.id}
                  className="rounded-none border border-slate-200 bg-white shadow-[0_3px_8px_rgba(15,23,42,0.14)] transition-all duration-300 hover:border-[#081F5C] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)] hover:-translate-y-0.5"
                >
                  <CardHeader className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base font-bold uppercase tracking-wide text-[#081F5C]">
                          {review.shop}
                        </CardTitle>
                        <CardDescription className="truncate text-xs font-medium text-slate-600">
                          {review.service}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="rounded-none border border-slate-300 bg-white font-mono text-xs font-bold text-[#081F5C]">
                        {review.date}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3.5 p-4">
                    <div className="grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
                      <div className="inline-flex items-center gap-1.5 rounded-none border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium">
                        <CalendarDays className="h-3.5 w-3.5 text-[#081F5C]" />
                        <span>Booking date: {formatDateLabel(review.bookingDate)}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5 rounded-none border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-medium">
                        <Clock3 className="h-3.5 w-3.5 text-[#081F5C]" />
                        <span>Preferred: {review.preferredTime || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Stars value={review.rating} />
                      <span className="text-xs font-bold text-slate-800">
                        {Number(review.rating).toFixed(1)} / 5.0
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">{review.text}</p>

                    {typeof review.shopResponse === 'string' && review.shopResponse.trim().length > 0 ? (
                      <div className="rounded-none border-l-4 border-l-[#081F5C] border border-slate-200 bg-slate-50 p-3 space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#081F5C]">
                          Reply from repair provider
                        </p>
                        <p className="text-xs font-semibold text-slate-800">{review.shopResponse.trim()}</p>
                        {review.providerReviewRespondedAt ? (
                          <p className="text-[10px] font-medium text-slate-500 pt-0.5">
                            {new Date(review.providerReviewRespondedAt).toLocaleString(undefined, {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {review.serviceAddress && (
                      <div className="rounded-none border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-700">
                        <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#081F5C]">
                          <MapPin className="h-3.5 w-3.5" />
                          Service address
                        </span>
                        <p className="mt-1 font-medium">{review.serviceAddress}</p>
                      </div>
                    )}

                    {Array.isArray(review.media) && review.media.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 pt-1">
                        {review.media.map((item, idx) => (
                          <div key={`${review.id}-${idx}`} className="h-20 overflow-hidden rounded-none border border-slate-200 bg-slate-50">
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
    </CustomerLayout>
  )
}

export default CustomerReviewsRatings
