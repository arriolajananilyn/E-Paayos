import asyncHandler from "express-async-handler"
import mongoose from "mongoose"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import crypto from "crypto"
import { User } from "../models/userModel.js"
import { ShopService } from "../models/shopServiceModel.js"
import { Booking } from "../models/bookingModel.js"
import { isServiceProviderRole } from "../utils/serviceProviderRoles.js"

function clean(value) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeReviewMedia(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      const type = item?.type === "video" ? "video" : "image"
      const url = clean(item?.url)
      const name = clean(item?.name)
      if (!url) return null
      return { type, url, name }
    })
    .filter(Boolean)
    .slice(0, 8)
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const BOOKING_UPLOAD_DIR = path.join(__dirname, "..", "uploads", "bookings")

function parseIssuePhotos(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => clean(item))
    .filter(Boolean)
    .slice(0, 6)
}

function detectImageExtFromDataUrl(dataUrl) {
  const m = /^data:image\/([a-zA-Z0-9+.-]+);base64,/.exec(dataUrl)
  if (!m) return null
  const subtype = m[1].toLowerCase()
  if (subtype === "jpeg") return "jpg"
  if (subtype === "svg+xml") return "svg"
  if (["jpg", "png", "gif", "webp", "bmp", "svg"].includes(subtype)) return subtype
  return "jpg"
}

function buildPublicBaseUrl(req) {
  return process.env.API_PUBLIC_URL || `${req.protocol}://${req.get("host")}`
}

async function persistIssuePhotoSource(src, req) {
  if (!src) return ""
  if (/^https?:\/\//i.test(src) || /^blob:/i.test(src)) return src
  if (src.startsWith("/uploads/")) return `${buildPublicBaseUrl(req)}${src}`

  const ext = detectImageExtFromDataUrl(src)
  if (!ext) return src
  const base64Payload = src.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "")
  if (!base64Payload) return ""

  await fs.mkdir(BOOKING_UPLOAD_DIR, { recursive: true })
  const fileName = `booking-${Date.now()}-${crypto.randomUUID()}.${ext}`
  const absPath = path.join(BOOKING_UPLOAD_DIR, fileName)
  const relUrl = `/uploads/bookings/${fileName}`
  const fileBuffer = Buffer.from(base64Payload, "base64")
  await fs.writeFile(absPath, fileBuffer)
  return `${buildPublicBaseUrl(req)}${relUrl}`
}

async function normalizeIssuePhotos(value, req) {
  const list = parseIssuePhotos(value)
  if (!list.length) return []
  const out = await Promise.all(list.map((src) => persistIssuePhotoSource(src, req)))
  return out.filter(Boolean)
}

async function recomputeServiceAndProviderRatings(shopServiceId, shopOwnerId) {
  const [serviceAgg, providerAgg] = await Promise.all([
    Booking.aggregate([
      {
        $match: {
          shopService: new mongoose.Types.ObjectId(shopServiceId),
          customerReviewRating: { $gte: 1, $lte: 5 },
        },
      },
      {
        $group: {
          _id: "$shopService",
          ratingAvg: { $avg: "$customerReviewRating" },
          ratingCount: { $sum: 1 },
        },
      },
    ]),
    Booking.aggregate([
      {
        $match: {
          shopOwner: new mongoose.Types.ObjectId(shopOwnerId),
          customerReviewRating: { $gte: 1, $lte: 5 },
        },
      },
      {
        $group: {
          _id: "$shopOwner",
          ratingAvg: { $avg: "$customerReviewRating" },
          ratingCount: { $sum: 1 },
        },
      },
    ]),
  ])

  const serviceDoc = serviceAgg[0]
  const providerDoc = providerAgg[0]

  await Promise.all([
    ShopService.updateOne(
      { _id: shopServiceId },
      {
        $set: {
          ratingAvg: serviceDoc?.ratingAvg ? Number(serviceDoc.ratingAvg.toFixed(2)) : 0,
          ratingCount: serviceDoc?.ratingCount || 0,
        },
      },
    ),
    User.updateOne(
      { _id: shopOwnerId },
      {
        $set: {
          providerRatingAvg: providerDoc?.ratingAvg ? Number(providerDoc.ratingAvg.toFixed(2)) : 0,
          providerRatingCount: providerDoc?.ratingCount || 0,
        },
      },
    ),
  ])
}

function isApprovedShopOwner(u) {
  if (!u || !isServiceProviderRole(u.role)) return false
  const st = u.accountApprovalStatus
  return st === "approved" || st === undefined || st === null
}

/** @param {string} ymd "YYYY-MM-DD" */
function parsePreferredDate(ymd) {
  const s = clean(ymd)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T12:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

/** @param {string} hm "HH:mm" */
function isValidPreferredTime(hm) {
  const s = clean(hm)
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) return false
  return true
}

/** @returns {number|undefined} */
function parseOptionalCoord(v) {
  if (v === undefined || v === null) return undefined
  if (typeof v === "number" && Number.isFinite(v)) return v
  const s = clean(String(v))
  if (!s) return undefined
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : undefined
}

/**
 * POST body: shopServiceId, contactName, contactPhone, preferredDate (YYYY-MM-DD),
 * preferredTime (HH:mm), serviceMode (home|in-shop), serviceAddress?, serviceLatitude?, serviceLongitude?,
 * problemDescription, notes?
 */
export const createCustomerBooking = asyncHandler(async (req, res) => {
  const body = req.body || {}
  const shopServiceId = clean(body.shopServiceId)
  const contactName = clean(body.contactName)
  const contactPhone = clean(body.contactPhone)
  const preferredDateRaw = clean(body.preferredDate)
  const preferredTime = clean(body.preferredTime)
  const serviceMode = clean(body.serviceMode)
  const serviceAddress = clean(body.serviceAddress)
  const problemDescription = clean(body.problemDescription)
  const notes = clean(body.notes)
  const issuePhotos = await normalizeIssuePhotos(body.issuePhotos, req)
  const latParsed = parseOptionalCoord(body.serviceLatitude)
  const lngParsed = parseOptionalCoord(body.serviceLongitude)

  if (!shopServiceId || !mongoose.Types.ObjectId.isValid(shopServiceId)) {
    res.status(400)
    throw new Error("Invalid service")
  }
  if (!contactName) {
    res.status(400)
    throw new Error("Please enter your name")
  }
  if (!contactPhone) {
    res.status(400)
    throw new Error("Please enter a contact number")
  }
  const preferredDate = parsePreferredDate(preferredDateRaw)
  if (!preferredDate) {
    res.status(400)
    throw new Error("Please choose a valid preferred date")
  }
  if (!isValidPreferredTime(preferredTime)) {
    res.status(400)
    throw new Error("Please choose a valid preferred time")
  }
  if (serviceMode !== "home" && serviceMode !== "in-shop") {
    res.status(400)
    throw new Error("Please choose where the service should happen")
  }
  if (!problemDescription) {
    res.status(400)
    throw new Error("Please describe what needs repair or service")
  }

  const svc = await ShopService.findById(shopServiceId).lean()
  if (!svc || svc.status !== "active") {
    res.status(404)
    throw new Error("Service not found or not available for booking")
  }

  const owner = await User.findById(svc.shopOwner).select("role accountApprovalStatus").lean()
  if (!isApprovedShopOwner(owner)) {
    res.status(404)
    throw new Error("This shop is not accepting bookings right now")
  }

  const loc = svc.location
  if (loc === "home" && serviceMode !== "home") {
    res.status(400)
    throw new Error("This listing is home service only")
  }
  if (loc === "in-shop" && serviceMode !== "in-shop") {
    res.status(400)
    throw new Error("This listing is shop visit only")
  }

  if (serviceMode === "home" && !serviceAddress) {
    res.status(400)
    throw new Error("Please enter the address for home service")
  }

  const hasLat = latParsed !== undefined
  const hasLng = lngParsed !== undefined
  if (hasLat !== hasLng) {
    res.status(400)
    throw new Error("If you share GPS coordinates, both latitude and longitude are required")
  }
  if (hasLat && hasLng) {
    if (serviceMode !== "home") {
      res.status(400)
      throw new Error("GPS coordinates can only be sent for home service bookings")
    }
    if (latParsed < -90 || latParsed > 90 || lngParsed < -180 || lngParsed > 180) {
      res.status(400)
      throw new Error("Invalid GPS coordinates")
    }
  }

  const doc = await Booking.create({
    customer: req.user._id,
    shopOwner: svc.shopOwner,
    shopService: svc._id,
    contactName,
    contactPhone,
    preferredDate,
    preferredTime,
    serviceMode,
    serviceAddress: serviceMode === "home" ? serviceAddress : "",
    ...(hasLat && hasLng ? { serviceLatitude: latParsed, serviceLongitude: lngParsed } : {}),
    issuePhotos,
    problemDescription,
    notes,
    status: "pending",
  })

  return res.status(201).json({
    message: "Booking request sent. The shop will be notified.",
    bookingId: String(doc._id),
  })
})

/** @param {Date|string} d */
function preferredDateToYmd(d) {
  if (!d) return ""
  const x = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(x.getTime())) return ""
  return x.toISOString().slice(0, 10)
}

function mapBookingForCustomer(b) {
  if (!b) return null
  const svc = b.shopService && typeof b.shopService === "object" ? b.shopService : null
  const owner = b.shopOwner && typeof b.shopOwner === "object" ? b.shopOwner : null
  const id = String(b._id)
  const shopName = (owner?.shopName && String(owner.shopName).trim()) || owner?.fullName || "Shop"
  return {
    id,
    ref: `BK-${id.slice(-8).toUpperCase()}`,
    shopServiceId: svc?._id != null ? String(svc._id) : "",
    serviceName: svc?.name || "Service",
    shopName,
    category: svc?.category || "",
    subcategory: svc?.subcategory || "",
    listingType: svc?.location || "in-shop",
    contactName: b.contactName,
    contactPhone: b.contactPhone,
    date: preferredDateToYmd(b.preferredDate),
    preferredTime: b.preferredTime,
    serviceMode: b.serviceMode,
    serviceAddress: b.serviceAddress || "",
    issuePhotos: Array.isArray(b.issuePhotos) ? b.issuePhotos : [],
    problemDescription: b.problemDescription,
    notes: b.notes || "",
    status: b.status,
    rejectionReason: b.rejectionReason || "",
    customerReviewRating:
      Number.isFinite(Number(b.customerReviewRating)) && Number(b.customerReviewRating) > 0
        ? Number(b.customerReviewRating)
        : null,
    customerReviewComment: b.customerReviewComment || "",
    customerReviewMedia: Array.isArray(b.customerReviewMedia) ? b.customerReviewMedia : [],
    customerReviewedAt: b.customerReviewedAt || null,
    shopResponse: typeof b.providerReviewResponse === "string" ? b.providerReviewResponse.trim() : "",
    providerReviewRespondedAt: b.providerReviewRespondedAt || null,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  }
}

/**
 * GET ?status=pending|confirmed|working|cancelled|completed — omit for all.
 * Customer’s own booking requests (same records shop owners see in Service requests).
 */
export const listCustomerBookings = asyncHandler(async (req, res) => {
  const statusQ = clean(req.query.status)
  const query = { customer: req.user._id }
  if (["pending", "confirmed", "working", "cancelled", "completed"].includes(statusQ)) {
    query.status = statusQ
  }

  const rows = await Booking.find(query)
    .sort({ createdAt: -1 })
    .populate("shopService", "name category subcategory location status startingPrice")
    .populate("shopOwner", "fullName shopName")
    .lean()

  return res.json({
    bookings: rows.map((row) => mapBookingForCustomer(row)).filter(Boolean),
  })
})

/**
 * POST /api/catalog/bookings/:id/review
 * body: { rating: number(1..5), comment: string, media?: [{type,url,name}] }
 */
export const createCustomerBookingReview = asyncHandler(async (req, res) => {
  const id = clean(req.params.id)
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400)
    throw new Error("Invalid booking")
  }

  const rating = Number(req.body?.rating)
  const comment = clean(req.body?.comment)
  const media = normalizeReviewMedia(req.body?.media)
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    res.status(400)
    throw new Error("Rating must be between 1 and 5.")
  }
  if (!comment) {
    res.status(400)
    throw new Error("Please enter your review comment.")
  }

  const booking = await Booking.findOne({ _id: id, customer: req.user._id })
  if (!booking) {
    res.status(404)
    throw new Error("Booking not found.")
  }
  if (booking.status !== "completed") {
    res.status(400)
    throw new Error("Only completed bookings can be reviewed.")
  }
  if (Number.isFinite(Number(booking.customerReviewRating)) && Number(booking.customerReviewRating) > 0) {
    res.status(400)
    throw new Error("You already submitted a review for this booking.")
  }

  booking.customerReviewRating = Math.round(rating)
  booking.customerReviewComment = comment
  booking.customerReviewMedia = media
  booking.customerReviewedAt = new Date()
  await booking.save()

  await recomputeServiceAndProviderRatings(booking.shopService, booking.shopOwner)

  const populated = await Booking.findById(booking._id)
    .populate("shopOwner", "shopName fullName")
    .populate("shopService", "name")
    .lean()

  const owner = populated?.shopOwner && typeof populated.shopOwner === "object" ? populated.shopOwner : null
  const svc = populated?.shopService && typeof populated.shopService === "object" ? populated.shopService : null

  return res.status(201).json({
    message: "Review submitted successfully.",
    review: {
      id: `rv-${String(booking._id)}`,
      sourceId: String(booking._id),
      shopServiceId: svc?._id ? String(svc._id) : "",
      orderId: `BK-${String(booking._id).slice(-8).toUpperCase()}`,
      shop: owner?.shopName?.trim() || owner?.fullName || "Service Provider",
      service: svc?.name || "Service",
      rating: booking.customerReviewRating,
      text: booking.customerReviewComment,
      media: booking.customerReviewMedia || [],
      createdAt: booking.customerReviewedAt,
      date: booking.customerReviewedAt ? booking.customerReviewedAt.toISOString().slice(0, 10) : "",
      customerName: req.user.fullName || req.user.email || "Customer",
    },
  })
})

/**
 * GET /api/catalog/shop-services/:serviceId/reviews
 * Customer-visible approved reviews for one service listing.
 */
export const listServiceReviewsForCustomer = asyncHandler(async (req, res) => {
  const serviceId = clean(req.params.serviceId)
  if (!serviceId || !mongoose.Types.ObjectId.isValid(serviceId)) {
    res.status(400)
    throw new Error("Invalid service id")
  }

  const rows = await Booking.find({
    shopService: serviceId,
    customerReviewRating: { $gte: 1, $lte: 5 },
  })
    .sort({ customerReviewedAt: -1, updatedAt: -1 })
    .populate("customer", "fullName")
    .select(
      "customer customerReviewRating customerReviewComment customerReviewMedia customerReviewedAt providerReviewResponse providerReviewRespondedAt",
    )
    .lean()

  const reviews = rows.map((b, idx) => ({
    id: `sr-${String(b._id || idx)}`,
    overallRating: Number(b.customerReviewRating) || 0,
    customerName:
      b.customer && typeof b.customer === "object" && typeof b.customer.fullName === "string"
        ? b.customer.fullName.trim() || "Customer"
        : "Customer",
    comment: b.customerReviewComment || "",
    createdAt: b.customerReviewedAt || b.updatedAt || b.createdAt || null,
    shopResponse: typeof b.providerReviewResponse === "string" && b.providerReviewResponse.trim() ? b.providerReviewResponse.trim() : null,
    providerReviewRespondedAt: b.providerReviewRespondedAt || null,
    images: Array.isArray(b.customerReviewMedia) ? b.customerReviewMedia.map((m) => m?.url).filter(Boolean) : [],
  }))

  return res.json({ reviews })
})

function buildReviewSummaryRows(rows) {
  const summary = {
    averageRating: 0,
    totalReviews: 0,
    stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    withCommentCount: 0,
    withMediaCount: 0,
  }
  if (!rows.length) return summary
  let sum = 0
  for (const row of rows) {
    const rating = Number(row?.customerReviewRating)
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) continue
    summary.totalReviews += 1
    sum += rating
    const rounded = Math.min(5, Math.max(1, Math.round(rating)))
    summary.stars[rounded] += 1
    if (typeof row.customerReviewComment === "string" && row.customerReviewComment.trim()) {
      summary.withCommentCount += 1
    }
    if (Array.isArray(row.customerReviewMedia) && row.customerReviewMedia.length > 0) {
      summary.withMediaCount += 1
    }
  }
  summary.averageRating = summary.totalReviews > 0 ? Number((sum / summary.totalReviews).toFixed(2)) : 0
  return summary
}

/**
 * GET /api/shop/reviews-ratings
 * Shop owner: all customer reviews for their bookings/services.
 */
export const listShopOwnerReviewsRatings = asyncHandler(async (req, res) => {
  const rows = await Booking.find({
    shopOwner: req.user._id,
    customerReviewRating: { $gte: 1, $lte: 5 },
  })
    .sort({ customerReviewedAt: -1, updatedAt: -1 })
    .populate("customer", "fullName")
    .populate("shopService", "name category")
    .select(
      "customer shopService status preferredDate preferredTime customerReviewRating customerReviewComment customerReviewMedia customerReviewedAt providerReviewResponse providerReviewRespondedAt createdAt updatedAt",
    )
    .lean()

  const summary = buildReviewSummaryRows(rows)
  const reviews = rows.map((row) => ({
    id: String(row._id),
    bookingId: String(row._id),
    serviceName:
      row.shopService && typeof row.shopService === "object" ? row.shopService.name || "Service" : "Service",
    category:
      row.shopService && typeof row.shopService === "object" ? row.shopService.category || "" : "",
    customerName:
      row.customer && typeof row.customer === "object" ? row.customer.fullName || "Customer" : "Customer",
    rating: Number(row.customerReviewRating) || 0,
    comment: row.customerReviewComment || "",
    media: Array.isArray(row.customerReviewMedia) ? row.customerReviewMedia : [],
    reviewedAt: row.customerReviewedAt || row.updatedAt || row.createdAt || null,
    bookingStatus: row.status || "",
    preferredDate: row.preferredDate || null,
    preferredTime: row.preferredTime || "",
    shopResponse: typeof row.providerReviewResponse === "string" ? row.providerReviewResponse.trim() : "",
    providerReviewRespondedAt: row.providerReviewRespondedAt || null,
  }))

  return res.json({ summary, reviews })
})

/**
 * GET /api/mechanic/reviews-ratings
 * Mechanic/Technician: reviews from bookings assigned to this technician's services.
 */
export const listMechanicReviewsRatings = asyncHandler(async (req, res) => {
  const techId = req.user._id
  const services = await ShopService.find({ technicianIds: techId }).select("_id name category").lean()
  const serviceIds = services.map((s) => s._id)
  if (!serviceIds.length) {
    return res.json({
      summary: buildReviewSummaryRows([]),
      reviews: [],
    })
  }

  const serviceNameById = new Map(services.map((s) => [String(s._id), { name: s.name || "Service", category: s.category || "" }]))
  const rows = await Booking.find({
    shopService: { $in: serviceIds },
    customerReviewRating: { $gte: 1, $lte: 5 },
  })
    .sort({ customerReviewedAt: -1, updatedAt: -1 })
    .populate("customer", "fullName")
    .select(
      "customer shopService status preferredDate preferredTime customerReviewRating customerReviewComment customerReviewMedia customerReviewedAt providerReviewResponse providerReviewRespondedAt createdAt updatedAt",
    )
    .lean()

  const summary = buildReviewSummaryRows(rows)
  const reviews = rows.map((row) => {
    const svc = serviceNameById.get(String(row.shopService))
    return {
      id: String(row._id),
      bookingId: String(row._id),
      serviceName: svc?.name || "Service",
      category: svc?.category || "",
      customerName:
        row.customer && typeof row.customer === "object" ? row.customer.fullName || "Customer" : "Customer",
      rating: Number(row.customerReviewRating) || 0,
      comment: row.customerReviewComment || "",
      media: Array.isArray(row.customerReviewMedia) ? row.customerReviewMedia : [],
      reviewedAt: row.customerReviewedAt || row.updatedAt || row.createdAt || null,
      bookingStatus: row.status || "",
      preferredDate: row.preferredDate || null,
      preferredTime: row.preferredTime || "",
      shopResponse: typeof row.providerReviewResponse === "string" ? row.providerReviewResponse.trim() : "",
      providerReviewRespondedAt: row.providerReviewRespondedAt || null,
    }
  })

  return res.json({ summary, reviews })
})

function parseProviderReviewBody(body) {
  const b = body || {}
  const raw = b.shopResponse ?? b.message ?? ""
  const text = typeof raw === "string" ? raw.trim() : String(raw || "").trim()
  if (text.length > 4000) {
    return { error: "Response is too long (max 4000 characters)" }
  }
  return { text }
}

/**
 * PATCH /api/shop/bookings/:id/review-response
 * Shop owner: public reply on a customer review for their booking.
 */
export const patchShopOwnerBookingReviewResponse = asyncHandler(async (req, res) => {
  const bookingId = clean(req.params.id)
  if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
    res.status(400)
    throw new Error("Invalid booking id")
  }
  const parsed = parseProviderReviewBody(req.body)
  if (parsed.error) {
    res.status(400)
    throw new Error(parsed.error)
  }
  const { text } = parsed

  const booking = await Booking.findOne({ _id: bookingId, shopOwner: req.user._id })
  if (!booking) {
    res.status(404)
    throw new Error("Booking not found")
  }
  if (!Number.isFinite(Number(booking.customerReviewRating)) || booking.customerReviewRating < 1) {
    res.status(400)
    throw new Error("This booking has no customer review yet")
  }

  booking.providerReviewResponse = text
  booking.providerReviewRespondedAt = text ? new Date() : null
  await booking.save()

  return res.json({
    message: text ? "Response saved." : "Response cleared.",
    shopResponse: text,
    providerReviewRespondedAt: booking.providerReviewRespondedAt,
  })
})

/**
 * PATCH /api/mechanic/bookings/:id/review-response
 * Assigned technician: reply on reviews for bookings under their services.
 */
export const patchMechanicBookingReviewResponse = asyncHandler(async (req, res) => {
  const bookingId = clean(req.params.id)
  if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
    res.status(400)
    throw new Error("Invalid booking id")
  }
  const parsed = parseProviderReviewBody(req.body)
  if (parsed.error) {
    res.status(400)
    throw new Error(parsed.error)
  }
  const { text } = parsed

  const services = await ShopService.find({ technicianIds: req.user._id }).select("_id").lean()
  const serviceIds = services.map((s) => s._id)
  if (!serviceIds.length) {
    res.status(404)
    throw new Error("Booking not found")
  }

  const booking = await Booking.findOne({ _id: bookingId, shopService: { $in: serviceIds } })
  if (!booking) {
    res.status(404)
    throw new Error("Booking not found")
  }
  if (!Number.isFinite(Number(booking.customerReviewRating)) || booking.customerReviewRating < 1) {
    res.status(400)
    throw new Error("This booking has no customer review yet")
  }

  booking.providerReviewResponse = text
  booking.providerReviewRespondedAt = text ? new Date() : null
  await booking.save()

  return res.json({
    message: text ? "Response saved." : "Response cleared.",
    shopResponse: text,
    providerReviewRespondedAt: booking.providerReviewRespondedAt,
  })
})

function mapBookingForShopOwner(b) {
  if (!b) return null
  const cust = b.customer && typeof b.customer === "object" ? b.customer : null
  const svc = b.shopService && typeof b.shopService === "object" ? b.shopService : null
  return {
    id: String(b._id),
    status: b.status,
    contactName: b.contactName,
    contactPhone: b.contactPhone,
    preferredDate: b.preferredDate,
    preferredTime: b.preferredTime,
    serviceMode: b.serviceMode,
    serviceAddress: b.serviceAddress || "",
    serviceLatitude: b.serviceLatitude,
    serviceLongitude: b.serviceLongitude,
    issuePhotos: Array.isArray(b.issuePhotos) ? b.issuePhotos : [],
    problemDescription: b.problemDescription,
    notes: b.notes || "",
    rejectionReason: b.rejectionReason || "",
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    customer: cust
      ? {
          fullName: cust.fullName || "",
          email: cust.email || "",
          phone: [cust.phoneCode, cust.phoneNumber].filter(Boolean).join(" ").trim(),
        }
      : null,
    shopService: svc
      ? {
          id: String(svc._id),
          name: svc.name || "",
          category: svc.category || "",
          subcategory: svc.subcategory || "",
          location: svc.location,
          status: svc.status,
          startingPrice:
            svc.startingPrice != null &&
            Number.isFinite(Number(svc.startingPrice)) &&
            Number(svc.startingPrice) > 0
              ? Number(svc.startingPrice)
              : null,
        }
      : null,
  }
}

/**
 * GET ?status=pending|confirmed|working|cancelled|completed — omit for all.
 */
export const listShopOwnerBookings = asyncHandler(async (req, res) => {
  const statusQ = clean(req.query.status)
  const query = { shopOwner: req.user._id }
  if (["pending", "confirmed", "working", "cancelled", "completed"].includes(statusQ)) {
    query.status = statusQ
  }

  const rows = await Booking.find(query)
    .sort({ createdAt: -1 })
    .populate("customer", "fullName email phoneCode phoneNumber")
    .populate("shopService", "name category subcategory location status startingPrice")
    .lean()

  return res.json({
    bookings: rows.map((row) => mapBookingForShopOwner(row)).filter(Boolean),
  })
})

const MIN_REJECTION_REASON_LEN = 10

/**
 * PATCH body: { status: pending|confirmed|working|cancelled|completed, rejectionReason?: string }
 * When status is "cancelled", rejectionReason is required (min length enforced).
 * Transitions: pending→confirmed|cancelled; confirmed→working; working→completed (complete only after working).
 */
export const patchShopOwnerBookingStatus = asyncHandler(async (req, res) => {
  const id = clean(req.params.id)
  const nextStatus = clean(req.body?.status)
  const rejectionReason = clean(req.body?.rejectionReason)

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400)
    throw new Error("Invalid booking")
  }
  if (!["confirmed", "working", "cancelled", "completed"].includes(nextStatus)) {
    res.status(400)
    throw new Error("Invalid status")
  }

  const doc = await Booking.findOne({ _id: id, shopOwner: req.user._id })
  if (!doc) {
    res.status(404)
    throw new Error("Booking not found")
  }

  const prev = doc.status

  if (nextStatus === "cancelled") {
    if (prev !== "pending") {
      res.status(400)
      throw new Error("Only pending bookings can be rejected.")
    }
    if (rejectionReason.length < MIN_REJECTION_REASON_LEN) {
      res.status(400)
      throw new Error(`Please enter a rejection reason (at least ${MIN_REJECTION_REASON_LEN} characters).`)
    }
    doc.rejectionReason = rejectionReason
  }

  if (nextStatus === "confirmed" && prev !== "pending") {
    res.status(400)
    throw new Error("Only pending bookings can be confirmed.")
  }

  if (nextStatus === "working" && prev !== "confirmed") {
    res.status(400)
    throw new Error("Only confirmed bookings can be marked as working.")
  }

  if (nextStatus === "completed" && prev !== "working") {
    res.status(400)
    throw new Error("Mark the booking as working first, then complete when the job is done.")
  }

  doc.status = nextStatus
  await doc.save()

  const populated = await Booking.findById(doc._id)
    .populate("customer", "fullName email phoneCode phoneNumber")
    .populate("shopService", "name category subcategory location status startingPrice")
    .lean()

  return res.json({
    message: "Booking updated.",
    booking: mapBookingForShopOwner(populated),
  })
})

/** Bookings for services where this mechanic is listed in technicianIds. */
function mapBookingForTechnician(b) {
  if (!b) return null
  const cust = b.customer && typeof b.customer === "object" ? b.customer : null
  const svc = b.shopService && typeof b.shopService === "object" ? b.shopService : null
  const owner = b.shopOwner && typeof b.shopOwner === "object" ? b.shopOwner : null
  const sp = svc?.startingPrice
  const startingPrice =
    sp != null && Number.isFinite(Number(sp)) && Number(sp) > 0 ? Number(sp) : null
  const id = String(b._id)
  return {
    id,
    ref: `BK-${id.slice(-8).toUpperCase()}`,
    status: b.status,
    contactName: b.contactName,
    contactPhone: b.contactPhone,
    preferredDate: b.preferredDate,
    preferredTime: b.preferredTime,
    serviceMode: b.serviceMode,
    serviceAddress: b.serviceAddress || "",
    serviceLatitude: b.serviceLatitude,
    serviceLongitude: b.serviceLongitude,
    issuePhotos: Array.isArray(b.issuePhotos) ? b.issuePhotos : [],
    problemDescription: b.problemDescription,
    notes: b.notes || "",
    rejectionReason: b.rejectionReason || "",
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    startingPrice,
    serviceName: svc?.name || "Service",
    serviceCategory: svc?.category || "",
    shopName: (owner?.shopName && String(owner.shopName).trim()) || owner?.fullName || "Shop",
    customerFullName: cust?.fullName || "",
    customer: cust
      ? {
          fullName: cust.fullName || "",
          email: cust.email || "",
          phone: [cust.phoneCode, cust.phoneNumber].filter(Boolean).join(" ").trim(),
        }
      : null,
    shopService: svc
      ? {
          id: String(svc._id),
          name: svc.name || "",
          category: svc.category || "",
          subcategory: svc.subcategory || "",
          location: svc.location,
        }
      : null,
  }
}

/**
 * GET — all bookings for shop services that assign this technician.
 * Optional ?status=pending|confirmed|working|cancelled|completed
 */
export const listTechnicianBookings = asyncHandler(async (req, res) => {
  const statusQ = clean(req.query.status)
  const techId = req.user._id

  const services = await ShopService.find({ technicianIds: techId }).select("_id").lean()
  const serviceIds = services.map((s) => s._id)
  if (!serviceIds.length) {
    return res.json({ bookings: [] })
  }

  const query = { shopService: { $in: serviceIds } }
  if (["pending", "confirmed", "working", "cancelled", "completed"].includes(statusQ)) {
    query.status = statusQ
  }

  const rows = await Booking.find(query)
    .sort({ updatedAt: -1 })
    .populate("customer", "fullName email phoneCode phoneNumber")
    .populate("shopService", "name category subcategory location status startingPrice")
    .populate("shopOwner", "fullName shopName")
    .lean()

  return res.json({
    bookings: rows.map((row) => mapBookingForTechnician(row)).filter(Boolean),
  })
})

/**
 * PATCH body: { action: "working" | "completed" }
 * Technician must be listed on the booking’s shop service (`technicianIds`).
 * working: confirmed → working. completed: working → completed.
 */
export const patchTechnicianBookingAction = asyncHandler(async (req, res) => {
  const id = clean(req.params.id)
  const action = clean(req.body?.action).toLowerCase()

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400)
    throw new Error("Invalid booking")
  }
  if (!["working", "completed"].includes(action)) {
    res.status(400)
    throw new Error('Use action "working" or "completed".')
  }

  const techId = req.user._id

  const doc = await Booking.findById(id).populate("shopService", "technicianIds")
  if (!doc) {
    res.status(404)
    throw new Error("Booking not found")
  }

  const svc = doc.shopService && typeof doc.shopService === "object" ? doc.shopService : null
  const ids = Array.isArray(svc?.technicianIds) ? svc.technicianIds : []
  const allowed = ids.some((x) => String(x) === String(techId))
  if (!allowed) {
    res.status(403)
    throw new Error("You are not assigned to this booking’s service.")
  }

  const prev = doc.status

  if (action === "working") {
    if (prev !== "confirmed") {
      res.status(400)
      throw new Error("Only confirmed bookings can be marked as working.")
    }
    doc.status = "working"
  } else {
    if (prev !== "working") {
      res.status(400)
      throw new Error("Only working bookings can be marked complete.")
    }
    doc.status = "completed"
  }

  await doc.save()

  const populated = await Booking.findById(doc._id)
    .populate("customer", "fullName email phoneCode phoneNumber")
    .populate("shopService", "name category subcategory location status startingPrice")
    .populate("shopOwner", "fullName shopName")
    .lean()

  return res.json({
    message: "Booking updated.",
    booking: mapBookingForTechnician(populated),
  })
})

/** Collect technician User names for populated booking rows (technicianIds may reference User or other docs). */
async function buildTechnicianNameMap(rows) {
  const ids = new Set()
  for (const b of rows) {
    const svc = b.shopService
    if (svc && typeof svc === "object" && Array.isArray(svc.technicianIds)) {
      for (const tid of svc.technicianIds) {
        if (tid) ids.add(String(tid))
      }
    }
  }
  if (!ids.size) return new Map()
  const oid = [...ids].filter((id) => mongoose.Types.ObjectId.isValid(id))
  const users = await User.find({ _id: { $in: oid } })
    .select("fullName")
    .lean()
  const m = new Map()
  for (const u of users) {
    m.set(String(u._id), u.fullName?.trim() || "Technician")
  }
  return m
}

function mapBookingForAdmin(b, techNameById) {
  if (!b) return null
  const cust = b.customer && typeof b.customer === "object" ? b.customer : null
  const svc = b.shopService && typeof b.shopService === "object" ? b.shopService : null
  const owner = b.shopOwner && typeof b.shopOwner === "object" ? b.shopOwner : null
  const techIds = svc && Array.isArray(svc.technicianIds) ? svc.technicianIds : []
  const technicianNames = techIds.map((tid) => {
    if (!tid) return null
    const name = techNameById.get(String(tid))
    return name || "Assigned staff"
  })

  const id = String(b._id)
  return {
    id,
    ref: `BK-${id.slice(-8).toUpperCase()}`,
    status: b.status,
    contactName: b.contactName,
    contactPhone: b.contactPhone,
    preferredDate: b.preferredDate,
    preferredTime: b.preferredTime,
    serviceMode: b.serviceMode,
    serviceAddress: b.serviceAddress || "",
    issuePhotos: Array.isArray(b.issuePhotos) ? b.issuePhotos : [],
    problemDescription: b.problemDescription,
    notes: b.notes || "",
    rejectionReason: b.rejectionReason || "",
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    customer: cust
      ? {
          fullName: cust.fullName || "",
          email: cust.email || "",
          phone: [cust.phoneCode, cust.phoneNumber].filter(Boolean).join(" ").trim(),
          role: cust.role || "customer",
        }
      : null,
    shopOwner: owner
      ? {
          fullName: owner.fullName || "",
          shopName: owner.shopName || "",
        }
      : null,
    shopService: svc
      ? {
          id: String(svc._id),
          name: svc.name || "",
          category: svc.category || "",
          subcategory: svc.subcategory || "",
          location: svc.location,
        }
      : null,
    assignedTechnicians: technicianNames.filter(Boolean),
  }
}

/**
 * Admin: all service bookings (customers, shop owners, mechanics involved).
 * GET ?status=pending|confirmed|working|cancelled|completed — omit for all.
 */
export const listAdminServiceBookings = asyncHandler(async (req, res) => {
  const statusQ = clean(req.query.status)
  const query = {}
  if (["pending", "confirmed", "working", "cancelled", "completed"].includes(statusQ)) {
    query.status = statusQ
  }

  const rows = await Booking.find(query)
    .sort({ createdAt: -1 })
    .populate("customer", "fullName email phoneCode phoneNumber role")
    .populate("shopOwner", "fullName shopName")
    .populate("shopService", "name category subcategory location status technicianIds")
    .lean()

  const techNameById = await buildTechnicianNameMap(rows)
  const data = rows.map((row) => mapBookingForAdmin(row, techNameById)).filter(Boolean)
  return res.json({ data })
})

export const getAdminServiceBookingStats = asyncHandler(async (_req, res) => {
  const [
    totalBookings,
    pending,
    confirmed,
    working,
    cancelled,
    completed,
    activeListings,
  ] = await Promise.all([
    Booking.countDocuments({}),
    Booking.countDocuments({ status: "pending" }),
    Booking.countDocuments({ status: "confirmed" }),
    Booking.countDocuments({ status: "working" }),
    Booking.countDocuments({ status: "cancelled" }),
    Booking.countDocuments({ status: "completed" }),
    ShopService.countDocuments({ status: "active" }),
  ])

  const inProgress = confirmed + working

  return res.json({
    data: {
      totalBookings,
      pending,
      confirmed,
      working,
      inProgress,
      cancelled,
      completed,
      activeListings,
    },
  })
})
