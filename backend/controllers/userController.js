import asyncHandler from "express-async-handler"
import mongoose from "mongoose"
import { User } from "../models/userModel.js"
import { generateToken } from "../utils/generateToken.js"
import { isServiceProviderRole } from "../utils/serviceProviderRoles.js"

const trimStr = (value) => (typeof value === "string" ? value.trim() : value)

function embeddedFromField(req, field) {
  const f = req.files?.[field]?.[0]
  if (!f?.buffer?.length) return undefined
  return {
    data: f.buffer,
    contentType: f.mimetype || "application/octet-stream",
  }
}

function normalizeBuffer(raw) {
  if (!raw) return null
  if (Buffer.isBuffer(raw)) return raw
  if (raw?.type === "Buffer" && Array.isArray(raw.data)) return Buffer.from(raw.data)
  if (typeof raw.buffer !== "undefined" && raw.buffer?.byteLength != null) {
    try {
      return Buffer.from(raw.buffer)
    } catch {
      /* fall through */
    }
  }
  try {
    return Buffer.from(raw)
  } catch {
    return null
  }
}

function bufferToDataUrl(raw, contentType) {
  const buf = normalizeBuffer(raw)
  if (!buf) return undefined
  const ct = contentType || "application/octet-stream"
  return `data:${ct};base64,${buf.toString("base64")}`
}

/** Strip binary fields from admin JSON; add data URLs for the admin UI. */
function shapeAdminUserPayload(user) {
  const u = { ...user }
  if (u.validIdImage?.data) {
    u.validIdDataUrl = bufferToDataUrl(u.validIdImage.data, u.validIdImage.contentType)
  }
  if (u.selfieImage?.data) {
    u.selfieDataUrl = bufferToDataUrl(u.selfieImage.data, u.selfieImage.contentType)
  }
  if (u.businessPermitCertificateImage?.data) {
    u.businessPermitCertificateDataUrl = bufferToDataUrl(
      u.businessPermitCertificateImage.data,
      u.businessPermitCertificateImage.contentType
    )
  }
  delete u.validIdImage
  delete u.selfieImage
  delete u.businessPermitCertificateImage
  return u
}

/** Registration / Shop Info UI labels → User schema enum */
function toStoredBusinessType(value) {
  const n = trimStr(value)
  if (!n) return n
  const lookup = {
    "Sole Proprietorship ( Single Owner )": "Sole Proprietorship",
    "Sole Proprietorship (Single Owner)": "Sole Proprietorship",
    "Partnership ( Two or More Owners )": "Partnership",
    "Partnership (Multiple Owners)": "Partnership",
    "Corporation ( Three or More Owners )": "Corporation",
    "Corporation (Multiple Owners)": "Corporation",
  }
  if (lookup[n]) return lookup[n]
  if (["Sole Proprietorship", "Partnership", "Corporation"].includes(n)) return n
  return n
}

function toStoredServiceType(value) {
  const n = trimStr(value)
  if (!n) return n
  if (n === "Both (Home Service and Shop Visit)") return "Both"
  if (n === "Both (Home Service, Technician/Mechanic location Visit)") return "Both"
  const lowered = n.toLowerCase()
  for (const item of ["Home Service", "Shop Visit", "Both"]) {
    if (item.toLowerCase() === lowered) return item
  }
  return n
}

export const listShopOwnersForRegistration = asyncHandler(async (_req, res) => {
  const owners = await User.find({
    role: "shop-owner",
    $nor: [{ accountApprovalStatus: "pending" }, { accountApprovalStatus: "rejected" }],
  })
    .select("_id shopName fullName shopDetailedAddress shopLandmark")
    .sort({ shopName: 1, fullName: 1 })
    .lean()

  return res.json(
    owners.map((o) => ({
      _id: String(o._id),
      shopName: o.shopName || "",
      fullName: o.fullName || "",
      shopDetailedAddress: o.shopDetailedAddress || "",
      shopLandmark: o.shopLandmark || "",
    }))
  )
})

export const registerUser = asyncHandler(async (req, res) => {
  const {
    role,
    fullName,
    gender,
    birthdate,
    civilStatus,
    lastName,
    firstName,
    middleName,
    pobRegion,
    pobProvince,
    pobCityMunicipality,
    pobBarangay,
    region,
    province,
    cityMunicipality,
    barangay,
    detailedAddress,
    postalCode,
    permanentRegion,
    permanentProvince,
    permanentCityMunicipality,
    permanentBarangay,
    employmentStatusCategory,
    employmentStatusDetail,
    highestEducationalLevel,
    yearGraduatedLastAttended,
    schoolUniversity,
    courseProgram,
    shopName,
    businessType,
    repairServicesOffered,
    serviceType,
    yearsOfOperation,
    numberOfEmployees,
    operatingHours,
    daysOfOperation,
    shopDescription,
    shopRegion,
    shopProvince,
    shopCityMunicipality,
    shopBarangay,
    shopDetailedAddress,
    shopLandmark,
    dtiSecRegistrationNumber,
    businessPermitNumber,
    tinNumber,
    workCompanyName,
    workCompanyAddress,
    workPositionHeld,
    workInclusiveFrom,
    workInclusiveTo,
    workAppointmentStatus,
    skillsSelfAssessment,
    technicalSkillsNoFormalTraining,
    phoneCode,
    phoneNumber,
    email,
    password,
    idType,
    employedByShopOwner,
  } = req.body

  const clean = (value) => (typeof value === "string" ? value.trim() : value)
  const normalizeEnum = (value, allowed = []) => {
    const raw = clean(value)
    if (!raw) return raw
    const lowered = String(raw).toLowerCase()
    const hit = allowed.find((item) => String(item).toLowerCase() === lowered)
    return hit || raw
  }

  const normalizedRole = normalizeEnum(role, [
    "shop-owner",
    "independent-mechanic-technician",
    "mechanic-technician",
    "customer",
    "admin",
  ])
  const normalizedGender = normalizeEnum(gender, ["male", "female", "prefer-not"])
  const normalizedCivilStatus = normalizeEnum(civilStatus, ["single", "married", "widowed", "separated"])
  const normalizedEmploymentStatusCategory = normalizeEnum(employmentStatusCategory, ["employed", "unemployed"])
  const normalizedServiceType = toStoredServiceType(serviceType)

  if (normalizedRole === "admin") {
    res.status(403)
    throw new Error("Admin accounts cannot be created through registration")
  }

  if (!normalizedRole || !clean(fullName) || !normalizedGender || !birthdate || !clean(region) || !clean(province) || !clean(cityMunicipality) || !clean(barangay) || !clean(phoneNumber) || !clean(email) || !clean(password) || !clean(idType)) {
    res.status(400)
    throw new Error("Please provide all required fields")
  }

  const isMechanic = normalizedRole === "mechanic-technician"
  const isShopOwner = normalizedRole === "shop-owner"
  const isIndependentMechanicTechnician = normalizedRole === "independent-mechanic-technician"
  const isShopStyleProvider = isShopOwner || isIndependentMechanicTechnician
  const isProviderRegistration = isMechanic || isShopStyleProvider

  let employerShopOwnerId = null
  if (isMechanic) {
    const rawEmployer = clean(employedByShopOwner)
    if (!rawEmployer || !mongoose.Types.ObjectId.isValid(rawEmployer)) {
      res.status(400)
      throw new Error("Please select a registered shop owner to register under")
    }
    const employer = await User.findOne({ _id: rawEmployer, role: "shop-owner" }).select("_id accountApprovalStatus").lean()
    if (!employer) {
      res.status(400)
      throw new Error("Selected shop owner was not found. Choose another shop from the list.")
    }
    const est = employer.accountApprovalStatus
    if (est === "pending" || est === "rejected") {
      res.status(400)
      throw new Error("This shop owner is not approved yet. Choose another shop or try again later.")
    }
    employerShopOwnerId = employer._id
  }

  if (isProviderRegistration) {
    const mechanicEducationOk =
      (!isMechanic && !isIndependentMechanicTechnician) ||
      (!!highestEducationalLevel && !!schoolUniversity && !!courseProgram)
    const shopBusinessOkShopOwner =
      !!clean(shopName) &&
      !!businessType &&
      !!normalizedServiceType &&
      !!yearsOfOperation &&
      !!numberOfEmployees &&
      !!clean(operatingHours) &&
      !!daysOfOperation &&
      !!repairServicesOffered

    const shopBusinessOkIndependent =
      !!businessType &&
      !!normalizedServiceType &&
      !!yearsOfOperation &&
      !!clean(operatingHours) &&
      !!daysOfOperation &&
      !!repairServicesOffered

    const shopBusinessOk =
      !isShopStyleProvider ||
      (isIndependentMechanicTechnician ? shopBusinessOkIndependent : shopBusinessOkShopOwner)

    const mechanicWorkExperienceOk =
      !isMechanic ||
      (!!workCompanyName && !!workCompanyAddress && !!workPositionHeld && !!workInclusiveFrom && !!workInclusiveTo && !!workAppointmentStatus)

    if (!normalizedCivilStatus || !clean(lastName) || !clean(firstName) || !clean(pobRegion) || !clean(pobProvince) || !clean(pobCityMunicipality) || !clean(pobBarangay) || !clean(permanentRegion) || !clean(permanentProvince) || !clean(permanentCityMunicipality) || !clean(permanentBarangay) || !normalizedEmploymentStatusCategory || !clean(employmentStatusDetail) || !mechanicWorkExperienceOk || !mechanicEducationOk || !shopBusinessOk) {
      res.status(400)
      throw new Error("Please provide all required provider or mechanic/technician fields")
    }
  }

  const normalizedEmail = String(email || "").trim().toLowerCase()
  const userExists = await User.findOne({ email: normalizedEmail }).select("_id").lean()
  if (userExists) {
    res.status(409)
    throw new Error("User already exists")
  }

  const validIdImage = embeddedFromField(req, "validId")
  const selfieImage = embeddedFromField(req, "selfie")
  const businessPermitCertificateImage = embeddedFromField(req, "businessPermitCertificate")

  if (!validIdImage) {
    res.status(400)
    throw new Error("Please upload valid ID")
  }

  const parseJsonArray = (val) => {
    if (!val) return []
    if (Array.isArray(val)) return val
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const skillsSelfAssessmentArr = parseJsonArray(skillsSelfAssessment)
  const technicalSkillsArr = parseJsonArray(technicalSkillsNoFormalTraining)
  const repairServicesOfferedArr = parseJsonArray(repairServicesOffered)
  const daysOfOperationArr = parseJsonArray(daysOfOperation)

  if (isMechanic || isIndependentMechanicTechnician) {
    if (skillsSelfAssessmentArr.length !== 5) {
      res.status(400)
      throw new Error("Please select exactly five (5) skills for self-assessment")
    }
    if (technicalSkillsArr.length < 1) {
      res.status(400)
      throw new Error("Please select at least one technical skill acquired without formal training")
    }
  }

  if (isShopStyleProvider) {
    if (repairServicesOfferedArr.length < 1) {
      res.status(400)
      throw new Error("Please select at least one repair service offered")
    }
    if (daysOfOperationArr.length < 1) {
      res.status(400)
      throw new Error("Please select at least one day of operation")
    }
  }

  if (isShopOwner) {
    if (!businessPermitCertificateImage) {
      res.status(400)
      throw new Error("Please upload business permit/certificate")
    }
  }

  const normalizedBusinessType = toStoredBusinessType(businessType)

  let user
  try {
    user = await User.create({
      role: normalizedRole,
      fullName: clean(fullName),
      gender: normalizedGender,
      birthdate,
      civilStatus: normalizedCivilStatus,
      lastName: clean(lastName),
      firstName: clean(firstName),
      middleName: clean(middleName),
      pobRegion: clean(pobRegion),
      pobProvince: clean(pobProvince),
      pobCityMunicipality: clean(pobCityMunicipality),
      pobBarangay: clean(pobBarangay),
      region: clean(region),
      province: clean(province),
      cityMunicipality: clean(cityMunicipality),
      barangay: clean(barangay),
      detailedAddress: clean(detailedAddress) ?? "",
      postalCode: clean(postalCode),
      phoneCode: phoneCode || "+63",
      phoneNumber: clean(phoneNumber),
      permanentRegion: clean(permanentRegion),
      permanentProvince: clean(permanentProvince),
      permanentCityMunicipality: clean(permanentCityMunicipality),
      permanentBarangay: clean(permanentBarangay),
      employmentStatusCategory: normalizedEmploymentStatusCategory,
      employmentStatusDetail: clean(employmentStatusDetail),
      highestEducationalLevel: clean(highestEducationalLevel),
      yearGraduatedLastAttended: clean(yearGraduatedLastAttended),
      schoolUniversity: clean(schoolUniversity),
      courseProgram: clean(courseProgram),
      shopName: isIndependentMechanicTechnician ? (clean(shopName) || "") : clean(shopName),
      businessType: normalizedBusinessType,
      repairServicesOffered: repairServicesOfferedArr,
      serviceType: normalizedServiceType,
      yearsOfOperation: yearsOfOperation === undefined || yearsOfOperation === null || yearsOfOperation === "" ? undefined : Number(yearsOfOperation),
      numberOfEmployees: isIndependentMechanicTechnician
        ? undefined
        : numberOfEmployees === undefined || numberOfEmployees === null || numberOfEmployees === ""
          ? undefined
          : Number(numberOfEmployees),
      operatingHours: clean(operatingHours),
      daysOfOperation: daysOfOperationArr,
      shopDescription: clean(shopDescription),
      shopRegion: clean(shopRegion),
      shopProvince: clean(shopProvince),
      shopCityMunicipality: clean(shopCityMunicipality),
      shopBarangay: clean(shopBarangay),
      shopDetailedAddress: clean(shopDetailedAddress) ?? "",
      shopLandmark: clean(shopLandmark),
      dtiSecRegistrationNumber: isIndependentMechanicTechnician ? "" : clean(dtiSecRegistrationNumber),
      businessPermitNumber: isIndependentMechanicTechnician ? "" : clean(businessPermitNumber),
      tinNumber: clean(tinNumber),
      businessPermitCertificatePath: undefined,
      businessPermitCertificateImage: isIndependentMechanicTechnician ? undefined : businessPermitCertificateImage,
      workCompanyName: clean(workCompanyName),
      workCompanyAddress: clean(workCompanyAddress),
      workPositionHeld: clean(workPositionHeld),
      workInclusiveFrom: clean(workInclusiveFrom),
      workInclusiveTo: clean(workInclusiveTo),
      workAppointmentStatus: clean(workAppointmentStatus),
      skillsSelfAssessment: skillsSelfAssessmentArr,
      technicalSkillsNoFormalTraining: technicalSkillsArr,
      employedByShopOwner: employerShopOwnerId || undefined,
      email: normalizedEmail,
      password,
      idType: clean(idType),
      validIdPath: undefined,
      selfiePath: undefined,
      validIdImage,
      selfieImage,
      accountApprovalStatus: "pending",
      approvalRejectionReason: "",
    })
  } catch (error) {
    if (error?.code === 11000) {
      res.status(409)
      throw new Error("User already exists")
    }
    if (error?.name === "ValidationError" || error?.name === "CastError") {
      res.status(400)
      throw new Error(error.message || "Invalid registration data")
    }
    throw error
  }

  return res.status(201).json({
    _id: user._id,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    accountApprovalStatus: user.accountApprovalStatus,
    message: "Registration received. Wait for admin approval before signing in.",
  })
})

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const normalizedEmail = String(email || "").trim().toLowerCase()
  const enteredPassword = String(password || "")
  const user = await User.findOne({ email: normalizedEmail }).select(
    "-validIdImage -selfieImage -businessPermitCertificateImage"
  )
  if (!user || !(await user.matchPassword(enteredPassword))) {
    res.status(401)
    throw new Error("Invalid email or password")
  }

  // If this account is still using a legacy plain-text password, migrate to bcrypt now.
  if (typeof user.password === "string" && !user.password.startsWith("$2")) {
    user.password = enteredPassword
    await user.save()
  }

  if (user.role !== "admin") {
    const st = user.accountApprovalStatus
    if (st === "pending") {
      return res.status(403).json({
        code: "ACCOUNT_PENDING_APPROVAL",
        message: "Your account is waiting for admin approval. Please try again in a few minutes.",
      })
    }
    if (st === "rejected") {
      const reason = typeof user.approvalRejectionReason === "string" ? user.approvalRejectionReason.trim() : ""
      return res.status(403).json({
        code: "ACCOUNT_REJECTED",
        message: "Your registration was not approved.",
        reason,
        action:
          "Please submit a new registration using accurate details that match your registration information and valid ID.",
      })
    }
  }

  return res.json({
    _id: user._id,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    token: generateToken(user._id),
  })
})

export const getMe = asyncHandler(async (req, res) => {
  return res.json(req.user)
})

export const updateShopOwnerShopInfo = asyncHandler(async (req, res) => {
  if (!isServiceProviderRole(req.user.role)) {
    res.status(403)
    throw new Error("Only service providers can update shop information")
  }

  const clean = (value) => (typeof value === "string" ? value.trim() : value)
  const parseJsonArray = (val) => {
    if (!val) return []
    if (Array.isArray(val)) return val
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const body = req.body || {}
  const repairServicesOfferedArr = Array.isArray(body.repairServicesOffered)
    ? body.repairServicesOffered.map((x) => String(x))
    : parseJsonArray(body.repairServicesOffered)
  const daysOfOperationArr = Array.isArray(body.daysOfOperation)
    ? body.daysOfOperation.map((x) => String(x))
    : parseJsonArray(body.daysOfOperation)

  const normalizedBusinessType = toStoredBusinessType(body.businessType)
  const normalizedServiceType = toStoredServiceType(body.serviceType)
  const NCR_REGION_CODE = "130000000"
  const shopRegionClean = clean(body.shopRegion)
  const isNcr = shopRegionClean === NCR_REGION_CODE

  const businessEnumOk = ["Sole Proprietorship", "Partnership", "Corporation"].includes(normalizedBusinessType)
  const serviceEnumOk = ["Home Service", "Shop Visit", "Both"].includes(normalizedServiceType)
  const isIndependentProvider = req.user.role === "independent-mechanic-technician"

  if ((!isIndependentProvider && !clean(body.shopName)) || !businessEnumOk || !serviceEnumOk) {
    res.status(400)
    throw new Error("Please complete all required shop fields with valid business and service types")
  }
  if (repairServicesOfferedArr.length < 1) {
    res.status(400)
    throw new Error("Please select at least one repair service offered")
  }
  if (daysOfOperationArr.length < 1) {
    res.status(400)
    throw new Error("Please select at least one day of operation")
  }

  const yo = body.yearsOfOperation
  const ne = body.numberOfEmployees
  if (yo === undefined || yo === null || yo === "" || Number.isNaN(Number(yo))) {
    res.status(400)
    throw new Error("Years of operation is required")
  }
  if (!isIndependentProvider && (ne === undefined || ne === null || ne === "" || Number.isNaN(Number(ne)))) {
    res.status(400)
    throw new Error("Number of technicians/mechanics is required")
  }
  if (!clean(body.operatingHours)) {
    res.status(400)
    throw new Error("Operating hours is required")
  }

  if (!shopRegionClean || !clean(body.shopCityMunicipality) || !clean(body.shopBarangay)) {
    res.status(400)
    throw new Error("Shop address fields are required")
  }
  if (!isNcr && !clean(body.shopProvince)) {
    res.status(400)
    throw new Error("Province is required for non-NCR shop addresses")
  }

  const user = await User.findById(req.user._id)
  if (!user) {
    res.status(404)
    throw new Error("User not found")
  }

  user.shopName = isIndependentProvider ? clean(body.shopName) || "" : clean(body.shopName)
  user.businessType = normalizedBusinessType
  user.repairServicesOffered = repairServicesOfferedArr
  user.serviceType = normalizedServiceType
  user.yearsOfOperation = Number(yo)
  user.numberOfEmployees = isIndependentProvider
    ? ne === undefined || ne === null || ne === "" || Number.isNaN(Number(ne))
      ? undefined
      : Number(ne)
    : Number(ne)
  user.operatingHours = clean(body.operatingHours)
  user.daysOfOperation = daysOfOperationArr
  user.shopDescription = clean(body.shopDescription) || ""
  user.shopRegion = shopRegionClean
  if (!isNcr) {
    user.shopProvince = clean(body.shopProvince)
  } else if (clean(body.shopProvince)) {
    user.shopProvince = clean(body.shopProvince)
  }
  user.shopCityMunicipality = clean(body.shopCityMunicipality)
  user.shopBarangay = clean(body.shopBarangay)
  user.shopDetailedAddress = clean(body.shopDetailedAddress) ?? ""
  user.shopLandmark = clean(body.shopLandmark) || ""

  await user.save()

  const updated = await User.findById(req.user._id).select(
    "-password -validIdImage -selfieImage -businessPermitCertificateImage"
  )
  return res.json(updated)
})

/** Admin dashboard: list platform users (excludes other admin accounts). */
export const listUsersForAdmin = asyncHandler(async (_req, res) => {
  const users = await User.find({ role: { $ne: "admin" } })
    .select(
      "fullName email role phoneCode phoneNumber createdAt shopName shopJobTitle shopManagedStatus barangay cityMunicipality province courseProgram accountApprovalStatus approvalRejectionReason"
    )
    .sort({ createdAt: -1 })
    .lean()

  return res.json(users)
})

/** Admin: full registration record for one user (password omitted). */
export const getUserForAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400)
    throw new Error("Invalid user id")
  }

  const user = await User.findById(id)
    .select("-password")
    .populate("employedByShopOwner", "shopName fullName email")
    .lean()

  if (!user) {
    res.status(404)
    throw new Error("User not found")
  }
  if (user.role === "admin") {
    res.status(403)
    throw new Error("Cannot view this account")
  }

  return res.json(shapeAdminUserPayload(user))
})

export const approveUserForAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400)
    throw new Error("Invalid user id")
  }

  const user = await User.findById(id)
  if (!user) {
    res.status(404)
    throw new Error("User not found")
  }
  if (user.role === "admin") {
    res.status(403)
    throw new Error("Cannot change this account")
  }

  user.accountApprovalStatus = "approved"
  user.approvalRejectionReason = ""
  await user.save()

  return res.json({
    _id: user._id,
    accountApprovalStatus: user.accountApprovalStatus,
  })
})

export const rejectUserForAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params
  const reason = trimStr(req.body?.reason)
  if (!reason) {
    res.status(400)
    throw new Error("Rejection reason is required")
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400)
    throw new Error("Invalid user id")
  }

  const user = await User.findById(id)
  if (!user) {
    res.status(404)
    throw new Error("User not found")
  }
  if (user.role === "admin") {
    res.status(403)
    throw new Error("Cannot change this account")
  }

  user.accountApprovalStatus = "rejected"
  user.approvalRejectionReason = reason
  await user.save()

  return res.json({
    _id: user._id,
    accountApprovalStatus: user.accountApprovalStatus,
    approvalRejectionReason: user.approvalRejectionReason,
  })
})

