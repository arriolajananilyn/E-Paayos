import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Flag,
  Loader2,
  MessageSquare,
  MessageSquareReply,
  RefreshCw,
  Search,
  Send,
  Star,
  ThumbsUp,
  TrendingUp,
  WifiOff,
  X,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  fetchAllReviews,
  replyToReviewApi,
  toggleFlagApi,
  toggleHiddenApi,
} from "@/lib/reviewApi"
import ShopOwnerDashboard from "./dashboard.jsx"

// ── Styling Constants ─────────────────────────────────────────────────────────
const cardShadow =
  "shadow-[0_4px_20px_-4px_rgba(15,23,42,0.16)] transition-shadow duration-200"

const controlShadow =
  "shadow-[0_4px_20px_-4px_rgba(15,23,42,0.16)] transition-shadow duration-200 focus-within:shadow-[0_4px_24px_-4px_rgba(8,31,92,0.25)]"

const inputClass = cn(
  "w-full rounded-none border-0 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none",
  controlShadow,
  "focus:shadow-[0_4px_24px_-4px_rgba(8,31,92,0.25)]"
)

const selectClass = cn(
  "w-full min-w-0",
  "[&_[data-slot=native-select]]:h-auto",
  "[&_[data-slot=native-select]]:rounded-none",
  "[&_[data-slot=native-select]]:border-0",
  "[&_[data-slot=native-select]]:bg-white",
  "[&_[data-slot=native-select]]:px-2.5 sm:[&_[data-slot=native-select]]:px-4",
  "[&_[data-slot=native-select]]:py-2 sm:[&_[data-slot=native-select]]:py-2.5",
  "[&_[data-slot=native-select]]:pr-8 sm:[&_[data-slot=native-select]]:pr-10",
  "[&_[data-slot=native-select]]:text-xs sm:[&_[data-slot=native-select]]:text-sm",
  "[&_[data-slot=native-select]]:text-slate-700",
  "[&_[data-slot=native-select]]:shadow-[0_4px_20px_-4px_rgba(15,23,42,0.16)]",
  "[&_[data-slot=native-select]]:transition-shadow",
  "[&_[data-slot=native-select]]:focus-visible:outline-none",
  "[&_[data-slot=native-select]]:focus-visible:shadow-[0_4px_24px_-4px_rgba(8,31,92,0.25)]",
  "[&_[data-slot=native-select-icon]]:right-2.5 sm:[&_[data-slot=native-select-icon]]:right-3.5",
  "[&_[data-slot=native-select-icon]]:size-3.5 sm:[&_[data-slot=native-select-icon]]:size-4",
  "[&_[data-slot=native-select-icon]]:text-slate-400"
)

const statCardThemes = {
  amber: {
    surface: "bg-gradient-to-br from-white via-amber-50/35 to-yellow-100/35",
    glow: "bg-amber-400/25",
    icon: "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/35",
    iconRing: "ring-amber-100/80",
    bar: "from-amber-500 via-orange-400 to-orange-300/0",
    hint: "text-amber-600/70",
  },
  emerald: {
    surface: "bg-gradient-to-br from-white via-blue-50/40 to-indigo-100/35",
    glow: "bg-[#081F5C]/20",
    icon: "bg-gradient-to-br from-[#081F5C] via-[#0a2773] to-[#1447a6] text-white shadow-lg shadow-[#081F5C]/35",
    iconRing: "ring-blue-100/80",
    bar: "from-[#081F5C] via-[#1447a6] to-blue-400/0",
    hint: "text-[#081F5C]/80",
  },
  sky: {
    surface: "bg-gradient-to-br from-white via-sky-50/30 to-blue-100/35",
    glow: "bg-sky-400/25",
    icon: "bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/35",
    iconRing: "ring-sky-100/80",
    bar: "from-sky-500 via-blue-400 to-blue-300/0",
    hint: "text-sky-600/70",
  },
  rose: {
    surface: "bg-gradient-to-br from-white via-rose-50/30 to-red-100/30",
    glow: "bg-rose-400/25",
    icon: "bg-gradient-to-br from-rose-500 to-red-500 text-white shadow-lg shadow-rose-500/35",
    iconRing: "ring-rose-100/80",
    bar: "from-rose-500 via-red-400 to-red-300/0",
    hint: "text-rose-600/70",
  },
}

// ── Helper: format time ───────────────────────────────────────────────────────
function formatRelativeTime(isoString) {
  if (!isoString) return ""
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  })
}

function formatFullDate(isoString) {
  if (!isoString) return ""
  return new Date(isoString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StarRating({ rating, size = "sm", interactive = false, onChange }) {
  const sizeClass = size === "lg" ? "size-5" : size === "md" ? "size-4" : "size-3.5"

  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onChange?.(star)}
          className={cn(
            "transition-colors",
            interactive && "cursor-pointer hover:scale-110",
            !interactive && "cursor-default"
          )}
        >
          <Star
            className={cn(
              sizeClass,
              star <= rating ? "fill-amber-400 text-amber-400" : "fill-slate-100 text-slate-200"
            )}
          />
        </button>
      ))}
    </div>
  )
}

function StatCard({ theme, label, value, icon: Icon, hint, progress }) {
  const colors = statCardThemes[theme] || statCardThemes.emerald

  return (
    <div
      className={cn(
        "group relative flex items-center gap-2.5 sm:gap-4 overflow-hidden rounded-none p-3 sm:p-5 ring-1 ring-slate-200/45 transition-all duration-300 hover:-translate-y-0.5 hover:ring-slate-200/80",
        colors.surface,
        cardShadow,
        "hover:shadow-[0_10px_36px_-10px_rgba(15,23,42,0.24)]"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(15 23 42) 1px, transparent 1px), linear-gradient(to bottom, rgb(15 23 42) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 size-24 rounded-full blur-3xl transition-all duration-500 group-hover:scale-110 opacity-70",
          colors.glow
        )}
      />
      <div
        className={cn(
          "relative flex size-9 sm:size-11 shrink-0 items-center justify-center rounded-none ring-2 sm:ring-4",
          colors.icon,
          colors.iconRing
        )}
      >
        <Icon className="size-3.5 sm:size-[1.15rem]" strokeWidth={2.25} />
      </div>
      <div className="relative min-w-0 flex-1">
        <p className="mb-0.5 truncate text-[10px] sm:text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        <p className="truncate text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-slate-900">
          {value}
        </p>
        {hint ? (
          <p className={cn("mt-0.5 truncate text-[10px] sm:text-xs font-medium", colors.hint)}>
            {hint}
          </p>
        ) : null}
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1 overflow-hidden bg-slate-200/40">
        <div
          className={cn(
            "h-full bg-gradient-to-r transition-all duration-700 ease-out",
            colors.bar,
            typeof progress === "number" ? "opacity-90" : "w-full opacity-80"
          )}
          style={
            typeof progress === "number"
              ? { width: `${Math.min(100, Math.max(0, progress))}%` }
              : undefined
          }
        />
      </div>
    </div>
  )
}

function RatingDistribution({ distribution, total }) {
  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((stars) => {
        const count = distribution[stars] || 0
        const pct = total > 0 ? Math.round((count / total) * 100) : 0

        return (
          <div key={stars} className="flex items-center gap-2.5">
            <span className="flex w-8 shrink-0 items-center gap-1 text-xs font-medium text-slate-600">
              {stars}
              <Star className="size-3 fill-amber-400 text-amber-400" />
            </span>
            <div className="h-2 min-w-0 flex-1 overflow-hidden bg-slate-100">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs tabular-nums text-slate-400">
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function ReviewCard({ review, onReply, onToggleFlag, onToggleHidden, onSelect, isSelected, onPreviewImage }) {
  const reviewId = review._id || review.id
  const customerName = review.customer?.isAnonymous ? "Anonymous" : (review.customer?.fullName || "Customer")
  const customerEmail = review.customer?.isAnonymous ? "" : (review.customer?.email || "")
  const initials = customerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <article
      className={cn(
        "group relative overflow-hidden bg-white ring-1 ring-slate-200/50 transition-all duration-200",
        cardShadow,
        "hover:shadow-[0_8px_30px_-8px_rgba(15,23,42,0.22)]",
        isSelected && "ring-[#1447a6]/60 shadow-[0_0_0_1px_rgba(8,31,92,0.3)]",
        review.hidden && "opacity-60"
      )}
    >
      {review.flagged ? (
        <div className="absolute right-0 top-0 bg-rose-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Flagged
        </div>
      ) : null}

      <div className="p-3.5 sm:p-5">
        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 gap-2.5 sm:gap-3">
            <Avatar className="size-9 sm:size-10 shrink-0 rounded-none ring-1 ring-slate-200/60">
              <AvatarFallback className="rounded-none bg-[#081F5C]/10 text-xs font-semibold text-[#081F5C]">
                {initials || "?"}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-semibold text-slate-900">{customerName}</p>
                {customerEmail && (
                  <span className="text-xs text-slate-400">{customerEmail}</span>
                )}
                <span className="text-xs text-slate-400">
                  {formatRelativeTime(review.createdAt)}
                </span>
                {review.hidden ? (
                  <Badge className="rounded-none border-0 bg-slate-100 px-1.5 py-0 text-[10px] text-slate-600 ring-1 ring-slate-200/60">
                    Hidden
                  </Badge>
                ) : null}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StarRating rating={review.rating} size="md" />
                {review.status === "pending" ? (
                  <Badge className="rounded-none border-0 bg-amber-50 px-1.5 py-0 text-[10px] text-amber-700 ring-1 ring-amber-100">
                    Needs reply
                  </Badge>
                ) : (
                  <Badge className="rounded-none border-0 bg-blue-50 px-1.5 py-0 text-[10px] text-[#081F5C] ring-1 ring-blue-100">
                    Replied
                  </Badge>
                )}
              </div>

              {review.title ? (
                <p className="mt-2 text-sm font-medium text-slate-800">{review.title}</p>
              ) : null}
              <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-slate-600">
                {review.comment}
              </p>

              {Array.isArray(review.images) && review.images.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {review.images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onPreviewImage?.(imgUrl)
                      }}
                      className="group relative size-12 sm:size-14 overflow-hidden border border-slate-200 focus:outline-none cursor-pointer"
                    >
                      <img
                        src={imgUrl}
                        alt={`Customer photo ${idx + 1}`}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center text-white">
                        <Eye className="size-4" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <ThumbsUp className="size-3" />
                  {review.helpfulCount || 0} helpful
                </span>
                {review.orderId ? (
                  <span className="font-medium text-slate-500">{review.orderId}</span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 sm:border-0 pt-2.5 sm:pt-0 w-full sm:w-auto sm:flex-col sm:items-end">
            <div className="flex items-center gap-2.5">
              {review.productImage ? (
                <img
                  src={review.productImage}
                  alt={review.productName}
                  className="size-11 sm:size-14 object-cover ring-1 ring-slate-200/60"
                  onError={(e) => { e.target.style.display = "none" }}
                />
              ) : (
                <div className="size-11 sm:size-14 bg-blue-50 flex items-center justify-center text-[#081F5C] text-[10px] font-semibold">
                  {(review.productName || "").slice(0, 3)}
                </div>
              )}
              <div className="min-w-0 max-w-[200px] sm:max-w-[160px]">
                <p className="line-clamp-2 text-xs font-medium text-slate-700">
                  {review.productName}
                </p>
              </div>
            </div>
          </div>
        </div>

        {review.adminReply ? (
          <div className="mt-3 sm:mt-4 border-l-2 border-[#1447a6] bg-blue-50/50 px-3 py-2.5 sm:px-4">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#081F5C]">
              <MessageSquareReply className="size-3.5" />
              Your reply
              <span className="font-normal text-blue-700/80">
                · {formatRelativeTime(review.adminReply.repliedAt)}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">{review.adminReply.message}</p>
          </div>
        ) : null}

        <div className="mt-3.5 sm:mt-4 flex flex-wrap items-center gap-1.5 sm:gap-2 border-t border-slate-100 pt-3 sm:pt-4">
          <Button
            type="button"
            size="sm"
            variant={review.status === "pending" ? "default" : "outline"}
            className={cn(
              "h-8 px-2.5 sm:px-3 rounded-none text-xs cursor-pointer",
              review.status === "pending" && "bg-[#081F5C] text-white hover:bg-[#04133d]"
            )}
            onClick={() => onReply(review)}
          >
            <MessageSquare className="size-3.5" />
            {review.adminReply ? "Edit reply" : "Reply"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-2.5 sm:px-3 rounded-none text-xs text-slate-600 cursor-pointer"
            onClick={() => onSelect(review)}
          >
            <Eye className="size-3.5" />
            View details
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 px-2.5 sm:px-3 rounded-none text-xs cursor-pointer",
              review.flagged ? "text-rose-600" : "text-slate-600"
            )}
            onClick={() => onToggleFlag(reviewId)}
          >
            <Flag className="size-3.5" />
            {review.flagged ? "Unflag" : "Flag"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 px-2.5 sm:px-3 rounded-none text-xs text-slate-600 cursor-pointer"
            onClick={() => onToggleHidden(reviewId)}
          >
            {review.hidden ? (
              <>
                <Eye className="size-3.5" />
                Show
              </>
            ) : (
              <>
                <EyeOff className="size-3.5" />
                Hide
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function ReviewRatings() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [ratingFilter, setRatingFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [sortBy, setSortBy] = useState("newest")
  const [showHidden, setShowHidden] = useState(false)

  const [replyDialogOpen, setReplyDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedReview, setSelectedReview] = useState(null)
  const [replyDraft, setReplyDraft] = useState("")
  const [lightboxImage, setLightboxImage] = useState(null)

  // ── Fetch Reviews from API ─────────────────────────────────────────────────
  const loadReviews = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { showHidden: showHidden ? "true" : "false", sortBy }
      if (ratingFilter) params.rating = ratingFilter
      if (statusFilter) params.status = statusFilter
      if (searchQuery.trim()) params.search = searchQuery.trim()

      const data = await fetchAllReviews(params)
      setReviews(Array.isArray(data.reviews) ? data.reviews : [])
    } catch (err) {
      console.error("loadReviews error:", err)
      setError("Could not load reviews. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }, [showHidden, sortBy, ratingFilter, statusFilter, searchQuery])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = reviews.filter((r) => !r.hidden)
    const total = active.length
    const avgRating = total > 0 ? active.reduce((sum, r) => sum + r.rating, 0) / total : 0
    const pending = active.filter((r) => r.status === "pending").length
    const flagged = active.filter((r) => r.flagged).length

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const review of active) {
      distribution[review.rating] = (distribution[review.rating] || 0) + 1
    }

    return { total, avgRating, pending, flagged, distribution }
  }, [reviews])

  // ── Filtered Reviews (client-side re-filter for instant UI) ───────────────
  const filteredReviews = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    let result = [...reviews]

    if (!showHidden) result = result.filter((r) => !r.hidden)
    if (ratingFilter) result = result.filter((r) => r.rating === Number(ratingFilter))
    if (statusFilter === "pending") result = result.filter((r) => r.status === "pending")
    else if (statusFilter === "replied") result = result.filter((r) => r.status === "replied")
    else if (statusFilter === "flagged") result = result.filter((r) => r.flagged)

    if (query) {
      result = result.filter(
        (r) =>
          (r.customer?.fullName || "").toLowerCase().includes(query) ||
          (r.customer?.email || "").toLowerCase().includes(query) ||
          (r.productName || "").toLowerCase().includes(query) ||
          (r.title || "").toLowerCase().includes(query) ||
          (r.comment || "").toLowerCase().includes(query) ||
          (r.orderId || "").toLowerCase().includes(query)
      )
    }

    result.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt) - new Date(a.createdAt)
      if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt)
      if (sortBy === "highest") return b.rating - a.rating || new Date(b.createdAt) - new Date(a.createdAt)
      if (sortBy === "lowest") return a.rating - b.rating || new Date(b.createdAt) - new Date(a.createdAt)
      if (sortBy === "helpful") return (b.helpfulCount || 0) - (a.helpfulCount || 0) || new Date(b.createdAt) - new Date(a.createdAt)
      return 0
    })

    return result
  }, [reviews, searchQuery, ratingFilter, statusFilter, sortBy, showHidden])

  // ── Dialog Handlers ────────────────────────────────────────────────────────
  const openReplyDialog = useCallback((review) => {
    setSelectedReview(review)
    setReplyDraft(review.adminReply?.message ?? "")
    setReplyDialogOpen(true)
  }, [])

  const openDetailDialog = useCallback((review) => {
    setSelectedReview(review)
    setDetailDialogOpen(true)
  }, [])

  const handleSubmitReply = useCallback(async () => {
    const text = replyDraft.trim()
    if (!text || !selectedReview) return

    setSubmitting(true)
    try {
      const reviewId = selectedReview._id || selectedReview.id
      const data = await replyToReviewApi(reviewId, text)
      setReviews((prev) =>
        prev.map((r) => (r._id === reviewId || r.id === reviewId ? { ...r, ...data.review } : r))
      )
      toast.success("Reply submitted successfully!")
      setReplyDialogOpen(false)
      setReplyDraft("")
      setSelectedReview(null)
    } catch (err) {
      toast.error(err.message || "Failed to submit reply")
    } finally {
      setSubmitting(false)
    }
  }, [replyDraft, selectedReview])

  const toggleFlag = useCallback(async (id) => {
    try {
      await toggleFlagApi(id)
      setReviews((prev) =>
        prev.map((r) => (r._id === id || r.id === id ? { ...r, flagged: !r.flagged } : r))
      )
    } catch (err) {
      toast.error(err.message || "Failed to update flag")
    }
  }, [])

  const toggleHidden = useCallback(async (id) => {
    try {
      await toggleHiddenApi(id)
      setReviews((prev) =>
        prev.map((r) => (r._id === id || r.id === id ? { ...r, hidden: !r.hidden } : r))
      )
    } catch (err) {
      toast.error(err.message || "Failed to update visibility")
    }
  }, [])

  const clearFilters = () => {
    setSearchQuery("")
    setRatingFilter("")
    setStatusFilter("")
    setSortBy("newest")
  }

  const hasActiveFilters = searchQuery.trim() || ratingFilter || statusFilter || sortBy !== "newest"

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full min-w-0 max-w-full space-y-3 sm:space-y-4 overflow-x-hidden">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          theme="amber"
          label="Average Rating"
          value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}
          icon={Star}
          hint={stats.total > 0 ? `${stats.total} total review${stats.total === 1 ? "" : "s"}` : "No reviews yet"}
          progress={stats.avgRating > 0 ? (stats.avgRating / 5) * 100 : 0}
        />
        <StatCard
          theme="emerald"
          label="Total Reviews"
          value={stats.total}
          icon={TrendingUp}
          hint="Across all services"
        />
        <StatCard
          theme="sky"
          label="Pending Replies"
          value={stats.pending}
          icon={MessageSquare}
          hint={stats.pending > 0 ? "Awaiting your response" : "All caught up"}
          progress={stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}
        />
        <StatCard
          theme="rose"
          label="Flagged"
          value={stats.flagged}
          icon={AlertTriangle}
          hint={stats.flagged > 0 ? "Needs attention" : "No flagged reviews"}
        />
      </div>

      {/* Rating Distribution + Search/Filters */}
      <div className="grid gap-4 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">
        <div className={cn("bg-white p-4 sm:p-5", cardShadow)}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Rating breakdown</h2>
            <div className="flex items-center gap-1">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              <span className="text-lg font-bold tabular-nums text-slate-900">
                {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "—"}
              </span>
            </div>
          </div>
          <RatingDistribution distribution={stats.distribution} total={stats.total} />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative w-full min-w-0">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reviews, customers, services..."
                className={cn(inputClass, "pr-12")}
              />
              <button
                type="button"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-none bg-gradient-to-r from-[#081F5C] via-[#0a2773] to-[#1447a6] p-2 text-white shadow-md shadow-[#081F5C]/30 transition-all hover:from-[#04133d] hover:to-[#081F5C] cursor-pointer"
                aria-label="Search reviews"
              >
                <Search className="size-3.5" />
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-[42px] rounded-none shrink-0 border-0 bg-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.16)] hover:bg-slate-50 text-slate-700 cursor-pointer"
              onClick={loadReviews}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <NativeSelect
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className={selectClass}
            >
              <NativeSelectOption value="">All ratings</NativeSelectOption>
              <NativeSelectOption value="5">5 stars</NativeSelectOption>
              <NativeSelectOption value="4">4 stars</NativeSelectOption>
              <NativeSelectOption value="3">3 stars</NativeSelectOption>
              <NativeSelectOption value="2">2 stars</NativeSelectOption>
              <NativeSelectOption value="1">1 star</NativeSelectOption>
            </NativeSelect>

            <NativeSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={selectClass}
            >
              <NativeSelectOption value="">All status</NativeSelectOption>
              <NativeSelectOption value="pending">Needs reply</NativeSelectOption>
              <NativeSelectOption value="replied">Replied</NativeSelectOption>
              <NativeSelectOption value="flagged">Flagged</NativeSelectOption>
            </NativeSelect>

            <NativeSelect
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={selectClass}
            >
              <NativeSelectOption value="newest">Newest first</NativeSelectOption>
              <NativeSelectOption value="oldest">Oldest first</NativeSelectOption>
              <NativeSelectOption value="highest">Highest rating</NativeSelectOption>
              <NativeSelectOption value="lowest">Lowest rating</NativeSelectOption>
              <NativeSelectOption value="helpful">Most helpful</NativeSelectOption>
            </NativeSelect>

            <label
              className={cn(
                "flex min-h-[38px] sm:min-h-[42px] cursor-pointer items-center gap-2 bg-white px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-700",
                controlShadow
              )}
            >
              <input
                type="checkbox"
                checked={showHidden}
                onChange={(e) => setShowHidden(e.target.checked)}
                className="size-3.5 shrink-0 rounded border-slate-300 text-[#081F5C] focus:ring-[#081F5C]"
              />
              <span className="truncate">Show hidden</span>
            </label>
          </div>

          {hasActiveFilters ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500">
                {filteredReviews.length} result{filteredReviews.length === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs font-medium text-[#1447a6] hover:text-[#081F5C] cursor-pointer"
              >
                <X className="size-3" />
                Clear filters
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className={cn("bg-white flex flex-col items-center justify-center p-16", cardShadow)}>
          <Loader2 className="size-10 text-[#081F5C] animate-spin mb-3" />
          <p className="text-sm text-slate-500">Loading reviews from database...</p>
        </div>
      ) : error ? (
        <div className={cn("bg-white flex flex-col items-center justify-center p-16", cardShadow)}>
          <WifiOff className="size-10 text-rose-400 mb-3" />
          <p className="text-sm font-semibold text-slate-700">{error}</p>
          <Button onClick={loadReviews} variant="outline" className="mt-4 rounded-none cursor-pointer">
            <RefreshCw className="size-4 mr-2" /> Retry
          </Button>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className={cn("bg-white", cardShadow)}>
          <Empty className="border-0 py-16">
            <EmptyHeader>
              <EmptyMedia>
                <div className="flex size-14 items-center justify-center bg-gradient-to-br from-[#081F5C] via-[#0a2773] to-[#1447a6] shadow-lg shadow-[#081F5C]/25">
                  <Star className="size-6 text-white" />
                </div>
              </EmptyMedia>
              <EmptyTitle className="text-base text-slate-800">No reviews found</EmptyTitle>
              <EmptyDescription className="text-slate-500">
                {hasActiveFilters
                  ? "Try adjusting your search or filters to find reviews."
                  : "Customer reviews will appear here once they leave feedback on your services."}
              </EmptyDescription>
            </EmptyHeader>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="outline"
                className="mt-2 rounded-none cursor-pointer"
                onClick={clearFilters}
              >
                Clear all filters
              </Button>
            ) : null}
            <div className="mt-2 flex items-center gap-1 text-xs text-slate-400 lg:hidden">
              <ChevronDown className="size-3.5" />
              Reviews from customers will show up here
            </div>
          </Empty>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filteredReviews.map((review) => {
            const reviewId = review._id || review.id
            return (
              <ReviewCard
                key={reviewId}
                review={review}
                onReply={openReplyDialog}
                onToggleFlag={toggleFlag}
                onToggleHidden={toggleHidden}
                onSelect={openDetailDialog}
                onPreviewImage={setLightboxImage}
                isSelected={
                  (selectedReview?._id === reviewId || selectedReview?.id === reviewId) &&
                  detailDialogOpen
                }
              />
            )
          })}
        </div>
      )}

      {/* ── Reply Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-none p-4 sm:p-6 sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900">
              {selectedReview?.adminReply ? "Edit reply" : "Reply to review"}
            </DialogTitle>
            <DialogDescription>
              Your response will be visible to the customer and other shoppers.
            </DialogDescription>
          </DialogHeader>

          {selectedReview ? (
            <div className="space-y-4">
              <div className="border border-slate-100 bg-slate-50/60 p-3">
                <div className="flex items-start gap-3">
                  <Avatar className="size-8 shrink-0 rounded-none">
                    <AvatarFallback className="rounded-none bg-[#081F5C]/10 text-[10px] font-semibold text-[#081F5C]">
                      {(selectedReview.customer?.isAnonymous
                        ? "AN"
                        : selectedReview.customer?.fullName || "??"
                      )
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {selectedReview.customer?.isAnonymous
                        ? "Anonymous"
                        : selectedReview.customer?.fullName || "Customer"}
                    </p>
                    <StarRating rating={selectedReview.rating} size="sm" />
                    <p className="mt-1.5 text-sm text-slate-600 line-clamp-3">
                      {selectedReview.comment}
                    </p>
                  </div>
                </div>
              </div>

              <Textarea
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                placeholder="Write your reply to the customer..."
                rows={4}
                className="min-h-[100px] resize-none rounded-none border-slate-200 focus-visible:ring-[#081F5C]/30"
              />
            </div>
          ) : null}

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 w-full sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto rounded-none cursor-pointer"
              onClick={() => setReplyDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto rounded-none bg-[#081F5C] text-white hover:bg-[#04133d] cursor-pointer"
              disabled={!replyDraft.trim() || submitting}
              onClick={handleSubmitReply}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {selectedReview?.adminReply ? "Update reply" : "Send reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-h-[90vh] max-w-lg overflow-y-auto rounded-none p-4 sm:p-6 sm:max-w-2xl">
          {selectedReview ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-slate-900">Review details</DialogTitle>
                <DialogDescription>
                  {formatFullDate(selectedReview.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <Avatar className="size-12 shrink-0 rounded-none ring-1 ring-slate-200/60">
                    <AvatarFallback className="rounded-none bg-[#081F5C]/10 text-sm font-semibold text-[#081F5C]">
                      {(selectedReview.customer?.isAnonymous
                        ? "AN"
                        : selectedReview.customer?.fullName || "??"
                      )
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">
                      {selectedReview.customer?.isAnonymous
                        ? "Anonymous"
                        : selectedReview.customer?.fullName || "Customer"}
                    </p>
                    {!selectedReview.customer?.isAnonymous && selectedReview.customer?.email && (
                      <p className="text-sm text-slate-500">{selectedReview.customer.email}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StarRating rating={selectedReview.rating} size="md" />
                      {selectedReview.flagged ? (
                        <Badge className="rounded-none border-0 bg-rose-50 text-rose-700 ring-1 ring-rose-100">
                          Flagged
                        </Badge>
                      ) : null}
                      {selectedReview.hidden ? (
                        <Badge className="rounded-none border-0 bg-slate-100 text-slate-600 ring-1 ring-slate-200/60">
                          Hidden
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 border border-slate-100 bg-slate-50/50 p-3">
                  {selectedReview.productImage ? (
                    <img
                      src={selectedReview.productImage}
                      alt={selectedReview.productName}
                      className="size-14 object-cover ring-1 ring-slate-200/60"
                      onError={(e) => { e.target.style.display = "none" }}
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{selectedReview.productName}</p>
                    {selectedReview.orderId ? (
                      <p className="text-xs text-slate-500">{selectedReview.orderId}</p>
                    ) : null}
                  </div>
                </div>

                {selectedReview.title ? (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Title</p>
                    <p className="text-sm font-medium text-slate-800">{selectedReview.title}</p>
                  </div>
                ) : null}

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Review</p>
                  <p className="text-sm leading-relaxed text-slate-700">{selectedReview.comment}</p>
                </div>

                {Array.isArray(selectedReview.images) && selectedReview.images.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Attached Customer Photos ({selectedReview.images.length})
                    </p>
                    <div className="flex flex-wrap gap-2.5">
                      {selectedReview.images.map((imgUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setLightboxImage(imgUrl)}
                          className="group relative size-20 overflow-hidden border border-slate-200 focus:outline-none cursor-pointer"
                        >
                          <img
                            src={imgUrl}
                            alt={`Customer photo ${idx + 1}`}
                            className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center text-white">
                            <Eye className="size-5" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedReview.ratingsBreakdown && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Detailed Ratings</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {Object.entries(selectedReview.ratingsBreakdown).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-1.5">
                          <span className="capitalize text-slate-500">{key}:</span>
                          <StarRating rating={val} size="sm" />
                          <span className="text-xs text-slate-400">{val}/5</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <ThumbsUp className="size-4 text-slate-400" />
                    {selectedReview.helpfulCount || 0} found helpful
                  </span>
                  <span className="flex items-center gap-1.5">
                    {selectedReview.status === "replied" ? (
                      <>
                        <CheckCircle2 className="size-4 text-[#081F5C]" />
                        Replied
                      </>
                    ) : (
                      <>
                        <MessageSquare className="size-4 text-amber-500" />
                        Awaiting reply
                      </>
                    )}
                  </span>
                </div>

                {selectedReview.adminReply ? (
                  <div className="border-l-2 border-[#1447a6] bg-blue-50/50 p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#081F5C]">
                      Your reply · {formatFullDate(selectedReview.adminReply.repliedAt)}
                    </p>
                    <p className="text-sm leading-relaxed text-slate-700">
                      {selectedReview.adminReply.message}
                    </p>
                  </div>
                ) : null}
              </div>

              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto rounded-none cursor-pointer"
                  onClick={() => {
                    setDetailDialogOpen(false)
                    openReplyDialog(selectedReview)
                  }}
                >
                  <MessageSquare className="size-4" />
                  {selectedReview.adminReply ? "Edit reply" : "Reply"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto rounded-none cursor-pointer"
                  onClick={() => toggleFlag(selectedReview._id || selectedReview.id)}
                >
                  <Flag className="size-4" />
                  {selectedReview.flagged ? "Unflag" : "Flag review"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto rounded-none cursor-pointer"
                  onClick={() => toggleHidden(selectedReview._id || selectedReview.id)}
                >
                  {selectedReview.hidden ? (
                    <>
                      <Eye className="size-4" />
                      Show review
                    </>
                  ) : (
                    <>
                      <EyeOff className="size-4" />
                      Hide review
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Image Lightbox Modal ─────────────────────────────────────────────── */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent overlayClassName="bg-black/80 z-[99999]" className="w-[calc(100vw-1rem)] max-w-3xl p-2 bg-black/90 border-none z-[99999] rounded-none">
          <div className="relative flex items-center justify-center p-4">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute right-2 top-2 rounded-full bg-slate-800/80 p-2 text-white hover:bg-slate-700 cursor-pointer"
            >
              <X className="size-5" />
            </button>
            {lightboxImage && (
              <img
                src={lightboxImage}
                alt="Customer attached review media"
                className="max-h-[80vh] w-auto object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ReviewsRatingsPage() {
  return (
    <ShopOwnerDashboard
      activeSection="reviews-ratings"
      pageMeta={{
        title: "Reviews & Ratings",
        description: "View and respond to customer feedback on your services.",
      }}
    >
      <ReviewRatings />
    </ShopOwnerDashboard>
  )
}
