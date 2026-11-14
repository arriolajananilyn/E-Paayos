import asyncHandler from "express-async-handler"
import mongoose from "mongoose"
import { Complaint } from "../models/complaintModel.js"
import { User } from "../models/userModel.js"
import { Booking } from "../models/bookingModel.js"
import { sendDirectMessage } from "../services/directMessage.js"

// Clean up any legacy mock/dummy complaints to ensure only real platform complaints are maintained
export const purgeMockComplaintsIfAny = async () => {
  try {
    const dummyTickets = [
      "CMP-202610-101",
      "CMP-202610-102",
      "CMP-202610-103",
      "CMP-202610-104",
      "CMP-202610-105",
    ]
    const dummyNames = [
      "Maria Elena Santos",
      "Juan Paolo Reyes",
      "Corazon Del Rosario",
      "Arnel M. Mendoza",
      "Leah Joy Villafuerte",
    ]
    const result = await Complaint.deleteMany({
      $or: [
        { ticketNumber: { $in: dummyTickets } },
        { customerName: { $in: dummyNames } },
      ],
    })
    if (result.deletedCount > 0) {
      console.log(`[Complaints] Purged ${result.deletedCount} legacy mock complaint records from database.`)
    }
  } catch (err) {
    // silent catch
  }
}

/**
 * @desc Get all complaints with filtering, search & pagination (Admin)
 * @route GET /api/admin/complaints
 * @access Admin
 */
export const listAdminComplaints = asyncHandler(async (req, res) => {
  await purgeMockComplaintsIfAny()

  const {
    status,
    category,
    priority,
    targetType,
    reporterRole,
    search,
    page = 1,
    limit = 50,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query

  const filter = {}

  if (status && status !== "all") {
    filter.status = status
  }
  if (category && category !== "all") {
    filter.category = category
  }
  if (priority && priority !== "all") {
    filter.priority = priority
  }
  if (targetType && targetType !== "all") {
    filter.targetType = targetType
  }
  if (reporterRole && reporterRole !== "all") {
    if (reporterRole === "customer") {
      filter.$or = [
        ...(filter.$or || []),
        { reporterRole: "customer" },
        { reporterRole: { $exists: false } },
        { reporterRole: "" },
      ]
    } else if (reporterRole === "provider") {
      filter.reporterRole = { $in: ["shop-owner", "oncall-mechanic-technician", "mechanic-technician"] }
    } else {
      filter.reporterRole = reporterRole
    }
  }

  if (search && search.trim()) {
    const s = search.trim()
    const regex = new RegExp(s, "i")
    const searchOr = [
      { ticketNumber: regex },
      { customerName: regex },
      { customerEmail: regex },
      { customerPhone: regex },
      { reporterName: regex },
      { reporterEmail: regex },
      { reportedUserName: regex },
      { targetShopName: regex },
      { targetTechnicianName: regex },
      { subject: regex },
      { description: regex },
      { bookingServiceTitle: regex },
    ]
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchOr }]
      delete filter.$or
    } else {
      filter.$or = searchOr
    }
  }

  const p = Math.max(1, parseInt(page, 10) || 1)
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 50))
  const skip = (p - 1) * l

  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 }

  const userModerationFields =
    "fullName email phoneNumber shopName role profilePicture moderationStatus warningCount restrictedUntil"

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .populate("reporter", userModerationFields)
      .populate("reportedUser", userModerationFields)
      .populate("customer", userModerationFields)
      .populate("targetShop", `${userModerationFields} shopAddress`)
      .populate("targetTechnician", userModerationFields)
      .populate("booking", "problemDescription status preferredDate preferredTime contactName contactPhone serviceFeeLaborRateAtCalc serviceFeeMaterialsAmount serviceMode")
      .sort(sort)
      .skip(skip)
      .limit(l)
      .lean(),
    Complaint.countDocuments(filter),
  ])

  res.json({
    success: true,
    data: complaints,
    pagination: {
      total,
      page: p,
      limit: l,
      totalPages: Math.ceil(total / l),
    },
  })
})

/**
 * @desc Get complaint stats summary (Admin)
 * @route GET /api/admin/complaints/stats
 * @access Admin
 */
export const getAdminComplaintStats = asyncHandler(async (req, res) => {
  await purgeMockComplaintsIfAny()

  const [
    total,
    pending,
    underInvestigation,
    actionTaken,
    resolved,
    dismissed,
    urgent,
    high,
    categoryCounts,
  ] = await Promise.all([
    Complaint.countDocuments({}),
    Complaint.countDocuments({ status: "pending" }),
    Complaint.countDocuments({ status: "under_investigation" }),
    Complaint.countDocuments({ status: "action_taken" }),
    Complaint.countDocuments({ status: "resolved" }),
    Complaint.countDocuments({ status: "dismissed" }),
    Complaint.countDocuments({ priority: "urgent" }),
    Complaint.countDocuments({ priority: "high" }),
    Complaint.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
  ])

  const byCategory = {}
  categoryCounts.forEach((c) => {
    byCategory[c._id] = c.count
  })

  res.json({
    success: true,
    data: {
      total,
      pending,
      underInvestigation,
      actionTaken,
      resolved,
      dismissed,
      urgentOrHigh: urgent + high,
      urgent,
      high,
      byCategory,
    },
  })
})

/**
 * @desc Get single complaint by ID or Ticket Number
 * @route GET /api/admin/complaints/:id
 * @access Admin
 */
export const getComplaintById = asyncHandler(async (req, res) => {
  const { id } = req.params

  const query = mongoose.Types.ObjectId.isValid(id)
    ? { _id: id }
    : { ticketNumber: id.toUpperCase() }

  const userModerationFields =
    "fullName email phoneNumber shopName role profilePicture moderationStatus warningCount restrictedUntil"

  const complaint = await Complaint.findOne(query)
    .populate("reporter", userModerationFields)
    .populate("reportedUser", userModerationFields)
    .populate("customer", userModerationFields)
    .populate("targetShop", `${userModerationFields} shopAddress`)
    .populate("targetTechnician", userModerationFields)
    .populate("booking")
    .populate("reviewedBy", "fullName email")
    .lean()

  if (!complaint) {
    res.status(404)
    throw new Error("Complaint not found.")
  }

  res.json({ success: true, data: complaint })
})

/**
 * @desc Update complaint status, priority, admin action & notes (Admin)
 * @route PATCH /api/admin/complaints/:id
 * @access Admin
 */
export const updateComplaintAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params
  const {
    status,
    priority,
    adminNotes,
    adminAction,
    resolutionRemarks,
    notifyCustomer = true,
  } = req.body

  const complaint = await Complaint.findById(id)
  if (!complaint) {
    res.status(404)
    throw new Error("Complaint not found.")
  }

  const prevStatus = complaint.status

  if (status) complaint.status = status
  if (priority) complaint.priority = priority
  if (typeof adminNotes === "string") complaint.adminNotes = adminNotes.trim()
  if (typeof adminAction === "string") complaint.adminAction = adminAction.trim()
  if (typeof resolutionRemarks === "string") complaint.resolutionRemarks = resolutionRemarks.trim()

  complaint.reviewedBy = req.user._id
  complaint.reviewedAt = new Date()

  if (["resolved", "action_taken", "dismissed"].includes(status) && !complaint.resolvedAt) {
    complaint.resolvedAt = new Date()
  }

  await complaint.save()

  // Optional: send automated message to reporter via direct chat
  const notifyTargetId = complaint.reporter || complaint.customer
  if (notifyCustomer && notifyTargetId && status !== prevStatus) {
    try {
      const statusLabel =
        status === "under_investigation"
          ? "is now under official investigation"
          : status === "action_taken"
          ? "has had formal regulatory action taken"
          : status === "resolved"
          ? "has been successfully resolved"
          : status === "dismissed"
          ? "has been closed/dismissed"
          : "has been updated"

      const text = `📢 [E-Paayos Admin Notice] Your Report Ticket #${complaint.ticketNumber} ${statusLabel}.\n\n` +
        `• Subject: ${complaint.subject}\n` +
        (complaint.adminAction ? `• Action Taken: ${complaint.adminAction}\n` : "") +
        (complaint.resolutionRemarks ? `• Official Remarks: ${complaint.resolutionRemarks}\n` : "") +
        `\nThank you for helping keep E-Paayos safe, fair, and reliable.`

      await sendDirectMessage({
        fromUserId: req.user._id,
        toUserId: notifyTargetId,
        content: text,
      })
    } catch (err) {
      console.warn("Could not send chat notification for complaint update:", err?.message || err)
    }
  }

  res.json({
    success: true,
    message: "Complaint updated successfully.",
    data: complaint,
  })
})

/**
 * @desc Delete a complaint (Admin)
 * @route DELETE /api/admin/complaints/:id
 * @access Admin
 */
export const deleteComplaintAdmin = asyncHandler(async (req, res) => {
  const { id } = req.params
  const complaint = await Complaint.findById(id)
  if (!complaint) {
    res.status(404)
    throw new Error("Complaint not found.")
  }

  await Complaint.findByIdAndDelete(id)
  res.json({ success: true, message: "Complaint ticket removed." })
})

/**
 * @desc Customer submits a new complaint / report
 * @route POST /api/users/complaints
 * @access Customer
 */
export const createCustomerComplaint = asyncHandler(async (req, res) => {
  const customerId = req.user._id
  const customer = await User.findById(customerId).lean()

  const {
    targetType = "shop",
    targetShopId,
    targetShopName,
    targetTechnicianId,
    targetTechnicianName,
    bookingId,
    category = "poor_service",
    subject,
    description,
    evidencePhotos = [],
    priority = "medium",
  } = req.body

  if (!subject || !subject.trim()) {
    res.status(400)
    throw new Error("Complaint subject/title is required.")
  }

  if (!description || !description.trim()) {
    res.status(400)
    throw new Error("Detailed description of the issue is required.")
  }

  let shopName = targetShopName || ""
  let shopId = targetShopId || null
  let techId = targetTechnicianId || null
  let techName = targetTechnicianName || ""
  let resolvedTargetType = targetType
  let serviceTitle = ""
  let bookingDoc = null

  if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
    bookingDoc = await Booking.findById(bookingId)
      .populate("shopOwner", "fullName shopName role")
      .populate("shopService", "name title")
      .lean()
    if (bookingDoc) {
      if (!shopId && bookingDoc.shopOwner) {
        shopId = bookingDoc.shopOwner._id
      }
      if (!shopName && bookingDoc.shopOwner) {
        shopName = bookingDoc.shopOwner.shopName || bookingDoc.shopOwner.fullName || ""
      }
      if (bookingDoc.shopOwner?.role === "oncall-mechanic-technician") {
        resolvedTargetType = "technician"
        if (!techId) techId = bookingDoc.shopOwner._id
        if (!techName) techName = bookingDoc.shopOwner.fullName || bookingDoc.shopOwner.shopName || ""
      } else if (bookingDoc.assignedTechnician && !techId) {
        techId = bookingDoc.assignedTechnician
        if (!techName) techName = bookingDoc.assignedTechnicianName || ""
      }
      serviceTitle = bookingDoc.shopService?.name || bookingDoc.shopService?.title || bookingDoc.problemDescription || ""
    }
  } else if (shopId && mongoose.Types.ObjectId.isValid(shopId)) {
    const providerDoc = await User.findById(shopId).select("fullName shopName role").lean()
    if (providerDoc) {
      if (!shopName) shopName = providerDoc.shopName || providerDoc.fullName || ""
      if (providerDoc.role === "oncall-mechanic-technician") {
        resolvedTargetType = "technician"
        if (!techId) techId = providerDoc._id
        if (!techName) techName = providerDoc.fullName || providerDoc.shopName || ""
      }
    }
  }

  // Generate unique human-readable ticket number
  const yyyymm = new Date().toISOString().slice(0, 7).replace("-", "")
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const ticketNumber = `CMP-${yyyymm}-${randomSuffix}`

  const resolvedCustomerName = customer?.fullName || req.user.fullName || "Customer"
  const resolvedCustomerEmail = customer?.email || req.user.email || ""
  const resolvedCustomerPhone = customer?.phoneNumber || customer?.phone || customer?.mobile || ""

  const primaryReportedUserId = shopId || techId || null
  const primaryReportedName = shopName || techName || ""

  const newComplaint = await Complaint.create({
    ticketNumber,
    reporter: customerId,
    reporterRole: customer?.role || req.user.role || "customer",
    reporterName: resolvedCustomerName,
    reporterEmail: resolvedCustomerEmail,
    reporterPhone: resolvedCustomerPhone,
    customer: customerId,
    customerName: resolvedCustomerName,
    customerEmail: resolvedCustomerEmail,
    customerPhone: resolvedCustomerPhone,
    targetType: resolvedTargetType,
    reportedUser: primaryReportedUserId,
    reportedUserRole: resolvedTargetType === "technician" ? "oncall-mechanic-technician" : "shop-owner",
    reportedUserName: primaryReportedName,
    targetShop: shopId,
    targetShopName: shopName,
    targetTechnician: techId,
    targetTechnicianName: techName,
    booking: bookingDoc?._id || (bookingId && mongoose.Types.ObjectId.isValid(bookingId) ? bookingId : null),
    bookingServiceTitle: serviceTitle,
    category,
    subject: subject.trim(),
    description: description.trim(),
    evidencePhotos: Array.isArray(evidencePhotos) ? evidencePhotos : [],
    priority: ["urgent", "high", "medium", "low"].includes(priority) ? priority : "medium",
    status: "pending",
  })

  // Requirement: Notify relevant service provider of complaint
  const targetProviderId = shopId || targetTechnicianId || null
  if (targetProviderId) {
    try {
      await sendDirectMessage({
        fromUserId: customerId,
        toUserId: targetProviderId,
        content: `📢 [LMD-PESO Notice] Complaint #${ticketNumber} has been filed regarding your service (${serviceTitle || "Repair Booking"}).\n\n` +
          `• Subject: ${subject.trim()}\n` +
          `• Category: ${category}\n` +
          `• Customer Statement: "${description.trim().slice(0, 150)}..."\n\n` +
          `Please review this in your E-Paayos Provider portal and submit your official explanation or response for LMD-PESO dispute resolution.`,
      })
    } catch (err) {
      console.warn("Could not send provider notice:", err?.message || err)
    }
  }

  res.status(201).json({
    success: true,
    message: `Report successfully filed under ticket #${ticketNumber}. The LMD-PESO moderation board and service provider have been notified.`,
    data: newComplaint,
  })
})

/**
 * @desc Service provider (shop owner / on-call mechanic / technician) submits a report against a customer
 * @route POST /api/users/complaints/provider
 * @access Service Provider
 */
export const createProviderComplaint = asyncHandler(async (req, res) => {
  const providerId = req.user._id
  const provider = await User.findById(providerId).lean()

  const {
    targetCustomerId,
    targetCustomerName,
    bookingId,
    category = "fake_booking",
    subject,
    description,
    evidencePhotos = [],
    priority = "medium",
  } = req.body

  if (!subject || !subject.trim()) {
    res.status(400)
    throw new Error("Report subject/title is required.")
  }

  if (!description || !description.trim()) {
    res.status(400)
    throw new Error("Detailed description of the incident is required.")
  }

  let customerId = targetCustomerId && mongoose.Types.ObjectId.isValid(targetCustomerId) ? targetCustomerId : null
  let customerName = targetCustomerName ? String(targetCustomerName).trim() : ""
  let customerEmail = ""
  let customerPhone = ""
  let serviceTitle = ""
  let bookingDoc = null

  if (bookingId && mongoose.Types.ObjectId.isValid(bookingId)) {
    bookingDoc = await Booking.findById(bookingId)
      .populate("customer", "fullName email phoneNumber")
      .populate("shopService", "name title")
      .lean()
    if (bookingDoc) {
      if (!customerId && bookingDoc.customer?._id) {
        customerId = bookingDoc.customer._id
      }
      if (!customerName) {
        customerName = bookingDoc.customer?.fullName || bookingDoc.contactName || ""
      }
      customerEmail = bookingDoc.customer?.email || ""
      customerPhone = bookingDoc.customer?.phoneNumber || bookingDoc.contactPhone || ""
      serviceTitle = bookingDoc.shopService?.name || bookingDoc.shopService?.title || bookingDoc.problemDescription || ""
    }
  }

  if (customerId && (!customerName || !customerEmail)) {
    const custDoc = await User.findById(customerId).select("fullName email phoneNumber").lean()
    if (custDoc) {
      if (!customerName) customerName = custDoc.fullName || ""
      if (!customerEmail) customerEmail = custDoc.email || ""
      if (!customerPhone) customerPhone = custDoc.phoneNumber || ""
    }
  }

  const yyyymm = new Date().toISOString().slice(0, 7).replace("-", "")
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const ticketNumber = `RPT-${yyyymm}-${randomSuffix}`

  const reporterDisplay =
    provider?.shopName?.trim() || provider?.fullName || req.user.fullName || "Service Provider"

  const newComplaint = await Complaint.create({
    ticketNumber,
    reporter: providerId,
    reporterRole: provider?.role || req.user.role || "shop-owner",
    reporterName: reporterDisplay,
    reporterEmail: provider?.email || req.user.email || "",
    reporterPhone: provider?.phoneNumber || "",
    customer: customerId,
    customerName: customerName || "Customer",
    customerEmail,
    customerPhone,
    targetType: "customer",
    reportedUser: customerId,
    reportedUserRole: "customer",
    reportedUserName: customerName || "Customer",
    targetShop: providerId,
    targetShopName: reporterDisplay,
    booking: bookingDoc?._id || (bookingId && mongoose.Types.ObjectId.isValid(bookingId) ? bookingId : null),
    bookingServiceTitle: serviceTitle,
    category,
    subject: subject.trim(),
    description: description.trim(),
    evidencePhotos: Array.isArray(evidencePhotos) ? evidencePhotos : [],
    priority: ["urgent", "high", "medium", "low"].includes(priority) ? priority : "medium",
    status: "pending",
  })

  if (customerId) {
    try {
      await sendDirectMessage({
        fromUserId: providerId,
        toUserId: customerId,
        content:
          `📢 [LMD-PESO Notice] Incident Report #${ticketNumber} has been filed by ${reporterDisplay} regarding booking (${serviceTitle || "Service"}).\n\n` +
          `• Subject: ${subject.trim()}\n` +
          `• Category: ${category}\n` +
          `The E-Paayos Administrator will review this report.`,
      })
    } catch (err) {
      console.warn("Could not send customer notice:", err?.message || err)
    }
  }

  res.status(201).json({
    success: true,
    message: `Incident report #${ticketNumber} submitted to E-Paayos Administration.`,
    data: newComplaint,
  })
})

/**
 * @desc Get current customer's filed complaints
 * @route GET /api/users/complaints/my
 * @access Customer
 */
export const listCustomerComplaints = asyncHandler(async (req, res) => {
  const customerId = req.user._id

  const complaints = await Complaint.find({
    $or: [{ reporter: customerId }, { customer: customerId, targetType: { $ne: "customer" } }],
  })
    .populate("targetShop", "fullName shopName shopAddress")
    .populate("booking", "ref problemDescription serviceMode")
    .sort({ createdAt: -1 })
    .lean()

  res.json({ success: true, data: complaints })
})

/**
 * @desc Get complaints filed BY the logged-in service provider against customers
 * @route GET /api/users/complaints/provider/filed
 * @access Service Provider
 */
export const listProviderFiledComplaints = asyncHandler(async (req, res) => {
  const providerId = req.user._id

  const complaints = await Complaint.find({
    reporter: providerId,
  })
    .populate("reportedUser", "fullName email phoneNumber moderationStatus")
    .populate("customer", "fullName email phoneNumber")
    .populate("booking", "ref problemDescription serviceMode preferredDate")
    .sort({ createdAt: -1 })
    .lean()

  res.json({ success: true, data: complaints })
})

/**
 * @desc Get complaints targeting the logged-in service provider (Shop owner or technician)
 * @route GET /api/users/complaints/provider
 * @access Service Provider
 */
export const listProviderComplaints = asyncHandler(async (req, res) => {
  const providerId = req.user._id

  const providerBookingIds = await Booking.find({
    $or: [{ shopOwner: providerId }, { assignedTechnician: providerId }],
  }).distinct("_id")

  const complaints = await Complaint.find({
    targetType: { $ne: "customer" },
    reporter: { $ne: providerId },
    $or: [
      { targetShop: providerId },
      { targetTechnician: providerId },
      { reportedUser: providerId },
      ...(providerBookingIds.length > 0 ? [{ booking: { $in: providerBookingIds } }] : []),
    ],
  })
    .populate("customer", "fullName email phone")
    .populate("reporter", "fullName email phoneNumber role")
    .populate("targetShop", "fullName shopName role")
    .populate("booking", "ref problemDescription serviceMode preferredDate")
    .sort({ createdAt: -1 })
    .lean()

  res.json({ success: true, data: complaints })
})

/**
 * @desc Service provider submits explanation or defense response to a complaint
 * @route PATCH /api/users/complaints/provider/:id/respond
 * @access Service Provider
 */
export const respondToComplaintAsProvider = asyncHandler(async (req, res) => {
  const providerId = req.user._id
  const { id } = req.params
  const { explanation, explanationPhotos = [] } = req.body

  if (!explanation || !explanation.trim()) {
    res.status(400)
    throw new Error("Explanation or response statement is required.")
  }

  const complaint = await Complaint.findById(id)
  if (!complaint) {
    res.status(404)
    throw new Error("Complaint not found.")
  }

  let isTarget =
    String(complaint.targetShop) === String(providerId) ||
    String(complaint.targetTechnician) === String(providerId) ||
    String(complaint.reportedUser) === String(providerId)

  if (!isTarget && complaint.booking) {
    const linkedBooking = await Booking.findById(complaint.booking)
      .select("shopOwner assignedTechnician")
      .lean()
    if (
      linkedBooking &&
      (String(linkedBooking.shopOwner) === String(providerId) ||
        String(linkedBooking.assignedTechnician) === String(providerId))
    ) {
      isTarget = true
      if (!complaint.targetShop && linkedBooking.shopOwner) {
        complaint.targetShop = linkedBooking.shopOwner
      }
    }
  }

  if (!isTarget && req.user.role !== "admin") {
    res.status(403)
    throw new Error("You are not authorized to respond to this complaint.")
  }

  complaint.providerExplanation = explanation.trim()
  if (Array.isArray(explanationPhotos)) {
    complaint.providerExplanationPhotos = explanationPhotos
  }
  complaint.providerRespondedAt = new Date()

  if (complaint.status === "pending") {
    complaint.status = "under_investigation"
  }

  await complaint.save()

  // Notify reporter / customer
  const notifyId = complaint.reporter || complaint.customer
  if (notifyId) {
    try {
      await sendDirectMessage({
        fromUserId: providerId,
        toUserId: notifyId,
        content: `💬 [E-Paayos Complaint Update] The reported party (${complaint.targetShopName || req.user.fullName}) has submitted an official response/explanation regarding your Ticket #${complaint.ticketNumber}.\n\n` +
          `• Explanation: "${explanation.trim().slice(0, 200)}..."\n\n` +
          `The LMD-PESO Administrator will review both statements for dispute resolution.`,
      })
    } catch (err) {
      console.warn("Failed to send customer notification:", err?.message)
    }
  }

  res.json({
    success: true,
    message: "Official explanation/response submitted successfully.",
    data: complaint,
  })
})

/**
 * @desc LMD-PESO Administrator requests explanation from reported party (shop, technician, or customer)
 * @route POST /api/admin/complaints/:id/request-explanation
 * @access Admin
 */
export const requestProviderExplanation = asyncHandler(async (req, res) => {
  const { id } = req.params
  const complaint = await Complaint.findById(id)
  if (!complaint) {
    res.status(404)
    throw new Error("Complaint not found.")
  }

  if (!complaint.reportedUser && !complaint.targetShop && !complaint.targetTechnician && complaint.booking) {
    const linkedBooking = await Booking.findById(complaint.booking)
      .populate("shopOwner", "fullName shopName role")
      .lean()
    if (linkedBooking?.shopOwner?._id) {
      complaint.targetShop = linkedBooking.shopOwner._id
      complaint.reportedUser = linkedBooking.shopOwner._id
      if (!complaint.targetShopName) {
        complaint.targetShopName = linkedBooking.shopOwner.shopName || linkedBooking.shopOwner.fullName || ""
      }
      if (linkedBooking.shopOwner.role === "oncall-mechanic-technician") {
        complaint.targetType = "technician"
        complaint.targetTechnician = linkedBooking.shopOwner._id
        complaint.targetTechnicianName = linkedBooking.shopOwner.fullName || linkedBooking.shopOwner.shopName || ""
      }
    }
  }

  complaint.explanationRequestedAt = new Date()
  if (complaint.status === "pending") {
    complaint.status = "under_investigation"
  }
  await complaint.save()

  const targetUserId =
    complaint.targetType === "customer"
      ? complaint.reportedUser || complaint.customer
      : complaint.reportedUser || complaint.targetShop || complaint.targetTechnician
  const targetLabel =
    complaint.targetType === "customer"
      ? complaint.reportedUserName || complaint.customerName || "Customer"
      : complaint.targetShopName || complaint.targetTechnicianName || "Provider"

  if (targetUserId) {
    try {
      await sendDirectMessage({
        fromUserId: req.user._id,
        toUserId: targetUserId,
        content: `⚠️ [LMD-PESO Official Inquiry] You are officially requested by the E-Paayos Administrator to provide an explanation/defense regarding Ticket #${complaint.ticketNumber}.\n\n` +
          `• Complainant: ${complaint.reporterName || complaint.customerName}\n` +
          `• Subject: ${complaint.subject}\n` +
          `• Category: ${complaint.category}\n\n` +
          `Please submit your official statement and supporting evidence within 48 hours for administrative review.`,
      })
    } catch (err) {
      console.warn("Failed to notify reported party:", err?.message)
    }
  }

  res.json({
    success: true,
    message: `Official inquiry notice sent to ${targetLabel}.`,
    data: complaint,
  })
})
