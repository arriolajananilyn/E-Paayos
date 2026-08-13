import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  Loader2,
  MessageSquare,
  Search,
  SlidersHorizontal,
  Star,
  Store,
  ThumbsUp,
  Trash2,
  X
} from 'lucide-react'

import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import CustomerLayout, { readCustomerUserSession } from '../../layout/customerlayout.jsx'
import { cn } from '../../lib/utils'

const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

function useNavigate() {
  return (path) => {
    if (!path) return
    const target = path.startsWith('#') ? path : `#/customer/${path.replace(/^\/customer\//, '').replace(/^\//, '')}`
    window.location.hash = target
  }
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

function StarRating({ rating = 0, interactive = false, size = 'size-4', onRatingChange }) {
  const current = Math.max(0, Math.min(5, Number(rating) || 0))
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => interactive && onRatingChange && onRatingChange(star)}
          className={cn(
            'transition-transform',
            interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
          )}
        >
          <Star
            className={cn(
              size,
              star <= current ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
            )}
          />
        </button>
      ))}
    </div>
  )
}

function ImageWithFallback({ src, alt, className }) {
  const [error, setError] = useState(false)
  const resolved = resolveMediaSrc(src)

  if (error || !resolved) {
    return (
      <div className={cn('flex items-center justify-center bg-slate-100 text-slate-400', className)}>
        <Camera className="size-5" />
      </div>
    )
  }

  return (
    <img
      src={resolved}
      alt={alt || 'Image'}
      className={className}
      onError={() => setError(true)}
    />
  )
}

function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-sm bg-white p-8 text-center border border-slate-200 shadow-xs">
      <Loader2 className="size-8 animate-spin text-[#081F5C] mb-2" />
      <p className="text-xs font-semibold text-slate-600">{message}</p>
    </div>
  )
}

function ErrorState({ message = 'An error occurred', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-sm bg-white p-8 text-center border border-slate-200 shadow-xs">
      <AlertCircle className="size-8 text-red-500 mb-2" />
      <p className="text-xs font-semibold text-rose-600 mb-3">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="rounded-sm text-xs">
          Try Again
        </Button>
      )}
    </div>
  )
}

const selectShell =
  'h-9 w-full appearance-none rounded-sm border border-slate-200 bg-white px-3 py-2 pr-8 text-xs sm:text-sm shadow-[0_2px_5px_rgba(15,23,42,0.14)] outline-none focus-visible:ring-1 focus-visible:ring-[#081F5C] focus-visible:border-[#081F5C] transition-all hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)] hover:border-slate-300'

export default function CustomerReviewsRatings() {
  const navigate = useNavigate()
  const [user] = useState(readCustomerUserSession)

  // Tabs: "published" | "to-review" | "replied"
  const [activeTab, setActiveTab] = useState('published')

  // Main data arrays
  const [userReviews, setUserReviews] = useState([])
  const [groupedPendingOrders, setGroupedPendingOrders] = useState([])

  // Loading & error states
  const [loadingPending, setLoadingPending] = useState(false)
  const [errorPending, setErrorPending] = useState('')
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [errorReviews, setErrorReviews] = useState('')

  // Filters & search
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedRating, setSelectedRating] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [searchTerm, setSearchTerm] = useState('')

  // Modals & Lightbox
  const [lightboxImage, setLightboxImage] = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedItemForReview, setSelectedItemForReview] = useState(null)
  const [orderItemsForReview, setOrderItemsForReview] = useState([])

  // Form states
  const [formRating, setFormRating] = useState(5)
  const [formQuality, setFormQuality] = useState(5)
  const [formService, setFormService] = useState(5)
  const [formDelivery, setFormDelivery] = useState(5)
  const [formTitle, setFormTitle] = useState('')
  const [formComment, setFormComment] = useState('')
  const [formUploadedImages, setFormUploadedImages] = useState([])
  const [formRecommend, setFormRecommend] = useState(true)
  const [formIsAnonymous, setFormIsAnonymous] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const cardShadow = 'shadow-[0_3px_8px_rgba(15,23,42,0.14)] hover:shadow-[0_6px_16px_rgba(8,31,92,0.22)] hover:border-[#081F5C] transition-all'

  const loadPendingReviews = async () => {
    setLoadingPending(true)
    setErrorPending('')
    try {
      const res = await fetch(`${API_URL}/api/catalog/bookings`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Failed to fetch items to review.')
      const raw = Array.isArray(data?.bookings) ? data.bookings : []

      const pending = raw.filter(
        (b) => String(b.status).toLowerCase() === 'completed' && !Number(b.customerReviewRating)
      )

      const groupsMap = {}
      pending.forEach((b) => {
        const oid = b.ref || b.orderId || b.id
        if (!groupsMap[oid]) {
          groupsMap[oid] = {
            orderId: oid,
            deliveryDate: b.updatedAt
              ? new Date(b.updatedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
              : 'Recently',
            items: [],
          }
        }
        groupsMap[oid].items.push({
          id: b.id,
          orderItemId: b.id,
          orderId: oid,
          productName: b.serviceName || b.productName || 'Service Request',
          productImage: (Array.isArray(b.issuePhotos) && b.issuePhotos[0]) || b.productImage || '',
          sellerName: b.shopName || b.sellerName || 'Service Provider',
          category: b.category || 'Repair Service',
          quantity: 1,
          bookingRaw: b,
        })
      })
      setGroupedPendingOrders(Object.values(groupsMap))
    } catch (err) {
      setErrorPending(err.message)
    } finally {
      setLoadingPending(false)
    }
  }

  const loadMyReviews = async () => {
    setLoadingReviews(true)
    setErrorReviews('')
    try {
      const res = await fetch(`${API_URL}/api/catalog/bookings`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Failed to fetch published reviews.')
      const raw = Array.isArray(data?.bookings) ? data.bookings : []

      const published = raw
        .filter((b) => Number(b.customerReviewRating) > 0)
        .map((b) => {
          const rId = b.id
          return {
            _id: rId,
            id: rId,
            bookingId: b.id,
            orderId: b.ref || b.orderId || b.id,
            productName: b.serviceName || b.productName || 'Service Request',
            productImage: (Array.isArray(b.issuePhotos) && b.issuePhotos[0]) || b.productImage || '',
            category: b.category || 'Repair Service',
            sellerName: b.shopName || b.sellerName || 'Service Provider',
            rating: Number(b.customerReviewRating) || 5,
            recommend: b.customerReviewRecommend !== false,
            ratingsBreakdown: b.ratingsBreakdown || {
              quality: Number(b.customerReviewRating) || 5,
              service: Number(b.customerReviewRating) || 5,
              delivery: Number(b.customerReviewRating) || 5,
            },
            title: b.customerReviewTitle || `${b.customerReviewRating}-Star Service Feedback`,
            comment: b.customerReviewComment || '',
            images: Array.isArray(b.customerReviewMedia)
              ? b.customerReviewMedia.map((m) => (typeof m === 'string' ? m : m.url)).filter(Boolean)
              : [],
            createdAt: b.customerReviewedAt || b.updatedAt || b.createdAt,
            date: b.customerReviewedAt
              ? new Date(b.customerReviewedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
              : '',
            adminReply: (b.shopResponse || b.adminReply)
              ? {
                sellerName: b.shopName || b.sellerName || 'Service Provider',
                message: typeof b.shopResponse === 'string' ? b.shopResponse : (b.adminReply?.message || ''),
                repliedAt: b.providerReviewRespondedAt || b.adminReply?.repliedAt || new Date().toISOString(),
              }
              : null,
            userVotedHelpful: false,
            helpfulCount: Number(b.helpfulCount) || 0,
            customer: {
              isAnonymous: false,
            },
          }
        })
      setUserReviews(published)
    } catch (err) {
      setErrorReviews(err.message)
    } finally {
      setLoadingReviews(false)
    }
  }

  useEffect(() => {
    if (!user) return
    loadPendingReviews()
    loadMyReviews()
  }, [user])

  const repliedCount = userReviews.filter((r) => !!r.adminReply).length

  // Dynamically compute available categories from actual page data
  const availableCategories = useMemo(() => {
    const set = new Set()
    userReviews.forEach((review) => {
      if (review.category && typeof review.category === 'string') {
        const cat = review.category.trim()
        if (cat) set.add(cat)
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [userReviews])

  // Dynamically compute available ratings from actual page data
  const availableRatings = useMemo(() => {
    const set = new Set()
    userReviews.forEach((review) => {
      const r = Math.floor(Number(review.rating) || 0)
      if (r >= 1 && r <= 5) set.add(r)
    })
    return Array.from(set).sort((a, b) => b - a)
  }, [userReviews])

  // Filter & sort reviews
  let filteredPublishedReviews = activeTab === 'replied'
    ? userReviews.filter((r) => !!r.adminReply)
    : userReviews

  if (selectedCategory) {
    filteredPublishedReviews = filteredPublishedReviews.filter(
      (r) => (r.category || '').toLowerCase() === selectedCategory.toLowerCase()
    )
  }
  if (selectedRating) {
    filteredPublishedReviews = filteredPublishedReviews.filter(
      (r) => Math.floor(r.rating) === Number(selectedRating)
    )
  }
  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    filteredPublishedReviews = filteredPublishedReviews.filter(
      (r) =>
        (r.productName || '').toLowerCase().includes(term) ||
        (r.sellerName || '').toLowerCase().includes(term) ||
        (r.orderId || '').toLowerCase().includes(term) ||
        (r.comment || '').toLowerCase().includes(term)
    )
  }

  if (sortBy === 'recent') {
    filteredPublishedReviews.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  } else if (sortBy === 'highest') {
    filteredPublishedReviews.sort((a, b) => b.rating - a.rating)
  } else if (sortBy === 'lowest') {
    filteredPublishedReviews.sort((a, b) => a.rating - b.rating)
  } else if (sortBy === 'helpful') {
    filteredPublishedReviews.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0))
  }

  const handleOpenWriteModal = (item, orderItems = []) => {
    setIsEditMode(false)
    setSelectedItemForReview(item)
    setOrderItemsForReview(orderItems.length > 0 ? orderItems : [item])
    setFormRating(5)
    setFormQuality(5)
    setFormService(5)
    setFormDelivery(5)
    setFormTitle('')
    setFormComment('')
    setFormUploadedImages(item.productImage ? [item.productImage] : [])
    setFormRecommend(true)
    setFormIsAnonymous(false)
    setIsWriteModalOpen(true)
  }

  const handleOpenEditModal = (review) => {
    setIsEditMode(true)
    setSelectedItemForReview({
      id: review.bookingId || review.id,
      orderId: review.orderId,
      productName: review.productName,
      productImage: review.productImage,
      sellerName: review.sellerName,
      category: review.category,
    })
    setOrderItemsForReview([])
    setFormRating(review.rating || 5)
    setFormQuality(review.ratingsBreakdown?.quality || review.rating || 5)
    setFormService(review.ratingsBreakdown?.service || review.rating || 5)
    setFormDelivery(review.ratingsBreakdown?.delivery || review.rating || 5)
    setFormTitle(review.title || '')
    setFormComment(review.comment || '')
    setFormUploadedImages(review.images || [])
    setFormRecommend(review.recommend !== false)
    setFormIsAnonymous(review.customer?.isAnonymous || false)
    setIsWriteModalOpen(true)
  }

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    files.forEach((file) => {
      if (formUploadedImages.length >= 4) return
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFormUploadedImages((prev) => {
            if (prev.length >= 4) return prev
            return [...prev, reader.result]
          })
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const handleRemoveUploadedImage = (idx) => {
    setFormUploadedImages((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!selectedItemForReview?.id) return
    if (!formTitle.trim() || !formComment.trim()) {
      alert('Please provide a headline title and detailed feedback.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/catalog/bookings/${encodeURIComponent(selectedItemForReview.id)}/review`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          rating: formRating,
          comment: formComment.trim(),
          title: formTitle.trim(),
          recommend: formRecommend,
          isAnonymous: formIsAnonymous,
          ratingsBreakdown: {
            quality: formQuality,
            service: formService,
            delivery: formDelivery,
          },
          media: formUploadedImages.map((img) => ({ type: 'image', url: img })),
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.message || 'Could not submit review.')
      }

      await Promise.all([loadPendingReviews(), loadMyReviews()])
      setIsWriteModalOpen(false)
    } catch (err) {
      alert(err.message || 'Error submitting review')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleHelpful = (reviewId) => {
    setUserReviews((prev) =>
      prev.map((r) => {
        if ((r._id || r.id) === reviewId) {
          const nextVoted = !r.userVotedHelpful
          const countDiff = nextVoted ? 1 : -1
          return {
            ...r,
            userVotedHelpful: nextVoted,
            helpfulCount: Math.max(0, (r.helpfulCount || 0) + countDiff),
          }
        }
        return r
      })
    )
  }

  const handleDeleteReview = async (reviewId) => {
    setUserReviews((prev) => prev.filter((r) => (r._id || r.id) !== reviewId))
    setDeleteConfirmId(null)
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
      <main className="w-full px-6 sm:px-10 md:px-16 pt-2 sm:pt-3 pb-6 space-y-4 max-w-[1440px] mx-auto">
        {/* Tab Selection Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTab("published")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all rounded-sm border-b-2 cursor-pointer",
                activeTab === "published"
                  ? "border-[#081F5C] bg-white text-[#081F5C] shadow-2xs font-bold"
                  : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Star className="size-4" />
              Published Reviews ({userReviews.length})
            </button>

            <button
              onClick={() => setActiveTab("to-review")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all rounded-sm border-b-2 cursor-pointer",
                activeTab === "to-review"
                  ? "border-[#081F5C] bg-white text-[#081F5C] shadow-2xs font-bold"
                  : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Clock className="size-4" />
              To Review ({groupedPendingOrders.length})
              {groupedPendingOrders.length > 0 && (
                <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-[#081F5C] text-[10px] font-bold text-white">
                  {groupedPendingOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("replied")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all rounded-sm border-b-2 cursor-pointer",
                activeTab === "replied"
                  ? "border-[#081F5C] bg-white text-[#081F5C] shadow-2xs font-bold"
                  : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <MessageSquare className="size-4" />
              Seller Responses ({repliedCount})
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Showing{" "}
            <strong className="text-slate-800">
              {activeTab === "to-review" ? groupedPendingOrders.length : filteredPublishedReviews.length}
            </strong>{" "}
            {activeTab === "to-review" ? "order(s) to review" : "published items"}
          </div>
        </div>

        {/* Filters & Search (matching findServices.jsx exact design & selectShell) */}
        {activeTab !== "to-review" && (
          <section className="space-y-3">
            <div className="flex min-w-0 w-full max-w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 w-full max-w-full flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-nowrap">
                <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[200px]">
                  <select
                    className={`${selectShell} ${selectedCategory === '' ? 'text-slate-400 font-medium' : 'text-slate-900 font-semibold'}`}
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[200px]">
                  <select
                    className={`${selectShell} ${selectedRating === '' ? 'text-slate-400 font-medium' : 'text-slate-900 font-semibold'}`}
                    value={selectedRating}
                    onChange={(e) => setSelectedRating(e.target.value)}
                  >
                    <option value="">Ratings</option>
                    {availableRatings.length > 0 ? (
                      availableRatings.map((r) => (
                        <option key={r} value={r}>
                          {r} Star{r > 1 ? 's' : ''} ★
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="5">5 Stars ★</option>
                        <option value="4">4 Stars ★</option>
                        <option value="3">3 Stars ★</option>
                        <option value="2">2 Stars ★</option>
                        <option value="1">1 Star ★</option>
                      </>
                    )}
                  </select>
                  <Star className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="relative min-w-0 w-full sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[200px]">
                  <select
                    className={`${selectShell} font-semibold text-slate-900`}
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="recent">Sort: Most Recent</option>
                    <option value="highest">Sort: Highest Rated</option>
                    <option value="lowest">Sort: Lowest Rated</option>
                    <option value="helpful">Sort: Most Helpful</option>
                  </select>
                  <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                {(selectedCategory || selectedRating || searchTerm) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('')
                      setSelectedRating('')
                      setSearchTerm('')
                    }}
                    className="text-xs font-semibold text-rose-600 hover:underline px-2 py-2 cursor-pointer self-center"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              <div className="relative min-w-0 w-full max-w-full lg:max-w-md lg:flex-1">
                <div className="relative w-full min-w-0 max-w-full">
                  <Input
                    className="h-9 w-full min-w-0 rounded-sm border border-slate-200 bg-white pr-12 pl-4 text-xs sm:text-sm shadow-[0_2px_5px_rgba(15,23,42,0.14)] focus-visible:ring-1 focus-visible:ring-[#081F5C] focus-visible:border-[#081F5C] transition-all hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)] hover:border-slate-300"
                    placeholder="Search products, reviews, orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search reviews"
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-sm bg-linear-to-r from-[#04133d] to-[#081F5C] p-0 shadow-[0_2px_6px_rgba(8,31,92,0.4)] hover:shadow-[0_4px_10px_rgba(8,31,92,0.55)] hover:opacity-95 transition-all cursor-pointer"
                    aria-label="Search"
                  >
                    <Search className="h-4 w-4 text-white" />
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── TAB: TO REVIEW (ORDER-BASED CARDS) ───────────────────────────────── */}
        {activeTab === "to-review" && (
          <div className="space-y-3">
            {loadingPending ? (
              <LoadingState message="Loading items to review..." />
            ) : errorPending ? (
              <ErrorState message={errorPending} onRetry={loadPendingReviews} />
            ) : groupedPendingOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-sm bg-white p-8 text-center border border-slate-200 shadow-xs">
                <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-[#081F5C] mb-3">
                  <CheckCircle2 className="size-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">All Caught Up!</h3>
                <p className="mt-1 max-w-md text-xs text-slate-500 font-medium">
                  You have reviewed all your delivered purchases. Check back after your next order!
                </p>
                <Button
                  onClick={() => navigate("/customer/my-bookings")}
                  className="mt-4 bg-[#081F5C] text-white hover:bg-[#04133d] rounded-sm text-xs cursor-pointer shadow-xs"
                >
                  View Completed Orders
                </Button>
              </div>
            ) : (
              groupedPendingOrders.map((orderGroup) => (
                <div
                  key={orderGroup.orderId}
                  className={cn(
                    "flex flex-col gap-2.5 rounded-sm bg-white p-4 border border-slate-200 transition-all",
                    cardShadow
                  )}
                >
                  {/* Order Header Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#081F5C] bg-slate-100 px-2.5 py-0.5 border border-slate-200 rounded-sm">
                        Order #{orderGroup.orderId}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs font-semibold text-slate-600">
                        Delivered {orderGroup.deliveryDate}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        ({orderGroup.items.length} product{orderGroup.items.length > 1 ? "s" : ""} to rate)
                      </span>
                    </div>
                  </div>

                  {/* Products list inside this order */}
                  <div className="divide-y divide-slate-100">
                    {orderGroup.items.map((item) => (
                      <div
                        key={item.id || item.orderItemId}
                        className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ImageWithFallback
                            src={item.productImage}
                            alt={item.productName}
                            className="size-14 shrink-0 rounded-sm object-cover border border-slate-200"
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                                {item.productName}
                              </h4>
                              {(item.quantity || 1) > 1 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-extrabold bg-blue-50 text-[#081F5C] border border-blue-200">
                                  Qty: {item.quantity}
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <Store className="size-3 text-slate-400" />
                              <span className="font-medium text-slate-700">{item.sellerName}</span>
                              <span className="rounded-sm bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                                {item.category}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleOpenWriteModal(item, orderGroup.items)}
                          className="bg-[#081F5C] text-white hover:bg-[#04133d] shadow-xs shrink-0 self-end sm:self-center rounded-sm text-xs py-1.5 px-3 cursor-pointer"
                        >
                          <Edit3 className="mr-1 size-3.5" />
                          Rate Product
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── TAB: PUBLISHED & REPLIED ────────────────────────────────────────── */}
        {activeTab !== "to-review" && (
          <div className="space-y-3">
            {loadingReviews ? (
              <LoadingState message="Loading your reviews..." />
            ) : errorReviews ? (
              <ErrorState message={errorReviews} onRetry={loadMyReviews} />
            ) : filteredPublishedReviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-sm bg-white p-8 text-center border border-slate-200 shadow-xs">
                <div className="flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                  <Star className="size-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No Reviews Found</h3>
                <p className="mt-1 max-w-md text-xs text-slate-500 font-medium">
                  {searchTerm || selectedRating || selectedCategory
                    ? "No reviews match your filter criteria. Try clearing search or filters."
                    : "You haven't written any published reviews yet."}
                </p>
                {(searchTerm || selectedRating || selectedCategory) && (
                  <Button
                    onClick={() => {
                      setSearchTerm("")
                      setSelectedRating("")
                      setSelectedCategory("")
                    }}
                    variant="outline"
                    className="mt-3 rounded-sm text-xs cursor-pointer"
                  >
                    Reset Filters
                  </Button>
                )}
              </div>
            ) : (
              filteredPublishedReviews.map((review) => {
                const reviewId = review._id || review.id
                const reviewDate = review.createdAt
                  ? new Date(review.createdAt).toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                  : review.date || ""

                return (
                  <div
                    key={reviewId}
                    className={cn(
                      "overflow-hidden rounded-sm bg-white border border-slate-200 p-4 sm:p-5 transition-all",
                      cardShadow
                    )}
                  >
                    {/* Product Info Header */}
                    <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3.5">
                        <ImageWithFallback
                          src={review.productImage}
                          alt={review.productName}
                          className="size-14 shrink-0 rounded-sm object-cover border border-slate-200"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-sm bg-blue-50 px-2 py-0.5 text-xs font-semibold text-[#081F5C]">
                              {review.category}
                            </span>
                            <span className="font-mono text-xs text-slate-400">
                              Order {review.orderId}
                            </span>
                          </div>
                          <h4 className="mt-0.5 text-base font-bold text-slate-900">
                            {review.productName}
                          </h4>
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <Store className="size-3.5 text-slate-400" />
                            <span>Sold by <strong className="text-slate-700">{review.sellerName}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1">
                        <span className="text-xs text-slate-400">Reviewed on {reviewDate}</span>
                        <span className="inline-flex items-center gap-1 rounded-sm bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          <CheckCircle2 className="size-3 text-emerald-600" /> Verified Purchase
                        </span>
                      </div>
                    </div>

                    {/* Rating & Breakdown */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 bg-slate-50/70 p-3.5 border border-slate-100 rounded-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-2xl font-extrabold text-slate-900">{review.rating}.0</span>
                          <StarRating rating={review.rating} size="size-5" />
                        </div>
                        {review.recommend && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                            <Check className="size-3.5" /> Recommends this product
                          </span>
                        )}
                      </div>

                      {review.ratingsBreakdown && (
                        <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">Quality:</span>
                            <strong className="text-slate-800">{review.ratingsBreakdown.quality}/5</strong>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">Service:</span>
                            <strong className="text-slate-800">{review.ratingsBreakdown.service}/5</strong>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">Delivery:</span>
                            <strong className="text-slate-800">{review.ratingsBreakdown.delivery}/5</strong>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Review Content */}
                    <div className="mt-4">
                      <h5 className="text-base font-bold text-slate-900">{review.title}</h5>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                        {review.comment}
                      </p>
                    </div>

                    {/* Review Images */}
                    {Array.isArray(review.images) && review.images.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2.5">
                        {review.images.map((imgUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setLightboxImage(imgUrl)}
                            className="group relative size-20 overflow-hidden rounded-sm border border-slate-200 focus:outline-none cursor-pointer"
                          >
                            <ImageWithFallback
                              src={imgUrl}
                              alt={`Review photo ${idx + 1}`}
                              className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center text-white">
                              <Eye className="size-5" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Admin / Seller Reply */}
                    {review.adminReply && (
                      <div className="mt-5 rounded-sm bg-slate-50 p-4 border-l-4 border-[#081F5C] text-sm text-slate-800">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <Store className="size-4 text-[#081F5C]" />
                            <span className="font-bold text-[#081F5C]">
                              Store Response from {review.sellerName}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">
                            {new Date(review.adminReply.repliedAt).toLocaleDateString("en-PH", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 italic">
                          "{review.adminReply.message}"
                        </p>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleHelpful(reviewId)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 transition-colors font-medium border rounded-sm cursor-pointer",
                            review.userVotedHelpful
                              ? "bg-blue-50 border-blue-300 text-[#081F5C]"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <ThumbsUp className={cn("size-3.5", review.userVotedHelpful && "fill-[#081F5C]")} />
                          <span>Helpful ({review.helpfulCount || 0})</span>
                        </button>

                        {review.customer?.isAnonymous && (
                          <span className="text-slate-400 italic">Posted Anonymously</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(review)}
                          className="flex items-center gap-1 px-2.5 py-1 text-slate-600 hover:text-[#081F5C] hover:underline font-medium cursor-pointer"
                        >
                          <Edit3 className="size-3.5" /> Edit
                        </button>
                        <span className="text-slate-200">|</span>
                        <button
                          onClick={() => setDeleteConfirmId(reviewId)}
                          className="flex items-center gap-1 px-2.5 py-1 text-red-600 hover:text-red-700 hover:underline font-medium cursor-pointer"
                        >
                          <Trash2 className="size-3.5" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── WRITE / EDIT REVIEW MODAL ─────────────────────────────────────── */}
        <Dialog open={isWriteModalOpen} onOpenChange={setIsWriteModalOpen}>
          <DialogContent
            className="max-w-4xl sm:max-w-3xl lg:max-w-4xl w-full max-h-[92vh] overflow-y-auto rounded-sm p-6 sm:p-8 bg-white border border-slate-200 shadow-2xl"
          >
            <DialogHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-sm bg-blue-50 text-[#081F5C]">
                  <Edit3 className="size-5" />
                </span>
                <div>
                  <DialogTitle className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
                    {isEditMode ? "Edit Your Product & Seller Review" : "Write a Product & Seller Review"}
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
                    Share your verified feedback for{" "}
                    <strong className="text-slate-800">{selectedItemForReview?.productName}</strong>{" "}
                    (Order #{selectedItemForReview?.orderId})
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {selectedItemForReview && (
              <form onSubmit={handleSubmitReview} className="mt-5 space-y-6">
                {/* Product Selector for Multi-Item Orders */}
                {orderItemsForReview.length > 1 && (
                  <div className="bg-slate-50 p-3.5 border border-slate-200 rounded-sm space-y-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase">Select Product to Rate in this Order</label>
                    <div className="flex flex-wrap gap-2">
                      {orderItemsForReview.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedItemForReview(item)
                            setFormUploadedImages(item.productImage ? [item.productImage] : [])
                          }}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 border text-xs font-medium transition-all text-left cursor-pointer rounded-sm",
                            (selectedItemForReview?.id === item.id || selectedItemForReview?.orderItemId === item.orderItemId)
                              ? "border-[#081F5C] bg-white text-[#081F5C] ring-1 ring-[#081F5C]/30 font-semibold shadow-xs"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                          )}
                        >
                          {item.productImage && (
                            <ImageWithFallback src={item.productImage} alt={item.productName} className="size-7 object-cover border border-slate-200 shrink-0 rounded-sm" />
                          )}
                          <div className="line-clamp-1">{item.productName}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Product Summary */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 border border-slate-200 rounded-sm">
                  <div className="flex items-center gap-4">
                    <ImageWithFallback
                      src={selectedItemForReview.productImage}
                      alt={selectedItemForReview.productName}
                      className="size-16 shrink-0 object-cover border border-slate-200 rounded-sm"
                    />
                    <div>
                      <span className="rounded-sm bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-[#081F5C] uppercase tracking-wider">
                        {selectedItemForReview.category || "Verified Purchase"}
                      </span>
                      <h5 className="font-bold text-slate-900 text-base mt-1">
                        {selectedItemForReview.productName}
                      </h5>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <Store className="size-3.5 text-slate-400" />
                        <span>Sold by <strong className="text-slate-700">{selectedItemForReview.sellerName}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 bg-white px-3 py-1.5 border border-slate-200 text-xs font-mono text-slate-600 rounded-sm">
                    Order ID: <span className="font-bold text-slate-800">{selectedItemForReview.orderId}</span>
                  </div>
                </div>

                {/* Overall Rating */}
                <div className="bg-gradient-to-r from-amber-50/80 via-amber-50/40 to-slate-50 p-5 border border-amber-200/80 rounded-sm">
                  <label className="block text-sm font-bold text-slate-900 mb-2">
                    Overall Satisfaction Rating <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <StarRating
                      rating={formRating}
                      interactive={true}
                      size="size-9"
                      onRatingChange={(v) => setFormRating(v)}
                    />
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/90 px-3.5 py-1 text-sm font-bold text-amber-900 border border-amber-300/60">
                      <Star className="size-4 fill-amber-500 text-amber-500" />
                      {formRating === 5 && "5.0 / 5.0 - Outstanding!"}
                      {formRating === 4 && "4.0 / 5.0 - Good Quality"}
                      {formRating === 3 && "3.0 / 5.0 - Average"}
                      {formRating === 2 && "2.0 / 5.0 - Below Expectation"}
                      {formRating === 1 && "1.0 / 5.0 - Very Poor"}
                    </span>
                  </div>
                </div>

                {/* Sub-ratings */}
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-2">
                    Detailed Rating Breakdown
                  </label>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {[
                      { label: "Product Quality", value: formQuality, setter: setFormQuality },
                      { label: "Seller Service", value: formService, setter: setFormService },
                      { label: "Delivery Speed", value: formDelivery, setter: setFormDelivery },
                    ].map(({ label, value, setter }) => (
                      <div
                        key={label}
                        className="bg-slate-50 p-4 border border-slate-200 rounded-sm transition-all hover:bg-white hover:border-slate-300"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</span>
                          <span className="text-xs font-bold text-[#081F5C]">{value}/5</span>
                        </div>
                        <StarRating
                          rating={value}
                          interactive={true}
                          size="size-5"
                          onRatingChange={(v) => setter(v)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Title & Comment */}
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-1.5">
                      Review Headline / Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Excellent service, fast turn-around!"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full rounded-sm border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#081F5C] focus:outline-none focus:ring-1 focus:ring-[#081F5C]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-bold text-slate-900">
                        Detailed Review Feedback <span className="text-red-500">*</span>
                      </label>
                      <span className={cn("text-xs font-medium", formComment.length >= 15 ? "text-[#081F5C]" : "text-slate-400")}>
                        {formComment.length} characters (min 15)
                      </span>
                    </div>
                    <textarea
                      rows={5}
                      required
                      minLength={15}
                      placeholder="Share your experience regarding repair quality, communication, timeliness, or overall service..."
                      value={formComment}
                      onChange={(e) => setFormComment(e.target.value)}
                      className="w-full rounded-sm border border-slate-300 bg-white p-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#081F5C] focus:outline-none focus:ring-1 focus:ring-[#081F5C]"
                    />
                  </div>
                </div>

                {/* Photo Upload */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-slate-900">
                      Add Photos
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-4 border border-slate-200 rounded-sm">
                    {formUploadedImages.map((imgUrl, idx) => (
                      <div key={idx} className="relative size-24 border border-slate-300 bg-white group overflow-hidden rounded-sm">
                        <img
                          src={imgUrl}
                          alt="Upload preview"
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveUploadedImage(idx)}
                          className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-red-600 text-white shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}

                    {formUploadedImages.length < 4 && (
                      <label className="flex size-24 cursor-pointer flex-col items-center justify-center border-2 border-dashed border-slate-300 bg-white text-slate-500 rounded-sm transition-colors hover:border-[#081F5C] hover:bg-slate-50">
                        <Camera className="size-6 text-slate-400" />
                        <span className="mt-1 text-xs font-semibold text-slate-700">Add Photo</span>
                        <span className="text-[10px] text-slate-400">Max 4 photos</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Preferences */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200 text-sm">
                  <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-sm cursor-pointer hover:bg-white transition-colors">
                    <input
                      type="checkbox"
                      checked={formRecommend}
                      onChange={(e) => setFormRecommend(e.target.checked)}
                      className="size-4 text-[#081F5C] focus:ring-[#081F5C]"
                    />
                    <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                      I recommend this service & shop
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-sm cursor-pointer hover:bg-white transition-colors">
                    <input
                      type="checkbox"
                      checked={formIsAnonymous}
                      onChange={(e) => setFormIsAnonymous(e.target.checked)}
                      className="size-4 text-[#081F5C] focus:ring-[#081F5C]"
                    />
                    <span className="text-slate-700 text-xs sm:text-sm font-medium">
                      Post review anonymously
                    </span>
                  </label>
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsWriteModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-5 border-slate-300 text-slate-700 hover:bg-slate-100 rounded-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#081F5C] text-white hover:bg-[#04133d] px-6 font-semibold shadow-md rounded-sm cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" /> Submitting...
                      </span>
                    ) : isEditMode ? (
                      "Update Review"
                    ) : (
                      "Submit Review"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* ── IMAGE LIGHTBOX ────────────────────────────────────────────────── */}
        <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
          <DialogContent className="max-w-3xl p-2 bg-black/90 border-none rounded-sm">
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
                  alt="Enlarged review media"
                  className="max-h-[80vh] w-auto object-contain"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* ── DELETE CONFIRMATION DIALOG ────────────────────────────────────── */}
        <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent className="max-w-md rounded-sm p-6 bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-red-600">
                <AlertCircle className="size-5" /> Delete Review
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 mt-2 font-medium">
                Are you sure you want to permanently delete this review? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="rounded-sm">
                Cancel
              </Button>
              <Button
                onClick={() => handleDeleteReview(deleteConfirmId)}
                className="bg-red-600 text-[#081F5C] hover:bg-red-700 text-white rounded-sm cursor-pointer"
              >
                Delete Review
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </CustomerLayout>
  )
}
