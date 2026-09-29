import asyncHandler from "express-async-handler"
import mongoose from "mongoose"
import { User } from "../models/userModel.js"
import { ShopEmployee } from "../models/shopEmployeeModel.js"
import { ShopService } from "../models/shopServiceModel.js"
import { formatReadableShopAddress } from "../utils/psgcResolve.js"
import { isServiceProviderRole } from "../utils/serviceProviderRoles.js"

const shopOwnerSelect =
  "fullName shopName profileImage selfieImage shopRegion shopProvince shopCityMunicipality shopBarangay shopDetailedAddress shopLandmark shopPlacePhoto accountApprovalStatus role operatingHours daysOfOperation repairServicesOffered businessType yearsOfOperation numberOfEmployees shopDescription laborRatingMin laborRatingMax warrantySettings createdAt"

function normalizeBuffer(raw) {
  if (!raw) return null
  if (Buffer.isBuffer(raw)) return raw
  if (raw?.type === "Buffer" && Array.isArray(raw.data)) return Buffer.from(raw.data)
  try {
    return Buffer.from(raw)
  } catch {
    return null
  }
}

function bufferToDataUrl(raw, contentType) {
  const buf = normalizeBuffer(raw)
  if (!buf) return ""
  const ct = contentType || "application/octet-stream"
  return `data:${ct};base64,${buf.toString("base64")}`
}

function isApprovedShopOwner(u) {
  if (!u || !isServiceProviderRole(u.role)) return false
  const st = u.accountApprovalStatus
  return st === "approved" || st === undefined || st === null
}

/** Sync fallback for search blob when PSGC resolve not yet run (codes still searchable). */
function formatShopAddressRaw(owner) {
  if (!owner) return "—"
  const parts = [owner.shopBarangay, owner.shopCityMunicipality, owner.shopProvince].filter(Boolean)
  const line = parts.join(", ")
  const detail = typeof owner.shopDetailedAddress === "string" ? owner.shopDetailedAddress.trim() : ""
  if (detail && line) return `${detail}, ${line}`
  return detail || line || "—"
}

async function getShopStaffSummary(owner) {
  if (!owner?._id) return { staffCount: 0, staffNames: [] }
  if (owner.role === "oncall-mechanic-technician") {
    const name = (owner.fullName && String(owner.fullName).trim()) || (owner.shopName && String(owner.shopName).trim()) || "On-call Specialist"
    return { staffCount: 1, staffNames: [name] }
  }

  const oid = owner._id instanceof mongoose.Types.ObjectId ? owner._id : new mongoose.Types.ObjectId(owner._id)
  const [emps, users] = await Promise.all([
    ShopEmployee.find({ shopOwner: oid, status: { $ne: "inactive" } }).select("name").lean(),
    User.find({
      employedByShopOwner: oid,
      role: "mechanic-technician",
      accountApprovalStatus: { $ne: "rejected" },
    })
      .select("fullName")
      .lean(),
  ])

  const staffNames = [
    ...emps.map((e) => (e.name && String(e.name).trim())).filter(Boolean),
    ...users.map((u) => (u.fullName && String(u.fullName).trim())).filter(Boolean),
  ]

  const uniqueNames = [...new Set(staffNames)]
  return {
    staffCount: uniqueNames.length,
    staffNames: uniqueNames,
  }
}

function mapServiceToCustomerDto(svc, owner, shopAddressReadable, shopStaffInfo) {
  const ownerDoc = owner && typeof owner === "object" ? owner : null
  const staffNames = shopStaffInfo?.staffNames || []
  const staffCount = shopStaffInfo?.staffCount ?? staffNames.length

  return {
    id: String(svc._id),
    serviceName: svc.name || "",
    category: svc.category || "",
    subcategory: typeof svc.subcategory === "string" ? svc.subcategory.trim() : "",
    type: svc.location,
    priceFrom:
      svc.startingPrice != null && Number.isFinite(Number(svc.startingPrice)) && Number(svc.startingPrice) > 0
        ? Number(svc.startingPrice)
        : 0,
    shopName: ownerDoc?.shopName?.trim() || ownerDoc?.fullName?.trim() || "—",
    shopOwner: ownerDoc?.fullName?.trim() || "—",
    shopOwnerRole: ownerDoc?.role ? String(ownerDoc.role) : "",
    shopAddress: shopAddressReadable || "—",
    shopRegion: ownerDoc?.shopRegion != null ? String(ownerDoc.shopRegion).trim() : "",
    shopProvince: ownerDoc?.shopProvince != null ? String(ownerDoc.shopProvince).trim() : "",
    shopCityMunicipality:
      ownerDoc?.shopCityMunicipality != null ? String(ownerDoc.shopCityMunicipality).trim() : "",
    shopBarangay: ownerDoc?.shopBarangay != null ? String(ownerDoc.shopBarangay).trim() : "",
    shopDetailedAddress:
      typeof ownerDoc?.shopDetailedAddress === "string" ? ownerDoc.shopDetailedAddress.trim() : "",
    shopLandmark: typeof ownerDoc?.shopLandmark === "string" ? ownerDoc.shopLandmark.trim() : "",
    shopPlacePhoto:
      typeof ownerDoc?.shopPlacePhoto === "string" ? ownerDoc.shopPlacePhoto.trim() : "",
    shopOwnerProfileImage:
      typeof ownerDoc?.profileImage === "string" ? ownerDoc.profileImage.trim() : "",
    shopOwnerSelfieImage:
      ownerDoc?.selfieImage?.data != null
        ? bufferToDataUrl(ownerDoc.selfieImage.data, ownerDoc.selfieImage.contentType)
        : "",
    shopRating: Math.min(5, Math.max(0, Number(svc.ratingAvg) || 0)),
    completedJobs: Math.max(0, Number(svc.bookingsCount) || 0),
    description: svc.description || "",
    requirements: typeof svc.requirements === "string" ? svc.requirements.trim() : "",
    staff: staffNames,
    shopStaffCount: staffCount,
    shopOwnerId: ownerDoc?._id != null ? String(ownerDoc._id) : "",
    shopOperatingHours:
      typeof ownerDoc?.operatingHours === "string" ? ownerDoc.operatingHours.trim() : "",
    daysOfOperation: Array.isArray(ownerDoc?.daysOfOperation) ? ownerDoc.daysOfOperation : [],
    businessType: ownerDoc?.businessType || "",
    repairServicesOffered: Array.isArray(ownerDoc?.repairServicesOffered) ? ownerDoc.repairServicesOffered : [],
    yearsOfOperation: ownerDoc?.yearsOfOperation != null && Number.isFinite(Number(ownerDoc.yearsOfOperation)) ? Number(ownerDoc.yearsOfOperation) : null,
    numberOfEmployees: ownerDoc?.numberOfEmployees != null && Number.isFinite(Number(ownerDoc.numberOfEmployees)) ? Number(ownerDoc.numberOfEmployees) : null,
    shopDescription: typeof ownerDoc?.shopDescription === "string" ? ownerDoc.shopDescription.trim() : "",
    warrantySettings: ownerDoc?.warrantySettings || null,
    laborRatingMin: (() => {
      if (svc.laborRatingMin != null && Number.isFinite(Number(svc.laborRatingMin))) {
        return Number(svc.laborRatingMin)
      }
      return ownerDoc?.laborRatingMin != null && Number.isFinite(Number(ownerDoc.laborRatingMin))
        ? Number(ownerDoc.laborRatingMin)
        : null
    })(),
    laborRatingMax: (() => {
      if (svc.laborRatingMax != null && Number.isFinite(Number(svc.laborRatingMax))) {
        return Number(svc.laborRatingMax)
      }
      return ownerDoc?.laborRatingMax != null && Number.isFinite(Number(ownerDoc.laborRatingMax))
        ? Number(ownerDoc.laborRatingMax)
        : null
    })(),
    shopOwnerJoinedAt: (() => {
      const c = ownerDoc?.createdAt
      if (c == null) return null
      try {
        const d = c instanceof Date ? c : new Date(c)
        return Number.isNaN(d.getTime()) ? null : d.toISOString()
      } catch {
        return null
      }
    })(),
  }
}

async function enrichServicesForOwner(services, owner, shopAddressReadable) {
  if (!owner?._id) return []
  const shopStaffInfo = await getShopStaffSummary(owner)
  return services.map((s) => mapServiceToCustomerDto(s, owner, shopAddressReadable, shopStaffInfo))
}

/**
 * GET /api/catalog/shop-services
 * Query: category, type (location), q (search)
 */
export const listCatalogShopServices = asyncHandler(async (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category.trim() : ""
  const type = typeof req.query.type === "string" ? req.query.type.trim() : ""
  const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : ""

  const filter = { status: "active" }
  if (category) filter.category = category
  if (type && ["home", "in-shop", "both"].includes(type)) filter.location = type

  const raw = await ShopService.find(filter).sort({ bookingsCount: -1, createdAt: -1 }).populate("shopOwner", shopOwnerSelect).lean()

  const rows = raw.filter((s) => s.shopOwner && isApprovedShopOwner(s.shopOwner))

  const ownerKey = (o) => String(o._id)
  const uniqueOwners = [...new Map(rows.map((s) => [ownerKey(s.shopOwner), s.shopOwner])).values()]
  const addressByOwner = new Map()
  await Promise.all(
    uniqueOwners.map(async (owner) => {
      addressByOwner.set(ownerKey(owner), await formatReadableShopAddress(owner))
    }),
  )

  const filtered = !q
    ? rows
    : rows.filter((s) => {
        const owner = s.shopOwner
        const readableAddr = addressByOwner.get(ownerKey(owner)) || ""
        const blob = [
          s.name,
          s.description,
          s.category,
          s.subcategory,
          owner?.shopName,
          owner?.fullName,
          readableAddr,
          formatShopAddressRaw(owner),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
        return blob.includes(q)
      })

  const byOwner = new Map()
  for (const s of filtered) {
    const oid = String(s.shopOwner._id)
    if (!byOwner.has(oid)) byOwner.set(oid, { owner: s.shopOwner, list: [] })
    byOwner.get(oid).list.push(s)
  }

  const chunks = await Promise.all(
    [...byOwner.values()].map(({ owner, list }) =>
      enrichServicesForOwner(list, owner, addressByOwner.get(ownerKey(owner)) || "—"),
    ),
  )
  const out = chunks.flat()

  out.sort((a, b) => {
    if (b.shopRating !== a.shopRating) return b.shopRating - a.shopRating
    if (b.completedJobs !== a.completedJobs) return b.completedJobs - a.completedJobs
    return a.serviceName.localeCompare(b.serviceName)
  })

  return res.json(out)
})

/**
 * GET /api/catalog/shop-services/context/:serviceId
 * All active services from the same shop as the given service (for shop detail page).
 */
export const getCatalogShopContextByServiceId = asyncHandler(async (req, res) => {
  const { serviceId } = req.params
  if (!mongoose.Types.ObjectId.isValid(serviceId)) {
    res.status(400)
    throw new Error("Invalid service id")
  }

  const anchor = await ShopService.findOne({ _id: serviceId, status: "active" })
    .populate("shopOwner", shopOwnerSelect)
    .lean()

  if (!anchor || !anchor.shopOwner || !isApprovedShopOwner(anchor.shopOwner)) {
    res.status(404)
    throw new Error("Service not found")
  }

  const ownerId = anchor.shopOwner._id
  const all = await ShopService.find({ shopOwner: ownerId, status: "active" })
    .sort({ bookingsCount: -1, createdAt: -1 })
    .lean()

  const readableAddress = await formatReadableShopAddress(anchor.shopOwner)
  const services = await enrichServicesForOwner(all, anchor.shopOwner, readableAddress)
  const activeCount = services.length
  const totalCompletedBookings = services.reduce((acc, s) => acc + Math.max(0, Number(s.completedJobs) || 0), 0)
  const rated = services.filter((s) => Number(s.shopRating) > 0)
  const shopAverageRating =
    rated.length > 0 ? Math.round((rated.reduce((a, s) => a + Number(s.shopRating), 0) / rated.length) * 10) / 10 : 0
  return res.json({
    focusServiceId: String(anchor._id),
    services,
    shopContext: {
      activeServiceCount: activeCount,
      totalCompletedBookings,
      shopAverageRating,
    },
  })
})
