import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  Bike,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit3,
  Eye,
  ImageIcon,
  Loader2,
  MapPin,
  MessageSquare,
  Search,
  SlidersHorizontal,
  Smartphone,
  Star,
  Store,
  Tag,
  ThumbsUp,
  Trash2,
  User,
  WashingMachine,
  Wrench,
  X
} from 'lucide-react'

import { Badge } from '../../components/ui/badge'
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

function formatPhp(amount) {
  const n = Number(amount || 0)
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(n)
  } catch {
    return `₱${Math.round(n).toLocaleString('en-PH')}`
  }
}

function categoryIcon(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return Bike
  if (normalized === 'gadget') return Smartphone
  if (normalized === 'appliance') return WashingMachine
  return Wrench
}

function categoryBadgeClass(category) {
  const normalized = String(category ?? '').toLowerCase()
  if (normalized === 'vehicle') return 'bg-sky-100 text-sky-800 border-sky-300'
  if (normalized === 'gadget') return 'bg-violet-100 text-violet-800 border-violet-300'
  if (normalized === 'appliance') return 'bg-emerald-100 text-emerald-800 border-emerald-300'
  return 'bg-slate-100 text-slate-800 border-slate-300'
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

function ImageWithFallback({ src, alt, className, fallbackIcon: FallbackIcon = Wrench }) {
  const [error, setError] = useState(false)
  const resolved = resolveMediaSrc(src)

  if (error || !resolved) {
    return (
      <div className={cn('flex items-center justify-center bg-indigo-50/80 border border-indigo-100 text-indigo-700', className)}>
        <FallbackIcon className="size-5" />
      </div>
    )
  }

  return (
    <img
      src={resolved}
      alt={alt || 'Service'}
      className={className}
      onError={() => setError(true)}
    />
  )
}

function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-none bg-white p-8 text-center border border-slate-200 shadow-2xs">
      <Loader2 className="size-8 animate-spin text-[#081F5C] mb-2" />
      <p className="text-xs font-semibold text-slate-600">{message}</p>
    </div>
  )
}

function ErrorState({ message = 'An error occurred', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-none bg-white p-8 text-center border border-slate-200 shadow-2xs">
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
  'h-9 w-full appearance-none rounded-none border border-slate-200 bg-white px-3 sm:px-3.5 pr-8 sm:pr-9 text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs focus:border-[#081F5C] focus:outline-none focus:ring-1 focus:ring-[#081F5C] transition-all hover:border-slate-300 cursor-pointer'

function getInitialTab() {
  try {
    const hash = window.location.hash || ''
    const query = hash.split('?')[1] || ''
    const params = new URLSearchParams(query)
    const tab = params.get('tab')
    if (tab === 'to-review' || tab === 'to-rate' || tab === 'to_review') return 'to-review'
    if (tab === 'published') return 'published'
    if (tab === 'replied') return 'replied'
  } catch {
    // ignore
  }
  return 'to-review'
}

export default function CustomerReviewsRatings() {
  const [user] = useState(readCustomerUserSession)
  const navigate = useNavigate()

  // Tab State: "published" | "to-review" | "replied" (defaults to to-review if param or completed bookings)
  const [activeTab, setActiveTab] = useState(getInitialTab)

  // Main data arrays (purely booking-based)
  const [userReviews, setUserReviews] = useState([])
  const [pendingBookings, setPendingBookings] = useState([])

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
  const [selectedBookingForReview, setSelectedBookingForReview] = useState(null)

  // Form states
  const [formRating, setFormRating] = useState(5)
  const [formQuality, setFormQuality] = useState(5)
  const [formService, setFormService] = useState(5)
  const [formDelivery, setFormDelivery] = useState(5) // Timeliness & Turnaround
  const [formTitle, setFormTitle] = useState('')
  const [formComment, setFormComment] = useState('')
  const [formUploadedImages, setFormUploadedImages] = useState([])
  const [formRecommend, setFormRecommend] = useState(true)
  const [formIsAnonymous, setFormIsAnonymous] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const cardShadow = 'shadow-sm hover:shadow-md hover:border-indigo-300 transition-all'

  const loadAllData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/catalog/bookings`, { headers: authHeaders() })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Failed to fetch review data.')
      const raw = Array.isArray(data?.bookings) ? data.bookings : []

      // 1. Pending reviews (Completed bookings not yet rated)
      const pending = raw
        .filter((b) => String(b.status).toLowerCase() === 'completed' && !Number(b.customerReviewRating))
        .map((b) => ({
          id: String(b.id),
          ref: String(b.ref || `BK-${String(b.id).slice(-8).toUpperCase()}`),
          serviceName: b.serviceName || 'Repair Service',
          shopName: b.shopName || 'Repair Shop',
          shopServiceId: b.shopServiceId || '',
          shopOwnerName: b.shopOwnerName || '',
          category: b.category || 'Repair Service',
          subcategory: b.subcategory || '',
          serviceMode: b.serviceMode || 'in-shop',
          date: b.date || '',
          preferredTime: b.preferredTime || '',
          assignedTechnicianName: b.assignedTechnicianName || '',
          assignedTechnicianJobTitle: b.assignedTechnicianJobTitle || '',
          problemDescription: b.problemDescription || '',
          issuePhotos: Array.isArray(b.issuePhotos) ? b.issuePhotos.filter(Boolean) : [],
          startJobProofPhotos: Array.isArray(b.startJobProofPhotos) ? b.startJobProofPhotos.filter(Boolean) : [],
          completionProofPhotos: Array.isArray(b.completionProofPhotos) ? b.completionProofPhotos.filter(Boolean) : [],
          serviceFeeLaborRateAtCalc: b.serviceFeeLaborRateAtCalc,
          serviceFeeMaterialsAmount: b.serviceFeeMaterialsAmount,
          completedAt: b.completedAt || b.updatedAt || b.createdAt,
          rawBooking: b,
        }))
      setPendingBookings(pending)

      // 2. Published reviews (Completed bookings with rating)
      const published = raw
        .filter((b) => Number(b.customerReviewRating) > 0)
        .map((b) => {
          const rId = String(b.id)
          return {
            _id: rId,
            id: rId,
            bookingId: String(b.id),
            ref: String(b.ref || `BK-${String(b.id).slice(-8).toUpperCase()}`),
            serviceName: b.serviceName || 'Repair Service',
            shopName: b.shopName || 'Repair Shop',
            shopServiceId: b.shopServiceId || '',
            category: b.category || 'Repair Service',
            subcategory: b.subcategory || '',
            serviceMode: b.serviceMode || 'in-shop',
            assignedTechnicianName: b.assignedTechnicianName || '',
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
            completedAt: b.completedAt || b.updatedAt,
            adminReply: (b.shopResponse || b.adminReply)
              ? {
                shopName: b.shopName || 'Shop Provider',
                message: typeof b.shopResponse === 'string' ? b.shopResponse : (b.adminReply?.message || ''),
                repliedAt: b.providerReviewRespondedAt || b.adminReply?.repliedAt || new Date().toISOString(),
              }
              : null,
            userVotedHelpful: false,
            helpfulCount: Number(b.helpfulCount) || 0,
            customer: {
              isAnonymous: b.customerReviewIsAnonymous || false,
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

  // Dynamically compute available categories
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

  // Dynamically compute available ratings
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
        (r.serviceName || '').toLowerCase().includes(term) ||
        (r.shopName || '').toLowerCase().includes(term) ||
        (r.ref || '').toLowerCase().includes(term) ||
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

  const handleOpenWriteModal = useCallback((booking) => {
    setSelectedBookingForReview(booking)
    setIsEditMode(false)
    setFormRating(5)
    setFormQuality(5)
    setFormService(5)
    setFormDelivery(5)
    setFormTitle('')
    setFormComment('')
    setFormUploadedImages(
      Array.isArray(booking.completionProofPhotos) && booking.completionProofPhotos.length > 0
        ? [booking.completionProofPhotos[0]]
        : Array.isArray(booking.issuePhotos) && booking.issuePhotos.length > 0
        ? [booking.issuePhotos[0]]
        : []
    )
    setFormRecommend(true)
    setFormIsAnonymous(false)
    setIsWriteModalOpen(true)
  }, [])

  // Auto-open review modal if bookingId is specified in URL query
  useEffect(() => {
    if (!pendingBookings.length) return
    const hash = window.location.hash || ''
    const query = hash.split('?')[1] || ''
    const params = new URLSearchParams(query)
    const targetBookingId = params.get('bookingId')
    if (targetBookingId) {
      const match = pendingBookings.find((b) => b.id === targetBookingId || b.ref === targetBookingId)
      if (match) {
        setActiveTab('to-review')
        handleOpenWriteModal(match)
      }
    }
  }, [pendingBookings, handleOpenWriteModal])

  // Listen to live hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || ''
      const query = hash.split('?')[1] || ''
      const params = new URLSearchParams(query)
      const tab = params.get('tab')
      if (tab === 'to-review' || tab === 'to-rate' || tab === 'to_review') {
        setActiveTab('to-review')
      } else if (tab === 'published') {
        setActiveTab('published')
      } else if (tab === 'replied') {
        setActiveTab('replied')
      }
      const targetBookingId = params.get('bookingId')
      if (targetBookingId && pendingBookings.length) {
        const match = pendingBookings.find((b) => b.id === targetBookingId || b.ref === targetBookingId)
        if (match) {
          handleOpenWriteModal(match)
        }
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [pendingBookings, handleOpenWriteModal])

  const handleOpenEditModal = (review) => {
    setIsEditMode(true)
    setSelectedBookingForReview({
      id: review.bookingId || review.id,
      ref: review.ref,
      serviceName: review.serviceName,
      shopName: review.shopName,
      category: review.category,
      subcategory: review.subcategory,
      serviceMode: review.serviceMode,
    })
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
    if (!selectedBookingForReview?.id) return
    if (!formTitle.trim() || !formComment.trim()) {
      alert('Please provide a headline title and detailed feedback.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/api/catalog/bookings/${encodeURIComponent(selectedBookingForReview.id)}/review`, {
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
              To Rate & Review ({pendingBookings.length})
              {pendingBookings.length > 0 && (
                <span className="ml-1 inline-flex size-4.5 sm:size-5 items-center justify-center rounded-none bg-[#081F5C] text-[10px] font-bold text-white">
                  {pendingBookings.length}
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
              Shop Responses ({repliedCount})
            </button>
          </div>

          <div className="text-[11px] sm:text-xs text-slate-500 font-medium">
            Showing{" "}
            <strong className="text-slate-800">
              {activeTab === "to-review" ? pendingBookings.length : filteredPublishedReviews.length}
            </strong>{" "}
            {activeTab === "to-review" ? "service booking(s) to rate" : "published reviews"}
          </div>
        </div>

        {/* Filters & Search Bar */}
        {activeTab !== "to-review" && (
          <section className="space-y-2 sm:space-y-3">
            <div className="flex min-w-0 w-full max-w-full flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Filter Dropdowns */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1 min-w-0 w-full flex-nowrap shrink-0 lg:shrink lg:flex-1">
                <div className="relative min-w-[130px] sm:min-w-[150px] sm:max-w-[180px] shrink-0">
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

              {/* Search Bar */}
              <div className="relative min-w-0 w-full max-w-full lg:max-w-md lg:flex-1">
                <div className="relative w-full min-w-0 max-w-full">
                  <Input
                    className="h-9 w-full min-w-0 rounded-none border border-slate-200 bg-white pr-11 sm:pr-12 pl-3 sm:pl-4 text-xs sm:text-sm shadow-2xs focus-visible:ring-1 focus-visible:ring-[#081F5C] focus-visible:border-[#081F5C] transition-all hover:border-slate-300"
                    placeholder="Search reviews by service, shop, or ref..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search reviews"
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 rounded-none bg-[#081F5C] p-0 shadow-2xs hover:bg-[#04133d] transition-all cursor-pointer"
                    aria-label="Search"
                  >
                    <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── TAB: TO RATE & REVIEW (BOOKING-BASED CARDS) ────────────────────── */}
        {activeTab === "to-review" && (
          <div className="space-y-3">
            {loading ? (
              <LoadingState message="Loading completed bookings to review..." />
            ) : error ? (
              <ErrorState message={error} onRetry={loadAllData} />
            ) : pendingBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-none bg-white p-8 text-center border border-slate-200 shadow-2xs">
                <div className="flex size-14 items-center justify-center rounded-none bg-emerald-50 text-emerald-600 mb-3 border border-emerald-200">
                  <CheckCircle2 className="size-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">All Completed Bookings Rated!</h3>
                <p className="mt-1 max-w-md text-xs text-slate-500 font-medium">
                  You have reviewed all your finished repair bookings. Keep track of current repair progress in My Bookings!
                </p>
                <Button
                  onClick={() => navigate("/customer/my-bookings")}
                  className="mt-4 bg-[#081F5C] text-white hover:bg-[#04133d] rounded-none text-xs cursor-pointer shadow-2xs"
                >
                  Go to My Bookings
                </Button>
              </div>
            ) : (
              pendingBookings.map((b) => {
                const CategoryIcon = categoryIcon(b.category)
                const completionDate = b.completedAt
                  ? new Date(b.completedAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
                  : 'Recently'

                return (
                  <div
                    key={b.id}
                    className={cn(
                      "flex flex-col gap-3 rounded-none bg-white p-3.5 sm:p-4 border border-slate-200 transition-all",
                      cardShadow
                    )}
                  >
                    {/* Booking Header Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="font-mono text-[11px] sm:text-xs font-bold text-[#081F5C] bg-slate-100 px-2 sm:px-2.5 py-0.5 border border-slate-200 rounded-none inline-flex items-center gap-1">
                          <Tag className="size-3 text-indigo-600" />
                          Ref: {b.ref}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] sm:text-xs font-semibold text-slate-600 flex items-center gap-1">
                          <CheckCircle2 className="size-3 text-emerald-600" />
                          Service Completed on {completionDate}
                        </span>
                      </div>

                      <Badge variant="outline" className={cn("rounded-none text-[10px] font-bold uppercase", categoryBadgeClass(b.category))}>
                        {b.category || 'Repair Service'}
                      </Badge>
                    </div>

                    {/* Booking Service & Shop Details */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start sm:items-center gap-2.5 sm:gap-3.5 min-w-0">
                        <div className="flex size-12 sm:size-14 shrink-0 items-center justify-center rounded-none bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <CategoryIcon className="size-6 sm:size-7" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2">
                            {b.serviceName}{b.subcategory ? ` • ${b.subcategory}` : ''}
                          </h4>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] sm:text-xs text-slate-500">
                            <span className="flex items-center gap-1 text-slate-700 font-medium">
                              <Store className="size-3 text-indigo-600" />
                              <span>{b.shopName}</span>
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-medium text-slate-600">
                              Mode: <strong className="text-slate-800">{b.serviceMode === 'home' ? 'Home Service' : 'In-Shop'}</strong>
                            </span>
                            {b.assignedTechnicianName && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-600">
                                  Staff: <strong className="text-slate-800">{b.assignedTechnicianName}</strong>
                                </span>
                              </>
                            )}
                          </div>
                          {(b.serviceFeeLaborRateAtCalc != null || b.serviceFeeMaterialsAmount != null) && (
                            <div className="mt-1 text-[11px] font-semibold text-indigo-700 flex items-center gap-1">
                              <DollarSign className="size-3" />
                              <span>Total Fee: {formatPhp((b.serviceFeeLaborRateAtCalc || 0) + (b.serviceFeeMaterialsAmount || 0))}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {b.shopServiceId && (
                          <button
                            type="button"
                            onClick={() => {
                              window.location.hash = `#/customer/view-shop/${encodeURIComponent(b.shopServiceId)}`
                            }}
                            className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] sm:text-xs font-bold rounded-none shadow-2xs transition-colors cursor-pointer w-full sm:w-auto"
                          >
                            <Store className="size-3.5 text-slate-500" />
                            <span>View Shop</span>
                          </button>
                        )}
                        <Button
                          onClick={() => handleOpenWriteModal(b)}
                          className="w-full sm:w-auto bg-[#081F5C] text-white hover:bg-[#04133d] shadow-2xs shrink-0 self-stretch sm:self-center rounded-none text-xs py-2 sm:py-1.5 px-3.5 font-bold cursor-pointer justify-center"
                        >
                          <Star className="mr-1.5 size-3.5 text-amber-400 fill-amber-400" />
                          Rate & Review Service
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── TAB: PUBLISHED & REPLIED REVIEWS ────────────────────────────────── */}
        {activeTab !== "to-review" && (
          <div className="space-y-3">
            {loading ? (
              <LoadingState message="Loading your published reviews..." />
            ) : error ? (
              <ErrorState message={error} onRetry={loadAllData} />
            ) : filteredPublishedReviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-none bg-white p-6 sm:p-8 text-center border border-slate-200 shadow-2xs">
                <div className="flex size-12 sm:size-14 items-center justify-center rounded-none bg-slate-100 text-slate-400 mb-3">
                  <Star className="size-6 sm:size-7" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">No Reviews Found</h3>
                <p className="mt-1 max-w-md text-xs text-slate-500 font-medium">
                  {searchTerm || selectedRating || selectedCategory
                    ? "No reviews match your filter criteria. Try clearing search or filters."
                    : "You haven't submitted any reviews for completed services yet."}
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
                  : ""
                const CategoryIcon = categoryIcon(review.category)

                return (
                  <div
                    key={reviewId}
                    className={cn(
                      "overflow-hidden rounded-none bg-white border border-slate-200 p-3.5 sm:p-5 transition-all space-y-3.5 sm:space-y-4",
                      cardShadow
                    )}
                  >
                    {/* Booking Service Header */}
                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="flex size-12 sm:size-13 shrink-0 items-center justify-center rounded-none bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <CategoryIcon className="size-5 sm:size-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className={cn("rounded-none px-2 py-0.5 text-[10px] sm:text-xs font-bold uppercase border", categoryBadgeClass(review.category))}>
                              {review.category || 'Repair Service'}
                            </span>
                            <span className="font-mono text-[11px] sm:text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 border border-slate-200">
                              Ref: {review.ref}
                            </span>
                          </div>
                          <h4 className="mt-0.5 text-xs sm:text-base font-bold text-slate-900 line-clamp-2 sm:line-clamp-1">
                            {review.serviceName}
                          </h4>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500">
                            <Store className="size-3 sm:size-3.5 text-indigo-600" />
                            <span>Repair Shop: <strong className="text-slate-800">{review.shopName}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1 text-[11px] sm:text-xs border-t border-slate-50 pt-2 sm:border-0 sm:pt-0">
                        <span className="text-slate-500 font-medium">{reviewDate}</span>
                        <span className="inline-flex items-center gap-1 rounded-none bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 font-bold text-[10px]">
                          <CheckCircle2 className="size-3 text-emerald-600" /> Verified Booking
                        </span>
                      </div>
                    </div>

                    {/* Rating & Breakdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/80 p-2.5 sm:p-3.5 border border-slate-100 rounded-none">
                      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xl sm:text-2xl font-black text-slate-900">{review.rating}.0</span>
                          <StarRating rating={review.rating} size="size-4 sm:size-5" />
                        </div>
                        {review.recommend && (
                          <span className="inline-flex items-center gap-1 rounded-none bg-emerald-100 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-emerald-900 border border-emerald-300">
                            <Check className="size-3 sm:size-3.5 text-emerald-700" /> Recommends this repair service
                          </span>
                        )}
                      </div>

                      {review.ratingsBreakdown && (
                        <div className="flex flex-wrap gap-2.5 sm:gap-4 text-[11px] sm:text-xs text-slate-600 border-t border-slate-200/60 pt-2 sm:border-0 sm:pt-0">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">Repair Quality:</span>
                            <strong className="text-slate-800">{review.ratingsBreakdown.quality}/5</strong>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">Communication:</span>
                            <strong className="text-slate-800">{review.ratingsBreakdown.service}/5</strong>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">Timeliness:</span>
                            <strong className="text-slate-800">{review.ratingsBreakdown.delivery}/5</strong>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Review Content */}
                    <div>
                      <h5 className="text-xs sm:text-base font-bold text-slate-900">{review.title}</h5>
                      <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-700 whitespace-pre-line">
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

                    {/* Shop Owner Response */}
                    {review.adminReply && (
                      <div className="rounded-none bg-indigo-50/60 p-3 sm:p-4 border-l-3 sm:border-l-4 border-indigo-600 text-xs sm:text-sm text-slate-800">
                        <div className="flex flex-wrap items-center justify-between gap-1 mb-1 sm:mb-1.5">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <Store className="size-3.5 sm:size-4 text-indigo-700" />
                            <span className="font-bold text-indigo-950 text-xs sm:text-sm">
                              Response from {review.adminReply.shopName || review.shopName}
                            </span>
                          </div>
                          <span className="text-[10px] sm:text-xs text-slate-500">
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
                              ? "bg-indigo-50 border-indigo-300 text-indigo-900 font-bold"
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          <ThumbsUp className={cn("size-3.5", review.userVotedHelpful && "fill-indigo-600 text-indigo-600")} />
                          <span>Helpful ({review.helpfulCount || 0})</span>
                        </button>

                        {review.customer?.isAnonymous && (
                          <span className="text-slate-400 italic text-[11px] sm:text-xs">Posted Anonymously</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 sm:gap-2">
                        <button
                          onClick={() => handleOpenEditModal(review)}
                          className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-slate-600 hover:text-indigo-700 hover:underline font-bold cursor-pointer text-xs"
                        >
                          <Edit3 className="size-3.5" /> Edit
                        </button>
                        <span className="text-slate-200">|</span>
                        <button
                          onClick={() => setDeleteConfirmId(reviewId)}
                          className="flex items-center gap-1 px-2 sm:px-2.5 py-1 text-red-600 hover:text-red-700 hover:underline font-bold cursor-pointer text-xs"
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
                <span className="flex size-8 sm:size-9 items-center justify-center rounded-none bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                  <Star className="size-4 sm:size-5 fill-indigo-600" />
                </span>
                <div>
                  <DialogTitle className="text-lg sm:text-2xl font-black tracking-tight text-slate-900">
                    {isEditMode ? "Edit Your Service Review" : "Write a Service Review"}
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
                    Share your verified experience for{" "}
                    <strong className="text-slate-800">{selectedBookingForReview?.serviceName}</strong>{" "}
                    at <strong className="text-slate-800">{selectedBookingForReview?.shopName}</strong> (Ref: {selectedBookingForReview?.ref})
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {selectedBookingForReview && (
              <form onSubmit={handleSubmitReview} className="mt-4 sm:mt-5 space-y-4 sm:space-y-6">
                {/* Booking Service Summary Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-slate-50 p-3 sm:p-4 border border-slate-200 rounded-none">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                    <div className="flex size-12 sm:size-14 shrink-0 items-center justify-center rounded-none bg-indigo-100 text-indigo-700 border border-indigo-200">
                      <Wrench className="size-6 sm:size-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn("rounded-none px-2 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase border", categoryBadgeClass(selectedBookingForReview.category))}>
                          {selectedBookingForReview.category || "Repair Service"}
                        </span>
                        <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 border border-slate-200 text-slate-700">
                          Ref: {selectedBookingForReview.ref}
                        </span>
                      </div>
                      <h5 className="font-bold text-slate-900 text-xs sm:text-base mt-1 line-clamp-2">
                        {selectedBookingForReview.serviceName}
                      </h5>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500">
                        <Store className="size-3.5 text-indigo-600" />
                        <span>Repair Shop: <strong className="text-slate-800">{selectedBookingForReview.shopName}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 bg-white px-2.5 sm:px-3 py-1 sm:py-1.5 border border-slate-200 text-[11px] sm:text-xs font-semibold text-emerald-800 rounded-none self-start sm:self-auto flex items-center gap-1">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    <span>Completed Booking</span>
                  </div>
                </div>

                {/* Overall Rating */}
                <div className="bg-gradient-to-r from-amber-50/90 via-amber-50/40 to-slate-50 p-3.5 sm:p-5 border border-amber-200 rounded-none">
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
                    <span className="inline-flex items-center gap-1.5 rounded-none bg-amber-100/90 px-3 py-0.5 sm:px-3.5 sm:py-1 text-xs sm:text-sm font-bold text-amber-900 border border-amber-300/80 self-start sm:self-auto">
                      <Star className="size-3.5 sm:size-4 fill-amber-500 text-amber-500" />
                      {formRating === 5 && "5.0 / 5.0 - Outstanding Repair Quality!"}
                      {formRating === 4 && "4.0 / 5.0 - Great Service & Result"}
                      {formRating === 3 && "3.0 / 5.0 - Average Experience"}
                      {formRating === 2 && "2.0 / 5.0 - Below Expectation"}
                      {formRating === 1 && "1.0 / 5.0 - Very Unsatisfied"}
                    </span>
                  </div>
                </div>

                {/* Sub-ratings Breakdown */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-2">
                    Service Experience Breakdown
                  </label>
                  <div className="grid grid-cols-1 gap-2.5 sm:gap-4 sm:grid-cols-3">
                    {[
                      { label: "Repair Quality & Fix", value: formQuality, setter: setFormQuality },
                      { label: "Communication & Staff", value: formService, setter: setFormService },
                      { label: "Timeliness & Turnaround", value: formDelivery, setter: setFormDelivery },
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
                      Review Headline / Summary <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Excellent technician, fast turnaround and device working perfectly!"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      className="w-full rounded-none border border-slate-300 bg-white px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#081F5C] focus:outline-none focus:ring-1 focus:ring-[#081F5C]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                      <label className="block text-xs sm:text-sm font-bold text-slate-900">
                        Detailed Service Feedback <span className="text-red-500">*</span>
                      </label>
                      <span className={cn("text-[11px] sm:text-xs font-medium", formComment.length >= 15 ? "text-[#081F5C] font-bold" : "text-slate-400")}>
                        {formComment.length} characters (min 15)
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      required
                      minLength={15}
                      placeholder="Share your experience regarding workmanship, technician communication, timeliness, and repair outcome..."
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
                      Add Repair Photos / Proof (Optional)
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
                      I recommend this repair shop & service
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
                    className="bg-[#081F5C] text-white hover:bg-[#04133d] px-6 font-bold shadow-md rounded-none cursor-pointer text-xs sm:text-sm py-2"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="size-4 animate-spin" /> Submitting...
                      </span>
                    ) : isEditMode ? (
                      "Update Review"
                    ) : (
                      "Submit Service Review"
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
                Are you sure you want to permanently delete this service review? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="rounded-none">
                Cancel
              </Button>
              <Button
                onClick={() => handleDeleteReview(deleteConfirmId)}
                className="bg-red-600 hover:bg-red-700 text-white rounded-none cursor-pointer"
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
