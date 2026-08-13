import mongoose from "mongoose"
import { User } from "../models/userModel.js"
import { ShopService } from "../models/shopServiceModel.js"
import { ShopEmployee } from "../models/shopEmployeeModel.js"
import { Booking } from "../models/bookingModel.js"
import { isServiceProviderRole } from "../utils/serviceProviderRoles.js"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function isApprovedProvider(u) {
  if (!u || !isServiceProviderRole(u.role)) return false
  const st = u.accountApprovalStatus
  return st === "approved" || st === undefined || st === null
}

function formatAddress(owner) {
  if (!owner) return "—"
  const parts = [
    owner.shopBarangay,
    owner.shopCityMunicipality,
    owner.shopProvince,
    owner.shopRegion,
  ].filter(Boolean)
  const line = parts.join(", ")
  const detail =
    typeof owner.shopDetailedAddress === "string"
      ? owner.shopDetailedAddress.trim()
      : ""
  if (detail && line) return `${detail}, ${line}`
  return detail || line || "—"
}

function formatPrice(val) {
  if (val == null || !Number.isFinite(Number(val)) || Number(val) <= 0)
    return "Price on request"
  return `₱${Number(val).toLocaleString()}`
}

const PROVIDER_SELECT =
  "fullName shopName role shopRegion shopProvince shopCityMunicipality shopBarangay shopDetailedAddress shopLandmark operatingHours daysOfOperation repairServicesOffered serviceType yearsOfOperation numberOfEmployees laborRatingMin laborRatingMax providerRatingAvg providerRatingCount shopDescription accountApprovalStatus"

/* ------------------------------------------------------------------ */
/*  Tool: searchServices                                               */
/* ------------------------------------------------------------------ */

export async function searchServices({ keyword, category, location }) {
  const filter = { status: "active" }
  if (category) filter.category = { $regex: category, $options: "i" }
  if (location && ["home", "in-shop", "both"].includes(location))
    filter.location = location

  let services = await ShopService.find(filter)
    .sort({ bookingsCount: -1, ratingAvg: -1 })
    .limit(20)
    .populate("shopOwner", PROVIDER_SELECT)
    .lean()

  services = services.filter((s) => s.shopOwner && isApprovedProvider(s.shopOwner))

  if (keyword) {
    const kw = keyword.toLowerCase()
    services = services.filter((s) => {
      const blob = [
        s.name,
        s.description,
        s.category,
        s.subcategory,
        s.shopOwner?.shopName,
        s.shopOwner?.fullName,
        ...(s.shopOwner?.repairServicesOffered || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return blob.includes(kw)
    })
  }

  return services.slice(0, 10).map((s) => ({
    serviceId: String(s._id),
    serviceName: s.name,
    category: s.category,
    subcategory: s.subcategory || "",
    description: s.description,
    serviceLocation: s.location,
    startingPrice: formatPrice(s.startingPrice),
    laborRateMin: s.laborRatingMin != null ? `₱${s.laborRatingMin}` : null,
    laborRateMax: s.laborRatingMax != null ? `₱${s.laborRatingMax}` : null,
    rating: s.ratingAvg || 0,
    completedJobs: s.bookingsCount || 0,
    shopName: s.shopOwner?.shopName || s.shopOwner?.fullName || "—",
    shopOwner: s.shopOwner?.fullName || "—",
    shopAddress: formatAddress(s.shopOwner),
    operatingHours: s.shopOwner?.operatingHours || "—",
    daysOfOperation: s.shopOwner?.daysOfOperation?.join(", ") || "—",
  }))
}

/* ------------------------------------------------------------------ */
/*  Tool: searchShops                                                  */
/* ------------------------------------------------------------------ */

export async function searchShops({ keyword, location }) {
  const filter = { accountApprovalStatus: "approved" }
  filter.$or = [
    { role: "shop-owner" },
    { role: "oncall-mechanic-technician" },
  ]

  let owners = await User.find(filter).select(PROVIDER_SELECT).lean()

  if (keyword) {
    const kw = keyword.toLowerCase()
    owners = owners.filter((o) => {
      const blob = [
        o.shopName,
        o.fullName,
        o.shopDescription,
        ...(o.repairServicesOffered || []),
        o.shopBarangay,
        o.shopCityMunicipality,
        o.shopProvince,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return blob.includes(kw)
    })
  }

  if (location) {
    const loc = location.toLowerCase()
    owners = owners.filter((o) => {
      const addr = [o.shopBarangay, o.shopCityMunicipality, o.shopProvince, o.shopRegion]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return addr.includes(loc)
    })
  }

  // For each owner, count their active services
  const ownerIds = owners.slice(0, 10).map((o) => o._id)
  const serviceCounts = await ShopService.aggregate([
    { $match: { shopOwner: { $in: ownerIds }, status: "active" } },
    { $group: { _id: "$shopOwner", count: { $sum: 1 } } },
  ])
  const countMap = new Map(serviceCounts.map((r) => [String(r._id), r.count]))

  return owners.slice(0, 10).map((o) => ({
    shopOwnerId: String(o._id),
    shopName: o.shopName || o.fullName || "—",
    ownerName: o.fullName || "—",
    role: o.role,
    address: formatAddress(o),
    servicesOffered: (o.repairServicesOffered || []).join(", ") || "—",
    serviceType: o.serviceType || "—",
    operatingHours: o.operatingHours || "—",
    daysOfOperation: (o.daysOfOperation || []).join(", ") || "—",
    yearsOfOperation: o.yearsOfOperation || "—",
    rating: o.providerRatingAvg || 0,
    reviewCount: o.providerRatingCount || 0,
    activeServiceListings: countMap.get(String(o._id)) || 0,
    description: o.shopDescription || "",
  }))
}

/* ------------------------------------------------------------------ */
/*  Tool: getServiceDetails                                            */
/* ------------------------------------------------------------------ */

export async function getServiceDetails({ serviceId }) {
  if (!mongoose.Types.ObjectId.isValid(serviceId)) return { error: "Invalid service ID" }

  const svc = await ShopService.findById(serviceId)
    .populate("shopOwner", PROVIDER_SELECT)
    .lean()

  if (!svc || !svc.shopOwner || !isApprovedProvider(svc.shopOwner))
    return { error: "Service not found" }

  // Resolve technician names
  const techNames = []
  if (svc.technicianIds?.length) {
    const oid = svc.shopOwner._id
    const ids = svc.technicianIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id))

    const [emps, users] = await Promise.all([
      ShopEmployee.find({ _id: { $in: ids }, shopOwner: oid }).select("name").lean(),
      User.find({ _id: { $in: ids }, role: "mechanic-technician", employedByShopOwner: oid })
        .select("fullName")
        .lean(),
    ])
    for (const e of emps) techNames.push(e.name || "Staff")
    for (const u of users) techNames.push(u.fullName || "Mechanic")
  }

  return {
    serviceId: String(svc._id),
    serviceName: svc.name,
    category: svc.category,
    subcategory: svc.subcategory || "",
    description: svc.description,
    requirements: svc.requirements || "",
    serviceLocation: svc.location,
    startingPrice: formatPrice(svc.startingPrice),
    laborRateMin: svc.laborRatingMin != null ? `₱${svc.laborRatingMin}` : null,
    laborRateMax: svc.laborRatingMax != null ? `₱${svc.laborRatingMax}` : null,
    rating: svc.ratingAvg || 0,
    completedJobs: svc.bookingsCount || 0,
    technicians: techNames,
    shopName: svc.shopOwner?.shopName || svc.shopOwner?.fullName || "—",
    shopOwner: svc.shopOwner?.fullName || "—",
    shopAddress: formatAddress(svc.shopOwner),
    operatingHours: svc.shopOwner?.operatingHours || "—",
    daysOfOperation: svc.shopOwner?.daysOfOperation?.join(", ") || "—",
    shopDescription: svc.shopOwner?.shopDescription || "",
  }
}

/* ------------------------------------------------------------------ */
/*  Tool: getShopDetails                                               */
/* ------------------------------------------------------------------ */

export async function getShopDetails({ shopOwnerId }) {
  if (!mongoose.Types.ObjectId.isValid(shopOwnerId)) return { error: "Invalid shop ID" }

  const owner = await User.findById(shopOwnerId).select(PROVIDER_SELECT).lean()
  if (!owner || !isApprovedProvider(owner)) return { error: "Shop not found" }

  const services = await ShopService.find({ shopOwner: owner._id, status: "active" })
    .sort({ bookingsCount: -1 })
    .lean()

  return {
    shopOwnerId: String(owner._id),
    shopName: owner.shopName || owner.fullName || "—",
    ownerName: owner.fullName || "—",
    role: owner.role,
    address: formatAddress(owner),
    servicesOffered: (owner.repairServicesOffered || []).join(", ") || "—",
    serviceType: owner.serviceType || "—",
    operatingHours: owner.operatingHours || "—",
    daysOfOperation: (owner.daysOfOperation || []).join(", ") || "—",
    yearsOfOperation: owner.yearsOfOperation || "—",
    numberOfEmployees: owner.numberOfEmployees || 0,
    rating: owner.providerRatingAvg || 0,
    reviewCount: owner.providerRatingCount || 0,
    description: owner.shopDescription || "",
    services: services.map((s) => ({
      serviceId: String(s._id),
      name: s.name,
      category: s.category,
      description: s.description,
      location: s.location,
      startingPrice: formatPrice(s.startingPrice),
      rating: s.ratingAvg || 0,
      completedJobs: s.bookingsCount || 0,
    })),
  }
}

/* ------------------------------------------------------------------ */
/*  Tool: getUserBookings                                              */
/* ------------------------------------------------------------------ */

export async function getUserBookings({ userId, status }) {
  const filter = { customer: userId }
  if (status && ["pending", "confirmed", "working", "cancelled", "completed"].includes(status))
    filter.status = status

  const bookings = await Booking.find(filter)
    .sort({ createdAt: -1 })
    .limit(15)
    .populate("shopService", "name category")
    .populate("shopOwner", "fullName shopName")
    .lean()

  if (!bookings.length) return { message: "No bookings found.", bookings: [] }

  return {
    total: bookings.length,
    bookings: bookings.map((b) => ({
      bookingId: String(b._id),
      serviceName: b.shopService?.name || "—",
      serviceCategory: b.shopService?.category || "—",
      shopName: b.shopOwner?.shopName || b.shopOwner?.fullName || "—",
      status: b.status,
      preferredDate: b.preferredDate
        ? new Date(b.preferredDate).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "—",
      preferredTime: b.preferredTime || "—",
      serviceMode: b.serviceMode,
      problemDescription: b.problemDescription || "",
      paymentStatus: b.paymentStatus || "unpaid",
      createdAt: b.createdAt
        ? new Date(b.createdAt).toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "—",
    })),
  }
}

/* ------------------------------------------------------------------ */
/*  Tool: getBookingDetails                                            */
/* ------------------------------------------------------------------ */

export async function getBookingDetails({ userId, bookingId }) {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) return { error: "Invalid booking ID" }

  const b = await Booking.findOne({ _id: bookingId, customer: userId })
    .populate("shopService", "name category description location startingPrice")
    .populate("shopOwner", "fullName shopName operatingHours")
    .lean()

  if (!b) return { error: "Booking not found or does not belong to you." }

  return {
    bookingId: String(b._id),
    serviceName: b.shopService?.name || "—",
    serviceCategory: b.shopService?.category || "—",
    serviceDescription: b.shopService?.description || "",
    shopName: b.shopOwner?.shopName || b.shopOwner?.fullName || "—",
    status: b.status,
    preferredDate: b.preferredDate
      ? new Date(b.preferredDate).toLocaleDateString("en-PH", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "—",
    preferredTime: b.preferredTime || "—",
    serviceMode: b.serviceMode,
    serviceAddress: b.serviceAddress || "",
    problemDescription: b.problemDescription || "",
    notes: b.notes || "",
    paymentStatus: b.paymentStatus || "unpaid",
    laborRate:
      b.serviceFeeLaborRateAtCalc != null
        ? `₱${b.serviceFeeLaborRateAtCalc}`
        : null,
    materialsAmount:
      b.serviceFeeMaterialsAmount != null
        ? `₱${b.serviceFeeMaterialsAmount}`
        : null,
    materialsDescription: b.serviceFeeMaterialsDescription || "",
    rejectionReason: b.rejectionReason || "",
    createdAt: b.createdAt
      ? new Date(b.createdAt).toLocaleDateString("en-PH", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—",
  }
}

/* ------------------------------------------------------------------ */
/*  Gemini Tool Definitions (function calling schema)                  */
/* ------------------------------------------------------------------ */

export const toolDefinitions = [
  {
    functionDeclarations: [
      {
        name: "searchServices",
        description:
          "Search for repair/service listings on E-Paayos. Use when the user asks about available services, repair services, prices, or service categories.",
        parameters: {
          type: "OBJECT",
          properties: {
            keyword: {
              type: "STRING",
              description:
                "Search keyword such as 'laptop repair', 'aircon cleaning', 'washing machine', etc.",
            },
            category: {
              type: "STRING",
              description: "Service category filter (e.g. 'Electronics', 'Appliances').",
            },
            location: {
              type: "STRING",
              description: "Filter by service location type: 'home', 'in-shop', or 'both'.",
            },
          },
        },
      },
      {
        name: "searchShops",
        description:
          "Search for repair shops or service providers on E-Paayos. Use when the user asks about shops, service providers, or shop locations.",
        parameters: {
          type: "OBJECT",
          properties: {
            keyword: {
              type: "STRING",
              description:
                "Search keyword for shop name, services offered, or owner name.",
            },
            location: {
              type: "STRING",
              description:
                "Location filter — city, province, barangay, or region name.",
            },
          },
        },
      },
      {
        name: "getServiceDetails",
        description:
          "Get detailed information about a specific service listing by its ID. Use when the user wants more details about a particular service.",
        parameters: {
          type: "OBJECT",
          properties: {
            serviceId: {
              type: "STRING",
              description: "The service listing ID.",
            },
          },
          required: ["serviceId"],
        },
      },
      {
        name: "getShopDetails",
        description:
          "Get detailed information about a specific shop/service provider including all their services. Use when the user wants details about a specific shop.",
        parameters: {
          type: "OBJECT",
          properties: {
            shopOwnerId: {
              type: "STRING",
              description: "The shop owner's user ID.",
            },
          },
          required: ["shopOwnerId"],
        },
      },
      {
        name: "getUserBookings",
        description:
          "Get the current authenticated user's bookings/repair requests. Use when the user asks about their bookings, repair requests, or order status.",
        parameters: {
          type: "OBJECT",
          properties: {
            status: {
              type: "STRING",
              description:
                "Optional status filter: 'pending', 'confirmed', 'working', 'cancelled', or 'completed'. Omit to get all bookings.",
            },
          },
        },
      },
      {
        name: "getBookingDetails",
        description:
          "Get detailed information about a specific booking by its ID. Use when the user asks about a particular booking's details.",
        parameters: {
          type: "OBJECT",
          properties: {
            bookingId: {
              type: "STRING",
              description: "The booking ID.",
            },
          },
          required: ["bookingId"],
        },
      },
    ],
  },
]

