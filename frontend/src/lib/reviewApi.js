const API_URL = import.meta?.env?.VITE_API_URL || 'http://localhost:5000'

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

// In-memory or localStorage cache for client-only flags/hidden states
const flagStore = new Set(JSON.parse(localStorage.getItem('review_flags') || '[]'))
const hiddenStore = new Set(JSON.parse(localStorage.getItem('review_hidden') || '[]'))

function saveFlags() {
  try {
    localStorage.setItem('review_flags', JSON.stringify(Array.from(flagStore)))
  } catch {
    // ignore
  }
}

function saveHidden() {
  try {
    localStorage.setItem('review_hidden', JSON.stringify(Array.from(hiddenStore)))
  } catch {
    // ignore
  }
}

export async function fetchAllReviews(params = {}) {
  const queryParams = new URLSearchParams()
  if (params.rating) queryParams.append('rating', params.rating)
  if (params.status) queryParams.append('status', params.status)
  if (params.search) queryParams.append('search', params.search)
  if (params.sortBy) queryParams.append('sortBy', params.sortBy)
  if (params.showHidden) queryParams.append('showHidden', params.showHidden)

  const queryString = queryParams.toString()
  const url = `${API_URL}/api/shop/reviews-ratings${queryString ? `?${queryString}` : ''}`

  const res = await fetch(url, { headers: authHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.message || 'Could not load reviews.')
  }

  const rawReviews = Array.isArray(data?.reviews) ? data.reviews : []
  const summary = data?.summary || null

  const reviews = rawReviews.map((r) => {
    const reviewId = String(r.id || r._id || r.bookingId)
    const mediaUrls = Array.isArray(r.media)
      ? r.media.map((m) => resolveMediaSrc(typeof m === 'string' ? m : m.url))
      : Array.isArray(r.images)
      ? r.images.map((m) => resolveMediaSrc(typeof m === 'string' ? m : m.url))
      : []

    const shopResp = r.shopResponse || r.adminReply?.message || ''
    const respondedAt = r.providerReviewRespondedAt || r.adminReply?.repliedAt || null

    return {
      _id: reviewId,
      id: reviewId,
      bookingId: reviewId,
      rating: Number(r.rating) || 0,
      comment: r.comment || '',
      title: r.title || r.serviceName || 'Customer Feedback',
      productName: r.serviceName || r.productName || 'Automotive Service',
      productImage: r.productImage ? resolveMediaSrc(r.productImage) : (mediaUrls[0] || ''),
      customer: typeof r.customer === 'object' && r.customer ? r.customer : {
        fullName: r.customerName || 'Customer',
        email: r.customerEmail || '',
        isAnonymous: false,
      },
      images: mediaUrls,
      createdAt: r.reviewedAt || r.createdAt || new Date().toISOString(),
      orderId: reviewId ? `Booking #${reviewId.slice(-6).toUpperCase()}` : '',
      helpfulCount: Number(r.helpfulCount || 0),
      status: shopResp ? 'replied' : 'pending',
      adminReply: shopResp ? { message: shopResp, repliedAt: respondedAt } : null,
      flagged: flagStore.has(reviewId),
      hidden: hiddenStore.has(reviewId),
    }
  })

  return { summary, reviews }
}

export async function replyToReviewApi(reviewId, message) {
  const url = `${API_URL}/api/shop/bookings/${encodeURIComponent(reviewId)}/review-response`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ shopResponse: message }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.message || 'Failed to submit reply.')
  }

  const shopResp = typeof data?.shopResponse === 'string' ? data.shopResponse.trim() : message
  const respondedAt = data?.providerReviewRespondedAt || new Date().toISOString()

  return {
    review: {
      _id: reviewId,
      id: reviewId,
      status: 'replied',
      shopResponse: shopResp,
      providerReviewRespondedAt: respondedAt,
      adminReply: {
        message: shopResp,
        repliedAt: respondedAt,
      },
    },
  }
}

export async function toggleFlagApi(reviewId) {
  if (flagStore.has(reviewId)) {
    flagStore.delete(reviewId)
  } else {
    flagStore.add(reviewId)
  }
  saveFlags()
  return { success: true, flagged: flagStore.has(reviewId) }
}

export async function toggleHiddenApi(reviewId) {
  if (hiddenStore.has(reviewId)) {
    hiddenStore.delete(reviewId)
  } else {
    hiddenStore.add(reviewId)
  }
  saveHidden()
  return { success: true, hidden: hiddenStore.has(reviewId) }
}
