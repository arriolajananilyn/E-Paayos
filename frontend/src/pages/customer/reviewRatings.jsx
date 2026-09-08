import { useCallback, useEffect, useMemo, useState } from 'react'
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

function ImageWithFallback({ src, alt, className, fallbackIcon: FallbackIcon = Store }) {
  const [error, setError] = useState(false)
  const resolved = resolveMediaSrc(src)

  if (error || !resolved) {
    return (
      <div className={cn('flex items-center justify-center bg-blue-50/80 border border-blue-100 text-[#081F5C]', className)}>
        <FallbackIcon className="size-5" />
      </div>
    )
  }

  return (
    <img
      src={resolved}
      alt={alt || 'Shop'}
      className={className}
      onError={() => setError(true)}
    />
  )
}

function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-none bg-white p-8 text-center border border-slate-200 shadow-xs">
      <Loader2 className="size-8 animate-spin text-[#081F5C] mb-2" />
      <p className="text-xs font-semibold text-slate-600">{message}</p>
    </div>
  )
}

function ErrorState({ message = 'An error occurred', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-none bg-white p-8 text-center border border-slate-200 shadow-xs">
      <AlertCircle className="size-8 text-red-500 mb-2" />
      <p className="text-xs font-semibold text-rose-600 mb-3">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="rounded-none text-xs">
          Try Again
        </Button>
      )}
    </div>
  )
}

const selectShell =
  'h-9 w-full appearance-none rounded-none border border-slate-200 bg-white px-3 sm:px-3.5 pr-8 sm:pr-9 text-xs sm:text-sm font-semibold text-slate-800 shadow-[0_2px_5px_rgba(15,23,42,0.14)] focus:border-[#081F5C] focus:outline-none focus:ring-1 focus:ring-[#081F5C] transition-all hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)] hover:border-slate-300 cursor-pointer'

export default function CustomerReviewsRatings() {
  const [user] = useState(readCustomerUserSession)
  const navigate = useNavigate()

  // Tab State
  const [activeTab, setActiveTab] = useState('published') // "published" | "to-review" | "replied"

  // Main data arrays
  const [userReviews, setUserReviews] = useState([])
  const [groupedPendingOrders, setGroupedPendingOrders] = useState([])

  // Loading & error states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const loadAllData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/catalog/bookings`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Failed to fetch review data.')
      const raw = Array.isArray(data?.bookings) ? data.bookings : []

      // 1. Pending reviews (Completed bookings not yet rated)
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
          shopImage: b.shopImage || b.shopPlacePhoto || b.sellerImage || (Array.isArray(b.issuePhotos) && b.issuePhotos[0]) || '',
          sellerName: b.shopName || b.sellerName || 'Service Provider',
          category: b.category || 'Repair Service',
          quantity: 1,
          bookingRaw: b,
        })
      })
      setGroupedPendingOrders(Object.values(groupsMap))

      // 2. Published reviews (Completed bookings with rating)
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
            shopImage: b.shopImage || b.shopPlacePhoto || b.sellerImage || (Array.isArray(b.issuePhotos) && b.issuePhotos[0]) || '',
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
      setError(err.message || 'Failed to load review data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

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
    filteredPublishedReviews.sort((a, b) => (b.rating || 0) - (a.rating || 0))
  } else if (sortBy === 'lowest') {
    filteredPublishedReviews.sort((a, b) => (a.rating || 0) - (b.rating || 0))
  } else if (sortBy === 'helpful') {
    filteredPublishedReviews.sort((a, b) => (b.helpfulCount || 0) - (a.helpfulCount || 0))
  }

  const handleOpenWriteModal = (item, orderItems = []) => {
    setSelectedItemForReview(item)
    setOrderItemsForReview(orderItems)
    setIsEditMode(false)
    setFormRating(5)
    setFormQuality(5)
    setFormService(5)
    setFormDelivery(5)
    setFormTitle('')
    setFormComment('')
    setFormUploadedImages(item.shopImage || item.productImage ? [item.shopImage || item.productImage] : [])
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
      shopImage: review.shopImage,
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

      await loadAllData()
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

  return (
    <CustomerLayout activePage="reviews-ratings">
      <main className="w-full px-3.5 sm:px-10 md:px-16 pt-3 sm:pt-5 pb-6 sm:pb-8 space-y-3.5 sm:space-y-5 max-w-[1440px] mx-auto">
        {/* Tab Selection Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 md:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1">
            <button
              type="button"
              onClick={() => setActiveTab("published")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold transition-all rounded-none border-b-2 cursor-pointer whitespace-nowrap shrink-0",
                activeTab === "published"
                  ? "border-[#081F5C] bg-white text-[#081F5C] shadow-2xs font-bold"
                  : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Star className="size-3.5 sm:size-4" />
              Published Reviews ({userReviews.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("to-review")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold transition-all rounded-none border-b-2 cursor-pointer whitespace-nowrap shrink-0",
                activeTab === "to-review"
                  ? "border-[#081F5C] bg-white text-[#081F5C] shadow-2xs font-bold"
                  : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Clock className="size-3.5 sm:size-4" />
              To Review ({groupedPendingOrders.length})
              {groupedPendingOrders.length > 0 && (
                <span className="ml-1 inline-flex size-4.5 sm:size-5 items-center justify-center rounded-none bg-[#081F5C] text-[10px] font-bold text-white">
                  {groupedPendingOrders.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("replied")}
              className={cn(
                "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold transition-all rounded-none border-b-2 cursor-pointer whitespace-nowrap shrink-0",
                activeTab === "replied"
                  ? "border-[#081F5C] bg-white text-[#081F5C] shadow-2xs font-bold"
                  : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <MessageSquare className="size-3.5 sm:size-4" />
              Seller Responses ({repliedCount})
            </button>
          </div>

          <div className="text-[11px] sm:text-xs text-slate-500 font-medium">
            Showing{" "}
            <strong className="text-slate-800">
              {activeTab === "to-review" ? groupedPendingOrders.length : filteredPublishedReviews.length}
            </strong>{" "}
            {activeTab === "to-review" ? "order(s) to review" : "published items"}
          </div>
        </div>

        {/* Filters (1 Row on mobile) & Search Bar (Below filters on mobile) */}
        {activeTab !== "to-review" && (
          <section className="space-y-2 sm:space-y-3">
            <div className="flex min-w-0 w-full max-w-full flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Filter Dropdowns (Single 1-Row Horizontal Strip on Mobile) */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1 min-w-0 w-full flex-nowrap shrink-0 lg:shrink lg:flex-1">
                <div className="relative min-w-[125px] sm:min-w-[140px] sm:max-w-[180px] shrink-0">
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
                  <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2 sm:right-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="relative min-w-[110px] sm:min-w-[120px] sm:max-w-[160px] shrink-0">
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
                  <Star className="pointer-events-none absolute top-1/2 right-2 sm:right-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-slate-400" />
                </div>

                <div className="relative min-w-[140px] sm:min-w-[150px] sm:max-w-[180px] shrink-0">
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
                  <SlidersHorizontal className="pointer-events-none absolute top-1/2 right-2 sm:right-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-slate-400" />
                </div>

                {(selectedCategory || selectedRating || searchTerm) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('')
                      setSelectedRating('')
                      setSearchTerm('')
                    }}
                    className="text-[11px] sm:text-xs font-semibold text-rose-600 hover:underline px-2 py-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Search Bar (Full Width Below Filters on Mobile, Side-by-Side on Desktop) */}
              <div className="relative min-w-0 w-full max-w-full lg:max-w-md lg:flex-1">
                <div className="relative w-full min-w-0 max-w-full">
                  <Input
                    className="h-9 w-full min-w-0 rounded-none border border-slate-200 bg-white pr-11 sm:pr-12 pl-3 sm:pl-4 text-xs sm:text-sm shadow-[0_2px_5px_rgba(15,23,42,0.14)] focus-visible:ring-1 focus-visible:ring-[#081F5C] focus-visible:border-[#081F5C] transition-all hover:shadow-[0_4px_8px_rgba(15,23,42,0.2)] hover:border-slate-300"
                    placeholder="Search reviews..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search reviews"
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-none bg-linear-to-r from-[#04133d] to-[#081F5C] p-0 shadow-[0_2px_6px_rgba(8,31,92,0.4)] hover:shadow-[0_4px_10px_rgba(8,31,92,0.55)] hover:opacity-95 transition-all cursor-pointer"
                    aria-label="Search"
                  >
                    <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── TAB: TO REVIEW (ORDER-BASED CARDS) ───────────────────────────────── */}
        {activeTab === "to-review" && (
          <div className="space-y-3">
            {loading ? (
              <LoadingState message="Loading items to review..." />
            ) : error ? (
              <ErrorState message={error} onRetry={loadAllData} />
            ) : groupedPendingOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-none bg-white p-8 text-center border border-slate-200 shadow-xs">
                <div className="flex size-14 items-center justify-center rounded-none bg-slate-100 text-[#081F5C] mb-3">
                  <CheckCircle2 className="size-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">All Caught Up!</h3>
                <p className="mt-1 max-w-md text-xs text-slate-500 font-medium">
                  You have reviewed all your delivered purchases. Check back after your next order!
                </p>
                <Button
                  onClick={() => navigate("/customer/my-bookings")}
                  className="mt-4 bg-[#081F5C] text-white hover:bg-[#04133d] rounded-none text-xs cursor-pointer shadow-xs"
                >
                  View Completed Orders
                </Button>
              </div>
            ) : (
              groupedPendingOrders.map((orderGroup) => (
                <div
                  key={orderGroup.orderId}
                  className={cn(
                    "flex flex-col gap-3 rounded-none bg-white p-3.5 sm:p-4 border border-slate-200 transition-all",
                    cardShadow
                  )}
                >
                  {/* Order Header Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="font-mono text-[11px] sm:text-xs font-bold text-[#081F5C] bg-slate-100 px-2 sm:px-2.5 py-0.5 border border-slate-200 rounded-none">
                        Order #{orderGroup.orderId}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] sm:text-xs font-semibold text-slate-600">
                        Delivered {orderGroup.deliveryDate}
                      </span>
                      <span className="text-[11px] sm:text-xs text-slate-500 font-medium">
                        ({orderGroup.items.length} item{orderGroup.items.length > 1 ? "s" : ""})
                      </span>
                    </div>
                  </div>

                  {/* Products list inside this order */}
                  <div className="divide-y divide-slate-100">
                    {orderGroup.items.map((item) => (
                      <div
                        key={item.id || item.orderItemId}
                        className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
                          <ImageWithFallback
                            src={item.shopImage || item.productImage}
                            alt={item.sellerName || item.productName}
                            className="size-13 sm:size-14 shrink-0 rounded-none object-cover border border-slate-200"
                            fallbackIcon={Store}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 sm:line-clamp-1">
                                {item.productName}
                              </h4>
                              {(item.quantity || 1) > 1 && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded-none text-[10px] font-extrabold bg-blue-50 text-[#081F5C] border border-blue-200">
                                  Qty: {item.quantity}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Store className="size-3 text-slate-400" />
                                <span className="font-medium text-slate-700">{item.sellerName}</span>
                              </span>
                              <span className="rounded-none bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                                {item.category}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleOpenWriteModal(item, orderGroup.items)}
                          className="w-full sm:w-auto bg-[#081F5C] text-white hover:bg-[#04133d] shadow-xs shrink-0 self-stretch sm:self-center rounded-none text-xs py-2 sm:py-1.5 px-3 cursor-pointer justify-center"
                        >
                          <Edit3 className="mr-1.5 size-3.5" />
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
            {loading ? (
              <LoadingState message="Loading your reviews..." />
            ) : error ? (
              <ErrorState message={error} onRetry={loadAllData} />
            ) : filteredPublishedReviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-none bg-white p-6 sm:p-8 text-center border border-slate-200 shadow-xs">
                <div className="flex size-12 sm:size-14 items-center justify-center rounded-none bg-slate-100 text-slate-400 mb-3">
                  <Star className="size-6 sm:size-7" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">No Reviews Found</h3>
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
                    className="mt-3 rounded-none text-xs cursor-pointer"
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
                      "overflow-hidden rounded-none bg-white border border-slate-200 p-3.5 sm:p-5 transition-all space-y-3.5 sm:space-y-4",
                      cardShadow
                    )}
                  >
                    {/* Product Info Header */}
                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <ImageWithFallback
                          src={review.shopImage || review.productImage}
                          alt={review.sellerName || review.productName}
                          className="size-13 sm:size-14 shrink-0 rounded-none object-cover border border-slate-200"
                          fallbackIcon={Store}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="rounded-none bg-blue-50 px-2 py-0.5 text-[10px] sm:text-xs font-semibold text-[#081F5C]">
                              {review.category}
                            </span>
                            <span className="font-mono text-[11px] sm:text-xs text-slate-400">
                              Order #{review.orderId}
                            </span>
                          </div>
                          <h4 className="mt-0.5 text-xs sm:text-base font-bold text-slate-900 line-clamp-2 sm:line-clamp-1">
                            {review.productName}
                          </h4>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500">
                            <Store className="size-3 sm:size-3.5 text-slate-400" />
                            <span>Sold by <strong className="text-slate-700">{review.sellerName}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1 text-[11px] sm:text-xs border-t border-slate-50 pt-2 sm:border-0 sm:pt-0">
                        <span className="text-slate-400">{reviewDate}</span>
                        <span className="inline-flex items-center gap-1 rounded-none bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                          <CheckCircle2 className="size-3 text-emerald-600" /> Verified
                        </span>
                      </div>
                    </div>

                    {/* Rating & Breakdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/80 p-2.5 sm:p-3.5 border border-slate-100 rounded-none">
                      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xl sm:text-2xl font-extrabold text-slate-900">{review.rating}.0</span>
                          <StarRating rating={review.rating} size="size-4 sm:size-5" />
                        </div>
                        {review.recommend && (
                          <span className="inline-flex items-center gap-1 rounded-none bg-emerald-100 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold text-emerald-800">
                            <Check className="size-3 sm:size-3.5" /> Recommends this product
                          </span>
                        )}
                      </div>

                      {review.ratingsBreakdown && (
                        <div className="flex flex-wrap gap-2.5 sm:gap-4 text-[11px] sm:text-xs text-slate-600 border-t border-slate-200/60 pt-2 sm:border-0 sm:pt-0">
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
                    <div>
                      <h5 className="text-xs sm:text-base font-bold text-slate-900">{review.title}</h5>
                      <p className="mt-1 sm:mt-2 text-xs sm:text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                        {review.comment}
                      </p>
                    </div>

                    {/* Review Images */}
                    {Array.isArray(review.images) && review.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 sm:gap-2.5">
                        {review.images.map((imgUrl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setLightboxImage(imgUrl)}
                            className="group relative size-16 sm:size-20 overflow-hidden rounded-none border border-slate-200 focus:outline-none cursor-pointer"
                          >
                            <ImageWithFallback
                              src={imgUrl}
                              alt={`Review photo ${idx + 1}`}
                              className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
                              fallbackIcon={Camera}
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center text-white">
                              <Eye className="size-4 sm:size-5" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Admin / Seller Reply */}
                    {review.adminReply && (
                      <div className="rounded-none bg-slate-50 p-3 sm:p-4 border-l-3 sm:border-l-4 border-[#081F5C] text-xs sm:text-sm text-slate-800">
                        <div className="flex flex-wrap items-center justify-between gap-1 mb-1 sm:mb-1.5">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Store className="size-3.5 sm:size-4 text-[#081F5C]" />
                            <span className="font-bold text-[#081F5C] text-xs sm:text-sm">
                              Store Response from {review.sellerName}
                            </span>
                          </div>
                          <span className="text-[10px] sm:text-xs text-slate-400">
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
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[11px] sm:text-xs">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <button
                          onClick={() => handleToggleHelpful(reviewId)}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 transition-colors font-medium border rounded-none cursor-pointer text-xs",
                            review.userVotedHelpful
                              ? "bg-blue-50 border-blue-300 text-[#081F5C]"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <ThumbsUp className={cn("size-3.5", review.userVotedHelpful && "fill-[#081F5C]")} />
                          <span>Helpful ({review.helpfulCount || 0})</span>
                        </button>

                        {review.customer?.isAnonymous && (
                          <span className="text-slate-400 italic text-[11px] sm:text-xs">Anonymous</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2">
                        <button
                          onClick={() => handleOpenEditModal(review)}
                          className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-slate-600 hover:text-[#081F5C] hover:underline font-medium cursor-pointer text-xs"
                        >
                          <Edit3 className="size-3.5" /> Edit
                        </button>
                        <span className="text-slate-200">|</span>
                        <button
                          onClick={() => setDeleteConfirmId(reviewId)}
                          className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-red-600 hover:text-red-700 hover:underline font-medium cursor-pointer text-xs"
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
            className="max-w-4xl sm:max-w-3xl lg:max-w-4xl w-[95vw] sm:w-full max-h-[92vh] overflow-y-auto rounded-none p-4 sm:p-6 sm:p-8 bg-white border border-slate-200 shadow-2xl"
          >
            <DialogHeader className="border-b border-slate-100 pb-3 sm:pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 sm:size-9 items-center justify-center rounded-none bg-blue-50 text-[#081F5C] shrink-0">
                  <Edit3 className="size-4 sm:size-5" />
                </span>
                <div>
                  <DialogTitle className="text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900">
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
              <form onSubmit={handleSubmitReview} className="mt-4 sm:mt-5 space-y-4 sm:space-y-6">
                {/* Product Selector for Multi-Item Orders */}
                {orderItemsForReview.length > 1 && (
                  <div className="bg-slate-50 p-3 sm:p-3.5 border border-slate-200 rounded-none space-y-2">
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase">Select Product to Rate in this Order</label>
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
                            "flex items-center gap-2 px-2.5 sm:px-3 py-1.5 border text-xs font-medium transition-all text-left cursor-pointer rounded-none",
                            (selectedItemForReview?.id === item.id || selectedItemForReview?.orderItemId === item.orderItemId)
                              ? "border-[#081F5C] bg-white text-[#081F5C] ring-1 ring-[#081F5C]/30 font-semibold shadow-xs"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                          )}
                        >
                          {item.productImage && (
                            <ImageWithFallback src={item.productImage} alt={item.productName} className="size-6 sm:size-7 object-cover border border-slate-200 shrink-0 rounded-none" />
                          )}
                          <div className="line-clamp-1 text-xs">{item.productName}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Product Summary */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-slate-50 p-3 sm:p-4 border border-slate-200 rounded-none">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                    <ImageWithFallback
                      src={selectedItemForReview.productImage}
                      alt={selectedItemForReview.productName}
                      className="size-14 sm:size-16 shrink-0 object-cover border border-slate-200 rounded-none"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="rounded-none bg-blue-100 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-[#081F5C] uppercase tracking-wider">
                        {selectedItemForReview.category || "Verified Purchase"}
                      </span>
                      <h5 className="font-bold text-slate-900 text-xs sm:text-base mt-1 line-clamp-2 sm:line-clamp-1">
                        {selectedItemForReview.productName}
                      </h5>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500">
                        <Store className="size-3.5 text-slate-400" />
                        <span>Sold by <strong className="text-slate-700">{selectedItemForReview.sellerName}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 bg-white px-2.5 sm:px-3 py-1 sm:py-1.5 border border-slate-200 text-[11px] sm:text-xs font-mono text-slate-600 rounded-none self-start sm:self-auto">
                    Order ID: <span className="font-bold text-slate-800">{selectedItemForReview.orderId}</span>
                  </div>
                </div>

                {/* Overall Rating */}
                <div className="bg-gradient-to-r from-amber-50/80 via-amber-50/40 to-slate-50 p-3.5 sm:p-5 border border-amber-200/80 rounded-none">
                  <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-2">
                    Overall Satisfaction Rating <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4">
                    <StarRating
                      rating={formRating}
                      interactive={true}
                      size="size-7 sm:size-9"
                      onRatingChange={(v) => setFormRating(v)}
                    />
                    <span className="inline-flex items-center gap-1.5 rounded-none bg-amber-100/90 px-3 py-0.5 sm:px-3.5 sm:py-1 text-xs sm:text-sm font-bold text-amber-900 border border-amber-300/60 self-start sm:self-auto">
                      <Star className="size-3.5 sm:size-4 fill-amber-500 text-amber-500" />
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
                  <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-2">
                    Detailed Rating Breakdown
                  </label>
                  <div className="grid grid-cols-1 gap-2.5 sm:gap-4 sm:grid-cols-3">
                    {[
                      { label: "Product Quality", value: formQuality, setter: setFormQuality },
                      { label: "Seller Service", value: formService, setter: setFormService },
                      { label: "Delivery Speed", value: formDelivery, setter: setFormDelivery },
                    ].map(({ label, value, setter }) => (
                      <div
                        key={label}
                        className="bg-slate-50 p-3 sm:p-4 border border-slate-200 rounded-none transition-all hover:bg-white hover:border-slate-300"
                      >
                        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                          <span className="text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</span>
                          <span className="text-xs font-bold text-[#081F5C]">{value}/5</span>
                        </div>
                        <StarRating
                          rating={value}
                          interactive={true}
                          size="size-4 sm:size-5"
                          onRatingChange={(v) => setter(v)}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Title & Comment */}
                <div className="grid grid-cols-1 gap-3.5 sm:gap-5">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1 sm:mb-1.5">
                      Review Headline / Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Excellent service, fast turn-around!"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full rounded-none border border-slate-300 bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#081F5C] focus:outline-none focus:ring-1 focus:ring-[#081F5C]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-slate-900">
                        Detailed Review Feedback <span className="text-red-500">*</span>
                      </label>
                      <span className={cn("text-[11px] sm:text-xs font-medium", formComment.length >= 15 ? "text-[#081F5C]" : "text-slate-400")}>
                        {formComment.length} characters (min 15)
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      required
                      minLength={15}
                      placeholder="Share your experience regarding repair quality, communication, timeliness, or overall service..."
                      value={formComment}
                      onChange={(e) => setFormComment(e.target.value)}
                      className="w-full rounded-none border border-slate-300 bg-white p-3 sm:p-4 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#081F5C] focus:outline-none focus:ring-1 focus:ring-[#081F5C]"
                    />
                  </div>
                </div>

                {/* Photo Upload */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                    <label className="block text-xs sm:text-sm font-bold text-slate-900">
                      Add Photos
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 bg-slate-50 p-3 sm:p-4 border border-slate-200 rounded-none">
                    {formUploadedImages.map((imgUrl, idx) => (
                      <div key={idx} className="relative size-20 sm:size-24 border border-slate-300 bg-white group overflow-hidden rounded-none">
                        <img
                          src={imgUrl}
                          alt="Upload preview"
                          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveUploadedImage(idx)}
                          className="absolute right-1 top-1 sm:right-1.5 sm:top-1.5 flex size-5 sm:size-6 items-center justify-center rounded-none bg-red-600 text-white shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                        >
                          <X className="size-3 sm:size-3.5" />
                        </button>
                      </div>
                    ))}

                    {formUploadedImages.length < 4 && (
                      <label className="flex size-20 sm:size-24 cursor-pointer flex-col items-center justify-center border-2 border-dashed border-slate-300 bg-white text-slate-500 rounded-none transition-colors hover:border-[#081F5C] hover:bg-slate-50">
                        <Camera className="size-5 sm:size-6 text-slate-400" />
                        <span className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs font-semibold text-slate-700">Add Photo</span>
                        <span className="text-[9px] sm:text-[10px] text-slate-400">Max 4 photos</span>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 pt-2 border-t border-slate-200 text-sm">
                  <label className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-none cursor-pointer hover:bg-white transition-colors">
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

                  <label className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-none cursor-pointer hover:bg-white transition-colors">
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
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 sm:pt-5 border-t border-slate-200">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsWriteModalOpen(false)}
                    disabled={isSubmitting}
                    className="px-5 border-slate-300 text-slate-700 hover:bg-slate-100 rounded-none text-xs sm:text-sm py-2"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#081F5C] text-white hover:bg-[#04133d] px-6 font-semibold shadow-md rounded-none cursor-pointer text-xs sm:text-sm py-2"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
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
          <DialogContent className="max-w-3xl p-2 bg-black/90 border-none rounded-none">
            <div className="relative flex items-center justify-center p-4">
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute right-2 top-2 rounded-none bg-slate-800/80 p-2 text-white hover:bg-slate-700 cursor-pointer"
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
          <DialogContent className="max-w-md rounded-none p-6 bg-white border border-slate-200">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold text-red-600">
                <AlertCircle className="size-5" /> Delete Review
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 mt-2 font-medium">
                Are you sure you want to permanently delete this review? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="rounded-none">
                Cancel
              </Button>
              <Button
                onClick={() => handleDeleteReview(deleteConfirmId)}
                className="bg-red-600 text-[#081F5C] hover:bg-red-700 text-white rounded-none cursor-pointer"
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
