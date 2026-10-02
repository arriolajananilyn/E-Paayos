import asyncHandler from "express-async-handler"
import mongoose from "mongoose"
import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import crypto from "crypto"
import { User } from "../models/userModel.js"
import { ShopEmployee } from "../models/shopEmployeeModel.js"
import { ShopService } from "../models/shopServiceModel.js"
import { Booking } from "../models/bookingModel.js"
import { isServiceProviderRole } from "../utils/serviceProviderRoles.js"
import { sendDirectMessage } from "../services/directMessage.js"
import {
  buildPaymentProofAttachments,
  buildStartJobProofAttachments,
  buildWarrantyProofAttachments,
  formatNewBookingCustomerToProvider,
  formatPaymentToProvider,
  formatServiceFeeToCustomer,
  formatStatusUpdateToCustomer,
  formatTechnicianActionToCustomer,
  formatWarrantyClaimCustomerToProvider,
  formatWarrantyClaimResponseToCustomer,
  issuePhotosToMessageAttachments,
} from "../utils/bookingAutoMessages.js"
import { shouldStoreUploadsInline } from "../utils/portableUploads.js"
import { formatReadableShopAddress } from "../utils/psgcResolve.js"

function clean(value) {
  return typeof value === "string" ? value.trim() : ""
}

function isLikelyImageProof(value) {
  const s = clean(value)
  if (!s) return false
  return /^data:image\//i.test(s) || s.startsWith("/uploads/") || /^https?:\/\//i.test(s)
}

function normalizeReviewMedia(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      const type = item?.type === "video" ? "video" : "image"
      const url = clean(item?.url)
      const name = clean(item?.name)
      if (!url) return null
      // blob: URLs are device-local; never persist them in DB.
      if (/^blob:/i.test(url)) return null
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

async function persistIssuePhotoSource(src, req) {
  if (!src) return ""
  // Never persist blob: URLs; they only work on the originating device/session.
  if (/^blob:/i.test(src)) return ""
  // Remote URLs can be kept as-is (but prefer storing data URLs or /uploads paths).
  if (/^https?:\/\//i.test(src)) return src
  // Store as relative server path so it works across devices/environments.
  if (src.startsWith("/uploads/")) return src

  const ext = detectImageExtFromDataUrl(src)
  if (!ext) return src
  const base64Payload = src.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "")
  if (!base64Payload) return ""

  // Serverless / shared DB: never use `/uploads/...` paths — those files are not on every API host.
  if (shouldStoreUploadsInline()) {
    return src
  }

  try {
    await fs.mkdir(BOOKING_UPLOAD_DIR, { recursive: true })
    const fileName = `booking-${Date.now()}-${crypto.randomUUID()}.${ext}`
    const absPath = path.join(BOOKING_UPLOAD_DIR, fileName)
    const relUrl = `/uploads/bookings/${fileName}`
    const fileBuffer = Buffer.from(base64Payload, "base64")
    await fs.writeFile(absPath, fileBuffer)
    return relUrl
  } catch (error) {
    // Vercel serverless filesystem is read-only, so persist the data URL itself.
    if (error?.code === "EROFS" || error?.code === "EACCES") {
      return src
    }
    throw error
  }
}

async function normalizeIssuePhotos(value, req) {
  const list = parseIssuePhotos(value)
  if (!list.length) return []
  const out = await Promise.all(list.map((src) => persistIssuePhotoSource(src, req)))
  return out.filter(Boolean)
}

async function normalizeProofPhotos(value, req) {
  let list = []
  if (Array.isArray(value)) {
    list = value.map((x) => clean(String(x || ""))).filter(Boolean)
  } else if (typeof value === "string" && clean(value)) {
    list = [clean(value)]
  }
  if (!list.length) return []
  const out = await Promise.all(list.slice(0, 6).map((src) => persistIssuePhotoSource(src, req)))
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

  const owner = await User.findById(svc.shopOwner).select("role accountApprovalStatus shopName fullName").lean()
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

  const shopDisplayName = (owner?.shopName && String(owner.shopName).trim()) || owner?.fullName || "Shop"
  try {
    const text = formatNewBookingCustomerToProvider({
      booking: doc,
      serviceName: svc.name || "Service",
      shopName: shopDisplayName,
    })
    const photoAttachments = issuePhotosToMessageAttachments(doc.issuePhotos)
    await sendDirectMessage({
      fromUserId: req.user._id,
      toUserId: svc.shopOwner,
      content: text,
      attachments: photoAttachments,
    })
  } catch (err) {
    console.error("Booking chat notification failed:", err?.message || err)
  }

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

async function resolveBookingTechnician(shopOwnerId, techId) {
  if (!techId) return null
  const s = String(techId).trim()
  if (!s || !mongoose.Types.ObjectId.isValid(s)) return null
  const oid = new mongoose.Types.ObjectId(s)
  if (String(shopOwnerId) === s) {
    const owner = await User.findById(oid).select("fullName phoneCode phoneNumber shopJobTitle").lean()
    if (owner) {
      return {
        id: owner._id,
        name: owner.fullName || "Provider",
        jobTitle: owner.shopJobTitle || "On-call Mechanic/Technician",
        phone: [owner.phoneCode, owner.phoneNumber].filter(Boolean).join(" ").trim(),
        model: "User",
      }
    }
  }
  const userMech = await User.findOne({
    _id: oid,
    role: "mechanic-technician",
    employedByShopOwner: shopOwnerId,
  }).select("fullName phoneCode phoneNumber shopJobTitle").lean()
  if (userMech) {
    return {
      id: userMech._id,
      name: userMech.fullName || "Mechanic",
      jobTitle: userMech.shopJobTitle || "Mechanic / Technician",
      phone: [userMech.phoneCode, userMech.phoneNumber].filter(Boolean).join(" ").trim(),
      model: "User",
    }
  }
  const emp = await ShopEmployee.findOne({
    _id: oid,
    shopOwner: shopOwnerId,
  }).lean()
  if (emp) {
    return {
      id: emp._id,
      name: emp.name || "Directory staff",
      jobTitle: "Directory staff",
      phone: "",
      model: "ShopEmployee",
    }
  }
  return null
}

function mapBookingForCustomer(b, shopAddressReadable = "") {
  if (!b) return null
  const svc = b.shopService && typeof b.shopService === "object" ? b.shopService : null
  const owner = b.shopOwner && typeof b.shopOwner === "object" ? b.shopOwner : null
  const id = String(b._id)
  const shopName = (owner?.shopName && String(owner.shopName).trim()) || owner?.fullName || "Shop"
  const shopOwnerName = (owner?.fullName && String(owner.fullName).trim()) || ""
  const shopPhone = [owner?.phoneCode, owner?.phoneNumber].filter(Boolean).join(" ").trim()
  const shopAddress = shopAddressReadable || [owner?.shopDetailedAddress, owner?.shopBarangay, owner?.shopCityMunicipality, owner?.shopProvince].filter(Boolean).join(", ").trim()
  const shopImage = owner?.shopPlacePhoto || ""
  return {
    id,
    ref: `BK-${id.slice(-8).toUpperCase()}`,
    shopServiceId: svc?._id != null ? String(svc._id) : "",
    shopOwnerId: owner?._id != null ? String(owner._id) : "",
    serviceName: svc?.name || "Service",
    shopName,
    shopOwnerName,
    shopPhone,
    shopAddress,
    shopRegion: owner?.shopRegion || "",
    shopProvince: owner?.shopProvince || "",
    shopCityMunicipality: owner?.shopCityMunicipality || "",
    shopBarangay: owner?.shopBarangay || "",
    shopDetailedAddress: owner?.shopDetailedAddress || "",
    shopOperatingHours: owner?.operatingHours || "",
    shopImage,
    acceptedPaymentMethods: Array.isArray(owner?.acceptedPaymentMethods) ? owner.acceptedPaymentMethods : [],
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
    startJobProofPhotos: Array.isArray(b.startJobProofPhotos) ? b.startJobProofPhotos : [],
    completionProofPhotos: Array.isArray(b.completionProofPhotos) ? b.completionProofPhotos : [],
    completionNotes: b.completionNotes || "",
    problemDescription: b.problemDescription,
    notes: b.notes || "",
    status: b.status,
    rejectionReason: b.rejectionReason || "",
    assignedTechnicianName: b.assignedTechnicianName || "",
    assignedTechnicianJobTitle: b.assignedTechnicianJobTitle || "",
    assignedTechnicianPhone: b.assignedTechnicianPhone || "",
    serviceFeeLaborRateAtCalc:
      b.serviceFeeLaborRateAtCalc != null && Number.isFinite(Number(b.serviceFeeLaborRateAtCalc))
        ? Number(b.serviceFeeLaborRateAtCalc)
        : null,
    serviceFeeMaterialsAmount:
      b.serviceFeeMaterialsAmount != null && Number.isFinite(Number(b.serviceFeeMaterialsAmount))
        ? Number(b.serviceFeeMaterialsAmount)
        : null,
    serviceFeeReplacementParts: Array.isArray(b.serviceFeeReplacementParts)
      ? b.serviceFeeReplacementParts
        .map((x) => ({
          name: typeof x?.name === "string" ? x.name : "",
          price: Number.isFinite(Number(x?.price)) ? Number(x.price) : 0,
        }))
        .filter((x) => x.name)
      : [],
    serviceFeeConfirmedAt: b.serviceFeeConfirmedAt || null,
    fixedAt: b.fixedAt || null,
    paymentStatus: b.paymentStatus || "unpaid",
    paymentMethod: b.paymentMethod || "",
    paymentProofImage: b.paymentProofImage || "",
    paidAt: b.paidAt || null,
    completedAt: b.completedAt || b.paidAt || (b.status === "completed" ? b.updatedAt : null),
    warrantyClaim: b.warrantyClaim
      ? {
          status: b.warrantyClaim.status || "none",
          claimType: b.warrantyClaim.claimType || "refund",
          reason: b.warrantyClaim.reason || "",
          details: b.warrantyClaim.details || "",
          proofPhotos: Array.isArray(b.warrantyClaim.proofPhotos) ? b.warrantyClaim.proofPhotos : [],
          isLaborCovered: b.warrantyClaim.isLaborCovered ?? true,
          isPartsCovered: b.warrantyClaim.isPartsCovered ?? false,
          requestedAmount: Number(b.warrantyClaim.requestedAmount) || 0,
          approvedAmount: Number(b.warrantyClaim.approvedAmount) || 0,
          refundPaymentMethod: b.warrantyClaim.refundPaymentMethod || "",
          refundAccountName: b.warrantyClaim.refundAccountName || "",
          refundAccountNumber: b.warrantyClaim.refundAccountNumber || "",
          refundProofImage: b.warrantyClaim.refundProofImage || "",
          rejectionReason: b.warrantyClaim.rejectionReason || "",
          resolutionNotes: b.warrantyClaim.resolutionNotes || "",
          claimedAt: b.warrantyClaim.claimedAt || null,
          approvedAt: b.warrantyClaim.approvedAt || null,
          startedAt: b.warrantyClaim.startedAt || null,
          fixedAt: b.warrantyClaim.fixedAt || null,
          resolvedAt: b.warrantyClaim.resolvedAt || null,
        }
      : { status: "none" },
    warrantySettings: owner?.warrantySettings || null,
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
    .populate("shopOwner", "fullName shopName acceptedPaymentMethods shopPlacePhoto phoneCode phoneNumber shopRegion shopProvince shopCityMunicipality shopBarangay shopDetailedAddress operatingHours warrantySettings role")
    .lean()

  const ownerMap = new Map()
  for (const b of rows) {
    if (b.shopOwner?._id) {
      const oid = String(b.shopOwner._id)
      if (!ownerMap.has(oid)) {
        ownerMap.set(oid, b.shopOwner)
      }
    }
  }

  const addressByOwner = new Map()
  await Promise.all(
    [...ownerMap.entries()].map(async ([oid, owner]) => {
      try {
        const readable = await formatReadableShopAddress(owner)
        addressByOwner.set(oid, readable)
      } catch {
        addressByOwner.set(oid, "")
      }
    })
  )

  return res.json({
    bookings: rows
      .map((row) =>
        mapBookingForCustomer(
          row,
          addressByOwner.get(String(row.shopOwner?._id || "")) || ""
        )
      )
      .filter(Boolean),
  })
})

export const getCustomerBookingById = asyncHandler(async (req, res) => {
  const id = clean(req.params.id)
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400)
    throw new Error("Invalid booking ID")
  }
  const b = await Booking.findOne({ _id: id, customer: req.user._id })
    .populate("shopService", "name category subcategory location status startingPrice servicePhotos")
    .populate(
      "shopOwner",
      "fullName shopName acceptedPaymentMethods shopPlacePhoto phoneCode phoneNumber shopRegion shopProvince shopCityMunicipality shopBarangay shopDetailedAddress operatingHours warrantySettings role"
    )
    .lean()

  if (!b) {
    res.status(404)
    throw new Error("Booking not found")
  }

  let readableAddress = ""
  if (b.shopOwner) {
    try {
      readableAddress = await formatReadableShopAddress(b.shopOwner)
    } catch {
      readableAddress = ""
    }
  }

  return res.json({
    booking: mapBookingForCustomer(b, readableAddress),
  })
})

export const payCustomerBooking = asyncHandler(async (req, res) => {
  const id = clean(req.params.id)
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400)
    throw new Error("Invalid booking")
  }
  const paymentMethod = clean(req.body?.paymentMethod)
  const paymentProofImage = clean(req.body?.paymentProofImage)
  if (!paymentMethod) {
    res.status(400)
    throw new Error("Please choose a payment method.")
  }

  const booking = await Booking.findOne({ _id: id, customer: req.user._id }).populate(
    "shopOwner",
    "acceptedPaymentMethods"
  )
  if (!booking) {
    res.status(404)
    throw new Error("Booking not found.")
  }
  if (!booking.serviceFeeConfirmedAt || booking.serviceFeeLaborRateAtCalc == null) {
    res.status(400)
    throw new Error("Service fee is not available yet.")
  }
  if (booking.paymentStatus === "paid") {
    res.status(400)
    throw new Error("This booking is already paid.")
  }
  const allowed = Array.isArray(booking.shopOwner?.acceptedPaymentMethods)
    ? booking.shopOwner.acceptedPaymentMethods
    : []
  let chosen = allowed.find(
    (m) => String(m?.id || m?._id || "") === paymentMethod || String(m?.type || "") === paymentMethod
  )
  if (!chosen) {
    if (paymentMethod === "cash_on_service" || paymentMethod === "cash") {
      chosen = { type: "cash_on_service", name: "Cash on Service" }
    } else if (paymentMethod === "gcash" || paymentMethod === "maya" || paymentMethod === "bank_transfer") {
      chosen = { type: paymentMethod, name: paymentMethod.toUpperCase() }
    } else {
      res.status(400)
      throw new Error("Selected payment method is not available.")
    }
  }
  if (chosen.type !== "cash_on_service") {
    if (!paymentProofImage) {
      res.status(400)
      throw new Error("Please upload proof of payment.")
    }
    if (!isLikelyImageProof(paymentProofImage)) {
      res.status(400)
      throw new Error("Invalid proof of payment image.")
    }
  }

  booking.paymentStatus = "paid"
  booking.paymentMethod = chosen.type
  booking.paymentProofImage = chosen.type === "cash_on_service" ? "" : paymentProofImage
  booking.paidAt = new Date()
  await booking.save()

  try {
    const ownerId =
      booking.shopOwner && typeof booking.shopOwner === "object" && booking.shopOwner._id
        ? booking.shopOwner._id
        : booking.shopOwner
    const svcDoc = await ShopService.findById(booking.shopService).select("name").lean()
    const labor = booking.serviceFeeLaborRateAtCalc
    const materials = booking.serviceFeeMaterialsAmount
    const totalPaid =
      labor != null && materials != null && Number.isFinite(Number(labor)) && Number.isFinite(Number(materials))
        ? Number(labor) + Number(materials)
        : null
    const text = formatPaymentToProvider({
      bookingRefId: booking._id,
      customerName: req.user.fullName || req.user.email || "Customer",
      serviceName: svcDoc?.name || "Service",
      chosenMethod: chosen,
      labor,
      materials,
      totalPaid,
    })
    const proofAttachments =
      chosen.type !== "cash_on_service" && booking.paymentProofImage
        ? buildPaymentProofAttachments(booking.paymentProofImage)
        : []
    await sendDirectMessage({
      fromUserId: req.user._id,
      toUserId: ownerId,
      content: text,
      attachments: proofAttachments,
    })
  } catch (err) {
    console.error("Booking chat notification failed:", err?.message || err)
  }

  const populated = await Booking.findById(booking._id)
    .populate("shopService", "name category subcategory location status startingPrice")
    .populate("shopOwner", "fullName shopName acceptedPaymentMethods")
    .lean()
  return res.json({
    message: "Payment recorded successfully.",
    booking: mapBookingForCustomer(populated),
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
  const id = String(b._id)
  return {
    id,
    ref: `BK-${id.slice(-8).toUpperCase()}`,
    isWalkIn: Boolean(b.isWalkIn),
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
    startJobProofPhotos: Array.isArray(b.startJobProofPhotos) ? b.startJobProofPhotos : [],
    completionProofPhotos: Array.isArray(b.completionProofPhotos) ? b.completionProofPhotos : [],
    completionNotes: b.completionNotes || "",
    problemDescription: b.problemDescription,
    notes: b.notes || "",
    rejectionReason: b.rejectionReason || "",
    assignedTechnician: b.assignedTechnician ? String(b.assignedTechnician) : null,
    assignedTechnicianName: b.assignedTechnicianName || "",
    assignedTechnicianJobTitle: b.assignedTechnicianJobTitle || "",
    assignedTechnicianPhone: b.assignedTechnicianPhone || "",
    assignedTechnicianModel: b.assignedTechnicianModel || "none",
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
    serviceFeeLaborRateAtCalc:
      b.serviceFeeLaborRateAtCalc != null && Number.isFinite(Number(b.serviceFeeLaborRateAtCalc))
        ? Number(b.serviceFeeLaborRateAtCalc)
        : null,
    serviceFeeMaterialsAmount:
      b.serviceFeeMaterialsAmount != null && Number.isFinite(Number(b.serviceFeeMaterialsAmount))
        ? Number(b.serviceFeeMaterialsAmount)
        : null,
    serviceFeeMaterialsDescription: typeof b.serviceFeeMaterialsDescription === "string" ? b.serviceFeeMaterialsDescription : "",
    serviceFeeReplacementParts: Array.isArray(b.serviceFeeReplacementParts)
      ? b.serviceFeeReplacementParts
        .map((x) => ({
          name: typeof x?.name === "string" ? x.name : "",
          price: Number.isFinite(Number(x?.price)) ? Number(x.price) : 0,
        }))
        .filter((x) => x.name)
      : [],
    serviceFeeConfirmedAt: b.serviceFeeConfirmedAt || null,
    fixedAt: b.fixedAt || null,
    paymentStatus: b.paymentStatus || "unpaid",
    paymentMethod: b.paymentMethod || "",
    paymentProofImage: b.paymentProofImage || "",
    paidAt: b.paidAt || null,
    completedAt: b.completedAt || b.paidAt || (b.status === "completed" ? b.updatedAt : null),
    warrantyClaim: b.warrantyClaim
      ? {
          status: b.warrantyClaim.status || "none",
          claimType: b.warrantyClaim.claimType || "refund",
          reason: b.warrantyClaim.reason || "",
          details: b.warrantyClaim.details || "",
          proofPhotos: Array.isArray(b.warrantyClaim.proofPhotos) ? b.warrantyClaim.proofPhotos : [],
          isLaborCovered: b.warrantyClaim.isLaborCovered ?? true,
          isPartsCovered: b.warrantyClaim.isPartsCovered ?? false,
          requestedAmount: Number(b.warrantyClaim.requestedAmount) || 0,
          approvedAmount: Number(b.warrantyClaim.approvedAmount) || 0,
          refundPaymentMethod: b.warrantyClaim.refundPaymentMethod || "",
          refundAccountName: b.warrantyClaim.refundAccountName || "",
          refundAccountNumber: b.warrantyClaim.refundAccountNumber || "",
          refundProofImage: b.warrantyClaim.refundProofImage || "",
          rejectionReason: b.warrantyClaim.rejectionReason || "",
          resolutionNotes: b.warrantyClaim.resolutionNotes || "",
          claimedAt: b.warrantyClaim.claimedAt || null,
          approvedAt: b.warrantyClaim.approvedAt || null,
          startedAt: b.warrantyClaim.startedAt || null,
          fixedAt: b.warrantyClaim.fixedAt || null,
          resolvedAt: b.warrantyClaim.resolvedAt || null,
        }
      : { status: "none" },
    warrantySettings: b.shopOwner?.warrantySettings || null,
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
    .populate("shopOwner", "fullName shopName warrantySettings")
    .lean()

  return res.json({
    bookings: rows.map((row) => mapBookingForShopOwner(row)).filter(Boolean),
  })
})

const MIN_REJECTION_REASON_LEN = 10

/**
 * PATCH body: { status?: pending|confirmed|working|cancelled|completed, rejectionReason?: string, assignedTechnician?: string }
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

  const doc = await Booking.findOne({ _id: id, shopOwner: req.user._id })
  if (!doc) {
    res.status(404)
    throw new Error("Booking not found")
  }

  const prev = doc.status

  // Handle technician assignment/reassignment if passed
  if (req.body?.assignedTechnician !== undefined) {
    const assignedTechId = clean(req.body.assignedTechnician)
    if (assignedTechId) {
      const techInfo = await resolveBookingTechnician(req.user._id, assignedTechId)
      if (techInfo) {
        doc.assignedTechnician = techInfo.id
        doc.assignedTechnicianName = techInfo.name
        doc.assignedTechnicianJobTitle = techInfo.jobTitle
        doc.assignedTechnicianPhone = techInfo.phone
        doc.assignedTechnicianModel = techInfo.model
      }
    } else {
      doc.assignedTechnician = null
      doc.assignedTechnicianName = ""
      doc.assignedTechnicianJobTitle = ""
      doc.assignedTechnicianPhone = ""
      doc.assignedTechnicianModel = "none"
    }
  }

  if (nextStatus) {
    if (!["confirmed", "working", "fixed", "completed", "cancelled"].includes(nextStatus)) {
      res.status(400)
      throw new Error("Invalid status")
    }

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
      doc.status = "cancelled"
    }

    if (nextStatus === "confirmed") {
      if (prev !== "pending") {
        res.status(400)
        throw new Error("Only pending bookings can be confirmed.")
      }
      doc.status = "confirmed"
    }

    if (nextStatus === "working") {
      if (prev !== "confirmed") {
        res.status(400)
        throw new Error("Only confirmed bookings can be marked as working.")
      }
      const rawProof =
        req.body?.startJobProofPhotos ??
        req.body?.workingProofPhotos ??
        req.body?.proofPhotos ??
        req.body?.pictureProof
      const proofList = await normalizeProofPhotos(rawProof, req)
      if (proofList.length === 0) {
        res.status(400)
        throw new Error("Please upload at least one picture proof before starting the job.")
      }
      doc.startJobProofPhotos = proofList
      doc.status = "working"
    }

    if (nextStatus === "fixed") {
      if (prev !== "working") {
        res.status(400)
        throw new Error("Mark the booking as working first, then mark as fixed when the repair is finished.")
      }
      if (
        !doc.serviceFeeConfirmedAt ||
        doc.serviceFeeMaterialsAmount == null ||
        doc.serviceFeeLaborRateAtCalc == null
      ) {
        res.status(400)
        throw new Error("Calculate and save the service fee before marking this job as fixed.")
      }
      doc.fixedAt = new Date()
      doc.status = "fixed"
    }

    if (nextStatus === "completed") {
      if (prev !== "fixed" && prev !== "working") {
        res.status(400)
        throw new Error("Mark the booking as fixed first, then complete when customer payment is confirmed.")
      }
      if (
        !doc.serviceFeeConfirmedAt ||
        doc.serviceFeeMaterialsAmount == null ||
        doc.serviceFeeLaborRateAtCalc == null
      ) {
        res.status(400)
        throw new Error("Calculate and save the service fee before completing.")
      }
      if (doc.paymentStatus !== "paid") {
        if (doc.isWalkIn || !doc.customer || req.body?.paymentMethod || req.body?.markPaid) {
          doc.paymentStatus = "paid"
          doc.paymentMethod = clean(req.body?.paymentMethod) || "cash"
          doc.paidAt = new Date()
        } else {
          res.status(400)
          throw new Error("Customer must complete payment first before this booking can be marked as Paid (Completed).")
        }
      }

      const rawCompletionProof =
        req.body?.completionProofPhotos ??
        req.body?.handoverProofPhotos ??
        req.body?.proofPhotos ??
        req.body?.completionProof
      const completionProofList = await normalizeProofPhotos(rawCompletionProof, req)
      if (completionProofList.length > 0) {
        doc.completionProofPhotos = completionProofList
      }
      if (typeof req.body?.completionNotes === "string") {
        doc.completionNotes = req.body.completionNotes.trim()
      }

      doc.status = "completed"
      doc.completedAt = doc.completedAt || new Date()
    }
  }

  await doc.save()

  if (nextStatus && doc.customer && !doc.isWalkIn) {
    try {
      const actor = await User.findById(req.user._id).select("shopName fullName").lean()
      const shopLabel = (actor?.shopName && String(actor.shopName).trim()) || actor?.fullName || "Provider"
      const text = formatStatusUpdateToCustomer({
        newStatus: nextStatus,
        bookingRefId: doc._id,
        shopName: shopLabel,
        rejectionReason: nextStatus === "cancelled" ? doc.rejectionReason || rejectionReason : "",
      })
      let attachments = []
      if (nextStatus === "working" && Array.isArray(doc.startJobProofPhotos) && doc.startJobProofPhotos.length > 0) {
        attachments = buildStartJobProofAttachments(doc.startJobProofPhotos)
      } else if (nextStatus === "completed" && Array.isArray(doc.completionProofPhotos) && doc.completionProofPhotos.length > 0) {
        attachments = buildStartJobProofAttachments(doc.completionProofPhotos)
      }
      await sendDirectMessage({
        fromUserId: req.user._id,
        toUserId: doc.customer,
        content: text,
        attachments,
      })
    } catch (err) {
      console.error("Booking chat notification failed:", err?.message || err)
    }
  }

  const populated = await Booking.findById(doc._id)
    .populate("customer", "fullName email phoneCode phoneNumber")
    .populate("shopService", "name category subcategory location status startingPrice")
    .lean()

  return res.json({
    message: "Booking updated.",
    booking: mapBookingForShopOwner(populated),
  })
})

/** Non-negative PHP amount; null if invalid. */
function parseNonNegativeMoney(v) {
  if (v === null || v === undefined) return null
  if (typeof v === "number" && Number.isFinite(v)) return v < 0 ? null : v
  const s = clean(String(v))
  if (!s) return null
  const n = Number(s)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

function normalizeReplacementParts(value) {
  if (!Array.isArray(value)) return []
  const out = []
  for (const row of value) {
    const name = clean(row?.name)
    const price = parseNonNegativeMoney(row?.price)
    if (!name && price === null) continue
    if (!name) return { error: "Each replacement part must have a name." }
    if (price === null) return { error: `Enter a valid price for replacement part "${name}".` }
    out.push({ name, price })
    if (out.length >= 20) break
  }
  return { parts: out }
}

/**
 * PATCH body: { laborPrice:number(>=0), replacementParts?: [{name,price}] }
 * Only when status is working. Provider encodes labor + replacement parts.
 */
export const patchShopOwnerBookingServiceFee = asyncHandler(async (req, res) => {
  const id = clean(req.params.id)
  const laborPrice = parseNonNegativeMoney(req.body?.laborPrice)
  const normalizedParts = normalizeReplacementParts(req.body?.replacementParts)

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400)
    throw new Error("Invalid booking")
  }
  if (laborPrice === null) {
    res.status(400)
    throw new Error("Enter a valid labor price (0 or more PHP).")
  }
  if (normalizedParts.error) {
    res.status(400)
    throw new Error(normalizedParts.error)
  }

  const doc = await Booking.findOne({ _id: id, shopOwner: req.user._id }).populate(
    "shopService",
    "name startingPrice",
  )
  if (!doc) {
    res.status(404)
    throw new Error("Booking not found")
  }
  if (doc.status !== "working") {
    res.status(400)
    throw new Error("You can only add a service fee while the booking is marked as working.")
  }

  const parts = normalizedParts.parts || []
  const materialsTotal = parts.reduce((sum, x) => sum + Number(x.price || 0), 0)
  doc.serviceFeeLaborRateAtCalc = laborPrice
  doc.serviceFeeMaterialsAmount = materialsTotal
  doc.serviceFeeMaterialsDescription = parts.map((x) => `${x.name} - ${x.price}`).join(", ")
  doc.serviceFeeReplacementParts = parts
  doc.serviceFeeConfirmedAt = new Date()
  await doc.save()

  if (doc.customer && !doc.isWalkIn) {
    try {
      const actor = await User.findById(req.user._id).select("shopName fullName").lean()
      const providerLabel = (actor?.shopName && String(actor.shopName).trim()) || actor?.fullName || "Provider"
      const svc =
        doc.shopService && typeof doc.shopService === "object" ? doc.shopService : null
      const text = formatServiceFeeToCustomer({
        bookingRefId: doc._id,
        providerLabel,
        labor: doc.serviceFeeLaborRateAtCalc,
        materials: doc.serviceFeeMaterialsAmount,
        replacementParts: doc.serviceFeeReplacementParts,
        serviceName: svc?.name || "",
      })
      await sendDirectMessage({
        fromUserId: req.user._id,
        toUserId: doc.customer,
        content: text,
      })
    } catch (err) {
      console.error("Booking chat notification failed:", err?.message || err)
    }
  }

  const populated = await Booking.findById(doc._id)
    .populate("customer", "fullName email phoneCode phoneNumber")
    .populate("shopService", "name category subcategory location status startingPrice")
    .lean()

  return res.json({
    message: "Service fee saved.",
    booking: mapBookingForShopOwner(populated),
  })
})

/** Bookings for services where this mechanic is assigned or listed in technicianIds. */
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
    isWalkIn: Boolean(b.isWalkIn),
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
    startJobProofPhotos: Array.isArray(b.startJobProofPhotos) ? b.startJobProofPhotos : [],
    completionProofPhotos: Array.isArray(b.completionProofPhotos) ? b.completionProofPhotos : [],
    completionNotes: b.completionNotes || "",
    problemDescription: b.problemDescription,
    notes: b.notes || "",
    rejectionReason: b.rejectionReason || "",
    assignedTechnician: b.assignedTechnician ? String(b.assignedTechnician) : null,
    assignedTechnicianName: b.assignedTechnicianName || "",
    assignedTechnicianJobTitle: b.assignedTechnicianJobTitle || "",
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
    serviceFeeLaborRateAtCalc:
      b.serviceFeeLaborRateAtCalc != null && Number.isFinite(Number(b.serviceFeeLaborRateAtCalc))
        ? Number(b.serviceFeeLaborRateAtCalc)
        : null,
    serviceFeeMaterialsAmount:
      b.serviceFeeMaterialsAmount != null && Number.isFinite(Number(b.serviceFeeMaterialsAmount))
        ? Number(b.serviceFeeMaterialsAmount)
        : null,
    serviceFeeMaterialsDescription: typeof b.serviceFeeMaterialsDescription === "string" ? b.serviceFeeMaterialsDescription : "",
    serviceFeeReplacementParts: Array.isArray(b.serviceFeeReplacementParts)
      ? b.serviceFeeReplacementParts
        .map((x) => ({
          name: typeof x?.name === "string" ? x.name : "",
          price: Number.isFinite(Number(x?.price)) ? Number(x.price) : 0,
        }))
        .filter((x) => x.name)
      : [],
    serviceFeeConfirmedAt: b.serviceFeeConfirmedAt || null,
    fixedAt: b.fixedAt || null,
    paymentStatus: b.paymentStatus || "unpaid",
    paymentMethod: b.paymentMethod || "",
    paymentProofImage: b.paymentProofImage || "",
    paidAt: b.paidAt || null,
    completedAt: b.completedAt || b.paidAt || (b.status === "completed" ? b.updatedAt : null),
    warrantyClaim: b.warrantyClaim
      ? {
          status: b.warrantyClaim.status || "none",
          claimType: b.warrantyClaim.claimType || "refund",
          reason: b.warrantyClaim.reason || "",
          details: b.warrantyClaim.details || "",
          proofPhotos: Array.isArray(b.warrantyClaim.proofPhotos) ? b.warrantyClaim.proofPhotos : [],
          isLaborCovered: b.warrantyClaim.isLaborCovered ?? true,
          isPartsCovered: b.warrantyClaim.isPartsCovered ?? false,
          requestedAmount: Number(b.warrantyClaim.requestedAmount) || 0,
          approvedAmount: Number(b.warrantyClaim.approvedAmount) || 0,
          refundPaymentMethod: b.warrantyClaim.refundPaymentMethod || "",
          refundAccountName: b.warrantyClaim.refundAccountName || "",
          refundAccountNumber: b.warrantyClaim.refundAccountNumber || "",
          refundProofImage: b.warrantyClaim.refundProofImage || "",
          rejectionReason: b.warrantyClaim.rejectionReason || "",
          resolutionNotes: b.warrantyClaim.resolutionNotes || "",
          claimedAt: b.warrantyClaim.claimedAt || null,
          approvedAt: b.warrantyClaim.approvedAt || null,
          startedAt: b.warrantyClaim.startedAt || null,
          fixedAt: b.warrantyClaim.fixedAt || null,
          resolvedAt: b.warrantyClaim.resolvedAt || null,
        }
      : { status: "none" },
    warrantySettings: owner?.warrantySettings || null,
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

  const orConditions = [
    { assignedTechnician: techId },
    ...(serviceIds.length ? [{ shopService: { $in: serviceIds } }] : []),
  ]

  const query = { $or: orConditions }
  if (["pending", "confirmed", "working", "cancelled", "completed"].includes(statusQ)) {
    query.status = statusQ
  }

  const rows = await Booking.find(query)
    .sort({ updatedAt: -1 })
    .populate("customer", "fullName email phoneCode phoneNumber")
    .populate("shopService", "name category subcategory location status startingPrice")
    .populate("shopOwner", "fullName shopName warrantySettings")
    .lean()

  return res.json({
    bookings: rows.map((row) => mapBookingForTechnician(row)).filter(Boolean),
  })
})

/**
 * PATCH body: { action: "working" | "completed" }
 * Technician must be assigned to the booking or listed on the shop service.
 * working: confirmed → working. completed: working → completed.
 */
export const patchTechnicianBookingAction = asyncHandler(async (req, res) => {
  const id = clean(req.params.id)
  const action = clean(req.body?.action).toLowerCase()

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400)
    throw new Error("Invalid booking")
  }
  if (!["working", "fixed", "completed"].includes(action)) {
    res.status(400)
    throw new Error('Use action "working", "fixed", or "completed".')
  }

  const techId = req.user._id

  const doc = await Booking.findById(id).populate("shopService", "technicianIds")
  if (!doc) {
    res.status(404)
    throw new Error("Booking not found")
  }

  const svc = doc.shopService && typeof doc.shopService === "object" ? doc.shopService : null
  const ids = Array.isArray(svc?.technicianIds) ? svc.technicianIds : []
  const allowed =
    (doc.assignedTechnician && String(doc.assignedTechnician) === String(techId)) ||
    ids.some((x) => String(x) === String(techId))
  if (!allowed) {
    res.status(403)
    throw new Error("You are not assigned to this booking.")
  }

  const prev = doc.status

  if (action === "working") {
    if (prev !== "confirmed") {
      res.status(400)
      throw new Error("Only confirmed bookings can be marked as working.")
    }
    const rawProof =
      req.body?.startJobProofPhotos ??
      req.body?.workingProofPhotos ??
      req.body?.proofPhotos ??
      req.body?.pictureProof
    if (rawProof) {
      const proofList = await normalizeProofPhotos(rawProof, req)
      if (proofList.length > 0) {
        doc.startJobProofPhotos = proofList
      }
    }
    doc.status = "working"
  } else if (action === "fixed") {
    if (prev !== "working") {
      res.status(400)
      throw new Error("Mark the booking as working first, then mark as fixed when the repair is finished.")
    }
    if (!doc.serviceFeeConfirmedAt || doc.serviceFeeMaterialsAmount == null || doc.serviceFeeLaborRateAtCalc == null) {
      res.status(400)
      throw new Error("Calculate and save the service fee before marking this job as fixed.")
    }
    doc.fixedAt = new Date()
    doc.status = "fixed"
  } else {
    if (prev !== "fixed" && prev !== "working") {
      res.status(400)
      throw new Error("Mark the booking as fixed first, then complete when customer payment is confirmed.")
    }
    if (!doc.serviceFeeConfirmedAt || doc.serviceFeeMaterialsAmount == null || doc.serviceFeeLaborRateAtCalc == null) {
      res.status(400)
      throw new Error("Calculate and save the service fee before marking this job complete.")
    }
    if (doc.paymentStatus !== "paid") {
      if (doc.isWalkIn || !doc.customer || req.body?.paymentMethod || req.body?.markPaid) {
        doc.paymentStatus = "paid"
        doc.paymentMethod = clean(req.body?.paymentMethod) || "cash"
        doc.paidAt = new Date()
      } else {
        res.status(400)
        throw new Error("Customer must complete payment first before this booking can be marked as Paid (Completed).")
      }
    }

    const rawCompletionProof =
      req.body?.completionProofPhotos ??
      req.body?.handoverProofPhotos ??
      req.body?.proofPhotos ??
      req.body?.completionProof
    const completionProofList = await normalizeProofPhotos(rawCompletionProof, req)
    if (completionProofList.length > 0) {
      doc.completionProofPhotos = completionProofList
    }
    if (typeof req.body?.completionNotes === "string") {
      doc.completionNotes = req.body.completionNotes.trim()
    }

    doc.status = "completed"
    doc.completedAt = doc.completedAt || new Date()
  }

  await doc.save()

  if (doc.customer && !doc.isWalkIn) {
    try {
      const tech = await User.findById(techId).select("fullName").lean()
      const techName = tech?.fullName?.trim() || "Technician"
      const text = formatTechnicianActionToCustomer({
        bookingRefId: doc._id,
        action,
        technicianName: techName,
      })
      await sendDirectMessage({
        fromUserId: techId,
        toUserId: doc.customer,
        content: text,
      })
    } catch (err) {
      console.error("Booking chat notification failed:", err?.message || err)
    }
  }

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

/**
 * PATCH body: { laborPrice:number(>=0), replacementParts?: [{name,price}] }
 * Assigned technician only; booking must be working.
 */
export const patchMechanicBookingServiceFee = asyncHandler(async (req, res) => {
  const id = clean(req.params.id)
  const laborPrice = parseNonNegativeMoney(req.body?.laborPrice)
  const normalizedParts = normalizeReplacementParts(req.body?.replacementParts)

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400)
    throw new Error("Invalid booking")
  }
  if (laborPrice === null) {
    res.status(400)
    throw new Error("Enter a valid labor price (0 or more PHP).")
  }
  if (normalizedParts.error) {
    res.status(400)
    throw new Error(normalizedParts.error)
  }

  const techId = req.user._id
  const doc = await Booking.findById(id).populate("shopService", "name technicianIds startingPrice")
  if (!doc) {
    res.status(404)
    throw new Error("Booking not found")
  }

  const svc = doc.shopService && typeof doc.shopService === "object" ? doc.shopService : null
  const ids = Array.isArray(svc?.technicianIds) ? svc.technicianIds : []
  const allowed =
    (doc.assignedTechnician && String(doc.assignedTechnician) === String(techId)) ||
    ids.some((x) => String(x) === String(techId))
  if (!allowed) {
    res.status(403)
    throw new Error("You are not assigned to this booking.")
  }

  if (doc.status !== "working") {
    res.status(400)
    throw new Error("You can only add a service fee while the booking is marked as working.")
  }

  const parts = normalizedParts.parts || []
  const materialsTotal = parts.reduce((sum, x) => sum + Number(x.price || 0), 0)
  doc.serviceFeeLaborRateAtCalc = laborPrice
  doc.serviceFeeMaterialsAmount = materialsTotal
  doc.serviceFeeMaterialsDescription = parts.map((x) => `${x.name} - ${x.price}`).join(", ")
  doc.serviceFeeReplacementParts = parts
  doc.serviceFeeConfirmedAt = new Date()
  await doc.save()

  if (doc.customer && !doc.isWalkIn) {
    try {
      const tech = await User.findById(techId).select("fullName").lean()
      const providerLabel = tech?.fullName?.trim() || "Technician"
      const text = formatServiceFeeToCustomer({
        bookingRefId: doc._id,
        providerLabel,
        labor: doc.serviceFeeLaborRateAtCalc,
        materials: doc.serviceFeeMaterialsAmount,
        replacementParts: doc.serviceFeeReplacementParts,
        serviceName: svc?.name || "",
      })
      await sendDirectMessage({
        fromUserId: techId,
        toUserId: doc.customer,
        content: text,
      })
    } catch (err) {
      console.error("Booking chat notification failed:", err?.message || err)
    }
  }

  const populated = await Booking.findById(doc._id)
    .populate("customer", "fullName email phoneCode phoneNumber")
    .populate("shopService", "name category subcategory location status startingPrice")
    .populate("shopOwner", "fullName shopName")
    .lean()

  return res.json({
    message: "Service fee saved.",
    booking: mapBookingForTechnician(populated),
  })
})

/** Collect technician User names for populated booking rows (technicianIds may reference User or other docs). */
async function buildTechnicianNameMap(rows) {
  const ids = new Set()
  for (const b of rows) {
    if (b.assignedTechnician) {
      ids.add(String(b.assignedTechnician))
    }
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
  const serviceTechNames = techIds.map((tid) => {
    if (!tid) return null
    const name = techNameById.get(String(tid))
    return name || "Assigned staff"
  })
  const allTechNames = [
    b.assignedTechnicianName || (b.assignedTechnician ? techNameById.get(String(b.assignedTechnician)) : null),
    ...serviceTechNames,
  ].filter(Boolean)
  const uniqueTechNames = [...new Set(allTechNames)]

  const id = String(b._id)
  return {
    _id: id,
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
        _id: cust._id ? String(cust._id) : undefined,
        fullName: cust.fullName || "",
        email: cust.email || "",
        phone: [cust.phoneCode, cust.phoneNumber].filter(Boolean).join(" ").trim(),
        role: cust.role || "customer",
      }
      : null,
    shopOwner: owner
      ? {
        _id: owner._id ? String(owner._id) : undefined,
        fullName: owner.fullName || "",
        shopName: owner.shopName || "",
        role: owner.role || "shop_owner",
        phone: owner.phone || owner.phoneNumber || "",
        email: owner.email || "",
      }
      : null,
    shopService: svc
      ? {
        id: String(svc._id),
        _id: String(svc._id),
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
    serviceFeeLaborRateAtCalc:
      b.serviceFeeLaborRateAtCalc != null && Number.isFinite(Number(b.serviceFeeLaborRateAtCalc))
        ? Number(b.serviceFeeLaborRateAtCalc)
        : null,
    serviceFeeMaterialsAmount:
      b.serviceFeeMaterialsAmount != null && Number.isFinite(Number(b.serviceFeeMaterialsAmount))
        ? Number(b.serviceFeeMaterialsAmount)
        : null,
    serviceFeeMaterialsDescription:
      typeof b.serviceFeeMaterialsDescription === "string" ? b.serviceFeeMaterialsDescription : "",
    serviceFeeReplacementParts: Array.isArray(b.serviceFeeReplacementParts)
      ? b.serviceFeeReplacementParts
      : [],
    paymentStatus: b.paymentStatus || "unpaid",
    paymentMethod: b.paymentMethod || "",
    paidAt: b.paidAt || null,
    customerReviewRating: b.customerReviewRating || null,
    customerReviewComment: b.customerReviewComment || "",
    assignedTechnicians: uniqueTechNames,
    assignedTechnicianName: b.assignedTechnicianName || "",
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
    .populate("shopOwner", "fullName shopName role phone phoneNumber email")
    .populate("shopService", "name category subcategory location status technicianIds startingPrice")
    .lean()

  const techNameById = await buildTechnicianNameMap(rows)
  const data = rows.map((row) => mapBookingForAdmin(row, techNameById)).filter(Boolean)
  return res.json({
    data,
    bookings: data,
  })
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

/**
 * POST /api/catalog/bookings/:id/warranty-claim
 * Customer submits a warranty claim / refund request on a completed booking.
 */
export const submitCustomerWarrantyClaim = asyncHandler(async (req, res) => {
  const id = clean(req.params.id)
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400)
    throw new Error("Invalid booking ID")
  }

  const booking = await Booking.findOne({ _id: id, customer: req.user._id })
    .populate("shopOwner", "fullName shopName warrantySettings")
    .populate("shopService", "name")

  if (!booking) {
    res.status(404)
    throw new Error("Booking not found")
  }

  if (booking.status !== "completed") {
    res.status(400)
    throw new Error("Warranty claims and refund requests are only available for completed bookings.")
  }

  if (booking.warrantyClaim?.status === "pending") {
    res.status(400)
    throw new Error("A warranty claim is already pending review for this booking.")
  }

  const claimType = clean(req.body?.claimType) === "labor_rework" ? "labor_rework" : "refund"
  const reason = clean(req.body?.reason)
  const details = clean(req.body?.details)
  const rawProof = req.body?.proofPhotos ?? req.body?.photos
  const proofPhotos = await normalizeProofPhotos(rawProof, req)
  const requestedAmountRaw = parseNonNegativeMoney(req.body?.requestedAmount)

  const refundPaymentMethod = clean(req.body?.refundPaymentMethod)
  const refundAccountName = clean(req.body?.refundAccountName)
  const refundAccountNumber = clean(req.body?.refundAccountNumber)

  if (!reason) {
    res.status(400)
    throw new Error("Please select or specify a reason for the warranty claim.")
  }
  if (!details || details.length < 10) {
    res.status(400)
    throw new Error("Please provide a detailed explanation of the defect or issue (at least 10 characters).")
  }

  // Calculate warranty validity based on provider's warranty settings
  const ownerWarranty = booking.shopOwner?.warrantySettings || {}
  const laborDays = ownerWarranty.laborWarrantyEnabled !== false ? Number(ownerWarranty.laborWarrantyDays) || 30 : 0
  const partsDays = ownerWarranty.partsWarrantyEnabled !== false ? Number(ownerWarranty.partsWarrantyDays) || 30 : 0

  const completionDate = booking.completedAt || booking.paidAt || booking.updatedAt || booking.createdAt
  const completionTime = new Date(completionDate).getTime()
  const now = Date.now()

  const isLaborCovered = laborDays > 0 && now <= completionTime + laborDays * 24 * 60 * 60 * 1000
  const isPartsCovered = partsDays > 0 && now <= completionTime + partsDays * 24 * 60 * 60 * 1000

  // Total paid calculation
  const laborFee = Number(booking.serviceFeeLaborRateAtCalc) || 0
  const partsFee = Number(booking.serviceFeeMaterialsAmount) || 0
  const totalPaid = laborFee + partsFee

  let requestedAmount = requestedAmountRaw != null ? requestedAmountRaw : 0
  if (claimType === "labor_rework") {
    // Free labor rework: requested amount is 0 (labor is waived under warranty)
    requestedAmount = 0
  } else if (requestedAmount === 0 || requestedAmount > totalPaid) {
    // Default to labor fee if labor warranty is active, or total paid
    requestedAmount = isLaborCovered && requestedAmount === 0 ? laborFee : Math.min(requestedAmount || totalPaid, totalPaid)
  }

  booking.warrantyClaim = {
    status: "pending",
    claimType,
    reason,
    details,
    proofPhotos,
    isLaborCovered,
    isPartsCovered,
    requestedAmount,
    approvedAmount: 0,
    refundPaymentMethod,
    refundAccountName,
    refundAccountNumber,
    refundProofImage: "",
    rejectionReason: "",
    resolutionNotes: "",
    claimedAt: new Date(),
    resolvedAt: null,
  }

  await booking.save()

  // Send direct message notification to shop provider
  try {
    const text = formatWarrantyClaimCustomerToProvider({
      booking,
      claimType,
      reason,
      details,
      requestedAmount,
      isLaborCovered,
      refundPaymentMethod,
      refundAccountName,
      refundAccountNumber,
    })
    const attachments = buildWarrantyProofAttachments(proofPhotos)
    await sendDirectMessage({
      fromUserId: req.user._id,
      toUserId: booking.shopOwner._id,
      content: text,
      attachments,
    })
  } catch (err) {
    console.error("Warranty claim notification error:", err?.message || err)
  }

  const populated = await Booking.findById(booking._id)
    .populate("shopService", "name category subcategory location status startingPrice")
    .populate(
      "shopOwner",
      "fullName shopName acceptedPaymentMethods shopPlacePhoto phoneCode phoneNumber shopRegion shopProvince shopCityMunicipality shopBarangay shopDetailedAddress operatingHours warrantySettings role"
    )
    .lean()

  let readableAddress = ""
  if (populated.shopOwner) {
    try {
      readableAddress = await formatReadableShopAddress(populated.shopOwner)
    } catch {
      readableAddress = ""
    }
  }

  return res.json({
    message: "Warranty claim request submitted successfully.",
    booking: mapBookingForCustomer(populated, readableAddress),
  })
})

/**
 * PATCH /api/shop/bookings/:id/warranty-claim
 * Shop owner reviews and approves or rejects customer warranty claim / refund.
 */
export const patchShopOwnerWarrantyClaim = asyncHandler(async (req, res) => {
  const id = clean(req.params.id)
  let rawAction = clean(req.body?.action).toLowerCase() // "approved", "working", "fixed", "resolved", "rejected"
  if (rawAction === "approve") rawAction = "approved"
  if (rawAction === "reject") rawAction = "rejected"
  if (rawAction === "resolve" || rawAction === "complete") rawAction = "resolved"
  if (rawAction === "fix") rawAction = "fixed"
  if (rawAction === "work") rawAction = "working"
  const action = rawAction
  const rejectionReason = clean(req.body?.rejectionReason)
  const resolutionNotes = clean(req.body?.resolutionNotes)
  const approvedAmountRaw = parseNonNegativeMoney(req.body?.approvedAmount)
  const rawRefundProof = req.body?.refundProofImage ?? req.body?.proofImage
  const refundProofImage = rawRefundProof ? await persistIssuePhotoSource(rawRefundProof, req) : ""

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400)
    throw new Error("Invalid booking ID")
  }
  const validActions = ["approved", "working", "in_progress", "fixed", "resolved", "completed", "rejected"]
  if (!validActions.includes(action)) {
    res.status(400)
    throw new Error("Invalid action. Must be 'approved', 'working', 'fixed', 'resolved', or 'rejected'.")
  }

  const booking = await Booking.findOne({ _id: id, shopOwner: req.user._id })
    .populate("shopService", "name")
    .populate("shopOwner", "shopName fullName")

  if (!booking) {
    res.status(404)
    throw new Error("Booking not found")
  }
  if (!booking.warrantyClaim || !booking.warrantyClaim.status || booking.warrantyClaim.status === "none") {
    res.status(400)
    throw new Error("This booking does not have an active warranty claim.")
  }

  if (action === "rejected") {
    if (!rejectionReason || rejectionReason.length < 5) {
      res.status(400)
      throw new Error("Please provide a reason for rejecting the warranty claim (at least 5 characters).")
    }
    booking.warrantyClaim.status = "rejected"
    booking.warrantyClaim.rejectionReason = rejectionReason
    booking.warrantyClaim.resolvedAt = new Date()
  } else if (action === "working" || action === "in_progress") {
    booking.warrantyClaim.status = "working"
    booking.warrantyClaim.startedAt = new Date()
    if (resolutionNotes) booking.warrantyClaim.resolutionNotes = resolutionNotes

    const rawStartPhotos = Array.isArray(req.body?.startJobProofPhotos)
      ? req.body.startJobProofPhotos
      : Array.isArray(req.body?.proofPhotos)
        ? req.body.proofPhotos
        : []
    if (rawStartPhotos.length > 0) {
      const persisted = []
      for (const p of rawStartPhotos) {
        if (p && typeof p === "string") {
          persisted.push(await persistIssuePhotoSource(p, req))
        }
      }
      if (persisted.length > 0) {
        booking.startJobProofPhotos = persisted
      }
    }
  } else if (action === "fixed") {
    booking.warrantyClaim.status = "fixed"
    booking.warrantyClaim.fixedAt = new Date()
    if (resolutionNotes) booking.warrantyClaim.resolutionNotes = resolutionNotes
  } else if (action === "resolved" || action === "completed") {
    booking.warrantyClaim.status = "resolved"
    booking.warrantyClaim.resolvedAt = new Date()
    if (resolutionNotes) booking.warrantyClaim.resolutionNotes = resolutionNotes
    if (refundProofImage) booking.warrantyClaim.refundProofImage = refundProofImage

    const rawCompPhotos = Array.isArray(req.body?.completionProofPhotos)
      ? req.body.completionProofPhotos
      : Array.isArray(req.body?.proofPhotos)
        ? req.body.proofPhotos
        : []
    if (rawCompPhotos.length > 0) {
      const persisted = []
      for (const p of rawCompPhotos) {
        if (p && typeof p === "string") {
          persisted.push(await persistIssuePhotoSource(p, req))
        }
      }
      if (persisted.length > 0) {
        booking.completionProofPhotos = persisted
      }
    }
  } else {
    // Approved
    const totalPaid =
      (Number(booking.serviceFeeLaborRateAtCalc) || 0) + (Number(booking.serviceFeeMaterialsAmount) || 0)
    const approvedAmount =
      approvedAmountRaw != null
        ? Math.min(approvedAmountRaw, totalPaid)
        : booking.warrantyClaim.requestedAmount || 0

    booking.warrantyClaim.status = "approved"
    booking.warrantyClaim.approvedAt = new Date()
    booking.warrantyClaim.approvedAmount = approvedAmount
    if (refundProofImage) {
      booking.warrantyClaim.refundProofImage = refundProofImage
    }
    if (resolutionNotes) {
      booking.warrantyClaim.resolutionNotes = resolutionNotes
    }
  }

  await booking.save()

  // Chat notification to customer
  try {
    const shopLabel =
      (booking.shopOwner?.shopName && String(booking.shopOwner.shopName).trim()) ||
      booking.shopOwner?.fullName ||
      "Provider"
    const text = formatWarrantyClaimResponseToCustomer({
      booking,
      action,
      approvedAmount: booking.warrantyClaim.approvedAmount,
      rejectionReason,
      resolutionNotes,
      shopName: shopLabel,
    })
    const attachments = refundProofImage ? buildPaymentProofAttachments(refundProofImage) : []
    await sendDirectMessage({
      fromUserId: req.user._id,
      toUserId: booking.customer,
      content: text,
      attachments,
    })
  } catch (err) {
    console.error("Warranty claim resolution notification error:", err?.message || err)
  }

  const populated = await Booking.findById(booking._id)
    .populate("customer", "fullName email phoneCode phoneNumber")
    .populate("shopService", "name category subcategory location status startingPrice")
    .populate("shopOwner", "fullName shopName warrantySettings")
    .lean()

  return res.json({
    message: action === "rejected" ? "Warranty claim rejected." : "Warranty claim updated successfully.",
    booking: mapBookingForShopOwner(populated),
  })
})

/**
 * PATCH /api/mechanic/bookings/:id/warranty-claim
 * Assigned technician reviews and approves or rejects customer warranty claim / refund.
 */
export const patchMechanicWarrantyClaim = asyncHandler(async (req, res) => {
  const id = clean(req.params.id)
  let rawAction = clean(req.body?.action).toLowerCase()
  if (rawAction === "approve") rawAction = "approved"
  if (rawAction === "reject") rawAction = "rejected"
  if (rawAction === "resolve" || rawAction === "complete") rawAction = "resolved"
  if (rawAction === "fix") rawAction = "fixed"
  if (rawAction === "work") rawAction = "working"
  const action = rawAction
  const rejectionReason = clean(req.body?.rejectionReason)
  const resolutionNotes = clean(req.body?.resolutionNotes)
  const approvedAmountRaw = parseNonNegativeMoney(req.body?.approvedAmount)
  const rawRefundProof = req.body?.refundProofImage ?? req.body?.proofImage
  const refundProofImage = rawRefundProof ? await persistIssuePhotoSource(rawRefundProof, req) : ""

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    res.status(400)
    throw new Error("Invalid booking ID")
  }
  const validActions = ["approved", "working", "in_progress", "fixed", "resolved", "completed", "rejected"]
  if (!validActions.includes(action)) {
    res.status(400)
    throw new Error("Invalid action. Must be 'approved', 'working', 'fixed', 'resolved', or 'rejected'.")
  }

  const techId = req.user._id
  const booking = await Booking.findById(id)
    .populate("shopService", "name technicianIds")
    .populate("shopOwner", "shopName fullName")

  if (!booking) {
    res.status(404)
    throw new Error("Booking not found")
  }

  const svc = booking.shopService && typeof booking.shopService === "object" ? booking.shopService : null
  const ids = Array.isArray(svc?.technicianIds) ? svc.technicianIds : []
  const allowed =
    (booking.assignedTechnician && String(booking.assignedTechnician) === String(techId)) ||
    ids.some((x) => String(x) === String(techId))
  if (!allowed) {
    res.status(403)
    throw new Error("You are not assigned to this booking.")
  }

  if (!booking.warrantyClaim || !booking.warrantyClaim.status || booking.warrantyClaim.status === "none") {
    res.status(400)
    throw new Error("This booking does not have an active warranty claim.")
  }

  if (action === "rejected") {
    if (!rejectionReason || rejectionReason.length < 5) {
      res.status(400)
      throw new Error("Please provide a reason for rejecting the warranty claim (at least 5 characters).")
    }
    booking.warrantyClaim.status = "rejected"
    booking.warrantyClaim.rejectionReason = rejectionReason
    booking.warrantyClaim.resolvedAt = new Date()
  } else if (action === "working" || action === "in_progress") {
    booking.warrantyClaim.status = "working"
    booking.warrantyClaim.startedAt = new Date()
    if (resolutionNotes) booking.warrantyClaim.resolutionNotes = resolutionNotes

    const rawStartPhotos = Array.isArray(req.body?.startJobProofPhotos)
      ? req.body.startJobProofPhotos
      : Array.isArray(req.body?.proofPhotos)
        ? req.body.proofPhotos
        : []
    if (rawStartPhotos.length > 0) {
      const persisted = []
      for (const p of rawStartPhotos) {
        if (p && typeof p === "string") {
          persisted.push(await persistIssuePhotoSource(p, req))
        }
      }
      if (persisted.length > 0) {
        booking.startJobProofPhotos = persisted
      }
    }
  } else if (action === "fixed") {
    booking.warrantyClaim.status = "fixed"
    booking.warrantyClaim.fixedAt = new Date()
    if (resolutionNotes) booking.warrantyClaim.resolutionNotes = resolutionNotes
  } else if (action === "resolved" || action === "completed") {
    booking.warrantyClaim.status = "resolved"
    booking.warrantyClaim.resolvedAt = new Date()
    if (resolutionNotes) booking.warrantyClaim.resolutionNotes = resolutionNotes
    if (refundProofImage) booking.warrantyClaim.refundProofImage = refundProofImage

    const rawCompPhotos = Array.isArray(req.body?.completionProofPhotos)
      ? req.body.completionProofPhotos
      : Array.isArray(req.body?.proofPhotos)
        ? req.body.proofPhotos
        : []
    if (rawCompPhotos.length > 0) {
      const persisted = []
      for (const p of rawCompPhotos) {
        if (p && typeof p === "string") {
          persisted.push(await persistIssuePhotoSource(p, req))
        }
      }
      if (persisted.length > 0) {
        booking.completionProofPhotos = persisted
      }
    }
  } else {
    const totalPaid =
      (Number(booking.serviceFeeLaborRateAtCalc) || 0) + (Number(booking.serviceFeeMaterialsAmount) || 0)
    const approvedAmount =
      approvedAmountRaw != null
        ? Math.min(approvedAmountRaw, totalPaid)
        : booking.warrantyClaim.requestedAmount || 0

    booking.warrantyClaim.status = "approved"
    booking.warrantyClaim.approvedAt = new Date()
    booking.warrantyClaim.approvedAmount = approvedAmount
    if (refundProofImage) {
      booking.warrantyClaim.refundProofImage = refundProofImage
    }
    if (resolutionNotes) {
      booking.warrantyClaim.resolutionNotes = resolutionNotes
    }
  }

  await booking.save()

  try {
    const tech = await User.findById(techId).select("fullName").lean()
    const techName = tech?.fullName?.trim() || "Technician"
    const text = formatWarrantyClaimResponseToCustomer({
      booking,
      action,
      approvedAmount: booking.warrantyClaim.approvedAmount,
      rejectionReason,
      resolutionNotes,
      shopName: techName,
    })
    const attachments = refundProofImage ? buildPaymentProofAttachments(refundProofImage) : []
    await sendDirectMessage({
      fromUserId: techId,
      toUserId: booking.customer,
      content: text,
      attachments,
    })
  } catch (err) {
    console.error("Warranty claim notification error:", err?.message || err)
  }

  const populated = await Booking.findById(booking._id)
    .populate("customer", "fullName email phoneCode phoneNumber")
    .populate("shopService", "name category subcategory location status startingPrice")
    .populate("shopOwner", "fullName shopName warrantySettings")
    .lean()

  return res.json({
    message: action === "rejected" ? "Warranty claim rejected." : "Warranty claim processed.",
    booking: mapBookingForTechnician(populated),
  })
})

/**
 * POST /api/shop/bookings/walkin or /api/mechanic/bookings/walkin
 * Record a walk-in customer booking directly by shop owner or on-call mechanic/technician.
 */
export const createWalkInBooking = asyncHandler(async (req, res) => {
  const shopServiceId = clean(req.body?.shopServiceId)
  const contactName = clean(req.body?.contactName)
  const contactPhone = clean(req.body?.contactPhone)
  const preferredDateRaw = req.body?.preferredDate
  const preferredTime = clean(req.body?.preferredTime) || new Date().toTimeString().slice(0, 5)
  const serviceMode = clean(req.body?.serviceMode) || "in-shop"
  const serviceAddress = clean(req.body?.serviceAddress)
  const problemDescription = clean(req.body?.problemDescription)
  const notes = clean(req.body?.notes)
  const assignedTechnicianId = clean(req.body?.assignedTechnician)
  const initialStatus = clean(req.body?.status) || "confirmed"

  if (!shopServiceId || !mongoose.Types.ObjectId.isValid(shopServiceId)) {
    res.status(400)
    throw new Error("Invalid service selected.")
  }
  if (!contactName) {
    res.status(400)
    throw new Error("Please enter the customer's name.")
  }
  if (!contactPhone) {
    res.status(400)
    throw new Error("Please enter a contact number.")
  }
  if (!problemDescription) {
    res.status(400)
    throw new Error("Please enter a service or problem description.")
  }

  const svc = await ShopService.findById(shopServiceId)
  if (!svc) {
    res.status(404)
    throw new Error("Service not found.")
  }

  const isOwner = String(svc.shopOwner) === String(req.user._id)
  const isAssignedTech =
    Array.isArray(svc.technicianIds) &&
    svc.technicianIds.some((id) => String(id) === String(req.user._id))
  if (
    !isOwner &&
    !isAssignedTech &&
    req.user.role !== "shopowner" &&
    req.user.role !== "oncall-mechanic-technician"
  ) {
    res.status(403)
    throw new Error("You are not authorized to record walk-in customers for this service.")
  }

  let preferredDate = new Date()
  if (preferredDateRaw) {
    const parsed = parsePreferredDate(preferredDateRaw)
    if (parsed) preferredDate = parsed
  }

  const validStatuses = ["pending", "confirmed", "working"]
  const statusToSet = validStatuses.includes(initialStatus) ? initialStatus : "confirmed"

  let techInfo = null
  if (assignedTechnicianId) {
    techInfo = await resolveBookingTechnician(svc.shopOwner, assignedTechnicianId)
  } else if (req.user.role === "oncall-mechanic-technician") {
    techInfo = {
      id: req.user._id,
      name: req.user.fullName || "Provider",
      jobTitle: req.user.shopJobTitle || "On-call Mechanic/Technician",
      phone: [req.user.phoneCode, req.user.phoneNumber].filter(Boolean).join(" ").trim(),
      model: "User",
    }
  }

  const doc = await Booking.create({
    isWalkIn: true,
    customer: null,
    shopOwner: svc.shopOwner,
    shopService: svc._id,
    contactName,
    contactPhone,
    preferredDate,
    preferredTime,
    serviceMode: serviceMode === "home" ? "home" : "in-shop",
    serviceAddress: serviceMode === "home" ? serviceAddress : "",
    problemDescription,
    notes,
    status: statusToSet,
    assignedTechnician: techInfo ? techInfo.id : null,
    assignedTechnicianName: techInfo ? techInfo.name : "",
    assignedTechnicianJobTitle: techInfo ? techInfo.jobTitle : "",
    assignedTechnicianPhone: techInfo ? techInfo.phone : "",
    assignedTechnicianModel: techInfo ? techInfo.model : "none",
  })

  // Increment bookingsCount on ShopService
  await ShopService.findByIdAndUpdate(svc._id, { $inc: { bookingsCount: 1 } })

  const populated = await Booking.findById(doc._id)
    .populate("shopService", "name category subcategory location status startingPrice")
    .populate("shopOwner", "fullName shopName warrantySettings")
    .lean()

  const mapped =
    req.user.role === "oncall-mechanic-technician"
      ? mapBookingForTechnician(populated)
      : mapBookingForShopOwner(populated)

  return res.status(201).json({
    message: "Walk-in customer recorded successfully.",
    booking: mapped,
  })
})


