import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { CalendarDays, ClipboardList, Image as ImageIcon, Loader2, MessageSquare, Star } from 'lucide-react'
import { ReviewProviderReplyForm } from '../../components/reviews/ReviewProviderReplyForm.jsx'
import ShopOwnerDashboard from './dashboard.jsx'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function resolveMediaSrc(src) {
  const value = String(src ?? '').trim()
  if (!value) return ''
  if (/^(https?:\/\/|data:|blob:)/i.test(value)) return value
  if (value.startsWith('/uploads/')) return `${API_URL}${value}`
  return value
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

function ReviewsRatingsPage() {
  const [summary, setSummary] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const loadReviews = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await fetch(`${API_URL}/api/shop/reviews-ratings`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Could not load reviews.')
      setSummary(data?.summary || null)
      setReviews(Array.isArray(data?.reviews) ? data.reviews : [])
    } catch (e) {
      setSummary(null)
      setReviews([])
      setLoadError(e?.message || 'Could not load reviews.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadReviews()
  }, [])

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

  return (
    <ShopOwnerDashboard
      activeSection="reviews-ratings"
      pageMeta={{ title: 'Reviews & Ratings', description: 'View customer feedback and overall ratings.' }}
    >
      {loadError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <div className="flex items-center justify-between gap-2">
            <span>{loadError}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadReviews()} disabled={loading}>
              Retry
            </Button>
          </div>
        </div>
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
                <CardTitle className="text-base">Customer feedback</CardTitle>
                <CardDescription>
                  {starFilter != null
                    ? `Showing ${starFilter}-star reviews (${filteredReviews.length} of ${reviews.length})`
                    : 'Latest ratings and review comments'}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {starFilter != null ? (
                  <Button type="button" variant="secondary" size="sm" onClick={() => setStarFilter(null)}>
                    Clear filter
                  </Button>
                ) : null}
                <Button type="button" variant="outline" size="sm" onClick={() => void loadReviews()} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Loading reviews...</p>
            ) : reviews.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No customer reviews yet.</p>
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
                      patchUrl={`${API_URL}/api/shop/bookings/${encodeURIComponent(review.bookingId)}/review-response`}
                      shopResponse={review.shopResponse || ''}
                      providerReviewRespondedAt={review.providerReviewRespondedAt || null}
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
    </ShopOwnerDashboard>
  )
}

export default ReviewsRatingsPage
