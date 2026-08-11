import asyncHandler from "express-async-handler"
import mongoose from "mongoose"
import { User } from "../models/userModel.js"
import { ShopEmployee } from "../models/shopEmployeeModel.js"
import { ShopService } from "../models/shopServiceModel.js"

const LOCATION_ENUM = ["home", "in-shop", "both"]
const STATUS_ENUM = ["active", "inactive"]

const clean = (v) => (typeof v === "string" ? v.trim() : v)

function parseStartingPrice(raw) {
  if (raw === undefined || raw === null || raw === "") return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/** Returns { ok: true, min, max } or { ok: false, message } — both amounts required when present. */
function parseLaborRatings(minRaw, maxRaw) {
  if (minRaw === undefined || minRaw === null || String(minRaw).trim() === "" || maxRaw === undefined || maxRaw === null || String(maxRaw).trim() === "") {
    return { ok: false, message: "Labor price minimum and maximum are required." }
  }
  const min = Number(minRaw)
  const max = Number(maxRaw)
  if (!Number.isFinite(min) || min < 0 || !Number.isFinite(max) || max < 0) {
    return { ok: false, message: "Labor price range must use valid amounts." }
  }
  if (min > max) {
    return { ok: false, message: "Maximum labor price must be greater than or equal to minimum." }
  }
  return { ok: true, min, max }
}

async function resolveTechnicianIds(shopOwnerId, rawIds, providerRole) {
  const arr = Array.isArray(rawIds) ? rawIds : []
  const strings = arr.map((x) => String(x)).filter(Boolean)
  if (!strings.length) return []
  const objectIds = strings.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id))
  if (!objectIds.length) return []

  const [empDocs, userDocs] = await Promise.all([
    ShopEmployee.find({ _id: { $in: objectIds }, shopOwner: shopOwnerId }).select("_id").lean(),
    User.find({
      _id: { $in: objectIds },
      role: "mechanic-technician",
      employedByShopOwner: shopOwnerId,
    })
      .select("_id")
      .lean(),
  ])

  const allowed = new Set([
    ...empDocs.map((d) => String(d._id)),
    ...userDocs.map((d) => String(d._id)),
  ])
  const selfId = String(shopOwnerId)
  if ((providerRole === "oncall-mechanic-technician" || providerRole === "independent-mechanic-technician") && strings.includes(selfId)) {
    allowed.add(selfId)
  }

  const seen = new Set()
  const ordered = []
  for (const s of strings) {
    if (!allowed.has(s) || seen.has(s)) continue
    seen.add(s)
    ordered.push(new mongoose.Types.ObjectId(s))
  }
  return ordered
}

export const getShopEmployees = asyncHandler(async (req, res) => {
  const list = await ShopEmployee.find({ shopOwner: req.user._id })
    .sort({ name: 1 })
    .lean()
  return res.json(list)
})

/** Mechanics / technicians who registered under this shop owner (User.employedByShopOwner). */
export const getRegisteredMechanics = asyncHandler(async (req, res) => {
  const list = await User.find({
    role: "mechanic-technician",
    employedByShopOwner: req.user._id,
  })
    .select(
      "fullName email phoneCode phoneNumber shopJobTitle shopManagedStatus courseProgram technicalSkillsNoFormalTraining skillsSelfAssessment createdAt"
    )
    .sort({ createdAt: -1 })
    .lean()

  return res.json(
    list.map((u) => ({
      _id: String(u._id),
      fullName: u.fullName || "",
      email: u.email || "",
      phoneCode: u.phoneCode || "+63",
      phoneNumber: u.phoneNumber || "",
      shopJobTitle: u.shopJobTitle || "",
      shopManagedStatus: u.shopManagedStatus || "active",
      courseProgram: u.courseProgram || "",
      technicalSkillsNoFormalTraining: Array.isArray(u.technicalSkillsNoFormalTraining)
        ? u.technicalSkillsNoFormalTraining
        : [],
      skillsSelfAssessment: Array.isArray(u.skillsSelfAssessment) ? u.skillsSelfAssessment : [],
      createdAt: u.createdAt,
    }))
  )
})

const SHOP_MANAGED_STATUS = ["active", "on-leave", "inactive"]

export const patchRegisteredMechanic = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400)
    throw new Error("Invalid mechanic id")
  }

  const mech = await User.findOne({
    _id: id,
    role: "mechanic-technician",
    employedByShopOwner: req.user._id,
  })

  if (!mech) {
    res.status(404)
    throw new Error("Mechanic not found for this shop")
  }

  const body = req.body || {}

  if (body.shopJobTitle !== undefined) {
    const t = clean(body.shopJobTitle)
    mech.shopJobTitle = t.length > 120 ? t.slice(0, 120) : t
  }

  if (body.shopManagedStatus !== undefined) {
    const s = clean(body.shopManagedStatus)
    if (!SHOP_MANAGED_STATUS.includes(s)) {
      res.status(400)
      throw new Error("Invalid status")
    }
    mech.shopManagedStatus = s
  }

  await mech.save()
  return res.json({
    message: "Updated",
    _id: String(mech._id),
    shopJobTitle: mech.shopJobTitle || "",
    shopManagedStatus: mech.shopManagedStatus || "active",
  })
})

export const getShopServices = asyncHandler(async (req, res) => {
  const list = await ShopService.find({ shopOwner: req.user._id })
    .sort({ bookingsCount: -1, createdAt: -1 })
    .lean()
  return res.json(list)
})

export const createShopService = asyncHandler(async (req, res) => {
  const body = req.body || {}
  const name = clean(body.name)
  const description = clean(body.description)
  const category = clean(body.category)
  const location = clean(body.location)

  if (!name || !description || !category) {
    res.status(400)
    throw new Error("Name, category, and description are required")
  }
  if (!LOCATION_ENUM.includes(location)) {
    res.status(400)
    throw new Error("Invalid service location")
  }

  const subcategory = clean(body.subcategory) || ""
  const requirements = clean(body.requirements) || ""
  let status = clean(body.status) || "active"
  if (!STATUS_ENUM.includes(status)) status = "active"

  const technicianIds = await resolveTechnicianIds(req.user._id, body.technicianIds, req.user.role)
  const startingPrice = parseStartingPrice(body.startingPrice)
  const labor = parseLaborRatings(body.laborRatingMin, body.laborRatingMax)
  if (!labor.ok) {
    res.status(400)
    throw new Error(labor.message)
  }

  const doc = await ShopService.create({
    shopOwner: req.user._id,
    name,
    category,
    subcategory,
    description,
    location,
    requirements,
    status,
    technicianIds,
    startingPrice,
    laborRatingMin: labor.min,
    laborRatingMax: labor.max,
    bookingsCount: 0,
    ratingAvg: 0,
  })

  const created = await ShopService.findById(doc._id).lean()
  return res.status(201).json(created)
})

export const updateShopService = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400)
    throw new Error("Invalid service id")
  }

  const existing = await ShopService.findOne({ _id: id, shopOwner: req.user._id })
  if (!existing) {
    res.status(404)
    throw new Error("Service not found")
  }

  const body = req.body || {}
  const name = body.name !== undefined ? clean(body.name) : existing.name
  const description = body.description !== undefined ? clean(body.description) : existing.description
  const category = body.category !== undefined ? clean(body.category) : existing.category
  const subcategory = body.subcategory !== undefined ? clean(body.subcategory) : existing.subcategory
  const requirements = body.requirements !== undefined ? clean(body.requirements) : existing.requirements
  let location = body.location !== undefined ? clean(body.location) : existing.location
  let status = body.status !== undefined ? clean(body.status) : existing.status

  if (!name || !description || !category) {
    res.status(400)
    throw new Error("Name, category, and description are required")
  }
  if (!LOCATION_ENUM.includes(location)) {
    res.status(400)
    throw new Error("Invalid service location")
  }
  if (!STATUS_ENUM.includes(status)) {
    res.status(400)
    throw new Error("Invalid status")
  }

  const technicianIds =
    body.technicianIds !== undefined
      ? await resolveTechnicianIds(req.user._id, body.technicianIds, req.user.role)
      : existing.technicianIds

  if (body.startingPrice !== undefined) {
    existing.startingPrice = parseStartingPrice(body.startingPrice)
  }

  const laborProvided = Object.prototype.hasOwnProperty.call(body, "laborRatingMin") || Object.prototype.hasOwnProperty.call(body, "laborRatingMax")
  if (laborProvided) {
    const labor = parseLaborRatings(body.laborRatingMin, body.laborRatingMax)
    if (!labor.ok) {
      res.status(400)
      throw new Error(labor.message)
    }
    existing.laborRatingMin = labor.min
    existing.laborRatingMax = labor.max
  }

  existing.name = name
  existing.category = category
  existing.subcategory = subcategory || ""
  existing.description = description
  existing.location = location
  existing.requirements = requirements || ""
  existing.status = status
  existing.technicianIds = technicianIds

  await existing.save()
  const updated = await ShopService.findById(existing._id).lean()
  return res.json(updated)
})

export const deleteShopService = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400)
    throw new Error("Invalid service id")
  }

  const result = await ShopService.deleteOne({ _id: id, shopOwner: req.user._id })
  if (result.deletedCount === 0) {
    res.status(404)
    throw new Error("Service not found")
  }
  return res.json({ message: "Deleted" })
})
